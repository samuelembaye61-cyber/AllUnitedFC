from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.core.validators import RegexValidator


class Player(models.Model):
	POSITION_GROUP_CHOICES = [
		('goalkeeper', 'Goalkeeper'),
		('defender', 'Defender'),
		('midfielder', 'Midfielder'),
		('forward', 'Forward / Striker'),
	]

	name = models.CharField(max_length=120)
	number = models.PositiveSmallIntegerField()
	position = models.CharField(max_length=80, blank=True)
	position_group = models.CharField(max_length=20, choices=POSITION_GROUP_CHOICES, blank=True, default='', db_index=True)
	is_spotlight = models.BooleanField(
		'Player of the Match spotlight',
		default=False,
		help_text='Show this player in the homepage spotlight. Saving clears the selection from other players.',
	)
	nationality = models.CharField(max_length=80, blank=True)
	country_code = models.CharField(max_length=2, blank=True, validators=[RegexValidator(r'^[A-Za-z]{2}$', 'Enter a two-letter ISO country code.')])
	bio = models.TextField(blank=True, help_text='A short player bio or quote.')
	photo = models.ImageField(upload_to='players/', blank=True)

	class Meta:
		ordering = ['number', 'name']

	def __str__(self):
		return f'#{self.number} {self.name}'


class League(models.Model):
	name = models.CharField(max_length=120, unique=True)
	logo = models.ImageField(upload_to='leagues/', blank=True)
	description = models.TextField(blank=True)
	official_website = models.URLField(blank=True)
	points_for_win = models.PositiveSmallIntegerField(default=3)
	points_for_draw = models.PositiveSmallIntegerField(default=1)
	points_for_loss = models.PositiveSmallIntegerField(default=0)

	class Meta:
		ordering = ['name']

	def __str__(self):
		return self.name


class Season(models.Model):
	name = models.CharField(max_length=100, unique=True)
	start_date = models.DateField(null=True, blank=True)
	end_date = models.DateField(null=True, blank=True)

	class Meta:
		ordering = ['-start_date', 'name']

	def __str__(self):
		return self.name


class LeagueSeason(models.Model):
	league = models.ForeignKey(League, on_delete=models.CASCADE, related_name='league_seasons')
	season = models.ForeignKey(Season, on_delete=models.CASCADE, related_name='league_seasons')
	is_default = models.BooleanField(default=False)

	class Meta:
		ordering = ['-is_default', '-season__start_date', 'league__name']
		constraints = [
			models.UniqueConstraint(fields=['league', 'season'], name='unique_league_season'),
			models.UniqueConstraint(
				fields=['is_default'],
				condition=models.Q(is_default=True),
				name='one_default_league_season',
			),
		]

	def __str__(self):
		return f'{self.league.name} - {self.season.name}'


class Match(models.Model):
	date = models.DateTimeField()
	home_team = models.CharField(max_length=120)
	away_team = models.CharField(max_length=120)
	location = models.CharField(max_length=200)
	home_score = models.PositiveSmallIntegerField(null=True, blank=True)
	away_score = models.PositiveSmallIntegerField(null=True, blank=True)
	league_season = models.ForeignKey(
		LeagueSeason,
		null=True,
		blank=True,
		on_delete=models.SET_NULL,
		related_name='matches',
	)
	completed_at = models.DateTimeField(
		null=True,
		blank=True,
		help_text='Record when the match finished to feature its result for the next 24 hours.',
	)

	class Meta:
		ordering = ['date']

	def __str__(self):
		return f'{self.home_team} vs. {self.away_team} ({self.date:%Y-%m-%d})'


class NewsArticle(models.Model):
	ARTICLE_TYPE_CHOICES = [
		('general', 'General news'),
		('match_report', 'Match report'),
		('announcement', 'Club announcement'),
		('player_spotlight', 'Player spotlight'),
		('community_spotlight', 'Community spotlight'),
		('captains_column', "Captain's column"),
		('tactical_review', 'Tactics'),
	]
	PRIORITY_CHOICES = [
		(1, 'Tier 1: Urgent alert'),
		(2, 'Tier 2: Headline story'),
		(3, 'Tier 3: Standard news'),
		(4, 'Tier 4: Media archive'),
	]

	slug = models.SlugField(unique=True)
	title = models.CharField(max_length=200)
	tag = models.CharField(max_length=80)
	article_type = models.CharField(max_length=30, choices=ARTICLE_TYPE_CHOICES, default='general')
	priority_tier = models.PositiveSmallIntegerField(choices=PRIORITY_CHOICES, default=3, db_index=True)
	date = models.DateField()
	summary = models.TextField()
	content = models.TextField()
	image = models.ImageField(upload_to='news/', blank=True)
	related_match = models.ForeignKey('Match', null=True, blank=True, on_delete=models.SET_NULL, related_name='articles')
	related_player = models.ForeignKey('Player', null=True, blank=True, on_delete=models.SET_NULL, related_name='articles')
	video_url = models.URLField(blank=True, help_text='Use a public YouTube or Vimeo URL for the media highlight embed.')
	alert_starts_at = models.DateTimeField(null=True, blank=True)
	alert_ends_at = models.DateTimeField(null=True, blank=True)
	published = models.BooleanField(default=False)

	class Meta:
		ordering = ['-date']

	def __str__(self):
		return self.title

	def clean(self):
		super().clean()
		if self.priority_tier == 1:
			if not self.alert_ends_at:
				raise ValidationError({'alert_ends_at': 'Urgent alerts require an end time.'})
			if self.alert_starts_at and self.alert_starts_at >= self.alert_ends_at:
				raise ValidationError({'alert_ends_at': 'The alert end time must be after its start time.'})


