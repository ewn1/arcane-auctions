from django.db import transaction
from django.utils import timezone

from auctions.models import Lot


class CancelRejected(Exception):
    def __init__(self, code, message):
        super().__init__(message)
        self.code = code
        self.message = message


def cancel_lot(lot_id, user):
    with transaction.atomic():
        lot = Lot.objects.select_for_update().filter(pk=lot_id).first()

        if lot is None:
            raise CancelRejected("not_found", "Lote não encontrado.")
        if lot.auctioneer_id != user.id:
            raise CancelRejected(
                "not_owner", "Você só pode cancelar os seus próprios lotes."
            )
        if lot.cancelled_at:
            raise CancelRejected("already_cancelled", "Este lote já foi cancelado.")
        if timezone.now() >= lot.ends_at:
            raise CancelRejected("ended", "Lotes encerrados não podem ser cancelados.")

        lot.cancelled_at = timezone.now()
        lot.save(update_fields=["cancelled_at"])

    return lot
