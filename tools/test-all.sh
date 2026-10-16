#!/usr/bin/env bash
# Corre todas as verificacoes do kit localmente (as mesmas do CI).
#   tools/test-all.sh [--sem-docker]
set -uo pipefail

main() {
  local KIT; KIT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
  cd "$KIT" || exit 1
  local DOCKER=1; [ "${1:-}" = "--sem-docker" ] && DOCKER=0
  local falhas=0
  corre() {
    local nome="$1"; shift
    printf '%-44s' "$nome"
    if "$@" > /tmp/ws-test-$$.log 2>&1; then echo "ok"; else echo "FALHOU"; tail -20 /tmp/ws-test-$$.log; falhas=$((falhas + 1)); fi
  }
  corre "hooks (preços, transcripts, totais)" node --test "hooks/test/*.test.mjs"
  corre "orquestrador (ondas, tentativas, plano)" node --test "orquestrador/test/*.test.mjs"
  corre "Arena: ficheiros gerados atualizados" node demo-project/tools/gen.mjs --check
  corre "Arena: soluções de referência passam" node tools/dev/check-solutions.mjs
  corre "Arena em inglês: soluções passam" node tools/dev/check-solutions.mjs --lingua en
  corre "sandbox do Projeto 2" bash -c "cd exemplo-projeto-real && node --test"
  if [ -f tools/check-repo.mjs ]; then corre "sem URLs fora do repos.conf, .ps1 em ASCII" node tools/check-repo.mjs; fi
  for t in installer/test tools/test setup/test; do
    if ls "$t"/*.test.mjs >/dev/null 2>&1; then corre "testes de $t" node --test "$t/*.test.mjs"; fi
  done
  if [ "$DOCKER" = 1 ] && command -v docker >/dev/null 2>&1; then
    corre "shellcheck" docker run --rm -v "$KIT:/mnt" -w /mnt koalaman/shellcheck:stable -S warning setup/setup-mac.sh benchmark/run-benchmark.sh tools/record/gravar-apresentador.sh tools/record/sessao.sh tools/record/montar-preview.sh tools/test-all.sh
  fi
  rm -f /tmp/ws-test-$$.log
  echo
  [ "$falhas" -eq 0 ] && echo "Tudo verde." || echo "$falhas verificação(ões) falharam."
  return "$falhas"
}

main "$@"
