from django.db import transaction
from django.db.models import F
from django.utils import timezone

from accounts.models import User
from auctions.models import Lot


def settle_lot(lot_id):
    """Liquida um lote encerrado. Seguro para chamar várias vezes (idempotente)."""
    with transaction.atomic():
        lot = Lot.objects.select_for_update().filter(pk=lot_id).first()
        if lot is None:
            return None
        if lot.settled_at or lot.cancelled_at or timezone.now() < lot.ends_at:
            return lot  # já liquidado, cancelado ou ainda não terminou

        if lot.current_leader_id:
            User.objects.filter(pk=lot.current_leader_id).update(
                balance=F("balance") - lot.current_price
            )
            User.objects.filter(pk=lot.auctioneer_id).update(
                balance=F("balance") + lot.current_price
            )

        lot.settled_at = timezone.now()
        lot.save(update_fields=["settled_at"])
        return lot


def settle_due_lots():
    """Liquida todos os lotes que já terminaram e ainda não foram liquidados."""
    due_ids = Lot.objects.filter(
        settled_at__isnull=True,
        cancelled_at__isnull=True,
        ends_at__lte=timezone.now(),
    ).values_list("id", flat=True)

    for lot_id in due_ids:
        settle_lot(lot_id)
