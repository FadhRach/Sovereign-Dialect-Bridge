from django.urls import path
from . import views

urlpatterns = [
    path("complaints/", views.ComplaintListCreateView.as_view()),
    path("complaints/map/", views.ComplaintMapView.as_view()),
    path("complaints/export/", views.ComplaintExportView.as_view()),
    path("complaints/<int:pk>/", views.ComplaintDetailView.as_view()),
    path("categories/", views.CategoryListView.as_view()),
    path("dashboard/stats/", views.DashboardStatsView.as_view()),
    path("admin/users/", views.AdminUserListView.as_view()),
    path("admin/users/<int:pk>/", views.AdminUserDetailView.as_view()),
    path("notifications/", views.NotificationListView.as_view()),
    path("notifications/read/", views.NotificationReadView.as_view()),  # read all
    path("notifications/<int:pk>/read/", views.NotificationReadView.as_view()),
]
