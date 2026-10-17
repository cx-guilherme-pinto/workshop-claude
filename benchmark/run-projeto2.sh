#!/usr/bin/env bash
# Teste ponta a ponta do Projeto 2 (skills /task-*) no projeto de treino, de forma nao interativa:
#   /task-intake issues/<ISSUE>.json -> /task-plan --auto -> /task-swarm --auto -> /task-gate --auto -> /memory
# As skills e os agentes de producao sao instalados ao nivel do PROJETO numa copia temporaria
# (nunca em ~/.claude), com {{KIT_DIR}} a apontar para este kit. Custo medido pelos hooks do kit.
#   benchmark/run-projeto2.sh [EX-3]
# Lingua: pt por defeito (a da D-18); BENCH_LINGUA=en usa o projeto de treino e os textos do kit em ingles (D-20).
set -uo pipefail

main() {
  local KIT; KIT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
  local ISSUE="${1:-EX-3}"
  local NODE; NODE="$(command -v node)"
  local ID; ID="$(date +%Y%m%d-%H%M%S)-projeto2-$ISSUE"
  local RUN="$KIT/benchmark/runs/$ID"; mkdir -p "$RUN"
  local P="$RUN/projeto"
  export WORKSHOP_LANG="${BENCH_LINGUA:-pt}"
  "$NODE" "$KIT/installer/assemble-sandbox.mjs" --dest "$P" --language "$WORKSHOP_LANG" >/dev/null
  mkdir -p "$P/.claude/skills" "$P/.claude/agents"
  cp -R "$KIT/skills-prod/." "$P/.claude/skills/"
  cp "$KIT/agents/prod/"*.md "$P/.claude/agents/"
  # {{KIT_DIR}} -> kit (as instalacoes reais usam ~/.workshop-claude/kit)
  find "$P/.claude" -name '*.md' -exec sed -i '' "s#{{KIT_DIR}}#$KIT#g" {} +
  "$NODE" -e '
    const fs=require("fs");const [p,node,kit]=process.argv.slice(1);
    const cmd=(r)=>`"${node}" "${kit}/${r}"`;
    fs.writeFileSync(p+"/.claude/settings.local.json",JSON.stringify({
      model:"claude-sonnet-5-5",
      hooks:{SubagentStop:[{hooks:[{type:"command",command:cmd("hooks/subagent-stop.mjs"),timeout:30}]}],
             Stop:[{hooks:[{type:"command",command:cmd("hooks/stop.mjs"),timeout:30}]}]}},null,2));
  ' "$P" "$NODE" "$KIT"
  # O programa da app: agent-memory desde a v0.5.0 (memoria nas versoes antigas).
  local MEMBIN="${AGENT_MEMORY_BIN:-${MEMORIA_BIN:-$KIT/benchmark/tmp/bin/agent-memory}}"
  [ -x "$MEMBIN" ] || MEMBIN="$KIT/benchmark/tmp/bin/memoria"
  mkdir -p "$RUN/agent-memory"
  "$NODE" -e 'const [f,b,h]=process.argv.slice(1);require("fs").writeFileSync(f,JSON.stringify({mcpServers:{"agent-memory":{type:"stdio",command:b,args:["mcp"],env:{AGENT_MEMORY_HOME:h,MEMORIA_HOME:h}}}}))' "$RUN/mcp.json" "$MEMBIN" "$RUN/agent-memory"
  # shellcheck disable=SC2054 # "project,local" e um so argumento
  local -a FLAGS=(--output-format json --permission-mode acceptEdits --setting-sources project,local --strict-mcp-config --mcp-config "$RUN/mcp.json"
    --allowedTools "Bash(node *)" "Bash(npm test*)" "Bash(git status*)" "Bash(git diff*)" "Bash(git log*)" "Bash(git rev-parse *)" Read Edit Write Glob Grep
    "mcp__agent-memory__memory_search" "mcp__agent-memory__memory_add" "mcp__agent-memory__memory_related")
  local SID; SID="$(uuidgen | tr 'A-Z' 'a-z')"
  local T0; T0=$(date +%s)
  (
    cd "$P" || exit 1
    claude -p --session-id "$SID" "/task-intake issues/$ISSUE.json" "${FLAGS[@]}" < /dev/null > "$RUN/1-intake.json" 2> "$RUN/1-intake.err"
    claude -p --resume "$SID" "/task-plan --auto" "${FLAGS[@]}" < /dev/null > "$RUN/2-plan.json" 2> "$RUN/2-plan.err"
    claude -p --resume "$SID" "/task-swarm --auto" "${FLAGS[@]}" < /dev/null > "$RUN/3-swarm.json" 2> "$RUN/3-swarm.err"
    claude -p --resume "$SID" "/task-gate --auto" "${FLAGS[@]}" < /dev/null > "$RUN/4-gate.json" 2> "$RUN/4-gate.err"
    claude -p --resume "$SID" "/memory" "${FLAGS[@]}" < /dev/null > "$RUN/5-memory.json" 2> "$RUN/5-memory.err"
  )
  local T1; T1=$(date +%s)
  echo "Projeto 2 ($ISSUE): $((T1 - T0)) s · pasta $RUN"
  "$NODE" "$KIT/orchestrator/report.mjs" --project "$P" --plan "$P/.workshop/plan.json" 2>/dev/null | sed -n '1,8p'
  (cd "$P" && npm test 2>&1 | grep -E "^ℹ (pass|fail)")
  ls "$RUN/agent-memory"/*/ 2>/dev/null | head
}

main "$@"
