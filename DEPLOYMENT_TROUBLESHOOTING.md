# EC2 Deployment Troubleshooting Notes

Use these checks to identify whether a deployment issue is in Cloudflare, Nginx, Django, or browser JavaScript. Run server commands from `/home/ubuntu/AllUnitedFC` unless noted.

## Homepage returns 404 but admin works

A working `/admin/` confirms Gunicorn and Django can respond, but it does not confirm Nginx serves the static homepage correctly. In the HTTPS server block, proxy only `/api/` and `/admin/` to Gunicorn. Serve the website files from disk:

```nginx
root /home/ubuntu/AllUnitedFC;
index index.html;

location / {
    try_files $uri $uri/ =404;
}
```

If `location /` contains `proxy_pass http://127.0.0.1:8000;`, the homepage request goes to Django, which may return 404 because Django is not serving `index.html`.

Check the active config, not only the file you intended to edit:

```bash
readlink -f /etc/nginx/sites-enabled/allunitedfc
sudo nginx -T 2>/dev/null | grep -n -A8 -B3 'location / {'
ls -l /home/ubuntu/AllUnitedFC/index.html
```

After editing Nginx, validate and reload it:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

## Keep static paths aligned

The `/static/` Nginx alias must match Django's actual `STATIC_ROOT`. Check the configured path:

```bash
./.venv/bin/python backend/manage.py shell -c "from django.conf import settings; print(settings.STATIC_ROOT)"
./.venv/bin/python backend/manage.py collectstatic --noinput
```

For example, if `STATIC_ROOT` is `/home/ubuntu/AllUnitedFC/backend/staticfiles`, use:

```nginx
location /static/ {
    alias /home/ubuntu/AllUnitedFC/backend/staticfiles/;
}
```

If `STATIC_ROOT` is `/home/ubuntu/AllUnitedFC/staticfiles`, use that path instead. Do not guess from an old generated directory. `/media/` should point to `/home/ubuntu/AllUnitedFC/backend/media/`.

## Separate Cloudflare from the EC2 origin

An HTTP `301` to HTTPS is expected when HTTP redirects are enabled. Test Nginx locally on EC2 to bypass Cloudflare:

```bash
curl -kI --resolve allunitedfc.com:443:127.0.0.1 https://allunitedfc.com/
curl -kI --resolve www.allunitedfc.com:443:127.0.0.1 https://www.allunitedfc.com/
```

Then compare with the public request:

```bash
curl -I https://allunitedfc.com/
curl -I https://www.allunitedfc.com/
```

If local origin works but the public request fails, investigate Cloudflare DNS, redirects, or rules. If local origin returns 404, inspect the HTTPS Nginx server block and its document root. `/admin/` commonly returns `302` to the login page when unauthenticated; that is expected.

## News page loads without articles

Check both the browser console and the API:

```bash
curl -i https://allunitedfc.com/api/news/
```

A `200` with JSON articles means the API is responding. A browser JavaScript error such as `Unexpected token ':'` means `news.js` failed to parse, so it never renders the response. Check that the API base is one complete ternary declaration:

```js
const NEWS_API = window.location.protocol === "file:"
  ? "http://127.0.0.1:8001/api"
  : "/api";
```

Remove any duplicate or dangling `: "/api";` line left by a merge conflict. Confirm `index.html` and `news.html` reference the current `news.js?v=...` version; increment the version after changing the script and hard-refresh the browser. Static HTML and JavaScript changes do not require a Gunicorn restart.

## Django changes and merge conflicts

For Python/model changes, run migrations and restart Gunicorn after deploying:

```bash
./.venv/bin/python backend/manage.py check
./.venv/bin/python backend/manage.py migrate
sudo systemctl restart allunitedfc
```

For Nginx config changes, use `nginx -t` and reload Nginx; restarting Gunicorn is not needed. For static Django admin assets, run `collectstatic` after confirming `STATIC_ROOT` matches the Nginx alias.

Before staging a merge resolution, make sure conflict markers are removed; `git add` alone does not remove them:

```bash
grep -n -E '^(<<<<<<<|=======|>>>>>>>)' backend/config/settings.py news.js
git diff --check
```

No output from the first command means no standard conflict markers remain. Keep an applied stash until the merged site has been checked.
