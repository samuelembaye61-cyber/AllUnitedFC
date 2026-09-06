from django.urls import path

from . import views

urlpatterns = [
    path('csrf/', views.csrf_token),
    path('players/', views.players),
    path('matches/', views.matches),
    path('news/', views.news),
    path('prospects/', views.prospects),
]