#!/usr/bin/env bash
# tools/test-machine.sh - full test battery on a machine that has everything (macOS):
# Jira, Confluence, the corporate GitHub and the presenter's Claude account.
# Guide: docs/TEST-MACHINE.md
#
#   bash tools/test-machine.sh [options]
#
#   --jira <KEY>               a Jira test issue (read only): MCP, acli and /task-intake
#   --confluence <ID>          id (digits only) of a Confluence test page (read only)
#   --github-host <host>       corporate GitHub server (default github.com)
#   --github-repo <owner/name> repository where the kit is published: access, release and download
#   --version <tag>            release to check (default WORKSHOP_VERSION from repos.conf)
#   --install                  runs the real setup before the tests (like a participant)
#   --arena                    also runs a full Project 1 session (about US$ 1 and 5 min)
#   --write                    at the end, offers to post 1 test comment on the --jira issue (asks first)
#   --only <phases>            only these phases, e.g. --only 1,3 (1 kit, 2 setup, 3 accounts,
#                              4 Project 2, 5 release, 6 Arena, 7 write)
#   --memory-repo <dir>        clone of the Memória app, to run its tests (default ../claude-memory-app)
#   --out <dir>                where the report goes (default ~/workshop-test/<date>)
#
# Portuguese options still work: --versao, --instalar, --escrever, --so, --memoria-repo, --saida.
# Nothing is written to Jira, Confluence or GitHub, except phase 7 (only with --write and after your yes).
# Tokens never go on the command line or into the report. The Claude calls cost about US$ 0.30
# (US$ 1.30 with --arena), and the cost is in the report.
set -uo pipefail

main() {
  KIT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
  local JIRA="" CONF="" GH_HOST_C="github.com" GH_REPO="" VERSION="" INSTALL=0 ARENA=0 WRITE=0 ONLY="" MEMREPO="" OUTDIR=""
  while [ $# -gt 0 ]; do
    case "$1" in
      --jira) JIRA="$2"; shift 2 ;;
      --confluence) CONF="$2"; shift 2 ;;
      --github-host) GH_HOST_C="$2"; shift 2 ;;
      --github-repo) GH_REPO="$2"; shift 2 ;;
      --version|--versao) VERSION="$2"; shift 2 ;;
      --install|--instalar) INSTALL=1; shift ;;
      --arena) ARENA=1; shift ;;
      --write|--escrever) WRITE=1; shift ;;
      --only|--so) ONLY=",$2,"; shift 2 ;;
      --memory-repo|--memoria-repo) MEMREPO="$2"; shift 2 ;;
      --out|--saida) OUTDIR="$2"; shift 2 ;;
      -h|--help|--ajuda) sed -n '2,27p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; return 0 ;;
      *) printf 'Unknown option: %s (see --help)\n' "$1" >&2; return 2 ;;
    esac
  done
  [ "$(uname -s)" = Darwin ] || { echo "This script is for macOS." >&2; return 2; }
  case "$CONF" in ''|*[!0-9]*) [ -n "$CONF" ] && { echo "--confluence expects the numeric page id." >&2; return 2; } ;; esac
  [ -n "$VERSION" ] || VERSION=$(sed -n 's/^WORKSHOP_VERSION=//p' "$KIT/repos.conf")
  [ -n "$MEMREPO" ] || MEMREPO="$KIT/../claude-memory-app"
  [ -n "$OUTDIR" ] || OUTDIR="$HOME/workshop-test/$(date +%Y%m%d-%H%M%S)"
  OUT="$OUTDIR"; LOGS="$OUT/logs"; mkdir -p "$LOGS" || return 1
  REP="$OUT/report.md"; ROWS="$OUT/.rows"; COSTS="$OUT/.costs"; : > "$ROWS"; : > "$COSTS"
  N_OK=0; N_WARN=0; N_FAIL=0; N_SKIP=0
  PATH="$HOME/.local/bin:$HOME/.workshop-claude/bin:$PATH"
  [ -d "$HOME/.workshop-claude/node/bin" ] && PATH="$HOME/.workshop-claude/node/bin:$PATH"
  export PATH
  NODE=$(command -v node || true)
  if [ -t 1 ]; then C_G=$'\033[32m' C_Y=$'\033[33m' C_R=$'\033[31m' C_D=$'\033[2m' C_B=$'\033[1m' C_0=$'\033[0m'; else C_G="" C_Y="" C_R="" C_D="" C_B="" C_0=""; fi

  printf '%sWorkshop machine test%s · kit %s · report in %s\n' "$C_B" "$C_0" "$VERSION" "$REP"
  phase 1 && p1_kit
  phase 5 && p5_release "$GH_HOST_C" "$GH_REPO" "$VERSION"
  phase 2 && p2_setup "$INSTALL"
  phase 3 && p3_accounts "$GH_HOST_C" "$GH_REPO" "$JIRA" "$CONF"
  phase 4 && p4_project2 "$JIRA"
  phase 6 && { if [ "$ARENA" = 1 ]; then p6_arena; else title 6 "Project 1 (Arena)"; skip "Arena" "only with --arena"; fi; }
  phase 7 && { if [ "$WRITE" = 1 ]; then p7_write "$JIRA"; else title 7 "Write to Jira"; skip "Test comment" "only with --write"; fi; }
  report "$JIRA" "$CONF" "$GH_HOST_C" "$GH_REPO" "$INSTALL" "$ARENA" "$WRITE"
  [ "$N_FAIL" = 0 ]
}

