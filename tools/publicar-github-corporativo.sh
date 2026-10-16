#!/usr/bin/env bash
# tools/publicar-github-corporativo.sh - leva o kit e a app Memoria para o GitHub da empresa:
# cria os dois repositorios, envia o historico completo (todos os branches e tags), muda os URLs
# para la, publica as releases (primeiro a app, depois o kit) e verifica com o testar-maquina.
# Corre-se dentro do clone do kit, com o clone da app Memoria ao lado. Guia: docs/HANDOVER.md
#
#   bash tools/publicar-github-corporativo.sh --dono <org ou utilizador> [opcoes]
#
#   --dono <nome>             organizacao ou utilizador no GitHub da empresa (obrigatorio)
#   --servidor <host>         por defeito github.com; num GitHub Enterprise Server, o host (ex.: github.empresa.com)
#   --repo-kit <nome>         por defeito workshop-claude
#   --repo-memoria <nome>     por defeito claude-memory-app
#   --visibilidade <v>        private (defeito), internal ou public
#   --versao-kit <tag>        por defeito v1.0.0-rc.1
#   --versao-memoria <tag>    por defeito a seguinte a do release.conf da app (ex.: v0.4.0 -> v0.4.1)
#   --memoria-repo <pasta>    clone da app (por defeito ../claude-memory-app)
#   --sem-memoria             nao mexe na app (o kit continua a apontar para a release dela que ja exista)
#   --sem-releases            cria os repos, envia o historico e muda os URLs, mas nao faz builds nem releases
#   --sim                     responde sim as confirmacoes
#   --dry-run                 mostra o plano e os comandos, sem mudar nada
#
# Antes de cada passo que mexe no GitHub (criar, enviar, publicar) pede confirmacao.
# Nunca faz force-push: se um repositorio ja tiver outro historico, para e explica.
# Os tokens ficam no gh (gh auth login); nunca passam pela linha de comandos nem pelo log.
set -uo pipefail

main() {
  KIT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
  DONO="" HOSTG="github.com" RK="workshop-claude" RM="claude-memory-app" VIS="private" VK="v1.0.0-rc.1" VM="" MEM="" SEM_MEM=0 SEM_REL=0 SIM=0 DRY=0
  while [ $# -gt 0 ]; do
    case "$1" in
      --dono) DONO="$2"; shift 2 ;;
      --servidor) HOSTG="$2"; shift 2 ;;
      --repo-kit) RK="$2"; shift 2 ;;
      --repo-memoria) RM="$2"; shift 2 ;;
      --visibilidade) VIS="$2"; shift 2 ;;
      --versao-kit) VK="$2"; shift 2 ;;
      --versao-memoria) VM="$2"; shift 2 ;;
      --memoria-repo) MEM="$2"; shift 2 ;;
      --sem-memoria) SEM_MEM=1; shift ;;
      --sem-releases) SEM_REL=1; shift ;;
      --sim) SIM=1; shift ;;
      --dry-run) DRY=1; shift ;;
      -h|--ajuda|--help) sed -n '2,25p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; return 0 ;;
      *) printf 'Opcao desconhecida: %s (ver --ajuda)\n' "$1" >&2; return 2 ;;
    esac
  done
  [ -n "$DONO" ] || { echo "Falta --dono <organizacao ou utilizador>." >&2; return 2; }
  case "$VIS" in private|internal|public) ;; *) echo "--visibilidade: private, internal ou public." >&2; return 2 ;; esac
  case "$VK" in v[0-9]*) ;; *) echo "--versao-kit tem de comecar por v (ex.: v1.0.0-rc.1)." >&2; return 2 ;; esac
  [ -n "$MEM" ] || MEM="$KIT/../claude-memory-app"
  [ "$SEM_MEM" = 1 ] || MEM="$(cd "$MEM" 2>/dev/null && pwd -P)" || { echo "Nao encontro o clone da app Memoria (--memoria-repo ou --sem-memoria)." >&2; return 2; }
  # base dos URLs git; WS_PUB_GIT_BASE so para testes (ex.: file:///tmp/remotos)
  GIT_BASE="${WS_PUB_GIT_BASE:-https://$HOSTG}"
  URL_K="$GIT_BASE/$DONO/$RK.git"; URL_M="$GIT_BASE/$DONO/$RM.git"
  WEB_K="https://$HOSTG/$DONO/$RK.git"; WEB_M="https://$HOSTG/$DONO/$RM.git"
  if [ "$SEM_MEM" = 0 ] && [ -z "$VM" ]; then
    local atual; atual=$(sed -n 's/^MEMORY_APP_VERSION=//p' "$MEM/release.conf" | head -1)
    VM=$(printf '%s' "$atual" | awk -F. '{ $NF = $NF + 1; print }' OFS=.)
  fi
  [ "$SEM_MEM" = 1 ] && VM=$(sed -n 's/^MEMORY_APP_VERSION=//p' "$KIT/repos.conf" | head -1)
  LOG="$KIT/dist/publicar-$(date +%Y%m%d-%H%M%S).log"; mkdir -p "$KIT/dist"; : > "$LOG"
  if [ -t 1 ]; then C_B=$'\033[1m' C_D=$'\033[2m' C_V=$'\033[32m' C_F=$'\033[31m' C_0=$'\033[0m'; else C_B="" C_D="" C_V="" C_F="" C_0=""; fi

  plano
  pergunta "Avancar com este plano?" || { echo "Nada foi feito."; return 1; }
  passo1_verificar || return 1
  passo2_criar || return 1
  passo3_historico || return 1
  if [ "$SEM_MEM" = 0 ]; then passo4_memoria || return 1; fi
  passo5_kit || return 1
  passo6_verificar
  resumo
}

