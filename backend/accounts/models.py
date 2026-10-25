from decimal import Decimal

from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    class Role(models.TextChoices):
        AUCTIONEER = "auctioneer", "leiloeiro"
        BIDDER = "bidder", "Licitante"

    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.BIDDER,
    )
    balance = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
    )

    @property
    def is_auctioneer(self):
        return self.role == self.Role.AUCTIONEER
