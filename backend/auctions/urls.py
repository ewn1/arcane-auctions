from django.urls import path

from .views import (
    CardSearchView,
    LotAuditView,
    LotDetailView,
    LotListCreateView,
    LotBidsView,
    ReceiptView,
    MyBidsView,
)

urlpatterns = [
    path("cards/search/", CardSearchView.as_view(), name="card-search"),
    path("lots/", LotListCreateView.as_view(), name="lot-list"),
    path("lots/<int:pk>/", LotDetailView.as_view(), name="lot-detail"),
    path("lots/<int:pk>/bids/", LotBidsView.as_view(), name="lot-bids"),
    path("my/bids/", MyBidsView.as_view(), name="my-bids"),
    path("lots/<int:pk>/audit/", LotAuditView.as_view(), name="lot-audit"),
    path("receipts/<uuid:token>/", ReceiptView.as_view(), name="receipt"),
]
