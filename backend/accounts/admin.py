from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (("Leilão", {"fields": ("role", "balance")}),)
    list_display = ("username", "email", "role", "balance")
