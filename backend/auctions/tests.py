from datetime import timedelta
from decimal import Decimal

from django.test import TestCase
from django.utils import timezone

from accounts.models import User
from auctions.models import Lot
from auctions.services.audit import GENESIS_HASH, compute_chain_seal
from auctions.services.bidding import ANTI_SNIPING_WINDOW, BidRejected, place_bid
from auctions.services.wallet import get_committed_balance


class PlaceBidTests(TestCase):
    def setUp(self):
        self.auctioneer = User.objects.create_user(
            username="leiloeiro", password="x", role=User.Role.AUCTIONEER
        )
        self.alice = User.objects.create_user(
            username="alice", password="x", balance=Decimal("1000.00")
        )
        self.bob = User.objects.create_user(
            username="bob", password="x", balance=Decimal("1000.00")
        )
        self.lot = self.make_lot()

    # ---------- ajudantes ----------

    def make_lot(self, starts_in=-10, ends_in=60, **extra):
        """Cria um lote. Os tempos são em minutos a partir de agora."""
        now = timezone.now()
        return Lot.objects.create(
            auctioneer=self.auctioneer,
            external_id="carta-teste",
            title="Carta de teste",
            starting_price=Decimal("100.00"),
            min_increment=Decimal("10.00"),
            starts_at=now + timedelta(minutes=starts_in),
            ends_at=now + timedelta(minutes=ends_in),
            **extra,
        )

    def assertRejected(self, code, lot, user, amount):
        with self.assertRaises(BidRejected) as ctx:
            place_bid(lot.id, user, Decimal(amount))
        self.assertEqual(ctx.exception.code, code)

    # ---------- valor mínimo ----------

    def test_primeiro_lance_precisa_atingir_lance_inicial(self):
        self.assertRejected("below_minimum", self.lot, self.alice, "99.99")
        _, lot = place_bid(self.lot.id, self.alice, Decimal("100.00"))
        self.assertEqual(lot.current_price, Decimal("100.00"))
        self.assertEqual(lot.current_leader, self.alice)

    def test_lances_seguintes_precisam_do_incremento_minimo(self):
        place_bid(self.lot.id, self.alice, Decimal("100.00"))
        self.assertRejected("below_minimum", self.lot, self.bob, "109.99")
        _, lot = place_bid(self.lot.id, self.bob, Decimal("110.00"))
        self.assertEqual(lot.current_leader, self.bob)

    # ---------- quem pode dar lance ----------

    def test_lider_nao_pode_cobrir_o_proprio_lance(self):
        place_bid(self.lot.id, self.alice, Decimal("100.00"))
        self.assertRejected("already_winning", self.lot, self.alice, "200.00")

    def test_leiloeiro_nao_pode_dar_lance(self):
        self.assertRejected("auctioneer", self.lot, self.auctioneer, "100.00")

    # ---------- estado do lote ----------

    def test_lote_agendado_recusa_lance(self):
        lot = self.make_lot(starts_in=10, ends_in=60)
        self.assertRejected("not_started", lot, self.alice, "100.00")

    def test_lote_encerrado_recusa_lance(self):
        lot = self.make_lot(starts_in=-60, ends_in=-1)
        self.assertRejected("ended", lot, self.alice, "100.00")

    def test_lote_cancelado_recusa_lance(self):
        lot = self.make_lot(cancelled_at=timezone.now())
        self.assertRejected("cancelled", lot, self.alice, "100.00")

    # ---------- saldo ----------

    def test_lance_maior_que_o_saldo_e_recusado(self):
        self.assertRejected("insufficient_balance", self.lot, self.alice, "1000.01")

    def test_saldo_comprometido_em_outro_lote_reduz_o_disponivel(self):
        outro = self.make_lot()
        place_bid(outro.id, self.alice, Decimal("900.00"))  # sobram 100 disponíveis
        self.assertRejected("insufficient_balance", self.lot, self.alice, "200.00")

    def test_ser_superado_libera_o_saldo_comprometido(self):
        place_bid(self.lot.id, self.alice, Decimal("100.00"))
        self.assertEqual(get_committed_balance(self.alice), Decimal("100.00"))
        place_bid(self.lot.id, self.bob, Decimal("110.00"))
        self.assertEqual(get_committed_balance(self.alice), Decimal("0.00"))

    # ---------- anti-sniping ----------

    def test_lance_nos_ultimos_2_minutos_prorroga_o_lote(self):
        lot = self.make_lot(ends_in=1)
        bid, lot = place_bid(lot.id, self.alice, Decimal("100.00"))
        self.assertEqual(lot.ends_at, bid.created_at + ANTI_SNIPING_WINDOW)

    def test_lance_longe_do_fim_nao_prorroga(self):
        fim_original = self.lot.ends_at
        _, lot = place_bid(self.lot.id, self.alice, Decimal("100.00"))
        self.assertEqual(lot.ends_at, fim_original)

    # ---------- cadeia de hashes ----------

    def test_lances_ficam_encadeados_e_selados(self):
        place_bid(self.lot.id, self.alice, Decimal("100.00"))
        place_bid(self.lot.id, self.bob, Decimal("110.00"))

        primeiro, segundo = self.lot.bids.order_by("created_at", "id")
        self.assertEqual(primeiro.prev_hash, GENESIS_HASH)
        self.assertEqual(segundo.prev_hash, primeiro.hash)

        self.lot.refresh_from_db()
        self.assertEqual(
            self.lot.chain_seal,
            compute_chain_seal(self.lot.id, 2, segundo.hash),
        )