# ---------------------------------------------------------------- helpers
phase() { [ -z "$ONLY" ] || case "$ONLY" in *",$1,"*) return 0 ;; *) return 1 ;; esac; }
title() { PHASE="$1 · $2"; printf '\n%s%s. %s%s\n' "$C_B" "$1" "$2" "$C_0"; }
row() { # status check detail
  local d; d=$(printf '%s' "${3:-}" | tr '\n|' '  ' | cut -c1-300)
  printf '| %s | %s | %s | %s |\n' "$PHASE" "$2" "$1" "$d" >> "$ROWS"
}
ok()   { N_OK=$((N_OK + 1));     row "✅" "$1" "${2:-}"; printf '  %s✅%s %s %s%s%s\n' "$C_G" "$C_0" "$1" "$C_D" "${2:-}" "$C_0"; }
warn() { N_WARN=$((N_WARN + 1)); row "⚠️" "$1" "${2:-}"; printf '  %s⚠️ %s %s %s%s%s\n' "$C_Y" "$C_0" "$1" "$C_D" "${2:-}" "$C_0"; }
fail() { N_FAIL=$((N_FAIL + 1)); row "❌" "$1" "${2:-}"; printf '  %s❌%s %s %s%s%s\n' "$C_R" "$C_0" "$1" "$C_D" "${2:-}" "$C_0"; }
skip() { N_SKIP=$((N_SKIP + 1)); row "⏭️" "$1" "${2:-}"; printf '  ⏭️  %s %s%s%s\n' "$1" "$C_D" "${2:-}" "$C_0"; }
has() { command -v "$1" >/dev/null 2>&1; }
# runs with a time limit (seconds)
tm() { local s=$1; shift; /usr/bin/perl -e 'alarm shift @ARGV; exec @ARGV or exit 127' "$s" "$@"; }
# a field of a JSON file (file, JS expression on j)
jfield() { [ -n "$NODE" ] || return 1; "$NODE" -e 'try{const j=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));const v=(new Function("j","return ("+process.argv[2]+")"))(j);if(v!==undefined&&v!==null)process.stdout.write(typeof v==="string"?v:JSON.stringify(v))}catch(e){process.exit(1)}' "$1" "$2"; }
# cost of a "claude -p --output-format json" result (tokens x pricing.json; see D-13)
cost() {
  [ -n "$NODE" ] && [ -s "$1" ] || { printf 'US$ ?'; return; }
  local t; t=$("$NODE" "$KIT/installer/lib/custo.mjs" "$1" "$KIT/pricing.json" 2>/dev/null)
  printf '%s\n' "$t" | awk -F'\t' '$1=="usd" && $2!="" {print $2}' >> "$COSTS"
  printf '%s\n' "$t" | awk -F'\t' '$1=="usd" && $2!="" {v=$2+0; if (v < 0.01) printf "US$ %.4f\n", v; else printf "US$ %.2f\n", v}'
}
# claude -p in a folder, with the JSON result in file $1
claude_p() { # out.json dir prompt [args...]
  local f=$1 d=$2 p=$3; shift 3
  (cd "$d" && tm 900 claude -p "$p" --output-format json "$@" < /dev/null > "$f" 2> "${f%.json}.err")
}
# the gh token only goes through stdin (curl -K -), never on the command line
curl_gh() { # host url [args...]
  local h=$1 u=$2; shift 2
  gh auth token --hostname "$h" 2>/dev/null | awk 'NF {printf "header = \"Authorization: token %s\"\n", $0}' | curl -K - "$@" "$u"
}

