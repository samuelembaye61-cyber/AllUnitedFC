import json

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from .models import Match, NewsArticle, Player, Prospect


def api_response(data, **kwargs):
    response = JsonResponse(data, **kwargs)
    response['Access-Control-Allow-Origin'] = '*'
    response['Access-Control-Allow-Headers'] = 'Content-Type'
    return response


def players(request):
    data = [
        {
            'id': player.id,
            'name': player.name,
            'number': player.number,
            'position': player.position,
            'photo': player.photo,
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


@csrf_exempt
@require_http_methods(['POST', 'OPTIONS'])
def prospects(request):
    if request.method == 'OPTIONS':
        return api_response({}, status=204)

    try:
        data = json.loads(request.body)
        prospect = Prospect.objects.create(
            name=data.get('name', '').strip(),
            email=data.get('email', '').strip(),
            phone=data.get('phone', '').strip(),
            position=data.get('position', '').strip(),
            message=data.get('message', '').strip(),
        )
    except (json.JSONDecodeError, AttributeError):
        return api_response({'error': 'Send valid JSON.'}, status=400)

    if not prospect.name or not prospect.email or not prospect.position:
        prospect.delete()
        return api_response({'error': 'Name, email, and position are required.'}, status=400)

    return api_response({'id': prospect.id, 'status': prospect.status}, status=201)
