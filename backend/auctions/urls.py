from django.urls import path

from .views import CardSearchView, LotDetailView, LotListCreateView

urlpatterns = [
    path("cards/search/", CardSearchView.as_view(), name="card-search"),
    path("lots/", LotListCreateView.as_view(), name="lot-list"),
    path("lots/<int:pk>/", LotDetailView.as_view(), name="lot-detail"),
]
