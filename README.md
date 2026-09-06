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

The frontend currently points to the production API URL in `players.js` and `news.js`:

```javascript
const API = "https://api.allunitedfc.com/api";
```

For local-only frontend testing, temporarily use:

```javascript
const API = "http://127.0.0.1:8001/api";
```

## Deployment Plan

The project uses separate frontend and backend hosting:

1. Deploy the plain HTML, CSS, JavaScript, and `images/` files to GitHub Pages, Netlify, or Vercel.
2. Deploy the Django `backend/` application to a Python host such as Render or Railway.
3. Set the production `DJANGO_SECRET_KEY` and `DJANGO_ALLOWED_HOSTS` as host environment variables.
4. Point the frontend `API` constant at the deployed backend URL.
5. Configure CORS to allow only the frontend domain.
6. Use PostgreSQL instead of SQLite for production data.

## Pre-Deployment Checklist

- Replace the hardcoded API URL with the real deployed API URL.
- Remove the development catch-all route that serves the whole repository.
- Replace `Access-Control-Allow-Origin: *` with the real frontend origin.
- Remove `csrf_exempt` and configure CSRF protection for the signup request.
- Keep `DEBUG = False` and use a private production secret key.
- Configure HTTPS, secure cookies, backups, and a production database.
- Escape or safely render admin-entered text before inserting it into HTML.

## Current Status

The local Django backend passes `manage.py check`, and the local API has been verified with roster and fixture data. The production API domain is not deployed yet, so public frontend data loading will work only after the backend is hosted and its URL is configured.
