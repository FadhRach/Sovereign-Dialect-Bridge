"""
Lazy model loader untuk NLP pipeline.

Aturan:
  1. Boot Django HARUS cepat — model load di background thread, tidak block listen port.
  2. Thread-safe — `get()` blocking dengan lock jika memang dipakai, sedangkan
     `get_if_loaded()` non-blocking untuk request pipeline yang harus cepat.
  3. Idempotent — load_models() / get_*() boleh dipanggil berkali-kali.
  4. Graceful fallback — jika satu model gagal load (RAM kurang, network putus),
     model lain tetap dipakai dan pipeline pakai fallback chain.

Pemakaian:
    from nlp.models import loader, ModelKind

    # Di apps.py (boot):
    loader.start_warmup()

    # Di pipeline.py (saat request):
    clf = loader.get(ModelKind.DIALECT)         # dialect kecil, boleh blocking
    mt5 = loader.get_if_loaded(ModelKind.MT5)   # model berat, non-blocking
    indot5 = loader.get_if_loaded(ModelKind.INDOT5)
    if clf is None: ...                          # gagal load, pakai fallback
"""

from __future__ import annotations

import logging
import os
import threading
import time
from dataclasses import dataclass
from enum import Enum
from typing import Any, Optional

from . import config

logger = logging.getLogger(__name__)


class ModelKind(str, Enum):
    DIALECT = "dialect"
    NLLB = "nllb"
    MT5 = "mt5"
    INDOT5 = "indot5"
    NER = "ner"


@dataclass
class _ModelSlot:
    """Wadah satu model + state-nya."""
    instance: Any = None
    tokenizer: Any = None        # untuk seq2seq (NLLB, mT5)
    loading: bool = False
    loaded: bool = False
    failed: bool = False
    load_ms: int = 0
    started_at: float = 0.0
    error: str = ""


