"""
Dashboard views untuk testing dan monitoring NLP pipeline.

Tidak ada auth — endpoint ini hanya untuk testing di HF Space.
Tidak menyentuh database (pipeline test berjalan in-memory saja).
"""

import json
import os
import re
import time
import urllib.request

from django.http import JsonResponse, StreamingHttpResponse
from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST


def index(request):
    return render(request, "dashboard/index.html")


@require_GET
def nlp_status(request):
    """Status model NLP yang sedang loaded."""
    from nlp.models import loader, is_enabled
    return JsonResponse({
        "nlp_enabled": is_enabled(),
        "models": loader.status(),
    })


@csrf_exempt
@require_POST
def pipeline_test(request):
    """
    Jalankan NLP pipeline comparison dan kembalikan hasilnya.

    Request body (JSON):
        text      : str  — teks input aduan
        reference : str  — teks referensi untuk ROUGE (opsional)

    Response (JSON):
        dialect, translated, summaries (list per model), rouge, keywords, category, urgency
    """
    try:
        body = json.loads(request.body)
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse({"error": "Request body harus JSON."}, status=400)

    text = (body.get("text") or "").strip()
    reference = (body.get("reference") or "").strip()
    if not text:
        return JsonResponse({"error": "Field 'text' wajib diisi."}, status=400)

    from nlp.pipeline import detect_dialect, translate_to_indonesian, extract_keywords, classify_category, score_urgency
    from nlp.models import loader

    t0 = time.time()

    dialect, dialect_conf = detect_dialect(text)
    translated = translate_to_indonesian(text, dialect)

    summaries = _run_all_summarizers(translated)
    rouge = _compute_rouge(summaries, reference or _fallback_reference(translated))

    return JsonResponse({
        "elapsed_ms": int((time.time() - t0) * 1000),
        "input": text,
        "dialect": {"code": dialect, "confidence": dialect_conf},
        "translated": translated,
        "category": classify_category(translated),
        "urgency": score_urgency(translated),
        "keywords": extract_keywords(translated),
        "summaries": summaries,
        "rouge": rouge,
        "model_status": loader.status(),
    })


@require_GET
def logs_proxy(request):
    """
    Proxy SSE logs dari HF Space API.

    Query param: type = "run" | "build" (default: "run")
    Butuh HF_TOKEN di env.
    """
    hf_token = os.environ.get("HF_TOKEN", "")
    if not hf_token:
        return JsonResponse({"error": "HF_TOKEN belum diset di environment."}, status=503)

    log_type = request.GET.get("type", "run")
    if log_type not in ("run", "build"):
        return JsonResponse({"error": "type harus 'run' atau 'build'."}, status=400)

    space_id = "OinoVenv/sovereign-dialect-bridge-api"
    url = f"https://huggingface.co/api/spaces/{space_id}/logs/{log_type}"

    def stream():
        try:
            req = urllib.request.Request(url, headers={"Authorization": f"Bearer {hf_token}"})
            with urllib.request.urlopen(req, timeout=30) as resp:
                for line in resp:
                    yield line
        except Exception as e:
            yield f"data: {{\"error\": \"{e}\"}}\n\n".encode()

    response = StreamingHttpResponse(stream(), content_type="text/event-stream")
    response["Cache-Control"] = "no-cache"
    response["X-Accel-Buffering"] = "no"
    return response


# ── Summarizer implementations ────────────────────────────────────────────────
# Tiga summarizer sesuai training_sum.ipynb:
#   1. TextRank    — extractive, TF-IDF + PageRank (ROUGE-1: 0.669 pada IndoSum test)
#   2. NER heuristic — extractive, pilih kalimat berdasarkan density kata kapital
#      (proxy named entities, ROUGE-1: 0.427)
#   3. mT5-base   — abstractive, fine-tuned pada IndoSum (NusaSum prefix "ringkas: ")
#   4. IndoT5     — abstractive, checkpoint OinoVenv/sovereign-indot5-nusasum

def _run_all_summarizers(text: str) -> list:
    return [
        _run_textrank(text),
        _run_ner_extractive(text),
        _run_mt5(text),
        _run_indot5(text),
    ]


