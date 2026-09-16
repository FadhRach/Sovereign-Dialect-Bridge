"""
Client tipis untuk memicu inference neural di layanan Modal (../../nlp-service/).

Django hanya mengirim trigger (cepat, non-blocking di sisi Modal) — hasil
sebenarnya dikirim balik lewat callback HTTP ke NLPCallbackView setelah Modal
selesai memproses. Lihat complaints/views.py untuk jalur trigger + fallback,
dan NLPCallbackView untuk penerimaan hasil.
"""

from __future__ import annotations

import logging

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

TRIGGER_TIMEOUT_SEC = 5


def trigger_modal_processing(complaint_id: int, text: str, dialect: str) -> bool:
    """Kirim trigger ke Modal. Return True kalau diterima, False kalau gagal.

    Tidak menunggu hasil NLP selesai — Modal jalankan di background dan
    memanggil callback_url sendiri setelah selesai.
    """
    if not settings.MODAL_START_URL:
        return False

    try:
        response = requests.post(
            settings.MODAL_START_URL,
            json={
                "complaint_id": complaint_id,
                "text": text,
                "dialect": dialect,
                "callback_url": settings.NLP_CALLBACK_URL,
            },
            headers={"Authorization": f"Bearer {settings.MODAL_SHARED_SECRET}"},
            timeout=TRIGGER_TIMEOUT_SEC,
        )
        response.raise_for_status()
        return True
    except Exception as e:
        logger.warning("[nlp] trigger Modal gagal, pakai fallback lokal: %s", e)
        return False
