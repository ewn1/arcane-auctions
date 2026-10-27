import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone


class Lot(models.Model):
    class Status(models.TextChoices):
        SCHEDULED = "scheduled", "Agendado"
        LIVE = "live", "Ao vivo"
        ENDED = "ended", "Encerrado"
        CANCELLED = "cancelled", "Cancelado"

    auctioneer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="lots",
    )

    # "Fotografia" da carta, copiada do Scryfall ao criar o lote
    external_id = models.CharField(max_length=100)
    title = models.CharField(max_length=255)
    image_url = models.URLField(max_length=500, blank=True)
    attributes = models.JSONField(default=dict, blank=True)

    # Regras do leilão
    starting_price = models.DecimalField(max_digits=12, decimal_places=2)
    min_increment = models.DecimalField(max_digits=12, decimal_places=2)
    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField()

    # Estado atual
    current_price = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )
    current_leader = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="leading_lots",
    )
    cancelled_at = models.DateTimeField(null=True, blank=True)
    settled_at = models.DateTimeField(null=True, blank=True)
    chain_seal = models.CharField(max_length=64, blank=True)

    receipt_token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["ends_at"]

    def __str__(self):
        return f"{self.title} (#{self.pk})"

    @property
    def status(self):
        if self.cancelled_at:
            return self.Status.CANCELLED
        now = timezone.now()
        if now < self.starts_at:
            return self.Status.SCHEDULED
        if now < self.ends_at:
            return self.Status.LIVE
        return self.Status.ENDED


class Bid(models.Model):
    lot = models.ForeignKey(Lot, on_delete=models.PROTECT, related_name="bids")
    bidder = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="bids",
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    created_at = models.DateTimeField(default=timezone.now)

    # Cadeia de hashes (auditoria)
    prev_hash = models.CharField(max_length=64)
    hash = models.CharField(max_length=64)

    class Meta:
        ordering = ["created_at", "id"]

    def __str__(self):
        return f"{self.amount} em {self.lot}"