class _Loader:
    """Singleton loader — pegang semua model dalam dict, lock per-kind."""

    def __init__(self) -> None:
        self._slots: dict[ModelKind, _ModelSlot] = {kind: _ModelSlot() for kind in ModelKind}
        self._locks: dict[ModelKind, threading.Lock] = {kind: threading.Lock() for kind in ModelKind}
        self._warmup_thread: Optional[threading.Thread] = None
        self._warmup_started = threading.Event()

    # ─── Public API ──────────────────────────────────────────────────────────

    def start_warmup(self) -> None:
        """Spawn 1 background thread untuk load SEMUA model.

        Aman dipanggil berkali-kali — thread cuma start sekali.
        """
        if not is_enabled():
            logger.info("[nlp] NLP_ENABLED=false → skip background warmup")
            return
        if self._warmup_started.is_set():
            return
        self._warmup_started.set()
        self._warmup_thread = threading.Thread(
            target=self._warmup_all, name="nlp-warmup", daemon=True
        )
        self._warmup_thread.start()
        logger.info("[nlp] background warmup started")

    def get(self, kind: ModelKind) -> Optional[Any]:
        """Return model instance (atau None kalau gagal load / NLP_ENABLED=false).

        Kalau warmup belum selesai untuk kind ini, blocking load di sini —
        tapi HANYA jika NLP_ENABLED=true. Kalau false, return None → pipeline
        otomatis pakai fallback chain.

        Khusus DIALECT detector: tetap di-load walau NLP_ENABLED=false, karena
        file lokal kecil (5 MB joblib, ~100 ms) dan tidak butuh torch/HF Hub.
        """
        slot = self._slots[kind]
        if slot.loaded or slot.failed:
            return slot.instance if slot.loaded else None
        # Gating: skip heavy models kalau NLP disabled (dialect detector lewati gate)
        if kind != ModelKind.DIALECT and not is_enabled():
            return None
        # Ambil lock supaya hanya 1 thread yang load
        with self._locks[kind]:
            if not slot.loaded and not slot.failed:
                self._load_one(kind)
        return slot.instance if slot.loaded else None

    def get_tokenizer(self, kind: ModelKind) -> Optional[Any]:
        """Return tokenizer untuk seq2seq model (NLLB, mT5)."""
        self.get(kind)  # pastikan ter-load
        return self._slots[kind].tokenizer

    def get_if_loaded(self, kind: ModelKind) -> Optional[Any]:
        """Return model hanya jika sudah loaded, tanpa trigger blocking load."""
        slot = self._slots[kind]
        return slot.instance if slot.loaded else None

    def get_tokenizer_if_loaded(self, kind: ModelKind) -> Optional[Any]:
        """Return tokenizer hanya jika model sudah loaded, tanpa blocking."""
        slot = self._slots[kind]
        return slot.tokenizer if slot.loaded else None

    def status(self) -> dict[str, dict]:
        """Snapshot status semua model — untuk health/debug endpoint."""
        snapshot = {}
        for kind in ModelKind:
            slot = self._slots[kind]
            elapsed_ms = slot.load_ms
            if slot.loading and slot.started_at:
                elapsed_ms = int((time.monotonic() - slot.started_at) * 1000)
            snapshot[kind.value] = {
                "loading": slot.loading,
                "loaded": slot.loaded,
                "failed": slot.failed,
                "load_ms": slot.load_ms,
                "elapsed_ms": elapsed_ms,
                "error": slot.error,
            }
        return snapshot

    # ─── Background warmup ───────────────────────────────────────────────────

    def _warmup_all(self) -> None:
        """Load semua model satu per satu di thread terpisah.

        Urutan: ringan dulu (dialect) → NER lokal/baked → model berat.
        NER sengaja sebelum NLLB/mT5 supaya dashboard tidak terlihat "pending"
        lama untuk semua model saat model berat masih download/load.
        """
        for kind in self._warmup_order():
            with self._locks[kind]:
                if not self._slots[kind].loaded and not self._slots[kind].failed:
                    self._load_one(kind)

    def _warmup_order(self) -> list[ModelKind]:
        """Urutan warmup: model ringan dulu, summarizer sesuai env."""
        order = [ModelKind.DIALECT, ModelKind.NER, ModelKind.NLLB]
        summary_map = {
            "mt5": ModelKind.MT5,
            "indot5": ModelKind.INDOT5,
        }
        for name in config.WARMUP_SUMMARIZERS:
            kind = summary_map.get(name)
            if kind and kind not in order:
                order.append(kind)
        return order

    # ─── Per-model loaders ───────────────────────────────────────────────────

    def _load_one(self, kind: ModelKind) -> None:
        """Dispatch ke loader spesifik. CALLER MUST HOLD LOCK."""
        slot = self._slots[kind]
        t0 = time.monotonic()
        slot.loading = True
        slot.started_at = t0
        slot.error = ""
        logger.info("[nlp] %s loading started", kind.value)
        try:
            if kind == ModelKind.DIALECT:
                self._load_dialect(slot)
            elif kind == ModelKind.NLLB:
                self._load_nllb(slot)
            elif kind == ModelKind.MT5:
                self._load_mt5(slot)
            elif kind == ModelKind.INDOT5:
                self._load_indot5(slot)
            elif kind == ModelKind.NER:
                self._load_ner(slot)
            slot.loaded = True
            slot.load_ms = int((time.monotonic() - t0) * 1000)
            logger.info("[nlp] %s loaded in %d ms", kind.value, slot.load_ms)
        except Exception as e:
            slot.failed = True
            slot.load_ms = int((time.monotonic() - t0) * 1000)
            slot.error = str(e)[:300]
            logger.warning("[nlp] %s load FAILED in %d ms: %s", kind.value, slot.load_ms, e)
        finally:
            slot.loading = False

    def _load_dialect(self, slot: _ModelSlot) -> None:
        import joblib

        # 1. Coba dari file lokal (dev mode, atau sudah di-copy di Docker image)
        if config.DIALECT_MODEL_PATH.exists():
            slot.instance = joblib.load(config.DIALECT_MODEL_PATH)
            return

        # 2. Pull dari HF Hub jika env var DIALECT_MODEL_HF diset
        if config.DIALECT_MODEL_HF:
            from huggingface_hub import hf_hub_download
            path = hf_hub_download(
                repo_id=config.DIALECT_MODEL_HF,
                filename="dialect_detector.joblib",
            )
            slot.instance = joblib.load(path)
            return

        raise FileNotFoundError(
            f"Dialect model tidak ditemukan. "
            f"Set DIALECT_MODEL_HF=<user>/<repo> atau pastikan "
            f"{config.DIALECT_MODEL_PATH} ada."
        )

    def _load_nllb(self, slot: _ModelSlot) -> None:
        from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
        slot.tokenizer = AutoTokenizer.from_pretrained(config.NLLB_MODEL_ID)
        slot.instance = AutoModelForSeq2SeqLM.from_pretrained(
            config.NLLB_MODEL_ID, low_cpu_mem_usage=True
        )
        slot.instance.eval()

    def _load_mt5(self, slot: _ModelSlot) -> None:
        from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
        slot.tokenizer = AutoTokenizer.from_pretrained(config.MT5_MODEL_PATH)
        slot.instance = AutoModelForSeq2SeqLM.from_pretrained(
            config.MT5_MODEL_PATH, low_cpu_mem_usage=True
        )
        slot.instance.eval()

    def _load_indot5(self, slot: _ModelSlot) -> None:
        from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
        slot.tokenizer = AutoTokenizer.from_pretrained(config.INDOT5_MODEL_PATH)
        slot.instance = AutoModelForSeq2SeqLM.from_pretrained(
            config.INDOT5_MODEL_PATH, low_cpu_mem_usage=True
        )
        slot.instance.eval()

    def _load_ner(self, slot: _ModelSlot) -> None:
        from transformers import pipeline as hf_pipeline
        slot.instance = hf_pipeline(
            "ner",
            model=config.NER_MODEL_ID,
            aggregation_strategy="simple",
        )


def is_enabled() -> bool:
    """Helper untuk cek env var NLP_ENABLED.

    Definitif: env var diambil setiap kali dipanggil (cocok untuk test
    override). Cache tidak dipakai supaya bisa toggle di runtime.
    """
    return os.environ.get("NLP_ENABLED", "false").lower() in ("1", "true", "yes")


# Singleton — import ini dari pipeline.py / apps.py
loader = _Loader()
