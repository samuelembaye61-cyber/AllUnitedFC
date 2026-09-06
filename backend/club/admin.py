from django.contrib import admin
from .models import Match, NewsArticle, Player, Prospect


@admin.register(Player)
class PlayerAdmin(admin.ModelAdmin):
	list_display = ('number', 'name', 'position')
	search_fields = ('name', 'position')


@admin.register(Match)
class MatchAdmin(admin.ModelAdmin):
	list_display = ('date', 'home_team', 'away_team', 'location')
	list_filter = ('date',)


@admin.register(NewsArticle)
class NewsArticleAdmin(admin.ModelAdmin):
	list_display = ('title', 'tag', 'date', 'published')
	list_filter = ('published', 'tag')
	prepopulated_fields = {'slug': ('title',)}


@admin.register(Prospect)
class ProspectAdmin(admin.ModelAdmin):
	list_display = ('created_at', 'name', 'email', 'position', 'status')
	list_filter = ('status', 'position')
	search_fields = ('name', 'email', 'phone')

# Register your models here.
