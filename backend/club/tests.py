from datetime import date, datetime, timezone
import json
from tempfile import TemporaryDirectory

from django.core import mail
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.contrib.admin.sites import AdminSite
from django.test import RequestFactory, TestCase, override_settings

from .admin import LeagueSeasonAdmin, PlayerAdmin
from .models import League, LeagueSeason, Match, NewsArticle, Player, Prospect, Season, SiteBranding, Sponsor, SponsorInquiry


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


class MatchApiTests(TestCase):
	def test_matches_api_includes_completion_time(self):
		match = Match.objects.create(
			date=datetime(2026, 10, 10, 15, 0, tzinfo=timezone.utc),
			home_team='All United FC',
			away_team='Visitors FC',
			location='Merrick-Moore Park',
			home_score=2,
			away_score=1,
			completed_at=datetime(2026, 10, 10, 16, 55, tzinfo=timezone.utc),
		)

		response = self.client.get('/api/matches/')

		self.assertEqual(response.status_code, 200)
		self.assertEqual(response.json()[0]['id'], match.id)
		self.assertEqual(response.json()[0]['completed_at'], '2026-10-10T16:55:00+00:00')

	def test_filter_returns_only_matches_for_selected_league_season(self):
		season = Season.objects.create(name='Fall 2026')
		first_pair = LeagueSeason.objects.create(
			league=League.objects.create(name='League One'),
			season=season,
		)
		second_pair = LeagueSeason.objects.create(
			league=League.objects.create(name='League Two'),
			season=season,
		)
		selected_match = Match.objects.create(
			date=datetime(2026, 10, 10, 15, 0, tzinfo=timezone.utc),
			home_team='All United FC', away_team='Visitors FC', location='Field One',
			league_season=first_pair,
		)
		other_match = Match.objects.create(
			date=datetime(2026, 10, 11, 15, 0, tzinfo=timezone.utc),
			home_team='All United FC', away_team='Visitors FC', location='Field Two',
			league_season=second_pair,
		)
		legacy_match = Match.objects.create(
			date=datetime(2026, 10, 12, 15, 0, tzinfo=timezone.utc),
			home_team='All United FC', away_team='Visitors FC', location='Unassigned field',
		)

		response = self.client.get('/api/matches/', {'league_season': first_pair.id})
		all_response = self.client.get('/api/matches/')

		self.assertEqual(response.status_code, 200)
		self.assertEqual([item['id'] for item in response.json()], [selected_match.id])
		self.assertNotIn(other_match.id, [item['id'] for item in response.json()])
		self.assertEqual(len(all_response.json()), 3)
		legacy = next(item for item in all_response.json() if item['id'] == legacy_match.id)
		self.assertIsNone(legacy['league_season_id'])

@override_settings(CLUB_NAME='All United FC', CLUB_NAME_ALIASES='allunited')
class LeagueSeasonApiTests(TestCase):
	def test_default_and_record_use_only_completed_matches_in_pair(self):
		season = Season.objects.create(name='Spring 2027')
		league = League.objects.create(
			name='Triangle League',
			points_for_win=5,
			points_for_draw=2,
		)
		pair = LeagueSeason.objects.create(league=league, season=season, is_default=True)
		other_pair = LeagueSeason.objects.create(
			league=League.objects.create(name='Other League'),
			season=season,
		)
		Match.objects.create(
			date=datetime(2027, 3, 1, 15, 0, tzinfo=timezone.utc),
			home_team='allunited', away_team='Rovers FC', location='Field One',
			home_score=0, away_score=0, league_season=pair,
		)
		Match.objects.create(
			date=datetime(2027, 3, 8, 15, 0, tzinfo=timezone.utc),
			home_team='Rovers FC', away_team='All United FC', location='Field One',
			home_score=1, away_score=2, league_season=pair,
		)
		Match.objects.create(
			date=datetime(2027, 3, 15, 15, 0, tzinfo=timezone.utc),
			home_team='All United FC', away_team='Rovers FC', location='Field One',
			home_score=3, away_score=None, league_season=pair,
		)
		Match.objects.create(
			date=datetime(2027, 3, 22, 15, 0, tzinfo=timezone.utc),
			home_team='All United FC', away_team='Rovers FC', location='Field Two',
			home_score=4, away_score=0, league_season=other_pair,
		)

		response = self.client.get('/api/league-seasons/')
		selected = next(item for item in response.json() if item['id'] == pair.id)
		record = selected['club_record']

		self.assertTrue(selected['is_default'])
		self.assertEqual(selected['league']['points_for_win'], 5)
		self.assertEqual(selected['league']['points_for_draw'], 2)
		self.assertEqual(record, {
			'played': 2,
			'won': 1,
			'drawn': 1,
			'lost': 0,
			'goals_for': 2,
			'goals_against': 1,
			'goal_difference': 1,
			'points': 7,
		})

	def test_empty_league_season_has_zero_record(self):
		pair = LeagueSeason.objects.create(
			league=League.objects.create(name='Empty League'),
			season=Season.objects.create(name='Winter 2028'),
		)

		response = self.client.get('/api/league-seasons/')
		selected = next(item for item in response.json() if item['id'] == pair.id)

		self.assertEqual(selected['club_record']['played'], 0)
		self.assertEqual(selected['club_record']['points'], 0)

	def test_admin_keeps_only_one_default_league_season(self):
		season = Season.objects.create(name='Fall 2027')
		first = LeagueSeason.objects.create(league=League.objects.create(name='First League'), season=season, is_default=True)
		selected = LeagueSeason.objects.create(league=League.objects.create(name='Second League'), season=season)
		selected.is_default = True

		LeagueSeasonAdmin(LeagueSeason, AdminSite()).save_model(RequestFactory().post('/admin/'), selected, None, True)

		first.refresh_from_db()
		selected.refresh_from_db()
		self.assertFalse(first.is_default)
		self.assertTrue(selected.is_default)


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