# ---------------------------------------------------------------- 1. kit
p1_kit() {
  title 1 "Automated kit tests (no accounts)"
  if [ -z "$NODE" ]; then fail "Node.js" "not found: run the setup first (--install)"; return; fi
  ok "Node.js" "$("$NODE" --version)"
  local args=""; has docker && docker info >/dev/null 2>&1 || args="--sem-docker"
  if tm 1800 bash "$KIT/tools/test-all.sh" $args > "$LOGS/1-test-all.log" 2>&1; then
    ok "tools/test-all.sh" "$(grep -c ' ok$' "$LOGS/1-test-all.log") groups green${args:+ (no Docker: no shellcheck)}"
  else
    fail "tools/test-all.sh" "$(grep -E 'FALHOU|FAILED' "$LOGS/1-test-all.log" | head -3 | tr -s ' ') (see logs/1-test-all.log)"
  fi
  if tm 600 bash "$KIT/setup/test/test-mac.sh" > "$LOGS/1-test-mac.log" 2>&1; then ok "setup/test/test-mac.sh" "$(tail -1 "$LOGS/1-test-mac.log")"
  else fail "setup/test/test-mac.sh" "$(tail -1 "$LOGS/1-test-mac.log") (see logs/1-test-mac.log)"; fi
  if [ -f "$MEMREPO/pyproject.toml" ] && has uv; then
    # a fresh clone has no UI build (src/memoria/web_dist is generated, not in git) and no Playwright Chromium
    if [ ! -f "$MEMREPO/src/memoria/web_dist/index.html" ]; then
      if (cd "$MEMREPO/web" && tm 900 npm ci && tm 900 npm run build) > "$LOGS/1-memory-ui.log" 2>&1 &&
         rm -rf "$MEMREPO/src/memoria/web_dist" && cp -R "$MEMREPO/web/dist" "$MEMREPO/src/memoria/web_dist"; then
        ok "Memória app (UI build)" "web/dist copied to src/memoria/web_dist"
      else fail "Memória app (UI build)" "see logs/1-memory-ui.log"; fi
    fi
    (cd "$MEMREPO" && tm 900 uv run playwright install chromium) > "$LOGS/1-memory-playwright.log" 2>&1 ||
      warn "Memória app (Playwright Chromium)" "not installed: the browser tests will fail (see logs/1-memory-playwright.log)"
    if (cd "$MEMREPO" && tm 1200 uv run pytest -q) > "$LOGS/1-memory-pytest.log" 2>&1; then ok "Memória app (pytest)" "$(tail -1 "$LOGS/1-memory-pytest.log")"
    else fail "Memória app (pytest)" "$(tail -1 "$LOGS/1-memory-pytest.log") (see logs/1-memory-pytest.log)"; fi
  else
    skip "Memória app (pytest)" "no clone at $MEMREPO, or no uv"
  fi
}