def _split_sentences(text: str) -> list:
    return [s.strip() for s in re.split(r"(?<=[.!?])\s+", text.strip()) if s.strip()]


def _run_textrank(text: str) -> dict:
    """
    TextRank extractive: TF-IDF similarity matrix + PageRank.
    Implementasi sesuai training_sum.ipynb cell 35.
    """
    t0 = time.time()
    try:
        import numpy as np
        import networkx as nx
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.metrics.pairwise import cosine_similarity

        sents = _split_sentences(text)
        if len(sents) <= 3:
            summary = " ".join(sents)
        else:
            vec = TfidfVectorizer().fit_transform(sents)
            sim = cosine_similarity(vec, vec)
            np.fill_diagonal(sim, 0)
            scores = nx.pagerank(nx.from_numpy_array(sim))
            top3 = sorted(scores, key=scores.get, reverse=True)[:3]
            summary = " ".join(sents[i] for i in sorted(top3))

        return {
            "model": "TextRank (TF-IDF + PageRank)",
            "type": "extractive",
            "summary": " ".join(summary.split()[:80]),
            "elapsed_ms": int((time.time() - t0) * 1000),
            "available": True,
        }
    except Exception as e:
        return {"model": "TextRank", "type": "extractive", "summary": "", "elapsed_ms": int((time.time() - t0) * 1000), "available": False, "error": str(e)}


def _run_ner_extractive(text: str) -> dict:
    """
    NER extractive: pilih top-3 kalimat berdasarkan jumlah named entity yang
    ditemukan oleh cahya/bert-base-indonesian-NER.

    Implementasi sesuai training_sum_NER.ipynb: batch inference per kalimat,
    score = jumlah entity per kalimat, pilih top-3 berurut posisi asli.
    ROUGE-1 pada IndoSum test set: 0.478 (vs TextRank 0.669).
    """
    from nlp.models import loader, ModelKind
    t0 = time.time()

    model_status = loader.status().get("ner", {})
    ner = loader.get_if_loaded(ModelKind.NER)
    if ner is None:
        state = "sedang loading" if model_status.get("loading") else "belum loaded"
        return {
            "model": "NER Extractive (cahya/bert-base-indonesian-NER)",
            "type": "extractive",
            "summary": "",
            "elapsed_ms": int((time.time() - t0) * 1000),
            "available": False,
            "error": f"Model NER {state}. Cek Model Status tab.",
        }

    try:
        sents = _split_sentences(text)
        if not sents:
            return {"model": "NER Extractive (cahya/bert-base-indonesian-NER)", "type": "extractive", "summary": "", "elapsed_ms": 0, "available": True}

        # Batched inference: kirim semua kalimat sekaligus ke NER pipeline
        batch_ents = ner([s[:512] for s in sents])
        scores = [len(e) for e in batch_ents]

        top3 = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)[:3]
        summary = " ".join(sents[i] for i in sorted(top3))

        return {
            "model": "NER Extractive (cahya/bert-base-indonesian-NER)",
            "type": "extractive",
            "summary": " ".join(summary.split()[:80]),
            "elapsed_ms": int((time.time() - t0) * 1000),
            "available": True,
        }
    except Exception as e:
        return {"model": "NER Extractive", "type": "extractive", "summary": "", "elapsed_ms": int((time.time() - t0) * 1000), "available": False, "error": str(e)}


