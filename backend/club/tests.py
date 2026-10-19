from datetime import date, datetime, timezone
import json
from tempfile import TemporaryDirectory

from django.core import mail
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.contrib.admin.sites import AdminSite
from django.test import RequestFactory, TestCase, override_settings

from .admin import PlayerAdmin
from .models import Match, NewsArticle, Player, SiteBranding, Sponsor, SponsorInquiry


class NewsApiTests(TestCase):
	def test_published_article_includes_editorial_metadata(self):
		player = Player.objects.create(name='Jordan Lee', number=12, position='Forward')
		match = Match.objects.create(
			date=datetime(2026, 10, 10, 15, 0, tzinfo=timezone.utc),
			home_team='All United FC',
			away_team='Visitors FC',
			location='Merrick-Moore Park',
			home_score=2,
			away_score=1,
		)
		NewsArticle.objects.create(
			slug='match-report-test',
			title='Match report test',
			tag='Matchday',
			article_type='match_report',
			date=date(2026, 10, 10),
			summary='A test recap.',
			content='The match report body.',
			related_match=match,
			related_player=player,
			video_url='https://example.com/highlights',
			priority_tier=1,
			alert_starts_at=datetime(2026, 10, 10, 14, 0, tzinfo=timezone.utc),
			alert_ends_at=datetime(2026, 10, 10, 18, 0, tzinfo=timezone.utc),
			published=True,
		)

		response = self.client.get('/api/news/')

		self.assertEqual(response.status_code, 200)
		article = response.json()[0]
		self.assertEqual(article['article_type_label'], 'Match report')
		self.assertEqual(article['related_match']['home_score'], 2)
		self.assertEqual(article['related_player']['name'], 'Jordan Lee')
		self.assertEqual(article['video_url'], 'https://example.com/highlights')
		self.assertEqual(article['priority_tier'], 1)
		self.assertEqual(article['alert_ends_at'], '2026-10-10T18:00:00+00:00')

	def test_tier_one_requires_alert_expiry(self):
		article = NewsArticle(
			slug='urgent-without-expiry',
			title='Urgent notice',
			tag='Weather',
			priority_tier=1,
			date=date(2026, 10, 10),
			summary='A notice.',
			content='The alert details.',
		)

		with self.assertRaises(ValidationError):
			article.full_clean()

	def test_new_articles_start_unpublished(self):
		article = NewsArticle.objects.create(
			slug='draft-test',
			title='Draft test',
			tag='News',
			date=date(2026, 10, 10),
			summary='A draft.',
			content='Not public yet.',
		)

		self.assertFalse(article.published)
		self.assertEqual(article.priority_tier, 3)
		self.assertEqual(self.client.get('/api/news/').json(), [])


class PlayerApiTests(TestCase):
	def test_players_api_includes_profile_and_filter_fields(self):
		Player.objects.create(
			name='Morgan Keeper',
			number=1,
			position='Goalkeeper',
			position_group='goalkeeper',
			nationality='Exampleland',
			country_code='EX',
			bio='A short player quote.',
			is_spotlight=True,
		)

		response = self.client.get('/api/players/')

		self.assertEqual(response.status_code, 200)
		player = response.json()[0]
		self.assertEqual(player['position_group'], 'goalkeeper')
		self.assertEqual(player['position_group_label'], 'Goalkeeper')
		self.assertEqual(player['nationality'], 'Exampleland')
		self.assertEqual(player['country_code'], 'ex')
		self.assertEqual(player['bio'], 'A short player quote.')
		self.assertTrue(player['is_spotlight'])

	def test_saving_spotlight_player_clears_other_players(self):
		previous = Player.objects.create(name='Previous Spotlight', number=7, is_spotlight=True)
		selected = Player.objects.create(name='New Spotlight', number=8)
		selected.is_spotlight = True

		PlayerAdmin(Player, AdminSite()).save_model(RequestFactory().post('/admin/'), selected, None, True)

		previous.refresh_from_db()
		selected.refresh_from_db()
		self.assertFalse(previous.is_spotlight)
		self.assertTrue(selected.is_spotlight)


class SponsorApiTests(TestCase):
	def test_site_branding_returns_uploaded_league_badge(self):
		with TemporaryDirectory() as media_root, override_settings(MEDIA_ROOT=media_root):
			SiteBranding.objects.create(
				league_badge=SimpleUploadedFile('league-badge.png', b'badge-image', content_type='image/png'),
			)

			response = self.client.get('/api/site-branding/')

		self.assertEqual(response.status_code, 200)
		self.assertTrue(response.json()['league_badge'].endswith('/media/branding/league-badge.png'))

	def test_sponsor_list_returns_active_sponsors_in_tier_order(self):
		gold = Sponsor.objects.create(name='Local Gold', tier='gold', display_order=0, is_active=True)
		diamond = Sponsor.objects.create(name='Local Diamond', tier='diamond', display_order=5, is_active=True)
		Sponsor.objects.create(name='Inactive', tier='platinum', is_active=False)

		response = self.client.get('/api/sponsors/')

		self.assertEqual(response.status_code, 200)
		self.assertEqual([item['id'] for item in response.json()], [diamond.id, gold.id])

	@override_settings(
		EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
		SPONSOR_INQUIRY_NOTIFICATION_EMAIL='club@example.com',
	)
	def test_sponsor_inquiry_is_saved_and_notifies_leadership(self):
		response = self.client.post('/api/sponsor-inquiries/', data=json.dumps({
			'business_name': 'Durham Physio',
			'contact_name': 'Avery Smith',
			'email': 'avery@example.com',
			'phone': '919-555-0142',
			'intended_tier': 'platinum',
			'message': 'Interested in supporting the club.',
		}), content_type='application/json')

		self.assertEqual(response.status_code, 201)
		self.assertEqual(SponsorInquiry.objects.count(), 1)
		self.assertEqual(SponsorInquiry.objects.get().status, 'new')
		self.assertTrue(response.json()['notification_sent'])
		self.assertEqual(len(mail.outbox), 1)
		self.assertEqual(mail.outbox[0].to, ['club@example.com'])

	def test_sponsor_inquiry_rejects_invalid_tier(self):
		response = self.client.post('/api/sponsor-inquiries/', data=json.dumps({
			'business_name': 'Durham Physio',
			'contact_name': 'Avery Smith',
			'email': 'avery@example.com',
			'phone': '919-555-0142',
			'intended_tier': 'unobtainium',
		}), content_type='application/json')

		self.assertEqual(response.status_code, 400)
		self.assertEqual(SponsorInquiry.objects.count(), 0)

	def test_sponsor_inquiry_honeypot_does_not_create_a_lead(self):
		response = self.client.post('/api/sponsor-inquiries/', data=json.dumps({
			'website_url': 'https://bot.example.com',
		}), content_type='application/json')

		self.assertEqual(response.status_code, 202)
		self.assertEqual(SponsorInquiry.objects.count(), 0)