# ---------------------------------------------------------------- utilitarios
diz() { printf '%s\n' "$*" | tee -a "$LOG"; }
titulo() { printf '\n%s%s%s\n' "$C_B" "$*" "$C_0"; printf '\n== %s\n' "$*" >> "$LOG"; }
ok() { local d=""; [ "$DRY" = 1 ] && d=" (dry-run)"; printf '  %s✅%s %s%s\n' "$C_V" "$C_0" "$*" "$d"; printf '  ok: %s%s\n' "$*" "$d" >> "$LOG"; }
erro() { printf '  %s❌%s %s\n' "$C_F" "$C_0" "$*" >&2; printf '  ERRO: %s\n' "$*" >> "$LOG"; }
# corre um comando (no --dry-run so o mostra); a saida vai para o log
faz() {
  printf '  %s$ %s%s\n' "$C_D" "$*" "$C_0"; printf '  $ %s\n' "$*" >> "$LOG"
  [ "$DRY" = 1 ] && return 0
  "$@" >> "$LOG" 2>&1
}
pergunta() {
  [ "$DRY" = 1 ] && { printf '  ? %s (dry-run: sim)\n' "$1"; return 0; }
  [ "$SIM" = 1 ] && { printf '  ? %s s (--sim)\n' "$1"; return 0; }
  local a; printf '  ? %s (s/N) ' "$1" > /dev/tty; IFS= read -r a < /dev/tty || a=""
  case "$a" in [SsYy]*) return 0 ;; *) return 1 ;; esac
}
ghh() { GH_HOST="$HOSTG" gh "$@"; }
limpo() { [ -z "$(git -C "$1" status --porcelain)" ]; }
set_key() { # ficheiro chave valor (troca CHAVE=... mantendo o resto do ficheiro)
  local f=$1 k=$2 v=$3 t; t="$f.tmp.$$"
  [ "$DRY" = 1 ] && { printf '  %s(%s: %s=%s)%s\n' "$C_D" "$(basename "$f")" "$k" "$v" "$C_0"; return 0; }
  awk -v k="$k" -v v="$v" 'BEGIN{f=0} index($0, k "=")==1 {print k "=" v; f=1; next} {print} END{if(!f) print k "=" v}' "$f" > "$t" && mv "$t" "$f"
}

plano() {
  titulo "Plano"
  diz "  Servidor:      $HOSTG (dono: $DONO, visibilidade: $VIS)"
  diz "  Kit:           $KIT -> $WEB_K, release $VK"
  if [ "$SEM_MEM" = 0 ]; then diz "  App Memoria:   $MEM -> $WEB_M, release $VM"; else diz "  App Memoria:   nao mexer (o kit aponta para $VM)"; fi
  diz "  Releases:      $([ "$SEM_REL" = 1 ] && echo 'nao (--sem-releases)' || echo 'sim, a app primeiro e depois o kit')"
  diz "  Log:           $LOG"
  [ "$DRY" = 1 ] && diz "  Modo:          dry-run (nada e mudado)"
}

