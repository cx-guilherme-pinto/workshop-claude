#!/usr/bin/env bash
# tools/reset-panel.sh - clears the live panel before the session (the same as the midnight wipe): events, costs,
# missions, names and registrations. ORGANIZER ONLY. Run it ~10 minutes before the presentation; then everyone runs
# workshop-register (their registration is deleted too) and opens Claude in a new session (not claude -c).
#
#   tools/reset-panel.sh [--token-file <file>] [--url <panel url>] [--yes]
#
# The admin token never goes on the command line, on the screen or in a log: it is read from the token file
# (default ~/workshop-panel-admin-token.txt, permissions 600) or asked for without echo, and reaches curl on stdin
# (curl -K -). The panel address comes from repos.conf (PANEL_URL). A Durable Object that still has an old secret
# answers "admin token" for a few minutes after a rotation: the reset is tried again every 20 s, up to 6 minutes.
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd -P)
TOKEN_FILE="$HOME/workshop-panel-admin-token.txt"
URL=""
YES=0
while [ $# -gt 0 ]; do
  case "$1" in
    --token-file) TOKEN_FILE=$2; shift ;;
    --url) URL=$2; shift ;;
    --yes) YES=1 ;;
    -h|--help) sed -n '2,12p' "$0"; exit 0 ;;
    *) echo "unknown option: $1" >&2; exit 2 ;;
  esac
  shift
done
[ -n "$URL" ] || URL=$(sed -n 's/^PANEL_URL=//p' "$ROOT/repos.conf" | head -n 1)
URL=${URL%/}
[ -n "$URL" ] || { echo "ERROR: no PANEL_URL in repos.conf" >&2; exit 1; }

# the token: from the file, or asked for (and, if you want, saved to the file with permissions 600)
T=""
if [ -f "$TOKEN_FILE" ]; then
  T=$(head -n 1 "$TOKEN_FILE" | tr -d '[:space:]')
else
  read -r -s -p "Panel admin token (not shown): " T; echo
  T=$(printf '%s' "$T" | tr -d '[:space:]')
  if [ -n "$T" ]; then
    read -r -p "Save it to $TOKEN_FILE (only you can read it)? [y/N] " a
    case "$a" in y|Y|s|S) (umask 077; printf '%s\n' "$T" > "$TOKEN_FILE"); chmod 600 "$TOKEN_FILE"; echo "Saved." ;; esac
  fi
fi
[ -n "$T" ] || { echo "ERROR: no token" >&2; exit 1; }

state() { curl -fsS --max-time 10 "$URL/state" 2>/dev/null | node -e 'let d="";process.stdin.on("data",(c)=>d+=c).on("end",()=>{try{const s=JSON.parse(d);console.log(`${s.summary.people} people · ${s.events} events · average cost ${s.summary.cost_avg_usd ?? "—"} · view ${s.phase}${s.phase_mode ? ` (${s.phase_mode})` : ""}`)}catch{console.log("?")}})' || echo "?"; }

echo "Panel: $URL"
echo "Now:   $(state)"
if [ "$YES" = 0 ]; then
  read -r -p "Delete everything on the panel (events, costs, missions, names, registrations)? [y/N] " a
  case "$a" in y|Y|s|S) ;; *) echo "Nothing changed."; unset T; exit 0 ;; esac
fi

ok=0
for i in $(seq 1 18); do
  r=$(printf 'header = "X-Admin-Token: %s"\n' "$T" | curl -sS --max-time 15 -K - -X POST -H 'Content-Type: application/json' -d '{}' "$URL/admin/reset" 2>&1 || true)
  case "$r" in
    *'"ok":true'*) ok=1; break ;;
    *'admin token'*) echo "  try $i: the panel does not accept the token yet (an old Durable Object? close every panel page); again in 20 s" ;;
    *) echo "  try $i: no answer from the panel ($(printf '%s' "$r" | head -c 80)); again in 20 s" ;;
  esac
  sleep 20
done
unset T
if [ "$ok" = 1 ]; then
  echo "Reset done. Now: $(state)"
  echo "Next: everyone runs  workshop-register  and opens Claude in a new session (not claude -c)."
else
  echo "ERROR: the reset was not accepted. Check the token (the one in $TOKEN_FILE must be the Worker's ADMIN_TOKEN)." >&2
  exit 1
fi
