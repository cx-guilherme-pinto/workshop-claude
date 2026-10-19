#!/usr/bin/env bash
# tools/deploy-panel.sh - publishes the live panel on Cloudflare (D-30): the API on a Worker with a Durable Object
# (panel/worker/) and the page on Cloudflare Pages (panel/public/ + the shared modules + the replays).
#
#   tools/deploy-panel.sh [--dry-run] [--project <pages project name>] [--yes]
#
# Reads WORKSHOP_CODE, PANEL_URL and PANEL_PAGE_URL from repos.conf (environment variables with the same names win).
# Asks before each step (--yes skips the questions, --dry-run only prints what it would do). Uses the wrangler
# login of this machine. The admin token is never on the command line or in a file: wrangler asks for it
# (`wrangler secret put ADMIN_TOKEN`) and the presenter opens the panel with #admin=<token>.
#
# After the first deploy: put the two addresses it prints in repos.conf (PANEL_URL, PANEL_PAGE_URL), run
# node tools/render.mjs and build the release again, so the laptops send to the panel.
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd -P)
DRY=0
YES=0
PROJECT=${PANEL_PAGES_PROJECT:-workshop-panel}
while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run) DRY=1 ;;
    --yes) YES=1 ;;
    --project) PROJECT=$2; shift ;;
    *) echo "unknown option: $1" >&2; exit 2 ;;
  esac
  shift
done

conf() { # value of a repos.conf key (the environment wins)
  local k=$1 v
  v=$(printenv "$k" || true)
  [ -n "$v" ] || v=$(sed -n "s/^$k=//p" "$ROOT/repos.conf" | head -n 1 | tr -d '[:space:]')
  printf '%s' "$v"
}
CODE=$(conf WORKSHOP_CODE)
API=$(conf PANEL_URL)
PAGE=$(conf PANEL_PAGE_URL)
DOMAIN=$(conf PANEL_EMAIL_DOMAIN)
[ -n "$CODE" ] || { echo "ERROR: WORKSHOP_CODE is empty in repos.conf" >&2; exit 1; }
printf '%s' "$CODE" | grep -Eq '^[A-Za-z0-9_-]{1,40}$' || { echo "ERROR: WORKSHOP_CODE must be 1-40 of A-Z a-z 0-9 _ -" >&2; exit 1; }

run() { # prints the command; runs it unless --dry-run
  printf '  $'; printf ' %q' "$@"; printf '\n'
  [ "$DRY" = 1 ] || "$@"
}
ask() {
  [ "$YES" = 1 ] || [ "$DRY" = 1 ] && return 0
  local a
  printf '%s [y/N] ' "$1"
  read -r a </dev/tty || a=
  case "$a" in y|Y|yes|sim|s) return 0 ;; *) return 1 ;; esac
}

if [ "$DRY" = 0 ]; then
  command -v wrangler >/dev/null || { echo "ERROR: wrangler is not installed (npm i -g wrangler)" >&2; exit 1; }
  wrangler whoami >/dev/null 2>&1 || { echo "ERROR: wrangler is not logged in (wrangler login)" >&2; exit 1; }
fi

echo "Workshop panel: code $CODE · Pages project $PROJECT"

# 1. The Worker (API + Durable Object)
echo
echo "1. Worker (panel/worker): API and Durable Object, workshop code $CODE, allowed origin ${PAGE:-<none yet>}"
if ask "Deploy the Worker?"; then
  out=$(cd "$ROOT/panel/worker" && run wrangler deploy --var "WORKSHOP_CODE:$CODE" --var "ALLOWED_ORIGINS:${PAGE:-}" --var "EMAIL_DOMAIN:${DOMAIN:-}" 2>&1) || { echo "$out"; exit 1; }
  echo "$out"
  url=$(printf '%s\n' "$out" | grep -Eo 'https://[A-Za-z0-9.-]+\.workers\.dev' | head -n 1 || true)
  [ -z "$API" ] && [ -n "$url" ] && API=$url
fi

# 2. The admin token (a secret; wrangler asks for it, nothing is echoed)
echo
echo "2. Admin token of the Worker (ADMIN_TOKEN)"
if [ "$DRY" = 1 ] || ! (cd "$ROOT/panel/worker" && wrangler secret list 2>/dev/null | grep -q '"ADMIN_TOKEN"'); then
  if ask "Set the admin token now (wrangler asks for it)?"; then
    (cd "$ROOT/panel/worker" && run wrangler secret put ADMIN_TOKEN)
  fi
else
  echo "  already set (to change it: cd panel/worker && wrangler secret put ADMIN_TOKEN)"
fi

# 3. The page on Pages: panel/public + aggregate.mjs, schema.mjs, allowlist.json, replays/, config.json, _headers
[ -n "$API" ] || { echo "ERROR: no PANEL_URL yet (deploy the Worker first, or set PANEL_URL in repos.conf)" >&2; exit 1; }
origin=$(printf '%s' "$API" | grep -Eo '^https://[^/]+')
OUT=$(mktemp -d "${TMPDIR:-/tmp}/panel-pages.XXXXXX")
trap 'rm -rf "$OUT"' EXIT
cp -R "$ROOT/panel/public/." "$OUT/"
cp "$ROOT/panel/aggregate.mjs" "$OUT/aggregate.mjs"
cp "$ROOT/telemetry/schema.mjs" "$OUT/schema.mjs"
cp "$ROOT/telemetry/allowlist.json" "$OUT/allowlist.json"
mkdir -p "$OUT/replays"
cp "$ROOT"/panel/replays/*.jsonl "$OUT/replays/" 2>/dev/null || true
printf '{"api":"%s"}\n' "$API" > "$OUT/config.json"
cat > "$OUT/_headers" <<EOF
/*
  Content-Security-Policy: default-src 'none'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' data:; connect-src 'self' $origin; base-uri 'none'; form-action 'none'; frame-ancestors 'self'
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
EOF
echo
echo "3. Page on Cloudflare Pages (project $PROJECT), talking to $API"
if ask "Deploy the page?"; then
  if [ "$DRY" = 1 ] || ! wrangler pages project list 2>/dev/null | grep -q " $PROJECT "; then
    run wrangler pages project create "$PROJECT" --production-branch main
  fi
  run wrangler pages deploy "$OUT" --project-name "$PROJECT" --branch main --commit-dirty=true
fi

echo
echo "Done. In repos.conf: PANEL_URL=$API  PANEL_PAGE_URL=${PAGE:-https://$PROJECT.pages.dev}"
echo "Then: node tools/render.mjs, build the release again, and redeploy the Worker if PANEL_PAGE_URL changed (CORS)."
echo "Presenter: <page>/?room=A#admin=<token> (the token stays in the browser, never in the address sent to the server)."
