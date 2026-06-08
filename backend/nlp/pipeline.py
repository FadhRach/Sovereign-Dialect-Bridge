"""
NLP pipeline orchestrator untuk Sovereign Dialect-Bridge.

Alur:
    input → detect_dialect → translate(NLLB) → summarize(configurable) → extract_entities
                                                              → classify_category
                                                              → score_urgency
                                                              → extract_keywords
                                                              → output

Setiap stage punya FALLBACK CHAIN supaya pipeline tidak pernah crash:
    - Dialect: joblib clf → langdetect → "xx"
    - Translate: NLLB → deep_translator → googletrans → raw text
    - Summarize: selected abstractive model → NER/TextRank → 2 first sentences
    - NER: Cahya BERT → regex pattern matching
    - Category & Urgency: keyword scoring (selalu bisa, tidak butuh model)

Model di-load lazy di `nlp.models.loader` — boot Django cepat, model load di
background thread. Lihat `nlp/models.py` untuk detail.
"""

from __future__ import annotations

from difflib import SequenceMatcher
import logging
import re
from dataclasses import dataclass, field
from typing import Callable, Optional

# CATATAN: torch sengaja TIDAK di-import di top-level.
# Import torch berat (~2-3 detik + ratusan MB RAM). Kita lazy-import
# hanya di dalam fungsi yang butuh (_translate_nllb, _summarize_seq2seq).
# Kalau pipeline jalan di fallback mode (tanpa neural), torch tidak ke-load sama sekali.

from . import config
from .models import ModelKind, loader

logger = logging.getLogger(__name__)
_SENTENCE_SPLIT_RE = re.compile(r"(?<=[.!?])\s+")
_WHITESPACE_RE = re.compile(r"\s+")


# ─────────────────────────────────────────────────────────────────────────────
# Result schema
# ─────────────────────────────────────────────────────────────────────────────
@dataclass
class NLPResult:
    dialect: str = "xx"
    dialect_confidence: float = 0.0
    translated_text: str = ""
    summary: str = ""
    named_entities: list = field(default_factory=list)
    keywords: list = field(default_factory=list)
    urgency_level: str = "medium"
    category_name: str = "Umum"
    confidence: float = 0.0


ProgressCallback = Callable[[str], None]


# ─────────────────────────────────────────────────────────────────────────────
# Orchestrator
# ─────────────────────────────────────────────────────────────────────────────
def run_pipeline(raw_text: str, on_stage: Optional[ProgressCallback] = None) -> NLPResult:
    """Jalankan pipeline lengkap dengan progress callback per stage.

    Setiap stage neural (translate, summarize, NER) punya fallback chain. Model
    berat tidak di-load secara blocking dari request pipeline; jika belum siap,
    stage terkait langsung pakai fallback cepat.
    """

    def stage(name: str) -> None:
        if on_stage:
            try:
                on_stage(name)
            except Exception:
                pass

    stage("detecting")
    dialect, dialect_conf = detect_dialect(raw_text)

    stage("translating")
    # Skip translate kalau sudah Bahasa Indonesia — hemat 20-40 detik CPU
    translated = translate_to_indonesian(raw_text, dialect)

    stage("summarizing")
    summary = summarize(translated)

    stage("extracting")
    entities = extract_entities(translated)
    category = classify_category(translated)
    urgency = score_urgency(translated)
    keywords = extract_keywords(translated)

    confidence = _compute_confidence(dialect_conf)
    stage("done")

    return NLPResult(
        dialect=dialect,
        dialect_confidence=dialect_conf,
        translated_text=translated,
        summary=summary,
        named_entities=entities,
        keywords=keywords,
        urgency_level=urgency,
        category_name=category,
        confidence=confidence,
    )


def _compute_confidence(dialect_conf: float) -> float:
    """Heuristik confidence akhir berdasarkan model yang aktif.

    Baseline 0.4 → ada keyword classifier + TextRank (selalu ada).
    Naik per model neural yang aktif.
    """
    score = 0.4
    status = loader.status()
    if status["dialect"]["loaded"]:
        score += 0.15 * min(dialect_conf, 1.0)
    selected_summary = config.SUMMARIZER_MODEL
    if selected_summary in status and status[selected_summary]["loaded"]:
        score += 0.20
    if status["nllb"]["loaded"]:
        score += 0.10
    if status["ner"]["loaded"]:
        score += 0.15
    return round(min(score, 1.0), 3)


