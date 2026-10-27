import hashlib
import hmac
from datetime import timezone as dt_timezone

from django.conf import settings

GENESIS_HASH = "0" * 64  # o "elo zero", antes do primeiro lance


def _sign(message):
    key = settings.AUDIT_HMAC_KEY.encode()
    return hmac.new(key, message.encode(), hashlib.sha256).hexdigest()


def compute_bid_hash(prev_hash, lot_id, bidder_id, amount, created_at):
    created = created_at.astimezone(dt_timezone.utc).isoformat()
    payload = f"{prev_hash}|{lot_id}|{bidder_id}|{amount:.2f}|{created}"
    return _sign(payload)


def compute_chain_seal(lot_id, bid_count, last_hash):
    return _sign(f"seal|{lot_id}|{bid_count}|{last_hash}")


def bidder_alias(user_id):
    digest = _sign(f"alias|{user_id}")
    return f"Licitante #{digest[:6].upper()}"
