#!/usr/bin/env bash
set -Eeuo pipefail

log() {
  printf '[deploy.sh] %s\n' "$*"
}

require_non_placeholder() {
  local value="$1"
  local name="$2"
  if [[ -z "$value" || "$value" == *"replace-me"* || "$value" == *"/path/to/"* ]]; then
    log "Invalid or placeholder value for ${name}: ${value}"
    exit 1
  fi
}

APP_DIR="${APP_DIR:-}"
BRANCH="${BRANCH:-main}"
PUBLISH_DIR="${PUBLISH_DIR:-}"
DEPLOY_WORKDIR="${DEPLOY_WORKDIR:-}"
NPM_BIN="${NPM_BIN:-npm}"

require_non_placeholder "${APP_DIR}" "APP_DIR"
require_non_placeholder "${PUBLISH_DIR}" "PUBLISH_DIR"

if [[ -z "${DEPLOY_WORKDIR}" ]]; then
  DEPLOY_WORKDIR="${APP_DIR}/.deploy-tmp"
fi

if [[ ! -d "${APP_DIR}/.git" ]]; then
  log "APP_DIR does not look like a git repository: ${APP_DIR}"
  exit 1
fi

mkdir -p "${DEPLOY_WORKDIR}"
mkdir -p "${PUBLISH_DIR}"

cd "${APP_DIR}"
log "Working directory: ${APP_DIR}"
log "Fetching latest branch: ${BRANCH}"
git fetch origin "${BRANCH}"
git checkout "${BRANCH}"
git pull --ff-only origin "${BRANCH}"

log "Installing dependencies"
"${NPM_BIN}" ci

log "Building static export"
"${NPM_BIN}" run export

if [[ ! -d "${APP_DIR}/out" ]]; then
  log "Build output directory not found: ${APP_DIR}/out"
  exit 1
fi

release_dir="$(mktemp -d "${DEPLOY_WORKDIR}/release.XXXXXX")"

cleanup_on_error() {
  local exit_code=$?
  log "Failure during deploy (exit=${exit_code})"
  if [[ -n "${release_dir:-}" && -d "${release_dir}" ]]; then
    rm -rf "${release_dir}" || true
  fi
  exit "${exit_code}"
}
trap cleanup_on_error ERR

log "Preparing release directory: ${release_dir}"
cp -a "${APP_DIR}/out/." "${release_dir}/"

log "Updating publish directory in-place (Docker bind mount safe): ${PUBLISH_DIR}"
if command -v rsync >/dev/null 2>&1; then
  rsync -a --delete "${release_dir}/" "${PUBLISH_DIR}/"
else
  # Fallback if rsync is not installed.
  find "${PUBLISH_DIR}" -mindepth 1 -maxdepth 1 -exec rm -rf -- {} +
  cp -a "${release_dir}/." "${PUBLISH_DIR}/"
fi

log "Cleaning temporary release directory"
rm -rf "${release_dir}"

trap - ERR
log "Deploy completed successfully"
