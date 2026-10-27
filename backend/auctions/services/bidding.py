from datetime import timedelta
from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from accounts.models import User
from auctions.models import Bid, Lot

from .audit import GENESIS_HASH, compute_bid_hash, compute_chain_seal
from .wallet import get_committed_balance

ANTI_SNIPING_WINDOW = timedelta(minutes=2)


def brl(value):
    text = f"{value:,.2f}"
    return "R$ " + text.replace(",", "X").replace(".", ",").replace("X", ".")


class BidRejected(Exception):
    def __init__(self, code, message):
        super().__init__(message)
        self.code = code
        self.message = message


def place_bid(lot_id, user, amount):
    if user.is_auctioneer:
        raise BidRejected("auctioneer", "Leiloeiros não podem dar lances.")

    with transaction.atomic():
        # 1. Trava o lote: lances simultâneos esperam na fila
        lot = Lot.objects.select_for_update().get(pk=lot_id)
        now = timezone.now()

        # 2. O lote está aceitando lances?
        if lot.cancelled_at:
            raise BidRejected("cancelled", "Este lote foi cancelado.")
        if now < lot.starts_at:
            raise BidRejected("not_started", "O lote ainda não começou.")
        if now >= lot.ends_at:
            raise BidRejected("ended", "O lote já foi encerrado.")

        # 3. O licitante líder não pode cobrir o próprio lance
        if lot.current_leader_id == user.id:
            raise BidRejected("already_winning", "Você já está ganhando este lote.")

        # 4. Valor mínimo
        if lot.current_price is None:
            minimum = lot.starting_price
        else:
            minimum = lot.current_price + lot.min_increment
        if amount < minimum:
            raise BidRejected("below_minimum", f"O lance mínimo é {brl(minimum)}.")

        # 5. Saldo disponível (trava o usuário também)
        bidder = User.objects.select_for_update().get(pk=user.pk)
        available = bidder.balance - get_committed_balance(bidder)
        if amount > available:
            raise BidRejected(
                "insufficient_balance",
                f"Saldo insuficiente. Seu saldo disponível é {brl(available)}.",
            )

        # 6. Cria o lance, encadeado no anterior
        last_bid = lot.bids.order_by("-created_at", "-id").first()
        prev_hash = last_bid.hash if last_bid else GENESIS_HASH
        bid = Bid(
            lot=lot, bidder=bidder, amount=amount, created_at=now, prev_hash=prev_hash
        )
        bid.hash = compute_bid_hash(prev_hash, lot.id, bidder.id, amount, now)
        bid.save()

        # 7. Atualiza o lote: novo líder, novo preço, anti-sniping e selo
        lot.current_price = amount
        lot.current_leader = bidder
        if lot.ends_at - now <= ANTI_SNIPING_WINDOW:
            lot.ends_at = now + ANTI_SNIPING_WINDOW
        lot.chain_seal = compute_chain_seal(lot.id, lot.bids.count(), bid.hash)
        lot.save()

    return bid, lot