# ---------------------------------------------------------------- 5. release on the corporate GitHub
p5_release() { # host repo version
  local h=$1 r=$2 v=$3 d="$OUT/release" f missing="" code
  title 5 "Release on the corporate GitHub"
  [ -n "$r" ] || { skip "Release" "no --github-repo"; return; }
  has gh || { fail "gh" "not found"; return; }
  if ! GH_HOST=$h tm 120 gh release view "$v" -R "$h/$r" --json tagName,isPrerelease,assets > "$LOGS/5-release.json" 2> "$LOGS/5-release.err"; then
    fail "Release $v on $h/$r" "$(head -1 "$LOGS/5-release.err")"; return
  fi
  for f in setup-mac.sh setup-windows.ps1 bootstrap-windows.ps1 "workshop-kit-$v.tar.gz" "workshop-kit-$v.zip" SHA256SUMS; do
    grep -q "\"name\":\"$f\"" "$LOGS/5-release.json" || missing="$missing $f"
  done
  if [ -z "$missing" ]; then ok "Release $v" "$h/$r, 6 files"; else fail "Release $v" "missing:$missing"; fi
  rm -rf "$d"; mkdir -p "$d"
  if GH_HOST=$h tm 600 gh release download "$v" -R "$h/$r" -D "$d" > "$LOGS/5-download.log" 2>&1 &&
     (cd "$d" && shasum -a 256 -c SHA256SUMS) >> "$LOGS/5-download.log" 2>&1; then
    ok "Download with gh and SHA-256" "every file matches"
    SETUP_RELEASE="$d/setup-mac.sh"
  else
    fail "Download with gh and SHA-256" "see logs/5-download.log"; return
  fi
  local repo_url pat url
  repo_url=$(sed -n 's/^WORKSHOP_REPO_URL=//p' "$d/setup-mac.sh" | head -1)
  case "$repo_url" in *"$h/$r"*) ok "repos.conf inside the release" "$repo_url" ;; *) fail "repos.conf inside the release" "points to $repo_url: run tools/switch-repos.sh before the build (docs/PUBLISHING.md)" ;; esac
  # what a participant does: curl the setup-mac.sh, without logging in
  pat=$(sed -n 's/^RELEASE_DOWNLOAD_URL=//p' "$d/setup-mac.sh" | head -1)
  url=$(printf '%s' "$pat" | sed "s#{repo}#${repo_url%.git}#; s#{version}#$v#; s#{file}#setup-mac.sh#")
  code=$(curl -sSL -o /dev/null -w '%{http_code}' "$url" 2>>"$LOGS/5-url.log")
  if [ "$code" = 200 ]; then ok "One-line install without login" "$url -> HTTP 200"
  else
    warn "One-line install without login" "$url -> HTTP $code: private or internal repository; participants cannot download the setup without logging in"
    code=$(curl_gh "$h" "$url" -sSL -o /dev/null -w '%{http_code}' 2>>"$LOGS/5-url.log")
    if [ "$code" = 200 ]; then warn "Same URL with the gh token" "HTTP 200: works with REPO_TOKEN (docs/INSTALL.md)"
    else warn "Same URL with the gh token" "HTTP $code: this URL does not take the token; the distribution has to change (bring this report)"; fi
  fi
  local mem_url mem_v
  mem_url=$(sed -n 's/^MEMORY_APP_REPO_URL=//p' "$d/setup-mac.sh" | head -1); mem_v=$(sed -n 's/^MEMORY_APP_VERSION=//p' "$d/setup-mac.sh" | head -1)
  case "$mem_url" in
    *"$h/"*) local mr=${mem_url#*"$h/"}; mr=${mr%.git}
      if GH_HOST=$h tm 120 gh release view "$mem_v" -R "$h/$mr" --json tagName > /dev/null 2>> "$LOGS/5-release.err"; then ok "Memória app release $mem_v" "$h/$mr"
      else fail "Memória app release $mem_v" "not found on $h/$mr"; fi ;;
    *) warn "Memória app release" "the release points to $mem_url (outside $h)" ;;
  esac
}

