#!/usr/bin/env bash
# Benchmark de custo e tempo do que um participante gasta no workshop, de forma nao interativa (claude -p, uma
# sessao por projeto com --session-id/--resume). Por defeito mede o dia completo (--scope day):
#
#   Projeto 1 (Arena, o fluxo da v1.0.0-rc.4, D-28):
#     cp specs/my-card.example.json specs/my-card.json + node tools/gen.mjs (o cartao my-01)
#     /demo-plan --auto [--crypto haiku] -> /demo-swarm --auto
#     -> por cada tarefa que falhou com motivo spec: a "pessoa" escreve a linha que falta em cards/<id>/spec.md
#        (benchmark/person.mjs, a partir da spec completa do gen --no-gaps) e corre /demo-swarm --retry <id> --auto
#     -> /demo-review --auto -> /demo-cost --auto (com o memory-extractor que guarda as memorias na Agent Memory)
#   Projeto 2 (projeto de treino, outra sessao, como o Terminal 3 dos slides):
#     /task-intake issues/EX-1.json -> /task-plan --auto -> /task-swarm --auto -> /task-gate --auto -> /memory
#
# Uma linha por execucao em benchmark/results.csv (P1 + P2, por modelo, agentes, duracoes, repeticoes, 429,
# veredito) e benchmark/REPORT.md regenerado. A execucao falha se houver permissoes negadas ou um gate que nao
# esteja APPROVED no fim.
#
#   benchmark/run-benchmark.sh [--scope day|p1|p2] [--n 1] [--mode participant|presenter] [--max 8]
#                              [--crypto sonnet|haiku] [--issue EX-1] [--gravar] [--sem-isolamento] [--dry-run]
#   BENCH_LINGUA=pt|en (pt por defeito). --modo participante|apresentador continua a funcionar.
#   --dry-run: monta a Arena e o projeto de treino, faz os passos sem Claude (o cartao, a correcao das specs dos
#   4 cartoes partidos) e mostra cada chamada claude -p que faria, sem chamar o Claude e sem escrever no CSV.
#
# Isolamento: se existir no Keychain o servico "workshop-benchmark-oauth" (token criado com `claude setup-token`),
# cada execucao usa um CLAUDE_CONFIG_DIR temporario, como um participante novo (o mesmo nos dois projetos, como no
# portatil de uma pessoa). Sem ele, ou com --sem-isolamento, usa o login do utilizador com
# --setting-sources project,local --strict-mcp-config (nada e escrito nas definicoes do utilizador; o Claude Code
# guarda la os transcripts, como em qualquer sessao). O token so e lido em runtime, so vai para o ambiente do
# claude e nunca e escrito em ficheiros, na linha de comandos nem no log.
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

# Uma chamada ao Claude Code: cl <passo> <pasta> <argumentos do claude -p...>. Usa ENVV e FLAGS (globais) e grava
# <passo>.json/.err e o tempo em steps.tsv. Em --dry-run so mostra o comando (o token aparece como <Keychain>).
cl() {
  local passo=$1 dir=$2; shift 2
  local t0 t1 rc=0
  if [ "$DRY" = 1 ]; then
    local tok="" linha
    [ "$ISOLADO" = 1 ] && tok="CLAUDE_CODE_OAUTH_TOKEN=<Keychain:workshop-benchmark-oauth> "
    linha=$(printf '(cd %q) %s' "$dir" "$tok"; printf '%q ' "${ENVV[@]}" "$CLAUDE_BIN" -p "$@" "${FLAGS[@]}")
    # A pasta da execucao aparece como $RUN (mostrada no inicio), para a linha caber no ecra.
    printf '  [dry-run] %-20s %s\n' "$passo" "${linha//"$RUN"/\$RUN}"
    return 0
  fi
  t0=$(date +%s)
  (
    cd "$dir"
    if [ -n "$TOKEN" ]; then export CLAUDE_CODE_OAUTH_TOKEN="$TOKEN"; else unset CLAUDE_CODE_OAUTH_TOKEN; fi
    env "${ENVV[@]}" "$CLAUDE_BIN" -p "$@" "${FLAGS[@]}" < /dev/null > "$RUN/$passo.json" 2> "$RUN/$passo.err"
  ) || rc=$?
  t1=$(date +%s)
  printf '%s\t%s\t%s\t%s\n' "$passo" "$t0" "$t1" "$rc" >> "$RUN/steps.tsv"
  if [ "$rc" = 0 ]; then echo "    $passo: $((t1 - t0)) s"; else echo "    $passo: $((t1 - t0)) s (saida $rc)"; fi
}

