#!/usr/bin/env bash
# tools/publish-release.sh - cria a release <versao> e envia dist/<versao>/* para o servidor do repositorio.
#
#   tools/publish-release.sh <versao> [--dry-run] [--verificar-token] [--prerelease] [--notas <ficheiro.md>]
#
#   --dry-run          mostra o que faria (release, ficheiros, tamanhos, SHA-256). Nao le credenciais nem usa a rede.
#   --verificar-token  so confirma, com um GET de leitura, que o token tem acesso a API (nao cria nada).
#
# Antes: tools/build-release.sh <versao>, e a tag <versao> criada e enviada (git tag <versao> && git push origin <versao>).
#
# ---------------------------------------------------------------------------------------------------------
# create_release() e a UNICA funcao com chamadas especificas de um servidor. O ramo e escolhido por
# RELEASE_PROVIDER (repos.conf ou variavel de ambiente):
#
#   gitea   API em GITEA_API_URL (padrao com {host}; ex.: https://<servidor>/api/v1)
#           token: obtido em runtime com "git credential fill" para o servidor do repositorio (o mesmo que o git
#           ja usa, por exemplo no Keychain); nunca e mostrado nem escrito em disco.
#           GET  /repos/{owner}/{name}/releases/tags/{tag}          release existente?
#           POST /repos/{owner}/{name}/releases                      criar (tag_name, name, body, prerelease)
#           GET  /repos/{owner}/{name}/releases/{id}/assets          assets existentes (substituem-se)
#           DELETE /repos/{owner}/{name}/releases/{id}/assets/{aid}
#           POST /repos/{owner}/{name}/releases/{id}/assets?name=F   multipart, campo "attachment"
#           (--verificar-token: GET /user)
#
#   github  API em GITHUB_API_URL, uploads em GITHUB_UPLOADS_URL
#           token: GH_TOKEN ou GITHUB_TOKEN, ou "gh auth token --hostname <servidor do repo>" se o gh tiver login
#           GitHub Enterprise Server: GITHUB_API_URL=https://<servidor>/api/v3 e GITHUB_UPLOADS_URL=https://<servidor>/api/uploads
#           GET  /repos/{owner}/{name}/releases/tags/{tag}
#           POST /repos/{owner}/{name}/releases
#           DELETE /repos/{owner}/{name}/releases/assets/{aid}
#           POST {uploads}/repos/{owner}/{name}/releases/{id}/assets?name=F   (application/octet-stream)
#           (--verificar-token: GET /user)
#
# O token vai sempre ao curl pela configuracao no stdin (curl -K -), nunca pela linha de comandos.
# So para testes/CI: RELEASE_TOKEN (token em vez do git credential fill) e RELEASE_SKIP_TAG_CHECK=1.
# ---------------------------------------------------------------------------------------------------------
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/.." && pwd -P)
VER=${1:-}
[ -n "$VER" ] || { echo "uso: tools/publish-release.sh <versao> [--dry-run] [--verificar-token] [--prerelease] [--notas f]" >&2; exit 2; }
shift
DRY=0; CHECK_TOKEN=0; PRERELEASE=false; NOTAS=""
while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run) DRY=1 ;;
    --verificar-token) CHECK_TOKEN=1 ;;
    --prerelease) PRERELEASE=true ;;
    --notas) NOTAS=$2; shift ;;
    *) echo "opcao desconhecida: $1" >&2; exit 2 ;;
  esac
  shift
done
case "$VER" in *-dev*|*-rc*|*-beta*|*-alpha*) PRERELEASE=true ;; esac

command -v node >/dev/null || { echo "ERRO: falta o node" >&2; exit 1; }
command -v curl >/dev/null || { echo "ERRO: falta o curl" >&2; exit 1; }