# ─────────────────────────────────────────────────────────────────────────────
# Stage 1: Dialect detection
# ─────────────────────────────────────────────────────────────────────────────
def detect_dialect(text: str) -> tuple[str, float]:
    """Return (kode dialek, confidence). 'xx' jika tidak terdeteksi."""
    cleaned = text.strip()
    if len(cleaned) < 10:
        return "xx", 0.0

    clf = loader.get(ModelKind.DIALECT)
    if clf is not None:
        try:
            probs = clf.predict_proba([cleaned])[0]
            classes = list(clf.classes_)
            top_idx = int(probs.argmax())
            top_label = classes[top_idx]
            top_conf = float(probs[top_idx])
            if top_conf >= config.MIN_DIALECT_CONF:
                return top_label, round(top_conf, 3)
            return "xx", round(top_conf, 3)
        except Exception as e:
            logger.warning("[nlp] dialect predict failed: %s", e)

    # Fallback ke langdetect
    try:
        from langdetect import detect, DetectorFactory
        DetectorFactory.seed = 42
        code = detect(cleaned)
        return code, 0.5
    except Exception:
        return "xx", 0.0


# ─────────────────────────────────────────────────────────────────────────────
# Stage 2: Translate ke Bahasa Indonesia
# ─────────────────────────────────────────────────────────────────────────────
def translate_to_indonesian(text: str, dialect: str) -> str:
    """Terjemahkan ke Bahasa Indonesia dengan fallback chain:
        1. NLLB lokal (kalau dialek ada di Flores-200)
        2. deep_translator (Google Translate)
        3. googletrans (lib lawas)
        4. raw text (skip translate)
    """
    if dialect in ("id", "xx"):
        return text

    # Stage 2.1 — NLLB local
    nllb_code = config.DIALECT_TO_NLLB.get(dialect)
    nllb_model = loader.get(ModelKind.NLLB) if nllb_code else None
    nllb_tok = loader.get_tokenizer(ModelKind.NLLB) if nllb_code else None
    if nllb_model is not None and nllb_tok is not None and nllb_code is not None:
        try:
            translated = _translate_nllb(text, nllb_code, nllb_tok, nllb_model)
            if _is_translation_usable(text, translated, dialect):
                return translated
            logger.info("[nlp] NLLB output terlihat belum terjemah penuh untuk %s", dialect)
        except Exception as e:
            logger.warning("[nlp] NLLB translate failed: %s", e)

    if not config.ALLOW_EXTERNAL_TRANSLATION:
        return text

    # Stage 2.2 — deep_translator
    translated = _translate_external(text, dialect)
    if translated:
        return translated

    # Stage 2.4 — return raw
    return text


def _translate_nllb(text: str, src_lang: str, tok, model) -> str:
    chunks = _split_translation_chunks(text, config.TRANSLATION_CHUNK_CHARS)
    translated_chunks = [
        _translate_nllb_chunk(chunk, src_lang, tok, model)
        for chunk in chunks
    ]
    return _join_translated_chunks(translated_chunks)


def _translate_nllb_chunk(text: str, src_lang: str, tok, model) -> str:
    """Inference NLLB dengan source language code Flores-200."""
    import torch

    tok.src_lang = src_lang
    enc = tok(
        text,
        return_tensors="pt",
        truncation=True,
        max_length=config.NLLB_MAX_INPUT_TOKENS,
    )
    target_token = tok.convert_tokens_to_ids(config.NLLB_TARGET_INDONESIAN)
    input_tokens = int(enc["input_ids"].shape[1])
    max_new_tokens = min(
        max(config.NLLB_MAX_NEW_TOKENS, int(input_tokens * 1.4)),
        256,
    )
    with torch.no_grad():
        out = model.generate(
            **enc,
            forced_bos_token_id=target_token,
            max_new_tokens=max_new_tokens,
            num_beams=1,          # greedy — lebih cepat 3-5x untuk teks pendek
            early_stopping=False, # tidak perlu dengan num_beams=1
        )
    return tok.batch_decode(out, skip_special_tokens=True)[0]