# Projeto 1: a Arena, com o cartao proprio, os 4 cartoes partidos corrigidos e --retry.
p1_run() {
  local ARENA="$RUN/arena"
  "$NODE" "$KIT/installer/assemble-demo.mjs" --dest "$ARENA" --node "$NODE" --language "$LINGUA" >/dev/null
  # O teu cartao (D-28): o exemplo funciona sem mudancas.
  cp "$ARENA/specs/my-card.example.json" "$ARENA/specs/my-card.json"
  (cd "$ARENA" && "$NODE" tools/gen.mjs >/dev/null)
  FLAGS=("${BASE_FLAGS[@]}")
  [ "$ISOLADO" = 1 ] || FLAGS+=(--allowedTools "Bash(node --test *)" "Bash(node tools/*)" "Bash(node server.js*)" "Read" "Edit" "Write" "Glob" "Grep"
    "mcp__agent-memory__memory_search" "mcp__agent-memory__memory_add" "mcp__agent-memory__memory_related")
  local SID; SID="$(uuidgen | tr 'A-Z' 'a-z')"
  local PLAN="/demo-plan --auto"
  [ "$MODO" = presenter ] && PLAN="$PLAN --mode presenter"
  [ -n "$CRYPTO" ] && PLAN="$PLAN --crypto $CRYPTO"
  local T0; T0=$(date +%s)
  cl p1-1-plan "$ARENA" --session-id "$SID" "$PLAN"
  cl p1-2-swarm "$ARENA" --resume "$SID" "/demo-swarm --auto"
  # A pessoa: le que cartoes falharam por falta de um detalhe na spec, escreve a linha e repete so esse cartao.
  # Em --dry-run ainda nao ha estado: usa os cartoes com spec_gaps em specs/cards.json (os que vao falhar).
  local ids id linhas
  if [ "$DRY" = 1 ]; then ids=$("$NODE" "$KIT/benchmark/person.mjs" expected --arena "$ARENA" || true)
  else ids=$("$NODE" "$KIT/benchmark/person.mjs" failed --arena "$ARENA" || true); fi
  for id in $ids; do
    if linhas=$("$NODE" "$KIT/benchmark/person.mjs" fix --arena "$ARENA" --id "$id" 2>&1); then
      printf '%s\n' "$linhas" | sed "s#^#$id: #" >> "$RUN/person.log"
      printf '    a pessoa escreveu em cards/%s/spec.md: %s\n' "$id" "$(printf '%s' "$linhas" | head -1)"
      cl "p1-3-retry-$id" "$ARENA" --resume "$SID" "/demo-swarm --retry $id --auto"
    else
      printf '%s: NAO CORRIGIDO: %s\n' "$id" "$linhas" >> "$RUN/person.log"
      echo "    AVISO: $id falhou por spec e a pessoa nao encontrou a linha: $linhas" >&2
    fi
  done
  # O gen continua a aceitar as specs completadas (como quando o participante volta a correr o gen.mjs).
  (cd "$ARENA" && "$NODE" tools/gen.mjs --check >/dev/null 2>&1) || echo "    AVISO: node tools/gen.mjs --check falhou depois das correcoes da pessoa" >&2
  cl p1-4-review "$ARENA" --resume "$SID" "/demo-review --auto"
  cl p1-5-cost "$ARENA" --resume "$SID" "/demo-cost --auto"
  P1_DUR=$(( $(date +%s) - T0 ))
  if [ "$GRAVAR" = 1 ] && [ -d "$ARENA/.workshop" ]; then cp -R "$ARENA/.workshop" "$RUN/workshop-final"; fi
}

