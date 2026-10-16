#!/usr/bin/env bash
# tools/publish-to-github.sh - moves the kit and the Memória app to the company GitHub:
# creates both repositories, pushes the full history (every branch and tag), switches the URLs
# to the new server, publishes the releases (the app first, then the kit) and checks them with test-machine.
# Run it inside the kit clone, with the Memória app clone next to it. Guide: docs/HANDOVER.md
#
#   bash tools/publish-to-github.sh --owner <org or user> [options]
#
#   --owner <name>            organization or user on the company GitHub (required)
#   --host <host>             default github.com; on GitHub Enterprise Server, its host (e.g. github.example.com)
#   --kit-repo <name>         default workshop-claude
#   --memory-repo-name <name> default claude-memory-app
#   --visibility <v>          private (default), internal or public
#   --kit-version <tag>       default v1.0.0-rc.1
#   --memory-version <tag>    default the one after the app's release.conf (e.g. v0.4.0 -> v0.4.1)
#   --memory-repo <dir>       the app clone (default ../claude-memory-app)
#   --no-memory               leaves the app alone (the kit keeps pointing at its existing release)
#   --no-releases             creates the repos, pushes the history and switches the URLs, without builds or releases
#   --keep-remotes            leaves the clones' remotes alone (e.g. origin already pushes to the old and new servers)
#   --yes                     answers yes to the confirmations
#   --dry-run                 shows the plan and the commands, without changing anything
#
# Portuguese options still work: --dono, --servidor, --repo-kit, --repo-memoria, --visibilidade, --versao-kit,
# --versao-memoria, --memoria-repo, --sem-memoria, --sem-releases, --manter-remotos, --sim.
# It asks before every step that touches GitHub (create, push, publish). It never force-pushes: if a repository
# already has a different history, it stops and explains. Tokens stay in gh (gh auth login) and never go on the
# command line or into the log.
set -uo pipefail

main() {
  KIT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
  OWNER="" HOSTG="github.com" RK="workshop-claude" RM="claude-memory-app" VIS="private" VK="v1.0.0-rc.1" VM="" MEM="" NO_MEM=0 NO_REL=0 YES=0 DRY=0 KEEP=0
  while [ $# -gt 0 ]; do
    case "$1" in
      --owner|--dono) OWNER="$2"; shift 2 ;;
      --host|--servidor) HOSTG="$2"; shift 2 ;;
      --kit-repo|--repo-kit) RK="$2"; shift 2 ;;
      --memory-repo-name|--repo-memoria) RM="$2"; shift 2 ;;
      --visibility|--visibilidade) VIS="$2"; shift 2 ;;
      --kit-version|--versao-kit) VK="$2"; shift 2 ;;
      --memory-version|--versao-memoria) VM="$2"; shift 2 ;;
      --memory-repo|--memoria-repo) MEM="$2"; shift 2 ;;
      --no-memory|--sem-memoria) NO_MEM=1; shift ;;
      --no-releases|--sem-releases) NO_REL=1; shift ;;
      --keep-remotes|--manter-remotos) KEEP=1; shift ;;
      --yes|--sim) YES=1; shift ;;
      --dry-run) DRY=1; shift ;;
      -h|--help|--ajuda) sed -n '2,29p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; return 0 ;;
      *) printf 'Unknown option: %s (see --help)\n' "$1" >&2; return 2 ;;
    esac
  done
  [ -n "$OWNER" ] || { echo "Missing --owner <organization or user>." >&2; return 2; }
  case "$VIS" in private|internal|public) ;; *) echo "--visibility: private, internal or public." >&2; return 2 ;; esac
  case "$VK" in v[0-9]*) ;; *) echo "--kit-version must start with v (e.g. v1.0.0-rc.1)." >&2; return 2 ;; esac
  [ -n "$MEM" ] || MEM="$KIT/../claude-memory-app"
  [ "$NO_MEM" = 1 ] || MEM="$(cd "$MEM" 2>/dev/null && pwd -P)" || { echo "Cannot find the Memória app clone (--memory-repo or --no-memory)." >&2; return 2; }
  # base of the git URLs; WS_PUB_GIT_BASE only for tests (e.g. file:///tmp/remotes)
  GIT_BASE="${WS_PUB_GIT_BASE:-https://$HOSTG}"
  URL_K="$GIT_BASE/$OWNER/$RK.git"; URL_M="$GIT_BASE/$OWNER/$RM.git"
  WEB_K="https://$HOSTG/$OWNER/$RK.git"; WEB_M="https://$HOSTG/$OWNER/$RM.git"
  if [ "$NO_MEM" = 0 ] && [ -z "$VM" ]; then
    local cur; cur=$(sed -n 's/^MEMORY_APP_VERSION=//p' "$MEM/release.conf" | head -1)
    VM=$(printf '%s' "$cur" | awk -F. '{ $NF = $NF + 1; print }' OFS=.)
  fi
  [ "$NO_MEM" = 1 ] && [ -z "$VM" ] && VM=$(sed -n 's/^MEMORY_APP_VERSION=//p' "$KIT/repos.conf" | head -1)
  LOG="$KIT/dist/publish-$(date +%Y%m%d-%H%M%S).log"; mkdir -p "$KIT/dist"; : > "$LOG"
  if [ -t 1 ]; then C_B=$'\033[1m' C_D=$'\033[2m' C_G=$'\033[32m' C_R=$'\033[31m' C_0=$'\033[0m'; else C_B="" C_D="" C_G="" C_R="" C_0=""; fi

  plan
  ask "Go ahead with this plan?" || { echo "Nothing was done."; return 1; }
  step1_check || return 1
  step2_create || return 1
  step3_history || return 1
  if [ "$NO_MEM" = 0 ]; then step4_memory || return 1; fi
  step5_kit || return 1
  step6_verify
  summary
}

