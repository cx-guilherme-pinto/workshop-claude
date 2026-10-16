#!/usr/bin/env bash
# tools/testar-maquina.sh - bateria completa de testes numa maquina com tudo (macOS):
# Jira, Confluence, GitHub corporativo e a conta Claude de quem apresenta.
# Guia: docs/TESTAR-MAQUINA.md
#
#   bash tools/testar-maquina.sh [opcoes]
#
#   --jira <CHAVE>             issue de teste do Jira (so leitura): MCP, acli e /task-intake
#   --confluence <ID>          id (so algarismos) de uma pagina de teste do Confluence (so leitura)
#   --github-host <servidor>   servidor do GitHub corporativo (por defeito github.com)
#   --github-repo <dono/nome>  repositorio onde o kit e publicado: acesso, release e download
#   --versao <tag>             release a verificar (por defeito WORKSHOP_VERSION do repos.conf)
#   --instalar                 corre o setup a serio antes dos testes (como um participante)
#   --arena                    corre tambem uma sessao completa do Projeto 1 (cerca de US$ 1 e 5 min)
#   --escrever                 no fim, oferece publicar 1 comentario de teste na issue --jira (pede sim)
#   --so <fases>               so estas fases, por exemplo --so 1,3 (1 kit, 2 setup, 3 contas,
#                              4 Projeto 2, 5 release, 6 Arena, 7 escrita)
#   --memoria-repo <pasta>     clone da app Memoria para correr os testes dela (por defeito ../claude-memory-app)
#   --saida <pasta>            onde fica o relatorio (por defeito ~/workshop-teste/<data>)
#
# Nada escreve no Jira, no Confluence nem no GitHub, exceto a fase 7 (so com --escrever e depois do teu sim).
# Os tokens nunca passam pela linha de comandos nem pelo relatorio. As chamadas ao Claude custam
# cerca de US$ 0,30 (US$ 1,30 com --arena) e o custo fica no relatorio.
set -uo pipefail

main() {
  KIT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
  local JIRA="" CONF="" GH_HOST_C="github.com" GH_REPO="" VERSAO="" INSTALAR=0 ARENA=0 ESCREVER=0 SO="" MEMREPO="" SAIDA=""
  while [ $# -gt 0 ]; do
    case "$1" in
      --jira) JIRA="$2"; shift 2 ;;
      --confluence) CONF="$2"; shift 2 ;;
      --github-host) GH_HOST_C="$2"; shift 2 ;;
      --github-repo) GH_REPO="$2"; shift 2 ;;
      --versao) VERSAO="$2"; shift 2 ;;
      --instalar) INSTALAR=1; shift ;;
      --arena) ARENA=1; shift ;;
      --escrever) ESCREVER=1; shift ;;
      --so) SO=",$2,"; shift 2 ;;
      --memoria-repo) MEMREPO="$2"; shift 2 ;;
      --saida) SAIDA="$2"; shift 2 ;;
      -h|--ajuda|--help) sed -n '2,25p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; return 0 ;;
      *) printf 'Opcao desconhecida: %s (ver --ajuda)\n' "$1" >&2; return 2 ;;
    esac
  done
  [ "$(uname -s)" = Darwin ] || { echo "Este script e para macOS." >&2; return 2; }
  case "$CONF" in ''|*[!0-9]*) [ -n "$CONF" ] && { echo "--confluence espera o id numerico da pagina." >&2; return 2; } ;; esac
  [ -n "$VERSAO" ] || VERSAO=$(sed -n 's/^WORKSHOP_VERSION=//p' "$KIT/repos.conf")
  [ -n "$MEMREPO" ] || MEMREPO="$KIT/../claude-memory-app"
  [ -n "$SAIDA" ] || SAIDA="$HOME/workshop-teste/$(date +%Y%m%d-%H%M%S)"
  OUT="$SAIDA"; LOGS="$OUT/logs"; mkdir -p "$LOGS" || return 1
  REL="$OUT/relatorio.md"; LINHAS="$OUT/.linhas"; CUSTOS="$OUT/.custos"; : > "$LINHAS"; : > "$CUSTOS"
  N_OK=0; N_AV=0; N_FA=0; N_SA=0
  PATH="$HOME/.local/bin:$HOME/.workshop-claude/bin:$PATH"
  [ -d "$HOME/.workshop-claude/node/bin" ] && PATH="$HOME/.workshop-claude/node/bin:$PATH"
  export PATH
  NODE=$(command -v node || true)
  if [ -t 1 ]; then C_V=$'\033[32m' C_A=$'\033[33m' C_F=$'\033[31m' C_D=$'\033[2m' C_B=$'\033[1m' C_0=$'\033[0m'; else C_V="" C_A="" C_F="" C_D="" C_B="" C_0=""; fi

  printf '%sTeste da maquina para o workshop%s · kit %s · relatorio em %s\n' "$C_B" "$C_0" "$VERSAO" "$REL"
  fase 1 && f1_kit
  fase 5 && f5_release "$GH_HOST_C" "$GH_REPO" "$VERSAO"
  fase 2 && f2_setup "$INSTALAR"
  fase 3 && f3_contas "$GH_HOST_C" "$GH_REPO" "$JIRA" "$CONF"
  fase 4 && f4_projeto2 "$JIRA"
  fase 6 && { if [ "$ARENA" = 1 ]; then f6_arena; else titulo 6 "Projeto 1 (Arena)"; salta "Arena" "so com --arena"; fi; }
  fase 7 && { if [ "$ESCREVER" = 1 ]; then f7_escrita "$JIRA"; else titulo 7 "Escrita no Jira"; salta "Comentario de teste" "so com --escrever"; fi; }
  relatorio "$JIRA" "$CONF" "$GH_HOST_C" "$GH_REPO" "$INSTALAR" "$ARENA" "$ESCREVER"
  [ "$N_FA" = 0 ]
}

