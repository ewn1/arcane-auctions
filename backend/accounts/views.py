from decimal import Decimal, InvalidOperation

from django.db.models import F
from rest_framework import generics
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from auctions.services.wallet import get_wallet

from .models import User
from .permissions import IsBidder
from .serializers import RegisterSerializer

MAX_DEPOSIT = Decimal("100000.00")


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response(
            {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "role": user.role,
            }
        )


class WalletView(APIView):
    permission_classes = [IsBidder]

    def get(self, request):
        return Response(get_wallet(request.user))


class DepositView(APIView):
    permission_classes = [IsBidder]

    def post(self, request):
        try:
            amount = Decimal(str(request.data.get("amount", "")))
        except InvalidOperation:
            return Response({"amount": ["Informe um valor numérico."]}, status=400)

        if not amount.is_finite() or amount <= 0:
            return Response(
                {"amount": ["O depósito deve ser maior que zero."]}, status=400
            )
        if amount > MAX_DEPOSIT:
            return Response(
                {"amount": ["O depósito máximo é de 100.000,00."]}, status=400
            )

        amount = amount.quantize(Decimal("0.01"))
        User.objects.filter(pk=request.user.pk).update(balance=F("balance") + amount)
        request.user.refresh_from_db()
        return Response(get_wallet(request.user))
