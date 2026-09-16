"""
NLP pipeline lokal (fallback) untuk Sovereign Dialect-Bridge.

Model neural (NLLB translate, mT5/IndoT5 summarize, IndoBERT NER) jalan di
layanan Modal terpisah (../../nlp-service/) dan dipicu lewat
`nlp.modal_client`. Pipeline di file ini adalah jalur ringan tanpa torch,
dipakai saat:
    - Modal tidak terjangkau (network error, service down) → dipanggil
      langsung oleh complaints/views.py sebagai pengganti hasil neural.
    - Callback dari Modal sudah membawa translated_text/summary/entities;
      classify_category/score_urgency/extract_keywords tetap jalan di sini
      karena keduanya cukup dengan keyword matching, tidak butuh model.

Alur lengkap (run_pipeline):
    input → detect_dialect → translate (deep_translator fallback)
                            → summarize (TextRank fallback)
                            → extract_entities (regex)
                            → classify_category → score_urgency → extract_keywords
"""

from __future__ import annotations

from difflib import SequenceMatcher
import logging
import re
from dataclasses import dataclass, field
from typing import Callable, Optional

from . import config
from .models import loader

logger = logging.getLogger(__name__)
_SENTENCE_SPLIT_RE = re.compile(r"(?<=[.!?])\s+")
_WHITESPACE_RE = re.compile(r"\s+")


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


def run_pipeline(raw_text: str, on_stage: Optional[ProgressCallback] = None) -> NLPResult:
    """Jalankan pipeline lokal lengkap — dipakai saat Modal tidak terjangkau."""

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
        confidence=_compute_confidence(dialect_conf),
    )


def _compute_confidence(dialect_conf: float) -> float:
    """Heuristik confidence untuk hasil pipeline lokal (tanpa model neural)."""
    score = 0.4
    if loader.status()["dialect"]["loaded"]:
        score += 0.15 * min(dialect_conf, 1.0)
    return round(min(score, 1.0), 3)


# ─────────────────────────────────────────────────────────────────────────────
# Stage 1: Dialect detection
# ─────────────────────────────────────────────────────────────────────────────
def detect_dialect(text: str) -> tuple[str, float]:
    """Return (kode dialek, confidence). 'xx' jika tidak terdeteksi."""
    cleaned = text.strip()
    if len(cleaned) < 10:
        return "xx", 0.0

    clf = loader.get()
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

    try:
        from langdetect import detect, DetectorFactory
        DetectorFactory.seed = 42
        code = detect(cleaned)
        return code, 0.5
    except Exception:
        return "xx", 0.0


# ─────────────────────────────────────────────────────────────────────────────
# Stage 2: Translate ke Bahasa Indonesia (deep_translator / googletrans)
# ─────────────────────────────────────────────────────────────────────────────
def translate_to_indonesian(text: str, dialect: str) -> str:
    """Terjemahkan ke Bahasa Indonesia lewat layanan eksternal (bukan model lokal)."""
    if dialect in ("id", "xx"):
        return text
    if not config.ALLOW_EXTERNAL_TRANSLATION:
        return text

    translated = _translate_external(text, dialect)
    return translated or text


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
                logger.info("[nlp] deep_translator failed untuk %s via %s (%s)", dialect, source, e)
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
# Stage 3: Summarize (TextRank)
# ─────────────────────────────────────────────────────────────────────────────
def summarize(text: str) -> str:
    """Ringkas dengan TextRank; fallback dua kalimat pertama."""
    if len(text.split()) < config.MIN_WORDS_TEXTRANK:
        return _summarize_first_sentences(text)
    return _summarize_textrank(text) or _summarize_first_sentences(text)


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
# Stage 4: NER (regex)
# ─────────────────────────────────────────────────────────────────────────────
def extract_entities(text: str) -> list:
    """Extract named entities lewat regex pattern matching (LOC/ORG/PER)."""
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
# Stage 5: Category (keyword matching)
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


def dialect_name(code: str) -> str:
    return config.dialect_name(code)
