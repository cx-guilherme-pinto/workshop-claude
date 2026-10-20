#!/bin/bash
# shellcheck disable=SC2034,SC2154,SC2015,SC2016,SC1091
# Testes das funcoes puras do setup-mac.sh (corre com o bash 3.2 do macOS).
#   bash setup/test/test-mac.sh
# Usa os mesmos casos que os testes em Node e PowerShell (tools/test/*-cases.json).
ROOT=$(cd "$(dirname "$0")/../.." && pwd -P)
PASS=0; FAIL=0
ok() { PASS=$((PASS + 1)); }
ko() { FAIL=$((FAIL + 1)); printf 'FALHOU: %s\n' "$*"; }
eq() { if [ "$1" = "$2" ]; then ok; else ko "$3: esperado [$2], obtido [$1]"; fi; }

WS_SOURCE_ONLY=1
# shellcheck source=../setup-mac.sh
. "$ROOT/setup/setup-mac.sh"
WS_LOG=/dev/null; WS_TMP=$(mktemp -d); trap 'rm -rf "$WS_TMP"' EXIT
NODE=$(command -v node || true)
unset WORKSHOP_P1

# --- versoes
for c in "2.1.292|2.1.285|0" "2.1.285|2.1.292|1" "24.22.0|24|0" "22.0.1|24|1" "0.13.1|0.5|0" "0.4.9|0.5|1" "1.10|1.9|0" "2.1.285 (Claude Code)|2.1.285|0" "v24.3.0|22|0"; do
  IFS='|' read -r a b want <<EOF
$c
EOF
  ws_ver_ge "$a" "$b"; eq "$?" "$want" "ws_ver_ge $a $b"
done
eq "$(ws_ver_of 'gh version 2.102.0 (2026-09-30)')" 2.102.0 ws_ver_of
eq "$(ws_ver_of 'uv 0.13.1 (abc 2026-10-01)')" 0.13.1 ws_ver_of

# --- URLs e repos.conf
ws_repo_parts "https://gitea.exemplo.pt/guilherme/workshop-claude.git"
eq "$R_REPO|$R_HOST|$R_OWNER|$R_NAME" "https://gitea.exemplo.pt/guilherme/workshop-claude|gitea.exemplo.pt|guilherme|workshop-claude" ws_repo_parts
eq "$(ws_expand '{repo}/releases/download/{version}/{file}' R H O N v1 f.sh '')" "R/releases/download/v1/f.sh" ws_expand
eq "$(ws_expand 'https://raw/{owner}/{name}/{version}/{path}' R H O N v1 '' a/b)" "https://raw/O/N/v1/a/b" ws_expand_path
eq "$(ws_url_base 'http://127.0.0.1:8765/a/b/c')" "http://127.0.0.1:8765/" ws_url_base
WORKSHOP_VERSION=v7 ws_conf_parse <<'EOF'
# comentario
WORKSHOP_VERSION=v1
RELEASE_DOWNLOAD_URL={repo}/releases/download/{version}/{file}
WEBVIEW2_URL=https://go.microsoft.com/fwlink/p/?LinkId=2124703
NET_CHECK_HOSTS=a.com b.com
linha sem igual
EOF
eq "$C_WORKSHOP_VERSION" v7 "conf: ambiente sobrepoe"
eq "$C_WEBVIEW2_URL" "https://go.microsoft.com/fwlink/p/?LinkId=2124703" "conf: valor com = e ?"
eq "$C_NET_CHECK_HOSTS" "a.com b.com" "conf: valor com espacos"
ws_conf_parse < "$ROOT/repos.conf"
[ -n "$C_CLAUDE_CODE_VERSION" ] && ok || ko "conf real: CLAUDE_CODE_VERSION"

# --- SHA256SUMS e codigos de rede
printf '%s  %s\n%s *%s\n' "$(printf 'a%.0s' $(seq 64))" um.whl "$(printf 'b%.0s' $(seq 64))" dois.txt > "$WS_TMP/sums"
eq "$(ws_sum_for "$WS_TMP/sums" dois.txt)" "$(printf 'b%.0s' $(seq 64))" ws_sum_for
eq "$(ws_sum_for "$WS_TMP/sums" tres)" "" ws_sum_for_falta
printf 'abc' > "$WS_TMP/f"; eq "$(ws_sha256 "$WS_TMP/f")" ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad ws_sha256
eq "$(ws_net_code 6 000)" E-NET-02 net6; eq "$(ws_net_code 7 000)" E-NET-01 net7; eq "$(ws_net_code 60 000)" E-NET-04 net60
eq "$(ws_net_code 0 407)" E-NET-03 net407; eq "$(ws_net_code 22 404)" E-NET-07 net22

# --- redacao (casos partilhados)
CASES="$ROOT/tools/test/redact-cases.json"
if [ -n "$NODE" ]; then
  "$NODE" -e 'const c=require(process.argv[1]); for (const t of [...c.casos, ...(c.casos_mac_node || [])]) console.log(t.in)' "$CASES" > "$WS_TMP/in"
  "$NODE" -e 'const c=require(process.argv[1]); for (const t of [...c.casos, ...(c.casos_mac_node || [])]) console.log(t.out)' "$CASES" > "$WS_TMP/exp"
  WS_REDACT_EXTRA=s3cr3t-repo-token-value ws_redact < "$WS_TMP/in" > "$WS_TMP/out"
  if cmp -s "$WS_TMP/exp" "$WS_TMP/out"; then ok; else ko "ws_redact"; diff "$WS_TMP/exp" "$WS_TMP/out"; fi
  REPO_TOKEN=tok-literal-1234 eq "$(printf 'x tok-literal-1234 y\n' | REPO_TOKEN=tok-literal-1234 ws_redact)" "x *** y" "ws_redact REPO_TOKEN"
fi

# --- JS (node e JXA): mensagens e custo
for engine in node jxa; do
  if [ "$engine" = node ]; then WS_NODE=$NODE; [ -n "$NODE" ] || continue; else WS_NODE=""; command -v osascript >/dev/null || continue; fi
  code=$(ws_js "$WS_JS_MSGS" "$ROOT/setup/messages.en.json")
  eval "$code"
  eq "$M_ui_final_pronto" "Everything is ready for the workshop." "msgs $engine"
  eq "$M_passos_12" "Final test" "msgs $engine passos"
  [ "${M_erros_E_NET_01_fazer_n:-0}" -ge 1 ] && ok || ko "msgs $engine listas"
  if [ -n "$NODE" ]; then
    n=$("$NODE" -e 'const c=require(process.argv[1]); console.log(c.casos.length)' "$ROOT/tools/test/cost-cases.json")
    i=0
    while [ "$i" -lt "$n" ]; do
      "$NODE" -e 'const c=require(process.argv[1]).casos[+process.argv[2]]; require("fs").writeFileSync(process.argv[3], JSON.stringify(c.resultado)); console.log(c.texto)' "$ROOT/tools/test/cost-cases.json" "$i" "$WS_TMP/r.json" > "$WS_TMP/want"
      WS_PRICING="$ROOT/pricing.json"
      ws_parse_result "$WS_TMP/r.json"
      eq "$WSR_USD_TEXTO" "$(cat "$WS_TMP/want")" "custo $engine caso $i"
      i=$((i + 1))
    done
  fi
  printf '%s' '{"type":"result","is_error":false,"result":"ok","structured_output":{"causa":"Falta o X.","comandos":["echo 1","echo 2"]},"modelUsage":{"claude-haiku-5-5":{"inputTokens":100,"outputTokens":50}}}' > "$WS_TMP/h.json"
  ws_parse_result "$WS_TMP/h.json"
  eq "$WSR_CAUSA" "Falta o X." "ajudante causa $engine"
  eq "$(printf '%s' "$WSR_CMDS" | grep -c .)" 2 "ajudante comandos $engine"
  eq "$WSR_ERRO" 0 "ajudante erro $engine"
done

# --- mensagens com marcadores
WS_FILL_KEYS="CLAUDE_CODE_VERSION"; D_CLAUDE_CODE_VERSION=2.1.292
eq "$(ws_fill 'Passo {N}: {CLAUDE_CODE_VERSION} {X}' N=3)" "Passo 3: 2.1.292 {X}" ws_fill
eq "$(ws_fill 'custo {USD}' 'USD=US$ 0,0003')" 'custo US$ 0,0003' "ws_fill com cifrao"

# --- classificacao do login
WS_AUTH_LOGGED=true WS_AUTH_SOURCE="/login managed key" WS_AUTH_METHOD=claude.ai WS_AUTH_SUB=""; eq "$(ws_auth_classify)" console auth_console
WS_AUTH_LOGGED=true WS_AUTH_SOURCE="" WS_AUTH_METHOD=claude.ai WS_AUTH_SUB=max; eq "$(ws_auth_classify)" assinatura auth_sub
WS_AUTH_LOGGED=true WS_AUTH_SOURCE="" WS_AUTH_METHOD=oauth_token WS_AUTH_SUB=""; eq "$(ws_auth_classify)" outro auth_token
WS_AUTH_LOGGED=false; eq "$(ws_auth_classify)" nenhum auth_nenhum

# --- bloco do perfil (idempotente e removivel)
printf 'export A=1\n\n# >>> workshop-claude >>>\nvelho\n# <<< workshop-claude <<<\nexport B=2\n' > "$WS_TMP/rc"
eq "$(ws_profile_strip "$WS_TMP/rc")" "$(printf 'export A=1\nexport B=2')" "ws_profile_strip (tira o bloco e a linha vazia que o setup pos antes dele)"
printf 'a\n\nb\n' > "$WS_TMP/rc2"; eq "$(ws_profile_strip "$WS_TMP/rc2")" "$(printf 'a\n\nb')" "ws_profile_strip mantem linhas vazias da pessoa"
H="$WS_TMP/home com espaço"; mkdir -p "$H"; printf 'export A=1\n' > "$H/.zshrc"
( HOME=$H; WS_HOME="$H/.workshop-claude"; mkdir -p "$WS_HOME"; WS_MODE=install; WS_NODE_BIN_DIR="$H/.workshop-claude/node/bin"; KIT_SRC=""
  ws_profile_update; cp "$H/.zshrc" "$H/um"; ws_profile_update; cmp -s "$H/.zshrc" "$H/um" ) && ok || ko "perfil idempotente"
grep -q '"$HOME/.workshop-claude/node/bin"' "$H/.zshrc" && ok || ko "perfil usa \$HOME"
grep -c '>>> workshop-claude >>>' "$H/.zshrc" | grep -qx 1 && ok || ko "perfil com um so bloco"
eq "$(HOME=$H zsh -c ". \"$H/.zshrc\"; mkdir -p \"$H/.workshop-claude/node/bin\"; . \"$H/.zshrc\"; printf '%s' \"\$PATH\" | tr ':' '\n' | grep -c workshop-claude/node/bin")" 1 "perfil sem duplicar o PATH"

# --- Python gerido pelo uv
eq "$(UV_PYTHON_DOWNLOADS="" UV_NO_MANAGED_PYTHON="" UV_PYTHON_PREFERENCE="" ws_uv_python_blockers)" "" "uv sem bloqueios"
eq "$(UV_PYTHON_DOWNLOADS=Never UV_NO_MANAGED_PYTHON="" UV_PYTHON_PREFERENCE="" ws_uv_python_blockers)" UV_PYTHON_DOWNLOADS "uv downloads never"
eq "$(UV_PYTHON_DOWNLOADS=automatic UV_NO_MANAGED_PYTHON=1 UV_PYTHON_PREFERENCE=only-system ws_uv_python_blockers | tr '\n' ,)" "UV_NO_MANAGED_PYTHON,UV_PYTHON_PREFERENCE," "uv managed bloqueado"
FAKE="$WS_TMP/memoria-falso"; printf '#!/bin/sh\nprintf "Mem\303\263ria 0.1.0 \302\267 Python 3.12.13 \302\267 Darwin arm64\\n  [OK] SQLite 3.50 com FTS5\\nselftest: OK\\n"\n' > "$FAKE"; chmod +x "$FAKE"
( WS_CUR=10; WS_STEP_LOG="$WS_TMP/s10.log"; ws_memory_selftest "$FAKE" 0.1.0; printf '%s' "$SD_10" ) > "$WS_TMP/s10.out"
eq "$(cat "$WS_TMP/s10.out")" "Agent Memory app 0.1.0 (Python 3.12.13 managed by uv, FTS5 ok)" "selftest mostra o Python gerido"
printf '#!/bin/sh\nprintf "Memoria 0.1.0 - Python 3.12.13\\n  [FALHOU] SQLite sem FTS5\\n"; exit 1\n' > "$FAKE"
( WS_CUR=10; WS_STEP_LOG="$WS_TMP/s10.log"; ws_memory_selftest "$FAKE" 0.1.0; printf '%s' "$SW_10" ) > "$WS_TMP/s10.out"
eq "$(cat "$WS_TMP/s10.out")" "E-MEM-05|SQLite sem FTS5" "selftest falhado -> E-MEM-05"
# selftest noutra lingua (app >= 0.3.0): resultado pelo codigo de saida, motivo por qualquer etiqueta que nao seja [OK]
printf '#!/bin/sh\nprintf "lang=%%s agent=%%s\\n" "$MEMORIA_LANG" "$AGENT_MEMORY_LANG" >&2\nprintf "\340\244\256\340\245\207\340\244\256\340\245\213\340\244\260\340\244\277\340\244\257\340\244\276 0.4.0 \302\267 Python 3.12.13\\n  [\340\244\265\340\244\277\340\244\253\340\244\262] SQLite FTS5\\n  [OK] UI\\n"; exit 1\n' > "$FAKE"
( WS_CUR=10; WS_STEP_LOG="$WS_TMP/s10.log"; ws_memory_selftest "$FAKE" 0.4.0; printf '%s' "$SW_10" ) > "$WS_TMP/s10.out"
eq "$(cat "$WS_TMP/s10.out")" "E-MEM-05|SQLite FTS5" "selftest em hindi -> E-MEM-05 com o motivo"
grep -q 'lang=en agent=en' "$WS_TMP/s10.log" && ok || ko "selftest pedido com AGENT_MEMORY_LANG=en e MEMORIA_LANG=en"
printf '#!/bin/sh\nprintf "Memory 0.4.0 \302\267 Python 3.12.13\\n  [OK] SQLite 3.50 with FTS5\\nselftest: OK\\n"\n' > "$FAKE"
( WS_CUR=10; WS_STEP_LOG="$WS_TMP/s10.log"; ws_memory_selftest "$FAKE" 0.4.0; printf '%s|%s' "$SD_10" "$SW_10" ) > "$WS_TMP/s10.out"
eq "$(cat "$WS_TMP/s10.out")" "Agent Memory app 0.4.0 (Python 3.12.13 managed by uv, FTS5 ok)|" "selftest em ingles (app 0.4.0)"

# --- app Agent Memory: pasta dos dados, nome do wheel e registo MCP (o contrato da app)
MH="$WS_TMP/mh"; mkdir -p "$MH"
eq "$(HOME=$MH; AGENT_MEMORY_HOME=/x/a; MEMORIA_HOME=/x/m; ws_memory_home)" /x/a "memory home: AGENT_MEMORY_HOME primeiro"
eq "$(HOME=$MH; AGENT_MEMORY_HOME=; MEMORIA_HOME=/x/m; ws_memory_home)" /x/m "memory home: MEMORIA_HOME (legado)"
eq "$(HOME=$MH; AGENT_MEMORY_HOME=; MEMORIA_HOME=; ws_memory_home)" "$MH/.agent-memory" "memory home: por omissao ~/.agent-memory"
mkdir -p "$MH/.memoria"
eq "$(HOME=$MH; AGENT_MEMORY_HOME=; MEMORIA_HOME=; ws_memory_home)" "$MH/.memoria" "memory home: ~/.memoria antiga, sem ~/.agent-memory"
# shellcheck disable=SC2088
eq "$(HOME=$MH; AGENT_MEMORY_HOME=; MEMORIA_HOME=; ws_memory_home_show)" "~/.memoria" "memory home: mostrado com ~"
mkdir -p "$MH/.agent-memory"
eq "$(HOME=$MH; AGENT_MEMORY_HOME=; MEMORIA_HOME=; ws_memory_home)" "$MH/.agent-memory" "memory home: ~/.agent-memory ganha se existir"
printf '%s  agent_memory-0.5.0-py3-none-any.whl\n%s  constraints.txt\n' "$(printf 'a%.0s' $(seq 64))" "$(printf 'b%.0s' $(seq 64))" > "$WS_TMP/sums"
eq "$(ws_memory_wheel 0.5.0 "$WS_TMP/sums")" agent_memory-0.5.0-py3-none-any.whl "wheel pelo SHA256SUMS"
eq "$(ws_memory_wheel 0.4.1 "$WS_TMP/sums")" memoria-0.4.1-py3-none-any.whl "wheel antigo quando nao esta no SHA256SUMS"
CM="$WS_TMP/cm"; mkdir -p "$CM/ws"; : > "$CM/memoria"
printf '#!/bin/sh\nd=%s\ncase "$1 $2" in\n "mcp get") [ -f "$d/$3" ] && cat "$d/$3";;\n "mcp remove") rm -f "$d/$5";;\n "mcp add") printf "%%s\\n" "$*" > "$d/$5";;\nesac\n' "$CM" > "$CM/claude"; chmod +x "$CM/claude"
( CLAUDE_CONFIG_DIR="$CM/sem-claude-json"; WS_CLAUDE="$CM/claude"; WS_HOME="$CM/ws"; KIT_SRC=""; WS_STEP_LOG="$WS_TMP/s10.log"; ws_memory_mcp /u/bin/agent-memory ) >/dev/null 2>&1
[ ! -f "$CM/memoria" ] && grep -q 'mcp add --scope user agent-memory -e PYTHONHOME= -e PYTHONPATH= -e PYTHONSTARTUP= -- /u/bin/agent-memory mcp' "$CM/agent-memory" && ok || ko "mcp: o registo memoria sai e entra agent-memory"
( CLAUDE_CONFIG_DIR="$CM/sem-claude-json"; WS_CLAUDE="$CM/claude"; WS_HOME="$CM/ws"; KIT_SRC=""; WS_STEP_LOG="$WS_TMP/s10.log"; ws_memory_mcp /u/bin/agent-memory ) >/dev/null 2>&1; eq "$(grep -c . "$CM/agent-memory")" 1 "mcp: ja registado com o mesmo programa, nao muda"

# --- passo 9: migracao do projeto de treino e da tag da Arena (sem perder trabalho)
M9="$WS_TMP/m9"; mkdir -p "$M9/demo-project" "$M9/exemplo-projeto-real"; : > "$M9/demo-project/.arena-kit.json"; : > "$M9/exemplo-projeto-real/.sandbox-kit.json"; printf 'meu\n' > "$M9/exemplo-projeto-real/trabalho.txt"
( cd "$M9/demo-project" && git init -q && git -c user.email=t@t -c user.name=t commit -q --allow-empty -m x && git tag arena-inicial ) >/dev/null 2>&1
( WS_PROJ=$M9; ws_s9_migrate )
git -C "$M9/demo-project" rev-parse -q --verify refs/tags/arena-start >/dev/null 2>&1 && ok || ko "s9: tag arena-start a partir de arena-inicial"
eq "$(cat "$M9/practice-project/trabalho.txt" 2>/dev/null)|$([ -e "$M9/exemplo-projeto-real" ] && echo antiga)" "meu|" "s9: exemplo-projeto-real movido para practice-project"
mkdir -p "$M9/exemplo-projeto-real"; : > "$M9/exemplo-projeto-real/.sandbox-kit.json"
( WS_PROJ=$M9; ws_s9_migrate ); [ -d "$M9/exemplo-projeto-real" ] && [ -f "$M9/practice-project/trabalho.txt" ] && ok || ko "s9: com as duas pastas, nada se move"
grep -nE '(^|[;&|(`]|[$][(])[[:space:]]*(python3?|py)([.]exe)?([[:space:]]|$)' "$ROOT/setup/setup-mac.sh" | grep -v '^[0-9]*:[[:space:]]*#' | grep -q . && ko "setup-mac.sh chama python" || ok

# --- passo 7: MCP + Atlassian CLI de reserva (claude e acli falsos, tarball local, sem rede)
S7="$WS_TMP/s7"; mkdir -p "$S7/stub" "$S7/home" "$S7/tar/acli_9.9.9-stable_darwin_arm64"
printf '#!/bin/sh\ncase "$1 $2" in\n "mcp get") [ -f "%s/mcp" ];;\n "mcp add") : > "%s/mcp";;\n "mcp list") echo "atlassian: https://mcp (HTTP)";;\nesac\n' "$S7" "$S7" > "$S7/claude"
printf '#!/bin/sh\ncase "$1" in --version) echo "acli version 9.9.9-stable";; *) exit "${ACLI_FAKE_AUTH:-1}";; esac\n' > "$S7/tar/acli_9.9.9-stable_darwin_arm64/acli"
chmod +x "$S7/claude" "$S7/tar/acli_9.9.9-stable_darwin_arm64/acli"
tar -czf "$S7/acli_9.9.9-stable_darwin_arm64.tar.gz" -C "$S7/tar" acli_9.9.9-stable_darwin_arm64
s7() { # modo existe_mcp acli_no_path sha_certo -> rc|SD|SW|SF|SN ; corre num subshell com HOME e WS_HOME temporarios
  ( HOME="$S7/home"; WS_HOME="$S7/home/.ws"; rm -rf "$WS_HOME" "$S7/mcp"; mkdir -p "$WS_HOME/bin"; [ "$2" = 1 ] && : > "$S7/mcp"
    PATH="$S7/stub:/usr/bin:/bin"; rm -f "$S7/stub/acli"; [ "$3" = 1 ] && cp "$S7/tar/acli_9.9.9-stable_darwin_arm64/acli" "$S7/stub/acli"
    WS_MODE=$1; WS_SIM=1; WS_ARCH=arm64; WS_CLAUDE="$S7/claude"; WS_CUR=7; WS_STEP_LOG="$S7/log"; KIT_SRC=""
    C_ACLI_VERSION=9.9.9-stable; C_ACLI_MAC_URL="file://$S7/{file}"; C_ACLI_MAC_FILE_ARM64=acli_9.9.9-stable_darwin_arm64.tar.gz
    C_ACLI_MAC_SHA256_ARM64=$(ws_sha256 "$S7/acli_9.9.9-stable_darwin_arm64.tar.gz"); [ "$4" = 0 ] && C_ACLI_MAC_SHA256_ARM64=0000
    SD_7=""; SW_7=""; SF_7=""; SN_7=""
    if ws_s7_detect >/dev/null; then rc=0; elif [ "$1" = install ]; then SF_7=""; if ws_s7_install >/dev/null; then rc=0; else rc=2; fi; else rc=1; fi
    [ -x "$WS_HOME/bin/acli" ] && inst=bin || inst=-
    printf '%s|%s|%s|%s|%s|%s' "$rc" "$inst" "$SD_7" "${SW_7%%|*}" "${SF_7%%|*}" "$(printf '%s' "$SN_7" | grep -c 'acli auth login')" ) 2>/dev/null
}
if [ -n "${M_ui_s7_ja_acli:-}" ]; then
  eq "$(s7 check 1 1 1)" "0|-|atlassian (user scope) · Atlassian CLI 9.9.9 (backup)|||1" "s7 check: acli no PATH, sem login = nota"
  eq "$(ACLI_FAKE_AUTH=0 s7 check 1 1 1)" "0|-|atlassian (user scope) · Atlassian CLI 9.9.9 (backup)|||0" "s7 check: acli com login"
  eq "$(s7 check 1 0 1)" "0|-|atlassian (user scope)|E-ACLI-01||0" "s7 check: sem acli = aviso, nao falha"
  eq "$(s7 check 0 1 1)" "1|-|||E-MCP-01|0" "s7 check: sem MCP = falta"
  eq "$(s7 install 1 0 1 | cut -d'|' -f1-4)" "0|bin|atlassian (user scope) · Atlassian CLI 9.9.9 (backup)|" "s7 install: instala o acli em ~/.workshop-claude/bin"
  eq "$(s7 install 0 0 1 | cut -d'|' -f1,2,4)" "0|bin|" "s7 install: MCP e acli de raiz"
  eq "$(s7 install 1 0 0 | cut -d'|' -f1,2,4)" "0|-|E-ACLI-01" "s7 install: SHA errado = aviso e nada instalado"
  eq "$(s7 install 1 0 1 | cut -d'|' -f6)" 1 "s7 install: uma so nota de login (sem duplicados)"
else ko "mensagens s7 nao carregadas"; fi

# --- lingua da maquina (casos partilhados com o Node e o PowerShell: tools/test/language-cases.json)
LC="$ROOT/tools/test/language-cases.json"
if [ -n "$NODE" ]; then
  n=$("$NODE" -e 'console.log(require(process.argv[1]).etiquetas.length)' "$LC"); i=0
  while [ "$i" -lt "$n" ]; do
    IFS="|" read -r inp tag kit <<EOF
$("$NODE" -e 'const c=require(process.argv[1]).etiquetas[+process.argv[2]]; console.log([c.in,c.tag,c.kit].join("|"))' "$LC" "$i")
EOF
    t=$(ws_lang_tag "$inp"); eq "$(ws_lang_kit "${t:-en}")|${t:-en}" "$kit|$tag" "lingua: etiqueta [$inp]"
    i=$((i + 1))
  done
  n=$("$NODE" -e 'console.log(require(process.argv[1]).mac.length)' "$LC"); i=0
  while [ "$i" -lt "$n" ]; do
    for k in nome override apple lc_all lc_messages lang tag; do
      printf -v "L_$k" '%s' "$("$NODE" -e 'process.stdout.write(String(require(process.argv[1]).mac[+process.argv[2]][process.argv[3]]))' "$LC" "$i" "$k")"
    done
    eq "$(ws_lang_pick "$L_override" "$L_apple" "$L_lc_all" "$L_lc_messages" "$L_lang")" "$L_tag" "lingua mac: $L_nome"
    i=$((i + 1))
  done
else ko "lingua: sem node para ler os casos"; fi
( WORKSHOP_LANG=he_IL.UTF-8; ws_lang_detect; printf '%s|%s' "$WS_LANG" "$WS_LANG_KIT" ) > "$WS_TMP/lang.out"
eq "$(cat "$WS_TMP/lang.out")" "he-IL|en" "ws_lang_detect com WORKSHOP_LANG"
grep -q 'defaults read -g AppleLanguages' "$ROOT/setup/setup-mac.sh" && ok || ko "deteta pelo AppleLanguages"
# passo 8: a saida do install-user da a nota da lingua
( WS_CUR=8; WS_LANG=pt-PT; WS_LANG_KIT=pt; SN_8=""; ws_s8_parse "$(printf 'skills\t7\nagentes\t6\nlingua_kit\tpt\nlanguage\tEuropean Portuguese\nlanguage_nossa\t1\n')"; printf '%s' "$SN_8" ) > "$WS_TMP/s8.out"
grep -q 'Claude answers in European Portuguese' "$WS_TMP/s8.out" && grep -q 'Workshop texts: Portuguese' "$WS_TMP/s8.out" && ok || ko "s8: nota da language nossa [$(cat "$WS_TMP/s8.out")]"
( WS_CUR=8; WS_LANG=es-ES; WS_LANG_KIT=en; SN_8=""; ws_s8_parse "$(printf 'lingua_kit\ten\nlanguage\t\nlanguage_nossa\t0\n')"; printf '%s' "$SN_8" ) > "$WS_TMP/s8.out"
grep -q 'No "language" setting for es-ES' "$WS_TMP/s8.out" && ok || ko "s8: sem language [$(cat "$WS_TMP/s8.out")]"
grep -q -- '--lingua-maquina' "$ROOT/setup/setup-mac.sh" && grep -q -- 'assemble-demo.mjs.*--language' "$ROOT/setup/setup-mac.sh" && ok || ko "passa a lingua ao install-user e a montagem"

# --- o setup so fala ingles: nenhuma frase portuguesa fora do catalogo pt
grep -nE "printf '[^']*(Nao |nao |ja esta|Opcao|Responde|Passo |Excerto|portugues)" "$ROOT/setup/setup-mac.sh" | grep -q . && ko "setup-mac.sh ainda tem texto em portugues" || ok

# --- curl | bash: nenhum shell interativo sem +m (o zsh -i fica com o terminal e o setup e suspenso na pergunta seguinte)
grep -nE -- '-[a-z]*i[a-z]*c ' "$ROOT/setup/setup-mac.sh" | grep -E '"\$sh"|zsh|bash' | grep -v -- '+m' | grep -v '^ *#' | grep -q . && ko "shell interativo sem +m no setup-mac.sh" || ok
# --- definicoes geridas pela empresa: so uma nota, sem aviso
grep -q 'ws_warn E-CFG-01' "$ROOT/setup/setup-mac.sh" && ko "E-CFG-01 ainda e um aviso" || ok

# --- alinhamento com acentos
eq "$(ws_pad 'Memória' 9)|" "Memória  |" ws_pad

# --- chaos G7-language: locale C/invalido, WORKSHOP_LANG desconhecido e lingua guardada na instalacao
# (1) o que nao e uma etiqueta nao da informacao (casos partilhados 'invalidas'), sem stderr nem glob
if [ -n "$NODE" ]; then
  n=$("$NODE" -e 'console.log(require(process.argv[1]).invalidas.length)' "$LC"); i=0
  while [ "$i" -lt "$n" ]; do
    inp=$("$NODE" -e 'process.stdout.write(require(process.argv[1]).invalidas[+process.argv[2]].in)' "$LC" "$i")
    eq "$(ws_lang_tag "$inp")" "" "lingua invalida [$inp]"
    i=$((i + 1))
  done
else ko "lingua: sem node para ler os casos invalidas"; fi
G7="$WS_TMP/g7"; mkdir -p "$G7/glob/pt-Desktop" "$G7/glob/pt-Documents" "$G7/home/kit" "$G7/proj/demo-project" "$G7/proj/practice-project"
LATIN1=$(printf 'Portugu\352s')
for loc in en_US.UTF-8 pt_BR.UTF-8 C en_US.utf8; do
  eq "$( (export LC_ALL=$loc; ws_lang_tag "$LATIN1") 2>&1)" "" "lingua: byte Latin-1 sem stderr ($loc)"
done
eq "$(cd "$G7/glob" && ws_lang_tag 'pt-*')|$(cd "$G7/glob" && ws_lang_tag 'pt_*')" "|" "lingua: pt-* nao expande nomes de ficheiros"
g7_apple() { printf '(\n    "%s",\n    "pt-BR"\n)\n' "$1"; }
g7_detect() { # WORKSHOP_LANG primeira_lingua_do_AppleLanguages -> WS_LANG|KIT|GUARDADA|MAQUINA|IGNORADA (+stderr)
  ( defaults() { g7_apple "$G7_APPLE"; }; G7_APPLE=$2; WS_HOME="$G7/home"; unset LC_ALL LC_MESSAGES LANG
    if [ -n "$1" ]; then WORKSHOP_LANG=$1; else unset WORKSHOP_LANG; fi
    ws_lang_detect; printf '%s|%s|%s|%s|%s' "$WS_LANG" "$WS_LANG_KIT" "$WS_LANG_GUARDADA" "$WS_LANG_MAQUINA" "$WS_LANG_IGNORADA" ) 2>&1
}
# (2) WORKSHOP_LANG desconhecido: nota e lingua da maquina (o AppleLanguages pt-BR ganha a "br")
rm -f "$G7/home/kit/"*.json
eq "$(g7_detect br pt-BR)" "pt-BR|pt||pt-BR|br" "ws_lang_detect: WORKSHOP_LANG=br ignorado"
eq "$(cd "$G7/glob" && g7_detect 'pt-*' pt-BR)" "pt-BR|pt||pt-BR|pt-*" "ws_lang_detect: WORKSHOP_LANG=pt-* ignorado, sem glob"
eq "$(g7_detect "$LATIN1" pt-BR | LC_ALL=C tr -d '\200-\377')" "pt-BR|pt||pt-BR|Portugus" "ws_lang_detect: Latin-1 ignorado, sem stderr"
eq "$(g7_detect pt-PT en-US)" "pt-PT|pt||en-US|" "ws_lang_detect: WORKSHOP_LANG valido ganha"
( WS_CUR=0; SN_0=""; WS_LANG=pt-BR; WS_LANG_IGNORADA=br; ws_s0_lang_notes; printf '%s' "$SN_0" ) > "$WS_TMP/g7.out"
grep -q 'WORKSHOP_LANG=br is not one of the workshop languages' "$WS_TMP/g7.out" && grep -q 'used pt-BR' "$WS_TMP/g7.out" && ok || ko "s0: nota do WORKSHOP_LANG ignorado [$(cat "$WS_TMP/g7.out")]"
# (3) a lingua guardada na instalacao (pt num Mac em ingles) fica nas execucoes seguintes; so o WORKSHOP_LANG a muda
printf '{\n  "language": "pt",\n  "machine": "pt"\n}\n' > "$G7/home/kit/language.json"
eq "$(g7_detect '' en-BR)" "pt|pt|pt|en-BR|" "ws_lang_detect: lingua guardada (--check, janela nova)"
eq "$(g7_detect en en-BR)" "en|en||en-BR|" "ws_lang_detect: WORKSHOP_LANG muda a lingua guardada"
eq "$(g7_detect br en-BR)" "pt|pt|pt|en-BR|br" "ws_lang_detect: WORKSHOP_LANG desconhecido nao muda a lingua guardada"
( WS_CUR=0; SN_0=""; WS_LANG=pt; WS_LANG_GUARDADA=pt; WS_LANG_MAQUINA=en-BR; ws_s0_lang_notes; printf '%s' "$SN_0" ) > "$WS_TMP/g7.out"
grep -q 'Kept the language chosen at install (pt); this computer is in en-BR' "$WS_TMP/g7.out" && ok || ko "s0: nota da lingua guardada [$(cat "$WS_TMP/g7.out")]"
( WS_CUR=0; SN_0=""; WS_LANG=pt-BR; WS_LANG_GUARDADA=pt-BR; WS_LANG_MAQUINA=pt-BR; ws_s0_lang_notes; printf '%s' "$SN_0" ) > "$WS_TMP/g7.out"
eq "$(grep -c . "$WS_TMP/g7.out")" 1 "s0: sem nota quando a lingua guardada e a da maquina"
printf '{"machine":"br"}\n' > "$G7/home/kit/language.json"
eq "$(g7_detect '' en-BR)" "en-BR|en||en-BR|" "ws_lang_detect: lingua guardada invalida (br) nao conta"
rm -f "$G7/home/kit/language.json"; printf '{\n  "lingua": "pt",\n  "maquina": "pt-BR"\n}\n' > "$G7/home/kit/lingua.json"
eq "$(g7_detect '' en-US)" "pt-BR|pt|pt-BR|en-US|" "ws_lang_detect: lingua.json antigo (maquina)"
rm -f "$G7/home/kit/"*.json
eq "$(g7_detect '' en-BR)" "en-BR|en||en-BR|" "ws_lang_detect: sem instalacao, a lingua da maquina"
# (4) passo 8 em --check: a lingua instalada diferente da pedida e explicada (nao e "a meio da instalacao")
S8OUT=$(printf 'lingua\ten\nlingua_kit\tpt\nlanguage\tEuropean Portuguese\nlanguage_nossa\t1\nok\t0\nfalta\tlingua do kit (pt -> en)\n')
( WS_CUR=8; WS_MODE=check; WS_LANG=en; WS_LANG_KIT=en; SN_8=""; ws_s8_parse "$S8OUT"; printf '%s' "$SN_8" ) > "$WS_TMP/g7.out"
grep -q 'Language installed here: Portuguese. This run asks for English' "$WS_TMP/g7.out" && ok || ko "s8 check: nota da lingua a mudar [$(cat "$WS_TMP/g7.out")]"
( WS_CUR=8; WS_MODE=install; WS_LANG=en; WS_LANG_KIT=en; SN_8=""; ws_s8_parse "$S8OUT"; printf '%s' "$SN_8" ) > "$WS_TMP/g7.out"
grep -q 'This run asks for' "$WS_TMP/g7.out" && ko "s8 install: nota da lingua a mudar so no --check" || ok
S8OUT=$(printf 'lingua\tpt-BR\nlingua_kit\tpt\nlanguage\tEuropean Portuguese\nlanguage_nossa\t1\nok\t0\nfalta\tlanguage do Claude (European Portuguese -> Brazilian Portuguese)\n')
( WS_CUR=8; WS_MODE=check; WS_LANG=pt-BR; WS_LANG_KIT=pt; SN_8=""; ws_s8_parse "$S8OUT"; printf '%s' "$SN_8" ) > "$WS_TMP/g7.out"
grep -q 'Language installed here: European Portuguese. This run asks for Brazilian Portuguese' "$WS_TMP/g7.out" && ok || ko "s8 check: nota da language do Claude a mudar [$(cat "$WS_TMP/g7.out")]"
S8OUT=$(printf 'lingua\ten\nlingua_kit\t\nok\t0\nfalta\tlingua do kit (- -> en)\n')
( WS_CUR=8; WS_MODE=check; WS_LANG=en; WS_LANG_KIT=en; SN_8=""; ws_s8_parse "$S8OUT"; printf '%s' "$SN_8" ) > "$WS_TMP/g7.out"
grep -q 'This run asks for' "$WS_TMP/g7.out" && ko "s8 check: sem lingua instalada nao e uma mudanca de lingua" || ok
# (5) passo 9: projetos noutra lingua que a do kit dao uma nota (nao mudam sozinhos)
printf '{\n  "version": "v1",\n  "language": "pt"\n}\n' > "$G7/proj/demo-project/.arena-kit.json"
printf '{"created_at":"x","lingua":"pt"}\n' > "$G7/proj/practice-project/.sandbox-kit.json"
( WS_CUR=9; SN_9=""; WS_P1=arena; WS_PROJ="$G7/proj"; WS_PROJ_SHOW='~/workshop-claude'; WS_LANG_KIT=en; ws_s9_lang_check; printf '%s' "$SN_9" ) > "$WS_TMP/g7.out"
grep -q '^~/workshop-claude/demo-project is in Portuguese, and the workshop texts are now in English' "$WS_TMP/g7.out" &&
  grep -q '^~/workshop-claude/practice-project is in Portuguese' "$WS_TMP/g7.out" && ok || ko "s9: nota dos projetos noutra lingua [$(cat "$WS_TMP/g7.out")]"
