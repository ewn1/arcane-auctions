from decimal import Decimal
from datetime import timedelta

from django.utils import timezone
from rest_framework import serializers

from .models import Lot


class LotSerializer(serializers.ModelSerializer):
    """Leitura: o que a vitrine e a sala exibem."""

    status = serializers.CharField(read_only=True)
    auctioneer = serializers.CharField(source="auctioneer.username", read_only=True)
    bid_count = serializers.IntegerField(source="bids.count", read_only=True)

    class Meta:
        model = Lot
        fields = [
            "id",
            "title",
            "image_url",
            "attributes",
            "starting_price",
            "min_increment",
            "current_price",
            "starts_at",
            "ends_at",
            "status",
            "auctioneer",
            "bid_count",
            "created_at",
        ]


class LotCreateSerializer(serializers.ModelSerializer):
    """Escrita: o que o leiloeiro envia para criar um lote."""

    class Meta:
        model = Lot
        fields = [
            "external_id",
            "starting_price",
            "min_increment",
            "starts_at",
            "ends_at",
        ]

    def validate(self, data):
        if data["starting_price"] <= 0:
            raise serializers.ValidationError(
                {"starting_price": "O lance inicial deve ser maior que zero."}
            )
        if data["min_increment"] <= 0:
            raise serializers.ValidationError(
                {"min_increment": "O incremento mínimo deve ser maior que zero."}
            )
        if data["ends_at"] <= data["starts_at"]:
            raise serializers.ValidationError(
                {"ends_at": "O fim deve ser depois do início."}
            )
        if data["starts_at"] < timezone.now() - timedelta(minutes=1):
            raise serializers.ValidationError(
                {"starts_at": "O lote não pode começar no passado."}
            )
        return data


class PlaceBidSerializer(serializers.Serializer):
    amount = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        min_value=Decimal("0.01"),
    )
