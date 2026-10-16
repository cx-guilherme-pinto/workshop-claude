#!/usr/bin/env bash
# tools/build-release.sh - constroi a release do kit em dist/<versao>/
#
#   tools/build-release.sh <versao> [--worktree] [--saida <pasta>]
#
#   <versao>     tag a publicar (tem de ser igual a WORKSHOP_VERSION no repos.conf)
#   --worktree   usa a arvore de trabalho atual (inclui alteracoes por commitar; so para testes).
#                Sem esta opcao usa a tag <versao> se existir, senao o HEAD.
#
# Produz:
#   workshop-kit-<versao>.tar.gz / .zip   git archive da arvore, SEM dev/, tools/dev/, benchmark/, tools/record/, slides/, presenter-replay/,
#                                         benchmark/tmp, tools/record/out, dist/
#   setup-mac.sh, setup-windows.ps1, bootstrap-windows.ps1
#                                         com o repos.conf, o SHA-256 do kit, o pricing.json e as mensagens
#                                         injetados no bloco WS-INJETADO
#   SHA256SUMS
# As variaveis de ambiente com o nome de uma chave do repos.conf sobrepoem-na tambem aqui.
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/.." && pwd -P)
VER=${1:-}
[ -n "$VER" ] || { echo "uso: tools/build-release.sh <versao> [--worktree] [--saida <pasta>]" >&2; exit 2; }
shift
WORKTREE=0
OUT_BASE="$ROOT/dist"
while [ $# -gt 0 ]; do
  case "$1" in
    --worktree) WORKTREE=1 ;;
    --saida) OUT_BASE=$2; shift ;;
    *) echo "opcao desconhecida: $1" >&2; exit 2 ;;
  esac
  shift
done

EXCLUIR="dev tools/dev benchmark tools/record slides presenter-replay dist CLAUDE.md docs/HANDOVER.md docs/pt/HANDOVER.md docs/TEST-MACHINE.md docs/pt/TEST-MACHINE.md tools/test-machine.sh tools/pack-for-transfer.sh tools/publish-to-github.sh"  # so ferramentas e conteudo do organizador; o kit do participante fica pequeno
CONF_VER=$(sed -n 's/^WORKSHOP_VERSION=//p' "$ROOT/repos.conf" | tr -d '[:space:]')
[ "${WORKSHOP_VERSION:-$CONF_VER}" = "$VER" ] || { echo "ERRO: WORKSHOP_VERSION=${WORKSHOP_VERSION:-$CONF_VER} no repos.conf, mas pediste $VER" >&2; exit 1; }

command -v node >/dev/null || { echo "ERRO: falta o node" >&2; exit 1; }
sha() { shasum -a 256 "$1" | awk '{print $1}'; }

WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT
export GIT_INDEX_FILE="$WORK/index"
cd "$ROOT"
if [ "$WORKTREE" = 1 ]; then
  git -c core.safecrlf=false add -A . 2>/dev/null || git add -A .
  ORIGEM="arvore de trabalho"
elif git rev-parse -q --verify "refs/tags/$VER" >/dev/null; then
  git read-tree "refs/tags/$VER"
  ORIGEM="tag $VER"
else
  git read-tree HEAD
  ORIGEM="HEAD $(git rev-parse --short HEAD) (a tag $VER ainda nao existe)"
fi
# shellcheck disable=SC2086
git rm -r -q --cached --ignore-unmatch -- $EXCLUIR >/dev/null
TREE=$(git write-tree)
unset GIT_INDEX_FILE

OUT="$OUT_BASE/$VER"
rm -rf "$OUT"; mkdir -p "$OUT"
NAME="workshop-kit-$VER"
git archive --format=tar.gz --prefix="$NAME/" -o "$OUT/$NAME.tar.gz" "$TREE"
git archive --format=zip --prefix="$NAME/" -o "$OUT/$NAME.zip" "$TREE"

# Arvore extraida: as injecoes leem o repos.conf, o pricing.json e as mensagens da propria release.
mkdir -p "$WORK/kit"
tar -xzf "$OUT/$NAME.tar.gz" -C "$WORK/kit"
KIT="$WORK/kit/$NAME"
for p in $EXCLUIR; do
  [ ! -e "$KIT/$p" ] || { echo "ERRO: $p entrou no arquivo" >&2; exit 1; }
done

SHA_TGZ=$(sha "$OUT/$NAME.tar.gz")
SHA_ZIP=$(sha "$OUT/$NAME.zip")
INJ="$ROOT/installer/lib/inject.mjs"
node "$INJ" mac --raiz "$KIT" --entrada "$KIT/setup/setup-mac.sh" --saida "$OUT/setup-mac.sh" --kit-sha "$SHA_TGZ"
node "$INJ" windows --raiz "$KIT" --entrada "$KIT/setup/setup-windows.ps1" --saida "$OUT/setup-windows.ps1" --kit-sha "$SHA_ZIP"
SHA_SETUP_WIN=$(sha "$OUT/setup-windows.ps1")
node "$INJ" bootstrap --raiz "$KIT" --entrada "$KIT/setup/bootstrap-windows.ps1" --saida "$OUT/bootstrap-windows.ps1" --setup-sha "$SHA_SETUP_WIN"
chmod +x "$OUT/setup-mac.sh"
bash -n "$OUT/setup-mac.sh"
if LC_ALL=C grep -q '[^ -~[:space:]]' "$OUT/setup-windows.ps1" "$OUT/bootstrap-windows.ps1"; then
  echo "ERRO: os .ps1 da release tem bytes nao ASCII" >&2; exit 1
fi

( cd "$OUT" && for f in "$NAME.tar.gz" "$NAME.zip" setup-mac.sh setup-windows.ps1 bootstrap-windows.ps1; do
    printf '%s  %s\n' "$(sha "$f")" "$f"
  done > SHA256SUMS )

echo "Release $VER construida a partir de: $ORIGEM"
echo "Pasta: $OUT"
cat "$OUT/SHA256SUMS"