( WS_CUR=9; SN_9=""; WS_P1=arena; WS_PROJ="$G7/proj"; WS_PROJ_SHOW='~/workshop-claude'; WS_LANG_KIT=pt; ws_s9_lang_check; printf '%s' "$SN_9" ) > "$WS_TMP/g7.out"
eq "$(grep -c . "$WS_TMP/g7.out")" 0 "s9: projetos na lingua do kit, sem nota"
# Com o Canivete (o Projeto 1 por defeito) conta a marca dele; uma Arena antiga ao lado nao da nota.
mkdir -p "$G7/proj/canivete-project"; printf '{"version":"v1","language":"pt"}\n' > "$G7/proj/canivete-project/.canivete-kit.json"
( WS_CUR=9; SN_9=""; WS_P1=canivete; WS_PROJ="$G7/proj"; WS_PROJ_SHOW='~/workshop-claude'; WS_LANG_KIT=en; ws_s9_lang_check; printf '%s' "$SN_9" ) > "$WS_TMP/g7.out"
grep -q '^~/workshop-claude/canivete-project is in Portuguese' "$WS_TMP/g7.out" && ! grep -q 'demo-project' "$WS_TMP/g7.out" && ok || ko "s9: nota do Canivete noutra lingua, sem a Arena [$(cat "$WS_TMP/g7.out")]"
rm -rf "$G7/proj/canivete-project"
# --- Projeto 1 (WORKSHOP_P1, A4): Canivete por defeito, Arena com WORKSHOP_P1=arena, Arena num kit sem o
# assemble-canivete.mjs
P1K="$WS_TMP/p1kit"; mkdir -p "$P1K/new/installer" "$P1K/old/installer"; : > "$P1K/new/installer/assemble-canivete.mjs"
p1() { ( if [ "$1" = UNSET ]; then unset WORKSHOP_P1; else WORKSHOP_P1=$1; fi; KIT_SRC="$P1K/$2"; ws_p1_pick; printf '%s|%s|%s|%s' "$WS_P1" "$WS_P1_IGNORADO" "$(ws_p1_dir)" "$(ws_p1_mark)" ); }
eq "$(p1 UNSET new)" "canivete||canivete-project|.canivete-kit.json" "ws_p1_pick: sem WORKSHOP_P1, o Canivete"
eq "$(p1 '' new)" "canivete||canivete-project|.canivete-kit.json" "ws_p1_pick: WORKSHOP_P1 vazio, o Canivete"
eq "$(p1 canivete new)" "canivete||canivete-project|.canivete-kit.json" "ws_p1_pick: canivete"
eq "$(p1 CANIVETE new)" "canivete||canivete-project|.canivete-kit.json" "ws_p1_pick: CANIVETE"
eq "$(p1 arena new)" "arena||demo-project|.arena-kit.json" "ws_p1_pick: arena"
eq "$(p1 ARENA new)" "arena||demo-project|.arena-kit.json" "ws_p1_pick: ARENA"
eq "$(p1 ' Arena ' new)" "arena||demo-project|.arena-kit.json" "ws_p1_pick: espacos a volta nao contam"
eq "$(p1 pocket new)" "canivete|pocket|canivete-project|.canivete-kit.json" "ws_p1_pick: valor invalido, o Canivete e o valor ignorado"
eq "$(p1 "$(printf 'x[31my')" new)" "canivete|x[31my|canivete-project|.canivete-kit.json" "ws_p1_pick: o valor ignorado sem caracteres de controlo"
eq "$(p1 "$(printf 'a%.0s' $(seq 60))" new | cut -d'|' -f2 | wc -c | tr -d ' ')" 41 "ws_p1_pick: o valor ignorado fica com 40 caracteres"
eq "$(p1 UNSET old)" "arena||demo-project|.arena-kit.json" "ws_p1_pick: kit sem assemble-canivete.mjs, a Arena"
eq "$(p1 canivete old)" "arena||demo-project|.arena-kit.json" "ws_p1_pick: kit sem assemble-canivete.mjs, a Arena mesmo com canivete"
eq "$(p1 xpto old)" "arena||demo-project|.arena-kit.json" "ws_p1_pick: kit sem assemble-canivete.mjs, sem nota"
# A escolha gravada ao instalar (extra "opcao p1" do manifest): sem WORKSHOP_P1, o --check ve o Projeto 1 instalado.
P1H="$WS_TMP/p1home"; mkdir -p "$P1H/.workshop-claude" "$P1K/real"; cp -R "$ROOT/installer" "$P1K/real/"; cp -R "$ROOT/hooks" "$ROOT/telemetry" "$P1K/real/"
p1s() { ( HOME="$P1H"; WS_HOME="$P1H/.workshop-claude"; WS_NODE=$NODE; WS_MODE=${P1S_MODE:-check}; if [ "$1" = UNSET ]; then unset WORKSHOP_P1; else WORKSHOP_P1=$1; fi; KIT_SRC="$P1K/${2:-real}"; ws_p1_pick; printf '%s|%s' "$WS_P1" "$WS_P1_IGNORADO" ); }
printf 'opcao\tp1\t\tarena\t\n' > "$P1H/.workshop-claude/extras-pendentes.tsv"
eq "$(p1s UNSET)" "arena|" "ws_p1_pick: sem WORKSHOP_P1, a escolha por registar (extras-pendentes.tsv)"
eq "$(p1s canivete)" "canivete|" "ws_p1_pick: WORKSHOP_P1 ganha a escolha gravada"
rm -f "$P1H/.workshop-claude/extras-pendentes.tsv"
if [ -n "$NODE" ]; then
  ( HOME="$P1H"; WS_HOME="$P1H/.workshop-claude"; WS_NODE=$NODE; KIT_SRC="$P1K/real"; WS_MODE=install; WS_P1=arena; ws_p1_save )
  eq "$(p1s UNSET)" "arena|" "ws_p1_pick: sem WORKSHOP_P1, a escolha do manifest (gravada pelo ws_p1_save)"
  eq "$(p1s '')" "arena|" "ws_p1_pick: WORKSHOP_P1 vazio, a escolha do manifest"
  eq "$(p1s arena)" "arena|" "ws_p1_pick: arena com arena gravada"
  eq "$(p1s pocket)" "canivete|pocket" "ws_p1_pick: valor invalido nao usa a escolha gravada"
  eq "$(P1S_MODE=doctor p1s UNSET)" "arena|" "ws_p1_pick: o --doctor tambem le a escolha gravada"
  eq "$(P1S_MODE=install p1s UNSET)" "canivete|" "ws_p1_pick: ao instalar, sem WORKSHOP_P1 continua o Canivete (A4)"
  ( HOME="$P1H"; WS_HOME="$P1H/.workshop-claude"; WS_NODE=$NODE; KIT_SRC="$P1K/real"; WS_MODE=check; WS_P1=canivete; ws_p1_save )
  eq "$(p1s UNSET)" "arena|" "ws_p1_save: o --check nunca grava"
  ( HOME="$P1H"; WS_HOME="$P1H/.workshop-claude"; WS_NODE=$NODE; KIT_SRC="$P1K/real"; WS_MODE=install; WS_P1=canivete; ws_p1_save )
  eq "$(p1s UNSET)" "canivete|" "ws_p1_save: a escolha nova substitui a anterior"
  grep -q '"tipo": "opcao"' "$P1H/.workshop-claude/manifest.json" && ok || ko "ws_p1_save: o extra opcao no manifest do HOME do setup"
fi
# (6) a contagem dos testes da app nao depende do locale (no C o [#ℹ] do sed apanhava so o primeiro byte)
NODE_OUT=$(printf '✔ pass 3 a test named pass\nℹ tests 16\nℹ pass 16\nℹ fail 0\n')
for loc in C en_US.utf8 en_US.UTF-8 ''; do
  eq "$( (if [ -n "$loc" ]; then export LC_ALL=$loc; else unset LC_ALL LANG LC_CTYPE; fi; printf '%s\n' "$NODE_OUT" | ws_count_pass) 2>&1)" 16 "ws_count_pass [${loc:-sem locale}]"
done
eq "$(printf '# tests 7\n# pass 7\n# fail 0\n' | ws_count_pass)" 7 "ws_count_pass: TAP antigo"
# (7) com um locale invalido o shasum (perl) e o tar nao escrevem no terminal: so ws_sha256 e tar com o stderr no log
eq "$(grep -c 'shasum -a 256' "$ROOT/setup/setup-mac.sh")" 1 "shasum so dentro de ws_sha256"
grep -nE '(^|[;&|(]|then|&&)[[:space:]]*tar -x' "$ROOT/setup/setup-mac.sh" | grep -v 'ws_run tar' | grep -v '2>>' | grep -q . && ko "tar -x com o stderr no terminal" || ok
# --- chaos G1-tty: o terminal novo (passo 4) nunca usa o terminal da pessoa; teclas escritas antes das perguntas; sem tty
G1="$WS_TMP/g1"; mkdir -p "$G1/old/bin"
printf '#!/bin/sh\necho v18.20.4\n' > "$G1/old/bin/node"; chmod +x "$G1/old/bin/node"
# corre "$@" no maximo $1 segundos (o macOS nao tem timeout); devolve 124 se teve de o matar
g1_timeout() { local s=$1 p i=0; shift; "$@" <&0 & p=$!; while kill -0 "$p" 2>/dev/null; do [ "$i" -ge $((s * 5)) ] && { kill -9 "$p" 2>/dev/null; wait "$p" 2>/dev/null; return 124; }; sleep 0.2; i=$((i + 1)); done; wait "$p"; }
# HOME com o node do kit (falso, v24) e o bloco do workshop (o ws_profile_update a serio); $2 vai para o fim do .zshrc
g1_home() {
  local h="$G1/$1"; mkdir -p "$h/.workshop-claude/node/bin"
  printf '#!/bin/sh\necho v24.22.0\n' > "$h/.workshop-claude/node/bin/node"; chmod +x "$h/.workshop-claude/node/bin/node"
  ( HOME=$h; SHELL=/bin/zsh; WS_HOME="$h/.workshop-claude"; WS_MODE=install; WS_NODE_BIN_DIR="$h/.workshop-claude/node/bin"; KIT_SRC=""; ws_profile_update )
  [ -z "${2:-}" ] || printf '%s\n' "$2" >> "$h/.zshrc"
  printf '%s' "$h"
}
# major e segundos; o PATH do setup ja tem um node antigo a frente (o terminal novo nao o herda)
g1_probe() {
  local t0 m; t0=$(date +%s)
  m=$(HOME=$1; SHELL=/bin/zsh; WS_NODE=$NODE; WS_NEWTERM_SECS=3; PATH="$G1/old/bin:$1/.workshop-claude/node/bin:$PATH"; ws_login_node_major 2>"$G1/err")
  printf '%s %s' "$m" $(( $(date +%s) - t0 ))
}
g1_le2() { [ "${1#* }" -le "$2" ] 2>/dev/null; }
if [ -n "$NODE" ] && [ -x /bin/zsh ]; then
  r=$(g1_probe "$(g1_home base)"); eq "${r%% *}" 24 "G1 terminal novo: o node do kit, nao o antigo herdado do PATH do setup"
  r=$(g1_probe "$(g1_home ler 'read -q "?go [y]? "; read -r x </dev/tty')"); eq "${r%% *}" 24 "G1 terminal novo: .zshrc que le do terminal"
  g1_le2 "$r" 2 && ok || ko "G1 terminal novo: .zshrc que le do terminal demorou [$r]"
  r=$(g1_probe "$(g1_home monitor 'setopt monitor')"); eq "${r%% *}" 24 "G1 terminal novo: setopt monitor no .zshrc"
  r=$(g1_probe "$(g1_home execfalse 'exec false')"); eq "${r%% *}" unknown "G1 terminal novo: exec no .zshrc = unknown (nao e um Node antigo)"
  h=$(g1_home lento '"$HOME/rc-lento.sh"'); printf '#!/bin/sh\nsleep 30\n' > "$h/rc-lento.sh"; chmod +x "$h/rc-lento.sh"
  r=$(g1_probe "$h"); eq "${r%% *}" unknown "G1 terminal novo: .zshrc que nao acaba = unknown"
  g1_le2 "$r" 5 && ok || ko "G1 terminal novo: limite de tempo nao cumprido [$r]"
  sleep 0.3; pgrep -f "$h/rc-lento.sh" >/dev/null && ko "G1 terminal novo: ficou um processo do .zshrc a correr" || ok
  h=$(g1_home fundo '"$HOME/rc-fundo.sh" &!'); printf '#!/bin/sh\nsleep 30\n' > "$h/rc-fundo.sh"; chmod +x "$h/rc-fundo.sh"
  r=$(g1_probe "$h"); eq "${r%% *}" 24 "G1 terminal novo: processo deixado a correr pelo .zshrc"
  g1_le2 "$r" 2 && ok || ko "G1 terminal novo: esperou pelo processo do .zshrc [$r]"
  sleep 0.3; pgrep -f "$h/rc-fundo.sh" >/dev/null && ko "G1 terminal novo: o processo do .zshrc ficou a correr" || ok
  # Homebrew com um node que rebenta (dyld): no .zprofile antes do bloco o kit ganha; no .zshrc depois dele e um aviso verdadeiro
  h=$(g1_home brew); mkdir -p "$h/hb/bin"; printf '#!/bin/sh\necho "dyld: Library not loaded" >&2\nkill -ABRT $$\n' > "$h/hb/bin/node"; chmod +x "$h/hb/bin/node"
  { printf 'export PATH="$HOME/hb/bin:$PATH"\n'; cat "$h/.zprofile"; } > "$h/zp" && mv "$h/zp" "$h/.zprofile"
  r=$(g1_probe "$h"); eq "${r%% *}" 24 "G1 terminal novo: brew shellenv antes do bloco do workshop"
  [ -s "$G1/err" ] && ko "G1 terminal novo: escreveu no ecra [$(head -c 200 "$G1/err")]" || ok
  printf 'export PATH="$HOME/hb/bin:$PATH"\n' >> "$h/.zshrc"
  r=$(g1_probe "$h"); eq "${r%% *}" none "G1 terminal novo: node que rebenta a frente = none (aviso E-NODE-02)"
  [ -s "$G1/err" ] && ko "G1 terminal novo: 'Abort trap' no ecra [$(head -c 200 "$G1/err")]" || ok
  # num terminal a serio (pty do script): a sonda nao tem terminal de controlo e o compinit/read -q nao aparece
  if command -v script >/dev/null 2>&1; then
    printf '%s\n' 'WS_SOURCE_ONLY=1; . "$1"; WS_TMP=$2; WS_LOG=/dev/null; WS_NODE=$3; WS_NEWTERM_SECS=5' \
      '{ : </dev/tty; } 2>/dev/null && echo CONTROLO-COM-TTY' \
      'echo "NT-$(HOME=$4; SHELL=/bin/zsh; ws_newterm "{ : </dev/tty; } 2>/dev/null && echo COM-TTY || echo SEM-TTY")"' \
      'echo "MAJOR-$(HOME=$4; SHELL=/bin/zsh; ws_login_node_major)"' > "$G1/pty-probe.sh"
    g1_timeout 20 script -q /dev/null /bin/bash "$G1/pty-probe.sh" "$ROOT/setup/setup-mac.sh" "$G1" "$NODE" "$G1/ler" </dev/null > "$G1/pty.out" 2>&1
    eq "$?" 0 "G1 pty: a sonda acabou"
    grep -q CONTROLO-COM-TTY "$G1/pty.out" && grep -q 'NT-SEM-TTY' "$G1/pty.out" && ok || ko "G1 pty: a sonda ainda tem o terminal [$(tr -d '\r' < "$G1/pty.out" | tr '\n' ' ')]"
    grep -q 'MAJOR-24' "$G1/pty.out" && ok || ko "G1 pty: major com .zshrc que le do terminal [$(tr -d '\r' < "$G1/pty.out" | tr '\n' ' ')]"
    grep -q 'go \[y\]' "$G1/pty.out" && ko "G1 pty: a pergunta do .zshrc apareceu no terminal" || ok
  fi
else ko "G1: sem node ou sem /bin/zsh para testar o terminal novo"; fi

# passo 4: --uninstall nao corre o perfil; um shell que nao responde da uma nota e nao o E-NODE-02; um node antigo da o aviso
if [ -n "$NODE" ]; then
  FS="$G1/shell-falso"; printf '#!/bin/sh\necho chamado >> "$HOME/chamado"\n[ -f "$HOME/lento" ] && exec sleep 20\necho WS-NEWTERM; echo v18.1.0\n' > "$FS"; chmod +x "$FS"
  g1_s4() { ( HOME=$G1/s4; mkdir -p "$HOME"; SHELL=$FS; WS_MODE=$1; WS_NODE=$NODE; WS_HOME="$HOME/.workshop-claude"; C_NODE_MIN_MAJOR=22; C_NODE_VERSION=24.22.0
    WS_NEWTERM_SECS=2; WS_CUR=4; SW_4=""; SN_4=""; SD_4=""; KIT_SRC=""; ws_s4_detect >/dev/null 2>&1; printf '%s#%s' "$SW_4" "$SN_4" ); }
  r=$(g1_s4 check); eq "${r%%#*}" "E-NODE-02|v18
" "G1 s4: node antigo num terminal novo = E-NODE-02"
  rm -f "$G1/s4/chamado"; g1_s4 uninstall >/dev/null; [ -f "$G1/s4/chamado" ] && ko "G1 s4: o --uninstall correu o perfil da pessoa" || ok
  : > "$G1/s4/lento"; r=$(g1_s4 check)
  case "$r" in "#Could not check which Node a new terminal finds"*"2 s"*) ok ;; *) ko "G1 s4: shell sem resposta deu [$r]" ;; esac
fi

# perguntas: o que foi escrito antes e deitado fora; respostas que nao sao s/n repetem a pergunta (pty do script)
if command -v script >/dev/null 2>&1 && [ -n "${M_ui_sn_repetir:-}" ]; then
  ( for v in $(set | sed -n 's/^\(M_ui_[A-Za-z0-9_]*\)=.*/\1/p'); do printf '%s=%q\n' "$v" "${!v}"; done ) > "$G1/msgs.sh"
  printf '%s\n' 'WS_SOURCE_ONLY=1; . "$1"; WS_LOG=$2; WS_SIM=0; WS_FILL_KEYS=""; . "$3"; sleep 1' \
    'if ws_ask "Log in to GitHub now?" s; then echo RESULT=yes; else echo RESULT=no; fi' \
    'case "$(stty -a </dev/tty)" in *-icanon*) echo TTY=raw ;; *) echo TTY=normal ;; esac' > "$G1/ask.sh"
  g1_ask() { # antes respostas... -> RESULT=... TTY=... e quantas vezes repetiu
    local antes=$1 a i=0; shift; : > "$G1/ask.out"
    { printf '%b' "$antes"
      while ! grep -q '? Log in' "$G1/ask.out" 2>/dev/null && [ "$i" -lt 50 ]; do sleep 0.2; i=$((i + 1)); done
      for a in "$@"; do sleep 0.3; printf '%b' "$a"; done; sleep 1; } |
      g1_timeout 20 script -q /dev/null /bin/bash "$G1/ask.sh" "$ROOT/setup/setup-mac.sh" /dev/null "$G1/msgs.sh" > "$G1/ask.out" 2>&1
    printf '%s %s %s' "$(grep -o 'RESULT=[a-z]*' "$G1/ask.out")" "$(grep -o 'TTY=[a-z]*' "$G1/ask.out")" "$(grep -cF "$M_ui_sn_repetir" "$G1/ask.out")"
  }
  eq "$(g1_ask '\n' 'n\n')" "RESULT=no TTY=normal 0" "G1 ask: um Enter escrito antes nao responde"
  eq "$(g1_ask '\n\ncurl -fsSL http://x/setup-mac.sh | bash\n' 'n\n')" "RESULT=no TTY=normal 0" "G1 ask: o comando colado outra vez nao responde"
  eq "$(g1_ask 'abc' 'n\n')" "RESULT=no TTY=normal 0" "G1 ask: texto meio escrito antes"
  eq "$(g1_ask '' 'maybe\n' 'y\n')" "RESULT=yes TTY=normal 1" "G1 ask: resposta que nao e s/n repete a pergunta"
  eq "$(g1_ask '' 'a\n' 'b\n' 'c\n')" "RESULT=no TTY=normal 2" "G1 ask: tres respostas invalidas = nao"
  eq "$(g1_ask '' '\n')" "RESULT=yes TTY=normal 0" "G1 ask: Enter = o defeito"
  eq "$(g1_ask '' '  N \n')" "RESULT=no TTY=normal 0" "G1 ask: espacos a volta da resposta"
fi

# sem terminal (agente de IA, tarefa do IDE): o passo 3 diz onde fazer o login; cores so num terminal que as mostra
r=$( ws_has_tty() { return 1; }; WS_CUR=3; WS_SIM=0; WS_AUTH_LOGGED=false; SN_3=""; SF_3=""; ws_s3_install >/dev/null 2>&1; printf '%s#%s' "$SF_3" "$SN_3" )
case "$r" in "E-AUTH-01|#"*"Open a normal terminal window"*) ok ;; *) ko "G1 s3 sem terminal: [$r]" ;; esac
grep -q 'E-AUTH-01 "sem terminal"' "$ROOT/setup/setup-mac.sh" && ko "G1: detalhe em portugues no E-AUTH-01" || ok
eq "$(ws_color_detect; printf '%s' "$WS_COLOR")" 0 "G1 cores: stdout que nao e terminal"
if command -v script >/dev/null 2>&1; then
  printf '%s\n' 'WS_SOURCE_ONLY=1; . "$1"; ws_color_detect; printf "C%s\n" "$WS_COLOR"' > "$G1/cor.sh"
  for c in "xterm-256color||C1" "dumb||C0" "xterm-256color|1|C0"; do
    IFS='|' read -r t nc want <<EOF
$c
EOF
    TERM=$t NO_COLOR=$nc g1_timeout 10 script -q /dev/null /bin/bash "$G1/cor.sh" "$ROOT/setup/setup-mac.sh" </dev/null > "$G1/cor.out" 2>&1
    grep -q "$want" "$G1/cor.out" && ok || ko "G1 cores: TERM=$t NO_COLOR=$nc deu [$(tr -d '\r\n' < "$G1/cor.out")], esperado $want"
  done
fi
# Homebrew que falha (Command Line Tools antigas): o passo diz o que esta a instalar e que segue pelo download oficial
HB="$G1/hb"; mkdir -p "$HB/bin"; printf '#!/bin/sh\ncase "$1" in --prefix) echo "%s" ;; install) exit 1 ;; esac\n' "$HB" > "$HB/bin/brew"; chmod +x "$HB/bin/brew"
r=$( PATH="$HB/bin:$PATH"; WS_STEP_LOG="$G1/s6.log"; WS_HOME="$G1/s6h"; WS_ARCH=arm64; C_GH_VERSION=9.9.9; C_GH_RELEASE_URL='http://127.0.0.1:9/{file}'; WS_GH_SEM_LOGIN=""; WS_CUR=6; ws_s6_install 2>/dev/null )
case "$r" in *"(brew install gh)"*"Homebrew could not install it"*) ok ;; *) ko "G1 s6: brew que falha [$r]" ;; esac
# E-GH-02 (sem login no GitHub, a correcao ja esta no ecra): nao oferece a analise paga; os outros codigos sim
eq "$( WS_AUTH_OK=1; SF_6="E-GH-02|"; ws_ask() { printf ASKED; return 1; }; ws_helper_offer 6 2>/dev/null )" "" "G1 ajudante: nao pergunta no E-GH-02"
eq "$( WS_AUTH_OK=1; SF_6="E-GH-01|x"; ws_ask() { printf ASKED; return 1; }; ws_helper_offer 6 2>/dev/null | tr -d '\n' )" "ASKED" "G1 ajudante: pergunta no E-GH-01"
# so o ws_newterm abre um shell interativo (sessao nova, sem terminal, com limite de tempo)
awk '/^ws_newterm\(\)/ {f = 1} f && /^}/ {f = 0; next} !f && /-[a-z]*i[a-z]*c / && /"\$sh"|zsh|bash/ && !/^ *#/' "$ROOT/setup/setup-mac.sh" | grep -q . && ko "G1: shell interativo fora do ws_newterm" || ok
# --- chaos G2-profiles: perfis do shell (ZDOTDIR, bash so com .profile, fish, ligacoes dos dotfiles, Latin-1,
#     blocos antigos partidos, ficheiros sem permissao), o --uninstall e as pastas do workshop a frente do PATH
G2="$WS_TMP/g2"; G2H="$G2/Ana Sá [1]"; mkdir -p "$G2"
g2_home() { chmod -R u+rwx "$G2H" 2>/dev/null; rm -rf "$G2H"; mkdir -p "$G2H/.workshop-claude"; }
g2_update() { # [shell] [vezes] -> corre o ws_profile_update numa HOME de teste (nunca a verdadeira)
  ( unset ZDOTDIR XDG_CONFIG_HOME; HOME=$G2H; SHELL=${1:-/bin/zsh}; WS_HOME="$G2H/.workshop-claude"; WS_MODE=install
    WS_NODE_BIN_DIR=""; KIT_SRC=""; WS_NODE=""; WS_PERFIL_AVISADOS=""; WS_ZDOTDIR_HOME=""; WS_CUR=""
    i=0; while [ "$i" -lt "${2:-1}" ]; do ws_profile_update; i=$((i + 1)); done )
}
g2_blocks() { LC_ALL=C grep -c '^# >>> workshop-claude >>>' "$1" 2>/dev/null; }
# strip: bytes Latin-1 num locale UTF-8, bloco sem fim, fim solto, bloco indentado
printf '# Configura\347\343o do Jo\343o\nalias ll="ls -la"  # \223tudo\224\n' > "$G2/latin1"; cp "$G2/latin1" "$G2/latin1.orig"
printf '\n# >>> workshop-claude >>>\nvelho\n# <<< workshop-claude <<<\n' >> "$G2/latin1"
( export LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8; ws_profile_strip "$G2/latin1" ) > "$G2/latin1.out" 2> "$G2/latin1.err"
cmp -s "$G2/latin1.out" "$G2/latin1.orig" && [ ! -s "$G2/latin1.err" ] && ok || ko "ws_profile_strip le bytes Latin-1 num locale UTF-8 [$(cat "$G2/latin1.err")]"
printf 'a\n# >>> workshop-claude >>>\nvelho\nalias gs=x\n' > "$G2/semfim"
eq "$(ws_profile_strip "$G2/semfim"; printf 'rc=%s' "$?")" "rc=3" "ws_profile_strip recusa um bloco sem fim (nao apaga ate ao fim do ficheiro)"
printf 'a\n# <<< workshop-claude <<<\nb\n' > "$G2/fimsolto"; ws_profile_strip "$G2/fimsolto" >/dev/null; eq "$?" 3 "ws_profile_strip recusa um fim solto"
printf 'a\n  # >>> workshop-claude >>>\n  velho\n  # <<< workshop-claude <<<\nb\n' > "$G2/indent"
eq "$(ws_profile_strip "$G2/indent")" "$(printf 'a\n  :\nb')" "ws_profile_strip tira um bloco indentado (fica um : com a mesma indentacao)"
# ligacoes dos dotfiles: a ligacao fica, o bloco vai para o ficheiro real, 600 continua 600, backup e sem .ws-tmp
g2_home; mkdir -p "$G2H/dotfiles"; printf 'export DOT=1\n' > "$G2H/dotfiles/zprofile"; chmod 600 "$G2H/dotfiles/zprofile"
ln -s dotfiles/zprofile "$G2H/.zprofile"; printf 'export ZRC=1\n' > "$G2H/.zshrc"; chmod 600 "$G2H/.zshrc"
g2_update /bin/zsh 2 > "$G2/out" 2>&1
[ -L "$G2H/.zprofile" ] && [ "$(g2_blocks "$G2H/dotfiles/zprofile")" = 1 ] && [ "$(stat -f %Lp "$G2H/dotfiles/zprofile")" = 600 ] && ok || ko "perfil ligado aos dotfiles: a ligacao fica e o bloco vai para o ficheiro real"
[ "$(stat -f %Lp "$G2H/.zshrc")" = 600 ] && [ "$(g2_blocks "$G2H/.zshrc")" = 1 ] && grep -qx 'export ZRC=1' "$G2H/.zshrc" && ok || ko "perfil 600 continua 600"
ls -a "$G2H" "$G2H/dotfiles" | grep -q 'ws-tmp' && ko "sobrou um .ws-tmp" || ok
[ "$(cat "$G2H/.workshop-claude/backup/profile-.zshrc")" = 'export ZRC=1' ] && [ "$(cat "$G2H/.workshop-claude/backup/profile-.zprofile")" = 'export DOT=1' ] && ok || ko "backup dos perfis antes da primeira alteracao"
[ ! -e "$G2H/.bash_profile" ] && [ ! -s "$G2/out" ] && ok || ko "zsh: sem .bash_profile novo e sem avisos [$(cat "$G2/out")]"
# destino so de leitura e ligacao partida (iCloud): ficam como estavam, um aviso por ficheiro, sem registo
g2_home; mkdir -p "$G2H/ro"; printf 'export RO=1\n' > "$G2H/ro/zprofile"; chmod 444 "$G2H/ro/zprofile"
ln -s ro/zprofile "$G2H/.zprofile"; ln -s "$G2H/iCloud Drive/zshrc" "$G2H/.zshrc"
g2_update /bin/zsh 3 > "$G2/out" 2>&1
[ "$(cat "$G2H/ro/zprofile")" = 'export RO=1' ] && [ -L "$G2H/.zshrc" ] && [ ! -e "$G2H/iCloud Drive" ] && ok || ko "perfil so de leitura ou ligacao partida fica como estava"
eq "$(grep -c 'could not add the workshop folders' "$G2/out")" 2 "um aviso E-PROF-01 por ficheiro, mesmo com 3 chamadas"
grep -q 'perfil' "$G2H/.workshop-claude/extras-pendentes.tsv" 2>/dev/null && ko "registou um perfil em que nao escreveu" || ok
# ... a meio de um passo, o aviso fica no passo (que passa a "com aviso") e nao sai logo no ecra
eq "$( unset ZDOTDIR XDG_CONFIG_HOME ST_2; HOME=$G2H; SHELL=/bin/zsh; WS_HOME="$G2H/.workshop-claude"; WS_MODE=install; KIT_SRC=""; WS_ZDOTDIR_HOME=""
  WS_CUR=2; SW_2=""; ws_profile_update >/dev/null 2>&1; printf '%s' "$SW_2" | tr '\n' ';' )" "E-PROF-01|~/.zshrc;E-PROF-01|~/.zprofile;" "aviso do perfil fica no passo em curso"
# .zshrc em Latin-1 (locale UTF-8) recebe o bloco; .zprofile sem permissao de leitura fica e avisa (sem "awk:")
g2_home; cp "$G2/latin1.orig" "$G2H/.zshrc"; printf 'x\n' > "$G2H/.zprofile"; chmod 000 "$G2H/.zprofile"
( export LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8; g2_update ) > "$G2/out" 2>&1; chmod 600 "$G2H/.zprofile"
head -c "$(wc -c < "$G2/latin1.orig")" "$G2H/.zshrc" | cmp -s - "$G2/latin1.orig" && [ "$(g2_blocks "$G2H/.zshrc")" = 1 ] && ok || ko "perfil Latin-1 recebe o bloco e fica com os bytes da pessoa"
[ "$(cat "$G2H/.zprofile")" = x ] && grep -q 'E-PROF-01' "$G2/out" && ! grep -q 'awk:' "$G2/out" && ok || ko "perfil sem permissao: fica e avisa [$(cat "$G2/out")]"
# bloco antigo sem fim: o ficheiro fica intacto (E-PROF-02); bloco indentado completo: trocado por um novo
g2_home; printf 'export BEFORE=1\n# >>> workshop-claude >>>\nexport PATH=old\nalias gs=x\nexport AFTER=1\n' > "$G2H/.zshrc"; cp "$G2H/.zshrc" "$G2/semfim.orig"
printf 'export Z=1\n  # >>> workshop-claude >>>\n  velho\n  # <<< workshop-claude <<<\n' > "$G2H/.zprofile"
g2_update /bin/zsh 2 > "$G2/out" 2>&1
cmp -s "$G2H/.zshrc" "$G2/semfim.orig" && eq "$(grep -c 'incomplete workshop block' "$G2/out")" 1 "E-PROF-02 uma vez" || ko "perfil com bloco sem fim fica intacto"
[ "$(grep -c 'workshop-claude >>>' "$G2H/.zprofile")" = 1 ] && grep -qx 'export Z=1' "$G2H/.zprofile" && ! grep -q velho "$G2H/.zprofile" && ok || ko "bloco indentado trocado por um novo"
# bash so com .profile: o bloco vai para o .profile e nao se cria um .bash_profile que o esconda
g2_home; mkdir -p "$G2H/.local/bin"; printf 'export PROFILE_MARK=1\n' > "$G2H/.profile"
g2_update /bin/bash 2 >/dev/null 2>&1
[ ! -e "$G2H/.bash_profile" ] && [ "$(g2_blocks "$G2H/.profile")" = 1 ] && ok || ko "bash so com .profile: bloco no .profile, sem .bash_profile"
eq "$(env -i HOME="$G2H" PATH=/usr/bin:/bin /bin/bash -lc 'printf "%s|%s" "$PROFILE_MARK" "${PATH%%:*}"' </dev/null 2>/dev/null)" "1|$G2H/.local/bin" "bash de login le o .profile e tem o ~/.local/bin a frente"
# ... o .bash_profile que uma versao antiga criou so com o bloco por cima do .profile sai
printf '\n# >>> workshop-claude >>>\nvelho\n# <<< workshop-claude <<<\n' > "$G2H/.bash_profile"
g2_update /bin/bash >/dev/null 2>&1
[ ! -e "$G2H/.bash_profile" ] && [ "$(g2_blocks "$G2H/.profile")" = 1 ] && ok || ko "tira o .bash_profile antigo que escondia o .profile"
# bash sem nenhum: cria o .bash_profile, registado como criado; o --uninstall apaga-o (e os outros criados)
g2_home; g2_update /bin/bash >/dev/null 2>&1
grep -qxF "$(printf 'perfil\t%s\t%s\tcriado\t' "$G2H/.bash_profile" "$G2H/.bash_profile")" "$G2H/.workshop-claude/extras-pendentes.tsv" && ok || ko "perfil criado fica registado como criado"
( WS_LOG=/dev/null; for f in .bash_profile .zshrc .zprofile; do ws_profile_remove "$G2H/$f" criado; done ) > "$G2/out"
[ ! -e "$G2H/.bash_profile" ] && [ ! -e "$G2H/.zshrc" ] && [ ! -e "$G2H/.zprofile" ] && eq "$(grep -c 'PATH lines removed' "$G2/out")" 3 "uninstall: 3 perfis" || ko "uninstall apaga os perfis que o setup criou e ficaram vazios"
# uninstall num perfil da pessoa: volta aos bytes de antes (Latin-1); com bloco sem fim: avisa e nao mexe
g2_home; cp "$G2/latin1.orig" "$G2H/.zshrc"; g2_update >/dev/null 2>&1
( export LC_ALL=en_US.UTF-8; ws_profile_remove "$G2H/.zshrc" ) > "$G2/out" 2>&1
cmp -s "$G2H/.zshrc" "$G2/latin1.orig" && grep -q 'PATH lines removed' "$G2/out" && ok || ko "uninstall devolve o perfil da pessoa byte a byte"
cp "$G2/semfim.orig" "$G2H/.zshrc"; ws_profile_remove "$G2H/.zshrc" > "$G2/out" 2>&1
cmp -s "$G2H/.zshrc" "$G2/semfim.orig" && grep -q "couldn't remove the workshop PATH lines" "$G2/out" && ok || ko "uninstall com bloco sem fim avisa e nao mexe"
# ZDOTDIR do ~/.zshenv (exportado ou nao); o ZDOTDIR herdado (VS Code) nao conta
g2_home; printf 'export ZDOTDIR="$HOME/.config/zsh"\n' > "$G2H/.zshenv"; mkdir -p "$G2H/.local/bin"; g2_update >/dev/null 2>&1
[ "$(g2_blocks "$G2H/.config/zsh/.zshrc")" = 1 ] && [ "$(g2_blocks "$G2H/.config/zsh/.zprofile")" = 1 ] && [ ! -e "$G2H/.zshrc" ] && [ ! -e "$G2H/.zprofile" ] && ok || ko "perfil no \$ZDOTDIR do ~/.zshenv"
eq "$(env -i HOME="$G2H" PATH=/usr/bin:/bin /bin/zsh -lc 'printf %s "${PATH%%:*}"' </dev/null 2>/dev/null)" "$G2H/.local/bin" "zsh de login com ZDOTDIR tem o ~/.local/bin a frente"
g2_home; printf 'ZDOTDIR=$HOME/zdot\n' > "$G2H/.zshenv"; g2_update >/dev/null 2>&1
[ "$(g2_blocks "$G2H/zdot/.zprofile")" = 1 ] && ok || ko "perfil no ZDOTDIR nao exportado"
g2_home; ( ZDOTDIR="$G2/vscode-zsh"; export ZDOTDIR; HOME=$G2H; SHELL=/bin/zsh; WS_HOME="$G2H/.workshop-claude"; WS_MODE=install; KIT_SRC=""; WS_ZDOTDIR_HOME=""; unset XDG_CONFIG_HOME; ws_profile_update ) >/dev/null 2>&1
[ "$(g2_blocks "$G2H/.zshrc")" = 1 ] && [ ! -e "$G2/vscode-zsh" ] && ok || ko "ZDOTDIR herdado (VS Code) nao conta"
# fish: um ficheiro so seu em conf.d (SHELL fish, ou ~/.config/fish ja existe); nada para quem nao usa fish
g2_home; g2_update /usr/local/bin/fish >/dev/null 2>&1
grep -q 'fish_add_path -P -m "$HOME/.local/bin" "$HOME/.workshop-claude/bin"' "$G2H/.config/fish/conf.d/workshop-claude.fish" && [ "$(g2_blocks "$G2H/.config/fish/conf.d/workshop-claude.fish")" = 1 ] && ok || ko "fish: conf.d/workshop-claude.fish"
g2_home; g2_update >/dev/null 2>&1; [ ! -e "$G2H/.config/fish" ] && ok || ko "sem fish: nao cria ~/.config/fish"
( unset ZDOTDIR XDG_CONFIG_HOME; HOME=$G2H; SHELL=/bin/zsh; WS_HOME="$G2H/.workshop-claude"; WS_MODE=install; KIT_SRC=""; WS_ZDOTDIR_HOME=""
  WS_NODE_BIN_DIR="$G2H/.workshop-claude/node/bin"; ws_profile_update ) >/dev/null 2>&1
