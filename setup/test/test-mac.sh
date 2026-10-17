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

printf '\n%s testes passaram, %s falharam.\n' "$PASS" "$FAIL"
[ "$FAIL" = 0 ]