def _run_mt5(text: str) -> dict:
    """
    mT5-base abstractive fine-tuned NusaSum.
    Prefix "ringkas: " sesuai cara training di training_sum.ipynb.
    """
    from nlp.models import loader, ModelKind
    t0 = time.time()
    model_status = loader.status().get("mt5", {})
    mt5 = loader.get_if_loaded(ModelKind.MT5)
    tok = loader.get_tokenizer_if_loaded(ModelKind.MT5)
    if mt5 is None or tok is None:
        state = "sedang loading" if model_status.get("loading") else "belum loaded"
        return {
            "model": "mT5-base NusaSum (fine-tuned)",
            "type": "abstractive",
            "summary": "",
            "elapsed_ms": int((time.time() - t0) * 1000),
            "available": False,
            "error": f"Model {state}. Cek Model Status tab.",
        }
    try:
        import torch
        from nlp import config
        prompt = "ringkas: " + text[:config.MT5_MAX_INPUT]
        enc = tok(prompt, return_tensors="pt", truncation=True, max_length=512)
        with torch.no_grad():
            out = mt5.generate(
                **enc,
                max_new_tokens=config.MT5_MAX_OUTPUT,
                num_beams=config.MT5_NUM_BEAMS,
                no_repeat_ngram_size=3,
                early_stopping=config.MT5_NUM_BEAMS > 1,
            )
        summary = tok.decode(out[0], skip_special_tokens=True)
        return {
            "model": "mT5-base NusaSum (fine-tuned)",
            "type": "abstractive",
            "summary": summary,
            "elapsed_ms": int((time.time() - t0) * 1000),
            "available": True,
        }
    except Exception as e:
        return {"model": "mT5-base NusaSum", "type": "abstractive", "summary": "", "elapsed_ms": int((time.time() - t0) * 1000), "available": False, "error": str(e)}


def _run_indot5(text: str) -> dict:
    """
    IndoT5 abstractive fine-tuned NusaSum.
    Checkpoint default: OinoVenv/sovereign-indot5-nusasum.
    """
    from nlp.models import loader, ModelKind
    t0 = time.time()
    model_status = loader.status().get("indot5", {})
    model = loader.get_if_loaded(ModelKind.INDOT5)
    tok = loader.get_tokenizer_if_loaded(ModelKind.INDOT5)
    if model is None or tok is None:
        state = "sedang loading" if model_status.get("loading") else "belum loaded"
        return {
            "model": "IndoT5 NusaSum (fine-tuned)",
            "type": "abstractive",
            "summary": "",
            "elapsed_ms": int((time.time() - t0) * 1000),
            "available": False,
            "error": f"Model {state}. Cek Model Status tab.",
        }
    try:
        import torch
        from nlp import config
        prompt = config.INDOT5_SUMMARY_PREFIX + text[:config.INDOT5_MAX_INPUT]
        enc = tok(prompt, return_tensors="pt", truncation=True, max_length=config.INDOT5_MAX_INPUT)
        with torch.no_grad():
            out = model.generate(
                **enc,
                max_new_tokens=config.INDOT5_MAX_OUTPUT,
                num_beams=config.INDOT5_NUM_BEAMS,
                no_repeat_ngram_size=3,
                early_stopping=config.INDOT5_NUM_BEAMS > 1,
            )
        summary = tok.decode(out[0], skip_special_tokens=True)
        return {
            "model": "IndoT5 NusaSum (fine-tuned)",
            "type": "abstractive",
            "summary": summary,
            "elapsed_ms": int((time.time() - t0) * 1000),
            "available": True,
        }
    except Exception as e:
        return {"model": "IndoT5 NusaSum", "type": "abstractive", "summary": "", "elapsed_ms": int((time.time() - t0) * 1000), "available": False, "error": str(e)}


# ── ROUGE evaluation ──────────────────────────────────────────────────────────

def _compute_rouge(summaries: list, reference: str) -> dict:
    """Hitung ROUGE-1/2/L untuk setiap summary terhadap reference."""
    if not reference:
        return {}
    try:
        from rouge_score import rouge_scorer
        scorer = rouge_scorer.RougeScorer(["rouge1", "rouge2", "rougeL"], use_stemmer=False)
        return {
            s["model"]: {
                "rouge1": round(scorer.score(reference, s["summary"])["rouge1"].fmeasure, 3),
                "rouge2": round(scorer.score(reference, s["summary"])["rouge2"].fmeasure, 3),
                "rougeL": round(scorer.score(reference, s["summary"])["rougeL"].fmeasure, 3),
            }
            for s in summaries
            if s.get("available") and s.get("summary")
        }
    except ImportError:
        return {"error": "rouge_score package belum terinstall."}
    except Exception as e:
        return {"error": str(e)}


def _fallback_reference(text: str) -> str:
    """3 kalimat pertama sebagai reference fallback."""
    sents = _split_sentences(text)
    return " ".join(sents[:3])
