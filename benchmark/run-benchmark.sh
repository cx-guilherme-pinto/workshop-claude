#!/usr/bin/env bash
# Benchmark de custo e tempo da sessao completa do participante (ou do apresentador),
# de forma nao interativa: /demo-plan -> /demo-swarm -> /demo-review -> /demo-cost.
#
#   benchmark/run-benchmark.sh [--mode participant|presenter] [--n 10] [--max 8] [--gravar]
#   (--modo participante|apresentador continua a funcionar)
#
# Isolamento: se existir no Keychain o servico "workshop-benchmark-oauth" (token criado com
# `claude setup-token`), cada execucao usa um CLAUDE_CONFIG_DIR temporario, como um participante novo.
# Sem ele, usa a config do utilizador com --setting-sources project,local --strict-mcp-config.
# O token so e lido em runtime e nunca e escrito em ficheiros nem no log.
# Lingua da Arena: pt por defeito (a das medicoes da D-16); BENCH_LINGUA=en mede a Arena em ingles (D-20).
set -euo pipefail

# O programa da app (agent-memory desde a v0.5.0; memoria nas versoes antigas): AGENT_MEMORY_BIN (ou MEMORIA_BIN),
# o instalado so para o benchmark (benchmark/tmp/bin) ou o do sistema.
bench_memory_bin() {
  local b
  for b in "${AGENT_MEMORY_BIN:-}" "${MEMORIA_BIN:-}" "$1/benchmark/tmp/bin/agent-memory" "$1/benchmark/tmp/bin/memoria"; do
    [ -n "$b" ] && [ -x "$b" ] && { printf '%s' "$b"; return 0; }
  done
  command -v agent-memory || command -v memoria || true
}

