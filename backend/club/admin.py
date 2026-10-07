from django.contrib import admin
from .models import Match, NewsArticle, NewsGalleryImage, Player, Prospect


@admin.register(Player)
class PlayerAdmin(admin.ModelAdmin):
	list_display = ('number', 'name', 'position')
	search_fields = ('name', 'position')


@admin.register(Match)
class MatchAdmin(admin.ModelAdmin):
	list_display = ('date', 'home_team', 'away_team', 'location')
	list_filter = ('date',)


class NewsGalleryImageInline(admin.TabularInline):
	model = NewsGalleryImage
	extra = 1


@admin.register(NewsArticle)
class NewsArticleAdmin(admin.ModelAdmin):
	list_display = ('title', 'tag', 'date', 'published')
	list_filter = ('published', 'tag')
	prepopulated_fields = {'slug': ('title',)}
	inlines = [NewsGalleryImageInline]


@admin.register(NewsGalleryImage)
class NewsGalleryImageAdmin(admin.ModelAdmin):
	list_display = ('article', 'caption')
	list_filter = ('article',)


@admin.register(Prospect)
class ProspectAdmin(admin.ModelAdmin):
	list_display = ('created_at', 'name', 'email', 'position', 'status')
	list_filter = ('status', 'position')
	search_fields = ('name', 'email', 'phone')

# Register your models here.