# ---------------------------------------------------------------- 2. setup
p2_setup() { # install
  local s
  title 2 "Participant setup"
  if [ -n "${SETUP_RELEASE:-}" ]; then s=$SETUP_RELEASE
  elif [ -f "$HOME/.workshop-claude/setup-mac.sh" ]; then s="$HOME/.workshop-claude/setup-mac.sh"
  else s="$KIT/setup/setup-mac.sh"; fi
  ok "Script used" "$s"
  if [ "$1" = 1 ]; then
    printf '  %sRunning the full setup: answer the questions and the logins that come up.%s\n' "$C_D" "$C_0"
    if bash "$s" 2>&1 | tee "$LOGS/2-install.log"; then ok "Install" "finished (see logs/2-install.log)"
    else fail "Install" "see logs/2-install.log"; fi
  fi
  if tm 900 bash "$s" --check > "$LOGS/2-check.log" 2>&1 < /dev/null; then ok "setup --check" "everything is ready for the workshop"
  else fail "setup --check" "some steps are missing (summary below and logs/2-check.log)"; fi
  [ -f "$HOME/.workshop-claude/resumo.txt" ] && cp "$HOME/.workshop-claude/resumo.txt" "$OUT/setup-summary.txt"
}

# ---------------------------------------------------------------- 3. accounts and integrations (read only)
p3_accounts() { # host repo jira conf
  local h=$1 r=$2 jira=$3 conf=$4 t f c
  title 3 "Accounts and integrations (read only)"
  t=$(mktemp -d "${TMPDIR:-/tmp}/ws-test.XXXXXX")
  # Claude
  if has claude; then
    ok "Claude Code" "$(claude --version 2>/dev/null | head -1)"
    claude auth status > "$LOGS/3-auth.json" 2>/dev/null
    if [ "$(jfield "$LOGS/3-auth.json" 'j.loggedIn')" = true ]; then ok "Claude login" "method $(jfield "$LOGS/3-auth.json" 'j.authMethod || "?"')"
    else fail "Claude login" "not logged in: claude auth login --console"; fi
    f="$LOGS/3-smoke.json"
    if claude_p "$f" "$t" "Reply with just: OK" --model claude-haiku-5-5 --tools "" && grep -q '"result":"OK' "$f"; then ok "Test request (Haiku)" "$(cost "$f")"
    else fail "Test request (Haiku)" "$(head -c 200 "${f%.json}.err" 2>/dev/null)"; fi
  else
    fail "Claude Code" "not found: run the setup"
  fi
  # GitHub
  if has gh; then
    if GH_HOST=$h gh auth status --hostname "$h" > "$LOGS/3-gh.log" 2>&1; then ok "GitHub login ($h)" "$(GH_HOST=$h gh api user --jq .login 2>/dev/null)"
    else fail "GitHub login ($h)" "gh auth login --hostname $h --web"; fi
    if [ "$h" != github.com ]; then
      warn "GitHub server" "the setup only logs in to github.com; participants on $h need: gh auth login --hostname $h --web (bring this report)"
    fi
    if [ -n "$r" ]; then
      if GH_HOST=$h gh repo view "$h/$r" --json nameWithOwner,visibility,viewerPermission > "$LOGS/3-repo.json" 2>&1; then
        c=$(jfield "$LOGS/3-repo.json" 'j.viewerPermission')
        case "$c" in ADMIN|MAINTAIN|WRITE) ok "Repository $r" "visibility $(jfield "$LOGS/3-repo.json" 'j.visibility'), permission $c (you can publish)" ;;
          *) warn "Repository $r" "permission $c: not enough to create releases" ;; esac
      else fail "Repository $r" "$(head -1 "$LOGS/3-repo.json")"; fi
    fi
  else
    fail "gh" "not found: run the setup"
  fi
  # Jira through the MCP (one read call)
  if has claude && claude mcp get atlassian > "$LOGS/3-mcp.log" 2>&1; then
    ok "atlassian MCP registered" ""
    f="$LOGS/3-mcp.json"
    claude_p "$f" "$t" "Call the getAccessibleAtlassianResources tool. Reply with just the number of sites it returns, or just ERROR if it does not exist or fails." \
      --model claude-haiku-5-5 --allowedTools mcp__atlassian__getAccessibleAtlassianResources
    c=$(jfield "$f" 'j.result' | tr -d ' \n')
    case "$c" in [1-9]*) ok "Jira MCP answers" "$c site(s) · $(cost "$f")" ;;
      *) warn "Jira MCP answers" "no answer ($c): open claude, /mcp, atlassian and log in · $(cost "$f")" ;; esac
  else
    fail "atlassian MCP registered" "claude mcp get atlassian failed: run the setup"
  fi
  # Atlassian CLI
  if has acli; then
    ok "Atlassian CLI" "$(acli --version 2>/dev/null | head -1)"
    if acli auth status > "$LOGS/3-acli.log" 2>&1 || acli jira auth status >> "$LOGS/3-acli.log" 2>&1; then
      ok "acli login" ""
      if [ -n "$jira" ]; then
        if tm 120 acli jira workitem view "$jira" --fields summary,status,issuetype,parent,labels --json > "$LOGS/3-acli-view.json" 2> "$LOGS/3-acli-view.err"; then
          c=$(jfield "$LOGS/3-acli-view.json" '(j.fields||j).summary ? "title read, status " + (((j.fields||j).status||{}).name || "?") : ""')
          if [ -n "$c" ]; then ok "acli reads $jira" "$c"; else warn "acli reads $jira" "answered without a title (see logs/3-acli-view.json)"; fi
        else fail "acli reads $jira" "$(head -1 "$LOGS/3-acli-view.err")"; fi
      else skip "acli reads an issue" "no --jira"; fi
      if [ -n "$conf" ]; then
        local fmt sz
        for fmt in storage view; do
          if tm 120 acli confluence page view --id "$conf" --body-format "$fmt" --json > "$LOGS/3-conf-$fmt.json" 2> "$LOGS/3-conf-$fmt.err"; then
            sz=$(wc -c < "$LOGS/3-conf-$fmt.json" | tr -d ' ')
            ok "acli reads page $conf ($fmt)" "$sz bytes (D-19: the intake uses storage)"
          else fail "acli reads page $conf ($fmt)" "$(head -1 "$LOGS/3-conf-$fmt.err")"; fi
        done
      else skip "acli reads Confluence" "no --confluence"; fi
    else
      warn "acli login" "not logged in: acli auth login (if it says \"site admin must authorize\", see E-ACLI-02)"
    fi
  else
    warn "Atlassian CLI" "not found (the Jira fallback): run the setup"
  fi
  # Memória app
  if has memoria; then
    if tm 300 env MEMORIA_LANG=en memoria selftest > "$LOGS/3-memory.log" 2>&1; then ok "Memória app (selftest)" "$(head -1 "$LOGS/3-memory.log")"
    else fail "Memória app (selftest)" "$(grep -v '\[OK\]' "$LOGS/3-memory.log" | grep -m1 '\[')"; fi
  else warn "Memória app" "not found (optional): run the setup"; fi
  if has claude && claude mcp get memoria > /dev/null 2>&1; then ok "memoria MCP registered" ""; else warn "memoria MCP registered" "no"; fi
  rm -rf "$t"
}

