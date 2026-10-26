#!/usr/bin/env bash
# Corre todas as verificacoes do kit localmente (as mesmas do CI).
#   tools/test-all.sh [--no-docker]     (--sem-docker tambem funciona)
set -uo pipefail

main() {
  local KIT; KIT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
  cd "$KIT" || exit 1
  local DOCKER=1; case "${1:-}" in --no-docker|--sem-docker) DOCKER=0 ;; esac
  local falhas=0
  corre() {
    local nome="$1"; shift
    printf '%-44s' "$nome"
    if "$@" > /tmp/ws-test-$$.log 2>&1; then echo "ok"; else echo "FALHOU"; tail -20 /tmp/ws-test-$$.log; falhas=$((falhas + 1)); fi
  }
  corre "hooks (preços, transcripts, totais)" node --test "hooks/test/*.test.mjs"
  corre "orchestrator (ondas, tentativas, plano)" node --test "orchestrator/test/*.test.mjs"
  corre "Arena: ficheiros gerados atualizados" node demo-project/tools/gen.mjs --check
  corre "Arena: soluções de referência passam" node tools/dev/check-solutions.mjs
  corre "Arena em inglês: soluções passam" node tools/dev/check-solutions.mjs --lingua en
  corre "Canivete: soluções de referência passam" node tools/dev/check-canivete.mjs --lang pt
  corre "Canivete: specs completas (--no-gaps)" node tools/dev/check-canivete.mjs --lang pt --no-gaps
  corre "Canivete em inglês: soluções passam" node tools/dev/check-canivete.mjs --lang en
  corre "Canivete: app, servidor e /status" node tools/dev/check-canivete-app.mjs --lang pt
  corre "Canivete em inglês: app, servidor e /status" node tools/dev/check-canivete-app.mjs --lang en
  corre "projeto de treino do Projeto 2 (pt)" bash -c "cd practice-project && node --test"
  corre "projeto de treino do Projeto 2 (en)" bash -c "cd practice-project/i18n/en && node --test"
  if [ -f tools/check-repo.mjs ]; then corre "sem URLs fora do repos.conf, .ps1 em ASCII" node tools/check-repo.mjs; fi
  for t in installer/test tools/test setup/test; do
    if ls "$t"/*.test.mjs >/dev/null 2>&1; then corre "testes de $t" node --test "$t/*.test.mjs"; fi
  done
  if [ "$DOCKER" = 1 ] && command -v docker >/dev/null 2>&1; then
    corre "shellcheck" docker run --rm -v "$KIT:/mnt" -w /mnt koalaman/shellcheck:stable -S warning setup/setup-mac.sh benchmark/run-benchmark.sh benchmark/run-projeto2.sh tools/record/gravar-apresentador.sh tools/record/sessao.sh tools/record/montar-preview.sh tools/test-all.sh tools/reset-panel.sh
  fi
  rm -f /tmp/ws-test-$$.log
  echo
  [ "$falhas" -eq 0 ] && echo "Tudo verde." || echo "$falhas verificação(ões) falharam."
  return "$falhas"
}

main "$@"
