from django.db import models


class Player(models.Model):
	name = models.CharField(max_length=120)
	number = models.PositiveSmallIntegerField()
	position = models.CharField(max_length=80, blank=True)
	photo = models.ImageField(upload_to='players/', blank=True)

	class Meta:
		ordering = ['number', 'name']

	def __str__(self):
		return f'#{self.number} {self.name}'


class Match(models.Model):
	date = models.DateTimeField()
	home_team = models.CharField(max_length=120)
	away_team = models.CharField(max_length=120)
	location = models.CharField(max_length=200)
	home_score = models.PositiveSmallIntegerField(null=True, blank=True)
	away_score = models.PositiveSmallIntegerField(null=True, blank=True)

	class Meta:
		ordering = ['date']

	def __str__(self):
		return f'{self.home_team} vs. {self.away_team} ({self.date:%Y-%m-%d})'


class NewsArticle(models.Model):
	slug = models.SlugField(unique=True)
	title = models.CharField(max_length=200)
	tag = models.CharField(max_length=80)
	date = models.DateField()
	summary = models.TextField()
	content = models.TextField()
	published = models.BooleanField(default=True)

	class Meta:
		ordering = ['-date']

	def __str__(self):
		return self.title


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