# ---------------------------------------------------------------- 4. Project 2 on a real issue (read only)
p4_project2() { # jira
  local jira=$1 mode
  title 4 "Project 2: /task-intake on a real issue (read only)"
  [ -n "$jira" ] || { skip "/task-intake" "no --jira"; return; }
  has claude || { fail "/task-intake" "no Claude Code"; return; }
  [ -f "${CLAUDE_CONFIG_DIR:-$HOME/.claude}/skills/task-intake/SKILL.md" ] || { fail "/task-intake" "skill not installed: run the setup"; return; }
  for mode in mcp acli; do
    local p="$OUT/project2-$mode" f="$LOGS/4-intake-$mode.json"
    rm -rf "$p"; cp -R "$KIT/exemplo-projeto-real" "$p"
    (cd "$p" && git init -q && git add -A && git -c user.name=test -c user.email=test@example.invalid commit -qm initial) > /dev/null 2>&1
    local -a extra=()
    [ "$mode" = acli ] && extra=(--disallowedTools mcp__atlassian__getAccessibleAtlassianResources mcp__atlassian__getJiraIssue mcp__atlassian__searchJiraIssuesUsingJql mcp__atlassian__getConfluenceContent)
    claude_p "$f" "$p" "/task-intake $jira" --permission-mode acceptEdits \
      --allowedTools "Bash(node *)" "Bash(git rev-parse *)" "Bash(git log *)" Read Glob "Write(.workshop/**)" \
        mcp__atlassian__getAccessibleAtlassianResources mcp__atlassian__getJiraIssue mcp__atlassian__searchJiraIssuesUsingJql mcp__atlassian__getConfluenceContent \
        "Bash(acli auth status*)" "Bash(acli jira auth status*)" "Bash(acli jira workitem view *)" "Bash(acli jira workitem search *)" \
        "Bash(acli confluence auth status*)" "Bash(acli confluence page view *)" mcp__memoria__memoria_procurar \
      ${extra[@]+"${extra[@]}"}
    local tj="$p/.workshop/tarefa.json" via id denied
    denied=$(jfield "$f" '(j.permission_denials||[]).map(d=>d.tool_name).join(",")')
    if [ ! -s "$tj" ]; then fail "/task-intake via $mode" "did not write .workshop/tarefa.json (see logs/4-intake-$mode.json)"; continue; fi
    id=$(jfield "$tj" 'j.id'); via=$(jfield "$tj" 'j.via || ""')
    if [ "$(jfield "$tj" 'j.fonte')" = jira ] && [ "$id" = "$jira" ] && [ -n "$(jfield "$tj" 'j.titulo')" ]; then
      if [ "$mode" = acli ] && [ "$via" != acli ]; then warn "/task-intake via acli" "read the issue but via=\"$via\" (expected acli)"
      else ok "/task-intake via $mode" "id $id, via ${via:-?}, epic $(jfield "$tj" 'j.epico || "-"') · $(cost "$f")"; fi
    else fail "/task-intake via $mode" "incomplete tarefa.json (see $tj)"; fi
    [ -z "$denied" ] || warn "Permissions denied ($mode)" "$denied"
    if grep -q '^## Documentação (Confluence)' "$p/.workshop/tarefa.md" 2>/dev/null; then ok "Confluence in tarefa.md ($mode)" "section present"
    else skip "Confluence in tarefa.md ($mode)" "the issue has no page links (or they were not read)"; fi
  done
}