grep -q 'workshop-claude/node/bin' "$G2H/.zshrc" && [ "$(g2_blocks "$G2H/.zshrc")" = 1 ] && [ -z "$(ls "$G2H/.workshop-claude/backup" 2>/dev/null)" ] && ok || ko "perfil criado pelo setup: bloco atualizado, sem copia de seguranca"
# o bloco poe as pastas a frente mesmo que ja estejam no PATH (pipx no fim, um claude antigo antes), em zsh, bash e sh
g2_home; mkdir -p "$G2H/.local/bin" "$G2H/.workshop-claude/bin" "$G2H/old npm/bin"
printf 'export PATH="$HOME/old npm/bin:$PATH:$HOME/.local/bin"\n' > "$G2H/.zshrc"; g2_update >/dev/null 2>&1
for sh in /bin/zsh /bin/bash /bin/sh; do
  got=$(env -i HOME="$G2H" PATH=/usr/bin:/bin "$sh" -c '. "$HOME/.zshrc"; printf %s "$PATH"' </dev/null 2>/dev/null)
  eq "$got" "$G2H/.workshop-claude/bin:$G2H/.local/bin:$G2H/old npm/bin:/usr/bin:/bin" "bloco poe as pastas do workshop a frente ($sh)"
done
eq "$( HOME=$G2H; WS_HOME="$G2H/.workshop-claude"; PATH="/usr/bin:$G2H/.local/bin:/bin:$G2H/.local/bin"; ws_path_setup; printf '%s' "$PATH" )" \
  "$G2H/.workshop-claude/node/bin:$G2H/.workshop-claude/bin:$G2H/.local/bin:/usr/bin:/bin" "ws_path_setup poe as pastas a frente e sem duplicados (a ordem do bloco do perfil)"
chmod -R u+rwx "$G2" 2>/dev/null
# --- chaos G3-network: proxy 407 e proxy morto, download parado, servidor bloqueado, pagina HTML no lugar do ficheiro,
#     proxy antigo no settings.json, NO_PROXY junto (curl falso na pasta g3/bin; o curl real so para 127.0.0.1:1, sem rede)
G3="$WS_TMP/g3"; mkdir -p "$G3/bin" "$G3/h"; WS_UA=t; WS_STEP_LOG="$G3/step.log"; : > "$WS_STEP_LOG"
cat > "$G3/bin/curl" <<'EOF'
#!/bin/sh
printf '%s\n' "$@" > "$G3_ARGS"
out=""; url=""; while [ $# -gt 0 ]; do case "$1" in -o) out=$2; shift ;; http*|file*) url=$1 ;; esac; shift; done
case "$G3_MODE" in
  407) printf '000 407 %s' "$url"; exit 22 ;;
  redir-dns) printf '302 000 https://release-assets.example.test/f?sig=SEGREDO'; exit 6 ;;
  html) printf '\n  <!DOCTYPE html><html><body>Blocked by the company filter</body></html>' > "$out"; printf '200 000 %s' "$url" ;;
  trunc) n=$(($(cat "$G3_N" 2>/dev/null || echo 0) + 1)); echo "$n" > "$G3_N"
    if [ "$n" = 1 ]; then printf 'ab' > "$out"; else printf 'abc' > "$out"; fi; printf '200 000 %s' "$url" ;;
  bad) n=$(($(cat "$G3_N" 2>/dev/null || echo 0) + 1)); echo "$n" > "$G3_N"; printf 'xyz' > "$out"; printf '200 000 %s' "$url" ;;
  alive) printf '0.002'; exit 56 ;;
  net407) printf '000 407'; exit 56 ;;
  netfilter) case "$url" in */install.sh) printf '403 000' ;; *) printf '404 000' ;; esac ;;
