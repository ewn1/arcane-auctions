from datetime import timedelta
from decimal import Decimal

from django.test import TestCase
from django.utils import timezone

from accounts.models import User
from auctions.models import Lot, Bid
from auctions.services.audit import GENESIS_HASH, compute_chain_seal, verify_lot
from auctions.services.bidding import ANTI_SNIPING_WINDOW, BidRejected, place_bid
from auctions.services.wallet import get_committed_balance
from auctions.services.settlement import settle_lot
from auctions.services.cancellation import CancelRejected, cancel_lot


class AuctionTestCase(TestCase):
    # ---------- ajudantes ----------
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


class PlaceBidTests(AuctionTestCase):
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


class SettlementTests(AuctionTestCase):
    def end_lot(self, lot):
        Lot.objects.filter(pk=lot.pk).update(
            ends_at=timezone.now() - timedelta(minutes=1)
        )

    def test_liquidacao_debita_vencedor_e_credita_leiloeiro(self):
        place_bid(self.lot.id, self.alice, Decimal("100.00"))
        place_bid(self.lot.id, self.bob, Decimal("150.00"))
        self.end_lot(self.lot)

        lot = settle_lot(self.lot.id)

        self.assertIsNotNone(lot.settled_at)
        self.bob.refresh_from_db()
        self.alice.refresh_from_db()
        self.auctioneer.refresh_from_db()
        self.assertEqual(self.bob.balance, Decimal("850.00"))
        self.assertEqual(self.alice.balance, Decimal("1000.00"))
        self.assertEqual(self.auctioneer.balance, Decimal("150.00"))

    def test_liquidacao_e_idempotente(self):
        place_bid(self.lot.id, self.alice, Decimal("100.00"))
        self.end_lot(self.lot)

        settle_lot(self.lot.id)
        settle_lot(self.lot.id)  # segunda chamada não pode debitar de novo

        self.alice.refresh_from_db()
        self.assertEqual(self.alice.balance, Decimal("900.00"))

    def test_lote_sem_lances_fecha_sem_vencedor(self):
        self.end_lot(self.lot)
        lot = settle_lot(self.lot.id)
        self.assertIsNotNone(lot.settled_at)
        self.assertIsNone(lot.current_leader)

    def test_lote_ao_vivo_nao_e_liquidado(self):
        lot = settle_lot(self.lot.id)
        self.assertIsNone(lot.settled_at)


class AuditTests(AuctionTestCase):
    def setUp(self):
        super().setUp()
        place_bid(self.lot.id, self.alice, Decimal("100.00"))
        place_bid(self.lot.id, self.bob, Decimal("110.00"))
        place_bid(self.lot.id, self.alice, Decimal("120.00"))
        self.lot.refresh_from_db()

    def test_historico_integro(self):
        result = verify_lot(self.lot)
        self.assertTrue(result["is_intact"])
        self.assertEqual(len(result["bids"]), 3)

    def test_detecta_valor_alterado_direto_no_banco(self):
        primeiro = self.lot.bids.order_by("created_at", "id").first()
        Bid.objects.filter(pk=primeiro.pk).update(amount=Decimal("101.00"))
        self.assertFalse(verify_lot(self.lot)["is_intact"])

    def test_detecta_lance_removido_do_meio(self):
        meio = self.lot.bids.order_by("created_at", "id")[1]
        Bid.objects.filter(pk=meio.pk).delete()
        self.assertFalse(verify_lot(self.lot)["is_intact"])

    def test_detecta_ultimo_lance_removido(self):
        ultimo = self.lot.bids.order_by("-created_at", "-id").first()
        Bid.objects.filter(pk=ultimo.pk).delete()
        self.lot.refresh_from_db()
        self.assertFalse(verify_lot(self.lot)["is_intact"])

    def test_pseudonimo_nao_expoe_o_usuario(self):
        result = verify_lot(self.lot)
        for entry in result["bids"]:
            self.assertTrue(entry["bidder"].startswith("Licitante #"))
            self.assertNotIn("alice", entry["bidder"])
            self.assertNotIn("bob", entry["bidder"])


class CancelTests(AuctionTestCase):
    def test_cancelar_lote_libera_saldo_comprometido(self):
        place_bid(self.lot.id, self.alice, Decimal("300.00"))
        self.assertEqual(get_committed_balance(self.alice), Decimal("300.00"))

        cancel_lot(self.lot.id, self.auctioneer)

        self.assertEqual(get_committed_balance(self.alice), Decimal("0.00"))

    def test_outro_leiloeiro_nao_pode_cancelar(self):
        outro = User.objects.create_user(
            username="outro", password="x", role=User.Role.AUCTIONEER
        )
        with self.assertRaises(CancelRejected) as ctx:
            cancel_lot(self.lot.id, outro)
        self.assertEqual(ctx.exception.code, "not_owner")

    def test_lote_encerrado_nao_pode_ser_cancelado(self):
        lot = self.make_lot(starts_in=-60, ends_in=-1)
        with self.assertRaises(CancelRejected) as ctx:
            cancel_lot(lot.id, self.auctioneer)
        self.assertEqual(ctx.exception.code, "ended")
