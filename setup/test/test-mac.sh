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
  "$NODE" -e 'const c=require(process.argv[1]); for (const t of c.casos) console.log(t.in)' "$CASES" > "$WS_TMP/in"
  "$NODE" -e 'const c=require(process.argv[1]); for (const t of c.casos) console.log(t.out)' "$CASES" > "$WS_TMP/exp"
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
printf '#!/bin/sh\nexit 0\n' > "$AH/bin/claude"; chmod +x "$AH/bin/claude"
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

printf '\n%s testes passaram, %s falharam.\n' "$PASS" "$FAIL"
[ "$FAIL" = 0 ]