# ---------------------------------------------------------------- 1. verificar
passo1_verificar() {
  titulo "1. Verificar ferramentas, login e clones"
  local t falta=""
  for t in git gh node npm; do command -v "$t" >/dev/null 2>&1 || falta="$falta $t"; done
  if [ "$SEM_REL" = 0 ] && [ "$SEM_MEM" = 0 ]; then command -v uv >/dev/null 2>&1 || falta="$falta uv"; fi
  [ -z "$falta" ] || { erro "faltam:$falta (corre o setup do workshop: bash setup/setup-mac.sh)"; return 1; }
  ok "git, gh, node e npm$([ "$SEM_MEM" = 0 ] && [ "$SEM_REL" = 0 ] && echo ' e uv')"
  if ghh auth status --hostname "$HOSTG" >> "$LOG" 2>&1; then ok "gh com login em $HOSTG ($(ghh api user --jq .login 2>/dev/null))"
  else erro "o gh nao tem login em $HOSTG: gh auth login --hostname $HOSTG --web"; return 1; fi
  if [ -z "${WS_PUB_GIT_BASE:-}" ] && ! git config --get-urlmatch credential.helper "https://$HOSTG" >/dev/null 2>&1; then
    if pergunta "O git ainda nao usa o login do gh em $HOSTG. Configurar agora (gh auth setup-git)?"; then
      faz env GH_HOST="$HOSTG" gh auth setup-git --hostname "$HOSTG" || { erro "gh auth setup-git falhou"; return 1; }
    fi
  fi
  limpo "$KIT" || { erro "o kit tem alteracoes por commitar ($KIT): commita ou guarda-as antes"; return 1; }
  ok "kit sem alteracoes por commitar ($(git -C "$KIT" rev-parse --short HEAD))"
  if [ "$SEM_MEM" = 0 ]; then
    limpo "$MEM" || { erro "a app tem alteracoes por commitar ($MEM)"; return 1; }
    [ -x "$MEM/scripts/mudar-alojamento.sh" ] || { erro "falta $MEM/scripts/mudar-alojamento.sh (precisas de um pacote mais recente da app)"; return 1; }
    ok "app sem alteracoes por commitar ($(git -C "$MEM" rev-parse --short HEAD))"
  fi
  if git -C "$KIT" rev-parse -q --verify "refs/tags/$VK" >/dev/null; then erro "a tag $VK ja existe no kit: escolhe outra com --versao-kit"; return 1; fi
  if [ "$SEM_MEM" = 0 ] && git -C "$MEM" rev-parse -q --verify "refs/tags/$VM" >/dev/null; then erro "a tag $VM ja existe na app: escolhe outra com --versao-memoria"; return 1; fi
  ok "tags novas livres: $VK$([ "$SEM_MEM" = 0 ] && echo " e $VM")"
}

# ---------------------------------------------------------------- 2. criar os repositorios
cria_repo() { # nome descricao
  if ghh repo view "$DONO/$1" --json name >> "$LOG" 2>&1; then ok "$DONO/$1 ja existe"; return 0; fi
  faz env GH_HOST="$HOSTG" gh repo create "$DONO/$1" "--$VIS" --description "$2" --disable-wiki || { erro "gh repo create $DONO/$1 falhou (ver $LOG)"; return 1; }
  ok "criado $DONO/$1 ($VIS)"
}
passo2_criar() {
  titulo "2. Criar os repositorios em $HOSTG"
  pergunta "Criar (se faltarem) $DONO/$RK$([ "$SEM_MEM" = 0 ] && echo " e $DONO/$RM") com visibilidade $VIS?" || { erro "cancelado"; return 1; }
  cria_repo "$RK" "Kit do workshop Orquestracao de Agentes com Claude" || return 1
  if [ "$SEM_MEM" = 0 ]; then cria_repo "$RM" "Memoria: notas locais do Claude Code, com grafo e servidor MCP" || return 1; fi
}

