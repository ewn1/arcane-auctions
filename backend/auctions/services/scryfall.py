import hashlib

import requests
from django.core.cache import cache

BASE_URL = "https://api.scryfall.com"
HEADERS = {
    "User-Agent": "ArcaneAuctions/1.0",
    "Accept": "application/json",
}
TIMEOUT = 5  # segundos
CACHE_SECONDS = 60 * 10  # 10 minutos


class ScryfallUnavailable(Exception):
    """O Scryfall não respondeu ou respondeu com erro."""


def _image_url(card):
    # Cartas normais têm image_uris direto.
    if "image_uris" in card:
        return card["image_uris"].get("normal", "")
    # Cartas de duas faces guardam a imagem em cada face.
    faces = card.get("card_faces") or []
    if faces and "image_uris" in faces[0]:
        return faces[0]["image_uris"].get("normal", "")
    return ""


def _normalize(card):
    return {
        "external_id": card["id"],
        "title": card["name"],
        "image_url": _image_url(card),
        "attributes": {
            "set_name": card.get("set_name"),
            "rarity": card.get("rarity"),
            "type_line": card.get("type_line"),
            "artist": card.get("artist"),
            "mana_cost": card.get("mana_cost"),
        },
    }


def search_cards(query):
    query = query.strip()
    if not query:
        return []

    cache_key = "scryfall:search:" + hashlib.sha256(query.lower().encode()).hexdigest()
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    try:
        response = requests.get(
            f"{BASE_URL}/cards/search",
            params={"q": query},
            headers=HEADERS,
            timeout=TIMEOUT,
        )
    except requests.RequestException as exc:
        raise ScryfallUnavailable("Falha de conexão com o Scryfall") from exc

    if response.status_code in (400, 404):
        # 404 = nenhuma carta encontrada; 400 = busca inválida
        results = []
    elif response.ok:
        cards = response.json().get("data", [])[:20]
        results = [_normalize(card) for card in cards]
    else:
        raise ScryfallUnavailable(f"Scryfall respondeu {response.status_code}")

    cache.set(cache_key, results, CACHE_SECONDS)
    return results


def get_card(external_id):
    try:
        response = requests.get(
            f"{BASE_URL}/cards/{external_id}",
            headers=HEADERS,
            timeout=TIMEOUT,
        )
    except requests.RequestException as exc:
        raise ScryfallUnavailable("Falha de conexão com o Scryfall") from exc

    if response.status_code == 404:
        return None
    if not response.ok:
        raise ScryfallUnavailable(f"Scryfall respondeu {response.status_code}")
    return _normalize(response.json())
