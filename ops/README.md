# CMS Ops Setup (Homeserver)

This folder contains the self-hosted pieces needed to make Decap CMS work on a static-exported site:

- `cms-auth-proxy/`: GitHub OAuth proxy for Decap CMS (`/cms-auth/*`)
- `github-webhook-deploy/`: GitHub webhook receiver + deploy hook (`/webhooks/github`)

## Expected production routing (Nginx)

- `/` -> static publish directory (your exported site)
- `/admin/` -> static site admin assets
- `/cms-auth/` -> `cms-auth-proxy` service
- `/webhooks/github` -> `github-webhook-deploy` service

## Quick start checklist

1. Confirm `/public/admin/config.yml` uses your public HTTPS domain (`https://buraktomakin.com.tr`).
2. Create a GitHub OAuth App:
   - Callback URL: `https://YOUR_DOMAIN/cms-auth/callback`
3. Configure and run `cms-auth-proxy`.
4. Configure and run `github-webhook-deploy`.
5. Add a GitHub repository webhook pointing to `https://YOUR_DOMAIN/webhooks/github`.
6. Test: create a post in `/admin/` and confirm auto-deploy runs.

## Example Nginx config (minimal)

```nginx
server {
  listen 443 ssl http2;
  server_name buraktomakin.com.tr;

  root /DATA/AppData/nginx/www;
  index index.html;

  location = /admin {
    return 301 /admin/;
  }

  location / {
    try_files $uri $uri/ /index.html;
  }

  location /cms-auth/ {
    proxy_pass http://127.0.0.1:4010/;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  location = /webhooks/github {
    proxy_pass http://127.0.0.1:4020/webhooks/github;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

## Notes

- Both services are plain Node.js HTTP servers (no framework dependency).
- Keep service `.env` files out of git (copy from `.env.example`).
- Run behind TLS. GitHub OAuth callback requires HTTPS in production.