class ProspectApiTests(TestCase):
	def submit_prospect(self, phone):
		return self.client.post('/api/prospects/', data=json.dumps({
			'name': 'Morgan Player',
			'email': 'morgan@example.com',
			'phone': phone,
			'position': 'Forward',
		}), content_type='application/json')

	def test_accepts_exactly_ten_digits(self):
		response = self.submit_prospect('9195550142')

		self.assertEqual(response.status_code, 201)
		self.assertEqual(Prospect.objects.get().phone, '9195550142')

	def test_rejects_non_digit_phone_format(self):
		response = self.submit_prospect('(919) 555-0142')

		self.assertEqual(response.status_code, 400)
		self.assertEqual(Prospect.objects.count(), 0)

	def test_rejects_phone_numbers_with_other_than_ten_digits(self):
		for phone in ('919555014', '19195550142'):
			with self.subTest(phone=phone):
				response = self.submit_prospect(phone)
				self.assertEqual(response.status_code, 400)
		self.assertEqual(Prospect.objects.count(), 0)

	def test_requires_phone_number(self):
		response = self.submit_prospect('')

		self.assertEqual(response.status_code, 400)
		self.assertEqual(Prospect.objects.count(), 0)


class SponsorApiTests(TestCase):
	def test_site_branding_returns_uploaded_league_badge(self):
		with TemporaryDirectory() as media_root, override_settings(MEDIA_ROOT=media_root):
			SiteBranding.objects.create(
				league_badge=SimpleUploadedFile('league-badge.png', b'badge-image', content_type='image/png'),
				homepage_background=SimpleUploadedFile('homepage-background.jpg', b'hero-image', content_type='image/jpeg'),
				league_background=SimpleUploadedFile('league-background.jpg', b'league-image', content_type='image/jpeg'),
			)

			response = self.client.get('/api/site-branding/')

		self.assertEqual(response.status_code, 200)
		self.assertTrue(response.json()['league_badge'].endswith('/media/branding/league-badge.png'))
		self.assertTrue(response.json()['homepage_background'].endswith('/media/branding/homepage-background.jpg'))
		self.assertTrue(response.json()['league_background'].endswith('/media/branding/league-background.jpg'))

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
			'phone': '9195550142',
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
			'phone': '9195550142',
			'intended_tier': 'unobtainium',
		}), content_type='application/json')

		self.assertEqual(response.status_code, 400)
		self.assertEqual(SponsorInquiry.objects.count(), 0)

	def test_sponsor_inquiry_rejects_non_ten_digit_phone(self):
		response = self.client.post('/api/sponsor-inquiries/', data=json.dumps({
			'business_name': 'Durham Physio',
			'contact_name': 'Avery Smith',
			'email': 'avery@example.com',
			'phone': '(919) 555-0142',
			'intended_tier': 'platinum',
		}), content_type='application/json')

		self.assertEqual(response.status_code, 400)
		self.assertEqual(SponsorInquiry.objects.count(), 0)

	def test_sponsor_inquiry_honeypot_does_not_create_a_lead(self):
		response = self.client.post('/api/sponsor-inquiries/', data=json.dumps({
			'website_url': 'https://bot.example.com',
		}), content_type='application/json')

		self.assertEqual(response.status_code, 202)
		self.assertEqual(SponsorInquiry.objects.count(), 0)



@override_settings(CLUB_NAME='Rivertown United', CLUB_SHORT_NAME='', CLUB_NAME_ALIASES='RTU')
class ClubIdentityTests(TestCase):
	def test_branding_endpoint_uses_env_defaults(self):
		data = self.client.get('/api/site-branding/').json()
		self.assertEqual(data['club_name'], 'Rivertown United')
		self.assertEqual(data['club_short_name'], 'Rivertown United')

	def test_admin_values_override_env_defaults(self):
		SiteBranding.objects.create(club_name='Hilltop FC', club_tagline='Up the hill')
		data = self.client.get('/api/site-branding/').json()
		self.assertEqual(data['club_name'], 'Hilltop FC')
		self.assertEqual(data['club_tagline'], 'Up the hill')