# ---------------------------------------------------------------- utilitarios
fase() { [ -z "$SO" ] || case "$SO" in *",$1,"*) return 0 ;; *) return 1 ;; esac; }
titulo() { FASE="$1 · $2"; printf '\n%s%s. %s%s\n' "$C_B" "$1" "$2" "$C_0"; }
linha() { # estado verificacao detalhe
  local d; d=$(printf '%s' "${3:-}" | tr '\n|' '  ' | cut -c1-300)
  printf '| %s | %s | %s | %s |\n' "$FASE" "$2" "$1" "$d" >> "$LINHAS"
}
ok()    { N_OK=$((N_OK + 1)); linha "✅" "$1" "${2:-}"; printf '  %s✅%s %s %s%s%s\n' "$C_V" "$C_0" "$1" "$C_D" "${2:-}" "$C_0"; }
aviso() { N_AV=$((N_AV + 1)); linha "⚠️" "$1" "${2:-}"; printf '  %s⚠️ %s %s %s%s%s\n' "$C_A" "$C_0" "$1" "$C_D" "${2:-}" "$C_0"; }
falha() { N_FA=$((N_FA + 1)); linha "❌" "$1" "${2:-}"; printf '  %s❌%s %s %s%s%s\n' "$C_F" "$C_0" "$1" "$C_D" "${2:-}" "$C_0"; }
salta() { N_SA=$((N_SA + 1)); linha "⏭️" "$1" "${2:-}"; printf '  ⏭️  %s %s%s%s\n' "$1" "$C_D" "${2:-}" "$C_0"; }
tem() { command -v "$1" >/dev/null 2>&1; }
# corre com limite de tempo (segundos); a saida vai para o log
tm() { local s=$1; shift; /usr/bin/perl -e 'alarm shift @ARGV; exec @ARGV or exit 127' "$s" "$@"; }
# campo de um JSON (ficheiro, expressao JS sobre j)
jcampo() { [ -n "$NODE" ] || return 1; "$NODE" -e 'try{const j=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));const v=(new Function("j","return ("+process.argv[2]+")"))(j);if(v!==undefined&&v!==null)process.stdout.write(typeof v==="string"?v:JSON.stringify(v))}catch(e){process.exit(1)}' "$1" "$2"; }
# custo de um resultado de "claude -p --output-format json" (tokens x pricing.json; ver D-13)
custo() {
  [ -n "$NODE" ] && [ -s "$1" ] || { printf 'US$ ?'; return; }
  local t; t=$("$NODE" "$KIT/installer/lib/custo.mjs" "$1" "$KIT/pricing.json" 2>/dev/null)
  printf '%s\n' "$t" | awk -F'\t' '$1=="usd" && $2!="" {print $2}' >> "$CUSTOS"
  printf '%s\n' "$t" | awk -F'\t' '$1=="usd_texto" {print $2}'
}
# claude -p numa pasta, com o resultado em JSON no ficheiro $1
claude_p() { # saida.json pasta prompt [args...]
  local f=$1 d=$2 p=$3; shift 3
  (cd "$d" && tm 900 claude -p "$p" --output-format json "$@" < /dev/null > "$f" 2> "${f%.json}.err")
}
# o token do gh so passa por stdin (curl -K -), nunca pela linha de comandos
curl_gh() { # host url [args...]
  local h=$1 u=$2; shift 2
  gh auth token --hostname "$h" 2>/dev/null | awk 'NF {printf "header = \"Authorization: token %s\"\n", $0}' | curl -K - "$@" "$u"
}