# ---------------------------------------------------------------- helpers
say() { printf '%s\n' "$*" | tee -a "$LOG"; }
title() { printf '\n%s%s%s\n' "$C_B" "$*" "$C_0"; printf '\n== %s\n' "$*" >> "$LOG"; }
ok() { local d=""; [ "$DRY" = 1 ] && d=" (dry-run)"; printf '  %s✅%s %s%s\n' "$C_G" "$C_0" "$*" "$d"; printf '  ok: %s%s\n' "$*" "$d" >> "$LOG"; }
err() { printf '  %s❌%s %s\n' "$C_R" "$C_0" "$*" >&2; printf '  ERROR: %s\n' "$*" >> "$LOG"; }
# runs a command (with --dry-run it only shows it); the output goes to the log
run() {
  printf '  %s$ %s%s\n' "$C_D" "$*" "$C_0"; printf '  $ %s\n' "$*" >> "$LOG"
  [ "$DRY" = 1 ] && return 0
  "$@" >> "$LOG" 2>&1
}
ask() {
  [ "$DRY" = 1 ] && { printf '  ? %s (dry-run: yes)\n' "$1"; return 0; }
  [ "$YES" = 1 ] && { printf '  ? %s y (--yes)\n' "$1"; return 0; }
  local a; printf '  ? %s (y/N) ' "$1" > /dev/tty; IFS= read -r a < /dev/tty || a=""
  case "$a" in [YySs]*) return 0 ;; *) return 1 ;; esac
}
ghh() { GH_HOST="$HOSTG" gh "$@"; }
clean() { [ -z "$(git -C "$1" status --porcelain)" ]; }
set_key() { # file key value (replaces KEY=... and keeps the rest of the file)
  local f=$1 k=$2 v=$3 t; t="$f.tmp.$$"
  [ "$DRY" = 1 ] && { printf '  %s(%s: %s=%s)%s\n' "$C_D" "$(basename "$f")" "$k" "$v" "$C_0"; return 0; }
  awk -v k="$k" -v v="$v" 'BEGIN{f=0} index($0, k "=")==1 {print k "=" v; f=1; next} {print} END{if(!f) print k "=" v}' "$f" > "$t" && mv "$t" "$f"
}

plan() {
  title "Plan"
  say "  Server:       $HOSTG (owner: $OWNER, visibility: $VIS)"
  say "  Kit:          $KIT -> $WEB_K, release $VK"
  if [ "$NO_MEM" = 0 ]; then say "  Memória app:  $MEM -> $WEB_M, release $VM"; else say "  Memória app:  left alone (the kit points at $VM)"; fi
  say "  Releases:     $([ "$NO_REL" = 1 ] && echo 'no (--no-releases)' || echo 'yes, the app first and then the kit')"
  say "  Remotes:      $([ "$KEEP" = 1 ] && echo 'kept as they are (--keep-remotes)' || echo 'origin -> the new server (the old one becomes "pacote")')"
  say "  Log:          $LOG"
  [ "$DRY" = 1 ] && say "  Mode:         dry-run (nothing is changed)"
}

