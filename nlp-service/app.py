"""
Modal service — inference model neural untuk Sovereign Dialect-Bridge.

Menangani 3 stage berat yang tidak muat di serverless Vercel: translate (NLLB),
summarize (mT5/IndoT5), extract entities (IndoBERT NER). Dipanggil oleh backend
Django lewat endpoint /start (trigger async), hasil dikirim balik lewat callback
HTTP ke Django saat selesai.

Deploy: modal deploy app.py
"""

import os
import re
from difflib import SequenceMatcher

import modal
from fastapi import Request

app = modal.App("sovereign-dialect-bridge-nlp")

image = (
    modal.Image.debian_slim(python_version="3.11")
    # CPU-only wheel — index terpisah supaya tidak ikut download ~2GB paket CUDA/GPU
    # yang tidak kepakai (function ini tidak minta GPU).
    .pip_install("torch==2.4.1", index_url="https://download.pytorch.org/whl/cpu")
    .pip_install(
        "transformers==4.45.2",
        "sentencepiece==0.2.0",
        "protobuf==4.25.3",
        "safetensors==0.4.5",
        "accelerate==1.0.1",
        "huggingface-hub==0.25.1",
        "deep-translator==1.11.4",
        "fastapi==0.115.0",
        "requests==2.32.3",
    )
)

model_cache = modal.Volume.from_name("sovereign-nlp-model-cache", create_if_missing=True)
CACHE_DIR = "/cache"

SUMMARIZER_MODEL = os.environ.get("SUMMARIZER_MODEL", "mt5")
MT5_MODEL_PATH = os.environ.get("MT5_MODEL_PATH", "OinoVenv/sovereign-mt5-nusasum")

INDOT5_MODEL_PATH = os.environ.get("INDOT5_MODEL_PATH", "OinoVenv/sovereign-indot5-nusasum")
NLLB_MODEL_ID = os.environ.get("NLLB_MODEL_ID", "facebook/nllb-200-distilled-600M")
NER_MODEL_ID = os.environ.get("NER_MODEL_ID", "cahya/bert-base-indonesian-NER")

SUMMARY_PREFIX = "ringkas: "
MAX_INPUT_TOKENS = 512
MAX_SUMMARY_TOKENS = 80
NLLB_MAX_NEW_TOKENS = 200
NLLB_MAX_INPUT_TOKENS = 384
TRANSLATION_CHUNK_CHARS = 420
NLLB_TARGET_INDONESIAN = "ind_Latn"

DIALECT_TO_NLLB = {
    "jv": "jav_Latn", "su": "sun_Latn", "min": "min_Latn", "ace": "ace_Latn",
    "ban": "ban_Latn", "bjn": "bjn_Latn", "bug": "bug_Latn", "en": "eng_Latn",
}
DIALECT_TO_GOOGLE = {
    "jv": "jw", "su": "su", "min": "auto", "ace": "auto", "ban": "auto",
    "bjn": "auto", "bug": "auto", "mad": "auto", "nij": "auto", "bbc": "auto", "en": "en",
}

_SENTENCE_SPLIT_RE = re.compile(r"(?<=[.!?])\s+")
_WHITESPACE_RE = re.compile(r"\s+")