# ---------------------------------------------------------------- 1. kit
f1_kit() {
  titulo 1 "Testes automaticos do kit (sem contas)"
  if [ -z "$NODE" ]; then falha "Node.js" "nao encontrado: corre primeiro o setup (--instalar)"; return; fi
  ok "Node.js" "$("$NODE" --version)"
  local args=""; tem docker && docker info >/dev/null 2>&1 || args="--sem-docker"
  if tm 1800 bash "$KIT/tools/test-all.sh" $args > "$LOGS/1-test-all.log" 2>&1; then
    ok "tools/test-all.sh" "$(grep -c ' ok$' "$LOGS/1-test-all.log") grupos verdes${args:+ (sem Docker: sem shellcheck)}"
  else
    falha "tools/test-all.sh" "$(grep -E 'FALHOU' "$LOGS/1-test-all.log" | head -3 | tr -s ' ') (ver logs/1-test-all.log)"
  fi
  if tm 600 bash "$KIT/setup/test/test-mac.sh" > "$LOGS/1-test-mac.log" 2>&1; then ok "setup/test/test-mac.sh" "$(tail -1 "$LOGS/1-test-mac.log")"
  else falha "setup/test/test-mac.sh" "$(tail -1 "$LOGS/1-test-mac.log") (ver logs/1-test-mac.log)"; fi
  if [ -f "$MEMREPO/pyproject.toml" ] && tem uv; then
    # num clone acabado de fazer falta a UI (src/memoria/web_dist e gerada, nao vai no git) e o Chromium do Playwright
    if [ ! -f "$MEMREPO/src/memoria/web_dist/index.html" ]; then
      if (cd "$MEMREPO/web" && tm 900 npm ci && tm 900 npm run build) > "$LOGS/1-memoria-ui.log" 2>&1 &&
         rm -rf "$MEMREPO/src/memoria/web_dist" && cp -R "$MEMREPO/web/dist" "$MEMREPO/src/memoria/web_dist"; then
        ok "App Memoria (build da UI)" "web/dist copiado para src/memoria/web_dist"
      else falha "App Memoria (build da UI)" "ver logs/1-memoria-ui.log"; fi
    fi
    (cd "$MEMREPO" && tm 900 uv run playwright install chromium) > "$LOGS/1-memoria-playwright.log" 2>&1 ||
      aviso "App Memoria (Chromium do Playwright)" "nao instalou: os testes de browser vao falhar (ver logs/1-memoria-playwright.log)"
    if (cd "$MEMREPO" && tm 1200 uv run pytest -q) > "$LOGS/1-memoria-pytest.log" 2>&1; then ok "App Memoria (pytest)" "$(tail -1 "$LOGS/1-memoria-pytest.log")"
    else falha "App Memoria (pytest)" "$(tail -1 "$LOGS/1-memoria-pytest.log") (ver logs/1-memoria-pytest.log)"; fi
  else
    salta "App Memoria (pytest)" "sem o clone em $MEMREPO ou sem uv"
  fi
}

