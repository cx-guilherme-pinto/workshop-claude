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
( PATH="$G3/bin:$PATH"; export G3_MODE=redir-dns; WS_LOG="$G3/log"; WS_CUR=6; SF_6=""; ws_dl https://github.test/x "$G3/o"; ws_dl_fail https://github.test/x; printf '%s' "$SF_6" ) > "$G3/r"
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

printf '\n%s testes passaram, %s falharam.\n' "$PASS" "$FAIL"
[ "$FAIL" = 0 ]