def _translate_external(text: str, dialect: str) -> str:
    source_candidates = []
    preferred_source = config.DIALECT_TO_GOOGLE.get(dialect)
    if preferred_source:
        source_candidates.append(preferred_source)
    if "auto" not in source_candidates:
        source_candidates.append("auto")

    chunks = _split_translation_chunks(text, config.EXTERNAL_TRANSLATION_CHUNK_CHARS)

    try:
        from deep_translator import GoogleTranslator

        for source in source_candidates:
            try:
                translator = GoogleTranslator(source=source, target="id")
                translated_chunks = [translator.translate(chunk) or "" for chunk in chunks]
                translated = _join_translated_chunks(translated_chunks)
                if _is_translation_usable(text, translated, dialect):
                    return translated
            except Exception as e:
                logger.info(
                    "[nlp] deep_translator failed untuk %s via %s (%s)",
                    dialect,
                    source,
                    e,
                )
    except Exception as e:
        logger.info("[nlp] deep_translator unavailable (%s); coba googletrans", e)

    try:
        from googletrans import Translator

        translator = Translator()
        for source in source_candidates:
            translated_chunks = []
            for chunk in chunks:
                kwargs = {"dest": "id"}
                if source != "auto":
                    kwargs["src"] = source
                result = translator.translate(chunk, **kwargs)
                translated_chunks.append(getattr(result, "text", "") or "")
            translated = _join_translated_chunks(translated_chunks)
            if _is_translation_usable(text, translated, dialect):
                return translated
    except Exception:
        pass

    return ""


def _split_translation_chunks(text: str, max_chars: int) -> list[str]:
    cleaned = text.strip()
    if not cleaned:
        return []

    paragraphs = [part.strip() for part in re.split(r"\n\s*\n+", cleaned) if part.strip()]
    chunks: list[str] = []
    for paragraph in paragraphs:
        chunks.extend(_split_chunk_unit(paragraph, max_chars))
    return chunks or [cleaned]


def _split_chunk_unit(text: str, max_chars: int) -> list[str]:
    if len(text) <= max_chars:
        return [text]

    pieces = [part.strip() for part in _SENTENCE_SPLIT_RE.split(text) if part.strip()]
    if len(pieces) == 1:
        return _split_chunk_words(text, max_chars)

    chunks: list[str] = []
    current = ""
    for piece in pieces:
        candidate = piece if not current else f"{current} {piece}"
        if len(candidate) <= max_chars:
            current = candidate
            continue
        if current:
            chunks.append(current)
        if len(piece) <= max_chars:
            current = piece
        else:
            chunks.extend(_split_chunk_words(piece, max_chars))
            current = ""
    if current:
        chunks.append(current)
    return chunks


def _split_chunk_words(text: str, max_chars: int) -> list[str]:
    words = text.split()
    chunks: list[str] = []
    current_words: list[str] = []
    current_len = 0

    for word in words:
        next_len = len(word) if not current_words else current_len + 1 + len(word)
        if current_words and next_len > max_chars:
            chunks.append(" ".join(current_words))
            current_words = [word]
            current_len = len(word)
            continue
        current_words.append(word)
        current_len = next_len

    if current_words:
        chunks.append(" ".join(current_words))
    return chunks


def _join_translated_chunks(chunks: list[str]) -> str:
    cleaned = [chunk.strip() for chunk in chunks if chunk and chunk.strip()]
    return "\n\n".join(cleaned)


def _is_translation_usable(source: str, translated: str, dialect: str) -> bool:
    if dialect in ("id", "xx"):
        return True
    if not translated or not translated.strip():
        return False

    source_norm = _normalize_text(source)
    translated_norm = _normalize_text(translated)
    if not source_norm or not translated_norm:
        return False
    if source_norm == translated_norm:
        return False

    source_words = len(source_norm.split())
    translated_words = len(translated_norm.split())
    if source_words >= 12 and SequenceMatcher(None, source_norm, translated_norm).ratio() >= 0.97:
        return False
    if source_words >= 40 and translated_words < max(12, int(source_words * 0.35)):
        return False
    return True


def _normalize_text(text: str) -> str:
    return _WHITESPACE_RE.sub(" ", text.strip().lower())


# ─────────────────────────────────────────────────────────────────────────────
# Stage 3: Summarize
# ─────────────────────────────────────────────────────────────────────────────
def summarize(text: str) -> str:
    """Ringkas dengan fallback chain:
        1. SUMMARIZER_MODEL (mt5 / indot5 / textrank / ner)
        2. SUMMARIZER_FALLBACKS (default: ner, textrank, first_sentences)
        3. 2 kalimat pertama
    """
    n_words = len(text.split())
    if n_words < config.MIN_WORDS_NEURAL:
        # Teks pendek — pakai 2 kalimat pertama
        return _summarize_first_sentences(text)

    summary = _try_summarizer(config.SUMMARIZER_MODEL, text)
    if summary:
        return summary

    for fallback_name in config.SUMMARIZER_FALLBACKS:
        if fallback_name == config.SUMMARIZER_MODEL:
            continue
        summary = _try_summarizer(fallback_name, text)
        if summary:
            return summary

    return _summarize_first_sentences(text)