# ---------------------------------------------------------------- 5. release no GitHub corporativo
f5_release() { # host repo versao
  local h=$1 r=$2 v=$3 d="$OUT/release" f falta="" code
  titulo 5 "Release no GitHub corporativo"
  [ -n "$r" ] || { salta "Release" "sem --github-repo"; return; }
  tem gh || { falha "gh" "nao encontrado"; return; }
  if ! GH_HOST=$h tm 120 gh release view "$v" -R "$h/$r" --json tagName,isPrerelease,assets > "$LOGS/5-release.json" 2> "$LOGS/5-release.err"; then
    falha "Release $v em $h/$r" "$(head -1 "$LOGS/5-release.err")"; return
  fi
  for f in setup-mac.sh setup-windows.ps1 bootstrap-windows.ps1 "workshop-kit-$v.tar.gz" "workshop-kit-$v.zip" SHA256SUMS; do
    grep -q "\"name\":\"$f\"" "$LOGS/5-release.json" || falta="$falta $f"
  done
  if [ -z "$falta" ]; then ok "Release $v" "$h/$r, 6 ficheiros"; else falha "Release $v" "faltam:$falta"; fi
  rm -rf "$d"; mkdir -p "$d"
  if GH_HOST=$h tm 600 gh release download "$v" -R "$h/$r" -D "$d" > "$LOGS/5-download.log" 2>&1 &&
     (cd "$d" && shasum -a 256 -c SHA256SUMS) >> "$LOGS/5-download.log" 2>&1; then
    ok "Download com o gh e SHA-256" "todos os ficheiros conferem"
    SETUP_RELEASE="$d/setup-mac.sh"
  else
    falha "Download com o gh e SHA-256" "ver logs/5-download.log"; return
  fi
  local repo_url pad url
  repo_url=$(sed -n 's/^WORKSHOP_REPO_URL=//p' "$d/setup-mac.sh" | head -1)
  case "$repo_url" in *"$h/$r"*) ok "repos.conf da release" "$repo_url" ;; *) falha "repos.conf da release" "aponta para $repo_url: corre tools/switch-repos.sh antes do build (docs/PUBLICAR.md)" ;; esac
  # o que um participante faz: curl do setup-mac.sh, sem login
  pad=$(sed -n 's/^RELEASE_DOWNLOAD_URL=//p' "$d/setup-mac.sh" | head -1)
  url=$(printf '%s' "$pad" | sed "s#{repo}#${repo_url%.git}#; s#{version}#$v#; s#{file}#setup-mac.sh#")
  code=$(curl -sSL -o /dev/null -w '%{http_code}' "$url" 2>>"$LOGS/5-url.log")
  if [ "$code" = 200 ]; then ok "Comando de uma linha sem login" "$url -> HTTP 200"
  else
    aviso "Comando de uma linha sem login" "$url -> HTTP $code: repositorio privado ou interno; os participantes nao conseguem descarregar o setup sem login"
    code=$(curl_gh "$h" "$url" -sSL -o /dev/null -w '%{http_code}' 2>>"$LOGS/5-url.log")
    if [ "$code" = 200 ]; then aviso "O mesmo URL com o token do gh" "HTTP 200: funciona com REPO_TOKEN (docs/INSTALAR.md)"
    else aviso "O mesmo URL com o token do gh" "HTTP $code: este URL nao aceita o token; ha que mudar a distribuicao (traz este relatorio)"; fi
  fi
  local mem_url mem_v
  mem_url=$(sed -n 's/^MEMORY_APP_REPO_URL=//p' "$d/setup-mac.sh" | head -1); mem_v=$(sed -n 's/^MEMORY_APP_VERSION=//p' "$d/setup-mac.sh" | head -1)
  case "$mem_url" in
    *"$h/"*) local mr=${mem_url#*"$h/"}; mr=${mr%.git}
      if GH_HOST=$h tm 120 gh release view "$mem_v" -R "$h/$mr" --json tagName > /dev/null 2>> "$LOGS/5-release.err"; then ok "Release da app Memoria $mem_v" "$h/$mr"
      else falha "Release da app Memoria $mem_v" "nao existe em $h/$mr"; fi ;;
    *) aviso "Release da app Memoria" "a release aponta para $mem_url (fora de $h)" ;;
  esac
}

