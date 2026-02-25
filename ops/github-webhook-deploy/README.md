# GitHub Webhook Deploy Receiver

Receives GitHub `push` webhooks and triggers a local deploy script for your static export.

## Endpoints

- `GET /health`
- `POST /webhooks/github`

## Environment

- `PORT` (default `4020`)
- `GITHUB_WEBHOOK_SECRET` (required)
- `REPO_FULL_NAME` (default `Tomakin/personal-portfolio`)
- `BRANCH_REF` (default `refs/heads/main`)
- `APP_DIR` (repo app directory)
- `DEPLOY_SCRIPT` (absolute path to `deploy.sh`)
- `PUBLISH_DIR` (directory served by Nginx/Caddy)
- `DEPLOY_WORKDIR` (optional temp release dir parent)

## Run

```bash
node server.mjs
```

## Behavior

- Verifies `X-Hub-Signature-256`
- Accepts only `push` events
- Filters by repo + branch
- Rejects concurrent deploys with `409`
- Starts `deploy.sh` in the background and returns `202`
