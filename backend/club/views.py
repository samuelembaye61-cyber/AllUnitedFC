import json
import logging

from django.conf import settings
from django.core.mail import send_mail
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.http import require_http_methods

from .models import Match, NewsArticle, NewsGalleryImage, Player, Prospect, SiteBranding, Sponsor, SponsorInquiry

logger = logging.getLogger(__name__)


def api_response(data, **kwargs):
    return JsonResponse(data, **kwargs)


def csrf_token(request):
    return api_response({'csrfToken': get_token(request)})


def player_photo_url(request, player):
    if not player.photo or not player.photo.name or not player.photo.storage.exists(player.photo.name):
        return ''
    return request.build_absolute_uri(player.photo.url)


def players(request):
    data = [
        {
            'id': player.id,
            'name': player.name,
            'number': player.number,
            'position': player.position,
            'position_group': player.position_group,
            'position_group_label': player.get_position_group_display() if player.position_group else '',
            'nationality': player.nationality,
            'country_code': player.country_code.lower(),
            'bio': player.bio,
            'photo': player_photo_url(request, player),
        }
        for player in Player.objects.all()
    ]
    return api_response(data, safe=False)


def matches(request):
    data = [
        {
            'id': match.id,
            'date': match.date.isoformat(),
            'home_team': match.home_team,
            'away_team': match.away_team,
            'location': match.location,
            'home_score': match.home_score,
            'away_score': match.away_score,
        }
        for match in Match.objects.all()
    ]
    return api_response(data, safe=False)


def news(request):
    data = []

    for article in NewsArticle.objects.filter(published=True).select_related('related_match', 'related_player').prefetch_related('gallery_images'):
        gallery = [
            {
                'id': image.id,
                'image': image.image.url,
                'caption': image.caption,
            }
            for image in article.gallery_images.all()
        ]

        data.append({
            'id': article.id,
            'slug': article.slug,
            'title': article.title,
            'tag': article.tag,
            'article_type': article.article_type,
            'article_type_label': article.get_article_type_display(),
            'priority_tier': article.priority_tier,
            'date': article.date.isoformat(),
            'summary': article.summary,
            'content': article.content,
            'image': article.image.url if article.image else '',
            'video_url': article.video_url,
            'alert_starts_at': article.alert_starts_at.isoformat() if article.alert_starts_at else None,
            'alert_ends_at': article.alert_ends_at.isoformat() if article.alert_ends_at else None,
            'related_match': {
                'id': article.related_match.id,
                'date': article.related_match.date.isoformat(),
                'home_team': article.related_match.home_team,
                'away_team': article.related_match.away_team,
                'location': article.related_match.location,
                'home_score': article.related_match.home_score,
                'away_score': article.related_match.away_score,
            } if article.related_match else None,
            'related_player': {
                'id': article.related_player.id,
                'name': article.related_player.name,
                'number': article.related_player.number,
                'position': article.related_player.position,
            } if article.related_player else None,
            'gallery': gallery,
        })

    return api_response(data, safe=False)


def sponsors(request):
    tier_order = {tier: index for index, (tier, _) in enumerate(Sponsor.TIER_CHOICES)}
    items = sorted(
        Sponsor.objects.filter(is_active=True),
        key=lambda sponsor: (tier_order[sponsor.tier], sponsor.display_order, sponsor.name.lower()),
    )
    data = [
        {
            'id': sponsor.id,
            'name': sponsor.name,
            'logo': request.build_absolute_uri(sponsor.logo.url) if sponsor.logo else '',
            'website': sponsor.website,
            'tier': sponsor.tier,
            'tier_label': sponsor.get_tier_display(),
            'bio': sponsor.bio,
            'member_offer': sponsor.member_offer,
            'display_order': sponsor.display_order,
        }
        for sponsor in items
    ]
    return api_response(data, safe=False)


def site_branding(request):
    branding = SiteBranding.objects.first()
    badge_url = ''
    if branding and branding.league_badge and branding.league_badge.storage.exists(branding.league_badge.name):
        badge_url = request.build_absolute_uri(branding.league_badge.url)
    return api_response({'league_badge': badge_url})


@csrf_protect
@require_http_methods(['POST', 'OPTIONS'])
def sponsor_inquiries(request):
    if request.method == 'OPTIONS':
        return api_response({}, status=204)

    try:
        data = json.loads(request.body)
        if data.get('website_url', '').strip():
            return api_response({'status': 'received'}, status=202)
        business_name = data.get('business_name', '').strip()
        contact_name = data.get('contact_name', '').strip()
        email = data.get('email', '').strip()
        phone = data.get('phone', '').strip()
        intended_tier = data.get('intended_tier', '').strip()
        message = data.get('message', '').strip()
        validate_email(email)
    except (json.JSONDecodeError, AttributeError):
        return api_response({'error': 'Send valid inquiry details.'}, status=400)
    except ValidationError:
        return api_response({'error': 'Enter a valid email address.'}, status=400)

    if not business_name or not contact_name or not phone:
        return api_response({'error': 'Business, contact name, and phone are required.'}, status=400)

    valid_tiers = {tier for tier, _ in SponsorInquiry.TIER_CHOICES}
    if intended_tier not in valid_tiers:
        return api_response({'error': 'Choose a valid sponsorship tier.'}, status=400)

    inquiry = SponsorInquiry.objects.create(
        business_name=business_name,
        contact_name=contact_name,
        email=email,
        phone=phone,
        intended_tier=intended_tier,
        message=message,
    )

    notification_email = settings.SPONSOR_INQUIRY_NOTIFICATION_EMAIL
    notification_sent = False
    if notification_email:
        body = '\n'.join([
            f'Business: {inquiry.business_name}',
            f'Contact: {inquiry.contact_name}',
            f'Email: {inquiry.email}',
            f'Phone: {inquiry.phone}',
            f'Tier: {inquiry.get_intended_tier_display()}',
            f'Message: {inquiry.message or "(none)"}',
        ])
        try:
            send_mail(
                subject=f'New sponsor inquiry: {inquiry.business_name}',
                message=body,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[notification_email],
                fail_silently=False,
            )
            notification_sent = True
        except Exception:
            logger.exception('Could not send sponsor inquiry notification for %s', inquiry.pk)

    return api_response({'id': inquiry.id, 'status': inquiry.status, 'notification_sent': notification_sent}, status=201)


@csrf_protect
@require_http_methods(['POST', 'OPTIONS'])
def prospects(request):
    if request.method == 'OPTIONS':
        return api_response({}, status=204)

    try:
        data = json.loads(request.body)
        name = data.get('name', '').strip()
        email = data.get('email', '').strip()
        phone = data.get('phone', '').strip()
        position = data.get('position', '').strip()
        message = data.get('message', '').strip()
        validate_email(email)
    except (json.JSONDecodeError, AttributeError):
        return api_response({'error': 'Send valid JSON.'}, status=400)
    except ValidationError:
        return api_response({'error': 'Enter a valid email address.'}, status=400)

    if not name or not email or not position:
        return api_response({'error': 'Name, email, and position are required.'}, status=400)

    prospect = Prospect.objects.create(
        name=name,
        email=email,
        phone=phone,
        position=position,
        message=message,
    )

    return api_response({'id': prospect.id, 'status': prospect.status}, status=201)
