from decimal import Decimal

from django.db.models import Sum

from auctions.models import Lot


def get_committed_balance(user):
    """Soma dos lances em que o usuário é líder, em lotes ainda não liquidados."""
    total = Lot.objects.filter(
        current_leader=user,
        cancelled_at__isnull=True,
        settled_at__isnull=True,
    ).aggregate(total=Sum("current_price"))["total"]
    return total or Decimal("0.00")


def get_wallet(user):
    committed = get_committed_balance(user)
    return {
        "total": user.balance,
        "committed": committed,
        "available": user.balance - committed,
    }