# ---------------------------------------------------------------- 6. Arena
p6_arena() {
  title 6 "Project 1: full Arena session (participant)"
  printf '  %sAbout 5 minutes and US$ 1.%s\n' "$C_D" "$C_0"
  if BENCH_CSV="$OUT/arena.csv" BENCH_REPORT="$OUT/arena.md" tm 2400 bash "$KIT/benchmark/run-benchmark.sh" --n 1 --sem-isolamento > "$LOGS/6-arena.log" 2>&1 && [ -s "$OUT/arena.csv" ]; then
    local l; l=$(tail -1 "$OUT/arena.csv")
    if [ -n "$NODE" ]; then
      l=$("$NODE" -e 'const [h,v]=require("fs").readFileSync(process.argv[1],"utf8").trim().split("\n").filter((x,i,a)=>i===0||i===a.length-1).map(x=>x.split(","));const o=Object.fromEntries(h.map((k,i)=>[k,v[i]]));console.log(Object.entries(o).filter(([k])=>/duracao|custo_total|agentes|verdes|testes_pass|gate/.test(k)).map(([k,x])=>k+"="+x).join(" "))' "$OUT/arena.csv")
    fi
    ok "Arena (1 run)" "$l"
    awk -F, 'NR==1{for(i=1;i<=NF;i++) if($i=="custo_total") c=i} NR>1 && c {print $c}' "$OUT/arena.csv" | tail -1 >> "$COSTS"
  else
    fail "Arena (1 run)" "see logs/6-arena.log"
  fi
}

