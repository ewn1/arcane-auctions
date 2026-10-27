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


def verify_lot(lot):
    bids = list(lot.bids.order_by("created_at", "id"))
    problems = []
    entries = []

    prev_hash = GENESIS_HASH
    chain_broken = False

    for position, bid in enumerate(bids, start=1):
        expected = compute_bid_hash(
            prev_hash, lot.id, bid.bidder_id, bid.amount, bid.created_at
        )
        link_ok = bid.prev_hash == prev_hash and bid.hash == expected

        if not link_ok and not chain_broken:
            chain_broken = True
            problems.append(
                f"O lance #{position} não confere com a cadeia: "
                "houve alteração, remoção ou inserção a partir deste ponto."
            )

        entries.append(
            {
                "position": position,
                "bidder": bidder_alias(bid.bidder_id),
                "amount": f"{bid.amount:.2f}",
                "created_at": bid.created_at,
                "hash": bid.hash,
                "valid": link_ok and not chain_broken,
            }
        )
        prev_hash = bid.hash

    # Selo: protege o FINAL da cadeia (remoção/inserção do último lance)
    expected_seal = compute_chain_seal(lot.id, len(bids), prev_hash) if bids else ""
    if lot.chain_seal != expected_seal:
        problems.append(
            "O selo do lote não confere: a quantidade de lances ou o último lance foi modificado."
        )

    # Consistência: o lote precisa refletir o último lance da cadeia
    last = bids[-1] if bids else None
    expected_price = last.amount if last else None
    expected_leader = last.bidder_id if last else None
    if lot.current_price != expected_price or lot.current_leader_id != expected_leader:
        problems.append(
            "O preço ou o líder atual do lote não confere com o histórico de lances."
        )

    return {
        "is_intact": not problems,
        "problems": problems,
        "bids": entries,
    }
