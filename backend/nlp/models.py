"""
Lazy loader untuk dialect detector.

Model neural berat (NLLB, mT5/IndoT5, NER) sekarang jalan di layanan Modal
terpisah (lihat ../../nlp-service/) karena tidak muat di serverless Vercel.
Dialect detector tetap lokal karena kecil (joblib, ~5MB) dan tidak butuh torch.

Pemakaian:
    from nlp.models import loader

    clf = loader.get()   # None kalau file model tidak ada
"""

from __future__ import annotations

import threading
from dataclasses import dataclass
from typing import Any, Optional

from . import config


@dataclass
class _DialectSlot:
    instance: Any = None
    loaded: bool = False
    failed: bool = False
    error: str = ""


class _Loader:
    """Singleton loader untuk dialect detector."""

    def __init__(self) -> None:
        self._slot = _DialectSlot()
        self._lock = threading.Lock()

    def get(self) -> Optional[Any]:
        if self._slot.loaded or self._slot.failed:
            return self._slot.instance if self._slot.loaded else None
        with self._lock:
            if not self._slot.loaded and not self._slot.failed:
                self._load()
        return self._slot.instance if self._slot.loaded else None

    def status(self) -> dict:
        return {
            "dialect": {
                "loaded": self._slot.loaded,
                "failed": self._slot.failed,
                "error": self._slot.error,
            }
        }

    def _load(self) -> None:
        import joblib

        try:
            if config.DIALECT_MODEL_PATH.exists():
                self._slot.instance = joblib.load(config.DIALECT_MODEL_PATH)
            elif config.DIALECT_MODEL_HF:
                from huggingface_hub import hf_hub_download

                path = hf_hub_download(repo_id=config.DIALECT_MODEL_HF, filename="dialect_detector.joblib")
                self._slot.instance = joblib.load(path)
            else:
                raise FileNotFoundError(
                    f"Dialect model tidak ditemukan di {config.DIALECT_MODEL_PATH} "
                    f"dan DIALECT_MODEL_HF tidak diset."
                )
            self._slot.loaded = True
        except Exception as e:
            self._slot.failed = True
            self._slot.error = str(e)[:300]


loader = _Loader()
