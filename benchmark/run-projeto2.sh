#!/usr/bin/env bash
# Teste ponta a ponta do Projeto 2 (skills /task-*) no projeto de treino, de forma nao interativa:
#   /task-intake issues/<ISSUE>.json -> /task-plan --auto -> /task-swarm --auto -> /task-gate --auto -> /memoria
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
  "$NODE" "$KIT/installer/assemble-sandbox.mjs" --dest "$P" --lingua "$WORKSHOP_LANG" >/dev/null
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
  local MEMBIN="${MEMORIA_BIN:-$KIT/benchmark/tmp/bin/memoria}"
  mkdir -p "$RUN/memoria"
  "$NODE" -e 'const [f,b,h]=process.argv.slice(1);require("fs").writeFileSync(f,JSON.stringify({mcpServers:{memoria:{type:"stdio",command:b,args:["mcp"],env:{MEMORIA_HOME:h}}}}))' "$RUN/mcp.json" "$MEMBIN" "$RUN/memoria"
  # shellcheck disable=SC2054 # "project,local" e um so argumento
  local -a FLAGS=(--output-format json --permission-mode acceptEdits --setting-sources project,local --strict-mcp-config --mcp-config "$RUN/mcp.json"
    --allowedTools "Bash(node *)" "Bash(npm test*)" "Bash(git status*)" "Bash(git diff*)" "Bash(git log*)" "Bash(git rev-parse *)" Read Edit Write Glob Grep
    "mcp__memoria__memoria_procurar" "mcp__memoria__memoria_adicionar" "mcp__memoria__memoria_relacionadas")
  local SID; SID="$(uuidgen | tr 'A-Z' 'a-z')"
  local T0; T0=$(date +%s)
  (
    cd "$P" || exit 1
    claude -p --session-id "$SID" "/task-intake issues/$ISSUE.json" "${FLAGS[@]}" < /dev/null > "$RUN/1-intake.json" 2> "$RUN/1-intake.err"
    claude -p --resume "$SID" "/task-plan --auto" "${FLAGS[@]}" < /dev/null > "$RUN/2-plan.json" 2> "$RUN/2-plan.err"
    claude -p --resume "$SID" "/task-swarm --auto" "${FLAGS[@]}" < /dev/null > "$RUN/3-swarm.json" 2> "$RUN/3-swarm.err"
    claude -p --resume "$SID" "/task-gate --auto" "${FLAGS[@]}" < /dev/null > "$RUN/4-gate.json" 2> "$RUN/4-gate.err"
    claude -p --resume "$SID" "/memoria" "${FLAGS[@]}" < /dev/null > "$RUN/5-memoria.json" 2> "$RUN/5-memoria.err"
  )
  local T1; T1=$(date +%s)
  echo "Projeto 2 ($ISSUE): $((T1 - T0)) s · pasta $RUN"
  "$NODE" "$KIT/orquestrador/report.mjs" --projeto "$P" --plano "$P/.workshop/plan.json" 2>/dev/null | sed -n '1,8p'
  (cd "$P" && npm test 2>&1 | grep -E "^ℹ (pass|fail)")
  ls "$RUN/memoria"/*/ 2>/dev/null | head
}

main "$@"
