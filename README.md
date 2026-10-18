# All United FC

All United FC is a football club website where visitors can read club news, view the team roster, check upcoming fixtures and results, and submit interest in joining the team.

## Features

- Responsive club homepage with navigation, hero section, news, fixtures, roster, and join form.
- News page with reusable article URLs such as `news.html?id=article-slug`.
- Django admin for managing players, matches, news articles, and player-interest submissions.
- JSON API endpoints used by the frontend:
	- `GET /api/players/`
	- `GET /api/matches/`
	- `GET /api/news/`
	- `POST /api/prospects/`
- 19 roster players loaded from a Django fixture.
- 6 fixtures loaded from a Django fixture.
- SQLite database for local development.
- Environment-based Django secret key and allowed hosts.

## Project Structure

```text
AllUnitedFC/
├── index.html                 # Public homepage
├── news.html                  # Reusable news page
├── styles.css                 # Frontend styling
├── players.js                 # Roster, fixtures, tabs, and signup API calls
├── news.js                    # News API calls and article rendering
├── images/                    # Club images
├── backend/
│   ├── manage.py              # Django command entry point
│   ├── config/                # Django project settings and URLs
│   └── club/                  # Models, admin, views, API URLs, fixtures
├── requirements.txt           # Python dependencies
├── .env.example               # Safe environment variable template
└── INTERVIEW_NOTES.md         # Study and interview explanation
```

## Run Locally

Create and activate the virtual environment:

```bash
python3 -m venv .venv
source .venv/bin/activate
```

Install dependencies:

```bash
python -m pip install -r requirements.txt
```

Create `.env` in the project root. It is ignored by Git:

```text
DJANGO_SECRET_KEY=your-local-random-secret
DJANGO_ALLOWED_HOSTS=127.0.0.1,localhost
```

Initialize the database and load the roster and fixtures:

```bash
python backend/manage.py migrate
python backend/manage.py loaddata players matches
```

Create an admin account:

```bash
python backend/manage.py createsuperuser
```

Start Django:

```bash
python backend/manage.py runserver 127.0.0.1:8001
```

Open the site at:

```text
http://127.0.0.1:8001/
```

Admin dashboard:

```text
http://127.0.0.1:8001/admin/
```

## Updating Data

Use Django admin to add or update players, matches, news articles, and signups. Fixture files are useful for repeatable initial data:

```bash
python backend/manage.py loaddata players
python backend/manage.py loaddata matches
```

Sponsor profiles and sponsor inquiries are managed separately in Django admin. Set `SPONSOR_INQUIRY_NOTIFICATION_EMAIL` and the `DJANGO_EMAIL_*` environment variables to deliver new-lead notifications. Without an email backend configured, local development uses Django's console email backend.

The frontend currently points to the production API URL in `players.js` and `news.js`:

```javascript
const API = "https://api.allunitedfc.com/api";
```

For local-only frontend testing, temporarily use:

```javascript
const API = "http://127.0.0.1:8001/api";
```

## Deploy to EC2

The deployment target is one Ubuntu EC2 instance. Nginx serves the frontend, static files, and uploaded media; Gunicorn runs Django behind it. Follow [`DEPLOY_TO_EC2.md`](DEPLOY_TO_EC2.md) first to verify HTTP directly on the EC2 public IP. Once that works, continue with [`DEPLOYMENT_BEFORE_CLOUDFLARE.md`](DEPLOYMENT_BEFORE_CLOUDFLARE.md) for the original Cloudflare checklist.

The Dockerfile and GitHub Actions workflow are unfinished ECS scaffolds and are not used by this EC2 deployment path. The local SQLite database and uploaded media are Git-ignored, so copy and back them up separately if you need existing site content on the server.