# Projeto 2: o projeto de treino, numa sessao nova. As skills e os agentes de producao ficam ao nivel do projeto
# (nunca em ~/.claude), com {{KIT_DIR}} a apontar para este kit, e fora do git (como ao nivel do utilizador).
p2_run() {
  local P="$RUN/projeto"
  "$NODE" "$KIT/installer/assemble-sandbox.mjs" --dest "$P" --language "$LINGUA" >/dev/null
  mkdir -p "$P/.claude/skills" "$P/.claude/agents"
  cp -R "$KIT/skills-prod/." "$KIT/skills-shared/." "$P/.claude/skills/"
  cp "$KIT/agents/prod/"*.md "$P/.claude/agents/"
  mkdir -p "$P/.git/info" && printf '.claude/\n' >> "$P/.git/info/exclude"
  "$NODE" -e '
    const fs=require("fs"),path=require("path");const [p,node,kit]=process.argv.slice(1);
    const walk=(d)=>fs.readdirSync(d,{withFileTypes:true}).flatMap((e)=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
    for (const f of walk(p+"/.claude").filter((f)=>f.endsWith(".md"))) fs.writeFileSync(f,fs.readFileSync(f,"utf8").split("{{KIT_DIR}}").join(kit));
    const cmd=(r)=>`"${node}" "${kit}/${r}"`;
    fs.writeFileSync(p+"/.claude/settings.local.json",JSON.stringify({
      model:"claude-sonnet-5-5",
      hooks:{SubagentStop:[{hooks:[{type:"command",command:cmd("hooks/subagent-stop.mjs"),timeout:30}]}],
             Stop:[{hooks:[{type:"command",command:cmd("hooks/stop.mjs"),timeout:30}]}]}},null,2));
  ' "$P" "$NODE" "$KIT"
  # O projeto de treino nao pre-aprova permissoes: o participante diz que sim aos pedidos. Aqui, a lista do que ele aprova.
  FLAGS=("${BASE_FLAGS[@]}" --allowedTools "Bash(node *)" "Bash(npm test*)" "Bash(git status*)" "Bash(git diff*)" "Bash(git log*)" "Bash(git rev-parse *)" Read Edit Write Glob Grep
    "mcp__agent-memory__memory_search" "mcp__agent-memory__memory_add" "mcp__agent-memory__memory_related")
  local SID; SID="$(uuidgen | tr 'A-Z' 'a-z')"
  local T0; T0=$(date +%s)
  cl p2-1-intake "$P" --session-id "$SID" "/task-intake issues/$ISSUE.json"
  cl p2-2-plan "$P" --resume "$SID" "/task-plan --auto"
  cl p2-3-swarm "$P" --resume "$SID" "/task-swarm --auto"
  cl p2-4-gate "$P" --resume "$SID" "/task-gate --auto"
  cl p2-5-memory "$P" --resume "$SID" "/memory"
  P2_DUR=$(( $(date +%s) - T0 ))
  if [ "$GRAVAR" = 1 ] && [ -d "$P/.workshop" ]; then cp -R "$P/.workshop" "$RUN/workshop-final-p2"; fi
}

main() {
  KIT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
  MODO=participant; SCOPE=day; CRYPTO=""; ISSUE=EX-1; GRAVAR=0; DRY=0
  local N=1 MAX="" SEM_ISOLAMENTO=0
  while [ $# -gt 0 ]; do
    case "$1" in
      --scope) SCOPE="$2"; shift 2 ;;
      --mode|--modo) MODO="$2"; shift 2 ;;
      --n) N="$2"; shift 2 ;;
      --max) MAX="$2"; shift 2 ;;
      --crypto) CRYPTO="$2"; shift 2 ;;
      --issue) ISSUE="$2"; shift 2 ;;
      --gravar) GRAVAR=1; shift ;;
      --sem-isolamento|--no-isolation) SEM_ISOLAMENTO=1; shift ;;
      --dry-run) DRY=1; shift ;;
      -h|--help) sed -n '2,30p' "${BASH_SOURCE[0]}"; exit 0 ;;
      *) echo "opcao desconhecida: $1" >&2; exit 2 ;;
    esac
  done
  case "$MODO" in participante) MODO=participant ;; apresentador) MODO=presenter ;; esac
  case "$MODO" in participant|presenter) ;; *) echo "--mode: participant ou presenter" >&2; exit 2 ;; esac
  case "$SCOPE" in day|p1|p2) ;; *) echo "--scope: day, p1 ou p2" >&2; exit 2 ;; esac
  case "$CRYPTO" in ""|sonnet|haiku) ;; *) echo "--crypto: sonnet ou haiku" >&2; exit 2 ;; esac
  LINGUA="${BENCH_LINGUA:-pt}"
  case "$LINGUA" in pt|en) ;; *) echo "BENCH_LINGUA: pt ou en" >&2; exit 2 ;; esac
  [ -z "$MAX" ] && { [ "$MODO" = presenter ] && MAX=16 || MAX=8; }
  NODE="$(command -v node)"
  local RUNS="$KIT/benchmark/runs"; mkdir -p "$RUNS"
  # BENCH_CSV / BENCH_REPORT: escrever noutro sitio (tools/test-machine.sh nao mexe nos resultados do repositorio)
  local CSV="${BENCH_CSV:-$KIT/benchmark/results.csv}" REPORT="${BENCH_REPORT:-$KIT/benchmark/REPORT.md}"
  local VERSAO; VERSAO=$(sed -n 's/^WORKSHOP_VERSION=//p' "$KIT/repos.conf" | head -1)

  # A versao do Claude Code que os participantes vao ter e a do repos.conf. CLAUDE_BIN escolhe o binario.
  # (claude --version nao fala com a API: corre tambem em --dry-run.)
  CLAUDE_BIN="${CLAUDE_BIN:-claude}"
  local CC_KIT CC_AQUI
  CC_KIT=$(sed -n 's/^CLAUDE_CODE_VERSION=//p' "$KIT/repos.conf" | head -1)
  CC_AQUI=$("$CLAUDE_BIN" --version 2>/dev/null | awk '{print $1}' || true)
  if [ -n "$CC_KIT" ] && [ "$CC_AQUI" != "$CC_KIT" ]; then
    echo "AVISO: o kit instala o Claude Code $CC_KIT e este benchmark usa o ${CC_AQUI:-?} ($CLAUDE_BIN). Os participantes podem ver outra coisa (ex.: pedidos de permissao). Para medir a versao do kit: CLAUDE_BIN=<binario $CC_KIT>." >&2
  fi
  # O token: so do Keychain para uma variavel. Em --dry-run so se ve se existe (sem ler o segredo).
  TOKEN=""
  local TEM_TOKEN=0
  if command -v security >/dev/null 2>&1; then
    if [ "$DRY" = 1 ]; then
      security find-generic-password -s workshop-benchmark-oauth >/dev/null 2>&1 && TEM_TOKEN=1
    else
      TOKEN="$(security find-generic-password -s workshop-benchmark-oauth -w 2>/dev/null || true)"
      [ -n "$TOKEN" ] && TEM_TOKEN=1
    fi
  fi
  ISOLADO=0; [ "$TEM_TOKEN" = 1 ] && [ "$SEM_ISOLAMENTO" = 0 ] && ISOLADO=1
  [ "$ISOLADO" = 1 ] || TOKEN=""
  echo "Benchmark: scope=$SCOPE modo=$MODO lingua=$LINGUA execucoes=$N paralelo=$MAX crypto=${CRYPTO:-sonnet (defeito)} issue=$ISSUE isolado=$ISOLADO claude=${CC_AQUI:-?}$([ "$DRY" = 1 ] && echo ' DRY-RUN' || true)"
  # Estimativa (dia completo, a partir das medicoes de referencia da D-18 e da D-28): P1 ~US$ 4,3 e P2 ~US$ 0,6.
  case "$SCOPE" in day) echo "Custo estimado: cerca de US\$ 5 por execucao (P1 ~4,3 + P2 ~0,6), 20 a 25 min." ;;
    p1) echo "Custo estimado: cerca de US\$ 4,3 por execucao, cerca de 15 min." ;;
    p2) echo "Custo estimado: cerca de US\$ 0,6 por execucao, cerca de 5 min." ;; esac

  local FALHAS=0 i
  for i in $(seq 1 "$N"); do
    local ID; ID="$(date +%Y%m%d-%H%M%S)-$SCOPE-$LINGUA-$MODO-$i"
    [ "$DRY" = 1 ] && ID="$ID-dry-run"
    RUN="$RUNS/$ID"; mkdir -p "$RUN"
    echo "[$i/$N] $ID"
    [ "$DRY" = 1 ] && echo "  RUN=$RUN"
    P1_DUR=0; P2_DUR=0
    BASE_FLAGS=(--output-format json --permission-mode acceptEdits)
    ENVV=(ARENA_MAX_PARALLEL="$MAX" ARENA_MAX_PARALELO="$MAX" WORKSHOP_LANG="$LINGUA")
    # A lingua das respostas do Claude Code, como o setup a poe (D-20).
    local LANG_CC TAG=en-US; [ "$LINGUA" = pt ] && TAG=pt-PT
    LANG_CC=$("$NODE" -e 'import(require("url").pathToFileURL(process.argv[1]).href).then((m)=>console.log(m.linguaMaquina(process.argv[2]).claude||""))' "$KIT/installer/lib/languages.mjs" "$TAG")
    local MEMBIN; MEMBIN=$(bench_memory_bin "$KIT")
    [ -n "$MEMBIN" ] || echo "AVISO: sem a app Agent Memory (AGENT_MEMORY_BIN ou benchmark/tmp/bin/agent-memory): os passos de memoria vao dizer MEMORY UNAVAILABLE e custam menos do que num participante." >&2
    # Cada execucao tem a sua pasta de memorias (a mesma nos dois projetos), para nao tocar na do utilizador.
    mkdir -p "$RUN/agent-memory"
    if [ "$ISOLADO" = 1 ]; then
      local CFG="$RUN/config"; mkdir -p "$CFG"
      "$NODE" -e '
        const fs=require("fs");const [cfg,lang,...dirs]=process.argv.slice(1);
        fs.writeFileSync(cfg+"/.claude.json",JSON.stringify({hasCompletedOnboarding:true,projects:Object.fromEntries(dirs.map((d)=>[d,{hasTrustDialogAccepted:true}]))},null,2));
        if (lang) fs.writeFileSync(cfg+"/settings.json",JSON.stringify({language:lang},null,2));
      ' "$CFG" "$LANG_CC" "$RUN/arena" "$RUN/projeto"
      ENVV+=(CLAUDE_CONFIG_DIR="$CFG")
      # A app Agent Memory registada como o setup a regista (ao nivel do utilizador, aqui o CLAUDE_CONFIG_DIR temporario).
      if [ -n "$MEMBIN" ]; then
        if [ "$DRY" = 1 ]; then
          local l; l=$(printf '%q ' "CLAUDE_CONFIG_DIR=$CFG" "$CLAUDE_BIN" mcp add --scope user -e "AGENT_MEMORY_HOME=$RUN/agent-memory" -e PYTHONHOME= -e PYTHONPATH= -e PYTHONSTARTUP= agent-memory -- "$MEMBIN" mcp)
          printf '  [dry-run] %-20s %s\n' "mcp add" "${l//"$RUN"/\$RUN}"
        else
          env "${ENVV[@]}" "$CLAUDE_BIN" mcp add --scope user -e AGENT_MEMORY_HOME="$RUN/agent-memory" -e MEMORIA_HOME="$RUN/agent-memory" -e PYTHONHOME= -e PYTHONPATH= -e PYTHONSTARTUP= agent-memory -- "$MEMBIN" mcp >/dev/null 2>&1 || true
        fi
      fi
    else
      # Sem isolamento: o login do utilizador, mas so as definicoes do projeto e so o MCP da memoria.
      if [ -n "$MEMBIN" ]; then
        "$NODE" -e 'const [f,b,h]=process.argv.slice(1);require("fs").writeFileSync(f,JSON.stringify({mcpServers:{"agent-memory":{type:"stdio",command:b,args:["mcp"],env:{AGENT_MEMORY_HOME:h,MEMORIA_HOME:h,PYTHONHOME:"",PYTHONPATH:"",PYTHONSTARTUP:""}}}}))' "$RUN/mcp.json" "$MEMBIN" "$RUN/agent-memory"
      else
        echo '{"mcpServers":{}}' > "$RUN/mcp.json"
      fi
      "$NODE" -e 'const [f,l]=process.argv.slice(1);require("fs").writeFileSync(f,JSON.stringify(l?{language:l}:{}))' "$RUN/settings.json" "$LANG_CC"
      # shellcheck disable=SC2054 # "project,local" e um so argumento
      BASE_FLAGS+=(--setting-sources project,local --settings "$RUN/settings.json" --strict-mcp-config --mcp-config "$RUN/mcp.json")
    fi

    [ "$SCOPE" = p2 ] || { echo "  Projeto 1 (Arena)"; p1_run; }
    [ "$SCOPE" = p1 ] || { echo "  Projeto 2 (projeto de treino, $ISSUE)"; p2_run; }
    local -a COL=(--run "$RUN" --id "$ID" --escopo "$SCOPE" --modo "$MODO" --lingua "$LINGUA" --versao "$VERSAO" --claude "${CC_AQUI:-}"
      --crypto "${CRYPTO:-sonnet}" --issue "$ISSUE" --isolado "$ISOLADO" --p1-duracao "$P1_DUR" --p2-duracao "$P2_DUR" --csv "$CSV")
    if [ "$DRY" = 1 ]; then
      echo "  [dry-run] collect (sem escrever no CSV):"
      "$NODE" "$KIT/benchmark/collect.mjs" "${COL[@]}" --dry-run || true
      echo "  [dry-run] pasta: $RUN (pode ser apagada)"
    else
      "$NODE" "$KIT/benchmark/collect.mjs" "${COL[@]}" || FALHAS=$((FALHAS + 1))
    fi
  done
  if [ "$DRY" = 0 ]; then
    "$NODE" "$KIT/benchmark/report.mjs" --csv "$CSV" --out "$REPORT" >/dev/null
    echo "Relatorio: $REPORT"
  fi
  [ "$FALHAS" -eq 0 ] || { echo "$FALHAS execucao(oes) falharam (permissoes negadas, gate nao aprovado ou erros): ver o CSV e $RUNS." >&2; exit 1; }
}

main "$@"