# Valores do repos.conf (+ ambiente) e partes do URL do repositorio, pela mesma biblioteca que o render.
while IFS="$(printf '\t')" read -r k v; do printf -v "$k" '%s' "$v"; done < <(node --input-type=module -e '
  const { loadConf, repoParts, expand } = await import(process.argv[1] + "/installer/lib/conf.mjs");
  const c = loadConf({ root: process.argv[1] });
  const p = repoParts(c.WORKSHOP_REPO_URL);
  const out = {
    PROVIDER: c.RELEASE_PROVIDER, REPO_URL: c.WORKSHOP_REPO_URL, HOST: p.host, OWNER: p.owner, NAME: p.name,
    CONF_VER: c.WORKSHOP_VERSION, GITEA_API: expand(c.GITEA_API_URL || "", p),
    GITHUB_API: c.GITHUB_API_URL || "", GITHUB_UPLOADS: c.GITHUB_UPLOADS_URL || "",
    RELEASE_PAGE: expand(c.RELEASE_PAGE_URL || "", { ...p, version: c.WORKSHOP_VERSION }),
  };
  for (const [k, v] of Object.entries(out)) console.log(k + "\t" + String(v ?? "").replace(/[\t\n]/g, " "));
' "$ROOT")

[ "$CONF_VER" = "$VER" ] || { echo "ERRO: WORKSHOP_VERSION=$CONF_VER, mas pediste $VER" >&2; exit 1; }
DIST="$ROOT/dist/$VER"
[ -f "$DIST/SHA256SUMS" ] || { echo "ERRO: falta $DIST (corre tools/build-release.sh $VER)" >&2; exit 1; }
( cd "$DIST" && shasum -a 256 -c SHA256SUMS >/dev/null ) || { echo "ERRO: os ficheiros de $DIST nao conferem com o SHA256SUMS" >&2; exit 1; }
FILES=()
while IFS= read -r f; do FILES+=("$f"); done < <(awk '{print $2}' "$DIST/SHA256SUMS"; echo SHA256SUMS)

BODY="Kit do workshop $VER. Verifica os ficheiros com o SHA256SUMS."
[ -n "$NOTAS" ] && BODY=$(cat "$NOTAS")

get_token() { # escreve o token no stdout (so para ser capturado; nunca mostrado)
  if [ -n "${RELEASE_TOKEN:-}" ]; then printf '%s' "$RELEASE_TOKEN"; return; fi   # so para testes/CI
  case "$PROVIDER" in
    gitea)
      printf 'protocol=https\nhost=%s\n\n' "$HOST" | GIT_TERMINAL_PROMPT=0 git credential fill 2>/dev/null | sed -n 's/^password=//p' | head -n 1 ;;
    github)
      if [ -n "${GH_TOKEN:-}" ]; then printf '%s' "$GH_TOKEN"
      elif [ -n "${GITHUB_TOKEN:-}" ]; then printf '%s' "$GITHUB_TOKEN"
      else gh auth token --hostname "$HOST" 2>/dev/null; fi ;;
  esac
}

# api METODO URL [opcoes extra do curl...] -> corpo em $API_BODY e codigo HTTP em $API_HTTP
# (sem subshell, para as variaveis ficarem visiveis a quem chama).
api() {
  local method=$1 url=$2 out; shift 2
  out=$(mktemp)
  API_BODY=""
  API_HTTP=$(printf 'header = "Authorization: token %s"\n' "$TOKEN" |
    curl -sS -K - -X "$method" -H 'Accept: application/json' -o "$out" -w '%{http_code}' "$@" "$url") || { rm -f "$out"; return 1; }
  API_BODY=$(cat "$out"); rm -f "$out"
}
json_get() { node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const v=JSON.parse(s);const r=(new Function("v","return "+process.argv[1]))(v);if(r!==undefined&&r!==null)console.log(typeof r==="object"?JSON.stringify(r):r)}catch{}})' "$1"; }
json_body() { node -e 'console.log(JSON.stringify({tag_name:process.argv[1],name:process.argv[1],body:process.argv[2],prerelease:process.argv[3]==="true",draft:false}))' "$VER" "$BODY" "$PRERELEASE"; }

