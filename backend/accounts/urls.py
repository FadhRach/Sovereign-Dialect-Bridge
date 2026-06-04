from django.urls import path
from . import views

urlpatterns = [
    path("register/", views.RegisterView.as_view()),
    path("login/", views.LoginView.as_view()),
    path("logout/", views.LogoutView.as_view()),
    path("token/refresh/", views.TokenRefreshView.as_view()),
    path("profile/", views.ProfileView.as_view()),
    path("change-password/", views.ChangePasswordView.as_view()),
]
