from django.contrib import admin

from .models import Bid, Lot


@admin.register(Lot)
class LotAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "auctioneer", "status", "current_price", "ends_at")


@admin.register(Bid)
class BidAdmin(admin.ModelAdmin):
    list_display = ("id", "lot", "bidder", "amount", "created_at")
