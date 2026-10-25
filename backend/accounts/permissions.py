from rest_framework.permissions import BasePermission


class IsAuctioneer(BasePermission):
    message = "Apenas leiloeiros podem realizar esta ação."

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.is_auctioneer)


class IsBidder(BasePermission):
    message = "Apenas licitantes podem realizar esta ação."

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and not user.is_auctioneer)
