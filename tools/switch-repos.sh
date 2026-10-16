#!/usr/bin/env bash
# tools/switch-repos.sh - muda os repositorios do kit (por exemplo, do Gitea de desenvolvimento para o GitHub)
# editando so o repos.conf, e volta a gerar os ficheiros com URLs (node tools/render.mjs).
#
#   tools/switch-repos.sh --workshop-url <url.git> --memory-url <url.git>
#                         [--raw-pattern <padrao>] [--release-pattern <padrao>] [--provider gitea|github]
#                         [--sem-render]
#
# Exemplo (GitHub):
#   tools/switch-repos.sh --workshop-url https://github.com/dono/workshop-claude.git \
#     --memory-url https://github.com/dono/claude-memory-app.git \
#     --raw-pattern 'https://raw.githubusercontent.com/{owner}/{name}/{version}/{path}' --provider github
# Ver docs/PUBLISHING.md (checklist de 5 passos).
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd -P)
CONF="$ROOT/repos.conf"
W=""; M=""; RAW=""; REL=""; PROV=""; RENDER=1
while [ $# -gt 0 ]; do
  case "$1" in
    --workshop-url) W=$2; shift ;;
    --memory-url) M=$2; shift ;;
    --raw-pattern) RAW=$2; shift ;;
    --release-pattern) REL=$2; shift ;;
    --provider) PROV=$2; shift ;;
    --sem-render) RENDER=0 ;;
    -h|--help) sed -n '2,14p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "opcao desconhecida: $1" >&2; exit 2 ;;
  esac
  shift
done
[ -n "$W$M$RAW$REL$PROV" ] || { echo "nada para mudar (ver --help)" >&2; exit 2; }
for u in "$W" "$M"; do
  [ -z "$u" ] || case "$u" in https://*/*/*) ;; *) echo "ERRO: URL invalido: $u (esperado https://servidor/dono/nome.git)" >&2; exit 2 ;; esac
done
case "$PROV" in ''|gitea|github) ;; *) echo "ERRO: --provider tem de ser gitea ou github" >&2; exit 2 ;; esac
for p in "$RAW" "$REL"; do
  [ -z "$p" ] || case "$p" in *'{version}'*) ;; *) echo "ERRO: o padrao tem de conter {version}: $p" >&2; exit 2 ;; esac
done

# Troca o valor de uma chave, mantendo os comentarios e a ordem (sem eval nem sed com o valor).
set_key() {
  local k=$1 v=$2 tmp
  [ -n "$v" ] || return 0
  grep -q "^$k=" "$CONF" || { echo "ERRO: a chave $k nao existe no repos.conf" >&2; exit 1; }
  tmp=$(mktemp)
  K="$k" V="$v" awk 'BEGIN{k=ENVIRON["K"]; v=ENVIRON["V"]} index($0, k "=") == 1 { print k "=" v; next } { print }' "$CONF" > "$tmp"
  cat "$tmp" > "$CONF"; rm -f "$tmp"
  echo "repos.conf: $k=$v"
}
set_key WORKSHOP_REPO_URL "$W"
set_key MEMORY_APP_REPO_URL "$M"
set_key RAW_BASE_URL "$RAW"
set_key RELEASE_DOWNLOAD_URL "$REL"
set_key RELEASE_PROVIDER "$PROV"

if [ "$RENDER" = 1 ]; then node "$ROOT/tools/render.mjs"; fi
echo "Feito. Proximos passos: docs/PUBLISHING.md (releases, --check e node tools/check-repo.mjs)."
