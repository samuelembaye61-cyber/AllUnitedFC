from django.urls import path

from . import views

urlpatterns = [
    path('csrf/', views.csrf_token),
    path('players/', views.players),
    path('matches/', views.matches),
    path('news/', views.news),
    path('site-branding/', views.site_branding),
    path('sponsors/', views.sponsors),
    path('sponsor-inquiries/', views.sponsor_inquiries),
    path('prospects/', views.prospects),
]