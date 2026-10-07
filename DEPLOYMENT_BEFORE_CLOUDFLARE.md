# EC2 Deployment Checklist Before Cloudflare

This document covers the steps required to get the app running correctly on AWS EC2 before connecting Cloudflare.

Important: if the EC2 instance is not publicly reachable on port 80/443, the app will not work even if the Django app and Nginx config are correct.

---

## 1) Launch the EC2 instance

1. Open AWS EC2.
2. Launch an Ubuntu instance.
3. Choose a security group that allows:
   - SSH: 22
   - HTTP: 80
   - HTTPS: 443
4. Make sure the instance is in a subnet that has Internet Gateway access.

### Required inbound rules

- 22/tcp from your IP or 0.0.0.0/0 for testing
- 80/tcp from 0.0.0.0/0
- 443/tcp from 0.0.0.0/0

---

## 2) Confirm the instance has a public IP

This is the biggest issue that blocks deployment.

Check the EC2 instance details and confirm it has a public IPv4 or an Elastic IP attached.

If the instance only shows a private IP such as `172.31.x.x`, then it is not publicly reachable.

That means the app will not work from the internet even if Nginx is running.

Recommended option:

- allocate an Elastic IP
- attach it to the EC2 instance

---

## 3) Connect to the EC2 instance

```bash
ssh -i your-key.pem ubuntu@your-ec2-public-ip
```

Example:

```bash
ssh -i ~/Downloads/my-key.pem ubuntu@54.123.45.67
```

---

## 4) Install system dependencies

```bash
sudo apt update
sudo apt install -y python3 python3-venv python3-pip nginx git curl
```

If needed, also install PostgreSQL later, but for the first deployment keep it simple.

---

## 5) Clone the project

```bash
cd /home/ubuntu
git clone <your-repository-url>
cd AllUnitedFC
```

---

## 6) Create the Python environment

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

---

## 7) Configure environment variables

Create a `.env` file in the project root or app directory.

Example:

```bash
DJANGO_SECRET_KEY=your-secret-key
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1,allunitedfc.com,www.allunitedfc.com
```

If the project loads environment variables at runtime, use the exact names expected by the app.

---

## 8) Apply Django setup

From the project directory:

```bash
python manage.py migrate
python manage.py collectstatic
```

If you are using the repo structure in this project, run the command from the Django backend directory when needed.

---

## 9) Start the app with Gunicorn

Test it first:

```bash
gunicorn config.wsgi:application --bind 127.0.0.1:8000
```

If this works, create a systemd service so it continues after reboot.

Example service:

```ini
[Unit]
Description=AllUnitedFC Django App
After=network.target

[Service]
User=ubuntu
Group=ubuntu
WorkingDirectory=/home/ubuntu/AllUnitedFC
Environment="PATH=/home/ubuntu/AllUnitedFC/.venv/bin"
ExecStart=/home/ubuntu/AllUnitedFC/.venv/bin/gunicorn config.wsgi:application --bind 127.0.0.1:8000
Restart=always

[Install]
WantedBy=multi-user.target
```

Then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable allunitedfc
sudo systemctl start allunitedfc
sudo systemctl status allunitedfc
```

---

## 10) Verify Django is responding locally

Check the app from the EC2 instance itself:

```bash
curl -I http://127.0.0.1:8000/
```

Expected:

- HTTP 200 or a valid application response

If this fails, fix the app or Gunicorn first before moving forward.

---

## 11) Configure Nginx

Nginx is what exposes the app publicly.

### Basic HTTP redirect

```nginx
server {
    listen 80;
    server_name allunitedfc.com www.allunitedfc.com;
    return 301 https://$host$request_uri;
}
```

### HTTPS proxy to Django

```nginx
server {
    listen 443 ssl;
    server_name allunitedfc.com www.allunitedfc.com;

    ssl_certificate /etc/letsencrypt/live/allunitedfc.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/allunitedfc.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /static/ {
        alias /home/ubuntu/AllUnitedFC/backend/staticfiles/;
    }

    location /media/ {
        alias /home/ubuntu/AllUnitedFC/backend/media/;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/allunitedfc /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 12) Verify Nginx on the server itself

```bash
curl -I http://127.0.0.1/
curl -k -I https://127.0.0.1/
```

Expected:

- HTTP redirect or 200
- HTTPS response on port 443

If this fails, do not move to Cloudflare yet.

The app must be reachable at the EC2 level before external routing is added.

---

## 13) Test the public IP directly

From outside the EC2 instance, test the public IP directly:

```bash
curl -vkI --resolve allunitedfc.com:443:your-public-ip https://allunitedfc.com/
```

This should only work if:

- the EC2 instance has a public IP attached
- port 443 is open in the security group
- Nginx is listening on 443
- the private/public network path is correct

If it times out, the issue is network-level, not app-level.

---

## 14) Final condition before Cloudflare

Only after these are working should you add Cloudflare:

- EC2 instance has public IP or Elastic IP
- port 80 works
- port 443 works
- Nginx returns a valid response
- Django app responds locally on 127.0.0.1:8000
- domain is not required yet

---

## 15) Common failure pattern before Cloudflare

The most common blocker is:

- EC2 has only private IP
- public IP is not attached
- port 443 times out
- Cloudflare shows 522

This is not a Django bug.
It is a server reachability problem.

---

## 16) When Cloudflare is finally introduced

After the EC2 app is healthy, then:

1. add the domain in Cloudflare
2. set DNS A records to the EC2 public IP
3. enable Cloudflare proxy
4. confirm HTTPS completes successfully
5. validate the site via the real domain

---

## Summary

Before Cloudflare, the goal is simple:

- EC2 is running
- app is running locally
- Nginx is serving
- public IP is reachable
- port 80 and 443 work

Only then do you attach Cloudflare and domain routing.