# ---------------------------------------------------------------- 2. setup
f2_setup() { # instalar
  local s
  titulo 2 "Setup do participante"
  if [ -n "${SETUP_RELEASE:-}" ]; then s=$SETUP_RELEASE
  elif [ -f "$HOME/.workshop-claude/setup-mac.sh" ]; then s="$HOME/.workshop-claude/setup-mac.sh"
  else s="$KIT/setup/setup-mac.sh"; fi
  ok "Script usado" "$s"
  if [ "$1" = 1 ]; then
    printf '  %sA correr o setup completo: responde as perguntas e aos logins que aparecerem.%s\n' "$C_D" "$C_0"
    if bash "$s" 2>&1 | tee "$LOGS/2-instalar.log"; then ok "Instalacao" "terminou (ver logs/2-instalar.log)"
    else falha "Instalacao" "ver logs/2-instalar.log"; fi
  fi
  if tm 900 bash "$s" --check > "$LOGS/2-check.log" 2>&1 < /dev/null; then ok "setup --check" "Esta tudo pronto para o workshop"
  else falha "setup --check" "ha passos em falta (resumo abaixo e logs/2-check.log)"; fi
  [ -f "$HOME/.workshop-claude/resumo.txt" ] && cp "$HOME/.workshop-claude/resumo.txt" "$OUT/resumo-setup.txt"
}

