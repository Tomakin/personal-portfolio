# Decap CMS GitHub OAuth Proxy

Self-hosted OAuth helper for Decap CMS on a static site.

## Endpoints

- `GET /health`
- `GET /auth`
- `GET /callback`

## Environment

Copy `.env.example` to `.env` (or set vars in systemd/Docker):

- `PORT`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `OAUTH_REDIRECT_URI`
- `ALLOWED_ORIGIN`
- `GITHUB_SCOPE` (optional; defaults to `public_repo user:email`)

## Run

```bash
node server.mjs
```

## GitHub OAuth App

- Authorization callback URL must be:
  - `https://YOUR_DOMAIN/cms-auth/callback`

## Security behavior

- Uses CSRF `state` validation (in-memory store with TTL)
- Only posts the OAuth result back to `ALLOWED_ORIGIN`
- Returns no-store headers on auth responses
