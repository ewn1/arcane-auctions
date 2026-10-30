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
BIDDER_BALANCE = Decimal("500000.00")
DEMO_WINDOW = timedelta(
    days=60
)  # lotes de demonstração ficam disponíveis durante a avaliação

# Dados copiados do Scryfall: o seed funciona mesmo com a API fora do ar.
CARDS = {
    "one_ring": {
        "external_id": "d5806e68-1054-458e-866d-1f2470f682b2",
        "title": "The One Ring",
        "image_url": "https://cards.scryfall.io/normal/front/d/5/d5806e68-1054-458e-866d-1f2470f682b2.jpg?1790212038",
        "attributes": {
            "set_name": "The Lord of the Rings: Tales of Middle-earth",
            "rarity": "mythic",
            "type_line": "Legendary Artifact",
            "artist": "Veli Nyström",
            "mana_cost": "{4}",
        },
    },
    "gandalf": {
        "external_id": "e384c20b-d0c1-4781-9d11-e89e5a6bf3fc",
        "title": "Gandalf the White",
        "image_url": "https://cards.scryfall.io/normal/front/e/3/e384c20b-d0c1-4781-9d11-e89e5a6bf3fc.jpg?1783916333",
        "attributes": {
            "set_name": "The Lord of the Rings: Tales of Middle-earth",
            "rarity": "mythic",
            "type_line": "Legendary Creature — Avatar Wizard",
            "artist": "Magali Villeneuve",
            "mana_cost": "{3}{W}{W}",
        },
    },
    "black_lotus": {
        "external_id": "b0faa7f2-b547-42c4-a810-839da50dadfe",
        "title": "Black Lotus",
        "image_url": "https://cards.scryfall.io/normal/front/b/0/b0faa7f2-b547-42c4-a810-839da50dadfe.jpg?1783948669",
        "attributes": {
            "set_name": "Limited Edition Alpha",
            "rarity": "rare",
            "type_line": "Artifact",
            "artist": "Christopher Rush",
            "mana_cost": "{0}",
        },
    },
    "gold_dragon": {
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
    "jace": {
        "external_id": "0e606072-a3aa-4300-ba90-ec92a721fa76",
        "title": "Jace, the Mind Sculptor",
        "image_url": "https://cards.scryfall.io/normal/front/0/e/0e606072-a3aa-4300-ba90-ec92a721fa76.jpg?1792506267",
        "attributes": {
            "set_name": "Worldwake",
            "rarity": "mythic",
            "type_line": "Legendary Planeswalker — Jace",
            "artist": "Jason Chan",
            "mana_cost": "{2}{U}{U}",
        },
    },
    "copper_dragon": {
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
}

# Valores dos lotes (lance inicial, incremento mínimo).
PRICES = {
    "one_ring": ("3000.00", "200.00"),
    "gandalf": ("1500.00", "100.00"),
    "black_lotus": ("150000.00", "5000.00"),
    "gold_dragon": ("100.00", "10.00"),
    "jace": ("800.00", "50.00"),
    "copper_dragon": ("50.00", "5.00"),
}


class Command(BaseCommand):
    help = "Cria dados de demonstração: 1 leiloeiro, 2 licitantes e lotes em todos os estados."

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
                balance=BIDDER_BALANCE,
            )
            licitante2 = User.objects.create_user(
                username="licitante2",
                email="licitante2@arcane.dev",
                password=PASSWORD,
                balance=BIDDER_BALANCE,
            )

            def make_lot(key, starts, ends):
                starting_price, min_increment = PRICES[key]
                return Lot.objects.create(
                    auctioneer=auctioneer,
                    starting_price=Decimal(starting_price),
                    min_increment=Decimal(min_increment),
                    starts_at=now + starts,
                    ends_at=now + ends,
                    **CARDS[key],
                )

            def bid(lot, user, amount):
                place_bid(lot.id, user, Decimal(amount))

            # 1. The One Ring: ao vivo e com a disputa mais movimentada
            one_ring = make_lot("one_ring", timedelta(hours=-2), DEMO_WINDOW)
            bid(one_ring, licitante1, "3000.00")
            bid(one_ring, licitante2, "3400.00")
            bid(one_ring, licitante1, "4000.00")

            # 2. Gandalf the White: ao vivo, ainda sem lances
            make_lot("gandalf", timedelta(hours=-1), DEMO_WINDOW)

            # 3. Black Lotus (Alpha): ao vivo, com lances de alto valor
            black_lotus = make_lot("black_lotus", timedelta(hours=-1), DEMO_WINDOW)
            bid(black_lotus, licitante1, "150000.00")
            bid(black_lotus, licitante2, "160000.00")

            # 4. Ancient Gold Dragon: ao vivo, com lances
            gold_dragon = make_lot("gold_dragon", timedelta(minutes=-30), DEMO_WINDOW)
            bid(gold_dragon, licitante2, "100.00")
            bid(gold_dragon, licitante1, "120.00")

            # 5. Jace, the Mind Sculptor: agendado durante toda a avaliação
            make_lot("jace", DEMO_WINDOW, DEMO_WINDOW + timedelta(days=7))

            # 6. Ancient Copper Dragon: encerrado e arrematado (para testar o comprovante)
            copper_dragon = make_lot(
                "copper_dragon", timedelta(hours=-3), timedelta(hours=1)
            )
            bid(copper_dragon, licitante1, "50.00")
            bid(copper_dragon, licitante2, "60.00")
            bid(copper_dragon, licitante1, "75.00")
            Lot.objects.filter(pk=copper_dragon.pk).update(
                ends_at=now - timedelta(minutes=5)
            )
            settle_lot(copper_dragon.id)

        self.stdout.write(self.style.SUCCESS("Dados de demonstração criados!"))
        self.stdout.write(f"  Leiloeiro:  leiloeiro / {PASSWORD}")
        self.stdout.write(f"  Licitante:  licitante1 / {PASSWORD}")
        self.stdout.write(f"  Licitante:  licitante2 / {PASSWORD}")
