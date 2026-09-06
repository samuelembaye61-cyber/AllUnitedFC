import json

from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.http import require_http_methods

from .models import Match, NewsArticle, Player, Prospect


def api_response(data, **kwargs):
    response = JsonResponse(data, **kwargs)
    response['Access-Control-Allow-Origin'] = '*'
    response['Access-Control-Allow-Headers'] = 'Content-Type'
    return response


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
    data = [
        {
            'id': article.id,
            'slug': article.slug,
            'title': article.title,
            'tag': article.tag,
            'date': article.date.isoformat(),
            'summary': article.summary,
            'content': article.content,
        }
        for article in NewsArticle.objects.filter(published=True)
    ]
    return api_response(data, safe=False)


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
