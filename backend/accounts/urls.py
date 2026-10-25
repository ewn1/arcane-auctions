from django.urls import path

from .views import DepositView, MeView, RegisterView, WalletView

urlpatterns = [
    path("auth/register/", RegisterView.as_view(), name="register"),
    path("auth/me/", MeView.as_view(), name="me"),
    path("wallet/", WalletView.as_view(), name="wallet"),
    path("wallet/deposit/", DepositView.as_view(), name="wallet-deposit"),
]
