#!/usr/bin/env bash
# Sessao completa do modo apresentador, mostrada no terminal (para o asciinema gravar):
#   /demo-plan -> /demo-swarm -> /demo-review -> /demo-cost
# Grava tambem o resultado de cada passo em <out>/N-passo.json (formato do benchmark/collect.mjs).
#   sessao.sh <pasta-arena> <pasta-out>
set -uo pipefail
ARENA="$1"; OUT="$2"
REC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NODE="$(command -v node)"
SID="$(uuidgen | tr 'A-Z' 'a-z')"
KIT="$(cd "$REC/../.." && pwd)"
# O programa da app (agent-memory desde a v0.5.0; memoria nas versoes antigas), como no benchmark.
MEMBIN="${AGENT_MEMORY_BIN:-${MEMORIA_BIN:-$KIT/benchmark/tmp/bin/agent-memory}}"
[ -x "$MEMBIN" ] || MEMBIN="$KIT/benchmark/tmp/bin/memoria"
mkdir -p "$OUT/agent-memory"
if [ -x "$MEMBIN" ]; then
  "$NODE" -e 'const [f,b,h]=process.argv.slice(1);require("fs").writeFileSync(f,JSON.stringify({mcpServers:{"agent-memory":{type:"stdio",command:b,args:["mcp"],env:{AGENT_MEMORY_HOME:h,MEMORIA_HOME:h}}}}))' "$OUT/mcp.json" "$MEMBIN" "$OUT/agent-memory"
else
  echo '{"mcpServers":{}}' > "$OUT/mcp.json"
fi
# shellcheck disable=SC2054 # "project,local" e um so argumento
FLAGS=(--output-format stream-json --verbose --permission-mode acceptEdits --setting-sources project,local --strict-mcp-config --mcp-config "$OUT/mcp.json"
  --allowedTools "Bash(node --test *)" "Bash(node tools/*)" "Bash(node server.js*)" Read Edit Write Glob Grep
  "mcp__agent-memory__memory_search" "mcp__agent-memory__memory_add" "mcp__agent-memory__memory_related")
cd "$ARENA" || exit 1
passo() {
  local n="$1" nome="$2" prompt="$3"; shift 3
  printf '\n\033[1m%s\033[0m\n' "$prompt"
  claude -p "$@" "$prompt" "${FLAGS[@]}" < /dev/null 2>"$OUT/$n-$nome.err" | tee "$OUT/$n-$nome.stream" | "$NODE" "$REC/terminal-stream.mjs"
  grep '"type":"result"' "$OUT/$n-$nome.stream" | tail -1 > "$OUT/$n-$nome.json"
}
passo 1 plan "/demo-plan --auto --mode presenter" --session-id "$SID"
passo 2 swarm "/demo-swarm --auto" --resume "$SID"
passo 3 review "/demo-review --auto" --resume "$SID"
passo 4 cost "/demo-cost --auto" --resume "$SID"
