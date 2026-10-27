from decimal import Decimal
from django.utils import timezone
from django.db.models import Max
from rest_framework import generics
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAuctioneer, IsBidder

from .models import Bid, Lot
from .serializers import LotCreateSerializer, LotSerializer, PlaceBidSerializer
from .services.scryfall import ScryfallUnavailable, get_card, search_cards
from .services.bidding import BidRejected, place_bid
from .services.audit import bidder_alias, verify_lot
from .services.settlement import settle_due_lots, settle_lot
from .services.cancellation import CancelRejected, cancel_lot


class CardSearchView(APIView):
    permission_classes = [IsAuctioneer]

    def get(self, request):
        query = request.query_params.get("q", "")
        try:
            results = search_cards(query)
        except ScryfallUnavailable:
            return Response(
                {
                    "detail": "O catálogo de cartas está indisponível no momento. Tente novamente em instantes."
                },
                status=503,
            )
        return Response(results)


class LotListCreateView(generics.ListCreateAPIView):
    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuctioneer()]
        return [AllowAny()]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return LotCreateSerializer
        return LotSerializer

    def get_queryset(self):
        now = timezone.now()
        queryset = Lot.objects.filter(cancelled_at__isnull=True).select_related(
            "auctioneer"
        )

        status = self.request.query_params.get("status")
        if status == "live":
            queryset = queryset.filter(starts_at__lte=now, ends_at__gt=now)
        elif status == "scheduled":
            queryset = queryset.filter(starts_at__gt=now)
        elif status == "ended":
            queryset = queryset.filter(ends_at__lte=now)
        return queryset

    def create(self, request, *args, **kwargs):
        serializer = LotCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            card = get_card(serializer.validated_data["external_id"])
        except ScryfallUnavailable:
            return Response(
                {
                    "detail": "O catálogo de cartas está indisponível. Tente criar o lote em instantes."
                },
                status=503,
            )
        if card is None:
            return Response(
                {"external_id": ["Carta não encontrada no catálogo."]}, status=400
            )

        lot = serializer.save(
            auctioneer=request.user,
            title=card["title"],
            image_url=card["image_url"],
            attributes=card["attributes"],
        )
        return Response(LotSerializer(lot).data, status=201)

    def list(self, request, *args, **kwargs):
        settle_due_lots()
        return super().list(request, *args, **kwargs)


class LotDetailView(generics.RetrieveAPIView):
    queryset = Lot.objects.select_related("auctioneer")
    serializer_class = LotSerializer
    permission_classes = [AllowAny]

    def retrieve(self, request, *args, **kwargs):
        settle_lot(kwargs["pk"])
        return super().retrieve(request, *args, **kwargs)


class LotBidsView(APIView):
    def get_permissions(self):
        if self.request.method == "POST":
            return [IsBidder()]
        return [AllowAny()]

    def get(self, request, pk):
        if not Lot.objects.filter(pk=pk).exists():
            return Response({"detail": "Lote não encontrado."}, status=404)

        user_id = request.user.id if request.user.is_authenticated else None
        bids = Bid.objects.filter(lot_id=pk).order_by("-created_at", "-id")
        return Response(
            [
                {
                    "bidder": bidder_alias(bid.bidder_id),
                    "amount": f"{bid.amount:.2f}",
                    "created_at": bid.created_at,
                    "is_mine": bid.bidder_id == user_id,
                }
                for bid in bids
            ]
        )

    def post(self, request, pk):
        serializer = PlaceBidSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            bid, lot = place_bid(pk, request.user, serializer.validated_data["amount"])
        except Lot.DoesNotExist:
            return Response({"detail": "Lote não encontrado."}, status=404)
        except BidRejected as rejection:
            return Response(
                {"code": rejection.code, "detail": rejection.message},
                status=400,
            )

        return Response(
            LotSerializer(lot, context={"request": request}).data, status=201
        )


class LotAuditView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, pk):
        lot = Lot.objects.filter(pk=pk).first()
        if lot is None:
            return Response({"detail": "Lote não encontrado."}, status=404)

        result = verify_lot(lot)
        return Response(
            {
                "lot_id": lot.id,
                "title": lot.title,
                "status": lot.status,
                **result,
            }
        )