@app.cls(
    image=image,
    volumes={CACHE_DIR: model_cache},
    secrets=[modal.Secret.from_name("nlp-service-secret")],
    scaledown_window=300,
    timeout=180,
)
class NLPModels:
    """Model neural di-load sekali per container, reuse antar-request selama warm."""

    @modal.enter()
    def load(self):
        os.environ["HF_HOME"] = f"{CACHE_DIR}/huggingface"
        from transformers import AutoModelForSeq2SeqLM, AutoTokenizer, pipeline

        self.nllb_tok = AutoTokenizer.from_pretrained(NLLB_MODEL_ID)
        self.nllb_model = AutoModelForSeq2SeqLM.from_pretrained(NLLB_MODEL_ID, low_cpu_mem_usage=True)
        self.nllb_model.eval()

        summarizer_path = INDOT5_MODEL_PATH if SUMMARIZER_MODEL == "indot5" else MT5_MODEL_PATH
        self.summary_tok = AutoTokenizer.from_pretrained(summarizer_path)
        self.summary_model = AutoModelForSeq2SeqLM.from_pretrained(summarizer_path, low_cpu_mem_usage=True)
        self.summary_model.eval()

        self.ner = pipeline("ner", model=NER_MODEL_ID, aggregation_strategy="simple")
        model_cache.commit()

    @modal.method()
    def process(self, complaint_id: int, text: str, dialect: str, callback_url: str, callback_secret: str):
        import requests

        try:
            translated = self._translate(text, dialect)
            summary = self._summarize(translated)
            entities = self._extract_entities(translated)

            payload = {
                "complaint_id": complaint_id,
                "translated_text": translated,
                "summary": summary,
                "named_entities": entities,
            }
            response = requests.post(
                callback_url,
                json=payload,
                headers={"Authorization": f"Bearer {callback_secret}"},
                timeout=15,
            )
            print(f"[nlp] complaint {complaint_id} done, callback status {response.status_code}")
        except Exception as e:
            print(f"[nlp] complaint {complaint_id} failed: {e}")
            raise

    # ─── Translate ────────────────────────────────────────────────────────
    def _translate(self, text: str, dialect: str) -> str:
        if dialect in ("id", "xx"):
            return text

        nllb_code = DIALECT_TO_NLLB.get(dialect)
        if nllb_code:
            try:
                translated = self._translate_nllb(text, nllb_code)
                if _is_translation_usable(text, translated, dialect):
                    return translated
            except Exception:
                pass

        translated = self._translate_external(text, dialect)
        return translated or text

    def _translate_nllb(self, text: str, src_lang: str) -> str:
        import torch

        chunks = _split_translation_chunks(text, TRANSLATION_CHUNK_CHARS)
        translated_chunks = []
        self.nllb_tok.src_lang = src_lang
        target_token = self.nllb_tok.convert_tokens_to_ids(NLLB_TARGET_INDONESIAN)
        for chunk in chunks:
            enc = self.nllb_tok(chunk, return_tensors="pt", truncation=True, max_length=NLLB_MAX_INPUT_TOKENS)
            input_tokens = int(enc["input_ids"].shape[1])
            max_new_tokens = min(max(NLLB_MAX_NEW_TOKENS, int(input_tokens * 1.4)), 256)
            with torch.no_grad():
                out = self.nllb_model.generate(
                    **enc,
                    forced_bos_token_id=target_token,
                    max_new_tokens=max_new_tokens,
                    num_beams=1,
                    early_stopping=False,
                )
            translated_chunks.append(self.nllb_tok.batch_decode(out, skip_special_tokens=True)[0])
        return _join_translated_chunks(translated_chunks)

    def _translate_external(self, text: str, dialect: str) -> str:
        from deep_translator import GoogleTranslator

        sources = [DIALECT_TO_GOOGLE.get(dialect, "auto"), "auto"]
        chunks = _split_translation_chunks(text, 4000)
        for source in dict.fromkeys(sources):
            try:
                translator = GoogleTranslator(source=source, target="id")
                translated_chunks = [translator.translate(chunk) or "" for chunk in chunks]
                translated = _join_translated_chunks(translated_chunks)
                if _is_translation_usable(text, translated, dialect):
                    return translated
            except Exception:
                continue
        return ""

    # ─── Summarize ────────────────────────────────────────────────────────
    def _summarize(self, text: str) -> str:
        if len(text.split()) < 40:
            return _first_sentences(text)
        try:
            import torch

            prompt = SUMMARY_PREFIX + text[:MAX_INPUT_TOKENS]
            enc = self.summary_tok(prompt, return_tensors="pt", truncation=True, max_length=MAX_INPUT_TOKENS)
            with torch.no_grad():
                out = self.summary_model.generate(
                    **enc,
                    max_new_tokens=MAX_SUMMARY_TOKENS,
                    num_beams=1,
                    no_repeat_ngram_size=3,
                    early_stopping=False,
                )
            summary = self.summary_tok.decode(out[0], skip_special_tokens=True)
            return _postprocess_summary(summary) or _first_sentences(text)
        except Exception:
            return _first_sentences(text)

    # ─── Entities ─────────────────────────────────────────────────────────
    def _extract_entities(self, text: str) -> list:
        try:
            raw = self.ner(text[:512])
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
        except Exception:
            return []


