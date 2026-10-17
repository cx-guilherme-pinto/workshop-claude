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

printf '\n%s testes passaram, %s falharam.\n' "$PASS" "$FAIL"
[ "$FAIL" = 0 ]