main() {
  local KIT; KIT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
  local MODO=participant N=10 MAX="" GRAVAR=0 SEM_ISOLAMENTO=0
  while [ $# -gt 0 ]; do
    case "$1" in
      --mode|--modo) MODO="$2"; shift 2 ;;
      --n) N="$2"; shift 2 ;;
      --max) MAX="$2"; shift 2 ;;
      --gravar) GRAVAR=1; shift ;;
      --sem-isolamento) SEM_ISOLAMENTO=1; shift ;;
      *) echo "opcao desconhecida: $1" >&2; exit 2 ;;
    esac
  done
  case "$MODO" in participante) MODO=participant ;; apresentador) MODO=presenter ;; esac
  [ -z "$MAX" ] && { [ "$MODO" = presenter ] && MAX=16 || MAX=8; }
  local NODE; NODE="$(command -v node)"
  local RUNS="$KIT/benchmark/runs"; mkdir -p "$RUNS"
  # BENCH_CSV / BENCH_REPORT: escrever noutro sitio (tools/test-machine.sh nao mexe nos resultados do repositorio)
  local CSV="${BENCH_CSV:-$KIT/benchmark/results.csv}" REPORT="${BENCH_REPORT:-$KIT/benchmark/REPORT.md}"

  # A versao do Claude Code que os participantes vao ter e a do repos.conf. CLAUDE_BIN escolhe o binario.
  local CLAUDE_BIN="${CLAUDE_BIN:-claude}" CC_KIT CC_AQUI
  CC_KIT=$(sed -n 's/^CLAUDE_CODE_VERSION=//p' "$KIT/repos.conf" | head -1)
  CC_AQUI=$("$CLAUDE_BIN" --version 2>/dev/null | awk '{print $1}')
  if [ -n "$CC_KIT" ] && [ "$CC_AQUI" != "$CC_KIT" ]; then
    echo "AVISO: o kit instala o Claude Code $CC_KIT e este benchmark usa o ${CC_AQUI:-?} ($CLAUDE_BIN). Os participantes podem ver outra coisa (ex.: pedidos de permissao). Para medir a versao do kit: CLAUDE_BIN=<binario $CC_KIT>." >&2
  fi
  local TOKEN=""
  if command -v security >/dev/null 2>&1; then
    TOKEN="$(security find-generic-password -s workshop-benchmark-oauth -w 2>/dev/null || true)"
  fi
  local ISOLADO=0; [ -n "$TOKEN" ] && [ "$SEM_ISOLAMENTO" = 0 ] && ISOLADO=1
  echo "Benchmark: modo=$MODO execucoes=$N paralelo=$MAX isolado=$ISOLADO claude=$("$CLAUDE_BIN" --version 2>/dev/null | head -1)"

  local i
  for i in $(seq 1 "$N"); do
    local ID; ID="$(date +%Y%m%d-%H%M%S)-$MODO-$i"
    local RUN="$RUNS/$ID"; mkdir -p "$RUN"
    local ARENA="$RUN/arena"
    "$NODE" "$KIT/installer/assemble-demo.mjs" --dest "$ARENA" --node "$NODE" --language "${BENCH_LINGUA:-pt}" >/dev/null
    # Plano no modo pedido (o /demo-plan --auto usa o modo participant por defeito).
    local MODO_ARG=""; [ "$MODO" = presenter ] && MODO_ARG="--mode presenter"

    local -a FLAGS=(--output-format json --permission-mode acceptEdits)
    local -a ENVV=(ARENA_MAX_PARALLEL="$MAX" ARENA_MAX_PARALELO="$MAX")
    if [ "$ISOLADO" = 1 ]; then
      local CFG="$RUN/config"; mkdir -p "$CFG"
      "$NODE" -e '
        const fs=require("fs");const [cfg,arena]=process.argv.slice(1);
        fs.writeFileSync(cfg+"/.claude.json",JSON.stringify({hasCompletedOnboarding:true,projects:{[arena]:{hasTrustDialogAccepted:true}}},null,2));
      ' "$CFG" "$ARENA"
      ENVV+=(CLAUDE_CONFIG_DIR="$CFG")
      # App Agent Memory: a instalada so para o benchmark (benchmark/tmp/bin) ou a do sistema;
      # cada execucao tem a sua pasta de memorias, para nao tocar na do utilizador.
      local MEMBIN; MEMBIN=$(bench_memory_bin "$KIT")
      if [ -n "$MEMBIN" ]; then
        mkdir -p "$RUN/agent-memory"
        env "${ENVV[@]}" "$CLAUDE_BIN" mcp add --scope user -e AGENT_MEMORY_HOME="$RUN/agent-memory" -e MEMORIA_HOME="$RUN/agent-memory" agent-memory -- "$MEMBIN" mcp >/dev/null 2>&1 || true
      fi
    else
      # Sem isolamento: config do utilizador, mas so as definicoes do projeto e so o MCP da memoria.
      local MEMBIN; MEMBIN=$(bench_memory_bin "$KIT")
      mkdir -p "$RUN/agent-memory"
      if [ -n "$MEMBIN" ]; then
        "$NODE" -e 'const [f,b,h]=process.argv.slice(1);require("fs").writeFileSync(f,JSON.stringify({mcpServers:{"agent-memory":{type:"stdio",command:b,args:["mcp"],env:{AGENT_MEMORY_HOME:h,MEMORIA_HOME:h}}}}))' "$RUN/mcp.json" "$MEMBIN" "$RUN/agent-memory"
      else
        echo '{"mcpServers":{}}' > "$RUN/mcp.json"
      fi
      # shellcheck disable=SC2054 # "project,local" e um so argumento
      FLAGS+=(--setting-sources project,local --strict-mcp-config --mcp-config "$RUN/mcp.json"
        --allowedTools "Bash(node --test *)" "Bash(node tools/*)" "Bash(node server.js*)" "Read" "Edit" "Write" "Glob" "Grep"
        "mcp__agent-memory__memory_search" "mcp__agent-memory__memory_add" "mcp__agent-memory__memory_related")
      TOKEN=""
    fi

    local SID; SID="$(uuidgen | tr 'A-Z' 'a-z')"
    local T0; T0="$(date +%s)"
    echo "[$i/$N] $ID"
    (
      cd "$ARENA"
      export CLAUDE_CODE_OAUTH_TOKEN="$TOKEN"
      [ -z "$TOKEN" ] && unset CLAUDE_CODE_OAUTH_TOKEN
      env "${ENVV[@]}" "$CLAUDE_BIN" -p --session-id "$SID" "/demo-plan --auto $MODO_ARG" "${FLAGS[@]}" < /dev/null > "$RUN/1-plan.json" 2> "$RUN/1-plan.err" || true
      env "${ENVV[@]}" "$CLAUDE_BIN" -p --resume "$SID" "/demo-swarm --auto" "${FLAGS[@]}" < /dev/null > "$RUN/2-swarm.json" 2> "$RUN/2-swarm.err" || true
      env "${ENVV[@]}" "$CLAUDE_BIN" -p --resume "$SID" "/demo-review --auto" "${FLAGS[@]}" < /dev/null > "$RUN/3-review.json" 2> "$RUN/3-review.err" || true
      env "${ENVV[@]}" "$CLAUDE_BIN" -p --resume "$SID" "/demo-cost --auto" "${FLAGS[@]}" < /dev/null > "$RUN/4-cost.json" 2> "$RUN/4-cost.err" || true
    )
    local T1; T1="$(date +%s)"
    "$NODE" "$KIT/benchmark/collect.mjs" --run "$RUN" --id "$ID" --modo "$MODO" --duracao $((T1 - T0)) --csv "$CSV" --isolado "$ISOLADO"
    if [ "$GRAVAR" = 1 ]; then cp -R "$ARENA/.workshop" "$RUN/workshop-final"; fi
  done
  "$NODE" "$KIT/benchmark/report.mjs" --csv "$CSV" --out "$REPORT"
  echo "Relatorio: $REPORT"
}

main "$@"