def _try_summarizer(name: str, text: str) -> str:
    """Coba satu summarizer. Return string kosong kalau belum siap/gagal."""
    name = (name or "").strip().lower()
    if name in ("mt5", "indot5"):
        try:
            return _summarize_seq2seq(name, text)
        except Exception as e:
            logger.warning("[nlp] %s summarize failed: %s", name, e)
            return ""
    if name == "ner":
        return _summarize_ner_extractive(text)
    if name == "textrank":
        return _summarize_textrank(text)
    if name in ("first_sentences", "first_sentence", "sentences"):
        return _summarize_first_sentences(text)
    logger.warning("[nlp] unknown summarizer '%s'; skip", name)
    return ""


def _summarize_seq2seq(name: str, text: str) -> str:
    """Inference summarizer abstractive dari model seq2seq yang sudah loaded."""
    import torch

    params = _seq2seq_summary_params(name)
    model = loader.get_if_loaded(params["kind"])
    tok = loader.get_tokenizer_if_loaded(params["kind"])
    if model is None or tok is None:
        return ""

    prompt = params["prefix"] + text[: params["max_input"]]
    enc = tok(prompt, return_tensors="pt", truncation=True, max_length=params["max_input"])
    with torch.no_grad():
        out = model.generate(
            **enc,
            max_new_tokens=params["max_output"],
            num_beams=params["num_beams"],
            no_repeat_ngram_size=3,
            early_stopping=params["num_beams"] > 1,
            length_penalty=1.0,
        )
    return _postprocess_summary(tok.decode(out[0], skip_special_tokens=True))


def _seq2seq_summary_params(name: str) -> dict:
    if name == "indot5":
        return {
            "kind": ModelKind.INDOT5,
            "prefix": config.INDOT5_SUMMARY_PREFIX,
            "max_input": config.INDOT5_MAX_INPUT,
            "max_output": config.INDOT5_MAX_OUTPUT,
            "num_beams": config.INDOT5_NUM_BEAMS,
        }
    return {
        "kind": ModelKind.MT5,
        "prefix": config.MT5_SUMMARY_PREFIX,
        "max_input": config.MT5_MAX_INPUT,
        "max_output": config.MT5_MAX_OUTPUT,
        "num_beams": config.MT5_NUM_BEAMS,
    }


def _postprocess_summary(text: str) -> str:
    """Bersihkan artifact seq2seq — CamelCase merge, lowercasing, capitalize first."""
    text = re.sub(r"([a-z])([A-Z])", r"\1 \2", text)
    text = re.sub(r"\s+", " ", text).strip()
    text = text.lower()
    if text:
        text = text[0].upper() + text[1:]
    text = re.sub(r"([.!?]\s)([a-z])", lambda m: m.group(1) + m.group(2).upper(), text)
    return text


def _summarize_ner_extractive(text: str) -> str:
    """Extractive summary berbasis kepadatan entity per kalimat."""
    ner = loader.get_if_loaded(ModelKind.NER)
    if ner is None:
        return ""
    try:
        sents = [s.strip() for s in re.split(r"(?<=[.!?])\s+", text.strip()) if s.strip()]
        if not sents:
            return ""
        batch_ents = ner([s[:512] for s in sents])
        scores = [len(entities) for entities in batch_ents]
        top3 = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)[:3]
        summary = " ".join(sents[i] for i in sorted(top3))
        return " ".join(summary.split()[:80])
    except Exception as e:
        logger.warning("[nlp] NER extractive summarize failed: %s", e)
        return ""


def _summarize_textrank(text: str) -> str:
    """TextRank pakai sklearn TF-IDF + networkx PageRank."""
    try:
        import numpy as np
        import networkx as nx
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.metrics.pairwise import cosine_similarity

        sents = [s.strip() for s in re.split(r"(?<=[.!?])\s+", text.strip()) if s.strip()]
        if len(sents) <= 3:
            return " ".join(sents) or text.strip()
        vec = TfidfVectorizer().fit_transform(sents)
        sim = cosine_similarity(vec, vec)
        np.fill_diagonal(sim, 0)
        scores = nx.pagerank(nx.from_numpy_array(sim))
        ranked = sorted(scores, key=scores.get, reverse=True)[:3]
        return " ".join(sents[i] for i in sorted(ranked))
    except Exception:
        return _summarize_first_sentences(text)


def _summarize_first_sentences(text: str) -> str:
    """Fallback terakhir: dua kalimat pertama."""
    sents = re.split(r"(?<=[.!?])\s+", text.strip())
    return " ".join(sents[:2]).strip() or text.strip()