class NewsGalleryImage(models.Model):
	article = models.ForeignKey(NewsArticle, related_name='gallery_images', on_delete=models.CASCADE)
	image = models.ImageField(upload_to='news/gallery/')
	caption = models.CharField(max_length=200, blank=True)

	class Meta:
		ordering = ['id']

	def __str__(self):
		return f'{self.article.title} gallery image'


class Sponsor(models.Model):
	TIER_CHOICES = [
		('diamond', 'Diamond'),
		('platinum', 'Platinum'),
		('gold', 'Gold'),
	]

	name = models.CharField(max_length=160)
	logo = models.ImageField(upload_to='sponsors/logos/', blank=True)
	website = models.URLField(blank=True)
	tier = models.CharField(max_length=20, choices=TIER_CHOICES)
	bio = models.TextField(blank=True)
	member_offer = models.CharField(max_length=240, blank=True)
	display_order = models.PositiveIntegerField(default=0)
	is_active = models.BooleanField(default=True)

	class Meta:
		ordering = ['display_order', 'name']

	def __str__(self):
		return f'{self.name} ({self.get_tier_display()})'


class SponsorInquiry(models.Model):
	STATUS_CHOICES = [
		('new', 'New Lead'),
		('contacted', 'Contacted'),
		('in_discussion', 'In Discussion'),
		('confirmed', 'Agreement Reached'),
		('declined', 'Not Proceeding'),
	]

	TIER_CHOICES = Sponsor.TIER_CHOICES

	created_at = models.DateTimeField(auto_now_add=True)
	business_name = models.CharField(max_length=160)
	contact_name = models.CharField(max_length=120)
	email = models.EmailField()
	phone = models.CharField(max_length=40)
	intended_tier = models.CharField(max_length=20, choices=TIER_CHOICES)
	message = models.TextField(blank=True)
	status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='new', db_index=True)

	class Meta:
		ordering = ['-created_at']

	def __str__(self):
		return f'{self.business_name} - {self.get_status_display()}'


class SiteBranding(models.Model):
	club_name = models.CharField(max_length=120, blank=True, help_text='Overrides the CLUB_NAME environment default.')
	club_short_name = models.CharField(max_length=60, blank=True)
	club_tagline = models.CharField(max_length=200, blank=True)
	club_name_aliases = models.CharField(
		max_length=300,
		blank=True,
		help_text='Comma-separated alternate spellings used in match records to recognise your team.',
	)
	league_badge = models.ImageField(upload_to='branding/', blank=True)
	homepage_background = models.ImageField(
		upload_to='branding/',
		blank=True,
		help_text='Wide team photo for the homepage hero. The built-in club image is used when this is blank.',
	)
	league_background = models.ImageField(
		upload_to='branding/',
		blank=True,
		help_text='Optional background image for the League & Season Hub.',
	)

	class Meta:
		verbose_name = 'club settings'
		verbose_name_plural = 'club settings'

	def save(self, *args, **kwargs):
		self.pk = 1
		super().save(*args, **kwargs)

	def __str__(self):
		return 'Site branding'

	@classmethod
	def club_identity(cls):
		branding = cls.objects.first()
		name = (branding and branding.club_name) or settings.CLUB_NAME
		short_name = (branding and branding.club_short_name) or settings.CLUB_SHORT_NAME or name
		tagline = (branding and branding.club_tagline) or settings.CLUB_TAGLINE
		raw_aliases = (branding and branding.club_name_aliases) or settings.CLUB_NAME_ALIASES
		aliases = [alias.strip() for alias in raw_aliases.split(',') if alias.strip()]
		return {'name': name, 'short_name': short_name, 'tagline': tagline, 'aliases': aliases}


class Prospect(models.Model):
	STATUS_CHOICES = [
		('new', 'New'),
		('contacted', 'Contacted'),
		('closed', 'Closed'),
	]

	created_at = models.DateTimeField(auto_now_add=True)
	name = models.CharField(max_length=120)
	email = models.EmailField()
	phone = models.CharField(max_length=40, blank=True)
	position = models.CharField(max_length=80)
	message = models.TextField(blank=True)
	status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='new')

	class Meta:
		ordering = ['-created_at']

	def __str__(self):
		return f'{self.name} ({self.email})'

# Create your models here.