# ---------------------------------------------------------------- 3. contas e integracoes (so leitura)
f3_contas() { # host repo jira conf
  local h=$1 r=$2 jira=$3 conf=$4 t f c
  titulo 3 "Contas e integracoes (so leitura)"
  t=$(mktemp -d "${TMPDIR:-/tmp}/ws-teste.XXXXXX")
  # Claude
  if tem claude; then
    ok "Claude Code" "$(claude --version 2>/dev/null | head -1)"
    claude auth status > "$LOGS/3-auth.json" 2>/dev/null
    if [ "$(jcampo "$LOGS/3-auth.json" 'j.loggedIn')" = true ]; then ok "Login no Claude" "metodo $(jcampo "$LOGS/3-auth.json" 'j.authMethod || "?"')"
    else falha "Login no Claude" "sem login: claude auth login --console"; fi
    f="$LOGS/3-smoke.json"
    if claude_p "$f" "$t" "Responde só: OK" --model claude-haiku-5-5 --tools "" && grep -q '"result":"OK' "$f"; then ok "Pedido de teste (Haiku)" "$(custo "$f")"
    else falha "Pedido de teste (Haiku)" "$(head -c 200 "${f%.json}.err" 2>/dev/null)"; fi
  else
    falha "Claude Code" "nao encontrado: corre o setup"
  fi
  # GitHub
  if tem gh; then
    if GH_HOST=$h gh auth status --hostname "$h" > "$LOGS/3-gh.log" 2>&1; then ok "Login no GitHub ($h)" "$(GH_HOST=$h gh api user --jq .login 2>/dev/null)"
    else falha "Login no GitHub ($h)" "gh auth login --hostname $h --web"; fi
    if [ "$h" != github.com ]; then
      aviso "Servidor do GitHub" "o setup so faz login em github.com; os participantes com $h precisam de: gh auth login --hostname $h --web (traz este relatorio)"
    fi
    if [ -n "$r" ]; then
      if GH_HOST=$h gh repo view "$h/$r" --json nameWithOwner,visibility,viewerPermission > "$LOGS/3-repo.json" 2>&1; then
        c=$(jcampo "$LOGS/3-repo.json" 'j.viewerPermission')
        case "$c" in ADMIN|MAINTAIN|WRITE) ok "Repositorio $r" "visibilidade $(jcampo "$LOGS/3-repo.json" 'j.visibility'), permissao $c (podes publicar)" ;;
          *) aviso "Repositorio $r" "permissao $c: nao chega para criar releases" ;; esac
      else falha "Repositorio $r" "$(head -1 "$LOGS/3-repo.json")"; fi
    fi
  else
    falha "gh" "nao encontrado: corre o setup"
  fi
  # Jira pelo MCP (uma chamada de leitura)
  if tem claude && claude mcp get atlassian > "$LOGS/3-mcp.log" 2>&1; then
    ok "MCP atlassian registado" ""
    f="$LOGS/3-mcp.json"
    claude_p "$f" "$t" "Chama a ferramenta getAccessibleAtlassianResources. Responde só com o número de sites que ela devolver, ou só ERRO se não existir ou falhar." \
      --model claude-haiku-5-5 --allowedTools mcp__atlassian__getAccessibleAtlassianResources
    c=$(jcampo "$f" 'j.result' | tr -d ' \n')
    case "$c" in [1-9]*) ok "MCP do Jira responde" "$c site(s) · $(custo "$f")" ;;
      *) aviso "MCP do Jira responde" "nao respondeu ($c): abre o claude, /mcp, atlassian e faz o login · $(custo "$f")" ;; esac
  else
    falha "MCP atlassian registado" "claude mcp get atlassian falhou: corre o setup"
  fi
  # Atlassian CLI
  if tem acli; then
    ok "Atlassian CLI" "$(acli --version 2>/dev/null | head -1)"
    if acli auth status > "$LOGS/3-acli.log" 2>&1 || acli jira auth status >> "$LOGS/3-acli.log" 2>&1; then
      ok "Login no acli" ""
      if [ -n "$jira" ]; then
        if tm 120 acli jira workitem view "$jira" --fields summary,status,issuetype,parent,labels --json > "$LOGS/3-acli-view.json" 2> "$LOGS/3-acli-view.err"; then
          c=$(jcampo "$LOGS/3-acli-view.json" '(j.fields||j).summary ? "titulo lido, estado " + (((j.fields||j).status||{}).name || "?") : ""')
          if [ -n "$c" ]; then ok "acli lê $jira" "$c"; else aviso "acli lê $jira" "respondeu sem titulo (ver logs/3-acli-view.json)"; fi
        else falha "acli lê $jira" "$(head -1 "$LOGS/3-acli-view.err")"; fi
      else salta "acli lê uma issue" "sem --jira"; fi
      if [ -n "$conf" ]; then
        local fmt sz
        for fmt in storage view; do
          if tm 120 acli confluence page view --id "$conf" --body-format "$fmt" --json > "$LOGS/3-conf-$fmt.json" 2> "$LOGS/3-conf-$fmt.err"; then
            sz=$(wc -c < "$LOGS/3-conf-$fmt.json" | tr -d ' ')
            ok "acli lê a página $conf ($fmt)" "$sz bytes (D-19: o intake usa storage)"
          else falha "acli lê a página $conf ($fmt)" "$(head -1 "$LOGS/3-conf-$fmt.err")"; fi
        done
      else salta "acli lê o Confluence" "sem --confluence"; fi
    else
      aviso "Login no acli" "sem login: acli auth login (se der \"site admin must authorize\", ver E-ACLI-02)"
    fi
  else
    aviso "Atlassian CLI" "nao encontrado (reserva do Jira): corre o setup"
  fi
  # App Memoria
  if tem memoria; then
    if tm 300 memoria selftest > "$LOGS/3-memoria.log" 2>&1; then ok "App Memoria (selftest)" "$(head -1 "$LOGS/3-memoria.log")"
    else falha "App Memoria (selftest)" "$(grep -m1 FALHOU "$LOGS/3-memoria.log")"; fi
  else aviso "App Memoria" "nao encontrada (opcional): corre o setup"; fi
  if tem claude && claude mcp get memoria > /dev/null 2>&1; then ok "MCP memoria registado" ""; else aviso "MCP memoria registado" "nao"; fi
  rm -rf "$t"
}