esac
EOF
chmod +x "$G3/bin/curl"; export G3_ARGS="$G3/args" G3_N="$G3/n"
eq "$(ws_http_of 000 407)|$(ws_http_of 407 000)|$(ws_http_of 200 200)|$(ws_http_of 000 403)|$(ws_http_of '' '')" "407|407|200|403|000" "g3: ws_http_of (o 407 do CONNECT conta)"
eq "$(ws_net_code 22 403)|$(ws_net_code 0 451)|$(ws_net_code 1 html)" "E-NET-01|E-NET-01|E-NET-01" "g3: 403/451 de um filtro e a pagina HTML = bloqueado"
eq "$(ws_net_code 28 200)|$(ws_net_code 56 200)|$(ws_net_code 18 206)|$(ws_net_code 28 000)" "E-NET-07|E-NET-07|E-NET-07|E-NET-01" "g3: parado ou partido a meio = E-NET-07"
eq "$(ws_net_code 5 000)|$(ws_net_code 97 000)|$(WS_PROXY_DEAD=1 ws_net_code 7 000)|$(WS_PROXY_DEAD=1 ws_net_code 6 000)" "E-NET-03|E-NET-03|E-NET-03|E-NET-03" "g3: erros do proxy = E-NET-03"
( PATH="$G3/bin:$PATH"; export G3_MODE=407; ws_dl https://x.test/f "$G3/o"; printf '%s|%s|%s|%s' "$?" "$WS_DL_HTTP" "$(ws_net_code "$WS_DL_RC" "$WS_DL_HTTP")" "${WS_HB:-}" ) > "$G3/r"
eq "$(cat "$G3/r")" "22|407|E-NET-03|" "g3: ws_dl atras de um proxy com autenticacao (407 no CONNECT) = E-NET-03"
grep -qx -- --speed-limit "$G3_ARGS" && grep -qx -- --speed-time "$G3_ARGS" && grep -qx -- --connect-timeout "$G3_ARGS" && ! grep -qx -- --max-time "$G3_ARGS" && ok || ko "g3: ws_dl com limite de velocidade e sem --max-time"
( PATH="$G3/bin:$PATH"; export G3_MODE=redir-dns; WS_LOG="$G3/log"; WS_CUR=6; SF_6=""; C_NET_CHECK_HOSTS="github.test release-assets.example.test"; ws_dl https://github.test/x "$G3/o"; ws_dl_fail https://github.test/x; printf '%s' "$SF_6" ) > "$G3/r"
eq "$(cat "$G3/r")" "E-NET-02|release-assets.example.test · https://github.test/x" "g3: o detalhe mostra o servidor final do redirecionamento"
grep -q 'redirected to release-assets.example.test' "$G3/log" && ! grep -q SEGREDO "$G3/log" && ok || ko "g3: o log tem o servidor final e nunca a query string assinada"
( PATH="$G3/bin:$PATH"; export G3_MODE=html; WS_CUR=2; SF_2=""; ws_dl https://x.test/install.sh "$G3/o2"; rc=$?; ws_dl_fail https://x.test/install.sh; printf '%s|%s|%s' "$rc" "$([ -e "$G3/o2" ] && echo ficou)" "$SF_2" ) > "$G3/r"
eq "$(cat "$G3/r")" "1||E-NET-01|https://x.test/install.sh · a web page came instead of the file" "g3: pagina de bloqueio no lugar do ficheiro nunca e usada"
printf '\357\273\277  \n<!DOCTYPE html>' > "$G3/p1"; printf '<?xml version="1.0"?>\n<html>' > "$G3/p2"; printf '#!/bin/sh\n# <LICENSE-MIT\n<html>\n' > "$G3/p3"; printf '\037\213\010\000<html>' > "$G3/p4"
eq "$(ws_is_html "$G3/p1"; printf %s $?)$(ws_is_html "$G3/p2"; printf %s $?)$(ws_is_html "$G3/p3"; printf %s $?)$(ws_is_html "$G3/p4"; printf %s $?)" "0011" "g3: ws_is_html (paginas sim; scripts e arquivos nao)"
rm -f "$G3_N"; ( PATH="$G3/bin:$PATH"; export G3_MODE=trunc; ws_dl_check https://x.test/f "$G3/o3" "$(printf abc | shasum -a 256 | cut -d' ' -f1)"; printf '%s|%s|%s' "$?" "$(cat "$G3/o3")" "$(cat "$G3_N")" ) > "$G3/r"
eq "$(cat "$G3/r")" "0|abc|2" "g3: SHA-256 errado (ficheiro truncado) descarrega uma segunda vez"
rm -f "$G3_N"; ( PATH="$G3/bin:$PATH"; export G3_MODE=bad; ws_dl_check https://x.test/f "$G3/o4" "$(printf abc | shasum -a 256 | cut -d' ' -f1)"; printf '%s|%s|%s' "$?" "$([ -e "$G3/o4" ] && echo ficou)" "$(cat "$G3_N")" ) > "$G3/r"
eq "$(cat "$G3/r")" "2||2" "g3: SHA-256 errado duas vezes = 2, sem ficheiro"
dd if=/dev/zero of="$G3/big" bs=1024 count=2048 2>/dev/null
( WS_HB_EVERY=1; ws_hb_start "$G3/big"; p=$WS_HB; sleep 2.5; ws_hb_stop; sleep 0.2; kill -0 "$p" 2>/dev/null && echo VIVO ) > "$G3/hb" 2>&1
grep -q 'Still downloading… 2.0 MB so far.' "$G3/hb" && ! grep -q VIVO "$G3/hb" && ok || ko "g3: progresso do download e sem processo deixado para tras [$(cat "$G3/hb")]"
( HOME="$G3/h"; unset CURL_HOME XDG_CONFIG_HOME; printf 'proxy = "http://p.corp:8080"' > "$HOME/.curlrc"; d=$(ws_curl_home); cat "$d/.curlrc"; CURL_HOME=$d /usr/bin/curl -sS -o /dev/null "file://$G3/p1" 2>&1 ) > "$G3/r"
! grep -q 'p.corp' "$G3/r" && grep -qx 'speed-time = 60' "$G3/r" && [ "$(tail -n 1 "$G3/r")" = "retry = 2" ] && ok || ko "g3: curlrc dos instaladores = so os limites do setup, sem o da pessoa [$(cat "$G3/r")]"
( WS_STEP_LOG="$G3/inst.log"; printf 'curl: (6) Could not resolve host: antes.test\n' > "$WS_STEP_LOG"; n0=$(wc -c < "$WS_STEP_LOG")
  printf 'curl: (28) Operation too slow. Less than 1024 bytes/sec transferred the last 60 seconds\nDownload failed\n' >> "$WS_STEP_LOG"; a=$(ws_installer_net_code "$n0")
  printf 'curl: (6) Could not resolve host: downloads.claude.ai\n' > "$WS_STEP_LOG"; b=$(ws_installer_net_code 0)
  printf 'curl: (23) Failure writing output to destination\n' > "$WS_STEP_LOG"; c=$(ws_installer_net_code 0 || echo E-CC-01)
  printf 'curl: (6) Could not resolve host: antes.test\nInstalling...\n' > "$WS_STEP_LOG"; d=$(ws_installer_net_code 44 || echo E-CC-01)
  printf '%s|%s|%s|%s' "$a" "$b" "$c" "$d" ) > "$G3/r"
eq "$(cat "$G3/r")" "E-NET-07|E-NET-02|E-CC-01|E-CC-01" "g3: o erro do curl de um instalador oficial da o codigo de rede (so o que veio depois)"
eq "$(NO_PROXY='127.0.0.1, .corp.internal,*' no_proxy='intranet,localhost' ws_no_proxy)" "localhost,127.0.0.1,.corp.internal,*,intranet" "g3: NO_PROXY junta o da pessoa, sem repetidos"
eq "$(ws_proxy_show 'http://bea:s3gr3d0@proxy.corp:8080')|$(ws_proxy_show 'socks5h://127.0.0.1:1080')" "http://proxy.corp:8080|socks5h://127.0.0.1:1080" "g3: proxy mostrado sem palavra-passe"
( unset HTTPS_PROXY https_proxy all_proxy; ALL_PROXY=socks5h://127.0.0.1:1; WS_CUR=0; SN_0=""; ws_detect_proxy; printf '%s|%s|%s' "$WS_PROXY_ENV" "$WS_PROXY" "$WS_PROXY_DEAD" ) > "$G3/r"
eq "$(cat "$G3/r")" "socks5h://127.0.0.1:1 (ALL_PROXY)||1" "g3: ALL_PROXY morto e detetado e nunca vai para o settings.json"
( unset https_proxy ALL_PROXY all_proxy; HTTPS_PROXY=http://bea:pw@127.0.0.1:1; WS_CUR=0; SN_0=""; ws_detect_proxy; printf '%s|%s|%s|%s' "$WS_PROXY_ENV" "$WS_PROXY" "$WS_PROXY_DEAD" "$SN_0" ) > "$G3/r"
eq "$(cat "$G3/r")" "http://127.0.0.1:1 (HTTPS_PROXY)||1|System proxy: http://127.0.0.1:1 (HTTPS_PROXY)" "g3: HTTPS_PROXY morto (e a palavra-passe nunca aparece)"
( PATH="$G3/bin:$PATH"; export G3_MODE=alive; unset https_proxy ALL_PROXY all_proxy; HTTPS_PROXY=http://proxy.corp:8080; WS_CUR=0; ws_detect_proxy; printf '%s|%s' "$WS_PROXY" "$WS_PROXY_DEAD" ) > "$G3/r"
eq "$(cat "$G3/r")" "http://proxy.corp:8080|0" "g3: proxy que responde (mesmo com recusa) fica"
printf '#!/bin/sh\n: > "%s/claude-chamado"\n' "$G3" > "$G3/bin/claude-falso"; chmod +x "$G3/bin/claude-falso"
( HOME=$G3; CLAUDE_DIR="$G3/claude"; mkdir -p "$CLAUDE_DIR"; printf '{"env":{"HTTPS_PROXY":"http://127.0.0.1:1","NO_PROXY":"localhost"}}' > "$CLAUDE_DIR/settings.json"
  WS_CUR=12; SF_12=""; WS_CLAUDE="$G3/bin/claude-falso"; ws_s12_install; printf '%s|%s|%s' "$?" "$SF_12" "$([ -e "$G3/claude-chamado" ] && echo chamado)" ) > "$G3/r"
eq "$(cat "$G3/r")" "1|E-NET-08|http://127.0.0.1:1 · ~/claude/settings.json|" "g3: proxy morto no settings.json = E-NET-08 logo, sem os 3 minutos do claude -p"
( HOME=$G3; CLAUDE_DIR="$G3/claude2"; mkdir -p "$CLAUDE_DIR"; printf '{"env":{"MEU":"1"}}' > "$CLAUDE_DIR/settings.json"; ws_settings_proxy_dead; printf '%s' "$?" ) > "$G3/r"
eq "$(cat "$G3/r")" 1 "g3: settings.json sem proxy"
g3net() { # modo proxy -> SW_0 de ws_check_network com o curl falso
  ( PATH="$G3/bin:$PATH"; export G3_MODE=$1; WS_PROXY_ENV=$2; WS_TMP="$G3/net-$1"; mkdir -p "$WS_TMP"; WS_CUR=0; SW_0=""; SN_0=""
    C_NET_CHECK_HOSTS="api.anthropic.com claude.test nodejs.test"; C_CLAUDE_INSTALL_SH_URL=https://claude.test/install.sh
    D_REPO_HOST=""; D_MEMORY_HOST=""; D_KIT_URL_MAC=https://nodejs.test/kit.tgz
    ws_check_network >/dev/null; printf '%s|%s' "$WS_NET_OK" "$SW_0" )
}
eq "$(g3net net407 'http://127.0.0.1:18407 (HTTPS_PROXY)')" "0|E-NET-03|http://127.0.0.1:18407 (HTTPS_PROXY)" "g3: passo 0 atras de um proxy 407 = so E-NET-03, com o proxy (sem E-NET-05 nem E-NET-01)"
eq "$(g3net netfilter '')" "2|E-NET-01|claude.test" "g3: passo 0 testa o instalador do claude.ai e um 403 de um filtro conta como bloqueado"
( WS_CUR=10; ST_10=aviso; SD_10=""; SF_10=""; SN_10=""; SW_10="E-MEM-01|v9.9.9
"; ws_print_result 10 >/dev/null; printf '%s' "$SD_10" ) > "$G3/r"
eq "$(cat "$G3/r")" "The Agent Memory app release is not published yet (E-MEM-01)" "g3: passo nao bloqueante falhado tem detalhe no resumo"
# --- chaos G4-auth-tools: limites de tempo, Ctrl-C no login, chaves/gateway/cloud, ~/.claude.json, MCP, gh, uv, CLT
G4="$WS_TMP/g4"; mkdir -p "$G4/bin" "$G4/cdir" "$G4/home/.local/bin" "$G4/old" "$G4/ghcfg" "$G4/ws" "$G4/badgh" "$G4/h3"
G4_ENV="ANTHROPIC_API_KEY ANTHROPIC_AUTH_TOKEN ANTHROPIC_BASE_URL CLAUDE_CODE_USE_BEDROCK CLAUDE_CODE_USE_VERTEX CLAUDE_CODE_USE_FOUNDRY GH_HOST"
# g4 'codigo': corre o codigo num subshell, sem as variaveis da pessoa e com definicoes do Claude Code vazias.
g4() { ( for v in $G4_ENV; do unset "$v"; done; CLAUDE_DIR="$G4/cdir"; WS_STEP_LOG="$G4/step.log"; eval "$1" ); }
# ws_timeout: limite (124), codigo de saida, stdin, comando em falta, filhos e um programa que ignora o TERM
t0=$(date +%s); ws_timeout 1 sleep 30; rc=$?; t1=$(date +%s)
eq "$rc|$([ $((t1 - t0)) -lt 5 ] && echo rapido)" "124|rapido" "ws_timeout: passa o limite -> 124"
ws_timeout 5 sh -c 'exit 3'; eq "$?" 3 "ws_timeout: passa o codigo de saida"
eq "$(printf x | ws_timeout 5 cat)" x "ws_timeout: passa o stdin"
ws_timeout 5 "$G4/nao-existe" 2>/dev/null; eq "$?" 127 "ws_timeout: comando em falta -> 127"
t0=$(date +%s); ws_timeout 1 sh -c 'trap "" TERM; /bin/sleep 41 & wait'; rc=$?; t1=$(date +%s); sleep 1
eq "$rc|$([ $((t1 - t0)) -lt 5 ] && echo rapido)|$(pgrep -f 'sleep 41' >/dev/null && echo ficou)" "124|rapido|" "ws_timeout: TERM ignorado -> KILL ao grupo, sem filhos"
# Ctrl-C (SIGINT a todo o grupo, como no terminal com curl | bash) durante o login: cancela so o login
if command -v script >/dev/null 2>&1; then
  cat > "$G4/login.sh" <<EOF
WS_SOURCE_ONLY=1; . "$ROOT/setup/setup-mac.sh"
WS_LOG=/dev/null; WS_HOME="$G4/lh"; WS_TMP="$G4/lt"; mkdir -p "\$WS_HOME" "\$WS_TMP"; WS_CUR=3; SN_3=""
trap ws_interrupted INT
ws_run_login sh -c 'kill -INT 0; sleep 5'
printf 'continua|%s|%s\n' "\$WS_LOGIN_INT" "\$SN_3"
kill -INT \$\$; sleep 2
echo nao-chegou
EOF
  out=$(script -q /dev/null bash "$G4/login.sh" </dev/null 2>&1 | tr -d '\r')
  case "$out" in *"continua|1|login_cancelado"*interrompido*) ok ;; *) ko "login: Ctrl-C cancela so o login [$out]" ;; esac
  case "$out" in *nao-chegou*) ko "login: depois do login o Ctrl-C volta a interromper o setup" ;; *) ok ;; esac
fi
# claude falso: auth status, mcp get/add/remove (no formato real) e as respostas do teste final
cat > "$G4/claude" <<'EOF'
#!/bin/sh
d=${0%/*}
printf '%s\n' "$*" >> "$d/claude.args"
case "$1 $2" in
  "auth status") printf '{"loggedIn": true, "authMethod": "%s", "apiKeySource": "%s", "apiProvider": "%s"}\n' "${G4_METHOD:-oauth_token}" "${G4_SOURCE:-}" "${G4_PROVIDER:-firstParty}"; exit 0 ;;
  "mcp get") [ -f "$d/mcp-$3" ] || { echo "No MCP server named \"$3\"."; exit 1; }; cat "$d/mcp-$3"; exit 0 ;;
  "mcp remove") rm -f "$d/mcp-$5"; exit 0 ;;
  "mcp add") n=$5; [ "$4" = user ] || n=$7; u=$(eval "printf %s \"\${$#}\""); printf '%s:\n  Scope: User config\n  Type: http\n  URL: %s\n' "$n" "$u" > "$d/mcp-$n"; exit 0 ;;
esac
case "${G4_CLAUDE:-}" in
  key) printf '%s' '{"type":"result","is_error":true,"api_error_status":401,"result":"Invalid API key · Fix external API key"}'; exit 1 ;;
  bearer) echo 'Failed to authenticate. API Error: 401 Invalid bearer token' >&2; exit 1 ;;
  refused) echo 'API Error: Connection error. (ECONNREFUSED)' >&2; exit 1 ;;
  hang) exec /bin/sleep 42 ;;
  ok) printf '%s' '{"type":"result","is_error":false,"result":"OK","modelUsage":{}}' ;;
esac
EOF
chmod +x "$G4/claude"
# passo 12: classificacao das falhas e --strict-mcp-config
s12() { g4 'WS_CLAUDE="$G4/claude"; WS_CUR=12; SF_12=""; WS_PRICING="$ROOT/pricing.json"; WS_TMO_SMOKE=2; WS_GW_URL=""; WS_GW_DOWN=0; WS_AUTH_SOURCE=""; '"$1"'; ws_s12_install >/dev/null; printf "%s" "$SF_12"'; }
eq "$(G4_CLAUDE=key s12 'export ANTHROPIC_API_KEY=sk-ant-teste-1234')" "E-AUTH-04|ANTHROPIC_API_KEY" "s12: chave antiga na variavel -> E-AUTH-04 (nao E-AUTH-01)"
eq "$(G4_CLAUDE=key s12 :)" "E-AUTH-01|" "s12: 401 sem variaveis -> E-AUTH-01"
eq "$(G4_CLAUDE=bearer s12 'export ANTHROPIC_AUTH_TOKEN=tok-teste-1234')" "E-AUTH-04|ANTHROPIC_AUTH_TOKEN" "s12: ANTHROPIC_AUTH_TOKEN recusado -> E-AUTH-04"
eq "$(G4_CLAUDE=key s12 'WS_AUTH_SOURCE=apiKeyHelper')" "E-AUTH-04|apiKeyHelper" "s12: apiKeyHelper recusado -> E-AUTH-04"
eq "$(G4_CLAUDE=refused s12 'WS_GW_URL=http://eu:pw@gw.exemplo:4000/v1')" "E-AUTH-05|http://gw.exemplo:4000/" "s12: gateway recusa -> E-AUTH-05 (URL sem credenciais)"
eq "$(G4_CLAUDE=refused s12 :)" "E-NET-05|" "s12: sem gateway, recusa -> E-NET-05"
t0=$(date +%s); eq "$(G4_CLAUDE=hang s12 :)" "E-SMOKE-01|no answer in 2 s" "s12: sem resposta -> limite de tempo"; t1=$(date +%s)
[ $((t1 - t0)) -lt 8 ] && ok || ko "s12: o limite de tempo nao cortou o claude -p ($((t1 - t0)) s)"
rm -f "$G4/claude.args"
eq "$(G4_CLAUDE=ok s12 'WS_GW_DOWN=1; WS_GW_URL=http://gw.exemplo:4000/')|$([ -f "$G4/claude.args" ] && echo chamou)" "E-AUTH-05|http://gw.exemplo:4000/|" "s12: gateway em baixo no passo 0 -> nem chama o claude"
eq "$(G4_CLAUDE=ok s12 :)" "" "s12: resposta OK"
grep -- '^-p ' "$G4/claude.args" | grep -q -- '--strict-mcp-config' && ok || ko "s12: o teste corre sem servidores MCP (--strict-mcp-config)"
# passo 0: chaves, gateway e cloud (na shell e no "env" do settings.json)
SJ="$G4/cdir/settings.json"; SJS=$(ws_path_show "$SJ")
eq "$(g4 'ANTHROPIC_AUTH_TOKEN=x ANTHROPIC_API_KEY=y; ws_env_keys')" "ANTHROPIC_AUTH_TOKEN, ANTHROPIC_API_KEY" "ws_env_keys: nomes das variaveis"
printf '{"env": {"ANTHROPIC_API_KEY": "sk-ant-segredo-9999", "CLAUDE_CODE_USE_VERTEX": "1"}}\n' > "$SJ"
eq "$(g4 ws_env_keys)" "ANTHROPIC_API_KEY ($SJS)" "ws_env_keys: chave no settings.json (so o nome)"
eq "$(g4 ws_cloud_where)" "CLAUDE_CODE_USE_VERTEX ($SJS)" "ws_cloud_where: settings.json"
eq "$(g4 'CLAUDE_CODE_USE_BEDROCK=1; ws_cloud_where')" "CLAUDE_CODE_USE_BEDROCK (shell)" "ws_cloud_where: shell"
printf '{"env": {"CLAUDE_CODE_USE_BEDROCK": "0"}}\n' > "$SJ"; g4 ws_cloud_where >/dev/null; eq "$?" 1 "ws_cloud_where: 0 nao conta"
printf '{"env": {"CLAUDE_CODE_USE_BEDROCK": true}}\n' > "$SJ"; eq "$(g4 ws_cloud_where | cut -d' ' -f1)" CLAUDE_CODE_USE_BEDROCK "ws_cloud_where: booleano true"
printf '{"env": {"ANTHROPIC_BASE_URL": "http://127.0.0.1:9/"}}\n' > "$SJ"
eq "$(g4 'WS_CUR=0; SW_0=""; ws_gw_detect; printf "%s|%s" "$WS_GW_DOWN" "$SW_0"')" "1|E-CFG-03|ANTHROPIC_BASE_URL ($SJS)
E-AUTH-05|http://127.0.0.1:9/" "passo 0: gateway do settings.json que nao responde -> WS_GW_DOWN=1 e E-AUTH-05"
: > "$SJ"
eq "$(g4 'WS_CUR=0; SW_0=""; ws_gw_detect; printf "%s|%s" "$WS_GW_DOWN" "$SW_0"')" "0|" "passo 0: sem gateway"
eq "$(grep -c '^  ws_gw_detect$' "$ROOT/setup/setup-mac.sh")" 1 "passo 0: o gateway e testado uma so vez (depois do proxy)"
# passo 3: Bedrock/Vertex pelo apiProvider -> so o aviso E-CFG-04 (e uma forma valida de usar o Claude Code), sem
# oferecer o login, e o teste final corre com o alias "haiku"; a origem da chave no aviso E-AUTH-03
eq "$(G4_PROVIDER=bedrock G4_METHOD=third_party g4 'WS_CLAUDE="$G4/claude"; WS_CUR=3; WS_MODE=install; WS_AUTH_OK=0; SW_3=""; ws_s3_detect; r=$?; SF_3=""; ws_s3_install; printf "%s|%s|%s|%s|%s" "$r$?" "$SF_3" "$(printf "%s" "$SW_3" | head -n 1)" "$WS_AUTH_OK" "$(ws_smoke_model)"')" "00||E-CFG-04|bedrock: Claude Code settings|1|haiku" "passo 3: apiProvider bedrock -> aviso E-CFG-04, passo feito"
eq "$(WS_AUTH_CLOUD=""; ws_smoke_model)" claude-haiku-5-5 "teste final: o id exato sem cloud"
eq "$(G4_METHOD=api_key G4_SOURCE=ANTHROPIC_API_KEY g4 'WS_CLAUDE="$G4/claude"; WS_CUR=3; WS_MODE=check; SW_3=""; ws_s3_detect; printf "%s|%s" "$?" "$SW_3"')" "0|E-AUTH-03|ANTHROPIC_API_KEY" "passo 3: E-AUTH-03 diz a variavel"
# passo 2: ~/.claude.json invalido para antes de qualquer comando do Claude Code (node e JXA)
mkdir -p "$G4/cj"
for engine in node jxa; do
  if [ "$engine" = node ]; then [ -n "$NODE" ] || continue; E=$NODE; else command -v osascript >/dev/null || continue; E=""; fi
  for c in 'ok|{"mcpServers":{"x":{}}}|0' 'virgula|{"a":1,}|1' 'vazio||0' 'branco|  |0' 'bom|\357\273\277{"a":1}|0'; do
    IFS='|' read -r nome txt want <<EOF
$c
EOF
    # shellcheck disable=SC2059
    printf "$txt" > "$G4/cj/.claude.json"
    eq "$(g4 'WS_NODE=$E; CLAUDE_CONFIG_DIR="$G4/cj"; WS_CUR=2; SF_2=""; ws_claude_json_ok; printf "%s|%s" "$?" "${SF_2%%|*}"')" "$want|$([ "$want" = 1 ] && echo E-CC-04)" "claude.json $engine: $nome"
  done
done
printf '#!/bin/sh\necho "Claude configuration file at ~/.claude.json is corrupted"\necho "The corrupted file has been backed up to: /u/.claude/backups/.claude.json.corrupted.123"\nexit 1\n' > "$G4/install.sh"
eq "$(g4 'CLAUDE_CONFIG_DIR="$G4/cdir"; C_CLAUDE_INSTALL_SH_URL="file://$G4/install.sh"; WS_CUR=2; SF_2=""; ws_s2_install >/dev/null; printf "%s" "$SF_2"')" "E-CC-04|/u/.claude/backups/.claude.json.corrupted.123" "passo 2: install.sh guardou o .claude.json corrompido -> E-CC-04 com a copia"
# passos 7 e 10: o "claude mcp get" sai com 0 para registos antigos; compara-se o destino
printf 'atlassian:\n  Scope: User config\n  Status: ! Needs authentication\n  Type: sse\n  URL: https://mcp.atlassian.com/v1/sse\n' > "$G4/mcp-atlassian"
printf 'agent-memory:\n  Scope: User config\n  Status: x Failed to connect\n  Type: stdio\n  Command: /Users/old user/.local/bin/agent-memory\n  Args: mcp\n' > "$G4/mcp-agent-memory"
printf '#!/bin/sh\ncase "$1" in --version) echo "acli version 9.9.9-stable";; *) exit 0;; esac\n' > "$G4/bin/acli"; chmod +x "$G4/bin/acli"
mcp() { g4 'CLAUDE_CONFIG_DIR="$G4/sem-claude-json"; WS_CLAUDE="$G4/claude"; WS_TMO_MCP=10; C_ATLASSIAN_MCP_URL=https://mcp.atlassian.com/v2/mcp; WS_HOME="$G4/ws"; KIT_SRC=""; WS_SIM=1; PATH="$G4/bin:$PATH"; '"$1"; }
eq "$(mcp 'ws_mcp_get atlassian; ws_s7_url_ok; printf "%s|%s" "$?" "$(ws_mcp_field URL)"')" "1|https://mcp.atlassian.com/v1/sse" "s7: atlassian SSE antigo nao conta como feito"
eq "$(mcp 'WS_CUR=7; WS_MODE=check; ws_s7_detect >/dev/null; printf "%s" "$SF_7"')" "E-MCP-01|atlassian: https://mcp.atlassian.com/v1/sse" "s7 check: registo antigo -> E-MCP-01 com o URL"
eq "$(mcp 'WS_CUR=7; WS_MODE=install; SN_7=""; SF_7=""; ws_s7_install >/dev/null; printf "%s|%s|" "$?" "$SF_7"; printf "%s" "$SN_7" | grep -c "pointed to https://mcp.atlassian.com/v1/sse"')" "0||1" "s7 install: troca o registo antigo, com uma nota"
grep -q 'URL: https://mcp.atlassian.com/v2/mcp' "$G4/mcp-atlassian" && ok || ko "s7 install: atlassian aponta para o MCP do workshop"
eq "$(mcp 'ws_memory_mcp_ok /u/bin/agent-memory; printf "%s" "$?"')" 1 "s10: agent-memory de outro utilizador nao conta como feito"
eq "$(mcp 'WS_CUR=10; SN_10=""; ws_memory_mcp /u/bin/agent-memory; printf "%s|%s" "$?" "$SN_10"')" "0|The agent-memory MCP pointed to /Users/old user/.local/bin/agent-memory. It now points to the app just installed." "s10 install: refaz o registo antigo, com uma nota"
printf 'agent-memory:\n  Type: stdio\n  Command: /u/bin/agent-memory\n  Args: mcp\n' > "$G4/mcp-agent-memory"
eq "$(mcp 'ws_memory_mcp_ok /u/bin/agent-memory; printf "%s" "$?"')" 0 "s10: agent-memory com o programa certo"
: > "$G4/mcp-memoria"
eq "$(mcp 'ws_memory_mcp_ok /u/bin/agent-memory; printf "%s" "$?"')" 1 "s10: registo antigo memoria fica por arrumar"
# passo 6: gh sem resposta (VPN/proxy) -> E-GH-03 em segundos, sem pergunta de login; depois de instalar usa o caminho
printf '#!/bin/sh\ncase "$1" in --version) echo "gh version 2.102.0 (2026-09-01)"; exit 0;; esac\ncase "$1 $2" in "auth status") [ "${G4_GH:-}" = stall ] && exec /bin/sleep 43; [ "${G4_GH:-}" = ok ] && exit 0; exit 1;; esac\nexit 0\n' > "$G4/gh-ok"
printf '#!/bin/sh\nkill -9 $$\n' > "$G4/badgh/gh"; chmod +x "$G4/gh-ok" "$G4/badgh/gh"
printf 'github.acme-corp.com:\n    user: bea\n    oauth_token: gho_x\n' > "$G4/ghcfg/hosts.yml"
gh6() { g4 'GH_CONFIG_DIR="$G4/ghcfg"; WS_TMO_GH=1; WS_CUR=6; WS_MODE=install; WS_SIM=1; SF_6=""; WS_GH_SEM_REDE=""; '"$1"; }
t0=$(date +%s); eq "$(G4_GH=stall gh6 'ws_s6_detect "$G4/gh-ok"; printf "%s|%s|%s" "$?" "$SF_6" "$WS_GH_SEM_REDE"')" "1|E-GH-03|github.acme-corp.com|1" "s6: gh auth status sem resposta -> E-GH-03"; t1=$(date +%s)
[ $((t1 - t0)) -lt 6 ] && ok || ko "s6: o limite do gh auth status nao cortou ($((t1 - t0)) s)"
eq "$(gh6 'WS_GH_SEM_REDE=1; ws_s6_install; printf "%s|%s" "$?" "$SF_6"')" "1|E-GH-03|github.acme-corp.com" "s6 install: sem rede nao volta a descarregar"
eq "$(G4_GH=ok gh6 'PATH="$G4/badgh:$PATH"; hash -r; ws_s6_detect "$G4/gh-ok"; printf "%s|%s" "$?" "$WS_GH_VER"')" "0|2.102.0" "s6: detect pelo caminho dado (um gh estragado primeiro no PATH)"
eq "$(gh6 'ws_s6_detect "$G4/gh-ok"; printf "%s" "$SF_6"')" "E-GH-02|" "s6: sem login (resposta rapida) continua E-GH-02"
eq "$(g4 'WS_AUTH_OK=1; SF_6="E-GH-03|x"; ws_helper_offer 6; printf "%s|" "$?"; SF_6="E-GH-01|x"; WS_GW_DOWN=1; ws_helper_offer 6; printf "%s" "$?"')" "1|1" "ajudante: nao e oferecido com E-GH-03 nem com o gateway em baixo"
# passo 5: um uv antigo primeiro no PATH (0.5.29 passava o ">= 0.5") nao serve; usa-se o ~/.local/bin/uv pelo caminho
printf '#!/bin/sh\necho "uv 0.5.29 (Homebrew 2025-02-10)"\n' > "$G4/old/uv"; printf '#!/bin/sh\necho "uv 0.13.1 (abc 2026-10-01)"\n' > "$G4/home/.local/bin/uv"; chmod +x "$G4/old/uv" "$G4/home/.local/bin/uv"
eq "$(g4 'HOME="$G4/home"; C_UV_MIN_VERSION=0.6.8; WS_CUR=5; SW_5=""; PATH="$G4/old:$PATH"; hash -r; ws_s5_detect; printf "%s|%s|%s" "$?" "$WS_UV" "${SW_5%%|*}"')" "0|$G4/home/.local/bin/uv|E-UV-02" "s5: uv antigo primeiro no PATH -> usa o ~/.local/bin/uv e avisa"
eq "$(g4 'HOME="$G4/h3"; C_UV_MIN_VERSION=0.6.8; WS_CUR=5; PATH="$G4/old:$PATH"; hash -r; ws_s5_detect; printf "%s|%s" "$?" "$WS_UV"')" "1|" "s5: so um uv 0.5.29 -> instala o do workshop"
# ws_path_setup: a mesma ordem que o bloco do perfil (node/bin, bin, .local/bin)
eq "$(g4 'HOME="$G4/h2"; WS_HOME="$G4/h2/.workshop-claude"; PATH=/usr/bin:/bin; ws_path_setup; printf "%s" "$PATH"')" "$G4/h2/.workshop-claude/node/bin:$G4/h2/.workshop-claude/bin:$G4/h2/.local/bin:/usr/bin:/bin" "ws_path_setup: ordem do perfil"
# Command Line Tools: o xcode-select a apontar para uma pasta sem git nao conta; sem CLT o uv recebe um install_name_tool vazio
mkdir -p "$G4/xs-ok" "$G4/xs-gone" "$G4/xs-fail" "$G4/dev/usr/bin"; : > "$G4/dev/usr/bin/git"; chmod +x "$G4/dev/usr/bin/git"
printf '#!/bin/sh\necho "%s"\n' "$G4/dev" > "$G4/xs-ok/xcode-select"; printf '#!/bin/sh\necho "%s"\n' "$G4/nada" > "$G4/xs-gone/xcode-select"; printf '#!/bin/sh\nexit 2\n' > "$G4/xs-fail/xcode-select"
chmod +x "$G4/xs-ok/xcode-select" "$G4/xs-gone/xcode-select" "$G4/xs-fail/xcode-select"
eq "$(for d in xs-ok xs-gone xs-fail; do g4 'PATH="$G4/'"$d"':$PATH"; hash -r; ws_clt_ok; printf "%s" "$?"'; done)" "011" "ws_clt_ok: ok, pasta apagada, sem CLT"
printf '#!/bin/sh\ncommand -v install_name_tool > "%s/int.txt"\n' "$G4" > "$G4/uvfake"; chmod +x "$G4/uvfake"
if [ -e /usr/bin/install_name_tool ]; then
  g4 'WS_UV="$G4/uvfake"; WS_TMP="$G4"; C_PYTHON_VERSION=3.12; PATH="$G4/xs-fail:/usr/bin:/bin"; hash -r; ws_uv_tool_install a.whl c.txt'
  eq "$(cat "$G4/int.txt")" "$G4/no-clt/install_name_tool" "s10 sem CLT: o uv usa um install_name_tool vazio (sem o dialogo da Apple)"
  g4 'WS_UV="$G4/uvfake"; WS_TMP="$G4"; C_PYTHON_VERSION=3.12; PATH="$G4/xs-ok:/usr/bin:/bin"; hash -r; ws_uv_tool_install a.whl c.txt'
  eq "$(cat "$G4/int.txt")" /usr/bin/install_name_tool "s10 com CLT: o install_name_tool normal"
fi
grep -nE '^[[:space:]]*(gh|uv|"\$WS_CLAUDE") (auth status|mcp get|mcp list|tool)' "$ROOT/setup/setup-mac.sh" | grep -q . && ko "setup-mac.sh: gh/uv/claude chamados sem limite ou pelo nome" || ok

# --- chaos G5-arena-git: passo 9 sem perder trabalho, montagem interrompida e git global hostil
G5="$WS_TMP/g5"; mkdir -p "$G5/st/vazia" "$G5/st/alheia" "$G5/st/inc" "$G5/st/semgit" "$G5/st/ok" "$G5/st/propria"
g5git() { GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_NOSYSTEM=1 git -c user.email=t@t -c user.name=t "$@"; }
echo x > "$G5/st/alheia/f"
printf '{"status":"incomplete","language":"en"}\n' > "$G5/st/inc/.arena-kit.json"; echo x > "$G5/st/inc/README.md"
printf '{"version":"v1"}\n' > "$G5/st/semgit/.arena-kit.json"
for d in ok propria; do printf '{"version":"v1"}\n' > "$G5/st/$d/.arena-kit.json"; ( cd "$G5/st/$d" && g5git init -q && g5git commit -q --allow-empty -m x ) >/dev/null 2>&1; done
( cd "$G5/st/ok" && g5git tag arena-start ) >/dev/null 2>&1
for c in vazia:vazia alheia:alheia inc:incompleta semgit:incompleta ok:ok propria:propria nada:vazia; do
  eq "$(ws_proj_state "$G5/st/${c%%:*}" .arena-kit.json refs/tags/arena-start)" "${c#*:}" "ws_proj_state ${c%%:*}"
done
# Um HOME com os dotfiles em git (com uma tag arena-start): a marca sem .git proprio nao passa por pronta.
( cd "$G5/st" && g5git init -q && g5git commit -q --allow-empty -m dotfiles && g5git tag arena-start ) >/dev/null 2>&1
eq "$(ws_proj_state "$G5/st/semgit" .arena-kit.json refs/tags/arena-start)" incompleta "ws_proj_state: ignora o repositorio acima"
grep -n 'assemble-demo.mjs.*--force' "$ROOT/setup/setup-mac.sh" | grep -q . && ko "o passo 9 ainda forca a Arena (apagava o historico da pessoa)" || ok

# ws_assemble com um node falso: o que corre e o que mostra
printf '#!/bin/sh\nprintf "%%s\\n" "$*" >> "%s/node.args"\ncase "$*" in *--falha*) echo "ERROR: git commit -q -m x failed: error: gpg failed to sign the data" >&2; exit 1;; esac\nprintf "{\\"status\\":\\"assembled\\",\\"backup\\":\\"%%s/.workshop-claude/backup/t/demo-project\\"}\\n" "$HOME"\n' "$G5" > "$G5/node"; chmod +x "$G5/node"
g5a() { # pasta [extra] -> SF#SW#SN#args do node
  ( WS_NODE="$G5/node"; KIT_SRC="$G5/kit"; WS_CUR=9; WS_STEP_LOG="$G5/a.log"; : > "$WS_STEP_LOG"; : > "$G5/node.args"; SF_9=""; SW_9=""; SN_9=""
    ws_registar() { :; }
    ws_assemble assemble-demo.mjs "$1" .arena-kit.json refs/tags/arena-start --language en ${2:+"$2"}
    printf '%s#%s#%s#%s' "$SF_9" "$SW_9" "$SN_9" "$(tr '\n' ' ' < "$G5/node.args")" )
}
r=$(g5a "$G5/st/propria"); case "$r" in '#E-DEMO-04|'*'##') ok ;; *) ko "ws_assemble propria: aviso E-DEMO-04 e o node nao corre [$r]" ;; esac
# shellcheck disable=SC2088
r=$(g5a "$G5/st/inc"); case "$r" in *'--force '*) ok ;; *) ko "ws_assemble incompleta: --force [$r]" ;; esac
case "$r" in *'Your previous folder is saved in ~/.workshop-claude/backup/t/demo-project.'*) ok ;; *) ko "ws_assemble: nota do backup com ~ [$r]" ;; esac
r=$(g5a "$G5/st/ok"); case "$r" in *'--force'*) ko "ws_assemble ok: sem --force [$r]" ;; '##'*'--dest '*) ok ;; *) ko "ws_assemble ok [$r]" ;; esac
r=$(g5a "$G5/st/alheia"); case "$r" in 'E-DEMO-03|'*) ok ;; *) ko "ws_assemble alheia: E-DEMO-03 [$r]" ;; esac
r=$(g5a "$G5/st/vazia" --falha); case "$r" in 'E-DEMO-01|assemble-demo.mjs: git commit -q -m x failed: error: gpg failed to sign the data#'*) ok ;; *) ko "ws_assemble: a causa do E-DEMO-01 no ecra [$r]" ;; esac

# Migracao da tag com tag.gpgsign global (sem gpg): a tag nova fica leve, sem pedir mensagem nem assinatura.
printf '[tag]\n\tgpgsign = true\n[gpg]\n\tprogram = %s/no-gpg\n[core]\n\teditor = false\n' "$G5" > "$G5/sign.gitconfig"
mkdir -p "$G5/mig/demo-project"; : > "$G5/mig/demo-project/.arena-kit.json"
( cd "$G5/mig/demo-project" && g5git init -q && g5git commit -q --allow-empty -m x && g5git tag arena-inicial ) >/dev/null 2>&1
( export GIT_CONFIG_GLOBAL="$G5/sign.gitconfig"; WS_PROJ="$G5/mig"; ws_s9_migrate )
eq "$(g5git -C "$G5/mig/demo-project" cat-file -t arena-start 2>/dev/null)" commit "s9 migrate: tag arena-start leve com tag.gpgsign global"

# Passo 8: skills/agentes do kit alterados pela pessoa ficam no backup e o setup diz onde.
( WS_CUR=8; SN_8=""; ws_s8_parse "$(printf 'skills\t7\neditado\t%s/.workshop-claude/backup/t/edited/skills/task-plan\nanteriores\t%s/.workshop-claude/backup/t/previous\n' "$HOME" "$HOME")"; printf '%s' "$SN_8" ) > "$G5/s8"
grep -q 'You had changed task-plan: your copy is saved in ~/.workshop-claude/backup/t/edited/skills/task-plan' "$G5/s8" && ok || ko "s8: nota editado [$(cat "$G5/s8")]"
grep -q 'previous versions of the kit.s skills and agents are saved in ~/.workshop-claude/backup/t/previous' "$G5/s8" && ok || ko "s8: nota anteriores"

PF="$WS_TMP/pf"; mkdir -p "$PF"
# O passo 8 a instalar (D-34: um so board, sem salas): os argumentos do instalar (sempre --projects-dir, nunca --room)
# e o registo no painel com um ctl.mjs falso (sai com FC_EXIT; com 0 grava o participante como o verdadeiro; guarda
# todos os argumentos, para ver que o register vai sem sala). Ver tools/test do ctl.mjs.
mkdir -p "$PF/kit/telemetry" "$PF/kit/installer" "$PF/h/.workshop-claude"; : > "$PF/kit/installer/install-user.mjs"
cat > "$PF/ctl.mjs" <<'EOF'
import fs from 'node:fs';
import path from 'node:path';
const args = process.argv.slice(2);
const cfgFile = path.join(process.env.HOME, '.workshop-claude', 'telemetry', 'config.json');
fs.appendFileSync(path.join(process.env.HOME, 'ctl.calls'), `${args.join(' ')} gh=${process.env.WORKSHOP_GH || '-'}\n`);
const rc = Number(process.env.FC_EXIT || 0);
if (rc === 0) {
  const c = JSON.parse(fs.readFileSync(cfgFile, 'utf8'));
  fs.writeFileSync(cfgFile, JSON.stringify({ ...c, enabled: true, participant: { p: 'ab'.repeat(16), credential: 'x', name: 'ana-silva' } }, null, 2));
  console.log('Registered on the panel as ana-silva.');
}
process.exit(rc);
EOF
p8() { # config(0: sem registo|1: config antiga com sala, sem registo|2: registado) [kit] -> argumentos do instalar#notas#avisos#chamadas do ctl
  ( HOME="$PF/h"; WS_HOME="$HOME/.workshop-claude"; WS_PROJ="$HOME/workshop-claude"; KIT_SRC=${2:-$PF/kit}; WS_MODE=install; WS_CUR=8; WS_SIM=0; WS_SUBST_SL=0
    SN_8=""; SD_8=""; SF_8=""; SW_8=""; WS_STEP_LOG=/dev/null; WS_NODE=$NODE; WS_GH_EXE=/opt/x/bin/gh
    rm -rf "$WS_HOME/telemetry" "$WS_HOME/kit" "$HOME/ctl.calls"; mkdir -p "$WS_HOME/kit/telemetry"; cp "$PF/ctl.mjs" "$WS_HOME/kit/telemetry/ctl.mjs"
    mkdir -p "$WS_HOME/telemetry"
    case "$1" in
      0) printf '{\n  "v": 1,\n  "email_domain": "checkmarx.com",\n  "panel_url": "https://panel.example.test"\n}\n' > "$WS_HOME/telemetry/config.json" ;;
      1) printf '{\n  "v": 1,\n  "room": "B",\n  "email_domain": "checkmarx.com",\n  "panel_url": "https://panel.example.test"\n}\n' > "$WS_HOME/telemetry/config.json" ;;
      2) printf '{\n  "v": 1,\n  "enabled": true,\n  "panel_url": "https://panel.example.test",\n  "participant": {\n    "p": "%s",\n    "name": "ana-silva"\n  }\n}\n' "$(printf 'ab%.0s' 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16)" > "$WS_HOME/telemetry/config.json" ;;
    esac
    ws_has_tty() { return 0; }
    ws_kit_ensure() { return 0; }; ws_registar_flush() { :; }; ws_s8_config_dir() { :; }
    ws_iu() { printf '%s ' "$@" > "$PF/iu.args"; printf 'skills\t7\nagentes\t3\n'; }
    ws_s8_install >/dev/null; printf '%s#%s#%s#%s' "$(sed 's/ $//' "$PF/iu.args")" "$SN_8" "$SW_8" "$(cat "$HOME/ctl.calls" 2>/dev/null)" )
}
if [ -n "$NODE" ]; then
  r=$(p8 0); case "$r" in "instalar --projects-dir $PF/h/workshop-claude#"*"Workshop panel: registered as ana-silva.
##register gh=/opt/x/bin/gh") ok ;; *) ko "s8 registo: sem --room e register sem sala, registado [$r]" ;; esac
  r=$(p8 1); case "$r" in "instalar --projects-dir $PF/h/workshop-claude#"*"registered as ana-silva."*"##register gh=/opt/x/bin/gh") ok ;; *) ko "s8 registo: config antiga com sala = a sala nao conta [$r]" ;; esac
  r=$(p8 2); case "$r" in "instalar --projects-dir $PF/h/workshop-claude#"*"Workshop panel: registered as ana-silva.
##") ok ;; *) ko "s8 registo: ja registado = sem pedido ao painel [$r]" ;; esac
  r=$(FC_EXIT=3 p8 0); case "$r" in *"#E-TEL-02|@checkmarx.com
#register gh=/opt/x/bin/gh") ok ;; *) ko "s8 registo: 3 = E-TEL-02 com o dominio [$r]" ;; esac
  r=$(FC_EXIT=4 p8 0); case "$r" in *"#E-TEL-03|gh auth refresh -h github.com -s user:email
#register gh=/opt/x/bin/gh") ok ;; *) ko "s8 registo: 4 = E-TEL-03 [$r]" ;; esac
  r=$(WS_GH_SCOPE_WARN=1 FC_EXIT=4 p8 0); case "$r" in *"Workshop panel: not registered yet. Fix the GitHub warning of step 6"*"ctl.mjs register)."*"##register gh=/opt/x/bin/gh") ok ;; *) ko "s8 registo: 4 com o aviso do passo 6 = so uma nota [$r]" ;; esac
  r=$(FC_EXIT=5 p8 0); case "$r" in *"#E-TEL-01|https://panel.example.test/ · register
#register gh=/opt/x/bin/gh") ok ;; *) ko "s8 registo: 5 = E-TEL-01 [$r]" ;; esac
  r=$(FC_EXIT=1 p8 0); case "$r" in "instalar --projects-dir $PF/h/workshop-claude#"*[!#]"
##register gh=/opt/x/bin/gh") ok ;; *) ko "s8 registo: outro codigo = so no log [$r]" ;; esac
  mkdir -p "$PF/velho/installer"; : > "$PF/velho/installer/install-user.mjs"
  r=$(p8 0 "$PF/velho"); case "$r" in "instalar --projects-dir $PF/h/workshop-claude#"*[!#]"
##") ok ;; *) ko "s8 registo: kit sem telemetry/ = sem registo [$r]" ;; esac
fi
# O resultado do registo, sozinho (codigos e textos).
rr() { ( WS_CUR=8; SW_8=""; SN_8=""; WS_HOME="$PF/h/.workshop-claude"; printf '{"v":1,"panel_url":"%s","email_domain":"%s","participant":{"p":"%s","name":"zé"}}' "${2:-https://p.example/x}" "${3:-}" "$(printf 'cd%.0s' 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16)" > "$PF/rr.json"
  ws_s8_register_result "$1" "$PF/rr.json"; printf '%s#%s' "$SW_8" "$SN_8" ); }
eq "$(rr 0)" "#Workshop panel: registered as zé." "s8 resultado 0: a nota com o nome do config.json"
eq "$(rr 3 '' acme.example)" "E-TEL-02|@acme.example
#" "s8 resultado 3: o dominio do config.json"
eq "$(rr 3)" "E-TEL-02|@checkmarx.com
#" "s8 resultado 3: sem dominio, o do ctl.mjs"
eq "$(rr 124)" "E-TEL-01|https://p.example/ · register
#" "s8 resultado: sem resposta a tempo = E-TEL-01"
eq "$(rr 5 ' ')" "#" "s8 resultado 5 sem panel_url = so no log"
eq "$(rr 1)" "#" "s8 resultado 1 (sem config ou expirada) = so no log"
# O detect: sem config.json (num kit com o painel) o passo 8 corre para o gravar; no --check nao. Ao instalar com o
# passo feito, so o registo (uma sala antiga no config.json nao conta).
p8d() { ( HOME="$PF/h"; WS_HOME="$HOME/.workshop-claude"; KIT_SRC="$PF/kit"; WS_MODE=$1; WS_CUR=8; SN_8=""; SD_8=""; SF_8=""; SW_8=""; WS_STEP_LOG=/dev/null; WS_SUBST_SL=0; WS_SIM=1
  rm -rf "$WS_HOME/telemetry" "$WS_HOME/kit"; if [ "$2" = 1 ]; then mkdir -p "$WS_HOME/telemetry"; printf '{\n  "v": 1,\n  "room": "A"\n}\n' > "$WS_HOME/telemetry/config.json"; fi
  ws_kit_ensure() { return 0; }; ws_registar_flush() { :; }; ws_s8_config_dir() { :; }; ws_iu() { printf 'skills\t7\nagentes\t3\n'; }
  ws_s8_detect >/dev/null; printf '%s' "$?" ); }
eq "$(p8d install 0)|$(p8d install 1)|$(p8d check 0)|$(WORKSHOP_ROOM=B p8d install 1)" "1|0|0|0" "s8 detect: sem config.json instala (so no modo install); WORKSHOP_ROOM nao conta"
grep -qE 'WORKSHOP_ROOM|--room|ws_room_pick|s8_painel_sala' "$ROOT/setup/setup-mac.sh" && ko "s8: o setup ainda fala de salas (D-34)" || ok
# No --check: sem registo, o aviso E-TEL-04 com o comando (sem sala); registado ou expirado, nada.
rc8() { ( HOME="$PF/h"; WS_HOME="$HOME/.workshop-claude"; KIT_SRC="$PF/kit"; WS_MODE=${2:-check}; WS_CUR=8; SW_8=""; mkdir -p "$WS_HOME/telemetry"; printf '%s' "$1" > "$WS_HOME/telemetry/config.json"
  ws_s8_register_check; printf '%s' "$SW_8" ); }
eq "$(rc8 '{"v":1,"expires_at":"2099-01-01T00:00:00.000Z","participant":null}')" "E-TEL-04|node ~/.workshop-claude/kit/telemetry/ctl.mjs register" "s8 --check: sem registo = E-TEL-04 com o comando"
eq "$(rc8 '{"v":1,"room":"B"}')" "E-TEL-04|node ~/.workshop-claude/kit/telemetry/ctl.mjs register" "s8 --check: config antiga com sala = o comando sem sala"
eq "$(rc8 '{"v":1,"participant":{"p":"0123456789abcdef0123456789abcdef","name":"x"}}')" "" "s8 --check: registado = nada"
eq "$(rc8 '{"v":1,"expires_at":"2020-01-01T00:00:00.000Z"}')" "" "s8 --check: config expirada = nada"
eq "$(rc8 '{"v":1}' install)" "" "s8: o install nao usa o aviso do --check"
eq "$( WS_CUR=8; SN_8=""; ws_s8_parse "$(printf 'skills\t7\npainel\ton\n')"; printf '%s' "$WS_S8_PAINEL" )" "on" "s8 parse: linha painel"
eq "$( WS_CUR=8; SN_8=""; WS_S8_PAINEL=velho; ws_s8_parse "$(printf 'skills\t7\n')"; printf '%s' "$WS_S8_PAINEL" )" "" "s8 parse: sem linha painel fica vazio"

# Passo 6: o scope user:email (D-34) lido do "gh auth status" (formatos novo e antigo, varias contas e servidores).
GHS_NEW='github.com
  ✓ Logged in to github.com account ana (keyring)
  - Active account: true
  - Git operations protocol: https
  - Token: gho_************************************
  - Token scopes: '"'"'gist'"'"', '"'"'read:org'"'"', '"'"'repo'"'"', '"'"'workflow'"'"'

  ✓ Logged in to github.com account ana-work (keyring)
  - Active account: false
  - Token scopes: '"'"'repo'"'"', '"'"'user:email'"'"'
ghe.corp.example
  ✓ Logged in to ghe.corp.example account ana (keyring)
  - Token scopes: '"'"'user'"'"
eq "$(ws_gh_scopes "$GHS_NEW")" "'gist', 'read:org', 'repo', 'workflow'" "gh scopes: a conta ativa do github.com"
ws_gh_email_scope "$(ws_gh_scopes "$GHS_NEW")"; eq "$?" 1 "gh scopes: sem user:email"
GHS_ACT=$(printf '%s\n' "$GHS_NEW" | sed -e 's/Active account: true/Active account: X/' -e 's/Active account: false/Active account: true/')
ws_gh_email_scope "$(ws_gh_scopes "$GHS_ACT")"; eq "$?" 0 "gh scopes: a outra conta ativa tem user:email"
GHS_OLD='github.com
  ✓ Logged in to github.com as ana (oauth_token)
  ✓ Git operations for github.com configured to use https protocol.
  ✓ Token: *******************
  ✓ Token scopes: gist, read:org, repo, user, workflow'
eq "$(ws_gh_scopes "$GHS_OLD")" "gist, read:org, repo, user, workflow" "gh scopes: formato antigo"
ws_gh_email_scope "$(ws_gh_scopes "$GHS_OLD")"; eq "$?" 0 "gh scopes: user inclui o user:email"
ws_gh_email_scope "$(ws_gh_scopes "$(printf 'github.com\n  ✓ Logged in to github.com account a (GH_TOKEN)\n  - Active account: true\n')")"; eq "$?" 0 "gh scopes: sem a linha (token fine-grained) = nao se sabe, nao avisa"
eq "$(ws_gh_scopes "$(printf 'ghe.corp\n  - Token scopes: user\n')")" "-" "gh scopes: so outro servidor = nao se sabe"
ws_gh_email_scope "none"; eq "$?" 1 "gh scopes: none = sem scope"
ws_gh_email_scope "'repo', 'user:emailx'"; eq "$?" 1 "gh scopes: so o nome exato"
ws_gh_email_scope "'repo','user:email'"; eq "$?" 0 "gh scopes: sem espacos"
# ws_s6_scope: no --check e sem terminal so o aviso; ao instalar com terminal pergunta e corre o refresh.
s6s() { # modo tty resposta(s|n) scopes-depois -> SW_6#chamadas
  ( WS_CUR=6; SW_6=""; WS_MODE=$1; WS_SIM=0; WS_GH_SCOPE_ASKED=""; WS_STEP_LOG=/dev/null; S6_TTY=$2; S6_ANS=$3; S6_AFTER=$4; : > "$PF/s6.calls"
    ws_has_tty() { [ "$S6_TTY" = 1 ]; }; ws_ask() { printf 'ask ' >> "$PF/s6.calls"; [ "$S6_ANS" = s ]; }
    ws_run_login() { shift; printf '%s ' "$*" >> "$PF/s6.calls"; }
    ws_timeout() { printf 'github.com\n  ✓ Logged in to github.com account a (keyring)\n  - Token scopes: %s\n' "$S6_AFTER"; }
    ws_s6_scope gh "$GHS_NEW"; printf '%s#%s#%s' "$SW_6" "$(sed 's/ $//' "$PF/s6.calls")" "$WS_GH_SCOPE_WARN" )
}
eq "$(s6s check 1 s "'user:email'")" "E-TEL-03|gh auth refresh -h github.com -s user:email
##1" "s6 scope --check: so o aviso"
eq "$(s6s install 0 s "'user:email'")" "E-TEL-03|gh auth refresh -h github.com -s user:email
##1" "s6 scope sem terminal: so o aviso com o comando"
eq "$(s6s install 1 s "'repo', 'user:email'")" "#ask auth refresh -h github.com -s user:email#0" "s6 scope interativo: sim = refresh, sem aviso"
eq "$(s6s install 1 s "'repo'")" "E-TEL-03|gh auth refresh -h github.com -s user:email
#ask auth refresh -h github.com -s user:email#1" "s6 scope interativo: o refresh nao deu = aviso"
eq "$(s6s install 1 n "'user:email'")" "E-TEL-03|gh auth refresh -h github.com -s user:email
#ask#1" "s6 scope interativo: nao = aviso"
eq "$( WS_CUR=6; SW_6=""; WS_MODE=check; ws_s6_scope gh "$GHS_OLD"; printf '%s#%s' "$SW_6" "$WS_GH_SCOPE_WARN" )" "#0" "s6 scope: com user = nada"
grep -q 'auth login --hostname github.com --git-protocol https --web --scopes user:email$' "$ROOT/setup/setup-mac.sh" && ok || ko "s6: o login pede o scope user:email"

# O painel no --check (spec 6.8): o config.json da telemetria decide se ha alguma coisa a testar.
TC="$WS_TMP/tc"; mkdir -p "$TC"
tcfg() { # enabled panel_url expires_at -> config.json (como o install-user o escreve; enabled = registado)
  local part=null
  [ "$1" = true ] && part='{\n    "p": "0123456789abcdef0123456789abcdef",\n    "credential": "c",\n    "name": "ana"\n  }'
  printf '{\n  "v": 1,\n  "enabled": %s,\n  "workshop": "dev",\n  "panel_url": "%s",\n  "expires_at": "%s",\n  "participant": '"$part"'\n}\n' "$1" "$2" "$3" > "$TC/config.json"
}
tcfg true "https://panel.example.test/" "2026-10-21T00:00:00.000Z"
eq "$(ws_tel_panel_url "$TC/config.json" 2026-10-19T12:00:00Z)" "https://panel.example.test" "painel: ligado, com panel_url e em vigor = testa (sem a / do fim)"
eq "$(ws_tel_panel_url "$TC/config.json" 2026-10-21T00:00:01Z)" "" "painel: config expirada = nada a testar"
tcfg true "https://panel.example.test/" "2020-01-02T00:00:00.000Z"
eq "$(ws_tel_panel_url "$TC/config.json")" "" "painel: config expirada (agora, sem data dada) = nada a testar"
tcfg true "https://panel.example.test" "2099-01-01T00:00:00.000Z"
eq "$(ws_tel_panel_url "$TC/config.json")" "https://panel.example.test" "painel: em vigor (agora)"
tcfg false "https://panel.example.test" "2099-01-01T00:00:00.000Z"
eq "$(ws_tel_panel_url "$TC/config.json")" "" "painel: participacao desligada = nada a testar"
tcfg true "" "2099-01-01T00:00:00.000Z"
eq "$(ws_tel_panel_url "$TC/config.json")" "" "painel: panel_url vazio = nada a testar"
tcfg true "  " "2099-01-01T00:00:00.000Z"
eq "$(ws_tel_panel_url "$TC/config.json")" "" "painel: panel_url so com espacos = nada a testar"
tcfg true "panel.example.test" "2099-01-01T00:00:00.000Z"
eq "$(ws_tel_panel_url "$TC/config.json")" "" "painel: panel_url sem http(s) = nada a testar"
tcfg true "https://panel.example.test" ""
eq "$(ws_tel_panel_url "$TC/config.json")" "https://panel.example.test" "painel: sem expires_at = em vigor"
printf '{"v":1,"enabled":true,"panel_url":"http://127.0.0.1:9/p","expires_at":"2099-01-01T00:00:00.000Z"}' > "$TC/one.json"
eq "$(ws_tel_panel_url "$TC/one.json")" "http://127.0.0.1:9/p" "painel: JSON numa linha"
printf '{"v":1,"enabled":trueish,"panel_url":"http://x"}' > "$TC/bad.json"
eq "$(ws_tel_panel_url "$TC/bad.json")" "" "painel: enabled que nao e true = nada a testar"
eq "$(ws_tel_panel_url "$TC/nao-existe.json")" "" "painel: sem config.json = nada a testar"
for c in '{"ok":true}|0' '{ "ok" : true }|0' '{"ok":true,"v":2}|0' '{"v":2,"ok":true}|0' '{"ok":false}|1' '{"ok":"true"}|1' '<html>ok</html>|1' '|1' '{"ok":trueish}|1'; do
  ws_tel_health_ok "${c%|*}"; eq "$?" "${c##*|}" "painel: /health [${c%|*}]"
done
ws_tel_health_ok "$(printf '{\n  "ok": true\n}\n')"; eq "$?" 0 "painel: /health em varias linhas"
eq "$(ws_tel_why 0 200 '{"ok":true}')" "" "painel: responde"
eq "$(ws_tel_why 7 000 '')" "curl 7" "painel: nao liga"
eq "$(ws_tel_why 28 000 '')" "curl 28" "painel: sem resposta a tempo"
eq "$(ws_tel_why 0 503 '{"ok":true}')" "HTTP 503" "painel: HTTP 503"
eq "$(ws_tel_why 0 302 '')" "HTTP 302" "painel: redirecionado (portal de WiFi, filtro)"
eq "$(ws_tel_why 0 200 '<html>blocked</html>')" 'not {"ok":true}' "painel: pagina web em vez do JSON"
eq "$(ws_tel_why 0 200 '{"ok":false}')" 'not {"ok":true}' "painel: ok false"
# ws_s8_panel_check com um curl falso (FC_RC, FC_CODE, FC_BODY): o aviso, a nota e quando nem chama o curl.
tpc() { # modo -> SW_8#SN_8#chamadas do curl
  ( HOME="$TC/h"; WS_HOME="$TC/h/.workshop-claude"; WS_MODE=$1; WS_CUR=8; SW_8=""; SN_8=""; WS_STEP_LOG=/dev/null; WS_UA=t; : > "$TC/calls"
    mkdir -p "$WS_HOME/telemetry"; cp "$TC/config.json" "$WS_HOME/telemetry/config.json"
    curl() { local o="" u=""; while [ $# -gt 0 ]; do case "$1" in -o) o=$2; shift ;; http*) u=$1 ;; esac; shift; done
      printf '%s ' "$u" >> "$TC/calls"; [ -n "$o" ] && printf '%s' "${FC_BODY:-}" > "$o"; printf '%s' "${FC_CODE:-000}"; return "${FC_RC:-0}"; }
    ws_s8_panel_check; printf '%s#%s#%s' "$SW_8" "$SN_8" "$(sed 's/ $//' "$TC/calls")" )
}
tcfg true "https://panel.example.test/" "2099-01-01T00:00:00.000Z"
eq "$(FC_RC=0 FC_CODE=200 FC_BODY='{"ok":true}' tpc check)" "#Workshop panel: on, and it answers from this network.
#https://panel.example.test/health" "painel --check: responde = nota, sem aviso"
eq "$(FC_RC=7 FC_CODE=000 tpc check)" "E-TEL-01|https://panel.example.test/ · curl 7
##https://panel.example.test/health" "painel --check: nao responde = aviso E-TEL-01"
eq "$(FC_RC=0 FC_CODE=200 FC_BODY='<html>login</html>' tpc check)" 'E-TEL-01|https://panel.example.test/ · not {"ok":true}
##https://panel.example.test/health' "painel --check: JSON errado = aviso E-TEL-01"
eq "$(FC_RC=0 FC_CODE=403 FC_BODY='denied' tpc doctor)" "E-TEL-01|https://panel.example.test/ · HTTP 403
##https://panel.example.test/health" "painel --doctor: HTTP 403 = aviso E-TEL-01"
eq "$(FC_RC=7 tpc install)" "##" "painel: o install nunca testa o painel"
tcfg false "https://panel.example.test/" "2099-01-01T00:00:00.000Z"
eq "$(FC_RC=7 tpc check)" "##" "painel --check: participacao desligada = nada (nem chama o curl)"
tcfg true "" "2099-01-01T00:00:00.000Z"
eq "$(FC_RC=7 tpc check)" "##" "painel --check: sem panel_url = nada (nem chama o curl)"
# O detect do passo 8 no --check: o kit instalado testa o painel; o aviso nunca faz o passo falhar.
tcfg true "https://panel.example.test" "2099-01-01T00:00:00.000Z"
r=$( HOME="$TC/h"; WS_HOME="$TC/h/.workshop-claude"; KIT_SRC="$PF/kit"; WS_MODE=check; WS_CUR=8; SN_8=""; SD_8=""; SF_8=""; SW_8=""; WS_STEP_LOG=/dev/null; WS_SUBST_SL=0; WS_UA=t
  mkdir -p "$WS_HOME/telemetry"; cp "$TC/config.json" "$WS_HOME/telemetry/config.json"
  ws_kit_ensure() { return 0; }; ws_registar_flush() { :; }; ws_s8_config_dir() { :; }; ws_iu() { printf 'skills\t7\nagentes\t3\n'; }
  curl() { printf '000'; return 6; }
  ws_s8_detect >/dev/null; printf '%s|%s|%s' "$?" "$SW_8" "$SF_8" )
eq "$r" "0|E-TEL-01|https://panel.example.test/ · curl 6
|" "s8 detect --check: painel inacessivel = aviso, o passo fica ok"
# Com o curl a serio contra um servidor local (o mesmo caminho do setup): responde, JSON errado, porta fechada.
if [ -n "$NODE" ]; then
  "$NODE" -e '
    const s = require("http").createServer((q, r) => {
      if (q.url === "/ok/health") { r.setHeader("content-type", "application/json"); r.end("{\"ok\":true}"); }
      else if (q.url === "/bad/health") r.end("<html>portal</html>");
      else { r.statusCode = 404; r.end("{}"); }
    });
    s.listen(0, "127.0.0.1", () => { require("fs").writeFileSync(process.argv[1], String(s.address().port)); });
    setTimeout(() => process.exit(0), 20000);' "$TC/port" & TS=$!
  i=0; while [ ! -s "$TC/port" ] && [ "$i" -lt 100 ]; do sleep 0.1; i=$((i + 1)); done
  TP=$(cat "$TC/port" 2>/dev/null)
  rp() { ( WS_STEP_LOG=/dev/null; WS_UA=t; export NO_PROXY='*' no_proxy='*'; unset HTTPS_PROXY https_proxy HTTP_PROXY http_proxy ALL_PROXY all_proxy
    ws_tel_probe "$1"; printf '%s|%s' "$?" "$WS_TEL_WHY" ); }
  eq "$(rp "http://127.0.0.1:$TP/ok")" "0|" "painel (curl): responde {\"ok\":true}"
  eq "$(rp "http://127.0.0.1:$TP/bad")" '1|not {"ok":true}' "painel (curl): pagina em vez do JSON"
  eq "$(rp "http://127.0.0.1:$TP/nada")" "1|HTTP 404" "painel (curl): HTTP 404"
  kill "$TS" 2>/dev/null; wait "$TS" 2>/dev/null
  eq "$(rp "http://127.0.0.1:$TP/ok")" "1|curl 7" "painel (curl): porta fechada"
fi

# check_ok: so no fim de um --check sem falhas (avisos podem ficar), com o node e o emit.mjs do kit.
for c in "check 0 0" "check 1 1" "check 3 1" "install 0 1" "doctor 0 1" "uninstall 0 1"; do
  read -r cm cf cw <<EOF
$c
EOF
  ws_check_ok_want "$cm" "$cf"; eq "$?" "$cw" "check_ok: modo $cm, faltam $cf"
done
if [ -n "$NODE" ]; then
  CK="$WS_TMP/ck"; mkdir -p "$CK/.workshop-claude/kit/telemetry"
  printf '%s\n' 'import { appendFileSync } from "node:fs";' 'appendFileSync(process.env.CK_OUT, process.argv.slice(2).join(" ") + "\n"); process.exit(Number(process.env.CK_RC || 0));' >"$CK/.workshop-claude/kit/telemetry/emit.mjs"
  ck() { ( WS_HOME="$CK/.workshop-claude"; WS_MODE=$1; WS_FALTAM=$2; WS_NODE=${3-$NODE}; CK_OUT="$CK/out"; export CK_OUT; : > "$CK/out"
    ws_check_ok_emit; printf '%s|%s' "$?" "$(cat "$CK/out")" ); }
  eq "$(ck check 0)" "0|check_ok" "check_ok: --check sem falhas chama o emit.mjs check_ok"
  eq "$(ck check 1)" "0|" "check_ok: --check com falhas nao envia"
  eq "$(ck install 0)" "0|" "check_ok: a instalacao nunca envia"
  eq "$(ck doctor 0)" "0|" "check_ok: o --doctor nunca envia"
  eq "$(CK_RC=3; export CK_RC; ck check 0)" "0|check_ok" "check_ok: um erro do emit.mjs e ignorado"
  eq "$(ck check 0 '')" "0|" "check_ok: sem node nao envia (nem falha)"
  eq "$(ck check 0 "$CK/nao-existe")" "0|" "check_ok: node que nao existe nao envia (nem falha)"
  rm -f "$CK/.workshop-claude/kit/telemetry/emit.mjs"
  eq "$(ck check 0)" "0|" "check_ok: sem emit.mjs (kit antigo) nao envia (nem falha)"
fi

# Passo 9: o projeto das missoes monta-se como o de treino (so com o assemble-missions.mjs), depois dele.
mkdir -p "$PF/k9/installer"; : > "$PF/k9/installer/assemble-sandbox.mjs"
p9() { ( HOME="$PF/h"; WS_HOME="$HOME/.workshop-claude"; WS_PROJ="$HOME/workshop-claude"; KIT_SRC="$PF/k9"; WS_NODE=node; WS_LANG_KIT=pt; WS_CUR=9; SF_9=""; SN_9=""
  ws_kit_ensure() { return 0; }; ws_s9_migrate() { :; }; ws_s9_tests() { :; }; ws_s9_lang_check() { :; }
  ws_assemble() { printf '%s\n' "$*" | sed "s#$HOME#~#g" >> "$PF/asm"; }
  : > "$PF/asm"; ws_s9_install; cat "$PF/asm" ); }
r=$(p9); case "$r" in *missions*) ko "s9: sem assemble-missions.mjs nao monta as missoes [$r]" ;; *) ok ;; esac
eq "$(printf '%s\n' "$r" | head -n 1)" "assemble-demo.mjs ~/workshop-claude/demo-project .arena-kit.json refs/tags/arena-start --node node --language pt" "s9: kit sem assemble-canivete.mjs monta a Arena"
: > "$PF/k9/installer/assemble-missions.mjs"
eq "$(p9)" "assemble-demo.mjs ~/workshop-claude/demo-project .arena-kit.json refs/tags/arena-start --node node --language pt
assemble-sandbox.mjs ~/workshop-claude/practice-project .sandbox-kit.json HEAD --language pt
assemble-missions.mjs ~/workshop-claude/missions-project .missions-kit.json HEAD --language pt --kit-dir ~/.workshop-claude/kit" "s9: Arena, treino e missoes, por esta ordem"
# Com o assemble-canivete.mjs, o Projeto 1 por defeito e o Canivete; a Arena so com WORKSHOP_P1=arena.
: > "$PF/k9/installer/assemble-canivete.mjs"
eq "$(p9)" "assemble-canivete.mjs ~/workshop-claude/canivete-project .canivete-kit.json refs/tags/canivete-start --node node --language pt
assemble-sandbox.mjs ~/workshop-claude/practice-project .sandbox-kit.json HEAD --language pt
assemble-missions.mjs ~/workshop-claude/missions-project .missions-kit.json HEAD --language pt --kit-dir ~/.workshop-claude/kit" "s9: Canivete (por defeito), treino e missoes, por esta ordem"
eq "$(WORKSHOP_P1=Arena p9 | head -n 1)" "assemble-demo.mjs ~/workshop-claude/demo-project .arena-kit.json refs/tags/arena-start --node node --language pt" "s9: WORKSHOP_P1=Arena monta a Arena"
r=$( HOME="$PF/h"; WS_PROJ="$HOME/workshop-claude"; WS_PROJ_SHOW='~/workshop-claude'; KIT_SRC="$PF/k9"; WS_MODE=install; WS_CUR=9; SF_9=""; SW_9=""; SD_9=""; SN_9=""
  ws_kit_ensure() { return 0; }; ws_s9_migrate() { :; }; ws_s9_lang_check() { :; }; ws_proj_state() { echo ok; }
  WORKSHOP_P1=kanivete ws_s9_detect >/dev/null; printf '%s|%s|%s' "$?" "$SD_9" "$SN_9" )
eq "$r" "0|Pocketknife at ~/workshop-claude/canivete-project|WORKSHOP_P1=kanivete is not canivete or arena, so I ignored it and set up the Pocketknife (the default)." "s9 detect: detalhe do Canivete e nota do WORKSHOP_P1 ignorado"
r=$( HOME="$PF/h"; WS_PROJ="$HOME/workshop-claude"; WS_PROJ_SHOW='~/workshop-claude'; KIT_SRC="$PF/k9"; WS_MODE=install; WS_CUR=9; SF_9=""; SW_9=""; SD_9=""; SN_9=""
  ws_kit_ensure() { return 0; }; ws_s9_migrate() { :; }; ws_s9_lang_check() { :; }; ws_proj_state() { echo ok; }
  WORKSHOP_P1=arena ws_s9_detect >/dev/null; printf '%s|%s|%s' "$?" "$SD_9" "$SN_9" )
eq "$r" "0|Security Arena at ~/workshop-claude/demo-project|" "s9 detect: detalhe da Arena"
r=$( HOME="$PF/h"; WS_PROJ="$HOME/workshop-claude"; KIT_SRC="$PF/k9"; WS_MODE=install; WS_CUR=9; SF_9=""; SW_9=""
  ws_kit_ensure() { return 0; }; ws_s9_migrate() { :; }; ws_proj_state() { case "$1" in (*canivete-project) echo vazia ;; (*) echo ok ;; esac; }
  ws_s9_detect >/dev/null; printf '%s|%s' "$?" "$SF_9" )
eq "$r" "1|E-DEMO-01|$PF/h/workshop-claude/canivete-project" "s9 detect: sem o Canivete falta montar (mesmo com a Arena montada)"
r=$( HOME="$PF/h"; WS_PROJ="$HOME/workshop-claude"; KIT_SRC="$PF/k9"; WS_MODE=install; WS_CUR=9; SF_9=""; SW_9=""
  ws_kit_ensure() { return 0; }; ws_s9_migrate() { :; }; ws_proj_state() { case "$1" in (*canivete-project) echo propria ;; (*) echo ok ;; esac; }
  ws_s9_detect >/dev/null; printf '%s|%s|%s' "$?" "$SF_9" "$SW_9" )
eq "$r" "0||E-DEMO-06|~/workshop-claude/canivete-project" "s9 detect: Canivete com historico proprio e o aviso E-DEMO-06"
r=$( WS_CUR=9; SN_9=""; SF_9=""; WS_P1=canivete; WS_PROJ="$PF/sem-gen"; ws_s9_tests; printf '%s|%s|%s' "$?" "$SF_9" "$SN_9" )
eq "$r" "0||The Pocketknife doesn't have tools/gen.mjs yet. I skipped the check." "s9 testes: Canivete sem tools/gen.mjs salta a verificacao"
rm -f "$PF/k9/installer/assemble-canivete.mjs"
r=$( HOME="$PF/h"; WS_PROJ="$HOME/workshop-claude"; KIT_SRC="$PF/k9"; WS_MODE=install; WS_CUR=9; SF_9=""; SW_9=""; rm -rf "$WS_PROJ"
  ws_kit_ensure() { return 0; }; ws_s9_migrate() { :; }; ws_proj_state() { case "$1" in (*missions-project) echo vazia ;; (*) echo ok ;; esac; }
  ws_s9_detect >/dev/null; printf '%s|%s' "$?" "$SF_9" )
eq "$r" "1|E-DEMO-01|$PF/h/workshop-claude/missions-project" "s9 detect: sem o projeto das missoes falta montar"

# Passo 9 a serio (node e assemblers do repositorio) num HOME falso com um git global hostil: assinatura sem gpg,
# hook que falha, gitignore global com *.js e lib/, autocrlf + safecrlf.
if [ -n "$NODE" ]; then
  HH="$G5/hh"; mkdir -p "$HH/hooks"; printf '#!/bin/sh\necho ran >> "%s/hook-ran"\nexit 1\n' "$HH" > "$HH/hooks/pre-commit"; chmod +x "$HH/hooks/pre-commit"
  printf '*.js\nlib/\n' > "$HH/ignore"
  printf '[commit]\n\tgpgsign = true\n[tag]\n\tgpgsign = true\n[gpg]\n\tprogram = %s/no-gpg\n[core]\n\thooksPath = %s/hooks\n\texcludesFile = %s/ignore\n\tautocrlf = true\n\tsafecrlf = true\n\teditor = false\n[user]\n\tuseConfigOnly = true\n' "$HH" "$HH" "$HH" > "$HH/gitconfig"
  EH="$G5/Bea Teste"
  g5e() { # funcao do passo 9 -> rc#SF#SW#SN
    ( export HOME="$EH" GIT_CONFIG_GLOBAL="$HH/gitconfig" GIT_CONFIG_NOSYSTEM=1; mkdir -p "$HOME/.workshop-claude"
      WS_HOME="$HOME/.workshop-claude"; WS_PROJ="$HOME/workshop-claude"; WS_PROJ_SHOW='~/workshop-claude'
      WORKSHOP_P1=${G5_P1-arena}
      WS_NODE="$NODE"; KIT_SRC="$ROOT"; WS_LANG_KIT=en; WS_CUR=9; WS_MODE=${G5_MODE:-install}; WS_STEP_LOG="$G5/e.log"; : > "$WS_STEP_LOG"
      SF_9=""; SW_9=""; SN_9=""; SD_9=""
      ws_kit_ensure() { return 0; }
      "$1"; printf '%s#%s#%s#%s#%s' "$?" "$SF_9" "$SW_9" "$SN_9" "$SD_9" )
  }
  A="$EH/workshop-claude/demo-project"; P="$EH/workshop-claude/practice-project"
  r=$(g5e ws_s9_install); case "$r" in '0###'*) ok ;; *) ko "s9 git hostil: instala [$r] $(grep ERROR "$G5/e.log" | head -n 2)" ;; esac
  eq "$(g5git -C "$A" cat-file -t arena-start 2>/dev/null)" commit "s9 git hostil: tag arena-start leve"
  [ -n "$(g5git -C "$A" ls-files 'lib/*.js')" ] && [ -n "$(g5git -C "$P" ls-files 'src/*.js')" ] && ok || ko "s9 git hostil: os .js entram no commit apesar do gitignore global"
  [ ! -e "$HH/hook-ran" ] && ok || ko "s9 git hostil: o hook da pessoa correu"
  # Instalado com WORKSHOP_P1=arena: o --check sem a variavel ve a Arena (a escolha gravada), nao o Canivete em falta.
  r=$(G5_P1="" G5_MODE=check g5e ws_s9_detect); case "$r" in '0###App tests: '*'#Security Arena at ~/workshop-claude/demo-project') ok ;; *) ko "s9 --check depois de WORKSHOP_P1=arena: a Arena [$r]" ;; esac
  # Ctrl-C a meio da copia do projeto de treino: so a marca incompleta e um ficheiro. Volta a montar, sem backup.
  rm -rf "$P"; mkdir -p "$P"; printf '{"status":"incomplete","language":"en"}\n' > "$P/.sandbox-kit.json"; echo '{}' > "$P/package.json"
  r=$(g5e ws_s9_install); case "$r" in '0###'*) ok ;; *) ko "s9 montagem interrompida: refeita sem backup [$r]" ;; esac
  [ -n "$(g5git -C "$P" ls-files 'src/*.js')" ] && ok || ko "s9 montagem interrompida: projeto completo"
  # Historico proprio na Arena (sem a tag) e uma nota: fica tudo como esta, com o aviso E-DEMO-04.
  echo mine > "$A/MY-NOTES.md"; g5git -C "$A" tag -d arena-start >/dev/null 2>&1
  r=$(g5e ws_s9_install); case "$r" in '0##E-DEMO-04|'*) ok ;; *) ko "s9 historico proprio: aviso E-DEMO-04 [$r]" ;; esac
  [ "$(cat "$A/MY-NOTES.md" 2>/dev/null)" = mine ] && ok || ko "s9 historico proprio: a nota da pessoa ficou"
  r=$(g5e ws_s9_detect); case "$r" in '0##E-DEMO-04|'*) ok ;; *) ko "s9 detect historico proprio: aviso e nao E-DEMO-01 [$r]" ;; esac
  # Sem .git no projeto de treino: refeito, e a pasta anterior (com o trabalho) vai para o backup.
  echo mine > "$P/MY-NOTES.md"; rm -rf "$P/.git"
  r=$(g5e ws_s9_install); case "$r" in *'Your previous folder is saved in ~/.workshop-claude/backup/'*'/practice-project.'*) ok ;; *) ko "s9 sem .git: nota do backup [$r]" ;; esac
  # shellcheck disable=SC2012
  [ "$(cat "$EH"/.workshop-claude/backup/*/practice-project/MY-NOTES.md 2>/dev/null)" = mine ] && [ ! -e "$P/MY-NOTES.md" ] && ok || ko "s9 sem .git: o trabalho esta no backup"
  # Canivete (o Projeto 1 por defeito) com o assemble-canivete.mjs do repositorio: monta-se ao lado da Arena da
  # instalacao anterior, que fica como estava, e o --check corre o "node tools/gen.mjs --check".
  CV="$EH/workshop-claude/canivete-project"
  r=$(G5_P1="" g5e ws_s9_install)
  case "$r" in '0###Pocketknife check: the specs and tests of the '*' tools are up to date.'*'#Pocketknife at ~/workshop-claude/canivete-project') ok ;; *) ko "s9 Canivete: instala [$r] $(grep ERROR "$G5/e.log" | head -n 2)" ;; esac
  eq "$(g5git -C "$CV" cat-file -t canivete-start 2>/dev/null)" commit "s9 Canivete: tag canivete-start leve"
  [ -f "$CV/.canivete-kit.json" ] && [ -f "$CV/tools/gen.mjs" ] && ok || ko "s9 Canivete: marca e tools/gen.mjs"
  [ "$(cat "$A/MY-NOTES.md" 2>/dev/null)" = mine ] && [ -f "$A/.arena-kit.json" ] && ok || ko "s9 Canivete: a Arena anterior ficou como estava"
  r=$(G5_P1="" G5_MODE=check g5e ws_s9_detect); case "$r" in '0##E-DEMO-04|'*'Pocketknife check:'*) ko "s9 Canivete --check: a Arena nao escolhida nao da aviso [$r]" ;; '0###Pocketknife check:'*) ok ;; *) ko "s9 Canivete --check [$r]" ;; esac
  printf '\nchanged\n' >> "$CV/TASKS.md"
  r=$(G5_P1="" G5_MODE=check g5e ws_s9_detect); case "$r" in '0#E-DEMO-05|node tools/gen.mjs --check#'*) ok ;; *) ko "s9 Canivete --check: TASKS.md alterado e o E-DEMO-05 [$r]" ;; esac
  g5git -C "$CV" checkout -q -- TASKS.md >/dev/null 2>&1
  r=$(G5_P1="" G5_MODE=check g5e ws_s9_detect); case "$r" in '0###'*) ok ;; *) ko "s9 Canivete --check: reposto, verde outra vez [$r]" ;; esac
  # Historico proprio no Canivete (sem a tag canivete-start): fica como esta, com o aviso E-DEMO-06.
  g5git -C "$CV" tag -d canivete-start >/dev/null 2>&1
  r=$(G5_P1="" g5e ws_s9_install); case "$r" in '0##E-DEMO-06|~/workshop-claude/canivete-project'*) ok ;; *) ko "s9 Canivete historico proprio: aviso E-DEMO-06 [$r]" ;; esac
