#!/usr/bin/env bash
# Benchmark de custo e tempo da sessao completa do participante (ou do apresentador),
# de forma nao interativa: /demo-plan -> /demo-swarm -> /demo-review -> /demo-cost.
#
#   benchmark/run-benchmark.sh [--modo participante|apresentador] [--n 10] [--max 8] [--gravar]
#
# Isolamento: se existir no Keychain o servico "workshop-benchmark-oauth" (token criado com
# `claude setup-token`), cada execucao usa um CLAUDE_CONFIG_DIR temporario, como um participante novo.
# Sem ele, usa a config do utilizador com --setting-sources project,local --strict-mcp-config.
# O token so e lido em runtime e nunca e escrito em ficheiros nem no log.
set -euo pipefail

main() {
  local KIT; KIT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
  local MODO=participante N=10 MAX="" GRAVAR=0 SEM_ISOLAMENTO=0
  while [ $# -gt 0 ]; do
    case "$1" in
      --modo) MODO="$2"; shift 2 ;;
      --n) N="$2"; shift 2 ;;
      --max) MAX="$2"; shift 2 ;;
      --gravar) GRAVAR=1; shift ;;
      --sem-isolamento) SEM_ISOLAMENTO=1; shift ;;
      *) echo "opcao desconhecida: $1" >&2; exit 2 ;;
    esac
  done
  [ -z "$MAX" ] && { [ "$MODO" = apresentador ] && MAX=16 || MAX=8; }
  local NODE; NODE="$(command -v node)"
  local RUNS="$KIT/benchmark/runs"; mkdir -p "$RUNS"
  # BENCH_CSV / BENCH_REPORT: escrever noutro sitio (tools/testar-maquina.sh nao mexe nos resultados do repositorio)
  local CSV="${BENCH_CSV:-$KIT/benchmark/results.csv}" REPORT="${BENCH_REPORT:-$KIT/benchmark/REPORT.md}"

  local TOKEN=""
  if command -v security >/dev/null 2>&1; then
    TOKEN="$(security find-generic-password -s workshop-benchmark-oauth -w 2>/dev/null || true)"
  fi
  local ISOLADO=0; [ -n "$TOKEN" ] && [ "$SEM_ISOLAMENTO" = 0 ] && ISOLADO=1
  echo "Benchmark: modo=$MODO execucoes=$N paralelo=$MAX isolado=$ISOLADO claude=$(claude --version 2>/dev/null | head -1)"

  local i
  for i in $(seq 1 "$N"); do
    local ID; ID="$(date +%Y%m%d-%H%M%S)-$MODO-$i"
    local RUN="$RUNS/$ID"; mkdir -p "$RUN"
    local ARENA="$RUN/arena"
    "$NODE" "$KIT/installer/assemble-demo.mjs" --dest "$ARENA" --node "$NODE" >/dev/null
    # Plano no modo pedido (o /demo-plan --auto usa o modo participante por defeito).
    local MODO_ARG=""; [ "$MODO" = apresentador ] && MODO_ARG="--modo apresentador"

    local -a FLAGS=(--output-format json --permission-mode acceptEdits)
    local -a ENVV=(ARENA_MAX_PARALELO="$MAX")
    if [ "$ISOLADO" = 1 ]; then
      local CFG="$RUN/config"; mkdir -p "$CFG"
      "$NODE" -e '
        const fs=require("fs");const [cfg,arena]=process.argv.slice(1);
        fs.writeFileSync(cfg+"/.claude.json",JSON.stringify({hasCompletedOnboarding:true,projects:{[arena]:{hasTrustDialogAccepted:true}}},null,2));
      ' "$CFG" "$ARENA"
      ENVV+=(CLAUDE_CONFIG_DIR="$CFG")
      # App de memoria: a instalada so para o benchmark (benchmark/tmp/bin) ou a do sistema;
      # cada execucao tem a sua pasta de memorias, para nao tocar em ~/.memoria.
      local MEMBIN="${MEMORIA_BIN:-$KIT/benchmark/tmp/bin/memoria}"
      [ -x "$MEMBIN" ] || MEMBIN="$(command -v memoria || true)"
      if [ -n "$MEMBIN" ]; then
        mkdir -p "$RUN/memoria"
        env "${ENVV[@]}" claude mcp add --scope user -e MEMORIA_HOME="$RUN/memoria" memoria -- "$MEMBIN" mcp >/dev/null 2>&1 || true
      fi
    else
      # Sem isolamento: config do utilizador, mas so as definicoes do projeto e so o MCP da memoria.
      local MEMBIN="${MEMORIA_BIN:-$KIT/benchmark/tmp/bin/memoria}"
      [ -x "$MEMBIN" ] || MEMBIN="$(command -v memoria || true)"
      mkdir -p "$RUN/memoria"
      if [ -n "$MEMBIN" ]; then
        "$NODE" -e 'const [f,b,h]=process.argv.slice(1);require("fs").writeFileSync(f,JSON.stringify({mcpServers:{memoria:{type:"stdio",command:b,args:["mcp"],env:{MEMORIA_HOME:h}}}}))' "$RUN/mcp.json" "$MEMBIN" "$RUN/memoria"
      else
        echo '{"mcpServers":{}}' > "$RUN/mcp.json"
      fi
      # shellcheck disable=SC2054 # "project,local" e um so argumento
      FLAGS+=(--setting-sources project,local --strict-mcp-config --mcp-config "$RUN/mcp.json"
        --allowedTools "Bash(node --test *)" "Bash(node tools/*)" "Bash(node server.js*)" "Read" "Edit" "Write" "Glob" "Grep"
        "mcp__memoria__memoria_procurar" "mcp__memoria__memoria_adicionar" "mcp__memoria__memoria_relacionadas")
      TOKEN=""
    fi

    local SID; SID="$(uuidgen | tr 'A-Z' 'a-z')"
    local T0; T0="$(date +%s)"
    echo "[$i/$N] $ID"
    (
      cd "$ARENA"
      export CLAUDE_CODE_OAUTH_TOKEN="$TOKEN"
      [ -z "$TOKEN" ] && unset CLAUDE_CODE_OAUTH_TOKEN
      env "${ENVV[@]}" claude -p --session-id "$SID" "/demo-plan --auto $MODO_ARG" "${FLAGS[@]}" < /dev/null > "$RUN/1-plan.json" 2> "$RUN/1-plan.err" || true
      env "${ENVV[@]}" claude -p --resume "$SID" "/demo-swarm --auto" "${FLAGS[@]}" < /dev/null > "$RUN/2-swarm.json" 2> "$RUN/2-swarm.err" || true
      env "${ENVV[@]}" claude -p --resume "$SID" "/demo-review --auto" "${FLAGS[@]}" < /dev/null > "$RUN/3-review.json" 2> "$RUN/3-review.err" || true
      env "${ENVV[@]}" claude -p --resume "$SID" "/demo-cost --auto" "${FLAGS[@]}" < /dev/null > "$RUN/4-cost.json" 2> "$RUN/4-cost.err" || true
    )
    local T1; T1="$(date +%s)"
    "$NODE" "$KIT/benchmark/collect.mjs" --run "$RUN" --id "$ID" --modo "$MODO" --duracao $((T1 - T0)) --csv "$CSV" --isolado "$ISOLADO"
    if [ "$GRAVAR" = 1 ]; then cp -R "$ARENA/.workshop" "$RUN/workshop-final"; fi
  done
  "$NODE" "$KIT/benchmark/report.mjs" --csv "$CSV" --out "$REPORT"
  echo "Relatorio: $REPORT"
}

main "$@"
