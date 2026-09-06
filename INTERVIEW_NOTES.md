# All United FC Interview Notes

## One-Minute Explanation

I built a football club website with a plain HTML, CSS, and JavaScript frontend and a Django backend. The public site shows club news, the player roster, upcoming matches, and match results. The join form sends a JSON request to the Django API, where the submission is stored as a prospect. Django admin allows authorized staff to manage players, matches, news articles, and signup requests.

## Architecture

```text
Browser
  ├── index.html / news.html
  ├── styles.css
  ├── players.js / news.js
  └── fetch() requests
          |
          v
Django JSON API
  ├── /api/players/
  ├── /api/matches/
  ├── /api/news/
  └── /api/prospects/
          |
          v
SQLite during development
  ├── Player
  ├── Match
  ├── NewsArticle
  └── Prospect
```

## What I Built

### Frontend

- Created a responsive homepage for All United FC.
- Added navigation links for news, matches, roster, and joining the team.
- Added a hero section using the club crest.
- Added a roster grid that loads player data from Django.
- Added match tabs for results and upcoming fixtures.
- Added a reusable news page using a URL query string and article slug.
- Added a form that validates required fields and posts signup data to Django.

### Backend

- Created a Django project in `backend/` and a `club` application.
- Added database models for `Player`, `Match`, `NewsArticle`, and `Prospect`.
- Registered the models in Django admin.
- Added JSON API views and URL routes.
- Added migrations for the database schema.
- Created fixtures for 19 players and 6 matches.
- Added environment configuration with `.env` and `.env.example`.

## Important Technical Decisions

### Why use an API?

The frontend and backend have separate responsibilities. The frontend handles presentation and user interaction. Django handles validation, storage, administration, and future business logic. This means a staff member can update a player or fixture in Django admin without editing the frontend files.

### Why use fixtures?

Fixtures provide repeatable initial data. Instead of manually entering all 19 players and 6 matches every time, I can run:

```bash
python backend/manage.py loaddata players matches
```

### Why use environment variables?

Secrets should not be committed to GitHub. The Django secret key is loaded from `.env` locally and from the hosting provider's environment variables in production. `.env` is ignored by Git, while `.env.example` documents the required variable names.

### How does the roster work?

When the page loads, `players.js` calls `GET /api/players/`. Django queries the `Player` model, serializes each record to JSON, and returns the list. JavaScript maps each object into a roster card.

### How does the signup form work?

The form collects name, email, phone, position, and message. JavaScript validates the required fields, sends JSON to `POST /api/prospects/`, and displays success or error feedback. Django validates the request and saves a `Prospect` record.

## Questions I Can Answer

### Why did you choose Django?

Django includes an ORM, migrations, authentication, admin interface, security middleware, and a clear project structure. The admin interface is especially useful for a club website because staff can manage roster and match data without changing code.

### How would you scale this project?

I would move from SQLite to PostgreSQL, add a production WSGI server, configure HTTPS, restrict CORS, add authentication and permissions, add automated tests, and deploy the frontend and backend separately.

### What was the hardest integration issue?

The frontend initially used local JavaScript arrays and API calls at the same time. I removed the duplicate local rendering so the backend became the source of truth. I also had to make sure the frontend API URL matched the Django routes exactly.

### What would you improve next?

I would add automated API tests, secure CSRF handling for the signup endpoint, restrict CORS to the frontend domain, remove the development catch-all file route, sanitize admin content before rendering, add real player photos, and use PostgreSQL in production.

## Useful Commands

```bash
source .venv/bin/activate
python backend/manage.py check
python backend/manage.py check --deploy
python backend/manage.py makemigrations
python backend/manage.py migrate
python backend/manage.py createsuperuser
python backend/manage.py runserver 127.0.0.1:8001
```

## Honest Project Status

The local application is working and the Django checks pass. The public production API is not deployed yet. Before deployment, production security settings, CORS, CSRF, file serving, database choice, and frontend API configuration must be completed.