fi
# --- chaos G6-lifecycle: lock, interrupcao, copia guardada, restos de sudo, settings.json, pastas sem escrita
G6="$WS_TMP/g6"; mkdir -p "$G6"
WS_NODE=$NODE; code=$(ws_js "$WS_JS_MSGS" "$ROOT/setup/messages.en.json"); eval "$code"
# lock: PID reutilizado por outro programa, setup vivo, setup parado (Ctrl+Z), lock antigo, o proprio PID
LK="$G6/lk"; mkdir -p "$LK"
/bin/sleep 30 & SP=$!
( WS_HOME=$LK; mkdir "$LK/.lock"; printf '%s\n%s\n' "$SP" "Thu Jan  1 00:00:00 2026" > "$LK/.lock/pid"
  ws_lock 2>/dev/null; printf '%s|%s' "$?" "$(sed -n 1p "$LK/.lock/pid")"; [ "$(sed -n 1p "$LK/.lock/pid")" = $$ ] && printf '|mine' ) > "$G6/o"
eq "$(cut -d'|' -f1,3 "$G6/o")" "0|mine" "ws_lock: PID reutilizado (outra hora de arranque) nao bloqueia"
rm -rf "$LK/.lock"; mkdir "$LK/.lock"; printf '%s\n' "$SP" > "$LK/.lock/pid"; touch -t 202601010000 "$LK/.lock"
( WS_HOME=$LK; ws_lock 2>/dev/null; printf '%s' "$?" ) > "$G6/o"
eq "$(cat "$G6/o")" 0 "ws_lock: lock antigo so com o PID de um programa que nao e um bash nao bloqueia"
/bin/bash -c 'sleep 30' & HP=$!
sleep 0.2
rm -rf "$LK/.lock"; mkdir "$LK/.lock"; printf '%s\n%s\n' "$HP" "$(ws_proc_start "$HP")" > "$LK/.lock/pid"
( WS_HOME=$LK; ws_lock; printf '|%s' "$?" ) > "$G6/o" 2>&1
case "$(cat "$G6/o")" in *"already running in another window (PID $HP, since "*"|1") ok ;; *) ko "ws_lock: setup vivo bloqueia com a mensagem do catalogo [$(cat "$G6/o")]" ;; esac
kill -STOP "$HP"; sleep 0.2
( WS_HOME=$LK; ws_lock; printf '|%s' "$?" ) > "$G6/o" 2>&1
case "$(cat "$G6/o")" in *"paused in a Terminal window"*"Type fg"*"|1") ok ;; *) ko "ws_lock: setup parado (T) diz para fazer fg [$(cat "$G6/o")]" ;; esac
kill -CONT "$HP"; kill "$HP" 2>/dev/null; wait "$HP" 2>/dev/null
( WS_HOME=$LK; ws_lock 2>/dev/null; printf '%s' "$?" ) > "$G6/o"
eq "$(cat "$G6/o")" 0 "ws_lock: depois de o dono acabar, o seguinte fica com o lock"
rm -rf "$LK/.lock"; mkdir "$LK/.lock"; printf '%s\n%s\n' "$$" "$(ws_proc_start $$)" > "$LK/.lock/pid"
( WS_HOME=$LK; ws_lock 2>/dev/null; printf '%s' "$?" ) > "$G6/o"
eq "$(cat "$G6/o")" 0 "ws_lock: o lock com o proprio PID (depois do exec da copia nova) e retomado"
rm -rf "$LK/.lock"; mkdir "$LK/.lock"
( WS_HOME=$LK; ws_lock 2>/dev/null; printf '%s' "$?" ) > "$G6/o"
eq "$(cat "$G6/o")" 1 "ws_lock: .lock acabado de criar (ainda sem PID) bloqueia"
touch -t 202601010000 "$LK/.lock"
( WS_HOME=$LK; ws_lock 2>/dev/null; printf '%s' "$?" ) > "$G6/o"
eq "$(cat "$G6/o")" 0 "ws_lock: .lock sem PID com mais de 10 s e velho"
kill "$SP" 2>/dev/null; wait "$SP" 2>/dev/null
rm -rf "$LK/.lock"; mkdir "$LK/.lock"; printf '99999999\n' > "$LK/.lock/pid"
( WS_HOME=$LK; WS_TMP="$G6/t1"; mkdir -p "$WS_TMP"; ws_cleanup; [ -d "$LK/.lock" ] && printf keep ) > "$G6/o"
eq "$(cat "$G6/o")" keep "ws_cleanup: nao apaga o lock de outro setup"
( WS_HOME=$LK; WS_TMP="$G6/t1"; rm -rf "$LK/.lock"; ws_lock 2>/dev/null; ws_cleanup; [ -d "$LK/.lock" ] || printf gone ) > "$G6/o"
eq "$(cat "$G6/o")" gone "ws_cleanup: apaga o seu proprio lock"
# interrupcao: uma so linha no log, mesmo com dois sinais
WS_SOURCE_ONLY=1 /bin/bash -c '. "$1"; WS_HOME=$2; WS_LOG=$3; WS_TMP=$4; mkdir -p "$WS_TMP"; ws_lock; trap ws_interrupted INT TERM HUP; kill -HUP $$; sleep 2' \
  _ "$ROOT/setup/setup-mac.sh" "$LK" "$G6/int.log" "$G6/t2" 2>/dev/null
eq "$(grep -c interrupted "$G6/int.log" 2>/dev/null)|$([ -d "$LK/.lock" ] && echo lock)" "1|" "ws_interrupted: uma linha no log e o lock removido"
# restos de sudo: pastas e ficheiros sem escrita, ~/.local/bin ficheiro
PH="$G6/home com espaço"; mkdir -p "$PH/.claude" "$PH/.local" "$PH/.workshop-claude"; : > "$PH/.local/bin"; printf '{}' > "$PH/.claude.json"
chmod 555 "$PH/.claude"; chmod 000 "$PH/.claude.json"
( HOME=$PH; WS_HOME="$PH/.workshop-claude"; CLAUDE_DIR="$PH/.claude"; WS_LOG=/dev/null; WS_CUR=0; SW_0=""; SN_0=""; CLAUDE_CONFIG_DIR=""
  ws_perm_scan; printf '%s\n%s' "$SW_0" "$SN_0" ) > "$G6/o"
grep -q '^E-PERM-01|~/.claude ~/.local/bin (not a folder) ~/.claude.json$' "$G6/o" && ok || ko "perm scan: aviso com os caminhos [$(cat "$G6/o")]"
grep -q 'run the setup again: chmod -R u+rwX ~/.claude ~/.claude.json$' "$G6/o" && grep -q 'run the setup again: mv ~/.local/bin ~/.local/bin.old$' "$G6/o" && ok || ko "perm scan: comandos exatos [$(cat "$G6/o")]"
( HOME=$PH; WS_HOME="$PH/.workshop-claude"; CLAUDE_DIR="$PH/.claude"; WS_LOG=/dev/null; WS_CUR=2; SF_2=""; CLAUDE_CONFIG_DIR=""
  ws_perm_scan >/dev/null; ws_perm_blocked "$HOME/.claude/downloads" "$HOME/.local/bin/claude" && printf '%s' "$SF_2" ) > "$G6/o"
eq "$(cat "$G6/o")" "E-PERM-01|~/.claude" "perm: passo 2 nao descarrega para uma pasta sem escrita"
chmod 755 "$PH/.claude"; chmod 644 "$PH/.claude.json"; rm -f "$PH/.local/bin"
( HOME=$PH; WS_HOME="$PH/.workshop-claude"; CLAUDE_DIR="$PH/.claude"; WS_LOG=/dev/null; WS_CUR=0; SW_0=""; SN_0=""; CLAUDE_CONFIG_DIR=""
  ws_perm_scan; printf '%s%s' "$SW_0" "$SN_0" ) > "$G6/o"
eq "$(cat "$G6/o")" "" "perm scan: pasta pessoal normal nao avisa"
( WS_LOG="$G6/rolog"; : > "$WS_LOG"; chmod 444 "$WS_LOG"; ws_say x; ws_log y; ws_flush_step_log ) > /dev/null 2> "$G6/e"
eq "$(cat "$G6/e")" "" "log sem escrita: nada no ecra (stderr)"
eq "$(HOME=$PH; ws_show_path "$PH/.local/bin")|$(HOME=$PH; ws_show_path "/x/a b")" "~/.local/bin|'/x/a b'" "ws_show_path"
# erro de permissao na saida de um passo ganha ao codigo generico (rede)
printf 'Downloading...\nmkdir: %s/.claude/downloads: Permission denied\n' "$PH" > "$G6/s2.log"
( HOME=$PH; WS_CUR=2; WS_STEP_LOG="$G6/s2.log"; WS_LOG=/dev/null; SF_2="E-CC-01|install.sh"; ws_perm_reclass; printf '%s' "$SF_2" ) > "$G6/o"
eq "$(cat "$G6/o")" "E-PERM-01|mkdir: ~/.claude/downloads: Permission denied" "reclass: E-CC-01 com EACCES passa a E-PERM-01"
printf 'git@host: Permission denied (publickey).\ncurl: (6) Could not resolve host\n' > "$G6/s2.log"
( HOME=$PH; WS_CUR=2; WS_STEP_LOG="$G6/s2.log"; WS_LOG=/dev/null; SF_2="E-NET-02|x"; ws_perm_reclass; printf '%s' "$SF_2" ) > "$G6/o"
eq "$(cat "$G6/o")" "E-NET-02|x" "reclass: publickey e erros de rede ficam como estao"
printf 'EACCES: permission denied\n' > "$G6/s2.log"
( HOME=$PH; WS_CUR=8; WS_STEP_LOG="$G6/s2.log"; WS_LOG=/dev/null; SF_8="E-CFG-05|x"; ws_perm_reclass; printf '%s' "$SF_8" ) > "$G6/o"
eq "$(cat "$G6/o")" "E-CFG-05|x" "reclass: E-CFG-05 fica"
# --check/--doctor: a causa da ultima instalacao que falhou (do setup.log), e a saida dessa instalacao
printf '10:00:01 === step 10: Agent Memory app (mode install)\n--- command output (step 10) ---\nerror: invalid peer certificate: UnknownIssuer\n--- end ---\n10:00:02 result step 10: aviso E-MEM-03|uv tool install\n10:05:00 === step 10: Agent Memory app (mode doctor)\n--- command output (step 10) ---\n[claude-code:x] y\n--- end ---\n' > "$G6/setup.log"
eq "$(WS_LOG="$G6/setup.log"; ws_last_install_result 10)" "E-MEM-03|uv tool install" "ultima instalacao: falha do passo 10"
eq "$(WS_LOG="$G6/setup.log"; ws_last_install_result 9)" "" "ultima instalacao: passo sem registo"
eq "$(WS_LOG="$G6/setup.log"; ws_last_step_output 10 | grep -c UnknownIssuer)" 1 "doctor: saida da instalacao, nao a do proprio doctor"
( WS_MODE=check; WS_LOG="$G6/setup.log"; WS_TMP=$G6; WS_SEM_DESKTOP=0; WS_COLOR=0; ws_s10_detect() { ws_fail E-MEM-01 ""; return 1; }
  ws_step 10 >/dev/null; printf '%s' "$SW_10" ) > "$G6/o"
eq "$(cat "$G6/o")" "$(printf 'E-SETUP-01|E-MEM-01\nE-MEM-03|uv tool install')" "--check: mostra a falha da ultima instalacao"
# --check: um projeto em falta diz qual e (o detalhe do E-DEMO-01 fica a seguir ao codigo, com ~)
( HOME=$PH; WS_MODE=check; WS_LOG="$G6/setup.log"; WS_TMP=$G6; WS_COLOR=0; ws_s9_detect() { ws_fail E-DEMO-01 "$PH/workshop-claude/missions-project"; return 1; }
  ws_step 9 >/dev/null; printf '%s' "$SF_9" ) > "$G6/o"
eq "$(cat "$G6/o")" "E-SETUP-01|E-DEMO-01: ~/workshop-claude/missions-project" "--check: o projeto em falta aparece pelo nome"
printf '10:06:00 result step 10: ja \n' >> "$G6/setup.log"
eq "$(WS_LOG="$G6/setup.log"; ws_last_install_result 10)" "" "ultima instalacao: depois de correr bem, nada"
# resumo: passo com aviso e sem detalhe mostra o titulo do aviso
( WS_LOG=/dev/null; WS_COLOR=0; ST_10=aviso; SD_10=""; SF_10=""; SN_10=""; SW_10="E-MEM-06|~/Applications
"; ws_print_result 10 >/dev/null; printf '%s' "$SD_10" ) > "$G6/o"
eq "$(cat "$G6/o")" "Couldn't create the Agent Memory shortcut (E-MEM-06)" "resumo: detalhe do primeiro aviso"
# passo 8: settings.json com comentarios -> o caminho e a linha no ecra, sem "0 skills"
( WS_CUR=8; WS_LOG=/dev/null; CLAUDE_DIR=/h/.claude; SF_8=""; SD_8=""; ws_s8_parse "$(printf 'erro\tE-CFG-05\nerro_detalhe\tnot valid JSON at line 2, column 3: a comment\nskills\t0\n')"; printf '%s|%s' "$SF_8" "$SD_8" ) > "$G6/o"
eq "$(cat "$G6/o")" "E-CFG-05|/h/.claude/settings.json · not valid JSON at line 2, column 3: a comment|" "s8: detalhe do E-CFG-05"
# passo 10: ~/Applications sem escrita -> aviso E-MEM-06 e o MCP e o selftest continuam; pasta dos dados sem escrita
AH="$G6/apph"; mkdir -p "$AH/Applications" "$AH/bin" "$AH/ws"; chmod 555 "$AH/Applications"
printf '#!/bin/sh\nprintf "Agent Memory 0.5.0 \302\267 Python 3.12.13\\n  [OK] x\\n"\n' > "$AH/bin/agent-memory"; chmod +x "$AH/bin/agent-memory"
( HOME=$AH; WS_HOME="$AH/ws"; KIT_SRC=""; WS_CUR=10; WS_STEP_LOG="$G6/s10.log"; : > "$WS_STEP_LOG"; WS_LOG=/dev/null; C_MEMORY_APP_VERSION=v0.5.0
  ws_memory_shortcut "$AH/bin/agent-memory"; printf '%s|%s|%s' "$?" "$(grep -c 'Permission denied' "$G6/s10.log")" "$([ -f "$AH/ws/extras-pendentes.tsv" ] && echo reg)" ) > "$G6/o" 2> "$G6/e"
eq "$(cat "$G6/o")|$(cat "$G6/e")" "1|1||" "atalho: ~/Applications sem escrita devolve 1, erro no log do passo e nada no ecra"
printf '#!/bin/sh\ncase "$1 $2" in "tool list") echo "agent-memory v0.5.0";; "tool dir") echo "%s/bin";; esac\n' "$AH" > "$AH/bin/uv"; chmod +x "$AH/bin/uv"
# o "claude mcp get" de verdade diz para que programa aponta o registo (G4: ws_memory_mcp_ok); o "memoria" antigo ja nao existe
printf '#!/bin/sh\ncase "$3" in agent-memory) printf "agent-memory:\\n  Command: %s/bin/agent-memory\\n" ;; *) exit 1 ;; esac\n' "$AH" > "$AH/bin/claude"; chmod +x "$AH/bin/claude"
( HOME=$AH; PATH="$AH/bin:$PATH"; WS_HOME="$AH/ws"; KIT_SRC=""; WS_CUR=10; WS_STEP_LOG="$G6/s10.log"; WS_LOG=/dev/null; WS_MODE=install; WS_NODE=$NODE
  WS_CLAUDE="$AH/bin/claude"; AGENT_MEMORY_HOME=""; MEMORIA_HOME=""; C_MEMORY_APP_VERSION=v0.5.0; SW_10=""; SF_10=""
  ws_s10_detect; printf '%s|%s|%s' "$?" "$SW_10" "$([ -f "$AH/.agent-memory/config.json" ] && echo cfg)" ) > "$G6/o" 2>&1
eq "$(cat "$G6/o")" "0|E-MEM-06|~/Applications
|cfg" "s10 detect: sem atalho possivel = aviso, sem reinstalar; config.json refeito"
chmod 755 "$AH/Applications"
mkdir -p "$AH/ro"; chmod 555 "$AH/ro"
( HOME=$AH; WS_STEP_LOG="$G6/s10.log"; AGENT_MEMORY_HOME="$AH/ro/mem"; WS_NODE=$NODE; ws_memory_config; printf '%s' "$?" ) > "$G6/o" 2> "$G6/e"
eq "$(cat "$G6/o")|$(cat "$G6/e")" "1|" "config.json: pasta sem escrita devolve 1 sem nada no ecra"
printf '#!/bin/sh\nprintf "  [OK] x\\n  [FAIL] Cannot write to %s/ro/mem: [Errno 13] Permission denied\\n"; exit 1\n' "$AH" > "$FAKE"
( HOME=$AH; WS_CUR=10; WS_STEP_LOG="$G6/s10.log"; WS_LOG=/dev/null; AGENT_MEMORY_HOME="$AH/ro/mem"; SW_10=""; SN_10=""; ws_memory_selftest "$FAKE" 0.5.0; printf '%s#%s' "${SW_10%%|*}" "$SN_10" ) > "$G6/o"
case "$(cat "$G6/o")" in "E-MEM-07#"*"chmod -R u+rwX ~/ro"*) ok ;; *) ko "selftest sem escrita -> E-MEM-07 com o comando [$(cat "$G6/o")]" ;; esac
chmod 755 "$AH/ro"
# kit-src: uma release republicada com a mesma tag (outro SHA-256) volta a ser descarregada; sem rede fica o antigo
KR="$G6/kr"; mkdir -p "$KR/rel/workshop-kit-v9/installer" "$KR/ws/kit-src/v9/installer"
: > "$KR/rel/workshop-kit-v9/installer/install-user.mjs"; printf 'novo\n' > "$KR/rel/workshop-kit-v9/marca"
tar -czf "$KR/rel/workshop-kit-v9.tar.gz" -C "$KR/rel" workshop-kit-v9
: > "$KR/ws/kit-src/v9/installer/install-user.mjs"; date > "$KR/ws/kit-src/v9/.ws-kit-ok"
kr() { ( WS_HOME="$KR/ws"; WS_DEV=0; KIT_SRC=""; WS_MODE=$1; WS_TMP="$G6/kt"; mkdir -p "$WS_TMP"; WS_STEP_LOG="$G6/k.log"; WS_LOG=/dev/null; WS_UA=t
    C_WORKSHOP_VERSION=v9; C_WORKSHOP_REPO_URL="https://h/o/n"; C_RELEASE_DOWNLOAD_URL="$2"; D_REPO_HOST=h; REPO_TOKEN=""
    WS_INJ_KIT_SHA256=$(ws_sha256 "$KR/rel/workshop-kit-v9.tar.gz"); WS_CUR=8; SW_8=""
    ws_kit_ensure >/dev/null; printf '%s|%s' "$?" "$(cat "$KIT_SRC/marca" 2>/dev/null)" ) 2>/dev/null; }
eq "$(kr check "file://$KR/nada/{file}")" "0|" "kit-src: o --check usa o kit que houver"
eq "$(kr install "file://$KR/nada/{file}")" "0|" "kit-src: sem o arquivo novo, fica o antigo"
eq "$(kr install "file://$KR/rel/{file}")" "0|novo" "kit-src: SHA-256 diferente volta a descarregar"
eq "$(cat "$KR/ws/kit-src/v9/.ws-kit-ok")" "$(ws_sha256 "$KR/rel/workshop-kit-v9.tar.gz")" "kit-src: .ws-kit-ok guarda o SHA-256"
# copia guardada desatualizada: substitui-se pela da release (SHA256SUMS) e corre a nova, com os mesmos argumentos
SU="$G6/su"; mkdir -p "$SU/ws" "$SU/rel"; cp "$ROOT/setup/setup-mac.sh" "$SU/ws/setup-mac.sh"
printf '#!/bin/bash\n# WS_INJ_KIT_SHA256=x\necho "NEW reexec=$WS_REEXEC args=$*"\n' > "$SU/rel/setup-mac.sh"
printf '%s  setup-mac.sh\n' "$(ws_sha256 "$SU/rel/setup-mac.sh")" > "$SU/rel/SHA256SUMS"
su_run() { ( WS_SOURCE_ONLY=1; . "$SU/ws/setup-mac.sh"; WS_HOME="$SU/ws"; WS_DEV=0; WS_TMP="$G6/st"; mkdir -p "$WS_TMP"; WS_STEP_LOG="$G6/su.log"; WS_LOG=/dev/null
    WS_UA=t; C_WORKSHOP_VERSION=v9; C_WORKSHOP_REPO_URL="https://h/o/n"; C_RELEASE_DOWNLOAD_URL="$1"; D_REPO_HOST=h; REPO_TOKEN=""; WS_ARGS=(--check --no-desktop)
    ws_self_update; echo "OLD" ) 2>/dev/null; }