# ---------------------------------------------------------------- 4. Projeto 2 numa issue real (so leitura)
f4_projeto2() { # jira
  local jira=$1 modo
  titulo 4 "Projeto 2: /task-intake numa issue real (so leitura)"
  [ -n "$jira" ] || { salta "/task-intake" "sem --jira"; return; }
  tem claude || { falha "/task-intake" "sem Claude Code"; return; }
  [ -f "$HOME/.claude/skills/task-intake/SKILL.md" ] || [ -f "${CLAUDE_CONFIG_DIR:-$HOME/.claude}/skills/task-intake/SKILL.md" ] || { falha "/task-intake" "skill nao instalada: corre o setup"; return; }
  for modo in mcp acli; do
    local p="$OUT/projeto2-$modo" f="$LOGS/4-intake-$modo.json"
    rm -rf "$p"; cp -R "$KIT/exemplo-projeto-real" "$p"
    (cd "$p" && git init -q && git add -A && git -c user.name=teste -c user.email=teste@exemplo.invalid commit -qm inicial) > /dev/null 2>&1
    local -a extra=()
    [ "$modo" = acli ] && extra=(--disallowedTools mcp__atlassian__getAccessibleAtlassianResources mcp__atlassian__getJiraIssue mcp__atlassian__searchJiraIssuesUsingJql mcp__atlassian__getConfluenceContent)
    claude_p "$f" "$p" "/task-intake $jira" --permission-mode acceptEdits \
      --allowedTools "Bash(node *)" "Bash(git rev-parse *)" "Bash(git log *)" Read Glob "Write(.workshop/**)" \
        mcp__atlassian__getAccessibleAtlassianResources mcp__atlassian__getJiraIssue mcp__atlassian__searchJiraIssuesUsingJql mcp__atlassian__getConfluenceContent \
        "Bash(acli auth status*)" "Bash(acli jira auth status*)" "Bash(acli jira workitem view *)" "Bash(acli jira workitem search *)" \
        "Bash(acli confluence auth status*)" "Bash(acli confluence page view *)" mcp__memoria__memoria_procurar \
      ${extra[@]+"${extra[@]}"}
    local tj="$p/.workshop/tarefa.json" via id neg
    neg=$(jcampo "$f" '(j.permission_denials||[]).map(d=>d.tool_name).join(",")')
    if [ ! -s "$tj" ]; then falha "/task-intake pelo $modo" "nao escreveu .workshop/tarefa.json (ver logs/4-intake-$modo.json)"; continue; fi
    id=$(jcampo "$tj" 'j.id'); via=$(jcampo "$tj" 'j.via || ""')
    if [ "$(jcampo "$tj" 'j.fonte')" = jira ] && [ "$id" = "$jira" ] && [ -n "$(jcampo "$tj" 'j.titulo')" ]; then
      if [ "$modo" = acli ] && [ "$via" != acli ]; then aviso "/task-intake pelo acli" "leu a issue mas via=\"$via\" (esperado acli)"
      else ok "/task-intake pelo $modo" "id $id, via ${via:-?}, epico $(jcampo "$tj" 'j.epico || "-"') · $(custo "$f")"; fi
    else falha "/task-intake pelo $modo" "tarefa.json incompleto (ver $tj)"; fi
    [ -z "$neg" ] || aviso "Permissoes negadas ($modo)" "$neg"
    if grep -q '^## Documentação (Confluence)' "$p/.workshop/tarefa.md" 2>/dev/null; then ok "Confluence no tarefa.md ($modo)" "secção presente"
    else salta "Confluence no tarefa.md ($modo)" "a issue nao tem links para paginas (ou nao foram lidas)"; fi
  done
}

# ---------------------------------------------------------------- 6. Arena
f6_arena() {
  titulo 6 "Projeto 1: sessao completa da Arena (participante)"
  printf '  %sCerca de 5 minutos e US$ 1.%s\n' "$C_D" "$C_0"
  if BENCH_CSV="$OUT/arena.csv" BENCH_REPORT="$OUT/arena.md" tm 2400 bash "$KIT/benchmark/run-benchmark.sh" --n 1 --sem-isolamento > "$LOGS/6-arena.log" 2>&1 && [ -s "$OUT/arena.csv" ]; then
    local l; l=$(tail -1 "$OUT/arena.csv")
    if [ -n "$NODE" ]; then
      l=$("$NODE" -e 'const [h,v]=require("fs").readFileSync(process.argv[1],"utf8").trim().split("\n").filter((x,i,a)=>i===0||i===a.length-1).map(x=>x.split(","));const o=Object.fromEntries(h.map((k,i)=>[k,v[i]]));console.log(Object.entries(o).filter(([k])=>/sucesso|custo|duracao|testes|agentes/.test(k)).map(([k,x])=>k+"="+x).join(" "))' "$OUT/arena.csv")
    fi
    ok "Arena (1 execucao)" "$l"
    awk -F, 'NR==1{for(i=1;i<=NF;i++) if($i ~ /custo.*usd/ && c=="") c=i} NR>1 && c {print $c}' "$OUT/arena.csv" | tail -1 >> "$CUSTOS"
  else
    falha "Arena (1 execucao)" "ver logs/6-arena.log"
  fi
}

