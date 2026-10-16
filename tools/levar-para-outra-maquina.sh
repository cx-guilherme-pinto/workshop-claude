#!/usr/bin/env bash
# tools/levar-para-outra-maquina.sh - empacota os dois repositorios (kit e app Memoria) em "git bundles"
# para copiar para outra maquina (AirDrop, pen USB), sem precisar do Gitea. Leva todo o historico,
# as tags e os branches; nao leva alteracoes por commitar.
#
#   bash tools/levar-para-outra-maquina.sh [--memoria-repo <pasta>] [--saida <pasta>]
#
# Na outra maquina (o comando certo aparece no fim):
#   git clone workshop-claude.bundle workshop-claude
#   git clone claude-memory-app.bundle claude-memory-app
# Guia: docs/TESTAR-MAQUINA.md
set -uo pipefail

main() {
  local KIT MEM SAIDA r nome sujo=0
  KIT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
  MEM="$KIT/../claude-memory-app"; SAIDA="$KIT/dist/levar"
  while [ $# -gt 0 ]; do
    case "$1" in
      --memoria-repo) MEM="$2"; shift 2 ;;
      --saida) SAIDA="$2"; shift 2 ;;
      -h|--ajuda|--help) sed -n '2,12p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; return 0 ;;
      *) printf 'Opcao desconhecida: %s\n' "$1" >&2; return 2 ;;
    esac
  done
  mkdir -p "$SAIDA" || return 1
  for r in "$KIT" "$MEM"; do
    [ -d "$r/.git" ] || { printf 'Sem repositorio git em %s (salto)\n' "$r"; continue; }
    nome=$(basename "$(cd "$r" && pwd -P)")
    if [ -n "$(git -C "$r" status --porcelain)" ]; then
      printf 'Aviso: %s tem alteracoes por commitar; o bundle so leva o que esta commitado.\n' "$nome"; sujo=1
    fi
    git -C "$r" bundle create "$SAIDA/$nome.bundle" --all 2>/dev/null || { printf 'Falhou o bundle de %s\n' "$nome" >&2; return 1; }
    git bundle verify "$SAIDA/$nome.bundle" >/dev/null 2>&1 || { printf 'O bundle de %s nao passa no git bundle verify\n' "$nome" >&2; return 1; }
    printf '%s: %s (%s, %s)\n' "$nome" "$SAIDA/$nome.bundle" "$(git -C "$r" describe --tags --always 2>/dev/null)" "$(du -h "$SAIDA/$nome.bundle" | cut -f1 | tr -d ' ')"
  done
  (cd "$SAIDA" && shasum -a 256 ./*.bundle | sed 's#  \./#  #' > SHA256SUMS)
  cat <<EOF

Copia a pasta $SAIDA para a outra maquina. La, numa pasta a tua escolha:
  shasum -a 256 -c SHA256SUMS
  git clone workshop-claude.bundle workshop-claude
  git clone claude-memory-app.bundle claude-memory-app
  cd workshop-claude && bash tools/testar-maquina.sh --ajuda
EOF
  [ "$sujo" = 0 ] || printf '\nCommita primeiro o que falta, se quiseres leva-lo.\n'
}

main "$@"