# ---------------------------------------------------------------- 1. check
step1_check() {
  title "1. Check tools, login and clones"
  local t missing=""
  for t in git gh node npm; do command -v "$t" >/dev/null 2>&1 || missing="$missing $t"; done
  if [ "$NO_REL" = 0 ] && [ "$NO_MEM" = 0 ]; then command -v uv >/dev/null 2>&1 || missing="$missing uv"; fi
  [ -z "$missing" ] || { err "missing:$missing (run the workshop setup: bash setup/setup-mac.sh)"; return 1; }
  ok "git, gh, node and npm$([ "$NO_MEM" = 0 ] && [ "$NO_REL" = 0 ] && echo ' and uv')"
  if ghh auth status --hostname "$HOSTG" >> "$LOG" 2>&1; then ok "gh is logged in to $HOSTG ($(ghh api user --jq .login 2>/dev/null))"
  else err "gh is not logged in to $HOSTG: gh auth login --hostname $HOSTG --web"; return 1; fi
  if [ -z "${WS_PUB_GIT_BASE:-}" ] && ! git config --get-urlmatch credential.helper "https://$HOSTG" >/dev/null 2>&1; then
    if ask "git does not use the gh login for $HOSTG yet. Set it up now (gh auth setup-git)?"; then
      run env GH_HOST="$HOSTG" gh auth setup-git --hostname "$HOSTG" || { err "gh auth setup-git failed"; return 1; }
    fi
  fi
  clean "$KIT" || { err "the kit has uncommitted changes ($KIT): commit or stash them first"; return 1; }
  ok "kit has no uncommitted changes ($(git -C "$KIT" rev-parse --short HEAD))"
  if [ "$NO_MEM" = 0 ]; then
    clean "$MEM" || { err "the app has uncommitted changes ($MEM)"; return 1; }
    [ -x "$MEM/scripts/mudar-alojamento.sh" ] || { err "missing $MEM/scripts/mudar-alojamento.sh (you need a newer app package)"; return 1; }
    ok "app has no uncommitted changes ($(git -C "$MEM" rev-parse --short HEAD))"
  fi
  if git -C "$KIT" rev-parse -q --verify "refs/tags/$VK" >/dev/null; then err "tag $VK already exists in the kit: pick another with --kit-version"; return 1; fi
  if [ "$NO_MEM" = 0 ] && git -C "$MEM" rev-parse -q --verify "refs/tags/$VM" >/dev/null; then err "tag $VM already exists in the app: pick another with --memory-version"; return 1; fi
  ok "new tags are free: $VK$([ "$NO_MEM" = 0 ] && echo " and $VM")"
}

# ---------------------------------------------------------------- 2. create the repositories
create_repo() { # name description
  if ghh repo view "$OWNER/$1" --json name >> "$LOG" 2>&1; then ok "$OWNER/$1 already exists"; return 0; fi
  run env GH_HOST="$HOSTG" gh repo create "$OWNER/$1" "--$VIS" --description "$2" --disable-wiki || { err "gh repo create $OWNER/$1 failed (see $LOG)"; return 1; }
  ok "created $OWNER/$1 ($VIS)"
}
step2_create() {
  title "2. Create the repositories on $HOSTG"
  ask "Create (if missing) $OWNER/$RK$([ "$NO_MEM" = 0 ] && echo " and $OWNER/$RM") with visibility $VIS?" || { err "cancelled"; return 1; }
  create_repo "$RK" "Workshop kit for Agent Orchestration with Claude: one-command setup, skills, agents, cost hooks and hands-on projects (EN, PT)." || return 1
  if [ "$NO_MEM" = 0 ]; then create_repo "$RM" "Memória: local memory notes for Claude Code, with a graph view and an MCP server (EN, PT, HI, HE)." || return 1; fi
}