class ReceiptView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, token):
        lot = (
            Lot.objects.select_related("auctioneer").filter(receipt_token=token).first()
        )
        if lot:
            settle_lot(lot.id)
            lot.refresh_from_db()

        if not lot or not lot.settled_at or not lot.current_leader_id:
            return Response({"detail": "Comprovante não encontrado."}, status=404)

        return Response(
            {
                "receipt_code": str(lot.receipt_token),
                "lot_id": lot.id,
                "title": lot.title,
                "image_url": lot.image_url,
                "attributes": lot.attributes,
                "final_price": f"{lot.current_price:.2f}",
                "winner": bidder_alias(lot.current_leader_id),
                "auctioneer": lot.auctioneer.username,
                "settled_at": lot.settled_at,
                "bid_count": lot.bids.count(),
                "chain_seal": lot.chain_seal,
            }
        )


class CancelLotView(APIView):
    permission_classes = [IsAuctioneer]

    def post(self, request, pk):
        try:
            lot = cancel_lot(pk, request.user)
        except CancelRejected as rejection:
            status_code = {"not_found": 404, "not_owner": 403}.get(rejection.code, 400)
            return Response(
                {"code": rejection.code, "detail": rejection.message},
                status=status_code,
            )

        return Response(
            {
                "id": lot.id,
                "status": lot.status,
                "detail": "Lote cancelado. Os valores comprometidos foram liberados aos licitantes.",
            }
        )


class MyLotsView(APIView):
    permission_classes = [IsAuctioneer]

    def get(self, request):
        settle_due_lots()
        lots = Lot.objects.filter(auctioneer=request.user).order_by("-created_at")

        total_received = Decimal("0.00")
        items = []
        for lot in lots:
            sold = bool(lot.settled_at and lot.current_leader_id)
            if sold:
                total_received += lot.current_price

            if sold:
                result = "sold"
            elif lot.settled_at:
                result = "unsold"
            else:
                result = None

            items.append(
                {
                    "id": lot.id,
                    "title": lot.title,
                    "image_url": lot.image_url,
                    "status": lot.status,
                    "starts_at": lot.starts_at,
                    "ends_at": lot.ends_at,
                    "starting_price": f"{lot.starting_price:.2f}",
                    "current_price": (
                        f"{lot.current_price:.2f}" if lot.current_price else None
                    ),
                    "bid_count": lot.bids.count(),
                    "result": result,
                    "winner": bidder_alias(lot.current_leader_id) if sold else None,
                    "can_cancel": lot.status in (Lot.Status.SCHEDULED, Lot.Status.LIVE),
                }
            )

        return Response(
            {
                "total_received": f"{total_received:.2f}",
                "lots": items,
            }
        )


class MyBidsView(APIView):
    permission_classes = [IsBidder]

    def get(self, request):
        settle_due_lots()
        user = request.user

        rows = (
            Bid.objects.filter(bidder=user)
            .values("lot_id")
            .annotate(my_top=Max("amount"), last_bid_at=Max("created_at"))
            .order_by("-last_bid_at")
        )
        lots = Lot.objects.in_bulk([row["lot_id"] for row in rows])

        result = []
        for row in rows:
            lot = lots[row["lot_id"]]
            is_leader = lot.current_leader_id == user.id

            if lot.cancelled_at:
                outcome = "cancelled"
            elif lot.settled_at:
                outcome = "won" if is_leader else "lost"
            else:
                outcome = "winning" if is_leader else "outbid"

            result.append(
                {
                    "lot_id": lot.id,
                    "title": lot.title,
                    "image_url": lot.image_url,
                    "status": lot.status,
                    "current_price": f"{lot.current_price:.2f}",
                    "my_top_bid": f"{row['my_top']:.2f}",
                    "outcome": outcome,
                    "receipt_token": (
                        str(lot.receipt_token) if outcome == "won" else None
                    ),
                }
            )

        return Response(result)
