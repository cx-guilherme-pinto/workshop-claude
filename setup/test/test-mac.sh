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
eq "$(ws_profile_strip "$G2/indent")" "$(printf 'a\nb')" "ws_profile_strip tira um bloco indentado"
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
  "$G2H/.local/bin:$G2H/.workshop-claude/bin:$G2H/.workshop-claude/node/bin:/usr/bin:/bin" "ws_path_setup poe as pastas a frente e sem duplicados"
chmod -R u+rwx "$G2" 2>/dev/null

printf '\n%s testes passaram, %s falharam.\n' "$PASS" "$FAIL"
[ "$FAIL" = 0 ]
