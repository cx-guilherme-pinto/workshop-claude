#!/usr/bin/env bash
# Teste ponta a ponta do Projeto 2 (skills /task-*) no projeto de treino, de forma nao interativa:
#   /task-intake issues/<ISSUE>.json -> /task-plan --auto -> /task-swarm --auto -> /task-gate --auto -> /memory
# E o run-benchmark.sh so com o Projeto 2 (--scope p2): o mesmo isolamento, a mesma app Agent Memory, uma linha
# em results.csv e o REPORT.md regenerado. Para o dia completo (Projeto 1 + Projeto 2): benchmark/run-benchmark.sh.
#   benchmark/run-projeto2.sh [EX-3] [outras opcoes do run-benchmark.sh, ex.: --dry-run --sem-isolamento]
# Lingua: pt por defeito (a da D-18); BENCH_LINGUA=en usa o projeto de treino e os textos do kit em ingles (D-20).
set -euo pipefail

main() {
  local AQUI; AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  local ISSUE=EX-3
  case "${1:-}" in ""|-*) ;; *) ISSUE=$1; shift ;; esac
  exec bash "$AQUI/run-benchmark.sh" --scope p2 --issue "$ISSUE" "$@"
}

main "$@"