# ─────────────────────────────────────────────────────────────────────────────
# Stage 4: NER
# ─────────────────────────────────────────────────────────────────────────────
def extract_entities(text: str) -> list:
    """Extract named entities dengan fallback chain:
        1. Cahya BERT NER (jika loaded)
        2. Regex pattern matching (LOC/ORG/PER)
    """
    ner = loader.get_if_loaded(ModelKind.NER)
    if ner is not None:
        try:
            raw = ner(text[:512])
            seen = set()
            entities = []
            for e in raw:
                word = str(e.get("word", "")).strip()
                label = str(e.get("entity_group", "MISC"))
                score = float(e.get("score", 0.0))
                key = (word.lower(), label)
                if score > 0.6 and len(word) > 1 and key not in seen:
                    seen.add(key)
                    entities.append({"text": word, "label": label, "score": round(score, 3)})
            return entities
        except Exception as e:
            logger.warning("[nlp] NER failed: %s", e)

    return _extract_entities_regex(text)


def _extract_entities_regex(text: str) -> list:
    """Fallback NER — regex pattern matching untuk LOC/ORG/PER nusantara."""
    entities = []
    patterns = {
        "LOC": [
            r"Jalan\s+[A-Z]\w+", r"Jl\.\s*[A-Z]\w+", r"Desa\s+[A-Z]\w+",
            r"Kelurahan\s+[A-Z]\w+", r"Kecamatan\s+[A-Z]\w+",
            r"Kabupaten\s+[A-Z]\w+", r"Kota\s+[A-Z]\w+",
        ],
        "ORG": [
            r"Dinas\s+[A-Z]\w+", r"BPBD", r"PLN", r"PDAM", r"Polri",
            r"Puskesmas\s*\w*", r"RSUD\s*\w*",
        ],
        "PER": [
            r"Bapak\s+[A-Z]\w+", r"Ibu\s+[A-Z]\w+",
            r"Pak\s+[A-Z]\w+", r"Bu\s+[A-Z]\w+",
        ],
    }
    seen = set()
    for label, pats in patterns.items():
        for p in pats:
            for match in re.findall(p, text):
                key = (match.lower(), label)
                if key not in seen:
                    seen.add(key)
                    entities.append({"text": match, "label": label, "score": 0.7})
    return entities


# ─────────────────────────────────────────────────────────────────────────────
# Stage 5: Category (keyword matching, tidak butuh model)
# ─────────────────────────────────────────────────────────────────────────────
def classify_category(text: str) -> str:
    """Klasifikasi kategori 8 kelas berdasar keyword."""
    text_lower = text.lower()
    for category, keywords in config.CATEGORY_KEYWORDS.items():
        if any(kw in text_lower for kw in keywords):
            return category
    return "Umum"


# ─────────────────────────────────────────────────────────────────────────────
# Stage 6: Urgency (weighted keyword score)
# ─────────────────────────────────────────────────────────────────────────────
def score_urgency(text: str) -> str:
    """Skor urgensi → critical/high/medium/low."""
    text_lower = text.lower()
    total = 0
    for score, kws in config.URGENCY_KEYWORDS.items():
        for kw in kws:
            if kw in text_lower:
                total += score
    if total >= config.URGENCY_THRESHOLDS["critical"]:
        return "critical"
    if total >= config.URGENCY_THRESHOLDS["high"]:
        return "high"
    if total >= config.URGENCY_THRESHOLDS["medium"]:
        return "medium"
    return "low"


# ─────────────────────────────────────────────────────────────────────────────
# Stage 7: Keywords (frequency-based)
# ─────────────────────────────────────────────────────────────────────────────
def extract_keywords(text: str, top_n: int = 5) -> list:
    """Top-N keyword setelah filter stopword."""
    words = re.findall(r"\b[a-zA-Z]{4,}\b", text.lower())
    freq: dict = {}
    for w in words:
        if w not in config.STOPWORDS_ID:
            freq[w] = freq.get(w, 0) + 1
    return sorted(freq.keys(), key=lambda w: (-freq[w], -len(w)))[:top_n]


# ─────────────────────────────────────────────────────────────────────────────
# Compatibility shim — module-level fns yang sebelumnya di-export
# ─────────────────────────────────────────────────────────────────────────────
def load_models() -> None:
    """Backward compat — sekarang delegasi ke loader.start_warmup()."""
    loader.start_warmup()


def dialect_name(code: str) -> str:
    return config.dialect_name(code)