eq "$(su_run "file://$SU/nada/{file}")" "OLD" "self-update: sem rede fica a copia local"
eq "$(su_run "file://$SU/rel/{file}")" "NEW reexec=1 args=--check --no-desktop" "self-update: copia nova, mesmos argumentos"
eq "$(ws_sha256 "$SU/ws/setup-mac.sh")" "$(ws_sha256 "$SU/rel/setup-mac.sh")" "self-update: a copia guardada e a da release"
printf '#!/bin/bash\necho sem-marca\n' > "$SU/rel/setup-mac.sh"; printf '%s  setup-mac.sh\n' "$(ws_sha256 "$SU/rel/setup-mac.sh")" > "$SU/rel/SHA256SUMS"; cp "$ROOT/setup/setup-mac.sh" "$SU/ws/setup-mac.sh"
eq "$(su_run "file://$SU/rel/{file}")" "OLD" "self-update: um ficheiro sem os valores injetados nao substitui a copia"
grep -q 'ws_lock || return 1' "$ROOT/setup/setup-mac.sh" && [ "$(grep -n 'ws_lock || return 1' "$ROOT/setup/setup-mac.sh" | cut -d: -f1)" -gt "$(grep -n '  ws_load_messages ||' "$ROOT/setup/setup-mac.sh" | cut -d: -f1)" ] && ok || ko "o lock vem depois das mensagens (texto do catalogo)"
grep -q "The setup is already running (PID" "$ROOT/setup/setup-mac.sh" && ko "mensagem do lock ainda escrita no codigo" || ok
chmod -R u+rwX "$G6" 2>/dev/null

# --- G11: follow-ups do chaos test (passo 10, passo 12, resumo, --check, Ctrl-C, redacao, excecoes do proxy)
G11="$WS_TMP/g11"; mkdir -p "$G11/bin" "$G11/t" "$G11/ws/bin" "$G11/home/.local/bin"
# passo 10: no ecra o nome da app, nunca o nome do wheel (ate a v0.5 "memoria-..."); o ficheiro fica no log
( WS_CUR=10; WS_TMP="$G11/t"; WS_STEP_LOG="$G11/s10.log"; : > "$WS_STEP_LOG"; WS_LOG="$G11/s10-setup.log"; : > "$WS_LOG"; C_MEMORY_APP_VERSION=v0.5.0; SF_10=""
  ws_release_url() { printf 'file:///nada/%s' "$2"; }
  ws_dl() { printf '%s  memoria-0.5.0-py3-none-any.whl\n%s  constraints.txt\n' aaaa bbbb > "$2"; }
  ws_dl_check() { : > "$2"; }
  ws_uv_tool_install() { return 1; }
  ws_s10_install; printf '|%s\n' "$SF_10" ) > "$G11/o" 2>&1
grep -qF "$M_ui_a_descarregar_app" "$G11/o" && ! grep -q 'memoria-' "$G11/o" && grep -q '|E-MEM-03|uv tool install' "$G11/o" && ok || ko "s10: download mostra o nome da app [$(cat "$G11/o")]"
grep -q 'app wheel: memoria-0.5.0-py3-none-any.whl' "$G11/s10-setup.log" && ok || ko "s10: o nome do wheel fica no log"
# passo 12: no resumo so a resposta curta (primeira linha, ate 40 caracteres); a resposta inteira vai para o log
printf '%s' '{"type":"result","is_error":false,"result":"\n OK \n\nThe MCP server \"atlassian\" needs authentication: run /mcp.","modelUsage":{}}' > "$G11/r1.json"
printf '%s' '{"type":"result","is_error":false,"result":"abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJ\nmais","modelUsage":{}}' > "$G11/r2.json"
for engine in node jxa; do
  if [ "$engine" = node ]; then [ -n "$NODE" ] || continue; e=$NODE; else command -v osascript >/dev/null || continue; e=""; fi
  ( WS_NODE=$e; WS_PRICING="$ROOT/pricing.json"; ws_parse_result "$G11/r1.json"; printf '%s|' "$WSR_CURTA"; ws_parse_result "$G11/r2.json"; printf '%s' "$WSR_CURTA" ) > "$G11/o"
  eq "$(cat "$G11/o")" "OK|abcdefghijklmnopqrstuvwxyz0123456789ABC…" "s12 $engine: resposta curta para o resumo"
done
printf '#!/bin/sh\ncat "%s"\n' "$G11/r1.json" > "$G11/bin/claude"; chmod +x "$G11/bin/claude"
( WS_CLAUDE="$G11/bin/claude"; WS_CUR=12; SD_12=""; SF_12=""; CLAUDE_DIR="$G11/cdir"; WS_TMP="$G11/t"; WS_STEP_LOG="$G11/s12.log"; WS_LOG="$G11/s12-setup.log"; : > "$WS_LOG"
  WS_PRICING="$ROOT/pricing.json"; WS_TMO_SMOKE=10; WS_GW_URL=""; WS_GW_DOWN=0; ANTHROPIC_BASE_URL=""
  ws_s12_install >/dev/null; printf '%s|%s' "$?" "$SD_12" ) > "$G11/o"
case "$(cat "$G11/o")" in '0|Reply "OK" in '*' s · cost US$ '*) ok ;; *) ko "s12: detalhe so com a resposta curta [$(cat "$G11/o")]" ;; esac
grep -q 'final test: full reply: .*OK.*The MCP server "atlassian" needs authentication' "$G11/s12-setup.log" && ok || ko "s12: a resposta inteira fica no log"
# resumo: "Close and reopen the terminal" so se esta execucao mudou o perfil ou o terminal ainda nao tem as pastas
GH11="$G11/home"; : > "$GH11/.local/bin/claude"; : > "$G11/ws/bin/gh"
nr() { ( HOME=$GH11; WS_HOME="$G11/ws"; WS_NODE_BIN_DIR=""; WS_PERFIL_MUDOU=$1; WS_PATH0=$2; ws_need_reopen; printf '%s' "$?" ); }
eq "$(nr 0 "/usr/bin:$GH11/.local/bin:$G11/ws/bin")|$(nr 1 "/usr/bin:$GH11/.local/bin:$G11/ws/bin")|$(nr 0 "/usr/bin:$GH11/.local/bin")|$(nr 0 /usr/bin)" "1|0|0|0" "reabrir o terminal: so se o perfil mudou ou falta uma pasta no PATH do terminal"
printf 'export A=1\n' > "$GH11/.zshrc"
( HOME=$GH11; WS_HOME="$G11/ws"; WS_MODE=install; WS_TMP="$G11/t"; WS_LOG=/dev/null; WS_NODE_BIN_DIR=""; KIT_SRC=""; WS_ZDOTDIR_HOME=$GH11; WS_ZDOTDIR=$GH11; SHELL=/bin/zsh
  WS_PERFIL_MUDOU=0; ws_profile_put "$GH11/.zshrc" "# >>> workshop-claude >>>
x
# <<< workshop-claude <<<"; a=$WS_PERFIL_MUDOU
  WS_PERFIL_MUDOU=0; ws_profile_put "$GH11/.zshrc" "# >>> workshop-claude >>>
x
# <<< workshop-claude <<<"; printf '%s|%s' "$a" "$WS_PERFIL_MUDOU" ) > "$G11/o"
eq "$(cat "$G11/o")" "1|0" "perfil: WS_PERFIL_MUDOU so quando o ficheiro muda"
# --check e --doctor: a frase do fim nao diz que "os passos feitos sao saltados"; a instalacao continua a dizer
sm() { ( WS_MODE=$1; WS_TMP="$G11/t"; WS_RESUMO="$G11/summary.txt"; WS_HOME="$G11/ws"; WS_LOG=/dev/null; WS_OS=macOS; WS_COLOR=0; WS_TODO_MCP=0
    HOME=$GH11; WS_PERFIL_MUDOU=$2; WS_PATH0="$GH11/.local/bin:$G11/ws/bin"; WS_NODE_BIN_DIR=""
    for n in 0 1 2 3 4 5 6 7 8 9 10 11 12; do ws_set ST "$n" ok; ws_set SD "$n" ""; done; ws_set ST 3 "$3"; ws_summary ) 2>&1; }
o=$(sm check 0 falta)
case "$o" in *"$M_ui_final_voltar_check"*) ok ;; *) ko "--check: frase do fim propria [$o]" ;; esac
case "$o" in *"already done are skipped"*|*"$M_ui_final_reiniciar"*) ko "--check: ainda fala dos passos saltados ou de reabrir o terminal" ;; *) ok ;; esac
o=$(sm doctor 0 falta); case "$o" in *"$M_ui_final_voltar_check"*) ok ;; *) ko "--doctor: frase do fim do --check" ;; esac
o=$(sm install 0 falhou); case "$o" in *"$M_ui_final_voltar"*) ok ;; *) ko "instalacao: frase do fim (final_voltar)" ;; esac
case "$o" in *"$M_ui_final_reiniciar"*) ko "instalacao sem nada mudado: nao diz para reabrir o terminal" ;; *) ok ;; esac
o=$(sm install 1 ja); case "$o" in *"$M_ui_final_reiniciar"*) ok ;; *) ko "instalacao que mudou o perfil: diz para reabrir o terminal" ;; esac
# Ctrl-C (SIGINT a todo o grupo) a meio de uma substituicao de comando com um filho que trata o SIGINT (node) ou
# dentro do ws_timeout: uma so linha "interrupted" no setup.log, e no --check a frase propria
if command -v script >/dev/null 2>&1; then
  cat > "$G11/int.sh" <<EOF
WS_SOURCE_ONLY=1; . "$ROOT/setup/setup-mac.sh"
WS_LOG="$G11/int-\$1.log"; : > "\$WS_LOG"; WS_HOME="$G11/ih"; WS_TMP="$G11/it-\$1"; mkdir -p "\$WS_HOME" "\$WS_TMP"; WS_MODE=check
trap ws_interrupted INT TERM HUP
( sleep 1; kill -INT 0 ) &
case "\$1" in
  node) x=\$(y=\$("$NODE" -e 'process.on("SIGINT",()=>process.exit(130)); setTimeout(()=>{},8000)'); echo "\$y") ;;
  timeout) x=\$(ws_timeout 10 sleep 8) ;;
esac
echo nao-chegou
EOF
  for m in node timeout; do
    [ "$m" = node ] && [ -z "$NODE" ] && continue
    out=$(script -q /dev/null bash "$G11/int.sh" "$m" </dev/null 2>&1 | tr -d '\r'); r=""
    case "$out" in *nao-chegou*) r=continuou ;; *interrompido_check*) r=check ;; esac
    eq "$(grep -c interrupted "$G11/int-$m.log")|$r" "1|check" "Ctrl-C ($m): uma linha no log e a frase do --check"
  done
fi
# excecoes do proxy do sistema (scutil --proxy) para o NO_PROXY
printf '<dictionary> {\n  ExceptionsList : <array> {\n    0 : *.local\n    1 : 169.254/16\n    2 : intranet.empresa.pt\n    3 : <local>\n    4 : *.corp.example\n    5 : intranet.empresa.pt\n    6 : 10.*\n  }\n  HTTPSEnable : 1\n  HTTPSProxy : proxy.empresa.pt\n}\n' > "$G11/scutil"
eq "$(ws_proxy_bypass < "$G11/scutil")" ".local,intranet.empresa.pt,.corp.example" "excecoes do proxy do sistema no formato do NO_PROXY"
eq "$(printf '<dictionary> {\n  HTTPSEnable : 0\n}\n' | ws_proxy_bypass)" "" "sem excecoes"
( scutil() { cat "$G11/scutil"; }; ws_proxy_dead() { return 1; }
  unset HTTPS_PROXY https_proxy ALL_PROXY all_proxy; NO_PROXY=meu.servidor; no_proxy=""; WS_CUR=0; SN_0=""; WS_LOG=/dev/null
  ws_detect_proxy; printf '%s|%s' "$WS_PROXY" "$(ws_no_proxy)" ) > "$G11/o"
eq "$(cat "$G11/o")" "http://proxy.empresa.pt:8080|localhost,127.0.0.1,meu.servidor,.local,intranet.empresa.pt,.corp.example" "proxy do sistema: NO_PROXY com o da pessoa e as excecoes"
# passo 8: o --no-proxy (com o NO_PROXY da sessao) vai sempre junto com o --https-proxy
printf '#!/bin/sh\nprintf "%%s " "$@"\n' > "$G11/bin/node-args"; chmod +x "$G11/bin/node-args"
eq "$(WS_NODE="$G11/bin/node-args"; KIT_SRC=/k; WS_LANG=en; WS_CA_PEM=""; WS_PROXY=http://p:8080; NO_PROXY=meu.servidor; no_proxy=""; WS_STEP_LOG=/dev/null; ws_iu verificar)" \
  "/k/installer/install-user.mjs verificar --node $G11/bin/node-args --kit-src /k --lingua-maquina en --https-proxy http://p:8080 --no-proxy localhost,127.0.0.1,meu.servidor " "ws_iu: --no-proxy com o NO_PROXY da pessoa junto do --https-proxy"

# --- chaos round 2 R3-misc
R3="$WS_TMP/r3"; mkdir -p "$R3/bin" "$R3/h"
# fs-dotfiles-symlinks: o desinstalar que sai com erro (settings.json por repor) nao apaga o kit-src nem diz "concluida"
printf '#!/bin/sh\ncase "$2" in desinstalar) printf "erro\\tsettings: EACCES\\n"; exit 5 ;; esac\nexit 0\n' > "$R3/bin/node"; chmod +x "$R3/bin/node"
( HOME="$R3/h"; WS_HOME="$R3/h/.workshop-claude"; mkdir -p "$WS_HOME/kit-src/x/installer"; : > "$WS_HOME/kit-src/x/installer/install-user.mjs"
  printf '{"node": "%s"}\n' "$R3/bin/node" > "$WS_HOME/manifest.json"; WS_LOG="$R3/u.log"; : > "$WS_LOG"
  ws_s4_detect() { WS_NODE="$R3/bin/node"; }; ws_s5_detect() { :; }; ws_kit_ensure() { KIT_SRC="$WS_HOME/kit-src/x"; }; ws_claude() { :; }
  ws_uninstall; printf 'rc=%s kit-src=%s\n' "$?" "$([ -d "$WS_HOME/kit-src" ] && echo kept || echo gone)" ) > "$R3/u.out" 2>&1
grep -q 'rc=1 kit-src=kept' "$R3/u.out" && ok || ko "r3 uninstall: erro do desinstalar = rc 1 e kit-src fica [$(cat "$R3/u.out")]"
grep -q 'The uninstall stopped before the end' "$R3/u.out" && ! grep -q 'Uninstall complete' "$R3/u.out" && ok || ko "r3 uninstall: diz que parou, e nao 'complete' [$(cat "$R3/u.out")]"

# fs-sudo-leftovers: ~/.claude.json sem leitura -> passos 7 e 10 = E-PERM-01 sem "mcp get/add" nem downloads
( HOME="$R3/h"; unset CLAUDE_CONFIG_DIR; WS_PERM_BAD=("$R3/h/.claude.json"); WS_CUR=7; SF_7=""; WS_CLAUDE=/bin/false
  ws_mcp_get() { echo called > "$R3/mcp"; return 1; }
  ws_s7_detect; printf '%s|%s|' "$?" "$SF_7"; SF_7=""; ws_s7_install; printf '%s|%s|%s' "$?" "$SF_7" "$([ -e "$R3/mcp" ] && echo mcp)" ) > "$R3/r"
eq "$(cat "$R3/r")" "1|E-PERM-01|~/.claude.json|1|E-PERM-01|~/.claude.json|" "r3: passo 7 com ~/.claude.json sem leitura = E-PERM-01, sem claude mcp"
( HOME="$R3/h"; unset CLAUDE_CONFIG_DIR; WS_PERM_BAD=("$R3/h/.claude.json"); WS_CUR=10; SF_10=""; WS_CLAUDE=/bin/false
  ws_dl() { echo called > "$R3/dl"; return 1; }
  ws_s10_install; printf '%s|%s|%s' "$?" "$SF_10" "$([ -e "$R3/dl" ] && echo dl)" ) > "$R3/r"
eq "$(cat "$R3/r")" "1|E-PERM-01|~/.claude.json|" "r3: passo 10 com ~/.claude.json sem leitura = E-PERM-01, sem descarregar a app outra vez"
( HOME="$R3/h"; CLAUDE_CONFIG_DIR="$R3/cfg"; eq "$(ws_claude_json)" "$R3/cfg/.claude.json" "r3: ws_claude_json segue o CLAUDE_CONFIG_DIR" )
# a linha do E-PERM-01 corta no fim de uma frase ou palavra, nunca a meio
( WS_CUR=7; SF_7="E-MCP-01|"; WS_STEP_LOG="$R3/perm.log"
  printf "Error: EACCES: permission denied, open '%s/.claude.json'. Run \`sudo chown -R bea ~/.claude.json\` to fix the owner of the file, then open a new terminal window and run the same setup command again.\n" "$HOME" > "$WS_STEP_LOG"
  ws_perm_reclass; printf '%s' "$SF_7" ) > "$R3/r"
case "$(cat "$R3/r")" in "E-PERM-01|Error: EACCES: permission denied, open '~/.claude.json'.") ok ;; *) ko "r3: E-PERM-01 cortado no fim da frase [$(cat "$R3/r")]" ;; esac
( WS_CUR=7; SF_7=""; WS_STEP_LOG="$R3/perm.log"; printf 'EACCES %s\n' "$(printf 'palavra %.0s' $(seq 40))" > "$WS_STEP_LOG"; ws_perm_reclass; printf '%s' "$SF_7" ) > "$R3/r"
case "$(cat "$R3/r")" in "E-PERM-01|EACCES palavra"*"palavra ...") ok ;; *) ko "r3: E-PERM-01 cortado numa palavra inteira [$(cat "$R3/r")]" ;; esac

# lang-pt-on-english-mac: no --check, so a lingua diferente e "verificado" com a nota e o comando com o WORKSHOP_LANG
S8L=$(printf 'skills\t7\nagentes\t6\nlingua_kit\tpt\nlanguage\tBrazilian Portuguese\nlanguage_nossa\t1\nfalta\tlanguage do Claude (Brazilian Portuguese -> European Portuguese)\n')
s8d() { ( WS_MODE=$1; WS_CUR=8; SF_8=""; SN_8=""; WS_LANG=pt-PT; WS_LANG_KIT=pt; D_SETUP_MAC_URL=https://r.test/setup-mac.sh
    ws_kit_ensure() { :; }; ws_registar_flush() { :; }; ws_iu() { printf '%s\n' "$S8OUT_R3"; return 1; }
    ws_s8_detect; printf 'rc=%s|%s|%s' "$?" "$SF_8" "$SN_8" ); }
o=$(S8OUT_R3=$S8L s8d check)
case "$o" in "rc=0||"*"To switch, run: curl -fsSL https://r.test/setup-mac.sh | WORKSHOP_LANG=pt-PT bash"*) ok ;; *) ko "r3: --check com so a lingua diferente = verificado, com o comando [$o]" ;; esac
o=$(S8OUT_R3="$S8L"$'\nfalta\tkit desatualizado' s8d check); case "$o" in rc=1*) ok ;; *) ko "r3: --check com outra falta continua a falhar [$o]" ;; esac
o=$(S8OUT_R3=$S8L s8d install); case "$o" in rc=1*) ok ;; *) ko "r3: ao instalar, a lingua diferente reinstala [$o]" ;; esac
( WS_MODE=install; WS_CUR=8; SF_8=""; SN_8=""; SW_8=""; WS_SUBST_SL=0; WS_LANG=pt-PT; WS_LANG_KIT=pt; WS_STEP_LOG=/dev/null
  ws_kit_ensure() { :; }; ws_registar_flush() { :; }
  ws_iu() { case "$1" in verificar) printf '%s\n' "$S8L"; return 1 ;; *) printf 'skills\t7\nagentes\t6\nlingua_kit\tpt\nlanguage\tEuropean Portuguese\nlanguage_nossa\t1\n'; return 0 ;; esac; }
  ws_s8_detect; ws_s8_install; printf 'rc=%s|%s' "$?" "$SN_8" ) > "$R3/r"
grep -q '^rc=0|' "$R3/r" && grep -q 'Language changed from Brazilian Portuguese to European Portuguese, because WORKSHOP_LANG asked for it.' "$R3/r" && ok || ko "r3: a instalacao diz que a lingua mudou [$(cat "$R3/r")]"

# net-proxy-dead: proxy SOCKS cujo nome nao resolve (o curl da 6, e nao 5) = proxy morto (E-NET-03)
( unset HTTPS_PROXY https_proxy all_proxy; ALL_PROXY=socks5h://bea:pw@socks.r3.invalid:1080; WS_CUR=0; SN_0=""; WS_STEP_LOG="$R3/px.log"; : > "$WS_STEP_LOG"
  ws_detect_proxy; printf '%s|%s|%s' "$WS_PROXY_ENV" "$WS_PROXY_DEAD" "$(ws_net_code 6 000)" ) > "$R3/r"
eq "$(cat "$R3/r")" "socks5h://socks.r3.invalid:1080 (ALL_PROXY)|1|E-NET-03" "r3: proxy SOCKS que nao resolve = morto (E-NET-03)"
grep -q 'pw' "$R3/px.log" && ko "r3: a palavra-passe do proxy foi para o log do passo" || ok

# prof-broken-old-block: bloco antigo incompleto fica no manifest; bloco indentado num if deixa um bash valido;
# um aviso depois do passo 12 conta no resumo
( HOME="$R3/h"; WS_HOME="$R3/h/.workshop-claude"; mkdir -p "$WS_HOME"; WS_CUR=2; ST_2=""; SW_2=""; WS_PERFIL_AVISADOS=""
  printf 'a\n# >>> workshop-claude >>>\nvelho\n' > "$R3/h/.zshrc"; ws_registar() { printf '%s|%s\n' "$1" "$2" >> "$R3/reg"; }
  ws_profile_put "$R3/h/.zshrc" "# >>> workshop-claude >>>"; printf '%s|%s' "$?" "$SW_2" ) > "$R3/r"
grep -qx "perfil|$R3/h/.zshrc" "$R3/reg" && ok || ko "r3: perfil com bloco incompleto registado para o --uninstall"
case "$(cat "$R3/r")" in "1|E-PROF-02|~/.zshrc"*) ok ;; *) ko "r3: E-PROF-02 para o bloco incompleto [$(cat "$R3/r")]" ;; esac
printf 'if [ -n "$X" ]; then\n  # >>> workshop-claude >>>\n  PATH=a\n  # <<< workshop-claude <<<\nfi\nf() {\n\t# >>> workshop-claude >>>\n\tPATH=b\n\t# <<< workshop-claude <<<\n}\nB=2\n' > "$R3/bp"
ws_profile_strip "$R3/bp" > "$R3/bp2"; bash -n "$R3/bp2" 2>/dev/null && ok || ko "r3: bloco indentado num if/funcao deixa o .bash_profile valido [$(cat "$R3/bp2")]"
grep -q 'PATH=' "$R3/bp2" && ko "r3: o bloco indentado ficou" || ok
( WS_CUR=12; ST_12=feito; SW_12=""; WS_PERFIL_AVISADOS=""; WS_LOG=/dev/null; ws_profile_warn E-PROF-02 "$HOME/.zshrc" >/dev/null; printf '%s|%s' "$ST_12" "$SW_12" ) > "$R3/r"
case "$(cat "$R3/r")" in "aviso|E-PROF-02|~/.zshrc"*) ok ;; *) ko "r3: aviso depois do passo 12 passa o passo a 'com aviso' [$(cat "$R3/r")]" ;; esac
o=$(ws_print_code E-PROF-02 "~/.config/zsh/.zshrc" "" ""); case "$o" in *'$ grep -n workshop-claude ~/.config/zsh/.zshrc'*) ok ;; *) ko "r3: o comando do E-PROF-02 nomeia o ficheiro [$o]" ;; esac
o=$(sm check 0 aviso); case "$o" in *"There is 1 warning above."*) ok ;; *) ko "r3: 1 aviso no singular [$o]" ;; esac

# prof-zdotdir: uma pasta ZDOTDIR sem escrita nunca troca para a HOME (o zsh nao le o ~/.zshrc com o ZDOTDIR)
if [ -x /bin/zsh ]; then
  ZH="$R3/zh"; mkdir -p "$ZH/.config/zsh"; printf 'export ZDOTDIR="$HOME/.config/zsh"\n' > "$ZH/.zshenv"; chmod 555 "$ZH/.config/zsh"
  ( HOME=$ZH; WS_LOG="$R3/z.log"; ws_zdotdir ) > "$R3/r"
  eq "$(cat "$R3/r")" "$ZH/.config/zsh" "r3: ZDOTDIR sem escrita fica o ZDOTDIR (nao a HOME)"
  ( HOME=$ZH; WS_HOME="$ZH/.workshop-claude"; WS_LOG="$R3/z.log"; WS_CUR=2; ST_2=""; SW_2=""; WS_PERFIL_AVISADOS=""; ws_registar() { :; }
    ws_profile_put "$ZH/.config/zsh/.zshrc" "# >>> workshop-claude >>>"; printf '%s|%s' "$?" "$SW_2" ) > "$R3/r" 2> "$R3/z.err"
  case "$(cat "$R3/r")" in "1|E-PROF-01|~/.config/zsh/.zshrc"*) ok ;; *) ko "r3: ZDOTDIR sem escrita = E-PROF-01 a nomear o ficheiro [$(cat "$R3/r")]" ;; esac
  [ -s "$R3/z.err" ] && ko "r3: erro do bash no ecra [$(cat "$R3/z.err")]" || ok
  [ ! -e "$ZH/.zshrc" ] && ok || ko "r3: escreveu no ~/.zshrc, que o zsh nao le"
  chmod 755 "$ZH/.config/zsh"
fi

# net-host-blocked: os comandos nomeiam o servidor que falhou; um 3xx do claude.ai para fora e um bloqueio; o servidor
# de uma pagina de bloqueio nao aparece como o dominio a libertar
eq "$(ws_hint_host 'release-assets.githubusercontent.com · https://github.com/x')|$(ws_hint_host 'https://claude.ai/install.sh · HTTP 403')|$(ws_hint_host 'SHA256SUMS')" \
  "release-assets.githubusercontent.com|claude.ai|api.anthropic.com" "r3: ws_hint_host"
eq "$(ws_hint_url 'claude.ai pypi.org')|$(ws_hint_url 'pypi.org')" "$C_CLAUDE_INSTALL_SH_URL|https://pypi.org/" "r3: ws_hint_url (o instalador para o claude.ai)"
o=$(ws_print_code E-NET-02 "release-assets.githubusercontent.com · https://github.com/x" "" ""); case "$o" in *'$ dscacheutil -q host -a name release-assets.githubusercontent.com'*) ok ;; *) ko "r3: E-NET-02 com o servidor que falhou [$o]" ;; esac
o=$(ws_print_code E-NET-01 "claude.ai" "" ""); case "$o" in *"$C_CLAUDE_INSTALL_SH_URL"*) ok ;; *) ko "r3: E-NET-01 testa o instalador do claude.ai [$o]" ;; esac
( WS_CUR=2; SF_2=""; WS_DL_HOST=block.r3.test:15871; WS_DL_URLHOST=claude.ai; WS_DL_HTTP=html; WS_DL_RC=1; ws_dl_fail https://claude.ai/install.sh; printf '%s' "$SF_2" ) > "$R3/r"
eq "$(cat "$R3/r")" "E-NET-01|https://claude.ai/install.sh · redirected to block.r3.test:15871 · a web page came instead of the file" "r3: o servidor da pagina de bloqueio vai no fim"
( WS_CUR=10; SF_10=""; WS_DL_HOST=""; WS_DL_URLHOST=github.com; WS_DL_HTTP=000; WS_DL_RC=6; WS_PROXY_DEAD=0; ws_dl_fail constraints.txt; printf '%s' "$SF_10" ) > "$R3/r"
eq "$(cat "$R3/r")" "E-NET-02|github.com · constraints.txt" "r3: o detalhe de um ficheiro comeca pelo servidor"
printf '#!/bin/sh\nfor a; do u=$a; done\ncase "$u" in *install.sh) printf "302 000 r=%%s" "$R3_REDIR" ;; *) printf "200 000 r=" ;; esac\n' > "$R3/bin/curl"; chmod +x "$R3/bin/curl"
r3net() { ( PATH="$R3/bin:$PATH"; export R3_REDIR=$1; WS_TMP="$R3"; WS_CUR=0; SW_0=""; SN_0=""; WS_UA=t; WS_LOG=/dev/null
    C_NET_CHECK_HOSTS="claude.ai downloads.claude.ai a.r3.test"; C_CLAUDE_INSTALL_SH_URL=https://claude.ai/install.sh; D_REPO_HOST=""; D_MEMORY_HOST=""; D_KIT_URL_MAC=https://a.r3.test/k.tgz
    ws_check_network >/dev/null; printf '%s/%s|%s' "$WS_NET_OK" "$WS_NET_TOTAL" "$(printf '%s' "$SW_0" | tr '\n' ';')" ); }
eq "$(r3net https://downloads.claude.ai/bootstrap.sh)" "3/3|" "r3: rede: 302 do claude.ai para o downloads.claude.ai e acessivel"
eq "$(r3net http://proxy.r3.test:15871/cgi-bin/blockpage.cgi)" "2/3|E-NET-01|claude.ai;" "r3: rede: 302 do claude.ai para uma pagina de bloqueio = E-NET-01"

# run-ctrlc-arena e run-upgrade-uninstall: a Arena com a marca final e so o commit do kit ganha a tag; a Arena do
# rc.1 publicado (so arena-inicial) migra ao instalar e nao e "historico proprio"
r3arena() { rm -rf "$R3/p/demo-project"; mkdir -p "$R3/p/demo-project"; printf '{"version":"v1"}\n' > "$R3/p/demo-project/.arena-kit.json"; echo x > "$R3/p/demo-project/README.md"
  ( cd "$R3/p/demo-project" && g5git init -q && g5git add -A && g5git commit -q -m "Initial state of the Security Arena" ) >/dev/null 2>&1; }
r3arena; ( WS_PROJ="$R3/p"; WS_LOG=/dev/null; ws_s9_migrate )
eq "$(g5git -C "$R3/p/demo-project" tag -l)" arena-start "r3: Arena interrompida entre o commit e a tag ganha a arena-start"
r3arena; echo mine > "$R3/p/demo-project/MY.md"; ( WS_PROJ="$R3/p"; WS_LOG=/dev/null; ws_s9_migrate )
eq "$(g5git -C "$R3/p/demo-project" tag -l)" "" "r3: Arena com um ficheiro da pessoa fica sem tag (E-DEMO-04)"
r3s9() { ( WS_MODE=$1; WS_PROJ="$R3/p"; WS_PROJ_SHOW='~/workshop-claude'; KIT_SRC="$R3/nokit"; WS_LOG=/dev/null; WS_CUR=9; SF_9=""; SW_9=""; SN_9=""; WS_LANG_KIT=en
    ws_kit_ensure() { :; }; ws_s9_tests() { :; }; ws_s9_detect; printf 'rc=%s|%s|%s' "$?" "$SF_9" "$SW_9" ); }
r3arena; g5git -C "$R3/p/demo-project" tag arena-inicial >/dev/null 2>&1; echo mine > "$R3/p/demo-project/MY.md"; g5git -C "$R3/p/demo-project" add -A >/dev/null 2>&1; g5git -C "$R3/p/demo-project" commit -q -m mine >/dev/null 2>&1
eq "$(r3s9 check)" "rc=0||" "r3: --check: Arena do rc.1 (arena-inicial) nao e historico proprio"
eq "$(g5git -C "$R3/p/demo-project" tag -l | tr '\n' ' ')" "arena-inicial " "r3: --check nao mexe nas tags"
eq "$(r3s9 install)" "rc=0||" "r3: instalar: Arena do rc.1 migra antes do estado (sem E-DEMO-04)"
eq "$(g5git -C "$R3/p/demo-project" tag -l | tr '\n' ' ')" "arena-inicial arena-start " "r3: instalar: arena-start adicionada"
o=$(WS_FILL_KEYS=PROJETOS D_PROJETOS='~/workshop-claude' ws_print_code E-DEMO-03 "$R3/p/demo-project" "" ""); case "$o" in *'$ mv ~/workshop-claude/demo-project ~/workshop-claude/demo-project-old'*) ok ;; *) ko "r3: E-DEMO-03 move so a pasta do projeto [$o]" ;; esac
# --- chaos round 2 R1-env: ambiente hostil (BASH_ENV, cores, NODE_OPTIONS, PATH relativo, certificados, TMPDIR,
# CLAUDE_CONFIG_DIR, modelos, uv, Python, disco cheio, HOME comprida)
R1="$WS_TMP/r1env"; mkdir -p "$R1/h/.config/zsh" "$R1/bin"
# BASH_ENV com noclobber, uma funcao cd que corre ls, CDPATH e um cat trocado: o setup desfaz tudo antes de main()
printf 'set -o noclobber\ncd() { builtin cd "$@" && ls; }\ncat() { echo HIJACK; }\nexport CDPATH=/tmp\n' > "$R1/rc"
printf 'export ZDOTDIR="$HOME/.config/zsh"\n' > "$R1/h/.zshenv"
o=$(BASH_ENV="$R1/rc" HOME="$R1/h" /bin/bash -c 'WS_SOURCE_ONLY=1; . "$1"; WS_TMP="$2"; WS_LOG=/dev/null; printf "%s|%s|%s|" "$(shopt -qo noclobber && echo on || echo off)" "$(type -t cd)" "${CDPATH-unset}"; : > "$2/zdotdir.out"; ws_zdotdir' _ "$ROOT/setup/setup-mac.sh" "$R1" 2>&1)
eq "$o" "off|builtin|unset|$R1/h/.config/zsh" "R1 BASH_ENV: noclobber, cd e CDPATH desfeitos; o ZDOTDIR do .zshenv chega"
o=$(BASH_ENV="$R1/rc" /bin/bash "$ROOT/setup/setup-mac.sh" --help 2>&1)
case "$o" in *HIJACK*) ko "R1 BASH_ENV: uma funcao do .bashrc (cat) ainda corre no setup" ;; *"Workshop setup (macOS)"*) ok ;; *) ko "R1 BASH_ENV --help: [$o]" ;; esac
# cores forcadas: saem do ambiente do setup; o negrito segue o NO_COLOR original
o=$( export GREP_OPTIONS=--color=always CLICOLOR_FORCE=1 FORCE_COLOR=3; unset NO_COLOR WS_NO_COLOR0; ws_env_sanitize
  printf '%s|%s|%s|%s|%s' "$(ws_ver_of 'Claude Code 2.1.292')" "${GREP_OPTIONS-unset}" "${FORCE_COLOR-unset}" "$NO_COLOR" "${WS_NO_COLOR0-unset}" )
eq "$o" "2.1.292|unset|unset|1|" "R1 cores: GREP_OPTIONS/FORCE_COLOR fora, NO_COLOR=1 para os comandos, o original guardado vazio"
eq "$(GREP_OPTIONS=--color=always ws_ver_of 'v 24.22.0')" "24.22.0" "R1 cores: ws_ver_of sem cores mesmo com GREP_OPTIONS"
if command -v script >/dev/null 2>&1; then
  printf '%s\n' 'WS_SOURCE_ONLY=1; . "$1"; unset NO_COLOR WS_NO_COLOR0; ws_env_sanitize; ws_color_detect; printf "C%s|%s\n" "$WS_COLOR" "$NO_COLOR"' > "$R1/cor.sh"
  TERM=xterm-256color script -q /dev/null /bin/bash "$R1/cor.sh" "$ROOT/setup/setup-mac.sh" </dev/null > "$R1/cor.out" 2>&1
  grep -q 'C1|1' "$R1/cor.out" && ok || ko "R1 cores: o setup continua com negrito depois do NO_COLOR=1 [$(tr -d '\r\n' < "$R1/cor.out")]"
fi
# NODE_OPTIONS: guardado e tirado; um node que so responde ao -v nao conta
eq "$( export NODE_OPTIONS='--require /nao/existe.js'; unset WS_NODE_OPTIONS0; ws_env_sanitize; printf '%s|%s' "${NODE_OPTIONS-unset}" "$WS_NODE_OPTIONS0" )" "unset|--require /nao/existe.js" "R1 NODE_OPTIONS: fora do setup, o valor fica para o aviso"
if [ -n "$NODE" ]; then
  eq "$(NODE_OPTIONS='--require /nao/existe.js' ws_node_major "$NODE")" "" "R1 NODE_OPTIONS: node que nao corre scripts nao conta"
  case "$(ws_node_major "$NODE")" in [0-9]*) ok ;; *) ko "R1 ws_node_major com -e" ;; esac