# ---------------------------------------------------------------- 7. write (only with --write and a yes)
p7_write() { # jira
  local jira=$1 a
  title 7 "Write to Jira (test comment)"
  [ -n "$jira" ] || { skip "Test comment" "no --jira"; return; }
  has acli || { fail "Test comment" "no acli"; return; }
  printf '  ? Post 1 test comment on issue %s with acli? (y/N) ' "$jira" > /dev/tty
  IFS= read -r a < /dev/tty || a=""
  case "$a" in [YySs]*) ;; *) skip "Test comment" "declined"; return ;; esac
  if tm 120 acli jira workitem comment create --key "$jira" --body "Workshop kit test (tools/test-machine.sh, $(date '+%Y-%m-%d %H:%M')). Safe to delete." > "$LOGS/7-comment.log" 2>&1; then
    ok "Test comment on $jira" "posted: delete it in Jira whenever you like"
  else fail "Test comment on $jira" "$(tail -1 "$LOGS/7-comment.log")"; fi
}

# ---------------------------------------------------------------- report
report() { # jira conf host repo install arena write
  local total
  total=$(awk '{s+=$1} END {if (s >= 0.01) printf "%.2f", s; else printf "%.4f", s+0}' "$COSTS")
  {
    printf '# Machine test · %s\n\n' "$(date '+%Y-%m-%d %H:%M')"
    printf -- '- **Machine:** macOS %s, %s\n' "$(sw_vers -productVersion 2>/dev/null)" "$(uname -m)"
    printf -- '- **Kit:** %s (%s)\n' "$VERSION" "$(git -C "$KIT" describe --tags --always --dirty 2>/dev/null || echo 'no git')"
    printf -- '- **Options:** jira=%s confluence=%s github=%s/%s install=%s arena=%s write=%s\n' "${1:--}" "${2:--}" "$3" "${4:--}" "$5" "$6" "$7"
    printf -- '- **Result:** %s ✅ · %s ⚠️ · %s ❌ · %s ⏭️\n' "$N_OK" "$N_WARN" "$N_FAIL" "$N_SKIP"
    printf -- '- **Cost of the Claude calls:** US$ %s (tokens × pricing.json)\n\n' "$total"
    printf '| Phase | Check | Status | Detail |\n|---|---|---|---|\n'
    cat "$ROWS"
    if [ -f "$OUT/setup-summary.txt" ]; then printf '\n## setup --check summary\n\n```\n'; cat "$OUT/setup-summary.txt"; printf '```\n'; fi
    printf '\nLogs in `logs/`. The report has no tokens and none of the issue or page content.\n'
  } > "$REP"
  rm -f "$ROWS" "$COSTS"
  # final redaction of everything in the folder (same rules as the setup)
  if [ -n "$NODE" ]; then
    "$NODE" --input-type=module -e '
      import { redact, literalsFromEnv } from process.argv[1];
      import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
      import { join } from "node:path";
      const lit = literalsFromEnv();
      const walk = (d) => { for (const n of readdirSync(d)) { const p = join(d, n); const s = statSync(p);
        if (s.isDirectory()) { if (!/^project2-|^release$/.test(n)) walk(p); } else if (s.size < 20e6) { const t = readFileSync(p, "utf8"); const r = redact(t, lit); if (r !== t) writeFileSync(p, r); } } };
      walk(process.argv[2]);' "file://$KIT/installer/lib/redact.mjs" "$OUT" 2>/dev/null || true
  fi
  printf '\n%sResult:%s %s ✅ · %s ⚠️ · %s ❌ · %s ⏭️ · cost US$ %s\n' "$C_B" "$C_0" "$N_OK" "$N_WARN" "$N_FAIL" "$N_SKIP" "$total"
  printf 'Report: %s\n' "$REP"
}

main "$@"
