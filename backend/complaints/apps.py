import logging
import os

from django.apps import AppConfig

logger = logging.getLogger(__name__)


class ComplaintsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "complaints"

    def ready(self):
        """
        Pre-warm NLP model di background thread saat Django boot — kalau
        NLP_ENABLED=true. Default OFF supaya `runserver` cepat di lokal.

        Catatan penting:
        - Django dev server (autoreload) panggil ready() 2 kali (parent watcher
          + child reloader). Loader.start_warmup() idempotent, jadi aman — thread
          hanya start sekali, lock di dalam loader cegah double-load.
        - Gunicorn/--noreload: ready() dipanggil sekali per worker. Setiap worker
          punya copy model di RAM-nya. Untuk HF Space single worker (WEB_CONCURRENCY=1),
          ini efisien. Kalau multi-worker, set --preload di gunicorn supaya share.
        - Lihat nlp/models.py untuk detail lazy loading + thread safety.
        """
        from nlp.models import is_enabled, loader

        if not is_enabled():
            logger.info("[complaints] NLP_ENABLED=false → skip pre-load model NLP")
            return

        # Hindari double-warmup di parent watcher Django dev server.
        # RUN_MAIN diset oleh autoreloader hanya di child. Jadi parent skip.
        # Gunicorn / runserver --noreload: RUN_MAIN tidak diset → tetap jalan.
        if "runserver" in " ".join(os.sys.argv) and not os.environ.get("RUN_MAIN"):
            if "--noreload" not in os.sys.argv:
                logger.info("[complaints] runserver parent watcher → defer NLP warmup ke child")
                return

        loader.start_warmup()
        logger.info("[complaints] NLP background warmup spawned (model load async)")