fi
# Node do workshop sem o npm (tar com a pasta temporaria apagada a meio) nao conta como instalado
mkdir -p "$R1/node/bin"; printf '#!/bin/sh\nexit 0\n' > "$R1/node/bin/node"; chmod +x "$R1/node/bin/node"
ws_node_complete "$R1/node"; eq "$?" 1 "R1 node incompleto (sem npm)"
# PATH: so as entradas absolutas (VS Code num projeto JavaScript)
eq "$( HOME="$R1/h"; WS_HOME="$R1/h/.workshop-claude"; PATH="./node_modules/.bin:.::/usr/bin:rel/dir:/a b/[x]*:/bin:"; ws_path_setup; printf '%s' "$PATH" )" \
  "$R1/h/.workshop-claude/node/bin:$R1/h/.workshop-claude/bin:$R1/h/.local/bin:/usr/bin:/a b/[x]*:/bin" "R1 PATH: sem ., ./node_modules/.bin, relativas nem vazias"
# certificados que apontam para ficheiros que nao existem: saem do setup e o passo 0 diz quais
o=$( export SSL_CERT_FILE=/nao/existe.pem CURL_CA_BUNDLE=/etc/ssl/cert.pem SSL_CERT_DIR=/nao/pasta; unset WS_CA_BAD0; ws_env_sanitize
  WS_CUR=0; SW_0=""; ws_s0_env_warnings; printf '%s|%s|%s' "${SSL_CERT_FILE-unset}" "${CURL_CA_BUNDLE-unset}" "$SW_0" )
eq "$o" "unset|/etc/ssl/cert.pem|E-NET-09|SSL_CERT_FILE=/nao/existe.pem · SSL_CERT_DIR=/nao/pasta" "R1 certificados: so os que nao existem saem, com aviso E-NET-09"
eq "$(ws_net_code 77 000)" E-NET-09 "R1 curl 77 -> E-NET-09 (nao e a empresa a intercetar)"
# modelos trocados por variaveis (shell e settings.json)
mkdir -p "$R1/cd"; printf '{"env":{"ANTHROPIC_DEFAULT_SONNET_MODEL":"anthropic.claude-old-v1"}}\n' > "$R1/cd/settings.json"
o=$( unset ANTHROPIC_DEFAULT_OPUS_MODEL ANTHROPIC_DEFAULT_HAIKU_MODEL ANTHROPIC_SMALL_FAST_MODEL CLAUDE_CODE_SUBAGENT_MODEL WS_CA_BAD0 WS_TMPDIR_BAD0
  CLAUDE_DIR="$R1/cd"; ANTHROPIC_MODEL=claude-velho; DISABLE_AUTOUPDATER=1; WS_CUR=0; SW_0=""; ws_s0_env_warnings; printf '%s' "$SW_0" )
eq "$o" "E-CFG-10|ANTHROPIC_MODEL=claude-velho (shell) · ANTHROPIC_DEFAULT_SONNET_MODEL=anthropic.claude-old-v1 ($R1/cd/settings.json)" "R1 modelos: shell e settings.json; DISABLE_AUTOUPDATER nao conta"
# TMPDIR que nao existe ou sem escrita: usa /tmp e avisa; a pasta apagada a meio volta a existir
mkdir -p "$R1/ro"; chmod 555 "$R1/ro"
for t in "$R1/nao-existe" "$R1/ro"; do
  o=$( WS_HOME="$R1/h/.workshop-claude"; TMPDIR=$t; unset WS_TMPDIR_BAD0; ws_tmp_make; printf '%s|%s|%s' "$?" "$TMPDIR" "$WS_TMPDIR_BAD0"; [ -f "$WS_TMP/.ws-tmp" ] && printf '|ok'; rm -rf "$WS_TMP" )
  eq "$o" "0|/tmp|$t|ok" "R1 TMPDIR mau ($t): pasta temporaria em /tmp, aviso guardado"
done
chmod 755 "$R1/ro"
o=$( WS_HOME="$R1/h/.workshop-claude"; WS_LOG=/dev/null; TMPDIR=$R1; ws_tmp_make; rm -rf "$WS_TMP"; ws_tmp_gone; a=$?; ws_tmp_gone; printf '%s|%s|%s' "$a" "$?" "$([ -d "$WS_TMP" ] && echo dir)"; rm -rf "$WS_TMP" )
eq "$o" "0|1|dir" "R1 pasta temporaria apagada a meio: volta a ser criada e diz-se uma vez"
o=$( WS_HOME="$R1/h/.workshop-claude"; WS_LOG=/dev/null; TMPDIR=$R1; ws_tmp_make; WS_CUR=4; SF_4="E-NET-07|x"; WS_STEP_LOG=/dev/null; rm -rf "$WS_TMP"; ws_fail_reclass; printf '%s' "${SF_4%%|*}"; rm -rf "$WS_TMP" )
eq "$o" "E-SO-10" "R1 falha com a pasta temporaria apagada -> E-SO-10 e nao a rede"
# disco cheio: o ENOSPC no log ganha ao codigo do passo; a tabela final aparece mesmo sem a poder gravar
printf 'tar: Write failed: No space left on device\n' > "$R1/s.log"
o=$( WS_CUR=8; SF_8="E-KIT-01|"; WS_STEP_LOG="$R1/s.log"; WS_TMP=$R1; WS_LOG=/dev/null; touch "$R1/.ws-tmp"; ws_fail_reclass; printf '%s|%s' "$SF_8" "${WS_DISK_FULL:-0}" )
eq "$o" "E-SO-06|No space left on device · E-KIT-01|1" "R1 disco cheio: E-SO-06 em vez de E-KIT-01"
o=$( WS_CUR=12; SF_12="E-SMOKE-02|"; WS_STEP_LOG="$R1/s.log"; ws_disk_reclass; printf '%s|%s' "$?" "${SF_12%%|*}" )
eq "$o" "1|E-SMOKE-02" "R1 disco cheio: os creditos (E-SMOKE-02) nao sao trocados"
o=$( WS_CUR=12; SW_12=""; ST_12=""; WS_STEP_LOG="$R1/s.log"; WS_LOG=/dev/null; WS_PERFIL_AVISADOS=""; ws_profile_warn E-PROF-01 "$R1/h/.zshrc"; printf '%s' "${SW_12%%|*}" )
eq "$o" "E-SO-06" "R1 disco cheio: o perfil que nao se escreve e E-SO-06, nao E-PROF-01"
mkdir -p "$R1/rs"; chmod 555 "$R1/rs"
o=$( WS_MODE=check; WS_RESUMO="$R1/rs/summary.txt"; WS_HOME="$R1/rs"; WS_LOG=/dev/null; WS_OS=macOS; WS_COLOR=0; WS_TODO_MCP=0
  for n in 0 1 2 3 4 5 6 7 8 9 10 11 12; do ws_set ST "$n" ok; ws_set SD "$n" ""; done; ws_summary 2>&1 )
case "$o" in *"$M_passos_12"*"$M_ui_final_check_ok"*) ok ;; *) ko "R1 resumo sem poder gravar: a tabela tem de aparecer [$o]" ;; esac
case "$o" in *"summary.txt"*|*"No such file"*|*"Permission denied"*) ko "R1 resumo sem poder gravar: nao diz que gravou nem mostra erros do bash" ;; *) ok ;; esac
chmod 755 "$R1/rs"
# uv apontado para um espelho da empresa: o nome da variavel e o URL sem utilizador nem palavra-passe
eq "$( unset UV_DEFAULT_INDEX UV_INDEX UV_EXTRA_INDEX_URL; UV_INDEX_URL=https://bea:segredo@pypi.empresa.pt/simple; ws_uv_index )" "UV_INDEX_URL=https://pypi.empresa.pt/simple" "R1 uv: espelho mostrado sem credenciais"
eq "$( unset UV_DEFAULT_INDEX UV_INDEX_URL UV_INDEX UV_EXTRA_INDEX_URL; ws_uv_index; printf '%s' "$?" )" "1" "R1 uv: sem espelho"
# Python de outro ambiente: guardado, tirado do setup; o registo MCP sem as variaveis vazias nao conta
o=$( export PYTHONHOME=/opt/miniconda PYTHONPATH=/velho VIRTUAL_ENV=/v; unset WS_PYTHON_ENV0; ws_env_sanitize; printf '%s|%s|%s' "${PYTHONHOME-unset}" "${VIRTUAL_ENV-unset}" "$WS_PYTHON_ENV0" )
eq "$o" "unset|unset|PYTHONHOME=/opt/miniconda PYTHONPATH=/velho" "R1 Python: PYTHONHOME/PYTHONPATH fora do setup, guardados para o aviso"
WS_MCP_OUT=$(printf 'agent-memory:\n  Command: /u/bin/agent-memory\n  Args: mcp\n'); ws_memory_mcp_env; eq "$?" 1 "R1 MCP: registo antigo sem PYTHONHOME vazio"
WS_MCP_OUT=$(printf 'agent-memory:\n  Command: /u/bin/agent-memory\n  Args: mcp\n  Environment:\n    PYTHONHOME=\n'); ws_memory_mcp_env; eq "$?" 0 "R1 MCP: registo com PYTHONHOME vazio"
# HOME comprida: o indice do SQLite passa dos 504 bytes -> E-MEM-10, e nao E-MEM-05 (reinstalar nao resolve)
printf '#!/bin/sh\nprintf "  [OK] Python 3.12.15\\n  [FAIL] Index of your memories: unable to open database file\\n"; exit 1\n' > "$R1/bin/am"; chmod +x "$R1/bin/am"
lp="$R1/$(printf 'p%.0s' $(seq 260))/$(printf 'q%.0s' $(seq 260))"
o=$( WS_CUR=10; SW_10=""; SD_10=""; WS_STEP_LOG="$R1/s10.log"; WS_LOG=/dev/null; unset WS_PYTHON_ENV0; AGENT_MEMORY_HOME=$lp; ws_memory_selftest "$R1/bin/am" 0.5.0; printf '%s' "${SW_10%%|*}" )
eq "$o" "E-MEM-10" "R1 HOME comprida: E-MEM-10"
o=$( WS_CUR=10; SW_10=""; SD_10=""; WS_STEP_LOG="$R1/s10.log"; WS_LOG=/dev/null; unset WS_PYTHON_ENV0; AGENT_MEMORY_HOME="$R1/m"; ws_memory_selftest "$R1/bin/am" 0.5.0; printf '%s' "${SW_10%%|*}" )
eq "$o" "E-MEM-05" "R1 HOME normal: continua E-MEM-05"
# CLAUDE_CONFIG_DIR com um "~" literal: o setup para antes de criar o que quer que seja (E-CFG-08)
mkdir -p "$R1/hc"
o=$( cd "$R1/hc" && HOME="$R1/hc" CLAUDE_CONFIG_DIR='~/.claude-work' /bin/bash "$ROOT/setup/setup-mac.sh" --check </dev/null 2>&1 ); rc=$?
case "$rc|$o" in "1|"*"CLAUDE_CONFIG_DIR is not an absolute path"*"E-CFG-08"*) ok ;; *) ko "R1 CLAUDE_CONFIG_DIR com ~: [$rc] $o" ;; esac
[ -e "$R1/hc/~" ] && ko "R1 CLAUDE_CONFIG_DIR com ~: criou uma pasta ~" || ok
# CLAUDE_CONFIG_DIR so neste terminal: um terminal novo nao o tem -> E-CFG-09; com o mesmo valor, so a nota
o=$( ws_newterm() { printf '\n'; }; CLAUDE_CONFIG_DIR="$R1/cw"; CLAUDE_DIR="$R1/cw"; HOME="$R1/h"; WS_CUR=8; SW_8=""; SN_8=""; WS_LOG=/dev/null; ws_s8_config_dir; printf '%s#%s' "${SW_8%%|*}" "$SN_8" )
eq "$o" "E-CFG-09#Claude Code folder (CLAUDE_CONFIG_DIR): $R1/cw" "R1 CLAUDE_CONFIG_DIR diferente num terminal novo -> E-CFG-09"
o=$( ws_newterm() { printf '%s\n' "$R1/cw/"; }; CLAUDE_CONFIG_DIR="$R1/cw"; CLAUDE_DIR="$R1/cw"; HOME="$R1/h"; WS_CUR=8; SW_8=""; SN_8=""; WS_LOG=/dev/null; ws_s8_config_dir; printf '%s' "$SW_8" )
eq "$o" "" "R1 CLAUDE_CONFIG_DIR igual num terminal novo: sem aviso"
# teste final: claude que nao arranca (127) e resposta que nao se le (exit 0)
for c in "127|E-CC-02" "0|E-SMOKE-01|exit 0, reply not readable"; do
  IFS='|' read -r code want det <<EOF
$c
EOF
  printf '#!/bin/sh\necho "nao e json"\nexit %s\n' "$code" > "$R1/bin/claude"; chmod +x "$R1/bin/claude"
  o=$( WS_CLAUDE="$R1/bin/claude"; CLAUDE_DIR="$R1/vazio"; WS_CUR=12; SF_12=""; WS_TMP=$R1; WS_PRICING="$ROOT/pricing.json"; WS_TMO_SMOKE=10; WS_GW_URL=""; WS_GW_DOWN=0
    WS_STEP_LOG="$R1/s12.log"; WS_LOG=/dev/null; WS_NODE=$NODE; unset ANTHROPIC_BASE_URL; ws_s12_install >/dev/null 2>&1; printf '%s' "$SF_12" )
  case "$o" in "$want|"*"$det"*) ok ;; *) ko "R1 teste final exit $code: [$o]" ;; esac
done
grep -q '"codigo \$rc"' "$ROOT/setup/setup-mac.sh" && ko "R1 teste final: detalhe em portugues (codigo)" || ok
# os codigos novos existem nos dois catalogos
for c in E-NET-09 E-SO-09 E-SO-10 E-CFG-08 E-CFG-09 E-CFG-10 E-NODE-03 E-MEM-08 E-MEM-09 E-MEM-10; do
  [ -n "$(ws_err_field "$c" titulo)" ] && grep -q "\"$c\"" "$ROOT/setup/messages.pt.json" && ok || ko "R1 catalogo: $c"
done
# --- chaos round 2 R2-cfg-auth
R2="$WS_TMP/r2cfg"; mkdir -p "$R2/bin" "$R2/h" "$R2/t" "$R2/cd" "$R2/cj"
# curl -q em todos os curl do setup (o ~/.curlrc da pessoa nao conta); so ficam de fora o texto de ajuda e o log
eq "$(grep -nE '(^|[^-a-z_])curl -' "$ROOT/setup/setup-mac.sh" | grep -v 'curl -q ' | grep -vE '^[0-9]+:[[:space:]]*#|<url>|D_ONE_LINER_MAC=' | head -n 3)" "" "r2 curlrc: todos os curl do setup comecam por -q"
printf 'max-filesize = 1\nnetrc-optional\nproxy = "http://proxy.corp.invalid:8080"\n' > "$R2/h/.curlrc"; printf 'conteudo do ficheiro\n' > "$R2/f.txt"
( HOME="$R2/h"; unset CURL_HOME XDG_CONFIG_HOME; curl -fsS -o /dev/null "file://$R2/f.txt" 2>/dev/null ) && ko "r2 curlrc: o curl sem -q devia ler o ~/.curlrc do teste" || ok
( HOME="$R2/h"; unset CURL_HOME XDG_CONFIG_HOME; WS_STEP_LOG="$R2/dl.log"; WS_LOG="$R2/dl-setup.log"; ws_dl "file://$R2/f.txt" "$R2/o.txt"; printf '%s|%s' "$?" "$(cat "$R2/o.txt" 2>/dev/null)" ) > "$R2/r"
eq "$(cat "$R2/r")" "0|conteudo do ficheiro" "r2 curlrc: ws_dl ignora o max-filesize/proxy/netrc do ~/.curlrc"
eq "$(HOME="$R2/h"; unset CURL_HOME XDG_CONFIG_HOME; ws_curlrc_proxy)" "http://proxy.corp.invalid:8080" "r2 curlrc: proxy = \"...\""
for c in 'proxy http://a.corp:3128|http://a.corp:3128' '--proxy=http://b.corp:80|http://b.corp:80' '-x socks5h://c:1080|socks5h://c:1080' 'socks5-hostname = "d:1080"|d:1080' '# proxy = http://nao|' 'noproxy = "*"|'; do
  printf '%s\n' "${c%%|*}" > "$R2/h/.curlrc"
  eq "$(HOME="$R2/h"; unset CURL_HOME XDG_CONFIG_HOME; ws_curlrc_proxy)" "${c#*|}" "r2 curlrc: ${c%%|*}"
done
printf '#!/bin/sh\nexit 0\n' > "$R2/bin/scutil"; chmod +x "$R2/bin/scutil"; printf 'proxy = "http://proxy.corp.invalid:8080"\n' > "$R2/h/.curlrc"
( HOME="$R2/h"; PATH="$R2/bin:$PATH"; unset CURL_HOME XDG_CONFIG_HOME HTTPS_PROXY https_proxy ALL_PROXY all_proxy; WS_CUR=0; SN_0=""; WS_STEP_LOG="$R2/p.log"; ws_detect_proxy; printf '%s|%s|%s' "$WS_PROXY" "$WS_PROXY_DEAD" "$SN_0" ) > "$R2/r"
case "$(cat "$R2/r")" in "|0|~/.curlrc sets a proxy (http://proxy.corp.invalid:8080)."*HTTPS_PROXY*) ok ;; *) ko "r2 curlrc: nota com o proxy do ~/.curlrc, que nao se usa [$(cat "$R2/r")]" ;; esac
( HOME="$R2/h"; d=$(ws_curl_home); cat "$d/.curlrc" ) > "$R2/r"
! grep -qE 'proxy|netrc|max-filesize' "$R2/r" && grep -qx 'retry = 2' "$R2/r" && ok || ko "r2 curlrc: o curlrc dos instaladores so tem os limites do setup"
( WS_STEP_LOG="$R2/inst.log"; : > "$WS_STEP_LOG"
  printf 'curl: (28) Operation timed out after 15000 milliseconds with 62847444 out of 267956720 bytes received\n' >> "$WS_STEP_LOG"; a=$(ws_installer_net_code 0)
  : > "$WS_STEP_LOG"; printf 'curl: (28) Operation timed out after 15000 milliseconds with 0 out of 0 bytes received\n' >> "$WS_STEP_LOG"; b=$(ws_installer_net_code 0)
  printf '%s|%s' "$a" "$b" ) > "$R2/r"
eq "$(cat "$R2/r")" "E-NET-07|E-NET-01" "r2 curlrc: corte a meio (bytes recebidos) = E-NET-07; sem bytes nao"

# passo 12: hooks da pessoa (bloqueio = E-SMOKE-05; SessionStart preso = 2.a tentativa sem hooks e E-SMOKE-06)
CDS="$R2/cd/settings.json"
cat > "$R2/bin/claude" <<EOF
#!/bin/sh
printf '%s\n' "\$*" >> "$R2/claude.args"
case "\$*" in
  *no-hooks.json*) printf '%s' "\$R2_NOHOOKS" ;;
  *) [ -n "\$R2_SLEEP" ] && sleep "\$R2_SLEEP"; printf '%s' "\$R2_OUT" ;;
esac
EOF
chmod +x "$R2/bin/claude"
r2s12() { ( export R2_OUT R2_NOHOOKS R2_SLEEP; WS_NODE=$NODE; WS_CLAUDE="$R2/bin/claude"; WS_TMP="$R2/t"; CLAUDE_DIR="$R2/cd"; WS_STEP_LOG="$R2/s12.log"; WS_LOG="$R2/s12-setup.log"; WS_CUR=12; SF_12=""; SD_12=""; WS_GW_DOWN=0; WS_GW_URL=""; WS_TMO_SMOKE=${R2_TMO:-20}
  ws_settings_proxy_dead() { return 1; }; ws_say() { :; }
  ws_s12_install; printf '%s|%s|%s' "$?" "$SF_12" "$SD_12" ); }
printf '{"hooks":{"UserPromptSubmit":[{"hooks":[{"type":"command","command":"/opt/corp/ticket-check.sh"}]}]}}\n' > "$CDS"; : > "$R2/claude.args"
o=$(R2_OUT='{"type":"result","subtype":"success","is_error":false,"num_turns":0,"result":"UserPromptSubmit operation blocked by hook:\nCompany policy: every prompt needs a ticket id (ABC-123)\n\nOriginal prompt: Reply in English with only the word OK","modelUsage":{}}' R2_NOHOOKS="" r2s12)
eq "$o" "1|E-SMOKE-05|UserPromptSubmit: Company policy: every prompt needs a ticket id (ABC-123)|" "r2 s12: hook UserPromptSubmit que bloqueia = E-SMOKE-05, nao Done"
o=$(R2_OUT='{"type":"result","subtype":"success","is_error":false,"num_turns":0,"result":"","modelUsage":{}}' r2s12); eq "$(printf '%s' "$o" | cut -d'|' -f1-3)" "1|E-SMOKE-01|no reply from the model (0 turns)" "r2 s12: 0 turnos sem hook conhecido = E-SMOKE-01"
o=$(R2_OUT='{"type":"result","subtype":"success","is_error":false,"num_turns":1,"result":"OK","modelUsage":{"claude-haiku-5-5":{"inputTokens":10,"outputTokens":1}}}' r2s12); eq "$(printf '%s' "$o" | cut -d'|' -f1-2)" "0|" "r2 s12: resposta normal continua Done"
o=$(R2_OUT='{"type":"result","is_error":false,"result":"OK","modelUsage":{}}' r2s12); eq "$(printf '%s' "$o" | cut -d'|' -f1-2)" "0|" "r2 s12: sem num_turns (versao antiga) continua Done"
printf '{"hooks":{"SessionStart":[{"hooks":[{"type":"command","command":"cd ~/notes && sleep 600","timeout":600}]}],"Stop":[{"hooks":[{"type":"command","command":"\\"/u/n\\" \\"/u/.workshop-claude/kit/hooks/stop.mjs\\""}]}]}}\n' > "$CDS"
eq "$(WS_NODE=$NODE; CLAUDE_DIR="$R2/cd"; ws_user_hooks)" "SessionStart" "r2 s12: ws_user_hooks ignora os hooks do kit"
: > "$R2/claude.args"
t0=$(date +%s); o=$(R2_TMO=2 R2_SLEEP=30 R2_OUT='x' R2_NOHOOKS='{"type":"result","is_error":false,"num_turns":1,"result":"OK","modelUsage":{}}' r2s12); t1=$(date +%s)
eq "$(printf '%s' "$o" | cut -d'|' -f1-2)" "1|E-SMOKE-06" "r2 s12: SessionStart preso, sem hooks responde = E-SMOKE-06"
case "$o" in *"SessionStart · "*settings.json*) ok ;; *) ko "r2 s12: E-SMOKE-06 diz o evento e o ficheiro [$o]" ;; esac
[ $((t1 - t0)) -lt 15 ] && [ "$(grep -c . "$R2/claude.args")" = 2 ] && grep -q 'no-hooks.json' "$R2/claude.args" && [ "$(cat "$R2/t/no-hooks.json")" = '{"disableAllHooks":true}' ] && ok || ko "r2 s12: uma so 2.a tentativa, com --settings sem hooks [$(cat "$R2/claude.args")]"
printf '{"model":"sonnet"}\n' > "$CDS"; : > "$R2/claude.args"
o=$(R2_TMO=2 R2_SLEEP=30 R2_OUT='x' R2_NOHOOKS='{"is_error":false,"num_turns":1,"result":"OK"}' r2s12); eq "$(printf '%s' "$o" | cut -d'|' -f1-3)" "1|E-SMOKE-01|no answer in 2 s" "r2 s12: sem hooks da pessoa nao ha 2.a tentativa"
eq "$(grep -c . "$R2/claude.args")" 1 "r2 s12: sem hooks da pessoa, um so claude -p"
: > "$R2/claude.args"; printf 'pedido\n' > "$R2/p.txt"
( export R2_NOHOOKS='{}'; WS_CLAUDE="$R2/bin/claude"; WS_TMP="$R2/t"; WS_LOG="$R2/h.log"; WS_GW_DOWN=0; ws_helper_call "$R2/p.txt" "$R2/o.json" '{"type":"object"}' 5 )
grep -q -- '--settings .*no-hooks.json' "$R2/claude.args" && ok || ko "r2 helper: o ajudante corre sem os hooks da pessoa [$(cat "$R2/claude.args")]"
grep -q 'E-GH-02|E-GH-03|E-SMOKE-05|E-SMOKE-06) return 1' "$ROOT/setup/setup-mac.sh" && ok || ko "r2 helper: E-SMOKE-05/06 nao oferecem o ajudante"

# passo 8: disableAllHooks (E-CFG-11), itens da pessoa com o nome de um do kit (nota) e --replace-statusline
( HOME="$R2/h"; CLAUDE_DIR="$R2/h/.claude"; WS_CUR=8; SW_8=""; SN_8=""; ws_s8_parse "$(printf 'skills\t7\nagentes\t6\naviso\tE-CFG-11\nalheio\t%s/h/.workshop-claude/backup/2026/skills/memory\n' "$R2")"; printf '%s|%s' "$SW_8" "$SN_8" ) > "$R2/r"
case "$(cat "$R2/r")" in "E-CFG-11|~/.claude/settings.json: disableAllHooks"*"Your memory has the same name as one in the kit: it is saved in ~/.workshop-claude/backup/2026/skills"*) ok ;; *) ko "r2 s8: aviso E-CFG-11 e nota do item da pessoa [$(cat "$R2/r")]" ;; esac
r2s8() { ( WS_MODE=$1; WS_SUBST_SL=$2; WS_CUR=8; SW_8=""; SN_8=""; SF_8=""; WS_STEP_LOG="$R2/s8.log"; ws_kit_ensure() { return 0; }; ws_registar_flush() { :; }
  ws_iu() { printf 'ok\t1\nskills\t7\nagentes\t6\nstatusline\talheia\naviso\tE-CFG-06\n'; }; ws_s8_detect; printf '%s' "$?" ); }
eq "$(r2s8 install 1)$(r2s8 install 0)$(r2s8 check 1)" "100" "r2 s8: --replace-statusline com uma statusline alheia instala (so no install)"

# passos 7 e 10: o registo do ~/.claude.json decide, sem o "mcp get" (que arranca um stdio antigo)
cat > "$R2/bin/claude-mcp" <<EOF
#!/bin/sh
printf '%s\n' "\$*" >> "$R2/mcp.calls"
j="$R2/cj/.claude.json"
case "\$1 \$2" in
  "mcp get") grep -q v2/mcp "\$j" && echo "  URL: https://mcp.atlassian.com/v2/mcp" && exit 0; exit 1 ;;
  "mcp remove") echo '{"mcpServers":{}}' > "\$j" ;;
  "mcp add") echo '{"mcpServers":{"atlassian":{"type":"http","url":"https://mcp.atlassian.com/v2/mcp"}}}' > "\$j" ;;
esac
exit 0
EOF
chmod +x "$R2/bin/claude-mcp"
printf '{"numStartups":3,"mcpServers":{"atlassian":{"type":"stdio","command":"npx","args":["-y","mcp-remote","https://mcp.atlassian.com/v1/sse","--header","Authorization: Bearer segredo123","--api-token=abc"]},"agent-memory":{"type":"stdio","command":"/u/bin/agent-memory","args":["mcp"]}}}\n' > "$R2/cj/.claude.json"
r2mcp() { ( CLAUDE_CONFIG_DIR="$R2/cj"; WS_CLAUDE="$R2/bin/claude-mcp"; WS_NODE=$NODE; WS_TMO_MCP=5; C_ATLASSIAN_MCP_URL=https://mcp.atlassian.com/v2/mcp; WS_STEP_LOG="$R2/mcp.log"; WS_LOG="$R2/mcp-setup.log"; ws_registar() { :; }; eval "$1" ); }
for engine in node jxa; do
  if [ "$engine" = node ]; then [ -n "$NODE" ] || continue; E=$NODE; else command -v osascript >/dev/null || continue; E=""; fi
  : > "$R2/mcp.calls"
  eq "$(r2mcp 'WS_NODE=$E; WS_CUR=7; WS_MODE=check; SF_7=""; ws_s7_detect >/dev/null; printf "%s" "$SF_7"')" "E-MCP-01|atlassian: npx -y mcp-remote https://mcp.atlassian.com/v1/sse --header *** --api-token=***" "r2 s7 $engine: registo stdio antigo lido do ~/.claude.json, sem segredos"
  eq "$(grep -c 'mcp get' "$R2/mcp.calls")" 0 "r2 s7 $engine: o registo antigo nao foi arrancado (sem mcp get)"
  eq "$(r2mcp 'WS_NODE=$E; ws_memory_mcp_ok /u/bin/agent-memory; printf "%s|" "$?"; ws_memory_mcp_ok /outro/agent-memory; printf "%s" "$?"')" "0|1" "r2 s10 $engine: agent-memory decidido pelo ~/.claude.json"
  eq "$(grep -c 'mcp get' "$R2/mcp.calls")" 0 "r2 s10 $engine: sem mcp get"
done
: > "$R2/mcp.calls"
r2mcp 'WS_CUR=7; WS_MODE=install; SN_7=""; SF_7=""; ws_s7_detect >/dev/null; ws_s7_acli() { return 0; }; ws_acli() { echo acli; }; ws_s7_install >/dev/null; printf "%s|%s" "$?" "$SN_7"' > "$R2/r"
grep -q 'mcp remove --scope user atlassian' "$R2/mcp.calls" && grep -q 'mcp add --transport http --scope user atlassian https://mcp.atlassian.com/v2/mcp' "$R2/mcp.calls" && grep -q '^0|.*pointed to npx -y mcp-remote' "$R2/r" && ok || ko "r2 s7 install: troca o registo antigo sem o voltar a ler [$(cat "$R2/r") / $(cat "$R2/mcp.calls")]"

# passo 3: o "auth status" corre na pasta temporaria (o .claude/settings.json da pasta atual pode ligar o Bedrock)
cat > "$R2/bin/claude-auth" <<EOF
#!/bin/sh
pwd -P > "$R2/auth.pwd"
printf '{"loggedIn":true,"apiProvider":"firstParty"}'
EOF
chmod +x "$R2/bin/claude-auth"
( cd "$R2/h" && WS_CLAUDE="$R2/bin/claude-auth"; WS_TMP="$R2/t"; WS_STEP_LOG="$R2/auth.log"; WS_LOG="$R2/auth-setup.log"; ws_auth_read )
eq "$(cat "$R2/auth.pwd")" "$(cd "$R2/t" && pwd -P)" "r2 s3: claude auth status na pasta temporaria"

# passo 10: definicoes do uv da pessoa (E-UV-03/04) e o certificado da empresa (UV_SYSTEM_CERTS, depois ca.pem, E-NET-10)
mkdir -p "$R2/uvh/.config/uv"
printf '[global]\nindex-url = https://artifactory.corp/api/pypi/simple\n' > "$R2/uvh/.config/uv/uv.toml"
printf 'error: Failed to parse: `.config/uv/uv.toml`\n  Caused by: TOML parse error at line 2, column 13\n' > "$R2/uv1.log"
eq "$(cd "$R2/uvh" && HOME="$R2/uvh"; unset XDG_CONFIG_HOME UV_CONFIG_FILE; WS_STEP_LOG="$R2/uv1.log"; ws_uv_config_cause; printf '%s|%s|%s' "$?" "$WS_UV_CFG" "$WS_UV_CFG_DETAIL")" "0|E-UV-03|~/.config/uv/uv.toml · TOML parse error at line 2, column 13" "r2 uv: erro de sintaxe no uv.toml = E-UV-03 com o caminho e a linha"
printf 'python-install-mirror = "http://10.255.255.1/artifactory/github"\n' > "$R2/uvh/.config/uv/uv.toml"
printf 'error: Failed to download http://10.255.255.1/artifactory/github/x/cpython-3.12.tar.gz\n  Caused by: operation timed out\n' > "$R2/uv2.log"
eq "$(cd "$R2/uvh" && HOME="$R2/uvh"; unset XDG_CONFIG_HOME UV_CONFIG_FILE; WS_STEP_LOG="$R2/uv2.log"; ws_uv_config_cause; printf '%s|%s|%s' "$?" "$WS_UV_CFG" "$WS_UV_CFG_DETAIL")" "0|E-UV-04|~/.config/uv/uv.toml · 10.255.255.1" "r2 uv: mirror do uv.toml que nao responde = E-UV-04"
printf 'error: Failed to fetch: `https://pypi.org/simple/x/`\n' > "$R2/uv3.log"
eq "$(cd "$R2/uvh" && HOME="$R2/uvh"; unset XDG_CONFIG_HOME UV_CONFIG_FILE; WS_STEP_LOG="$R2/uv3.log"; ws_uv_config_cause; printf '%s' "$?")" "1" "r2 uv: um servidor que nao esta no uv.toml nao e da config"
r2s10() { ( WS_CUR=10; HOME="$R2/uvh"; unset XDG_CONFIG_HOME UV_CONFIG_FILE; cd "$R2/uvh" || exit; WS_HOME="$R2/ws10"; mkdir -p "$WS_HOME"; WS_TMP="$R2/t"; WS_STEP_LOG="$R2/s10.log"; : > "$WS_STEP_LOG"; WS_LOG="$R2/s10-setup.log"; C_MEMORY_APP_VERSION=v0.5.0; SF_10=""; UV_SYSTEM_CERTS=$1
  rm -f "$R2/uvh/.config/uv/uv.toml"; : > "$R2/uv.calls"
  ws_release_url() { printf 'file:///nada/%s' "$2"; }; ws_say() { :; }
  ws_dl() { printf '%s  agent_memory-0.5.0-py3-none-any.whl\n%s  constraints.txt\n' aaaa bbbb > "$2"; }
  ws_dl_check() { : > "$2"; }
  ws_uv_tool_install() { printf 'certs=%s ssl=%s\n' "${UV_SYSTEM_CERTS:-}" "${SSL_CERT_FILE:+bundle}" >> "$R2/uv.calls"
    [ -n "${SSL_CERT_FILE:-}" ] && grep -q 'CA DO IT' "$SSL_CERT_FILE" && return 0
    echo 'error: invalid peer certificate: UnknownIssuer' >> "$WS_STEP_LOG"; return 1; }
  ws_memory_bin() { return 1; }; ws_registar() { :; }; WS_UV=/usr/bin/false
  ws_s10_install >/dev/null; printf '%s|%s' "$SF_10" "$(tr '\n' ';' < "$R2/uv.calls")" ); }
eq "$(r2s10 "")" "E-NET-10|uv: github.com / pypi.org|certs= ssl=;certs=true ssl=;" "r2 uv: sem ca.pem, UV_SYSTEM_CERTS e depois E-NET-10 (nao o E-NET-04 circular)"
mkdir -p "$R2/ws10"; printf -- '-----BEGIN CERTIFICATE-----\nCA DO IT\n-----END CERTIFICATE-----\n' > "$R2/ws10/ca.pem"
eq "$(r2s10 true)" "E-MEM-03|agent-memory|certs=true ssl=;certs=true ssl=bundle;" "r2 uv: com o ca.pem do IT, o uv recebe-o pelo SSL_CERT_FILE"
# passo 0: o ~/.workshop-claude/ca.pem e da pessoa: o setup nunca o escreve, junta-o ao do Keychain
printf '#!/bin/sh\nexit 0\n' > "$R2/bin/curl"; printf '#!/bin/sh\nprintf -- "-----BEGIN CERTIFICATE-----\\nKEYCHAIN\\n-----END CERTIFICATE-----\\n"\n' > "$R2/bin/security"; chmod +x "$R2/bin/curl" "$R2/bin/security"
( PATH="$R2/bin:$PATH"; HOME="$R2/h"; WS_HOME="$R2/ws10"; WS_CUR=0; SN_0=""; SW_0=""; WS_STEP_LOG="$R2/tls.log"; WS_FORCAR_EMISSOR="CN=Corp Root"; ws_detect_tls; printf '%s' "$WS_CA_PEM" ) > "$R2/r"
eq "$(cat "$R2/r")|$(grep -c 'CA DO IT' "$R2/ws10/ca.pem")|$(grep -c KEYCHAIN "$R2/ws10/ca.pem")|$(grep -c 'CA DO IT' "$R2/ws10/ca-company.pem")|$(grep -c KEYCHAIN "$R2/ws10/ca-company.pem")" "$R2/ws10/ca-company.pem|1|0|1|1" "r2 tls: ca.pem fica intacto; ca-company.pem = Keychain + ca.pem"

# passo 4: o claude que um terminal novo corre (um alias noutro ficheiro, para o ~/.claude/local apagado = E-CC-05)
if [ -n "$NODE" ] && [ -x /bin/zsh ]; then
  mkdir -p "$R2/nt/.local/bin"; printf '#!/bin/sh\necho "2.1.292 (Claude Code)"\n' > "$R2/nt/.local/bin/claude"; chmod +x "$R2/nt/.local/bin/claude"
  printf 'export PATH="$HOME/.local/bin:$PATH"\nsource ~/.aliases\n' > "$R2/nt/.zshrc"; printf 'alias claude="~/.claude/local/claude"\n' > "$R2/nt/.aliases"
  r2nt() { ( HOME="$R2/nt"; SHELL=/bin/zsh; WS_NODE=$NODE; WS_NEWTERM_SECS=5; WS_CUR=4; SW_4=""; ST_2=$1; C_CLAUDE_CODE_MIN_VERSION=2.1.285; WS_LOG="$R2/nt.log"; ws_newterm_claude_check; printf '%s' "$SW_4" ); }
  o=$(r2nt feito); case "$o" in "E-CC-05|claude is an alias for ~/.claude/local/claude"*) ok ;; *) ko "r2 s4: alias noutro ficheiro para um claude que ja nao existe = E-CC-05 [$o]" ;; esac
  printf 'alias claude="claude --verbose"\n' > "$R2/nt/.aliases"
  eq "$(r2nt feito)" "" "r2 s4: alias inofensivo para o claude certo passa"
  printf 'alias claude="~/.claude/local/claude"\n' > "$R2/nt/.aliases"
  eq "$(r2nt falhou)" "" "r2 s4: sem passo 2 feito nao se testa"
