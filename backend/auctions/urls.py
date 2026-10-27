from django.urls import path

from .views import (
    CardSearchView,
    LotAuditView,
    LotDetailView,
    LotListCreateView,
    PlaceBidView,
    ReceiptView,
    CancelLotView,
    MyLotsView,
)

urlpatterns = [
    path("cards/search/", CardSearchView.as_view(), name="card-search"),
    path("lots/", LotListCreateView.as_view(), name="lot-list"),
    path("lots/<int:pk>/", LotDetailView.as_view(), name="lot-detail"),
    path("lots/<int:pk>/bids/", PlaceBidView.as_view(), name="place-bid"),
    path("lots/<int:pk>/audit/", LotAuditView.as_view(), name="lot-audit"),
    path("receipts/<uuid:token>/", ReceiptView.as_view(), name="receipt"),
    path("lots/<int:pk>/cancel/", CancelLotView.as_view(), name="lot-cancel"),
    path("my/lots/", MyLotsView.as_view(), name="my-lots"),
]