# create_release [verificar]  - "verificar" so faz o GET /user de leitura (confirma que o token serve).
create_release() {
  local base id assets aid f
  if [ "${1:-}" = verificar ]; then
    case "$PROVIDER" in gitea) api GET "$GITEA_API/user" || true ;; github) api GET "$GITHUB_API/user" || true ;; esac
    if [ "${API_HTTP:-}" = 200 ]; then echo "Token OK: tem acesso de leitura a API ($PROVIDER)."; return 0; fi
    echo "ERRO: GET /user devolveu HTTP ${API_HTTP:-?}" >&2; return 1
  fi
  case "$PROVIDER" in
    gitea)
      base="$GITEA_API/repos/$OWNER/$NAME"
      api GET "$base/releases/tags/$VER"
      if [ "$API_HTTP" = 200 ]; then id=$(printf '%s' "$API_BODY" | json_get v.id); echo "Release $VER ja existe (id $id): substituo os ficheiros."
      else
        api POST "$base/releases" -H 'Content-Type: application/json' --data-binary "$(json_body)"
        [ "$API_HTTP" = 201 ] || { echo "ERRO: criar a release devolveu HTTP $API_HTTP: $API_BODY" >&2; return 1; }
        id=$(printf '%s' "$API_BODY" | json_get v.id); echo "Release $VER criada (id $id)."
      fi
      api GET "$base/releases/$id/assets"; assets=$API_BODY
      for f in "${FILES[@]}"; do
        aid=$(printf '%s' "$assets" | json_get "(v.find(a=>a.name===$(node -e 'console.log(JSON.stringify(process.argv[1]))' "$f"))||{}).id")
        if [ -n "$aid" ]; then api DELETE "$base/releases/$id/assets/$aid"; fi
        api POST "$base/releases/$id/assets?name=$f" -F "attachment=@$DIST/$f"
        [ "$API_HTTP" = 201 ] || { echo "ERRO: enviar $f devolveu HTTP $API_HTTP" >&2; return 1; }
        echo "  enviado: $f"
      done ;;
    github)
      base="$GITHUB_API/repos/$OWNER/$NAME"
      api GET "$base/releases/tags/$VER" -H 'X-GitHub-Api-Version: 2022-11-28'
      if [ "$API_HTTP" = 200 ]; then id=$(printf '%s' "$API_BODY" | json_get v.id); echo "Release $VER ja existe (id $id): substituo os ficheiros."
      else
        api POST "$base/releases" -H 'Content-Type: application/json' -H 'X-GitHub-Api-Version: 2022-11-28' --data-binary "$(json_body)"
        [ "$API_HTTP" = 201 ] || { echo "ERRO: criar a release devolveu HTTP $API_HTTP: $API_BODY" >&2; return 1; }
        id=$(printf '%s' "$API_BODY" | json_get v.id); echo "Release $VER criada (id $id)."
      fi
      api GET "$base/releases/$id/assets?per_page=100"; assets=$API_BODY
      for f in "${FILES[@]}"; do
        aid=$(printf '%s' "$assets" | json_get "(v.find(a=>a.name===$(node -e 'console.log(JSON.stringify(process.argv[1]))' "$f"))||{}).id")
        if [ -n "$aid" ]; then api DELETE "$base/releases/assets/$aid"; fi
        api POST "$GITHUB_UPLOADS/repos/$OWNER/$NAME/releases/$id/assets?name=$f" -H 'Content-Type: application/octet-stream' --data-binary "@$DIST/$f"
        [ "$API_HTTP" = 201 ] || { echo "ERRO: enviar $f devolveu HTTP $API_HTTP" >&2; return 1; }
        echo "  enviado: $f"
      done ;;
    *) echo "ERRO: RELEASE_PROVIDER desconhecido: $PROVIDER (gitea | github)" >&2; return 1 ;;
  esac
}

echo "Release $VER em $PROVIDER ($HOST/$OWNER/$NAME), prerelease=$PRERELEASE"
if [ "$DRY" = 1 ]; then
  echo "[dry-run] nada e enviado e nenhuma credencial e lida."
  case "$PROVIDER" in
    gitea) echo "[dry-run] API: $GITEA_API/repos/$OWNER/$NAME/releases (token: git credential fill, host $HOST)" ;;
    github) echo "[dry-run] API: $GITHUB_API/repos/$OWNER/$NAME/releases (token: GH_TOKEN/GITHUB_TOKEN/gh auth token)" ;;
  esac
  for f in "${FILES[@]}"; do printf '[dry-run]   %-40s %10s bytes  %s\n' "$f" "$(wc -c < "$DIST/$f" | tr -d ' ')" "$(shasum -a 256 "$DIST/$f" | awk '{print $1}')"; done
  if git -C "$ROOT" rev-parse -q --verify "refs/tags/$VER" >/dev/null; then echo "[dry-run] tag local $VER: existe"; else echo "[dry-run] tag local $VER: FALTA (git tag $VER && git push origin $VER)"; fi
  echo "[dry-run] pagina da release: $RELEASE_PAGE"
  exit 0
fi

[ "${RELEASE_SKIP_TAG_CHECK:-0}" = 1 ] || GIT_TERMINAL_PROMPT=0 git -C "$ROOT" ls-remote --exit-code --tags "$REPO_URL" "refs/tags/$VER" >/dev/null 2>&1 || {
  echo "ERRO: a tag $VER nao existe no servidor. Corre: git tag $VER && git push origin $VER" >&2; exit 1; }
TOKEN=$(get_token)
[ -n "$TOKEN" ] || { echo "ERRO: sem token para $PROVIDER ($HOST)" >&2; exit 1; }
if [ "$CHECK_TOKEN" = 1 ]; then create_release verificar; exit $?; fi
create_release
echo "Feito: $RELEASE_PAGE"
