# Deploy All United FC to EC2

This guide covers the first deployment stage: running the current project on one Ubuntu EC2 instance over HTTP. Nginx serves the frontend, static files, and uploaded media. Gunicorn runs Django privately on `127.0.0.1:8000`.

Do not configure Cloudflare until the EC2 public IP works. For Cloudflare-specific steps, keep using `DEPLOYMENT_BEFORE_CLOUDFLARE.md`.

The Dockerfile and GitHub Actions workflow are unfinished ECS scaffolds and are not used in this direct EC2 path. Keep port 8000 closed in the EC2 security group.

## 1. Check the EC2 instance

Use an Ubuntu instance with a public IPv4 address or Elastic IP. Its security group should allow:

- SSH port 22 from your own IP
- HTTP port 80 from the internet
- HTTPS port 443 from the internet for the later TLS step

Connect from your computer:

```bash
ssh -i /path/to/key.pem ubuntu@YOUR_EC2_PUBLIC_IP
```

## 2. Install server packages

Run on EC2:

```bash
sudo apt update
sudo apt install -y python3 python3-venv python3-pip nginx git curl rsync
```

## 3. Put the project on EC2

Clone the Git repository that contains the current code:

```bash
cd /home/ubuntu
git clone YOUR_REPOSITORY_URL AllUnitedFC
cd /home/ubuntu/AllUnitedFC
```

If the repository is already cloned, use `git pull` from its correct branch instead.

### Copy existing database and uploaded files

Git ignores `backend/db.sqlite3` and uploaded media. To bring the current players, matches, sponsors, badge, news, and photos to EC2, run these commands from your computer in the local project root:

```bash
scp -i /path/to/key.pem backend/db.sqlite3 ubuntu@YOUR_EC2_PUBLIC_IP:/home/ubuntu/AllUnitedFC/backend/db.sqlite3
rsync -av --progress -e "ssh -i /path/to/key.pem" backend/media/ ubuntu@YOUR_EC2_PUBLIC_IP:/home/ubuntu/AllUnitedFC/backend/media/
```

Replace the key path and IP. Don’t overwrite the EC2 database if it already contains newer production data. Skip this copy step for a fresh database; you’ll create its admin account below.

## 4. Install Python dependencies

Run on EC2 from `/home/ubuntu/AllUnitedFC`:

```bash
python3 -m venv .venv
./.venv/bin/python -m pip install --upgrade pip
./.venv/bin/python -m pip install -r requirements.txt
```

Gunicorn is included in `requirements.txt` and runs behind Nginx.

## 5. Create the production environment file

Generate a private Django key on EC2:

```bash
python3 -c 'import secrets; print(secrets.token_urlsafe(48))'
```

Create `/home/ubuntu/AllUnitedFC/.env` with the generated key and your EC2 IP:

```text
DJANGO_DEBUG=False
DJANGO_SECRET_KEY=PASTE_THE_GENERATED_KEY_HERE
DJANGO_ALLOWED_HOSTS=YOUR_EC2_PUBLIC_IP
DJANGO_CSRF_TRUSTED_ORIGINS=
DJANGO_SECURE_SSL_REDIRECT=False
DJANGO_SESSION_COOKIE_SECURE=False
DJANGO_CSRF_COOKIE_SECURE=False
DJANGO_SECURE_HSTS_SECONDS=0
DJANGO_SECURE_HSTS_INCLUDE_SUBDOMAINS=False
DJANGO_SECURE_HSTS_PRELOAD=False
```

Do not commit or share this file. Restrict its permissions:

```bash
chmod 600 .env
```

Email notifications are optional for this first HTTP test. Sponsor inquiries still save to admin without an email provider.

## 6. Run Django setup

From `/home/ubuntu/AllUnitedFC`:

```bash
./.venv/bin/python backend/manage.py check
./.venv/bin/python backend/manage.py migrate
./.venv/bin/python backend/manage.py collectstatic --noinput
```

`collectstatic` places Django admin assets in `/home/ubuntu/AllUnitedFC/staticfiles/`, which Nginx serves. If you copied the database, it includes the existing admin account. For a fresh database, create one:

```bash
./.venv/bin/python backend/manage.py createsuperuser
```

## 7. Start Gunicorn with systemd

The checked-in service points at this project’s actual `backend/config/wsgi.py`:

```bash
sudo cp deploy/systemd/allunitedfc.service /etc/systemd/system/allunitedfc.service
sudo systemctl daemon-reload
sudo systemctl enable --now allunitedfc
sudo systemctl status --no-pager allunitedfc
```

Check Django locally on EC2:

```bash
curl -I http://127.0.0.1:8000/
```

If it fails, inspect `sudo journalctl -u allunitedfc -n 100 --no-pager` before continuing.

## 8. Configure Nginx for HTTP

Install the checked-in site config:

```bash
sudo cp deploy/nginx/allunitedfc.conf /etc/nginx/sites-available/allunitedfc
sudo ln -s /etc/nginx/sites-available/allunitedfc /etc/nginx/sites-enabled/allunitedfc
```

If the default Nginx site is enabled and conflicts, inspect it and disable only that default symlink. Validate and reload Nginx:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

The config serves the frontend from the repository root, `/static/` from `staticfiles/`, `/media/` from `backend/media/`, and proxies `/api/` and `/admin/` to Gunicorn.

## 9. Test the public IP over HTTP

On EC2, check Nginx locally:

```bash
curl -I http://127.0.0.1/
curl -I http://127.0.0.1/admin/
curl -I http://127.0.0.1/static/admin/css/base.css
```

Then open `http://YOUR_EC2_PUBLIC_IP/` from your computer. Check the homepage, News page, roster, `/admin/`, league badge at `/media/branding/IMG_0748.png`, and sponsor inquiry form. Keep port 8000 closed to the public.

If a page fails, check `sudo nginx -t`, `sudo systemctl status nginx`, and `sudo journalctl -u allunitedfc`. Don’t move to Cloudflare until the public IP works directly.

## 10. Prepare for HTTPS

After HTTP works directly, configure the domain and TLS certificate. Then set `DJANGO_ALLOWED_HOSTS` to the IP and domain names, and `DJANGO_CSRF_TRUSTED_ORIGINS` to the HTTPS origins, for example:

```text
DJANGO_ALLOWED_HOSTS=YOUR_EC2_PUBLIC_IP,example.com,www.example.com
DJANGO_CSRF_TRUSTED_ORIGINS=https://example.com,https://www.example.com
```

Only after HTTPS is confirmed should you enable `DJANGO_SECURE_SSL_REDIRECT`, secure cookies, or HSTS. Use `./.venv/bin/python backend/manage.py check --deploy` and review any warnings. Then continue with `DEPLOYMENT_BEFORE_CLOUDFLARE.md`.

Back up the SQLite database and `backend/media/` before future deployments or migrations.
