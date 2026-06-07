"""
NLP pipeline orchestrator untuk Sovereign Dialect-Bridge.

Alur:
    input → detect_dialect → translate(NLLB) → summarize(mT5) → extract_entities
                                                              → classify_category
                                                              → score_urgency
                                                              → extract_keywords
                                                              → output

Setiap stage punya FALLBACK CHAIN supaya pipeline tidak pernah crash:
    - Dialect: joblib clf → langdetect → "xx"
    - Translate: NLLB → deep_translator → googletrans → raw text
    - Summarize: mT5 → TextRank (sklearn+networkx) → 2 first sentences
    - NER: Cahya BERT → regex pattern matching
    - Category & Urgency: keyword scoring (selalu bisa, tidak butuh model)

Model di-load lazy di `nlp.models.loader` — boot Django cepat, model load di
background thread. Lihat `nlp/models.py` untuk detail.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from typing import Callable, Optional

# CATATAN: torch sengaja TIDAK di-import di top-level.
# Import torch berat (~2-3 detik + ratusan MB RAM). Kita lazy-import
# hanya di dalam fungsi yang butuh (_translate_nllb, _summarize_mt5).
# Kalau pipeline jalan di fallback mode (tanpa neural), torch tidak ke-load sama sekali.

from . import config
from .models import ModelKind, loader

logger = logging.getLogger(__name__)


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
    """Jalankan pipeline lengkap dengan progress callback per stage."""

    def stage(name: str) -> None:
        if on_stage:
            try:
                on_stage(name)
            except Exception:
                pass

    stage("detecting")
    dialect, dialect_conf = detect_dialect(raw_text)

    stage("translating")
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
    if status["mt5"]["loaded"]:
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
            return _translate_nllb(text, nllb_code, nllb_tok, nllb_model)
        except Exception as e:
            logger.warning("[nlp] NLLB translate failed: %s", e)

    # Stage 2.2 — deep_translator
    try:
        from deep_translator import GoogleTranslator
        src = config.DIALECT_TO_GOOGLE.get(dialect, "auto")
        out = GoogleTranslator(source=src, target="id").translate(text[:4500])
        if out and out.strip():
            return out
    except Exception as e:
        logger.info("[nlp] deep_translator failed (%s); coba googletrans", e)

    # Stage 2.3 — googletrans (lawas, sering broken)
    try:
        from googletrans import Translator
        result = Translator().translate(text, dest="id")
        if result and result.text:
            return result.text
    except Exception:
        pass

    # Stage 2.4 — return raw
    return text


def _translate_nllb(text: str, src_lang: str, tok, model) -> str:
    """Inference NLLB dengan source language code Flores-200."""
    import torch
    tok.src_lang = src_lang
    enc = tok(text[:1024], return_tensors="pt", truncation=True, max_length=512)
    # NLLB butuh forced_bos_token_id untuk arahkan output ke bahasa target
    target_token = tok.convert_tokens_to_ids(config.NLLB_TARGET_INDONESIAN)
    with torch.no_grad():
        out = model.generate(
            **enc,
            forced_bos_token_id=target_token,
            max_new_tokens=512,
            num_beams=2,
            early_stopping=True,
        )
    return tok.batch_decode(out, skip_special_tokens=True)[0]


# ─────────────────────────────────────────────────────────────────────────────
# Stage 3: Summarize
# ─────────────────────────────────────────────────────────────────────────────
def summarize(text: str) -> str:
    """Ringkas dengan fallback chain:
        1. mT5 (kalau loaded & teks >= MIN_WORDS_NEURAL)
        2. TextRank (sklearn TF-IDF + networkx PageRank)
        3. 2 kalimat pertama
    """
    n_words = len(text.split())
    if n_words < config.MIN_WORDS_NEURAL:
        # Teks pendek — pakai 2 kalimat pertama
        sents = re.split(r"(?<=[.!?])\s+", text.strip())
        return " ".join(sents[:2]).strip() or text.strip()

    mt5_model = loader.get(ModelKind.MT5)
    mt5_tok = loader.get_tokenizer(ModelKind.MT5)
    if mt5_model is not None and mt5_tok is not None:
        try:
            return _summarize_mt5(text, mt5_tok, mt5_model)
        except Exception as e:
            logger.warning("[nlp] mT5 summarize failed: %s", e)

    return _summarize_textrank(text)


def _summarize_mt5(text: str, tok, model) -> str:
    """Inference mT5 fine-tuned NusaSum."""
    import torch
    prompt = "ringkas: " + text[:config.MT5_MAX_INPUT]
    enc = tok(prompt, return_tensors="pt", truncation=True, max_length=512)
    with torch.no_grad():
        out = model.generate(
            **enc,
            max_new_tokens=config.MT5_MAX_OUTPUT,
            num_beams=config.MT5_NUM_BEAMS,
            no_repeat_ngram_size=3,
            early_stopping=True,
            length_penalty=1.0,
        )
    return _postprocess_mt5(tok.decode(out[0], skip_special_tokens=True))


def _postprocess_mt5(text: str) -> str:
    """Bersihkan artifact mT5 — CamelCase merge, lowercasing, capitalize first."""
    text = re.sub(r"([a-z])([A-Z])", r"\1 \2", text)
    text = re.sub(r"\s+", " ", text).strip()
    text = text.lower()
    if text:
        text = text[0].upper() + text[1:]
    text = re.sub(r"([.!?]\s)([a-z])", lambda m: m.group(1) + m.group(2).upper(), text)
    return text


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
    ner = loader.get(ModelKind.NER)
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
