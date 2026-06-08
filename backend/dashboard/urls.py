from django.urls import path
from . import views

urlpatterns = [
    path("", views.index, name="dashboard-index"),
    path("api/pipeline/test/", views.pipeline_test, name="pipeline-test"),
    path("api/logs/", views.logs_proxy, name="logs-proxy"),
    path("api/status/", views.nlp_status, name="nlp-status"),
]