@app.function(image=image, secrets=[modal.Secret.from_name("nlp-service-secret")])
@modal.fastapi_endpoint(method="POST")
async def start(request: Request):
    from fastapi import HTTPException

    _require_secret(request.headers.get("authorization"))

    payload = await request.json()
    complaint_id = payload.get("complaint_id")
    text = payload.get("text")
    dialect = payload.get("dialect", "xx")
    callback_url = payload.get("callback_url")
    if not (complaint_id and text and callback_url):
        raise HTTPException(status_code=400, detail="complaint_id, text, dan callback_url wajib diisi.")

    callback_secret = os.environ["MODAL_SHARED_SECRET"]
    await NLPModels().process.spawn.aio(complaint_id, text, dialect, callback_url, callback_secret)
    return {"status": "accepted"}


@app.function(image=image)
@modal.fastapi_endpoint(method="GET")
def health():
    return {"status": "ok"}


def _require_secret(authorization: str) -> None:
    from fastapi import HTTPException

    expected = f"Bearer {os.environ['MODAL_SHARED_SECRET']}"
    if authorization != expected:
        raise HTTPException(status_code=401, detail="Unauthorized.")


# ─── Text helpers (dipakai translate & summarize) ──────────────────────────
def _split_translation_chunks(text: str, max_chars: int) -> list:
    cleaned = text.strip()
    if not cleaned:
        return []
    paragraphs = [p.strip() for p in re.split(r"\n\s*\n+", cleaned) if p.strip()]
    chunks = []
    for paragraph in paragraphs:
        chunks.extend(_split_chunk_unit(paragraph, max_chars))
    return chunks or [cleaned]


def _split_chunk_unit(text: str, max_chars: int) -> list:
    if len(text) <= max_chars:
        return [text]
    pieces = [p.strip() for p in _SENTENCE_SPLIT_RE.split(text) if p.strip()]
    if len(pieces) == 1:
        return _split_chunk_words(text, max_chars)
    chunks, current = [], ""
    for piece in pieces:
        candidate = piece if not current else f"{current} {piece}"
        if len(candidate) <= max_chars:
            current = candidate
            continue
        if current:
            chunks.append(current)
        current = piece if len(piece) <= max_chars else ""
        if not current:
            chunks.extend(_split_chunk_words(piece, max_chars))
    if current:
        chunks.append(current)
    return chunks


def _split_chunk_words(text: str, max_chars: int) -> list:
    words = text.split()
    chunks, current_words, current_len = [], [], 0
    for word in words:
        next_len = len(word) if not current_words else current_len + 1 + len(word)
        if current_words and next_len > max_chars:
            chunks.append(" ".join(current_words))
            current_words, current_len = [word], len(word)
            continue
        current_words.append(word)
        current_len = next_len
    if current_words:
        chunks.append(" ".join(current_words))
    return chunks


def _join_translated_chunks(chunks: list) -> str:
    cleaned = [c.strip() for c in chunks if c and c.strip()]
    return "\n\n".join(cleaned)


def _is_translation_usable(source: str, translated: str, dialect: str) -> bool:
    if dialect in ("id", "xx"):
        return True
    if not translated or not translated.strip():
        return False
    source_norm = _normalize_text(source)
    translated_norm = _normalize_text(translated)
    if not source_norm or not translated_norm or source_norm == translated_norm:
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


def _postprocess_summary(text: str) -> str:
    text = re.sub(r"([a-z])([A-Z])", r"\1 \2", text)
    text = re.sub(r"\s+", " ", text).strip().lower()
    if text:
        text = text[0].upper() + text[1:]
    text = re.sub(r"([.!?]\s)([a-z])", lambda m: m.group(1) + m.group(2).upper(), text)
    return text


def _first_sentences(text: str) -> str:
    sents = _SENTENCE_SPLIT_RE.split(text.strip())
    return " ".join(sents[:2]).strip() or text.strip()
