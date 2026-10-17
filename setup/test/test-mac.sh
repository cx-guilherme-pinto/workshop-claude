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
( WS_CLAUDE="$CM/claude"; WS_HOME="$CM/ws"; KIT_SRC=""; WS_STEP_LOG="$WS_TMP/s10.log"; ws_memory_mcp /u/bin/agent-memory ) >/dev/null 2>&1
[ ! -f "$CM/memoria" ] && grep -q 'mcp add --scope user agent-memory -- /u/bin/agent-memory mcp' "$CM/agent-memory" && ok || ko "mcp: o registo memoria sai e entra agent-memory"
( WS_CLAUDE="$CM/claude"; WS_HOME="$CM/ws"; KIT_SRC=""; WS_STEP_LOG="$WS_TMP/s10.log"; ws_memory_mcp /u/bin/agent-memory ) >/dev/null 2>&1; eq "$(grep -c . "$CM/agent-memory")" 1 "mcp: ja registado com o mesmo programa, nao muda"

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
( WS_CUR=9; SN_9=""; WS_PROJ="$G7/proj"; WS_PROJ_SHOW='~/workshop-claude'; WS_LANG_KIT=en; ws_s9_lang_check; printf '%s' "$SN_9" ) > "$WS_TMP/g7.out"
grep -q '^~/workshop-claude/demo-project is in Portuguese, and the workshop texts are now in English' "$WS_TMP/g7.out" &&
  grep -q '^~/workshop-claude/practice-project is in Portuguese' "$WS_TMP/g7.out" && ok || ko "s9: nota dos projetos noutra lingua [$(cat "$WS_TMP/g7.out")]"
( WS_CUR=9; SN_9=""; WS_PROJ="$G7/proj"; WS_PROJ_SHOW='~/workshop-claude'; WS_LANG_KIT=pt; ws_s9_lang_check; printf '%s' "$SN_9" ) > "$WS_TMP/g7.out"
eq "$(grep -c . "$WS_TMP/g7.out")" 0 "s9: projetos na lingua do kit, sem nota"
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
grep -qx 'proxy = "http://p.corp:8080"' "$G3/r" && grep -qx 'speed-time = 60' "$G3/r" && [ "$(tail -n 1 "$G3/r")" = "retry = 2" ] && ok || ko "g3: curlrc dos instaladores = o da pessoa + limites [$(cat "$G3/r")]"
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
# passo 3: Bedrock/Vertex pelo apiProvider -> falha E-CFG-04 sem oferecer o login; a origem da chave no aviso E-AUTH-03
eq "$(G4_PROVIDER=bedrock G4_METHOD=third_party g4 'WS_CLAUDE="$G4/claude"; WS_CUR=3; WS_MODE=install; WS_AUTH_OK=0; ws_s3_detect; r=$?; SF_3=""; ws_s3_install; printf "%s|%s|%s" "$r$?" "$SF_3" "$WS_AUTH_OK"')" "11|E-CFG-04|bedrock: managed settings|0" "passo 3: apiProvider bedrock -> E-CFG-04"
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
mcp() { g4 'WS_CLAUDE="$G4/claude"; WS_TMO_MCP=10; C_ATLASSIAN_MCP_URL=https://mcp.atlassian.com/v2/mcp; WS_HOME="$G4/ws"; KIT_SRC=""; WS_SIM=1; PATH="$G4/bin:$PATH"; '"$1"; }
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
      WS_NODE="$NODE"; KIT_SRC="$ROOT"; WS_LANG_KIT=en; WS_CUR=9; WS_MODE=install; WS_STEP_LOG="$G5/e.log"; : > "$WS_STEP_LOG"
      SF_9=""; SW_9=""; SN_9=""; SD_9=""
      ws_kit_ensure() { return 0; }
      "$1"; printf '%s#%s#%s#%s' "$?" "$SF_9" "$SW_9" "$SN_9" )
  }
  A="$EH/workshop-claude/demo-project"; P="$EH/workshop-claude/practice-project"
  r=$(g5e ws_s9_install); case "$r" in '0###'*) ok ;; *) ko "s9 git hostil: instala [$r] $(grep ERROR "$G5/e.log" | head -n 2)" ;; esac
  eq "$(g5git -C "$A" cat-file -t arena-start 2>/dev/null)" commit "s9 git hostil: tag arena-start leve"
  [ -n "$(g5git -C "$A" ls-files 'lib/*.js')" ] && [ -n "$(g5git -C "$P" ls-files 'src/*.js')" ] && ok || ko "s9 git hostil: os .js entram no commit apesar do gitignore global"
  [ ! -e "$HH/hook-ran" ] && ok || ko "s9 git hostil: o hook da pessoa correu"
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
printf '\n%s testes passaram, %s falharam.\n' "$PASS" "$FAIL"
[ "$FAIL" = 0 ]
