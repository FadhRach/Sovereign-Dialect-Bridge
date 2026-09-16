"""
Dashboard views untuk testing dan monitoring pipeline NLP lokal.

Tidak ada auth — endpoint ini untuk testing internal saja, tidak menyentuh
database (pipeline test berjalan in-memory). Model neural (NLLB/mT5/IndoT5/NER)
jalan di layanan Modal terpisah — lihat ../../nlp-service/; dashboard ini hanya
menampilkan status reachability-nya, bukan menjalankan inference-nya langsung.
"""

import json
import time

from django.conf import settings
from django.http import JsonResponse
from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST


def index(request):
    return render(request, "dashboard/index.html")


@require_GET
def nlp_status(request):
    """Status dialect detector lokal + reachability layanan Modal."""
    from nlp.models import loader

    return JsonResponse({
        "dialect": loader.status()["dialect"],
        "modal": _check_modal_health(),
    })


def _check_modal_health() -> dict:
    if not settings.MODAL_HEALTH_URL:
        return {"reachable": False, "error": "MODAL_HEALTH_URL belum diset."}
    try:
        import requests

        response = requests.get(settings.MODAL_HEALTH_URL, timeout=5)
        return {"reachable": response.ok}
    except Exception as e:
        return {"reachable": False, "error": str(e)[:200]}


@csrf_exempt
@require_POST
def pipeline_test(request):
    """
    Jalankan pipeline lokal (fallback, tanpa Modal) dan kembalikan hasilnya.

    Request body (JSON): text (str) — teks input aduan.
    Response (JSON): dialect, translated, summary, category, urgency, keywords, entities.
    """
    try:
        body = json.loads(request.body)
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse({"error": "Request body harus JSON."}, status=400)

    text = (body.get("text") or "").strip()
    if not text:
        return JsonResponse({"error": "Field 'text' wajib diisi."}, status=400)

    from nlp.pipeline import run_pipeline

    t0 = time.time()
    result = run_pipeline(text)

    return JsonResponse({
        "elapsed_ms": int((time.time() - t0) * 1000),
        "input": text,
        "dialect": {"code": result.dialect, "confidence": result.dialect_confidence},
        "translated": result.translated_text,
        "summary": result.summary,
        "category": result.category_name,
        "urgency": result.urgency_level,
        "keywords": result.keywords,
        "named_entities": result.named_entities,
        "confidence": result.confidence,
    })
