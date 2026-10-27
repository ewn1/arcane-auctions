from datetime import timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from accounts.models import User
from auctions.models import Lot
from auctions.services.bidding import place_bid
from auctions.services.settlement import settle_lot

PASSWORD = "Arcane@2026"

# Dados copiados do Scryfall: o seed funciona mesmo com a API fora do ar.
CARDS = [
    {
        "external_id": "421395b1-2694-42fd-bb90-0007e78adefc",
        "title": "Ancient Gold Dragon",
        "image_url": "https://cards.scryfall.io/normal/front/4/2/421395b1-2694-42fd-bb90-0007e78adefc.jpg?1783922822",
        "attributes": {
            "set_name": "Commander Legends: Battle for Baldur's Gate",
            "rarity": "mythic",
            "type_line": "Creature — Elder Dragon",
            "artist": "Simon Dominic",
            "mana_cost": "{5}{W}{W}",
        },
    },
    {
        "external_id": "e4510ee2-8a2e-4fe5-94af-df420a6a35a0",
        "title": "Balefire Dragon",
        "image_url": "https://cards.scryfall.io/normal/front/e/4/e4510ee2-8a2e-4fe5-94af-df420a6a35a0.jpg?1783907975",
        "attributes": {
            "set_name": "Innistrad Remastered",
            "rarity": "mythic",
            "type_line": "Creature — Dragon",
            "artist": "Eric Deschamps",
            "mana_cost": "{5}{R}{R}",
        },
    },
    {
        "external_id": "354255d7-dc29-403b-aa90-9044cde669d0",
        "title": "Avaricious Dragon",
        "image_url": "https://cards.scryfall.io/normal/front/3/5/354255d7-dc29-403b-aa90-9044cde669d0.jpg?1783938333",
        "attributes": {
            "set_name": "Magic Origins",
            "rarity": "mythic",
            "type_line": "Creature — Dragon",
            "artist": "Chris Rahn",
            "mana_cost": "{2}{R}{R}",
        },
    },
    {
        "external_id": "3836dddd-a7e4-499f-ad49-ce298aa65720",
        "title": "Ancient Copper Dragon",
        "image_url": "https://cards.scryfall.io/normal/front/3/8/3836dddd-a7e4-499f-ad49-ce298aa65720.jpg?1783922745",
        "attributes": {
            "set_name": "Commander Legends: Battle for Baldur's Gate",
            "rarity": "mythic",
            "type_line": "Creature — Elder Dragon",
            "artist": "Antonio José Manzanedo",
            "mana_cost": "{4}{R}{R}",
        },
    },
]


class Command(BaseCommand):
    help = "Cria dados de demonstração: 1 leiloeiro, 2 licitantes e lotes em vários estados."

    def handle(self, *args, **options):
        if User.objects.filter(username="leiloeiro").exists():
            self.stdout.write(
                self.style.WARNING(
                    "Os dados de demonstração já existem. Nada foi feito."
                )
            )
            return

        now = timezone.now()

        with transaction.atomic():
            auctioneer = User.objects.create_user(
                username="leiloeiro",
                email="leiloeiro@arcane.dev",
                password=PASSWORD,
                role=User.Role.AUCTIONEER,
            )
            licitante1 = User.objects.create_user(
                username="licitante1",
                email="licitante1@arcane.dev",
                password=PASSWORD,
                balance=Decimal("5000.00"),
            )
            licitante2 = User.objects.create_user(
                username="licitante2",
                email="licitante2@arcane.dev",
                password=PASSWORD,
                balance=Decimal("5000.00"),
            )

            def make_lot(card, starts, ends, starting_price, min_increment):
                return Lot.objects.create(
                    auctioneer=auctioneer,
                    starting_price=Decimal(starting_price),
                    min_increment=Decimal(min_increment),
                    starts_at=now + starts,
                    ends_at=now + ends,
                    **card,
                )

            # 1. Ao vivo COM lances abertos
            live = make_lot(
                CARDS[0], timedelta(minutes=-30), timedelta(days=3), "100.00", "10.00"
            )
            place_bid(live.id, licitante1, Decimal("100.00"))
            place_bid(live.id, licitante2, Decimal("120.00"))

            # 2. Ao vivo sem lances
            make_lot(
                CARDS[1], timedelta(minutes=-10), timedelta(days=2), "250.00", "25.00"
            )

            # 3. Agendado
            make_lot(CARDS[2], timedelta(days=1), timedelta(days=4), "80.00", "5.00")

            # 4. Encerrado e arrematado (para testar comprovante e "meus arremates")
            sold = make_lot(
                CARDS[3], timedelta(hours=-2), timedelta(hours=1), "50.00", "5.00"
            )
            place_bid(sold.id, licitante1, Decimal("50.00"))
            place_bid(sold.id, licitante2, Decimal("60.00"))
            place_bid(sold.id, licitante1, Decimal("75.00"))
            Lot.objects.filter(pk=sold.pk).update(ends_at=now - timedelta(minutes=5))
            settle_lot(sold.id)

        self.stdout.write(self.style.SUCCESS("Dados de demonstração criados!"))
        self.stdout.write(f"  Leiloeiro:  leiloeiro / {PASSWORD}")
        self.stdout.write(f"  Licitante:  licitante1 / {PASSWORD}")
        self.stdout.write(f"  Licitante:  licitante2 / {PASSWORD}")