# ---------------------------------------------------------------- 3. enviar o historico
envia_tudo() { # pasta url
  local d=$1 u=$2 r b
  local -a spec=()
  # todos os branches: os locais e os que vieram do pacote (origin/*), sem o HEAD simbolico
  for r in $(git -C "$d" for-each-ref --format='%(refname)' refs/heads refs/remotes/origin); do
    case "$r" in */HEAD) continue ;; refs/heads/*) b=${r#refs/heads/} ;; *) b=${r#refs/remotes/origin/} ;; esac
    case " ${spec[*]:-} " in *":refs/heads/$b "*) continue ;; esac
    spec+=("$r:refs/heads/$b")
  done
  faz git -C "$d" push "$u" "${spec[@]}" || { erro "o push para $u falhou: se o repositorio ja tem outro historico, nao forco (ver $LOG)"; return 1; }
  faz git -C "$d" push "$u" --tags || { erro "o push das tags para $u falhou (ver $LOG)"; return 1; }
  # o clone passa a apontar para o servidor novo; o pacote fica como "pacote"
  if [ "$DRY" = 0 ] && git -C "$d" remote get-url origin >/dev/null 2>&1 && [ "$(git -C "$d" remote get-url origin)" != "$u" ]; then
    git -C "$d" remote get-url pacote >/dev/null 2>&1 || git -C "$d" remote rename origin pacote
  fi
  [ "$DRY" = 1 ] || git -C "$d" remote get-url origin >/dev/null 2>&1 || git -C "$d" remote add origin "$u"
  faz git -C "$d" fetch -q origin && faz git -C "$d" branch -q -u origin/main main
  ok "$(basename "$d"): ${#spec[@]} branches e $(git -C "$d" tag | wc -l | tr -d ' ') tags em $u"
}
passo3_historico() {
  titulo "3. Enviar o historico completo"
  pergunta "Enviar todos os branches e tags para $HOSTG?" || { erro "cancelado"; return 1; }
  envia_tudo "$KIT" "$URL_K" || return 1
  if [ "$SEM_MEM" = 0 ]; then envia_tudo "$MEM" "$URL_M" || return 1; fi
}

# ---------------------------------------------------------------- 4. app Memoria
passo4_memoria() {
  titulo "4. App Memoria: URLs de $HOSTG e release $VM"
  faz bash -c "cd \"$MEM\" && scripts/mudar-alojamento.sh --repo-url \"$WEB_M\" --provider github --versao \"$VM\"" || { erro "mudar-alojamento.sh falhou (ver $LOG)"; return 1; }
  if [ ! -f "$MEM/src/memoria/web_dist/index.html" ] || [ "$SEM_REL" = 0 ]; then
    faz bash -c "cd \"$MEM/web\" && npm ci && npm run build && rm -rf ../src/memoria/web_dist && cp -R dist ../src/memoria/web_dist" || { erro "build da UI falhou (ver $LOG)"; return 1; }
  fi
  faz bash -c "cd \"$MEM\" && uv run playwright install chromium && uv run pytest -q" || { erro "os testes da app falharam: nada foi enviado (ver $LOG)"; return 1; }
  ok "testes da app verdes"
  faz git -C "$MEM" add -A && faz git -C "$MEM" commit -q -m "Publicar em $HOSTG ($VM)" && faz git -C "$MEM" tag -a "$VM" -m "Memoria $VM ($HOSTG)" || { erro "commit ou tag da app falhou"; return 1; }
  pergunta "Enviar o commit e a tag $VM da app para $HOSTG?" || { erro "cancelado (o commit ficou local)"; return 1; }
  faz git -C "$MEM" push -q origin main "$VM" || { erro "push da app falhou"; return 1; }
  ok "app em $WEB_M com a tag $VM"
  [ "$SEM_REL" = 1 ] && return 0
  faz bash -c "cd \"$MEM\" && scripts/build.sh" || { erro "scripts/build.sh da app falhou (ver $LOG)"; return 1; }
  pergunta "Publicar a release $VM da app em $HOSTG?" || { erro "cancelado (a release nao foi criada)"; return 1; }
  faz bash -c "cd \"$MEM\" && GH_HOST=\"$HOSTG\" scripts/publish-release.sh" || { erro "a publicacao da release da app falhou (ver $LOG)"; return 1; }
  ok "release $VM da app publicada"
}

# ---------------------------------------------------------------- 5. kit
passo5_kit() {
  titulo "5. Kit: URLs de $HOSTG e release $VK"
  local raw="https://$HOSTG/{owner}/{name}/raw/{version}/{path}"
  [ "$HOSTG" = github.com ] && raw='https://raw.githubusercontent.com/{owner}/{name}/{version}/{path}'
  faz bash "$KIT/tools/switch-repos.sh" --workshop-url "$WEB_K" --memory-url "$WEB_M" --raw-pattern "$raw" \
    --release-pattern '{repo}/releases/download/{version}/{file}' --provider github --sem-render || { erro "switch-repos.sh falhou"; return 1; }
  if [ "$HOSTG" = github.com ]; then
    set_key "$KIT/repos.conf" GITHUB_API_URL "https://api.github.com"; set_key "$KIT/repos.conf" GITHUB_UPLOADS_URL "https://uploads.github.com"
  else
    set_key "$KIT/repos.conf" GITHUB_API_URL "https://$HOSTG/api/v3"; set_key "$KIT/repos.conf" GITHUB_UPLOADS_URL "https://$HOSTG/api/uploads"
  fi
  set_key "$KIT/repos.conf" WORKSHOP_VERSION "$VK"
  set_key "$KIT/repos.conf" MEMORY_APP_VERSION "$VM"
  faz node "$KIT/tools/render.mjs" || { erro "render.mjs falhou"; return 1; }
  # num clone novo falta o pptxgenjs (slides/node_modules nao vai no git)
  if [ ! -d "$KIT/slides/node_modules/pptxgenjs" ]; then faz bash -c "cd \"$KIT/slides\" && npm ci" || { erro "npm ci em slides/ falhou (ver $LOG)"; return 1; }; fi
  faz node "$KIT/slides/build.mjs" && faz node "$KIT/slides/build.mjs" --lingua en || { erro "o build dos slides falhou (ver $LOG)"; return 1; }
  faz node "$KIT/tools/check-repo.mjs" || { erro "check-repo falhou: ha URLs do servidor antigo fora do repos.conf (ver $LOG)"; return 1; }
  faz bash "$KIT/setup/test/test-mac.sh" || { erro "os testes do setup falharam: nada foi enviado (ver $LOG)"; return 1; }
  ok "repos.conf, docs e slides apontam para $HOSTG; testes do setup verdes"
  faz git -C "$KIT" add -A && faz git -C "$KIT" commit -q -m "Publicar em $HOSTG ($VK; app Memoria $VM)" && faz git -C "$KIT" tag -a "$VK" -m "Kit $VK ($HOSTG)" || { erro "commit ou tag do kit falhou"; return 1; }
  pergunta "Enviar o commit e a tag $VK do kit para $HOSTG?" || { erro "cancelado (o commit ficou local)"; return 1; }
  faz git -C "$KIT" push -q origin main "$VK" || { erro "push do kit falhou"; return 1; }
  ok "kit em $WEB_K com a tag $VK"
  [ "$SEM_REL" = 1 ] && return 0
  faz bash "$KIT/tools/build-release.sh" "$VK" || { erro "build-release.sh falhou (ver $LOG)"; return 1; }
  local pre=""; case "$VK" in *-*) pre="--prerelease" ;; esac
  faz bash "$KIT/tools/publish-release.sh" "$VK" --dry-run || { erro "publish-release --dry-run falhou (ver $LOG)"; return 1; }
  pergunta "Publicar a release $VK do kit em $HOSTG${pre:+ (prerelease)}?" || { erro "cancelado (a release nao foi criada)"; return 1; }
  faz env GH_HOST="$HOSTG" bash "$KIT/tools/publish-release.sh" "$VK" ${pre:+"$pre"} || { erro "a publicacao da release do kit falhou (ver $LOG)"; return 1; }
  ok "release $VK do kit publicada"
}

# ---------------------------------------------------------------- 6. verificar
passo6_verificar() {
  titulo "6. Verificar a release (testar-maquina, fase 5)"
  [ "$SEM_REL" = 1 ] && { diz "  (sem releases: salto)"; return 0; }
  faz bash "$KIT/tools/testar-maquina.sh" --so 5 --github-host "$HOSTG" --github-repo "$DONO/$RK" --versao "$VK" || diz "  Ha avisos ou falhas: le o relatorio em ~/workshop-teste/."
}

resumo() {
  titulo "Feito"
  diz "  Kit:         $WEB_K ($VK)"
  [ "$SEM_MEM" = 0 ] && diz "  App Memoria: $WEB_M ($VM)"
  diz "  Participantes (Mac):     curl -fsSL https://$HOSTG/$DONO/$RK/releases/download/$VK/setup-mac.sh | bash"
  diz "  Participantes (Windows): irm https://$HOSTG/$DONO/$RK/releases/download/$VK/bootstrap-windows.ps1 | iex"
  diz "  O teste completo: bash tools/testar-maquina.sh --jira <CHAVE> --confluence <ID> --github-host $HOSTG --github-repo $DONO/$RK"
  diz "  Log: $LOG"
}

main "$@"
