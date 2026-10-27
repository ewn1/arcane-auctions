from decimal import Decimal
from datetime import timedelta

from django.utils import timezone
from django.db.models import Max
from rest_framework import serializers

from .models import Lot
from .services.audit import bidder_alias


class LotSerializer(serializers.ModelSerializer):
    """Leitura: o que a vitrine e a sala exibem."""

    status = serializers.CharField(read_only=True)
    auctioneer = serializers.CharField(source="auctioneer.username", read_only=True)
    bid_count = serializers.IntegerField(source="bids.count", read_only=True)
    leader_alias = serializers.SerializerMethodField()
    min_next_bid = serializers.SerializerMethodField()
    me = serializers.SerializerMethodField()

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
            "leader_alias",
            "min_next_bid",
            "me",
        ]

    def get_leader_alias(self, obj):
        if obj.current_leader_id is None:
            return None
        return bidder_alias(obj.current_leader_id)

    def get_min_next_bid(self, obj):
        if obj.current_price is None:
            value = obj.starting_price
        else:
            value = obj.current_price + obj.min_increment
        return f"{value:.2f}"

    def get_me(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated or user.is_auctioneer:
            return None

        ranking = (
            obj.bids.values("bidder_id").annotate(top=Max("amount")).order_by("-top")
        )
        for position, row in enumerate(ranking, start=1):
            if row["bidder_id"] == user.id:
                return {
                    "alias": bidder_alias(user.id),
                    "is_winning": obj.current_leader_id == user.id,
                    "position": position,
                    "my_top_bid": f"{row['top']:.2f}",
                }

        return {
            "alias": bidder_alias(user.id),
            "is_winning": False,
            "position": None,
            "my_top_bid": None,
        }


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