# ---------------------------------------------------------------- 7. escrita (so com --escrever e com sim)
f7_escrita() { # jira
  local jira=$1 a
  titulo 7 "Escrita no Jira (comentario de teste)"
  [ -n "$jira" ] || { salta "Comentario de teste" "sem --jira"; return; }
  tem acli || { falha "Comentario de teste" "sem acli"; return; }
  printf '  ? Publicar 1 comentario de teste na issue %s com o acli? (s/N) ' "$jira" > /dev/tty
  IFS= read -r a < /dev/tty || a=""
  case "$a" in [SsYy]*) ;; *) salta "Comentario de teste" "recusado"; return ;; esac
  if tm 120 acli jira workitem comment create --key "$jira" --body "Teste do kit do workshop (tools/testar-maquina.sh, $(date '+%Y-%m-%d %H:%M')). Pode apagar." > "$LOGS/7-comentario.log" 2>&1; then
    ok "Comentario de teste em $jira" "publicado: apaga-o no Jira quando quiseres"
  else falha "Comentario de teste em $jira" "$(tail -1 "$LOGS/7-comentario.log")"; fi
}

# ---------------------------------------------------------------- relatorio
relatorio() { # jira conf host repo instalar arena escrever
  local total
  total=$(awk '{s+=$1} END {if (s >= 0.01) printf "%.2f", s; else printf "%.4f", s+0}' "$CUSTOS" | sed 's/\./,/')
  {
    printf '# Teste da máquina · %s\n\n' "$(date '+%Y-%m-%d %H:%M')"
    printf -- '- **Máquina:** macOS %s, %s\n' "$(sw_vers -productVersion 2>/dev/null)" "$(uname -m)"
    printf -- '- **Kit:** %s (%s)\n' "$VERSAO" "$(git -C "$KIT" describe --tags --always --dirty 2>/dev/null || echo 'sem git')"
    printf -- '- **Opções:** jira=%s confluence=%s github=%s/%s instalar=%s arena=%s escrever=%s\n' "${1:--}" "${2:--}" "$3" "${4:--}" "$5" "$6" "$7"
    printf -- '- **Resultado:** %s ✅ · %s ⚠️ · %s ❌ · %s ⏭️\n' "$N_OK" "$N_AV" "$N_FA" "$N_SA"
    printf -- '- **Custo das chamadas ao Claude:** US$ %s (tokens × pricing.json)\n\n' "$total"
    printf '| Fase | Verificação | Estado | Detalhe |\n|---|---|---|---|\n'
    cat "$LINHAS"
    if [ -f "$OUT/resumo-setup.txt" ]; then printf '\n## Resumo do setup --check\n\n```\n'; cat "$OUT/resumo-setup.txt"; printf '```\n'; fi
    printf '\nLogs em `logs/`. O relatório não tem tokens nem o conteúdo das issues e páginas.\n'
  } > "$REL"
  rm -f "$LINHAS" "$CUSTOS"
  # redacao final de tudo o que ficou na pasta (mesmas regras do setup)
  if [ -n "$NODE" ]; then
    "$NODE" --input-type=module -e '
      import { redact, literalsFromEnv } from process.argv[1];
      import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
      import { join } from "node:path";
      const lit = literalsFromEnv();
      const anda = (d) => { for (const n of readdirSync(d)) { const p = join(d, n); const s = statSync(p);
        if (s.isDirectory()) { if (!/^projeto2-|^release$/.test(n)) anda(p); } else if (s.size < 20e6) { const t = readFileSync(p, "utf8"); const r = redact(t, lit); if (r !== t) writeFileSync(p, r); } } };
      anda(process.argv[2]);' "file://$KIT/installer/lib/redact.mjs" "$OUT" 2>/dev/null || true
  fi
  printf '\n%sResultado:%s %s ✅ · %s ⚠️ · %s ❌ · %s ⏭️ · custo US$ %s\n' "$C_B" "$C_0" "$N_OK" "$N_AV" "$N_FA" "$N_SA" "$total"
  printf 'Relatorio: %s\n' "$REL"
}

main "$@"