fi
grep -q '\[ "\$m" = unknown \] || ws_newterm_claude_check' "$ROOT/setup/setup-mac.sh" && ok || ko "r2 s4: o ws_s4_detect chama o ws_newterm_claude_check"
# resumo: 1 aviso no singular
eq "$(ws_m final_aviso1)" "There is 1 warning above. It doesn't block the workshop, but read it." "r2 resumo: 1 aviso no singular"

# --- agent memory folder rules (a regra da app: src/memoria/config.py). HOME e CLAUDE_CONFIG_DIR em pastas temporarias.
AM="$WS_TMP/amrules"; mkdir -p "$AM/h" "$AM/cc" "$AM/bin" "$AM/ws"
amh() { ( HOME="$AM/h"; CLAUDE_CONFIG_DIR="$AM/cc"; unset AGENT_MEMORY_HOME MEMORIA_HOME; eval "$1"; ws_memory_home ); }
eq "$(amh 'AGENT_MEMORY_HOME=/x/a; MEMORIA_HOME=/x/m')" /x/a "am rules: AGENT_MEMORY_HOME primeiro"
eq "$(amh 'MEMORIA_HOME=/x/m')" /x/m "am rules: MEMORIA_HOME (legado)"
eq "$(amh 'AGENT_MEMORY_HOME="  /x/a  "')" /x/a "am rules: valor sem espacos a volta"
eq "$(amh 'AGENT_MEMORY_HOME="~"')" "$AM/h" "am rules: ~ sozinho e a HOME"
eq "$(amh 'AGENT_MEMORY_HOME="~/notas"')" "$AM/h/notas" "am rules: ~/ literal conta a partir da HOME"
eq "$(amh 'MEMORIA_HOME=" rel/m "')" "$AM/h/rel/m" "am rules: caminho relativo conta a partir da HOME (nunca da pasta atual)"
eq "$(amh 'AGENT_MEMORY_HOME="~x"')" "$AM/h/~x" "am rules: ~x nao e expandido, fica relativo a HOME"
eq "$(amh 'AGENT_MEMORY_HOME="   "; MEMORIA_HOME=/x/m')" "$AM/h/.agent-memory" "am rules: AGENT_MEMORY_HOME so com espacos = pasta por omissao (como a app)"
eq "$(amh '')" "$AM/h/.agent-memory" "am rules: nada -> ~/.agent-memory"
printf 'x' > "$AM/h/.memoria"
eq "$(amh '')" "$AM/h/.agent-memory" "am rules: ~/.memoria ficheiro nao conta"
rm -f "$AM/h/.memoria"; mkdir -p "$AM/h/.memoria"
eq "$(amh '')" "$AM/h/.memoria" "am rules: ~/.memoria sem ~/.agent-memory"
mkdir -p "$AM/h/.agent-memory/.index"; printf '{}' > "$AM/h/.agent-memory/config.json"; printf 'x' > "$AM/h/.agent-memory/.index/n.md"
eq "$(amh '')" "$AM/h/.agent-memory" "am rules: as duas sem notas -> ~/.agent-memory"
mkdir -p "$AM/h/.memoria/proj"; printf 'x' > "$AM/h/.memoria/proj/2026-01-01-a.md"
eq "$(amh '')" "$AM/h/.memoria" "am rules: ~/.agent-memory so com config.json/.index nao esconde as notas de ~/.memoria"
mkdir -p "$AM/h/.agent-memory/proj"; printf 'x' > "$AM/h/.agent-memory/proj/2026-01-02-b.md"
eq "$(amh '')" "$AM/h/.agent-memory" "am rules: ~/.agent-memory com notas ganha"
rm -rf "$AM/h/.memoria"; ln -s "$AM/nuvem/memoria" "$AM/h/.memoria"
eq "$(amh '')" "$AM/h/.agent-memory" "am rules: link partido ~/.memoria com ~/.agent-memory com notas -> ~/.agent-memory"
rm -rf "$AM/h/.agent-memory/proj"
eq "$(amh '')" "$AM/h/.memoria" "am rules: link partido ~/.memoria continua a ser a pasta (~/.agent-memory sem notas)"
rm -rf "$AM/h/.agent-memory"
eq "$(amh '')" "$AM/h/.memoria" "am rules: link partido ~/.memoria sem ~/.agent-memory"
ln -s "$AM/nuvem/agent" "$AM/h/.agent-memory"
eq "$(amh '')" "$AM/h/.memoria" "am rules: ~/.agent-memory link partido conta como nao existir"
rm -f "$AM/h/.agent-memory"
# config.json: nunca se cria nada atraves de um link partido (passo 10 continua com a linha no log)
o=$( HOME="$AM/h"; CLAUDE_CONFIG_DIR="$AM/cc"; unset AGENT_MEMORY_HOME MEMORIA_HOME; WS_STEP_LOG="$AM/s10.log"; : > "$WS_STEP_LOG"; WS_NODE=$NODE; ws_memory_config; printf '%s' "$?" )
eq "$o|$([ -e "$AM/nuvem" ] && echo criou)|$(grep -c 'is a link that does not lead to a folder' "$AM/s10.log")" "1||1" "am rules: config.json nao cria a pasta atras de um link partido"
o=$( HOME="$AM/h"; CLAUDE_CONFIG_DIR="$AM/cc"; AGENT_MEMORY_HOME="$AM/h/.memoria"; WS_STEP_LOG="$AM/s10.log"; WS_NODE=""; C_MEMORY_APP_REPO_URL=r; C_RELEASE_DOWNLOAD_URL=p; C_PYTHON_VERSION=3.12; ws_memory_config; printf '%s' "$?" )
eq "$o|$([ -e "$AM/nuvem" ] && echo criou)" "1|" "am rules: config.json com AGENT_MEMORY_HOME num link partido (sem node)"
rm -f "$AM/h/.memoria"
# shellcheck disable=SC2088
o=$( HOME="$AM/h"; CLAUDE_CONFIG_DIR="$AM/cc"; AGENT_MEMORY_HOME="~/dados"; WS_STEP_LOG="$AM/s10.log"; WS_NODE=""; C_MEMORY_APP_REPO_URL=r; C_RELEASE_DOWNLOAD_URL=p; C_PYTHON_VERSION=3.12; cd "$AM/bin" && ws_memory_config; printf '%s' "$?" )
eq "$o|$([ -f "$AM/h/dados/config.json" ] && echo cfg)|$([ -e "$AM/bin/~" ] && echo til)" "0|cfg|" "am rules: config.json em ~/dados, nunca numa pasta ~ na pasta atual"
# selftest: [WARN] de outra pasta com notas (codigo 0) -> aviso E-MEM-11; o [WARN] nao conta como motivo de falha
printf '#!/bin/sh\nprintf "Agent Memory 0.5.1 \302\267 Python 3.12.13\\n  [OK] SQLite 3.50 with FTS5\\n  [OK] Memory folder: /h/.agent-memory\\n  [WARN] /h/.memoria (~/.memoria) has 3 memories that are not shown (the folder in use is the one above). Move them there.\\n"\n' > "$AM/bin/am"; chmod +x "$AM/bin/am"
o=$( HOME="$AM/h"; CLAUDE_CONFIG_DIR="$AM/cc"; unset WS_PYTHON_ENV0; WS_CUR=10; SW_10=""; SD_10=""; WS_STEP_LOG="$AM/s10.log"; WS_LOG=/dev/null; ws_memory_selftest "$AM/bin/am" 0.5.1; printf '%s#%s' "$?" "$SW_10" )
eq "$o" "0#E-MEM-11|/h/.memoria (~/.memoria) has 3 memories that are not shown" "am rules: selftest com [WARN] de memorias que nao aparecem -> E-MEM-11"
printf '#!/bin/sh\nprintf "Agent Memory 0.5.1 \302\267 Python 3.12.13\\n  [OK] x\\n  [WARN] Something else\\n"\n' > "$AM/bin/am"
o=$( HOME="$AM/h"; unset WS_PYTHON_ENV0; WS_CUR=10; SW_10=""; WS_STEP_LOG="$AM/s10.log"; WS_LOG=/dev/null; ws_memory_selftest "$AM/bin/am" 0.5.1; printf '%s#%s' "$?" "$SW_10" )
eq "$o" "0#" "am rules: outro [WARN] nao da aviso"
printf '#!/bin/sh\nprintf "  [OK] x\\n  [WARN] /h/.memoria (~/.memoria) has 3 memories that are not shown\\n  [FAIL] FTS5 is not available\\n"; exit 1\n' > "$AM/bin/am"
o=$( HOME="$AM/h"; unset WS_PYTHON_ENV0; WS_CUR=10; SW_10=""; WS_STEP_LOG="$AM/s10.log"; WS_LOG=/dev/null; AGENT_MEMORY_HOME="$AM/m"; ws_memory_selftest "$AM/bin/am" 0.5.1; printf '%s' "$SW_10" )
eq "$o" "E-MEM-05|FTS5 is not available" "am rules: selftest falhado: o [WARN] nao entra no motivo"
# atalho do Dock: com AGENT_MEMORY_HOME/MEMORIA_HOME na shell a pasta vai escrita no atalho; outra pasta = refazer
printf '#!/bin/sh\nprintf "%%s" "$AGENT_MEMORY_HOME"\n' > "$AM/bin/agent-memory-gui"; chmod +x "$AM/bin/agent-memory-gui"
L="$AM/h/Applications/$WS_APP_BUNDLE/Contents/MacOS/$WS_APP_EXE"
amsc() { ( HOME="$AM/h"; CLAUDE_CONFIG_DIR="$AM/cc"; WS_HOME="$AM/ws"; KIT_SRC=""; WS_STEP_LOG="$AM/s10.log"; WS_LOG=/dev/null; C_MEMORY_APP_VERSION=v0.5.1
  unset AGENT_MEMORY_HOME MEMORIA_HOME; eval "$1"; ws_memory_shortcut "$AM/bin/agent-memory" >/dev/null 2>&1; printf '%s' "$?" ); }
eq "$(amsc '')|$(grep -c AGENT_MEMORY_HOME "$L")" "0|0" "am rules: atalho sem variavel nao leva pasta"
eq "$( HOME="$AM/h"; unset AGENT_MEMORY_HOME MEMORIA_HOME; ws_memory_launcher_ok; printf '%s' "$?" )" 0 "am rules: atalho sem variavel esta certo"
eq "$( HOME="$AM/h"; unset MEMORIA_HOME; AGENT_MEMORY_HOME=/x/a; ws_memory_launcher_ok; printf '%s' "$?" )" 1 "am rules: variavel nova -> atalho por refazer"
eq "$(amsc 'MEMORIA_HOME="~/m e \"q\" \$x"')" 0 "am rules: atalho com MEMORIA_HOME"
eq "$(env -u AGENT_MEMORY_HOME -u MEMORIA_HOME /bin/sh "$L")" "$AM/h/m e \"q\" \$x" "am rules: o atalho arranca com a pasta normalizada (aspas e \$ protegidos)"
eq "$(AGENT_MEMORY_HOME=/ja/definida /bin/sh "$L")" /ja/definida "am rules: um AGENT_MEMORY_HOME do arranque ganha (:=)"
grep -qxF ": \"\${AGENT_MEMORY_HOME:=$AM/h/m e \\\"q\\\" \\\$x}\"; export AGENT_MEMORY_HOME" "$L" && ok || ko "am rules: linha do atalho [$(sed -n 2p "$L")]"
# shellcheck disable=SC2088
eq "$( HOME="$AM/h"; unset AGENT_MEMORY_HOME; MEMORIA_HOME='~/m e "q" $x'; ws_memory_launcher_ok; printf '%s' "$?" )" 0 "am rules: atalho com a mesma pasta esta certo"
eq "$( HOME="$AM/h"; unset MEMORIA_HOME; AGENT_MEMORY_HOME=/outra; ws_memory_launcher_ok; printf '%s' "$?" )" 1 "am rules: outra pasta -> atalho por refazer"
eq "$( HOME="$AM/h"; unset AGENT_MEMORY_HOME MEMORIA_HOME; ws_memory_launcher_ok; printf '%s' "$?" )" 1 "am rules: sem variavel, atalho com pasta -> por refazer"
eq "$(amsc 'AGENT_MEMORY_HOME=/outra')|$(env -u AGENT_MEMORY_HOME /bin/sh "$L")" "0|/outra" "am rules: atalho refeito com a pasta nova"
eq "$(amsc '')|$(grep -c AGENT_MEMORY_HOME "$L")" "0|0" "am rules: atalho refeito sem pasta"
# passo 10 (instalar): o atalho com outra pasta e refeito sem reinstalar a app
printf '#!/bin/sh\nprintf "Agent Memory 0.5.1 \302\267 Python 3.12.13\\n  [OK] x\\n"\n' > "$AM/bin/agent-memory"; chmod +x "$AM/bin/agent-memory"
printf '#!/bin/sh\ncase "$1 $2" in "tool list") echo "agent-memory v0.5.1";; "tool dir") echo "%s/bin";; esac\n' "$AM" > "$AM/bin/uv"; chmod +x "$AM/bin/uv"
o=$( HOME="$AM/h"; CLAUDE_CONFIG_DIR="$AM/cc"; PATH="$AM/bin:$PATH"; WS_HOME="$AM/ws"; KIT_SRC=""; WS_CUR=10; WS_STEP_LOG="$AM/s10.log"; WS_LOG=/dev/null; WS_MODE=install; WS_NODE=$NODE; WS_CLAUDE=""
  WS_UV="$AM/bin/uv"; unset MEMORIA_HOME WS_PYTHON_ENV0; AGENT_MEMORY_HOME="$AM/h/dados"; C_MEMORY_APP_VERSION=v0.5.1; SW_10=""; SF_10=""; ws_s10_detect; printf '%s|%s|%s' "$?" "$SW_10$SF_10" "$(env -u AGENT_MEMORY_HOME /bin/sh "$L")" )
eq "$o" "0||$AM/h/dados" "am rules: passo 10 refaz o atalho com a pasta de agora"
# os codigos novos existem nos dois catalogos
for c in E-MEM-11 E-MEM-12; do
  [ -n "$(ws_err_field "$c" titulo)" ] && grep -q "\"$c\"" "$ROOT/setup/messages.pt.json" && ok || ko "am rules catalogo: $c"
done

# --- aspeto: cartao, lista de passos e spinner (fancy) e as linhas de sempre (plain)
UI="$WS_TMP/ui"; mkdir -p "$UI/h/.workshop-claude"
# os simbolos novos: uma coluna, sem emoji
eq "$(for s in feito ja ok aviso falhou falta naoexec saltado; do ws_sym "$s"; done)" "✔✔✔▲✖✖○–" "ui: simbolos dos estados"
# guardas estaticas: um $VAR colado a um caractere nao ASCII (o bash 3.2 num locale UTF-8 le-o como parte do nome)
# e um "wait" sem PIDs (esperava tambem pelo spinner, que so acaba no fim do passo)
LC_ALL=C grep -n '\$[A-Za-z_][A-Za-z0-9_]*[^ -~]' "$ROOT/setup/setup-mac.sh" | grep -q . && ko "ui: \$VAR colado a um caractere nao ASCII (usar \${VAR})" || ok
grep -nE '(^|[;&|{]|then|do)[[:space:]]*wait[[:space:]]*($|[;&|}])' "$ROOT/setup/setup-mac.sh" | grep -q . && ko "ui: wait sem PIDs no setup" || ok
# o mesmo nome curto para cada passo nos dois catalogos
[ -n "$NODE" ] && eq "$("$NODE" -e 'const a=require(process.argv[1]),b=require(process.argv[2]);const k=o=>Object.keys(o.passos_curtos||{}).join(",");console.log(k(a)===k(b)&&k(a)===Object.keys(a.passos).join(",")?"ok":"diff")' "$ROOT/setup/messages.en.json" "$ROOT/setup/messages.pt.json")" ok "ui: passos_curtos em pt e en, um por passo"
# sem terminal: plain, e o plain nao tem \r nem sequencias do cursor
eq "$(ws_ui_detect; printf '%s' "$WS_UI")" plain "ui: stdout que nao e terminal = plain"
( for v in $(set | sed -n 's/^\(M_[A-Za-z0-9_]*\)=.*/\1/p'); do printf '%s=%q\n' "$v" "${!v}"; done ) > "$UI/msgs.sh"
cat > "$UI/run.sh" <<'__UI__'
# run.sh setup msgs cenario: um passo falso (o 4) com o aspeto que o terminal pedir
WS_SOURCE_ONLY=1; . "$1"; . "$2"; S=$3; D=$4
[ -n "${UI_SIZE:-}" ] && stty $UI_SIZE </dev/tty 2>/dev/null
WS_HOME="$D/h/.workshop-claude"; WS_TMP="$D/tmp.$$"; mkdir -p "$WS_TMP"; : > "$WS_TMP/.ws-tmp"; WS_LOG="$D/setup.log"; WS_MODE=install; WS_SIM=0
WS_FILL_KEYS=""; WS_OS="macOS 26.6 arm64"; WS_LANG=en-US; ST_2=feito
ws_ui_detect; printf 'UI=%s\n' "$WS_UI"
trap ws_interrupted INT TERM HUP; trap ws_cleanup EXIT
case "$S" in
  redir) ws_ui_begin 4 > "$D/redir.out"; printf "REDIR=[%s|%s]\n" "$WS_UI_SPIN" "${WS_UI_ON:-0}"; ws_ui_end; exit 0 ;;
  cmdsub) x=$(ws_ui_begin 4; printf "%s|%s" "$WS_UI_SPIN" "${WS_UI_ON:-0}"); printf "CMDSUB=[%s] ON=%s\n" "$x" "${WS_UI_ON:-0}"; exit 0 ;;
esac
ws_s4_detect() { return 1; }
ws_s4_install() {
  ws_activity "$(ws_msg a_descarregar O_QUE="node.tar.xz")"
  printf '%s\n' "$WS_UI_SPIN" >> "$D/spins"
  : > "$WS_TMP/f.part"; ws_hb_start "$WS_TMP/f.part"; printf '%s\n' "$WS_UI_SPIN" >> "$D/spins"
  sleep 1; ws_hb_stop
  case "$S" in
    ask) if ws_ask "Log in to GitHub now? (opens the browser)" s; then ws_note "ANSWER=yes"; else ws_note "ANSWER=no"; fi
         printf '%s\n' "$WS_UI_SPIN" >> "$D/spins" ;;
    ctrlc) printf 'READY\n' > "$D/ready"; sleep 30 ;;
    kill9) printf '%s\n' "$$" > "$D/main"; sleep 30 ;;
  esac
  ws_detail "Node v24.22.0"; return 0
}
ws_tty_fg_check() { # chamado pela pergunta a serio (ws_ask_q) antes de a mostrar: o spinner ja tem de estar parado
  local p; for p in $(cat "$D/spins" 2>/dev/null); do [ -n "$p" ] && kill -0 "$p" 2>/dev/null && printf "ALIVE-AT-ASK\n"; done; return 0
}
ws_step 4
printf 'SPIN_AFTER=[%s] ON=%s\n' "$WS_UI_SPIN" "$WS_UI_ON"
__UI__
# corre o cenario num pty (script) com o tamanho dado; $1 tamanho ("rows 30 cols 100" ou ""), $2 cenario, resto: env
ui_run() {
  local size=$1 s=$2; shift 2
  rm -f "$UI/spins" "$UI/ready" "$UI/main"
  ( [ "$#" -gt 0 ] && export "$@"; export UI_SIZE="$size" TERM="${UI_TERM:-xterm-256color}"; g1_timeout 40 script -q /dev/null /usr/bin/perl -e "\$SIG{INT} = q(DEFAULT); exec @ARGV" /bin/bash "$UI/run.sh" "$ROOT/setup/setup-mac.sh" "$UI/msgs.sh" "$s" "$UI" < "${UI_IN:-/dev/null}" > "$UI/out" 2>&1 )
}
ui_txt() { LC_ALL=C sed $'s/\033\\[[0-9;]*m//g' "$UI/out" | tr -d '\r'; }
ui_dead() { local p; for p in $(cat "$UI/spins" 2>/dev/null); do [ -n "$p" ] && kill -0 "$p" 2>/dev/null && { printf 'alive %s' "$p"; return 1; }; done; return 0; }
if command -v script >/dev/null 2>&1 && [ -n "$NODE" ]; then
  # fancy: so com o tamanho conhecido, >= 70 colunas, TERM a serio e sem NO_COLOR
  ui_run "rows 30 cols 100" step; grep -q 'UI=fancy' "$UI/out" && ok || ko "ui: pty 100x30 = fancy [$(head -c 200 "$UI/out")]"
  ui_run "rows 30 cols 60" step; grep -q 'UI=plain' "$UI/out" && ok || ko "ui: terminal estreito (60 colunas) = plain"
  ui_run "rows 30 cols 100" step NO_COLOR=1; grep -q 'UI=plain' "$UI/out" && ok || ko "ui: NO_COLOR = plain"
  UI_TERM=dumb ui_run "rows 30 cols 100" step; grep -q 'UI=plain' "$UI/out" && ok || ko "ui: TERM=dumb = plain"
  ui_run "rows 0 cols 0" step; grep -q 'UI=plain' "$UI/out" && ok || ko "ui: tamanho desconhecido = plain"
  # plain: o cabecalho e o resultado de sempre, sem \r e sem sequencias do cursor, e nenhum spinner
  ui_run "rows 30 cols 60" step
  ui_txt | grep -q "Step 4/12 · Node.js" && ui_txt | grep -q "✔ Done · Node v24.22.0" && ui_txt | grep -q "  Downloading node.tar.xz…" && ok || ko "ui plain: linhas de sempre [$(tr -d '\r' < "$UI/out")]"
  LC_ALL=C grep -q $'\033\\[[0-9]*[ABJK]' "$UI/out" && ko "ui plain: sequencias do cursor no plain" || ok
  eq "$(wc -l < "$UI/spins" 2>/dev/null | tr -d " ")" 2 "ui plain: o registo do cenario correu"
  eq "$(tr -d '\n' < "$UI/spins")" "" "ui plain: nenhum spinner"
  # fancy: a linha do passo no fim, a zona viva tirada (ESC[J depois da ultima imagem do spinner), sem processos a mais
  ui_run "rows 30 cols 100" step
  grep -q 'SPIN_AFTER=\[\] ON=0' "$UI/out" && ok || ko "ui fancy: spinner parado no fim do passo [$(grep SPIN_AFTER "$UI/out")]"
  ui_txt | grep -q "✔ Node.js            Node v24.22.0" && ok || ko "ui fancy: linha do passo"
  grep -q '4 of 12' "$UI/out" && ok || ko "ui fancy: barra N of 12"
  [ "$(wc -l < "$UI/spins" | tr -d " ")" = 2 ] && [ -n "$(head -n 1 "$UI/spins")" ] && ok || ko "ui fancy: o spinner arrancou [$(tr '\n' ' ' < "$UI/spins")]"
  r=$(ui_dead) && ok || ko "ui fancy: processo do spinner depois do passo ($r)"
  grep -q 'Step 4/12' "$UI/out" && ko "ui fancy: cabecalho do plain no fancy" || ok
  eq "$(LC_ALL=C perl -0ne 'my $f = rindex($_, "\033[K\r\033["); my $j = rindex($_, "\033[J"); print($j > $f ? "ok" : "stale")' "$UI/out")" ok "ui fancy: a zona viva sai do ecra"
  grep -q 'Still downloading' "$UI/out" && ko "ui fancy: linha do heartbeat no fancy" || ok
  # pergunta: o spinner para antes (a pergunta fica sozinha, "? ... [Y/n]") e volta depois; a resposta conta
  printf '%s\n' 'sleep 3; printf "n\n"; sleep 3' > "$UI/feed.sh"
  bash "$UI/feed.sh" | { UI_IN=/dev/stdin ui_run "rows 30 cols 100" ask; }
  grep -q 'ALIVE-AT-ASK' "$UI/out" && ko "ui fancy: spinner vivo na pergunta" || ok
  grep -q '  ? Log in to GitHub now? (opens the browser) \[Y/n\] ' "$UI/out" && ok || ko "ui fancy: forma da pergunta [$(tr -d '\r' < "$UI/out" | tail -n 5)]"
  grep -q 'ANSWER=no' "$UI/out" && ok || ko "ui fancy: resposta lida"
  [ "$(sed -n 3p "$UI/spins")" != "" ] && ok || ko "ui fancy: o spinner volta depois da pergunta"
  r=$(ui_dead) && ok || ko "ui fancy: processo do spinner depois da pergunta ($r)"
  # Ctrl-C a meio do passo: o setup diz que foi interrompido, sai com 130 e nao fica nenhum spinner
  printf '%s\n' 'i=0; while [ ! -f "$1/ready" ] && [ "$i" -lt 100 ]; do sleep 0.1; i=$((i + 1)); done; sleep 0.5; printf "\003"; sleep 2' > "$UI/feed.sh"
  bash "$UI/feed.sh" "$UI" | { UI_IN=/dev/stdin ui_run "rows 30 cols 100" ctrlc; }
  grep -q 'Interrupted' "$UI/out" && ok || ko "ui fancy: Ctrl-C mostra a mensagem [$(tr -d '\r' < "$UI/out" | tail -n 3)]"
  sleep 0.3; r=$(ui_dead) && ok || ko "ui fancy: spinner vivo depois do Ctrl-C ($r)"
  # no processo principal mas com o stdout num ficheiro, ou dentro de $( ): nada de spinner
  ui_run "rows 30 cols 100" redir; grep -q "REDIR=\[|0\]" "$UI/out" && ok || ko "ui fancy: sem spinner com o stdout redirecionado [$(grep REDIR "$UI/out")]"
  ui_run "rows 30 cols 100" cmdsub; grep -q "CMDSUB=\[|0\] ON=0" "$UI/out" && ok || ko "ui fancy: sem spinner dentro de \$( ) [$(grep CMDSUB "$UI/out")]"
  # kill -9 do setup: o spinner acaba sozinho
  ui_run "rows 30 cols 100" kill9 & bp=$!
  i=0; while [ ! -s "$UI/main" ] && [ "$i" -lt 100 ]; do sleep 0.1; i=$((i + 1)); done
  kill -9 "$(cat "$UI/main" 2>/dev/null)" 2>/dev/null; wait "$bp" 2>/dev/null
  sleep 1; r=$(ui_dead) && ok || ko "ui fancy: spinner vivo depois de kill -9 do setup ($r)"
fi
# nunca dentro de $( ), de um subshell ou com o stdout redirecionado (o spinner seguraria a captura)
eq "$( WS_UI=fancy; WS_COLS=100; WS_ROWS=30; WS_MODE=install; ws_ui_begin 4; printf "%s|%s" "$WS_UI_SPIN" "${WS_UI_ON:-0}" )" "|0" "ui: sem spinner dentro de \$( )"
( WS_UI=fancy; WS_COLS=100; WS_ROWS=30; WS_MODE=install; ws_ui_begin 4 > "$UI/redir"; printf "%s|%s" "$WS_UI_SPIN" "${WS_UI_ON:-0}" > "$UI/redir.r" )
eq "$(cat "$UI/redir.r")|$(wc -c < "$UI/redir" | tr -d ' ')" "|0|0" "ui: sem spinner num subshell com o stdout num ficheiro"
# o resumo (plain): o mesmo summary.txt, com os simbolos novos
o=$( WS_HOME="$UI/h/.workshop-claude"; WS_RESUMO="$WS_HOME/summary.txt"; WS_LOG=/dev/null; WS_MODE=install; WS_OS=macOS; WS_UI=plain
  for n in 0 1 2 3 4 5 6 7 8 9 10 11 12; do ws_set ST "$n" feito; ws_set SD "$n" "d$n"; done; ws_set ST 1 ja; ws_set ST 6 falhou; ws_summary >/dev/null 2>&1; cat "$WS_RESUMO" )
case "$o" in "Summary · "*"1     Git"*"✔ Already done"*"6     GitHub CLI (gh)"*"✖ Failed"*"1 step still to do: 6 (GitHub CLI (gh))."*) ok ;; *) ko "ui: summary.txt [$o]" ;; esac
case "$o" in *$'\033'*) ko "ui: summary.txt com cores" ;; *) ok ;; esac
# o resumo (fancy): cartao com "Summary", a tabela com os mesmos dados, as frases do fim e o summary.txt igual ao do plain
o=$( WS_HOME="$UI/h/.workshop-claude"; WS_RESUMO="$WS_HOME/summary.txt"; WS_LOG=/dev/null; WS_MODE=install; WS_OS=macOS; WS_UI=fancy; WS_COLOR=0; WS_COLS=100
  for n in 0 1 2 3 4 5 6 7 8 9 10 11 12; do ws_set ST "$n" feito; ws_set SD "$n" "d$n"; done; ws_set ST 1 ja; ws_set ST 6 falhou; ws_set ST 11 aviso; WS_TODO_MCP=1; ws_summary 2>&1 )
case "$o" in *"╭"*"Summary · "*"✔ 11 ready"*"▲ 1 with warnings"*"✖ 1 still to do"*"╰"*"1   Git"*"✔ Already done"*"d1"*"6   GitHub CLI"*"✖ Failed"*"d6"*"✖ 1 step still to do: 6 (GitHub CLI (gh))."*"→ After you fix it"*"▲ There is 1 warning above"*"→ To finish: open Claude Code"*"Summary saved to"*) ok ;; *) ko "ui fancy: resumo [$o]" ;; esac
case "$(cat "$UI/h/.workshop-claude/summary.txt")" in "Summary · "*"6     GitHub CLI (gh)"*"✖ Failed"*) ok ;; *) ko "ui fancy: summary.txt igual ao do plain" ;; esac

# --- --cleanup (D-34): a lista (dry-run), a confirmacao e o install-user limpar a serio, num HOME de teste
if [ -n "$NODE" ]; then
  CL="$WS_TMP/cl"; mkdir -p "$CL/h/workshop-claude" "$CL/h/.workshop-claude/telemetry" "$CL/h/.agent-memory/canivete" "$CL/h/.agent-memory/practice-project"
  clgit() { git -C "$1" -c user.name=t -c user.email=t@t.test -c commit.gpgsign=false -c core.hooksPath=.git/no-hooks "${@:2}" >/dev/null 2>&1; }
  for n in missions-project canivete-project practice-project; do
    mkdir -p "$CL/h/workshop-claude/$n"; echo kit > "$CL/h/workshop-claude/$n/README.md"; clgit "$CL/h/workshop-claude/$n" init -q; clgit "$CL/h/workshop-claude/$n" add -A; clgit "$CL/h/workshop-claude/$n" commit -q -m kit
  done
  echo meu > "$CL/h/workshop-claude/canivete-project/my-tool.js"
  echo '{}' > "$CL/h/.workshop-claude/telemetry/missions.json"; echo n > "$CL/h/.agent-memory/canivete/n.md"; echo n > "$CL/h/.agent-memory/practice-project/n.md"
  cl() { # sim(0|1) tty(0|1) -> saida e codigo
    ( HOME="$CL/h"; unset AGENT_MEMORY_HOME MEMORIA_HOME; WS_HOME="$HOME/.workshop-claude"; WS_PROJ="$HOME/workshop-claude"; WS_PRACTICE=practice-project; WS_LOG="$CL/log"; KIT_SRC=$ROOT
      WS_SIM=$1; CL_TTY=$2; WS_UI=plain; WS_COLOR=0; ws_has_tty() { [ "$CL_TTY" = 1 ]; }; ws_s4_detect() { WS_NODE=$NODE; }; ws_ask() { [ "$WS_SIM" = 1 ]; }
      ws_limpar; printf 'rc=%s\n' "$?" ) 2>&1
  }
  r=$(cl 0 0)
  case "$r" in *"This is what the cleanup will do:"*"delete (untouched, only the kit's copy): ~/workshop-claude/missions-project"*"move to the backup (it has your work): ~/workshop-claude/canivete-project"*"keep: ~/workshop-claude/practice-project"*"Nothing was changed."*"rc=0") ok ;; *) ko "cleanup: sem confirmacao, so a lista [$r]" ;; esac
  [ -d "$CL/h/workshop-claude/missions-project" ] && [ -d "$CL/h/.workshop-claude/telemetry" ] && ok || ko "cleanup: sem confirmacao nada muda"
  r=$(cl 1 0)
  case "$r" in *"Deleted: ~/workshop-claude/missions-project"*"Moved to the backup: ~/workshop-claude/canivete-project -> ~/.workshop-claude/backup/"*"Cleanup complete."*"rc=0") ok ;; *) ko "cleanup: --yes limpa [$r]" ;; esac
  eq "$(printf '%s\n' "$r" | grep -c 'keep:')" 1 "cleanup: depois de limpar nao repete a lista do que fica"
  case "$r" in *"delete the mission book and the panel registration: ~/.workshop-claude/telemetry"*"move the Agent Memory notes of this exercise to the backup: ~/.agent-memory/canivete"*) ok ;; *) ko "cleanup: a lista diz o que e cada coisa [$r]" ;; esac
  [ ! -e "$CL/h/workshop-claude/missions-project" ] && [ ! -e "$CL/h/workshop-claude/canivete-project" ] && [ -d "$CL/h/workshop-claude/practice-project" ] &&
    [ ! -e "$CL/h/.workshop-claude/telemetry" ] && [ ! -e "$CL/h/.agent-memory/canivete" ] && [ -f "$CL/h/.agent-memory/practice-project/n.md" ] && ok || ko "cleanup: o que sai e o que fica"
  ls "$CL"/h/.workshop-claude/backup/*/projects/canivete-project/my-tool.js >/dev/null 2>&1 && ok || ko "cleanup: o Canivete com trabalho no backup"
  r=$(cl 1 0)
  case "$r" in *"Nothing to clean up"*"rc=0") ok ;; *) ko "cleanup: segunda vez = nada a fazer [$r]" ;; esac
fi
grep -q -- '--cleanup  ' "$ROOT/setup/setup-mac.sh" && ok || ko "cleanup: --cleanup na ajuda"

# --- passo 9: os projetos do workshop ficam "trusted" no ~/.claude.json (D-34, install-user.mjs confiar)
if [ -n "$NODE" ]; then
  TH="$WS_TMP/trust home"; mkdir -p "$TH/.claude" "$TH/.workshop-claude" "$TH/workshop-claude/canivete-project"
  printf '{"hasCompletedOnboarding":true,"projects":{"/x":{"hasTrustDialogAccepted":false}}}' > "$TH/.claude/.claude.json"
  (
    export HOME="$TH" CLAUDE_CONFIG_DIR="$TH/.claude"
    WS_HOME="$TH/.workshop-claude"; WS_NODE=$NODE; KIT_SRC=$ROOT; WS_STEP_LOG="$WS_TMP/s9trust.log"; WS_LOG="$WS_TMP/s9trust.log"
    ws_registar projeto canivete-project "$TH/workshop-claude/canivete-project"
    ws_s9_trust; echo "rc=$?"
  ) > "$WS_TMP/s9trust.out" 2>&1
  eq "$(cat "$WS_TMP/s9trust.out")" "rc=0" "s9 trust: nao bloqueia e nao escreve no ecra"
  real=$(cd "$TH/workshop-claude/canivete-project" && pwd -P)
  eq "$("$NODE" -e 'const j=require(process.argv[1]);console.log(j.projects[process.argv[2]]?.hasTrustDialogAccepted, j.projects["/x"].hasTrustDialogAccepted, j.hasCompletedOnboarding)' "$TH/.claude/.claude.json" "$real")" "true false true" "s9 trust: o projeto fica trusted, o resto fica igual"
  grep -q "trust (exit 0): confiado" "$WS_TMP/s9trust.log" && ok || ko "s9 trust: fica no log"
  # um ~/.claude.json invalido nao se toca e nao bloqueia
  printf '{ nope' > "$TH/.claude/.claude.json"
  ( export HOME="$TH" CLAUDE_CONFIG_DIR="$TH/.claude"; WS_HOME="$TH/.workshop-claude"; WS_NODE=$NODE; KIT_SRC=$ROOT; WS_STEP_LOG="$WS_TMP/s9trust2.log"; WS_LOG=/dev/null; ws_s9_trust; echo "rc=$?" ) > "$WS_TMP/s9trust.out" 2>&1
  eq "$(cat "$WS_TMP/s9trust.out")|$(cat "$TH/.claude/.claude.json")" "rc=0|{ nope" "s9 trust: .claude.json invalido fica igual"
fi
sed -n '/^ws_s9_install() {/,/^}/p' "$ROOT/setup/setup-mac.sh" | grep -q '^  ws_s9_trust$' && ok || ko "s9 trust: o ws_s9_install chama o ws_s9_trust"

printf '\n%s testes passaram, %s falharam.\n' "$PASS" "$FAIL"
[ "$FAIL" = 0 ]
