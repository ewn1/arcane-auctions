from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAuctioneer

from .services.scryfall import ScryfallUnavailable, search_cards


class CardSearchView(APIView):
    permission_classes = [IsAuctioneer]

    def get(self, request):
        query = request.query_params.get("q", "")
        try:
            results = search_cards(query)
        except ScryfallUnavailable:
            return Response(
                {
                    "detail": "O catálogo de cartas está indisponível no momento. Tente novamente em instantes."
                },
                status=503,
            )
        return Response(results)
