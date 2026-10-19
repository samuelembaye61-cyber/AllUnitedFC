from django.contrib import admin
from .models import Match, NewsArticle, NewsGalleryImage, Player, Prospect, SiteBranding, Sponsor, SponsorInquiry


@admin.register(Player)
class PlayerAdmin(admin.ModelAdmin):
	list_display = ('number', 'name', 'position', 'position_group', 'nationality', 'is_spotlight')
	list_filter = ('position_group', 'is_spotlight')
	search_fields = ('name', 'position', 'nationality', 'bio')
	fieldsets = (
		(None, {'fields': ('name', 'number', 'position', 'position_group', 'photo', 'is_spotlight')}),
		('Player profile', {'fields': ('nationality', 'country_code', 'bio')}),
	)

	def save_model(self, request, obj, form, change):
		if obj.is_spotlight:
			Player.objects.exclude(pk=obj.pk).filter(is_spotlight=True).update(is_spotlight=False)
		super().save_model(request, obj, form, change)


@admin.register(Match)
class MatchAdmin(admin.ModelAdmin):
	list_display = ('date', 'home_team', 'away_team', 'location')
	list_filter = ('date',)


class NewsGalleryImageInline(admin.TabularInline):
	model = NewsGalleryImage
	extra = 1


@admin.register(NewsArticle)
class NewsArticleAdmin(admin.ModelAdmin):
	list_display = ('title', 'priority_tier', 'article_type', 'date', 'published')
	list_filter = ('priority_tier', 'published', 'article_type')
	search_fields = ('title', 'summary', 'content')
	prepopulated_fields = {'slug': ('title',)}
	inlines = [NewsGalleryImageInline]
	fieldsets = (
		(None, {'fields': ('title', 'slug', 'tag', 'article_type', 'priority_tier', 'date', 'summary', 'content', 'image', 'video_url')}),
		('Urgent alert timing', {'fields': ('alert_starts_at', 'alert_ends_at'), 'description': 'Tier 1 alerts require an end time.'}),
		('Publishing', {'fields': ('published',)}),
	)


@admin.register(Sponsor)
class SponsorAdmin(admin.ModelAdmin):
	list_display = ('name', 'tier', 'display_order', 'is_active')
	list_filter = ('tier', 'is_active')
	list_editable = ('tier', 'display_order', 'is_active')
	search_fields = ('name', 'bio', 'member_offer')
	ordering = ('display_order', 'name')


@admin.register(SponsorInquiry)
class SponsorInquiryAdmin(admin.ModelAdmin):
	list_display = ('created_at', 'business_name', 'contact_name', 'email', 'intended_tier', 'status')
	list_filter = ('status', 'intended_tier', 'created_at')
	list_editable = ('status',)
	search_fields = ('business_name', 'contact_name', 'email', 'phone', 'message')
	readonly_fields = ('created_at',)
	ordering = ('-created_at',)


@admin.register(SiteBranding)
class SiteBrandingAdmin(admin.ModelAdmin):
	list_display = ('league_badge',)

	def has_add_permission(self, request):
		return not SiteBranding.objects.exists() and super().has_add_permission(request)

	def has_delete_permission(self, request, obj=None):
		return False


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
