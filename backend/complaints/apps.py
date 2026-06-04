from django.apps import AppConfig


class ComplaintsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "complaints"

    def ready(self):
        # NLP models di-load di sini agar hanya terjadi sekali saat startup.
        # Import dilakukan di dalam ready() untuk menghindari circular import.
        from nlp import pipeline as nlp_pipeline
        nlp_pipeline.load_models()
