from django.urls import path

from .views import CardSearchView

urlpatterns = [
    path("cards/search/", CardSearchView.as_view(), name="card-search"),
]