# ---------------------------------------------------------------- 3. push the history
push_all() { # dir url
  local d=$1 u=$2 r b
  local -a spec=()
  # every branch: the local ones and the ones that came from the package (origin/*), without the symbolic HEAD
  for r in $(git -C "$d" for-each-ref --format='%(refname)' refs/heads refs/remotes/origin); do
    case "$r" in */HEAD) continue ;; refs/heads/*) b=${r#refs/heads/} ;; *) b=${r#refs/remotes/origin/} ;; esac
    case " ${spec[*]:-} " in *":refs/heads/$b "*) continue ;; esac
    spec+=("$r:refs/heads/$b")
  done
  run git -C "$d" push "$u" "${spec[@]}" || { err "the push to $u failed: if the repository already has a different history, I do not force it (see $LOG)"; return 1; }
  run git -C "$d" push "$u" --tags || { err "pushing the tags to $u failed (see $LOG)"; return 1; }
  # the clone now points at the new server; the package stays as "pacote" (unless --keep-remotes)
  if [ "$KEEP" = 0 ]; then
    if [ "$DRY" = 0 ] && git -C "$d" remote get-url origin >/dev/null 2>&1 && [ "$(git -C "$d" remote get-url origin)" != "$u" ]; then
      git -C "$d" remote get-url pacote >/dev/null 2>&1 || git -C "$d" remote rename origin pacote
    fi
    [ "$DRY" = 1 ] || git -C "$d" remote get-url origin >/dev/null 2>&1 || git -C "$d" remote add origin "$u"
    run git -C "$d" fetch -q origin && run git -C "$d" branch -q -u origin/main main
  fi
  ok "$(basename "$d"): ${#spec[@]} branches and $(git -C "$d" tag | wc -l | tr -d ' ') tags on $u"
}
step3_history() {
  title "3. Push the full history"
  ask "Push every branch and tag to $HOSTG?" || { err "cancelled"; return 1; }
  push_all "$KIT" "$URL_K" || return 1
  if [ "$NO_MEM" = 0 ]; then push_all "$MEM" "$URL_M" || return 1; fi
}

# ---------------------------------------------------------------- 4. Memória app
step4_memory() {
  title "4. Memória app: $HOSTG URLs and release $VM"
  run bash -c "cd \"$MEM\" && scripts/mudar-alojamento.sh --repo-url \"$WEB_M\" --provider github --versao \"$VM\"" || { err "mudar-alojamento.sh failed (see $LOG)"; return 1; }
  if [ ! -f "$MEM/src/memoria/web_dist/index.html" ] || [ "$NO_REL" = 0 ]; then
    run bash -c "cd \"$MEM/web\" && npm ci && npm run build && rm -rf ../src/memoria/web_dist && cp -R dist ../src/memoria/web_dist" || { err "the UI build failed (see $LOG)"; return 1; }
  fi
  run bash -c "cd \"$MEM\" && uv run playwright install chromium && uv run pytest -q" || { err "the app tests failed: nothing was pushed (see $LOG)"; return 1; }
  ok "app tests green"
  run git -C "$MEM" add -A && run git -C "$MEM" commit -q -m "Publish on $HOSTG ($VM)" && run git -C "$MEM" tag -a "$VM" -m "Memória $VM ($HOSTG)" || { err "commit or tag of the app failed"; return 1; }
  ask "Push the app commit and tag $VM to $HOSTG?" || { err "cancelled (the commit stays local)"; return 1; }
  run git -C "$MEM" push -q origin main "$VM" || { err "pushing the app failed"; return 1; }
  ok "app on $WEB_M with tag $VM"
  [ "$NO_REL" = 1 ] && return 0
  run bash -c "cd \"$MEM\" && scripts/build.sh" || { err "the app's scripts/build.sh failed (see $LOG)"; return 1; }
  ask "Publish release $VM of the app on $HOSTG?" || { err "cancelled (the release was not created)"; return 1; }
  run bash -c "cd \"$MEM\" && GH_HOST=\"$HOSTG\" scripts/publish-release.sh" || { err "publishing the app release failed (see $LOG)"; return 1; }
  ok "app release $VM published"
}

# ---------------------------------------------------------------- 5. kit
step5_kit() {
  title "5. Kit: $HOSTG URLs and release $VK"
  local raw="https://$HOSTG/{owner}/{name}/raw/{version}/{path}"
  [ "$HOSTG" = github.com ] && raw='https://raw.githubusercontent.com/{owner}/{name}/{version}/{path}'
  run bash "$KIT/tools/switch-repos.sh" --workshop-url "$WEB_K" --memory-url "$WEB_M" --raw-pattern "$raw" \
    --release-pattern '{repo}/releases/download/{version}/{file}' --provider github --sem-render || { err "switch-repos.sh failed"; return 1; }
  if [ "$HOSTG" = github.com ]; then
    set_key "$KIT/repos.conf" GITHUB_API_URL "https://api.github.com"; set_key "$KIT/repos.conf" GITHUB_UPLOADS_URL "https://uploads.github.com"
  else
    set_key "$KIT/repos.conf" GITHUB_API_URL "https://$HOSTG/api/v3"; set_key "$KIT/repos.conf" GITHUB_UPLOADS_URL "https://$HOSTG/api/uploads"
  fi
  set_key "$KIT/repos.conf" WORKSHOP_VERSION "$VK"
  set_key "$KIT/repos.conf" MEMORY_APP_VERSION "$VM"
  run node "$KIT/tools/render.mjs" || { err "render.mjs failed"; return 1; }
  # a fresh clone has no pptxgenjs (slides/node_modules is not in git)
  if [ ! -d "$KIT/slides/node_modules/pptxgenjs" ]; then run bash -c "cd \"$KIT/slides\" && npm ci" || { err "npm ci in slides/ failed (see $LOG)"; return 1; }; fi
  run node "$KIT/slides/build.mjs" && run node "$KIT/slides/build.mjs" --lingua en || { err "the slides build failed (see $LOG)"; return 1; }
  run node "$KIT/tools/check-repo.mjs" || { err "check-repo failed: the old server still shows up outside repos.conf (see $LOG)"; return 1; }
  run bash "$KIT/setup/test/test-mac.sh" || { err "the setup tests failed: nothing was pushed (see $LOG)"; return 1; }
  ok "repos.conf, docs and slides point to $HOSTG; setup tests green"
  run git -C "$KIT" add -A && run git -C "$KIT" commit -q -m "Publish on $HOSTG ($VK; Memória app $VM)" && run git -C "$KIT" tag -a "$VK" -m "Kit $VK ($HOSTG)" || { err "commit or tag of the kit failed"; return 1; }
  ask "Push the kit commit and tag $VK to $HOSTG?" || { err "cancelled (the commit stays local)"; return 1; }
  run git -C "$KIT" push -q origin main "$VK" || { err "pushing the kit failed"; return 1; }
  ok "kit on $WEB_K with tag $VK"
  [ "$NO_REL" = 1 ] && return 0
  run bash "$KIT/tools/build-release.sh" "$VK" || { err "build-release.sh failed (see $LOG)"; return 1; }
  local pre=""; case "$VK" in *-*) pre="--prerelease" ;; esac
  run bash "$KIT/tools/publish-release.sh" "$VK" --dry-run || { err "publish-release --dry-run failed (see $LOG)"; return 1; }
  ask "Publish release $VK of the kit on $HOSTG${pre:+ (prerelease)}?" || { err "cancelled (the release was not created)"; return 1; }
  run env GH_HOST="$HOSTG" bash "$KIT/tools/publish-release.sh" "$VK" ${pre:+"$pre"} || { err "publishing the kit release failed (see $LOG)"; return 1; }
  ok "kit release $VK published"
}

# ---------------------------------------------------------------- 6. verify
step6_verify() {
  title "6. Check the release (test-machine, phase 5)"
  [ "$NO_REL" = 1 ] && { say "  (no releases: skipped)"; return 0; }
  run bash "$KIT/tools/test-machine.sh" --only 5 --github-host "$HOSTG" --github-repo "$OWNER/$RK" --version "$VK" || say "  There are warnings or failures: read the report in ~/workshop-test/."
}

summary() {
  title "Done"
  say "  Kit:          $WEB_K ($VK)"
  [ "$NO_MEM" = 0 ] && say "  Memória app:  $WEB_M ($VM)"
  say "  Participants (Mac):     curl -fsSL https://$HOSTG/$OWNER/$RK/releases/download/$VK/setup-mac.sh | bash"
  say "  Participants (Windows): irm https://$HOSTG/$OWNER/$RK/releases/download/$VK/bootstrap-windows.ps1 | iex"
  say "  Full test: bash tools/test-machine.sh --jira <KEY> --confluence <ID> --github-host $HOSTG --github-repo $OWNER/$RK"
  say "  Log: $LOG"
}

main "$@"
