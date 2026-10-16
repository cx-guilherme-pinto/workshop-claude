#!/usr/bin/env bash
# shellcheck disable=SC2034,SC2154,SC2015,SC2016
# (SC2034/SC2154: variaveis lidas por nome, com ${!var}, ou do bloco injetado; SC2015/SC2016: padroes intencionais.)
# setup-mac.sh - setup do workshop "Orquestracao de Agentes com Claude" para macOS (Intel e Apple Silicon).
# Instala tudo na pasta do utilizador, sem admin e sem Homebrew obrigatorio.
#
# Uso (o URL exato esta no README, gerado a partir do repos.conf):
#   curl -fsSL <url>/setup-mac.sh | bash                    instala
#   curl -fsSL <url>/setup-mac.sh | bash -s -- --check      so verifica
#   bash <(curl -fsSL <url>/setup-mac.sh) --check           alternativa
#   bash ~/.workshop-claude/setup-mac.sh --check            depois da primeira vez
#
# Opcoes: --check  --doctor  --desinstalar  --sem-desktop  --sim  --substituir-statusline  --ajuda
#
# Todo o codigo esta dentro de main(), chamado na ultima linha: um download incompleto nao executa nada.
# As perguntas e os logins leem de /dev/tty, por isso "curl | bash" funciona.
# Os textos (pt-PT) vem de setup/messages.pt.json (o mesmo catalogo de docs/TROUBLESHOOTING.md).

# >>> WS-INJETADO >>>
# Na fonte este bloco esta vazio. tools/build-release.sh injeta aqui os valores do repos.conf,
# o SHA-256 do arquivo do kit, o pricing.json e as mensagens.
ws_injetado() { :; }
# <<< WS-INJETADO <<<

main() {
shopt -u patsub_replacement 2>/dev/null || true
umask 022

WS_TAB=$(printf '\t')
WS_CR=$(printf '\r')
WS_SCHEMA_HELPER='{"type":"object","properties":{"causa":{"type":"string"},"comandos":{"type":"array","items":{"type":"string"}}},"required":["causa","comandos"]}'
WS_PUBLIC_CAS='Google Trust Services|Let.s Encrypt|ISRG|DigiCert|Sectigo|COMODO|USERTrust|GlobalSign|Amazon|Starfield|Go Daddy|GoDaddy|Entrust|Microsoft|Cloudflare|Baltimore|IdenTrust|SSL.com|Certainly|ZeroSSL|Buypass|HARICA|Actalis|QuoVadis|Certum|Telia|SwissSign|Trustwave|Apple'

# ---------------------------------------------------------------- utilitarios puros
# Texto alinhado a N caracteres (conta caracteres e nao bytes, para os acentos).
ws_pad() { local LC_ALL=en_US.UTF-8 s=$1 w=$2 l; l=${#1}; [ "$l" -lt "$w" ] && printf '%s%*s' "$s" $((w - l)) '' || printf '%s' "$s"; }

ws_trim() { local s=$1; s=${s#"${s%%[![:space:]]*}"}; s=${s%"${s##*[![:space:]]}"}; printf '%s' "$s"; }

# Compara versoes: devolve 0 se $1 >= $2 (ignora sufixos como -beta ou " (Claude Code)").
ws_ver_ge() {
  local a b a1 a2 a3 a4 b1 b2 b3 b4 i x y
  a=$(printf '%s' "$1" | sed -E 's/^[^0-9]*//; s/[^0-9.].*$//')
  b=$(printf '%s' "$2" | sed -E 's/^[^0-9]*//; s/[^0-9.].*$//')
  IFS=. read -r a1 a2 a3 a4 _ <<EOF
$a
EOF
  IFS=. read -r b1 b2 b3 b4 _ <<EOF
$b
EOF
  for i in 1 2 3 4; do
    eval "x=\${a$i:-0}; y=\${b$i:-0}"
    if [ "$x" -gt "$y" ] 2>/dev/null; then return 0; fi
    if [ "$x" -lt "$y" ] 2>/dev/null; then return 1; fi
  done
  return 0
}

# Primeira versao numerica encontrada no texto (ex.: "gh version 2.102.0 (2026-..)" -> 2.102.0)
ws_ver_of() { printf '%s' "$1" | grep -Eo '[0-9]+\.[0-9]+(\.[0-9]+)?' | head -n 1; }

# Filtro de redacao (mesmas regras que installer/lib/redact.mjs; casos em tools/test/redact-cases.json).
ws_redact() {
  LC_ALL=C awk '
    BEGIN { n = split("REPO_TOKEN CLAUDE_CODE_OAUTH_TOKEN ANTHROPIC_API_KEY ANTHROPIC_AUTH_TOKEN GH_TOKEN GITHUB_TOKEN WS_REDACT_EXTRA", names, " ")
            for (i = 1; i <= n; i++) { v = ENVIRON[names[i]]; if (length(v) >= 4) lit[++m] = v } }
    { line = $0
      for (i = 1; i <= m; i++) { out = ""; while ((p = index(line, lit[i])) > 0) { out = out substr(line, 1, p - 1) "***"; line = substr(line, p + length(lit[i])) } line = out line }
      print line }' |
  LC_ALL=C sed -E \
    -e 's/sk-ant-[A-Za-z0-9_-]{4,}/sk-ant-***/g' \
    -e 's/github_pat_[A-Za-z0-9_]{10,}/github_pat_***/g' \
    -e 's/(gh[pousr]_)[A-Za-z0-9]{10,}/\1***/g' \
    -e "s/([Aa]uthorization[\"']?[[:blank:]]*[:=][[:blank:]]*)[^\"'${WS_CR}]+/\\1***/g" \
    -e 's/([Bb]earer[[:blank:]]+)[A-Za-z0-9._~+/=-]+/\1***/g' \
    -e "s#(://)[^/@[:space:]\"']+@#\\1***@#g" \
    -e "s/(([Tt][Oo][Kk][Ee][Nn]|[Ss][Ee][Cc][Rr][Ee][Tt]|[Pp][Aa][Ss][Ss][Ww][Oo][Rr][Dd]|[Pp][Aa][Ss][Ss][Ww][Dd]|[Aa][Pp][Ii][_-]?[Kk][Ee][Yy])[\"']?[[:blank:]]*[:=][[:blank:]]*[\"']?)[^\"'[:space:],&]+/\\1***/g"
}

# Partes de um URL de repositorio: define R_REPO R_HOST R_OWNER R_NAME
ws_repo_parts() {
  local u=${1%/}; u=${u%.git}
  R_REPO=$u
  local rest=${u#*://}
  R_HOST=${rest%%/*}; R_HOST=${R_HOST#*@}
  local path=${rest#*/}
  R_NAME=${path##*/}
  R_OWNER=${path%/*}
}

# Expande {repo} {host} {owner} {name} {version} {file} {path} num padrao.
ws_expand() { # padrao repo host owner name version file path
  local t=$1
  t=${t//"{repo}"/$2}; t=${t//"{host}"/$3}; t=${t//"{owner}"/$4}; t=${t//"{name}"/$5}
  t=${t//"{version}"/$6}; t=${t//"{file}"/$7}; t=${t//"{path}"/$8}
  printf '%s' "$t"
}

ws_release_url() { # workshop|memory ficheiro
  if [ "$1" = memory ]; then ws_repo_parts "$C_MEMORY_APP_REPO_URL"; local v=$C_MEMORY_APP_VERSION
  else ws_repo_parts "$C_WORKSHOP_REPO_URL"; local v=$C_WORKSHOP_VERSION; fi
  ws_expand "$C_RELEASE_DOWNLOAD_URL" "$R_REPO" "$R_HOST" "$R_OWNER" "$R_NAME" "$v" "$2" ""
}

ws_url_base() { # https://host:porta/caminho -> https://host:porta/
  local u=$1 scheme=${1%%://*} rest=${1#*://}
  [ "$scheme" = "$u" ] && { printf '%s' "$u"; return; }
  printf '%s://%s/' "$scheme" "${rest%%/*}"
}

# Le texto CHAVE=valor (repos.conf) e define C_CHAVE; o ambiente tem prioridade.
ws_conf_parse() {
  local line k v envv
  WS_CONF_KEYS=""
  while IFS= read -r line || [ -n "$line" ]; do
    line=${line%"$WS_CR"}
    case "$line" in ''|'#'*) continue ;; esac
    case "$line" in *=*) ;; *) continue ;; esac
    k=$(ws_trim "${line%%=*}"); v=$(ws_trim "${line#*=}")
    case "$k" in *[!A-Z0-9_]*|'') continue ;; esac
    envv=${!k:-}
    [ -n "$envv" ] && v=$envv
    printf -v "C_$k" '%s' "$v"
    WS_CONF_KEYS="$WS_CONF_KEYS $k"
  done
}

# ---------------------------------------------------------------- JS (node se houver, senao JXA)
ws_js() { # codigo-js args...  (o codigo define o corpo de main(A) e devolve texto)
  local code=$1 f; shift
  f="$WS_TMP/js-$RANDOM.js"
  if [ -n "${WS_NODE:-}" ] && [ -x "$WS_NODE" ]; then
    { printf '%s\n' 'var readText=function(p){return require("fs").readFileSync(p,"utf8");};'
      printf 'var main=function(A){\n%s\n};\n' "$code"
      printf '%s\n' 'var r=main(process.argv.slice(2)); if(r!==undefined&&r!==null) process.stdout.write(String(r));'
    } > "$f"
    "$WS_NODE" "$f" "$@" </dev/null
  else
    { printf '%s\n' 'ObjC.import("Foundation");' 'var readText=function(p){var s=$.NSString.stringWithContentsOfFileEncodingError(p,$.NSUTF8StringEncoding,null); return s.isNil()?"":ObjC.unwrap(s);};'
      printf 'var main=function(A){\n%s\n};\n' "$code"
      printf '%s\n' 'function run(argv){var r=main(argv); return (r===undefined||r===null)?"":String(r);}'
    } > "$f"
    osascript -l JavaScript "$f" "$@" </dev/null
  fi
}

# Mensagens: JSON -> atribuicoes M_... (mesmas regras que installer/lib/messages.mjs flattenToShell)
IFS= read -r -d '' WS_JS_MSGS <<'__WS_JS__' || true
var j=JSON.parse(readText(A[0])), out=[];
function q(v){return "'"+String(v).replace(/'/g,"'\\''")+"'";}
function s(k){return String(k).replace(/[^A-Za-z0-9]/g,"_");}
function walk(p,v){
  if(Object.prototype.toString.call(v)==="[object Array]"){out.push(p+"_n="+v.length); for(var i=0;i<v.length;i++) walk(p+"_"+i,v[i]);}
  else if(v&&typeof v==="object"){for(var k in v) if(v.hasOwnProperty(k)) walk(p+"_"+s(k),v[k]);}
  else out.push(p+"="+q(v));
}
for(var k in j){ if(k==="nota"||k==="versao") continue; walk("M_"+s(k), j[k]); }
return out.join("\n")+"\n";
__WS_JS__

# Resultado de "claude -p --output-format json": resposta, erro, custo (pricing.json, por modelUsage)
# e, se houver, structured_output {causa, comandos[]}. Mesmas contas que installer/lib/custo.mjs.
IFS= read -r -d '' WS_JS_RESULTADO <<'__WS_JS__' || true
var out=[], r, pr;
function line(k,v){out.push(k+"\t"+String(v===undefined||v===null?"":v).replace(/[\t\r\n]+/g," "));}
try { r=JSON.parse(readText(A[0])); } catch(e) { line("json","0"); return out.join("\n")+"\n"; }
try { pr=JSON.parse(readText(A[1])); } catch(e) { pr=null; }
line("json","1"); line("erro", r.is_error?"1":"0"); line("subtipo", r.subtype||"");
line("resposta", String(r.result||"").slice(0,300));
function res(id){
  if(!pr||!id) return null;
  var m=String(id).toLowerCase().replace(/\[.*\]$/,"");
  if(pr.aliases&&pr.aliases[m]) return pr.aliases[m];
  var ks=Object.keys(pr.modelos).sort(function(a,b){return b.length-a.length;});
  for(var i=0;i<ks.length;i++){var k=ks[i]; if(m===k||m.indexOf(k+"-")===0||m.indexOf(k+"@")===0) return k;}
  return null;
}
var mu=r.modelUsage||{}, tot=0, unk=false;
for(var id in mu){
  if(!mu.hasOwnProperty(id)) continue;
  var u=mu[id]||{}, k=res(id);
  if(!k){unk=true; line("desconhecido",id); continue;}
  var p=pr.modelos[k], it=u.inputTokens||0, cr=u.cacheReadInputTokens||0, cw=u.cacheCreationInputTokens||0, ot=u.outputTokens||0;
  if(p.prompt_longo&&(it+cr+cw)>p.prompt_longo.acima_de_tokens) p=p.prompt_longo;
  tot+=(it*p.input+ot*p.output+cw*p.cache_write_5m+cr*p.cache_read)/1e6;
}
if(unk||!pr){ line("usd",""); line("usd_texto","US$ ?"); }
else { line("usd",tot); line("usd_texto","US$ "+tot.toFixed(tot<0.01?4:2).replace(".",",")); }
var so=r.structured_output;
if(!so&&typeof r.result==="string"){ try{ var mm=r.result.match(/\{[\s\S]*\}/); if(mm) so=JSON.parse(mm[0]); }catch(e){} }
if(so&&typeof so==="object"){ line("causa", so.causa||""); var cs=so.comandos||[]; for(var i=0;i<cs.length;i++) line("cmd", cs[i]); }
return out.join("\n")+"\n";
__WS_JS__

# ---------------------------------------------------------------- mensagens
ws_m() { local n="M_ui_$1"; ws_fill "${!n:-$1}"; }

ws_fill() { # texto CHAVE=valor...
  local t=$1 kv k v n; shift
  for kv in "$@"; do k=${kv%%=*}; v=${kv#*=}; t=${t//"{$k}"/$v}; done
  case "$t" in *'{'[A-Z]*) for k in $WS_FILL_KEYS; do n="D_$k"; t=${t//"{$k}"/${!n}}; done ;; esac
  printf '%s' "$t"
}

ws_msg() { local key=$1; shift; ws_fill "$(ws_m "$key")" "$@"; }

ws_err_field() { # codigo campo
  local c=${1//-/_} n; n="M_erros_${c}_$2"; printf '%s' "${!n:-}"
}

ws_err_list() { # codigo campo (fazer|mac) -> uma linha por item
  local c=${1//-/_} n i cnt; n="M_erros_${c}_$2_n"; cnt=${!n:-0}
  i=0; while [ "$i" -lt "$cnt" ]; do n="M_erros_${c}_$2_$i"; ws_fill "${!n}"; printf '\n'; i=$((i + 1)); done
}

# ---------------------------------------------------------------- saida e log
ws_log() { printf '%s %s\n' "$(date '+%H:%M:%S')" "$*" | ws_redact >> "$WS_LOG" 2>/dev/null || true; }
ws_say() { printf '%s\n' "$*"; printf '%s\n' "$*" | ws_redact >> "$WS_LOG" 2>/dev/null || true; }
ws_bold() { if [ "$WS_COLOR" = 1 ]; then printf '\033[1m%s\033[0m' "$1"; else printf '%s' "$1"; fi; }
ws_dim() { if [ "$WS_COLOR" = 1 ]; then printf '\033[2m%s\033[0m' "$1"; else printf '%s' "$1"; fi; }

ws_has_tty() { [ -r /dev/tty ] && [ -w /dev/tty ] && { : </dev/tty; } 2>/dev/null; }

# Pergunta sim/nao. $1 texto, $2 defeito (s|n), $3 "nunca-sim" para nao aceitar o --sim.
ws_ask() {
  local q=$1 def=${2:-n} nosim=${3:-} ans hint
  if [ "$def" = s ]; then hint=$(ws_m sn); else hint=$(ws_m ns); fi
  if [ "$WS_SIM" = 1 ] && [ "$nosim" != nunca-sim ]; then ws_say "  ? $q $hint s (--sim)"; return 0; fi
  if [ "$WS_SIM" = 1 ]; then ws_say "  ? $q $hint n (--sim)"; return 1; fi
  if ! ws_has_tty; then ws_say "  ? $q $hint n · $(ws_m sem_tty)"; return 1; fi
  printf '  ? %s %s ' "$q" "$hint" > /dev/tty
  IFS= read -r ans < /dev/tty || ans=""
  ws_log "pergunta: $q -> ${ans:-<enter>}"
  case "$ans" in
    [SsYy]*) return 0 ;;
    [Nn]*) return 1 ;;
    '') [ "$def" = s ] && return 0; return 1 ;;
    *) return 1 ;;
  esac
}

# Corre um comando com a saida (stdout+stderr) no log do passo. Devolve o codigo de saida.
ws_run() {
  ws_log "\$ $*"
  "$@" </dev/null >> "$WS_STEP_LOG" 2>&1
  local rc=$?
  ws_log "  -> codigo $rc"
  return $rc
}

ws_flush_step_log() {
  [ -s "$WS_STEP_LOG" ] || return 0
  { printf -- '--- saida dos comandos (passo %s) ---\n' "$WS_CUR"; cat "$WS_STEP_LOG"; printf -- '--- fim ---\n'; } | ws_redact >> "$WS_LOG" 2>/dev/null || true
}

# ---------------------------------------------------------------- rede e ficheiros
ws_sha256() {
  local h
  h=$(shasum -a 256 "$1" 2>/dev/null | awk '{print $1}')
  [ -n "$h" ] || h=$(openssl dgst -sha256 "$1" 2>/dev/null | awk '{print $NF}')
  printf '%s' "$h" | tr 'A-F' 'a-f'
}

# Procura o hash de um ficheiro num SHA256SUMS ("<hash>  nome" ou "<hash> *nome").
ws_sum_for() { awk -v f="$2" '{n=$2; sub(/^\*/,"",n); if (n==f) {print tolower($1); exit}}' "$1" 2>/dev/null; }

# Download para um ficheiro (via .part). $3=auth envia o REPO_TOKEN so ao servidor do repositorio.
# Define WS_DL_HTTP (codigo HTTP) e WS_DL_RC (codigo do curl).
ws_dl() {
  local url=$1 out=$2 auth=${3:-} part="$2.part" host
  rm -f "$part"
  ws_log "download: $url"
  host=${url#*://}; host=${host%%/*}
  if [ "$auth" = auth ] && [ -n "${REPO_TOKEN:-}" ] && { [ "$host" = "$D_REPO_HOST" ] || [ "$host" = "${D_MEMORY_HOST:-$D_REPO_HOST}" ]; }; then
    WS_DL_HTTP=$(printf 'header = "Authorization: token %s"\n' "$REPO_TOKEN" |
      curl -fsSL --retry 2 --connect-timeout 20 -A "$WS_UA" -w '%{http_code}' -K - -o "$part" "$url" 2>>"$WS_STEP_LOG")
  else
    WS_DL_HTTP=$(curl -fsSL --retry 2 --connect-timeout 20 -A "$WS_UA" -w '%{http_code}' -o "$part" "$url" 2>>"$WS_STEP_LOG" </dev/null)
  fi
  WS_DL_RC=$?
  ws_log "  -> curl $WS_DL_RC, HTTP $WS_DL_HTTP"
  if [ "$WS_DL_RC" -eq 0 ] && [ -s "$part" ]; then mv -f "$part" "$out"; return 0; fi
  rm -f "$part"
  [ "$WS_DL_RC" -eq 0 ] && WS_DL_RC=1
  return "$WS_DL_RC"
}

# Codigo de erro de rede a partir do codigo do curl / HTTP.
ws_net_code() { # rc http
  case "$2" in 407) echo E-NET-03; return ;; esac
  case "$1" in
    6) echo E-NET-02 ;;
    5|7|28|52|55|56) echo E-NET-01 ;;
    35|51|53|54|58|59|60|77|83|90|91) echo E-NET-04 ;;
    *) echo E-NET-07 ;;
  esac
}

# ---------------------------------------------------------------- estado dos passos
ws_st() { local n="ST_$1"; printf '%s' "${!n:-}"; }
ws_set() { printf -v "$1_$2" '%s' "$3"; }   # ws_set ST 3 falhou

ws_warn() { # codigo [detalhe]
  local n="SW_$WS_CUR" cur
  cur=${!n:-}
  printf -v "$n" '%s%s|%s\n' "$cur" "$1" "${2:-}"
  ws_log "aviso $1 ${2:-}"
}
ws_fail() { # codigo [detalhe]
  printf -v "SF_$WS_CUR" '%s|%s' "$1" "${2:-}"
  ws_log "falha $1 ${2:-}"
}
ws_detail() { printf -v "SD_$WS_CUR" '%s' "$*"; }
ws_note() { local n="SN_$WS_CUR" cur; cur=${!n:-}; printf -v "$n" '%s%s\n' "$cur" "$*"; }

ws_sym() {
  case "$1" in
    feito|ok) printf '✅' ;; ja) printf '⏭️ ' ;; aviso) printf '⚠️ ' ;; falhou|falta) printf '❌' ;;
    naoexec) printf '⛔' ;; saltado) printf '➖' ;; *) printf '•' ;;
  esac
}
ws_state_label() {
  case "$1" in
    feito) ws_m estado_feito ;; ja) ws_m estado_ja ;; aviso) ws_m estado_aviso ;; falhou) ws_m estado_falhou ;;
    naoexec) ws_m estado_naoexec ;; saltado) ws_m estado_saltado ;; ok) ws_m estado_ok_check ;; falta) ws_m estado_falta_check ;;
  esac
}

ws_print_code() { # codigo detalhe indent [prefixo do titulo]
  local c=$1 d=$2 ind=$3 pre=${4:-} line
  ws_say "${ind}${pre}$(ws_bold "$(ws_fill "$(ws_err_field "$c" titulo)")")"
  ws_say "${ind}$(ws_m porque): $(ws_fill "$(ws_err_field "$c" causa)")${d:+ ($d)}"
  ws_say "${ind}$(ws_m fazer):"
  while IFS= read -r line; do [ -n "$line" ] && ws_say "${ind}  - $line"; done <<EOF
$(ws_err_list "$c" fazer)
EOF
  while IFS= read -r line; do [ -n "$line" ] && ws_say "${ind}    \$ $line"; done <<EOF
$(ws_err_list "$c" mac)
EOF
  ws_say "${ind}$(ws_dim "$(ws_msg codigo CODIGO="$c")")"
}

ws_print_result() {
  local n=$1 st d w f line
  st=$(ws_st "$n"); d="SD_$n"; d=${!d:-}; w="SW_$n"; w=${!w:-}; f="SF_$n"; f=${!f:-}
  ws_say "  $(ws_sym "$st") $(ws_bold "$(ws_state_label "$st")")${d:+ · $d}"
  line="SN_$n"
  if [ -n "${!line:-}" ]; then while IFS= read -r line; do [ -n "$line" ] && ws_say "     $line"; done <<EOF
${!line}
EOF
  fi
  if [ -n "$f" ] && { [ "$st" = falhou ] || [ "$st" = falta ]; }; then ws_print_code "${f%%|*}" "${f#*|}" "     "; fi
  [ -z "$d" ] && [ -n "$f" ] && ws_set SD "$n" "$(ws_fill "$(ws_err_field "${f%%|*}" titulo)") (${f%%|*})"
  if [ -n "$w" ]; then
    while IFS= read -r line; do
      [ -n "$line" ] || continue
      ws_print_code "${line%%|*}" "${line#*|}" "     " "⚠️  "
    done <<EOF
$w
EOF
  fi
}

# Executa um passo: cabecalho, dependencias, detetar -> (instalar) -> resultado.
ws_step() { # numero deps...
  local n=$1 d; shift
  WS_CUR=$n
  WS_STEP_LOG="$WS_TMP/passo-$n.log"; : > "$WS_STEP_LOG"
  ws_set SD "$n" ""; ws_set SW "$n" ""; ws_set SF "$n" ""; ws_set SN "$n" ""
  local title="M_passos_$n"; title=${!title}
  ws_say ""
  ws_say "$(ws_bold "$(ws_msg passo N="$n" TITULO="$title")")"
  ws_log "=== passo $n: $title (modo $WS_MODE)"
  for d in "$@"; do
    case "$(ws_st "$d")" in falhou|naoexec|falta)
      ws_set ST "$n" naoexec; ws_detail "$(ws_msg dep_falhou N="$d")"; ws_print_result "$n"; return 0 ;;
    esac
  done
  if [ "$n" = 11 ] && [ "$WS_SEM_DESKTOP" = 1 ]; then
    ws_set ST "$n" saltado; ws_detail "--sem-desktop"; ws_print_result "$n"; return 0
  fi
  local rc
  if "ws_s${n}_detect"; then
    rc=0
  else
    rc=1
  fi
  if [ "$rc" -eq 0 ]; then
    local w="SW_$n"
    if [ -n "${!w}" ]; then ws_set ST "$n" aviso
    elif [ "$WS_MODE" = install ] && [ "$n" != 0 ]; then ws_set ST "$n" ja
    elif [ "$WS_MODE" = install ]; then ws_set ST "$n" feito
    else ws_set ST "$n" ok; fi
  elif [ "$WS_MODE" != install ]; then
    local f="SF_$n"; [ -n "${!f}" ] || ws_fail "$(ws_default_code "$n")" ""
    ws_is_missing_code "${!f%%|*}" && ws_fail E-SETUP-01 "${!f%%|*}"
    if ws_nonblocking "$n"; then ws_set ST "$n" aviso; ws_warn "${!f%%|*}" "${!f#*|}"; ws_set SF "$n" ""
    else ws_set ST "$n" falta; fi
  else
    ws_set SW "$n" ""
    ws_set SF "$n" ""
    if "ws_s${n}_install"; then
      local w="SW_$n"; if [ -n "${!w}" ]; then ws_set ST "$n" aviso; else ws_set ST "$n" feito; fi
    else
      local f="SF_$n"; [ -n "${!f}" ] || ws_fail "$(ws_default_code "$n")" ""
      if ws_nonblocking "$n"; then
        ws_set ST "$n" aviso; ws_warn "${!f%%|*}" "${!f#*|}"; ws_set SF "$n" ""
      else
        ws_set ST "$n" falhou
      fi
    fi
  fi
  ws_flush_step_log
  ws_print_result "$n"
  if [ "$(ws_st "$n")" = falhou ] && [ "$WS_MODE" = install ] && [ -z "${WS_RETRY:-}" ]; then
    ws_helper_offer "$n" && { WS_RETRY=1; ws_say "  $(ws_msg helper_repetir N="$n")"; ws_step "$n" "$@"; WS_RETRY=""; }
  fi
  return 0
}

# Em --check, "nao instalado" mostra-se como E-SETUP-01 (correr o setup) e nao como uma falha de instalacao.
ws_is_missing_code() {
  case "$1" in E-CC-01|E-NODE-01|E-UV-01|E-GH-01|E-GIT-02|E-MCP-01|E-KIT-01|E-KIT-03|E-DEMO-01|E-MEM-01|E-MEM-03|E-DESK-02) return 0 ;; esac
  return 1
}
ws_nonblocking() { case "$1" in 10|11) return 0 ;; *) return 1 ;; esac; }
ws_default_code() {
  case "$1" in 1) echo E-GIT-01 ;; 2) echo E-CC-01 ;; 3) echo E-AUTH-01 ;; 4) echo E-NODE-01 ;; 5) echo E-UV-01 ;;
    6) echo E-GH-01 ;; 7) echo E-MCP-01 ;; 8) echo E-KIT-03 ;; 9) echo E-DEMO-01 ;; 10) echo E-MEM-03 ;; 11) echo E-DESK-02 ;; *) echo E-SMOKE-01 ;; esac
}

# ---------------------------------------------------------------- comandos
ws_path_setup() {
  local d
  for d in "$WS_HOME/node/bin" "$WS_HOME/bin" "$HOME/.local/bin"; do
    case ":$PATH:" in *":$d:"*) ;; *) PATH="$d:$PATH" ;; esac
  done
  export PATH
  hash -r 2>/dev/null || true
}

ws_claude() { command -v claude 2>/dev/null || { [ -x "$HOME/.local/bin/claude" ] && printf '%s' "$HOME/.local/bin/claude"; }; }

# Bloco no perfil do shell que poe no PATH as pastas do workshop (removido pelo --desinstalar).
ws_profile_update() {
  [ "$WS_MODE" = install ] || return 0
  local files f dirs d block tmp
  dirs='"$HOME/.local/bin" "$HOME/.workshop-claude/bin"'
  if [ -n "${WS_NODE_BIN_DIR:-}" ]; then
    case "$WS_NODE_BIN_DIR" in "$HOME"/*) d="\"\$HOME${WS_NODE_BIN_DIR#"$HOME"}\"" ;; *) d="\"$WS_NODE_BIN_DIR\"" ;; esac
    dirs="$dirs $d"
  fi
  block="# >>> workshop-claude >>>
# Adicionado pelo setup do workshop. Remove-se com: bash ~/.workshop-claude/setup-mac.sh --desinstalar
for _ws_d in $dirs; do
  case \":\$PATH:\" in *\":\$_ws_d:\"*) ;; *) [ -d \"\$_ws_d\" ] && PATH=\"\$_ws_d:\$PATH\" ;; esac
done
unset _ws_d
export PATH
# <<< workshop-claude <<<"
  files=("$HOME/.zshrc" "$HOME/.zprofile")
  { [ -f "$HOME/.bash_profile" ] || case "${SHELL:-}" in */bash) true ;; *) false ;; esac; } && files+=("$HOME/.bash_profile")
  for f in "${files[@]}"; do
    tmp="$f.ws-tmp"
    if [ -f "$f" ]; then ws_profile_strip "$f" > "$tmp" || continue; else : > "$tmp"; fi
    printf '\n%s\n' "$block" >> "$tmp"
    if [ -f "$f" ] && cmp -s "$f" "$tmp"; then rm -f "$tmp"; else mv -f "$tmp" "$f"; fi
    ws_registar perfil "$f" "$f"
  done
}

ws_profile_strip() { # remove o bloco do workshop (e a linha vazia antes dele)
  awk 'BEGIN{skip=0; held=0}
       /^# >>> workshop-claude >>>/ {skip=1; held=0; next}
       /^# <<< workshop-claude <<</ {skip=0; next}
       skip {next}
       /^$/ { if (held) print ""; held=1; next }
       { if (held) print ""; held=0; print }
       END{}' "$1"
}

# Regista no manifest (via install-user.mjs) ou guarda para registar quando houver Node e kit.
ws_registar() { # tipo nome [caminho] [valor] [anterior]
  printf '%s\t%s\t%s\t%s\t%s\n' "$1" "$2" "${3:-}" "${4:-}" "${5:-}" >> "$WS_HOME/extras-pendentes.tsv"
  ws_registar_flush
}
ws_registar_flush() {
  local p="$WS_HOME/extras-pendentes.tsv" t n c v a
  [ -s "$p" ] || return 0
  [ -n "${WS_NODE:-}" ] && [ -n "${KIT_SRC:-}" ] && [ -f "$KIT_SRC/installer/install-user.mjs" ] || return 0
  while IFS="$WS_TAB" read -r t n c v a; do
    [ -n "$t" ] || continue
    "$WS_NODE" "$KIT_SRC/installer/install-user.mjs" registar --tipo "$t" --nome "$n" ${c:+--caminho "$c"} ${v:+--valor "$v"} ${a:+--anterior "$a"} >/dev/null 2>>"$WS_LOG" || return 0
  done < "$p"
  rm -f "$p"
}

# ---------------------------------------------------------------- kit
ws_kit_ensure() {
  [ -n "${KIT_SRC:-}" ] && [ -f "$KIT_SRC/installer/install-user.mjs" ] && return 0
  if [ "$WS_DEV" = 1 ]; then KIT_SRC=$WS_DEV_ROOT; return 0; fi
  local dest="$WS_HOME/kit-src/$C_WORKSHOP_VERSION"
  if [ -f "$dest/.ws-kit-ok" ]; then KIT_SRC=$dest; return 0; fi
  [ "$WS_MODE" = install ] || return 1
  local name="workshop-kit-$C_WORKSHOP_VERSION.tar.gz" url tmpd sum
  url=$(ws_release_url workshop "$name")
  tmpd="$WS_TMP/kit"; rm -rf "$tmpd"; mkdir -p "$tmpd/x"
  ws_say "  $(ws_msg a_descarregar O_QUE="$name")"
  if ws_dl "$url" "$tmpd/$name" auth; then
    sum=$(ws_sha256 "$tmpd/$name")
    if [ -n "$WS_INJ_KIT_SHA256" ] && [ "$sum" != "$WS_INJ_KIT_SHA256" ]; then
      ws_log "SHA-256 do kit nao confere: $sum != $WS_INJ_KIT_SHA256"
      ws_warn E-KIT-02 "$name"
    elif tar -xzf "$tmpd/$name" -C "$tmpd/x" 2>>"$WS_STEP_LOG" && [ -d "$tmpd/x/workshop-kit-$C_WORKSHOP_VERSION" ]; then
      rm -rf "$dest"; mkdir -p "$(dirname "$dest")"
      mv "$tmpd/x/workshop-kit-$C_WORKSHOP_VERSION" "$dest" && date > "$dest/.ws-kit-ok"
      KIT_SRC=$dest; return 0
    fi
  fi
  # Recurso: git clone da tag (o REPO_TOKEN, se existir, vai por variaveis de configuracao do git).
  command -v git >/dev/null 2>&1 && xcode_ok || return 1
  rm -rf "$tmpd/clone"
  ws_log "recurso: git clone --depth 1 --branch $C_WORKSHOP_VERSION $C_WORKSHOP_REPO_URL"
  if [ -n "${REPO_TOKEN:-}" ]; then
    GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=http.extraHeader GIT_CONFIG_VALUE_0="Authorization: token $REPO_TOKEN" GIT_TERMINAL_PROMPT=0 \
      git clone -q --depth 1 --branch "$C_WORKSHOP_VERSION" "$C_WORKSHOP_REPO_URL" "$tmpd/clone" </dev/null >>"$WS_STEP_LOG" 2>&1
  else
    GIT_TERMINAL_PROMPT=0 git clone -q --depth 1 --branch "$C_WORKSHOP_VERSION" "$C_WORKSHOP_REPO_URL" "$tmpd/clone" </dev/null >>"$WS_STEP_LOG" 2>&1
  fi || return 1
  rm -rf "$tmpd/clone/.git" "$dest"; mkdir -p "$(dirname "$dest")"
  mv "$tmpd/clone" "$dest" && date > "$dest/.ws-kit-ok" && KIT_SRC=$dest
}

xcode_ok() {
  case "$(command -v git 2>/dev/null)" in /usr/bin/git) xcode-select -p >/dev/null 2>&1 ;; '') return 1 ;; *) return 0 ;; esac
}

# ================================================================= PASSO 0 - ambiente
ws_s0_detect() {
  local ver arch extra f
  ver=$(sw_vers -productVersion 2>/dev/null)
  if [ "$(sysctl -n hw.optional.arm64 2>/dev/null)" = 1 ]; then arch=arm64; else arch=x64; fi
  WS_ARCH=$arch
  [ "$(sysctl -n sysctl.proc_translated 2>/dev/null)" = 1 ] && extra=" (Rosetta)"
  WS_OS="macOS $ver $arch${extra:-}"
  ws_note "$(ws_msg s0_so SO="$WS_OS")"
  ws_ver_ge "$ver" 13 || ws_warn E-SO-04 "macOS $ver"

  for f in "/Library/Application Support/ClaudeCode/managed-settings.json" "/Library/Application Support/ClaudeCode/managed-settings.d" "/Library/Managed Preferences/com.anthropic.claudecode.plist"; do
    [ -e "$f" ] && ws_warn E-CFG-01 "$f"
  done
  [ -n "${ANTHROPIC_API_KEY:-}" ] && ws_warn E-CFG-02 "ANTHROPIC_API_KEY"
  [ -n "${ANTHROPIC_BASE_URL:-}" ] && ws_warn E-CFG-03 "ANTHROPIC_BASE_URL"
  { [ -n "${CLAUDE_CODE_USE_BEDROCK:-}" ] || [ -n "${CLAUDE_CODE_USE_VERTEX:-}" ]; } && ws_warn E-CFG-04 "CLAUDE_CODE_USE_BEDROCK/VERTEX"
  local b; for b in $(ws_uv_python_blockers); do ws_warn E-CFG-07 "$b=${!b}"; done

  local kb; kb=$(df -k "$HOME" 2>/dev/null | awk 'NR==2{print $4}')
  if [ -n "$kb" ]; then ws_note "$(ws_msg s0_disco GB="$((kb / 1048576))")"; [ "$kb" -lt 3145728 ] && ws_warn E-SO-06 "$((kb / 1048576)) GB"; fi
  case "$(cd "$HOME" 2>/dev/null && pwd -P)" in *OneDrive*|*CloudStorage*) ws_warn E-SO-03 "$HOME" ;; esac
  [ -d "$WS_PROJ" ] && case "$(cd "$WS_PROJ" && pwd -P)" in *OneDrive*|*CloudStorage*) ws_warn E-SO-03 "$WS_PROJ" ;; esac

  ws_detect_proxy
  ws_detect_tls
  ws_check_network
  ws_detail "$WS_OS · $(ws_msg s0_rede_ok OK="$WS_NET_OK" TOTAL="$WS_NET_TOTAL")"
  return 0
}
ws_s0_install() { ws_s0_detect; }

ws_detect_proxy() {
  WS_PROXY=""
  local p=${HTTPS_PROXY:-${https_proxy:-}} out en host port pac
  if [ -n "$p" ]; then WS_PROXY=$p; ws_note "$(ws_msg s0_proxy_sistema PROXY="$p (HTTPS_PROXY)")"; return; fi
  out=$(scutil --proxy 2>/dev/null)
  en=$(printf '%s\n' "$out" | awk -F' : ' '/HTTPSEnable/{print $2}' | tr -d ' ')
  host=$(printf '%s\n' "$out" | awk -F' : ' '/HTTPSProxy/{print $2}' | tr -d ' ')
  port=$(printf '%s\n' "$out" | awk -F' : ' '/HTTPSPort/{print $2}' | tr -d ' ')
  if [ "$en" = 1 ] && [ -n "$host" ]; then
    WS_PROXY="http://$host:${port:-8080}"
    export HTTPS_PROXY="$WS_PROXY" https_proxy="$WS_PROXY"
    export NO_PROXY="localhost,127.0.0.1${NO_PROXY:+,$NO_PROXY}"
    ws_note "$(ws_msg s0_proxy_sistema PROXY="$WS_PROXY")"
    return
  fi
  pac=$(printf '%s\n' "$out" | awk -F' : ' '/ProxyAutoConfigURLString/{print $2}' | tr -d ' ')
  if [ "$(printf '%s\n' "$out" | awk -F' : ' '/ProxyAutoConfigEnable/{print $2}' | tr -d ' ')" = 1 ] && [ -n "$pac" ]; then
    WS_PAC=$pac; ws_note "$(ws_msg s0_proxy_pac PAC="$pac")"; return
  fi
  ws_note "$(ws_m s0_sem_proxy)"
}

# Variaveis que impedem o uv de usar o Python gerido (a app Memoria precisa dele).
ws_uv_python_blockers() {
  case "$(printf '%s' "${UV_PYTHON_DOWNLOADS:-}" | tr '[:upper:]' '[:lower:]')" in never|manual) echo UV_PYTHON_DOWNLOADS ;; esac
  case "$(printf '%s' "${UV_NO_MANAGED_PYTHON:-}" | tr '[:upper:]' '[:lower:]')" in ''|0|false|no|off) ;; *) echo UV_NO_MANAGED_PYTHON ;; esac
  case "$(printf '%s' "${UV_PYTHON_PREFERENCE:-}" | tr '[:upper:]' '[:lower:]')" in only-system) echo UV_PYTHON_PREFERENCE ;; esac
}

ws_is_public_ca() { printf '%s' "$1" | grep -Eqi "$WS_PUBLIC_CAS"; }

ws_detect_tls() {
  local v rc issuer
  WS_CA_PEM=""
  v=$(curl -sv --connect-timeout 10 -m 20 -o /dev/null "https://api.anthropic.com/" 2>&1 </dev/null); rc=$?
  if [ "$rc" = 60 ] || [ "$rc" = 35 ]; then
    # o curl do macOS nao usa o Keychain por defeito; com secure-transport usa (e aceita a CA da empresa)
    if CURL_SSL_BACKEND=secure-transport curl -s --connect-timeout 10 -m 20 -o /dev/null "https://api.anthropic.com/" </dev/null 2>/dev/null; then
      export CURL_SSL_BACKEND=secure-transport
      v=$(curl -sv --connect-timeout 10 -m 20 -o /dev/null "https://api.anthropic.com/" 2>&1 </dev/null)
      [ -n "$v" ] && issuer="(certificado nao publico; o curl so funciona com o Keychain)"
    fi
  fi
  issuer=$(printf '%s\n' "$v" | sed -n 's/^\*[[:space:]]*issuer:[[:space:]]*//p' | head -n 1)${issuer:+ $issuer}
  [ -n "${WS_FORCAR_EMISSOR:-}" ] && issuer=$WS_FORCAR_EMISSOR   # so para testes
  [ -n "$issuer" ] || { ws_log "sem emissor (curl $rc)"; return 0; }
  WS_TLS_ISSUER=$issuer
  if ws_is_public_ca "$issuer"; then ws_note "$(ws_msg s0_tls_ok EMISSOR="$issuer")"; return 0; fi
  local pem="$WS_HOME/ca.pem" tmp="$WS_HOME/ca.pem.tmp" kc
  : > "$tmp"
  for kc in /Library/Keychains/System.keychain "$HOME/Library/Keychains/login.keychain-db"; do
    [ -f "$kc" ] && security find-certificate -a -p "$kc" >> "$tmp" 2>/dev/null
  done
  if [ -s "$tmp" ]; then mv -f "$tmp" "$pem"; else rm -f "$tmp"; fi
  if [ -s "$pem" ]; then
    WS_CA_PEM=$pem
    export NODE_EXTRA_CA_CERTS="$pem" UV_SYSTEM_CERTS=true
    if [ "$rc" = 60 ] && [ -f /etc/ssl/cert.pem ]; then
      cat /etc/ssl/cert.pem "$pem" > "$WS_HOME/ca-bundle.pem"
      export CURL_CA_BUNDLE="$WS_HOME/ca-bundle.pem" GIT_SSL_CAINFO="$WS_HOME/ca-bundle.pem"
    fi
  fi
  ws_note "$(ws_msg s0_tls_corp EMISSOR="$issuer" CA="$pem")"
  ws_warn E-NET-04 "$issuer"
}

ws_check_network() {
  local hosts h i=0 dir="$WS_TMP/rede" base fails="" rc code
  mkdir -p "$dir"
  hosts=""
  for h in $C_NET_CHECK_HOSTS "$D_REPO_HOST" "$D_MEMORY_HOST"; do
    [ -n "$h" ] || continue
    case " $hosts " in *" https://$h/ "*) ;; *) hosts="$hosts https://$h/" ;; esac
  done
  base=$(ws_url_base "$D_KIT_URL_MAC")
  case " $hosts " in *" $base "*) ;; *) hosts="$hosts $base" ;; esac
  WS_NET_TOTAL=0
  for h in $hosts; do WS_NET_TOTAL=$((WS_NET_TOTAL + 1)); done
  ws_say "  $(ws_msg a_verificar_rede N="$WS_NET_TOTAL")"
  for h in $hosts; do
    i=$((i + 1))
    ( code=$(curl -sS -o /dev/null --connect-timeout 8 -m 12 -A "$WS_UA" -w '%{http_code}' "$h" 2>"$dir/$i.err" </dev/null); printf '%s %s %s\n' "$?" "$code" "$h" > "$dir/$i.res" ) &
  done
  wait
  WS_NET_OK=0; WS_NET_API_OK=1
  i=0
  for h in $hosts; do
    i=$((i + 1))
    read -r rc code _ < "$dir/$i.res" 2>/dev/null || { rc=99; code=000; }
    ws_log "rede: $h -> curl $rc HTTP $code $(tr '\n' ' ' < "$dir/$i.err" 2>/dev/null)"
    if [ "$rc" = 0 ] && [ "$code" != 407 ]; then WS_NET_OK=$((WS_NET_OK + 1)); continue; fi
    fails="$fails ${h#https://}"; fails=${fails%/}
    case "$h" in *api.anthropic.com*) WS_NET_API_OK=0 ;; esac
    ws_net_code "$rc" "$code" >> "$dir/codes"
  done
  if [ -n "$fails" ]; then
    ws_note "$(ws_msg s0_rede_falha LISTA="$(ws_trim "$fails")")"
    [ "$WS_NET_API_OK" = 0 ] && ws_warn E-NET-05 "api.anthropic.com"
    local c; while IFS= read -r c; do [ -n "$c" ] && ws_warn "$c" "$(ws_trim "$fails")"; done < <(sort -u "$dir/codes")
  fi
}

# ================================================================= PASSO 1 - git
ws_s1_detect() {
  local g v
  g=$(command -v git 2>/dev/null)
  if [ "$g" = /usr/bin/git ] || [ -z "$g" ]; then
    xcode-select -p >/dev/null 2>&1 || { ws_fail E-GIT-01 "xcode-select -p"; return 1; }
  fi
  v=$(git --version 2>>"$WS_STEP_LOG" </dev/null) || { ws_fail E-GIT-01 "git --version"; return 1; }
  WS_GIT_VER=$(ws_ver_of "$v")
  ws_detail "$(ws_msg s1_ja VERSAO="$WS_GIT_VER")"
  return 0
}
ws_s1_install() {
  ws_fail E-GIT-01 "xcode-select -p"
  if ws_has_tty && [ "$WS_SIM" != 1 ] && ws_ask "$(ws_m s1_pergunta)" s; then
    xcode-select --install >>"$WS_STEP_LOG" 2>&1 || true
  fi
  return 1
}

# ================================================================= PASSO 2 - Claude Code
ws_s2_detect() {
  local c v
  c=$(ws_claude) || c=""
  [ -n "$c" ] || return 1
  v=$("$c" --version 2>>"$WS_STEP_LOG" </dev/null) || return 1
  WS_CLAUDE=$c; WS_CLAUDE_VER=$(ws_ver_of "$v")
  if ! ws_ver_ge "$WS_CLAUDE_VER" "$C_CLAUDE_CODE_MIN_VERSION"; then
    [ "$WS_MODE" = install ] && return 1
    ws_fail E-CC-03 "$WS_CLAUDE_VER < $C_CLAUDE_CODE_MIN_VERSION"; return 1
  fi
  ws_detail "$(ws_msg s2_ja VERSAO="$WS_CLAUDE_VER")"
  return 0
}
ws_s2_install() {
  local f="$WS_TMP/claude-install.sh" v
  ws_say "  $(ws_m a_instalar)"
  if ! ws_dl "$C_CLAUDE_INSTALL_SH_URL" "$f"; then ws_fail "$(ws_net_code "$WS_DL_RC" "$WS_DL_HTTP")" "$C_CLAUDE_INSTALL_SH_URL"; return 1; fi
  ws_run bash "$f" "$C_CLAUDE_CODE_VERSION" || { ws_fail E-CC-01 "install.sh"; return 1; }
  ws_path_setup
  WS_CLAUDE="$HOME/.local/bin/claude"
  [ -x "$WS_CLAUDE" ] || { ws_fail E-CC-01 "$WS_CLAUDE"; return 1; }
  v=$("$WS_CLAUDE" --version 2>>"$WS_STEP_LOG" </dev/null) || { ws_fail E-PERM-02 "claude --version"; return 1; }
  WS_CLAUDE_VER=$(ws_ver_of "$v")
  ws_detail "$(ws_msg s2_ja VERSAO="$WS_CLAUDE_VER")"
  ws_ver_ge "$WS_CLAUDE_VER" "$C_CLAUDE_CODE_MIN_VERSION" || ws_warn E-CC-03 "$WS_CLAUDE_VER"
  local first; first=$(command -v claude 2>/dev/null)
  [ -n "$first" ] && [ "$first" != "$WS_CLAUDE" ] && ws_warn E-CC-03 "$first"
  ws_profile_update
  return 0
}

# ================================================================= PASSO 3 - login
ws_auth_read() { # define WS_AUTH_LOGGED WS_AUTH_METHOD WS_AUTH_SOURCE WS_AUTH_SUB WS_AUTH_ORG
  local j flat
  j=$("$WS_CLAUDE" auth status 2>>"$WS_STEP_LOG" </dev/null)
  flat=$(printf '%s' "$j" | tr -d '\n')
  ws_jf() { printf '%s' "$flat" | sed -n "s/.*\"$1\"[[:space:]]*:[[:space:]]*\"\{0,1\}\([^\",}]*\)\"\{0,1\}.*/\1/p" | head -n 1; }
  WS_AUTH_LOGGED=$(ws_jf loggedIn); WS_AUTH_METHOD=$(ws_jf authMethod); WS_AUTH_SOURCE=$(ws_jf apiKeySource)
  WS_AUTH_SUB=$(ws_jf subscriptionType); WS_AUTH_ORG=$(ws_jf orgName)
  ws_log "auth: loggedIn=$WS_AUTH_LOGGED authMethod=$WS_AUTH_METHOD apiKeySource=$WS_AUTH_SOURCE subscriptionType=$WS_AUTH_SUB"
}

ws_auth_classify() { # -> console | assinatura | outro | nenhum
  [ "$WS_AUTH_LOGGED" = true ] || { echo nenhum; return; }
  case "$WS_AUTH_SOURCE" in "/login managed key") echo console; return ;; esac
  if [ "$WS_AUTH_METHOD" = claude.ai ] && [ -n "$WS_AUTH_SUB" ] && [ "$WS_AUTH_SUB" != null ]; then echo assinatura; return; fi
  echo outro
}

ws_s3_detect() {
  [ -n "${WS_CLAUDE:-}" ] || WS_CLAUDE=$(ws_claude)
  ws_auth_read
  case "$(ws_auth_classify)" in
    console) ws_detail "$(ws_msg s3_console EMAIL="${WS_AUTH_ORG:-Console}")"; WS_AUTH_OK=1; return 0 ;;
    assinatura)
      if [ "$WS_MODE" = install ] && [ -z "${WS_AUTH_ASKED:-}" ]; then return 1; fi
      ws_detail "$(ws_msg s3_outro METODO="claude.ai ($WS_AUTH_SUB)")"; ws_warn E-AUTH-02 "$WS_AUTH_SUB"; WS_AUTH_OK=1; return 0 ;;
    outro) ws_detail "$(ws_msg s3_outro METODO="${WS_AUTH_METHOD:-?}")"; ws_warn E-AUTH-03 "$WS_AUTH_METHOD"; WS_AUTH_OK=1; return 0 ;;
    *) ws_fail E-AUTH-01 ""; return 1 ;;
  esac
}
ws_s3_install() {
  local kind; kind=$(ws_auth_classify)
  WS_AUTH_ASKED=1
  if [ "$kind" = assinatura ]; then
    if [ "$WS_SIM" = 1 ] || ! ws_ask "$(ws_m s3_pergunta_trocar)" n nunca-sim; then
      ws_note "$(ws_m s3_manter)"; ws_s3_detect; return 0
    fi
  elif [ "$WS_SIM" = 1 ]; then
    ws_note "$(ws_m s3_login_sim)"; ws_fail E-AUTH-01 ""; return 1
  elif ! ws_ask "$(ws_m s3_pergunta_login)" s; then
    ws_fail E-AUTH-01 ""; return 1
  fi
  ws_has_tty || { ws_fail E-AUTH-01 "sem terminal"; return 1; }
  ws_log "\$ claude auth login --console (interativo)"
  "$WS_CLAUDE" auth login --console </dev/tty >/dev/tty 2>&1 || true
  ws_s3_detect
}

# ================================================================= PASSO 4 - Node
ws_node_major() { "$1" -v 2>/dev/null </dev/null | sed -E 's/^v([0-9]+).*/\1/'; }

ws_node_candidates() {
  local brew major=${C_NODE_VERSION%%.*}
  [ -n "${WS_NODE:-}" ] && printf '%s\n' "$WS_NODE"
  command -v node 2>/dev/null
  printf '%s\n' "$WS_HOME/node/bin/node"
  brew=$(command -v brew 2>/dev/null) && printf '%s\n' "$("$brew" --prefix 2>/dev/null)/opt/node@$major/bin/node"
}

# Major do node que um terminal novo encontra (as skills e os testes chamam "node" pelo PATH).
ws_login_node_major() {
  local sh=${SHELL:-/bin/zsh}
  [ -x "$sh" ] || sh=/bin/zsh
  "$sh" -lic 'node -v' </dev/null 2>/dev/null | tail -n 1 | sed -nE 's/^v([0-9]+).*/\1/p'
}

ws_s4_detect() {
  local c m found=""
  while IFS= read -r c; do
    [ -n "$c" ] && [ -x "$c" ] || continue
    m=$(ws_node_major "$c")
    if [ -n "$m" ] && [ "$m" -ge "$C_NODE_MIN_MAJOR" ] 2>/dev/null; then found=$c; break; fi
  done <<EOF
$(ws_node_candidates)
EOF
  WS_NODE=$found
  [ -n "$WS_NODE" ] || { ws_fail E-NODE-01 "node >= $C_NODE_MIN_MAJOR"; return 1; }
  case "$WS_NODE" in "$WS_HOME"/node/bin/node|*/opt/node@*/bin/node) WS_NODE_BIN_DIR=$(dirname "$WS_NODE") ;; esac
  ws_detail "$(ws_msg s4_ja VERSAO="$("$WS_NODE" -v </dev/null)" CAMINHO="${WS_NODE/#"$HOME"/~}")"
  ws_registar_flush
  m=$(ws_login_node_major)
  ws_log "node num shell de login novo: ${m:-nenhum}"
  if { [ -z "$m" ] || ! [ "$m" -ge "$C_NODE_MIN_MAJOR" ] 2>/dev/null; } && [ "$WS_MODE" = install ]; then
    ws_profile_update
    m=$(ws_login_node_major)
  fi
  { [ -n "$m" ] && [ "$m" -ge "$C_NODE_MIN_MAJOR" ] 2>/dev/null; } || ws_warn E-NODE-02 "${m:+v$m}"
  return 0
}
ws_s4_install() {
  local brew major
  major=${C_NODE_VERSION%%.*}
  brew=$(command -v brew 2>/dev/null)
  if [ -n "$brew" ] && [ -w "$("$brew" --prefix 2>/dev/null)/bin" ]; then
    ws_say "  $(ws_m a_instalar) (brew install node@$major)"
    if HOMEBREW_NO_AUTO_UPDATE=1 ws_run "$brew" install "node@$major"; then
      local n; n="$("$brew" --prefix 2>/dev/null)/opt/node@$major/bin/node"
      if [ -x "$n" ]; then WS_NODE=$n; WS_NODE_BIN_DIR=$(dirname "$n"); fi
    fi
  fi
  if [ -z "${WS_NODE:-}" ]; then
    local file="node-v$C_NODE_VERSION-darwin-$WS_ARCH.tar.xz" url sums want got d="$WS_TMP/node"
    rm -rf "$d"; mkdir -p "$d/x"
    url=$(ws_expand "$C_NODE_DIST_URL" "" "" "" "" "$C_NODE_VERSION" "$file" "")
    ws_say "  $(ws_msg a_descarregar O_QUE="$file")"
    ws_dl "$(ws_expand "$C_NODE_DIST_URL" "" "" "" "" "$C_NODE_VERSION" SHASUMS256.txt "")" "$d/SHASUMS256.txt" &&
      ws_dl "$url" "$d/$file" || { ws_fail "$(ws_net_code "$WS_DL_RC" "$WS_DL_HTTP")" "$url"; return 1; }
    want=$(ws_sum_for "$d/SHASUMS256.txt" "$file"); got=$(ws_sha256 "$d/$file")
    if [ -z "$want" ] || [ "$want" != "$got" ]; then ws_fail E-NODE-01 "SHA-256 $file"; return 1; fi
    ws_run tar -xJf "$d/$file" -C "$d/x" || { ws_fail E-NODE-01 "tar"; return 1; }
    rm -rf "$WS_HOME/node.old"; [ -d "$WS_HOME/node" ] && mv "$WS_HOME/node" "$WS_HOME/node.old"
    mv "$d/x/node-v$C_NODE_VERSION-darwin-$WS_ARCH" "$WS_HOME/node" || { ws_fail E-PERM-01 "$WS_HOME/node"; return 1; }
    rm -rf "$WS_HOME/node.old"
    WS_NODE="$WS_HOME/node/bin/node"; WS_NODE_BIN_DIR="$WS_HOME/node/bin"
  fi
  ws_path_setup
  "$WS_NODE" -v >/dev/null 2>&1 </dev/null || { ws_fail E-PERM-02 "$WS_NODE"; return 1; }
  ws_profile_update
  ws_s4_detect
}

# ================================================================= PASSO 5 - uv
ws_s5_detect() {
  local v
  v=$(uv --version 2>/dev/null </dev/null) || return 1
  WS_UV=$(command -v uv); WS_UV_VER=$(ws_ver_of "$v")
  ws_ver_ge "$WS_UV_VER" 0.5 || return 1
  ws_detail "$(ws_msg s5_ja VERSAO="$WS_UV_VER")"
}
ws_s5_install() {
  local f="$WS_TMP/uv-install.sh" url
  url=$(ws_expand "$C_UV_INSTALL_SH_URL" "" "" "" "" "$C_UV_VERSION" "" "")
  ws_dl "$url" "$f" || { ws_fail "$(ws_net_code "$WS_DL_RC" "$WS_DL_HTTP")" "$url"; return 1; }
  UV_NO_MODIFY_PATH=1 UV_INSTALL_DIR="$HOME/.local/bin" ws_run sh "$f" || { ws_fail E-UV-01 "install.sh"; return 1; }
  ws_path_setup
  ws_s5_detect || { ws_fail E-UV-01 "uv --version"; return 1; }
  ws_profile_update
}

# ================================================================= PASSO 6 - gh
ws_s6_detect() {
  local v
  v=$(gh --version 2>/dev/null </dev/null | head -n 1) || return 1
  [ -n "$v" ] || return 1
  WS_GH_VER=$(ws_ver_of "$v")
  ws_detail "$(ws_msg s6_ja VERSAO="$WS_GH_VER")"
  if ! gh auth status >/dev/null 2>&1 </dev/null; then
    if [ "$WS_MODE" = install ] && [ "$WS_SIM" != 1 ] && [ -z "${WS_GH_ASKED:-}" ] && ws_has_tty; then
      WS_GH_ASKED=1
      if ws_ask "$(ws_m s6_pergunta_login)" s; then gh auth login </dev/tty >/dev/tty 2>&1 || true; fi
      gh auth status >/dev/null 2>&1 </dev/null && return 0
    fi
    ws_warn E-GH-02 ""
  fi
  return 0
}
ws_s6_install() {
  local brew; brew=$(command -v brew 2>/dev/null)
  if [ -n "$brew" ] && [ -w "$("$brew" --prefix 2>/dev/null)/bin" ]; then
    HOMEBREW_NO_AUTO_UPDATE=1 ws_run "$brew" install gh && { ws_s6_detect; return 0; }
  fi
  local a=arm64 file sums url d="$WS_TMP/gh" want got
  [ "$WS_ARCH" = x64 ] && a=amd64
  file="gh_${C_GH_VERSION}_macOS_$a.zip"
  rm -rf "$d"; mkdir -p "$d/x"
  url=$(ws_expand "$C_GH_RELEASE_URL" "" "" "" "" "$C_GH_VERSION" "$file" "")
  ws_say "  $(ws_msg a_descarregar O_QUE="$file")"
  ws_dl "$(ws_expand "$C_GH_RELEASE_URL" "" "" "" "" "$C_GH_VERSION" "gh_${C_GH_VERSION}_checksums.txt" "")" "$d/sums" &&
    ws_dl "$url" "$d/$file" || { ws_fail "$(ws_net_code "$WS_DL_RC" "$WS_DL_HTTP")" "$url"; return 1; }
  want=$(ws_sum_for "$d/sums" "$file"); got=$(ws_sha256 "$d/$file")
  [ -n "$want" ] && [ "$want" = "$got" ] || { ws_fail E-GH-01 "SHA-256 $file"; return 1; }
  ws_run unzip -q -o "$d/$file" -d "$d/x" || { ws_fail E-GH-01 unzip; return 1; }
  mkdir -p "$WS_HOME/bin"
  cp -f "$d/x/gh_${C_GH_VERSION}_macOS_$a/bin/gh" "$WS_HOME/bin/gh.tmp" && mv -f "$WS_HOME/bin/gh.tmp" "$WS_HOME/bin/gh" || { ws_fail E-PERM-01 "$WS_HOME/bin"; return 1; }
  chmod +x "$WS_HOME/bin/gh"
  ws_path_setup
  ws_profile_update
  ws_s6_detect || { ws_fail E-GH-01 "gh --version"; return 1; }
}

# ================================================================= PASSO 7 - MCP Atlassian
ws_s7_detect() {
  [ -n "${WS_CLAUDE:-}" ] || WS_CLAUDE=$(ws_claude)
  "$WS_CLAUDE" mcp get atlassian >>"$WS_STEP_LOG" 2>&1 </dev/null || { ws_fail E-MCP-01 ""; return 1; }
  ws_detail "$(ws_m s7_ja)"
  ws_note "$(ws_m s7_oauth)"
  WS_TODO_MCP=1
}
ws_s7_install() {
  ws_run "$WS_CLAUDE" mcp add --transport http --scope user atlassian "$C_ATLASSIAN_MCP_URL" || { ws_fail E-MCP-01 ""; return 1; }
  ws_registar mcp atlassian
  local lst; lst=$("$WS_CLAUDE" mcp list 2>&1 </dev/null)
  printf '%s\n' "$lst" >> "$WS_STEP_LOG"
  printf '%s\n' "$lst" | grep -q '^atlassian' || { ws_fail E-MCP-01 "claude mcp list"; return 1; }
  ws_s7_detect
}

# ================================================================= PASSO 8 - instalacao ao nivel do utilizador
ws_iu() { # subcomando [extra]
  local sub=$1; shift
  set -- --node "$WS_NODE" --kit-src "$KIT_SRC" "$@"
  [ -n "${WS_CA_PEM:-}" ] && set -- "$@" --ca-pem "$WS_CA_PEM"
  [ -n "${WS_PROXY:-}" ] && set -- "$@" --https-proxy "$WS_PROXY"
  "$WS_NODE" "$KIT_SRC/installer/install-user.mjs" "$sub" "$@" 2>>"$WS_STEP_LOG" </dev/null
}
ws_s8_parse() { # le a saida TSV de install-user
  local k v skills=0 agentes=0
  while IFS="$WS_TAB" read -r k v; do
    case "$k" in
      skills) skills=$v ;; agentes) agentes=$v ;;
      aviso) [ "$v" = E-CFG-06 ] && ws_note "$(ws_m s8_statusline_mantida)"; ws_warn "$v" "statusLine" ;;
      erro) ws_fail "$v" "" ;;
      falta) ws_log "em falta: $v" ;;
    esac
  done <<EOF
$1
EOF
  ws_detail "$(ws_msg s8_ja SKILLS="$skills" AGENTES="$agentes")"
}
ws_s8_detect() {
  ws_kit_ensure || { ws_fail E-KIT-01 ""; return 1; }
  ws_registar_flush
  local out rc
  out=$(ws_iu verificar); rc=$?
  printf '%s\n' "$out" >> "$WS_STEP_LOG"
  ws_s8_parse "$out"
  [ "$rc" = 0 ]
}
ws_s8_install() {
  ws_set SW 8 ""; ws_set SN 8 ""; ws_set SF 8 ""
  ws_kit_ensure || { ws_fail E-KIT-01 ""; return 1; }
  local out rc
  if [ "$WS_SUBST_SL" = 1 ]; then out=$(ws_iu instalar --substituir-statusline); else out=$(ws_iu instalar); fi
  rc=$?
  printf '%s\n' "$out" >> "$WS_STEP_LOG"
  ws_s8_parse "$out"
  case "$rc" in 0) ;; 3) ws_fail E-CFG-05 "$CLAUDE_DIR/settings.json"; return 1 ;; *) ws_fail E-KIT-03 "install-user ($rc)"; return 1 ;; esac
  ws_registar_flush
  return 0
}

# ================================================================= PASSO 9 - projetos
ws_s9_detect() {
  local demo="$WS_PROJ/demo-project" sb="$WS_PROJ/exemplo-projeto-real"
  ws_kit_ensure || { ws_fail E-KIT-01 ""; return 1; }
  [ -f "$demo/.arena-kit.json" ] && git -C "$demo" rev-parse -q --verify refs/tags/arena-inicial >/dev/null 2>&1 </dev/null || { ws_fail E-DEMO-01 "$demo"; return 1; }
  if [ -f "$KIT_SRC/installer/assemble-sandbox.mjs" ]; then
    [ -f "$sb/.sandbox-kit.json" ] && git -C "$sb" rev-parse -q --verify HEAD >/dev/null 2>&1 </dev/null || { ws_fail E-DEMO-01 "$sb"; return 1; }
  fi
  ws_detail "$(ws_msg s9_ja PROJETOS="$WS_PROJ_SHOW")"
  [ "$WS_MODE" = install ] || ws_s9_tests
  return 0
}
ws_s9_tests() {
  local demo="$WS_PROJ/demo-project" out n
  if [ ! -f "$demo/test/app.test.js" ]; then ws_note "$(ws_m s9_sem_testes)"; return 0; fi
  out=$(cd "$demo" && "$WS_NODE" --test test/app.test.js 2>&1 </dev/null); local rc=$?
  printf '%s\n' "$out" >> "$WS_STEP_LOG"
  n=$(printf '%s\n' "$out" | sed -n 's/^[#ℹ] *pass \([0-9]*\).*/\1/p' | tail -n 1)
  if [ "$rc" = 0 ]; then ws_note "$(ws_msg s9_testes_ok OK="${n:-?}")"; return 0; fi
  ws_fail E-DEMO-02 "node --test test/app.test.js"; return 1
}
ws_assemble() { # script destino marca [--node]
  local script=$1 dest=$2 mark=$3; shift 3
  local force=""
  if [ -e "$dest" ] && [ -n "$(ls -A "$dest" 2>/dev/null)" ]; then
    if [ -f "$dest/$mark" ]; then
      git -C "$dest" rev-parse -q --verify HEAD >/dev/null 2>&1 </dev/null || force=--force   # montagem interrompida
    else
      ws_fail E-DEMO-03 "$dest"; return 1
    fi
  fi
  ws_run "$WS_NODE" "$KIT_SRC/installer/$script" --dest "$dest" "$@" ${force:+"$force"} || { ws_fail E-DEMO-01 "$script"; return 1; }
  ws_registar projeto "$(basename "$dest")" "$dest"
}
ws_s9_install() {
  ws_set SF 9 ""
  ws_kit_ensure || { ws_fail E-KIT-01 ""; return 1; }
  mkdir -p "$WS_PROJ" || { ws_fail E-PERM-01 "$WS_PROJ"; return 1; }
  local demo="$WS_PROJ/demo-project"
  if [ -f "$demo/.arena-kit.json" ] && ! git -C "$demo" rev-parse -q --verify refs/tags/arena-inicial >/dev/null 2>&1 </dev/null; then
    ws_run "$WS_NODE" "$KIT_SRC/installer/assemble-demo.mjs" --dest "$demo" --node "$WS_NODE" --force || { ws_fail E-DEMO-01 assemble-demo; return 1; }
    ws_registar projeto demo-project "$demo"
  else
    ws_assemble assemble-demo.mjs "$demo" .arena-kit.json --node "$WS_NODE" || return 1
  fi
  if [ -f "$KIT_SRC/installer/assemble-sandbox.mjs" ]; then
    ws_assemble assemble-sandbox.mjs "$WS_PROJ/exemplo-projeto-real" .sandbox-kit.json || return 1
  fi
  ws_detail "$(ws_msg s9_ja PROJETOS="$WS_PROJ_SHOW")"
  ws_s9_tests
}

# ================================================================= PASSO 10 - app Memoria (nao bloqueante)
# Instala o wheel publicado (SHA-256 verificado) com "uv tool install --managed-python" (Python com FTS5).
# Os comandos da app sao "memoria" (CLI e MCP) e "memoria-gui" (janela). As memorias (~/.memoria) sao
# dados da pessoa: o --desinstalar nunca lhes toca.
WS_APP_BUNDLE='Memória.app'
ws_uv_bin_dir() { uv tool dir --bin 2>/dev/null </dev/null || printf '%s' "$HOME/.local/bin"; }
ws_memoria_bin() { local b; b="$(ws_uv_bin_dir)/memoria"; [ -x "$b" ] && printf '%s' "$b"; }
ws_s10_detect() {
  local b ver=${C_MEMORY_APP_VERSION#v}
  b=$(ws_memoria_bin) || { ws_fail E-MEM-01 ""; return 1; }
  uv tool list 2>/dev/null </dev/null | grep -Eq "^memoria v?$ver( |$)" || { ws_fail E-MEM-03 "versao $ver"; return 1; }
  [ -x "$HOME/Applications/$WS_APP_BUNDLE/Contents/MacOS/memoria-app" ] || { ws_fail E-MEM-03 "atalho"; return 1; }
  [ -f "$HOME/.memoria/config.json" ] || { ws_fail E-MEM-03 "config.json"; return 1; }
  if [ -n "${WS_CLAUDE:-}" ]; then "$WS_CLAUDE" mcp get memoria >/dev/null 2>&1 </dev/null || { ws_fail E-MEM-03 "mcp"; return 1; }; fi
  ws_memoria_selftest "$b" "$ver"
  return 0
}
# Corre "memoria selftest" e mostra o Python gerido pelo uv ("Memória 0.1.0 · Python 3.12.13 · Darwin arm64").
ws_memoria_selftest() {
  local out rc py fails
  out=$("$1" selftest 2>&1 </dev/null); rc=$?
  printf '%s\n' "$out" >> "$WS_STEP_LOG"
  py=$(printf '%s\n' "$out" | sed -nE 's/.*Python ([0-9]+\.[0-9]+(\.[0-9]+)?).*/\1/p' | head -n 1)
  if [ "$rc" = 0 ] && printf '%s\n' "$out" | grep -Eq '^[[:space:]]*\[OK\].*FTS5'; then
    ws_detail "$(ws_msg s10_ok VERSAO="$2" PY="${py:-?}")"; return 0
  fi
  ws_detail "$(ws_msg s10_ja VERSAO="$2")"
  fails=$(printf '%s\n' "$out" | sed -nE 's/^[[:space:]]*\[FALHOU\][[:space:]]*//p' | tr '\n' ';' | sed 's/;$//')
  ws_warn E-MEM-05 "${fails:-memoria selftest ($rc)}"
  return 1
}
ws_s10_install() {
  local ver=${C_MEMORY_APP_VERSION#v} d="$WS_TMP/memoria" whl want got b f
  whl="memoria-$ver-py3-none-any.whl"
  rm -rf "$d"; mkdir -p "$d"
  ws_say "  $(ws_msg a_descarregar O_QUE="$whl")"
  if ! ws_dl "$(ws_release_url memory SHA256SUMS)" "$d/SHA256SUMS" auth; then
    case "$WS_DL_HTTP" in 404|403|410) ws_fail E-MEM-01 "$C_MEMORY_APP_VERSION" ;; *) ws_fail "$(ws_net_code "$WS_DL_RC" "$WS_DL_HTTP")" "SHA256SUMS" ;; esac
    return 1
  fi
  for f in "$whl" constraints.txt; do
    ws_dl "$(ws_release_url memory "$f")" "$d/$f" auth || { case "$WS_DL_HTTP" in 404|403|410) ws_fail E-MEM-01 "$f" ;; *) ws_fail E-NET-07 "$f" ;; esac; return 1; }
    want=$(ws_sum_for "$d/SHA256SUMS" "$f"); got=$(ws_sha256 "$d/$f")
    [ -n "$want" ] && [ "$want" = "$got" ] || { ws_fail E-MEM-02 "$f"; return 1; }
  done
  ws_say "  $(ws_m a_instalar)"
  # O uv traz o seu proprio Python (--managed-python): nao depende de nenhum Python do sistema.
  # As variaveis que o proibiriam sao retiradas so deste comando (env -u), nunca globalmente.
  ws_run env -u UV_PYTHON_DOWNLOADS -u UV_NO_MANAGED_PYTHON -u UV_PYTHON_PREFERENCE -u UV_PYTHON \
    uv tool install --managed-python --python "$C_PYTHON_VERSION" "$d/$whl" --constraints "$d/constraints.txt" --force ||
    { ws_fail E-MEM-03 "uv tool install"; return 1; }
  ws_registar app memoria
  b=$(ws_memoria_bin) || { ws_fail E-MEM-03 "memoria"; return 1; }
  ws_memoria_config
  ws_memoria_shortcut "$b" || { ws_fail E-MEM-03 "atalho"; return 1; }
  if [ -n "${WS_CLAUDE:-}" ] && ! "$WS_CLAUDE" mcp get memoria >/dev/null 2>&1 </dev/null; then
    ws_run "$WS_CLAUDE" mcp add --scope user memoria -- "$b" mcp || { ws_fail E-MEM-03 "claude mcp add memoria"; return 1; }
    ws_registar mcp memoria
  fi
  ws_memoria_selftest "$b" "$ver"
  ws_note "$(ws_m s10_update)"
}
# ~/.memoria/config.json com as chaves que a app usa para se atualizar (mesmos nomes que o repos.conf).
ws_memoria_config() {
  local cfg="$HOME/.memoria/config.json" uvp
  mkdir -p "$HOME/.memoria"
  uvp=$(command -v uv 2>/dev/null)
  if [ -n "${WS_NODE:-}" ]; then
    "$WS_NODE" -e '
      const fs = require("fs"); const [f, repo, pat, py, uv] = process.argv.slice(1);
      let c = {}; try { c = JSON.parse(fs.readFileSync(f, "utf8")); } catch {}
      Object.assign(c, { MEMORY_APP_REPO_URL: repo, RELEASE_DOWNLOAD_URL: pat, PYTHON_VERSION: py });
      if (uv) c.UV = uv;
      fs.writeFileSync(f, JSON.stringify(c, null, 2) + "\n");' "$cfg" "$C_MEMORY_APP_REPO_URL" "$C_RELEASE_DOWNLOAD_URL" "$C_PYTHON_VERSION" "$uvp" </dev/null
  elif [ ! -f "$cfg" ]; then
    printf '{\n  "MEMORY_APP_REPO_URL": "%s",\n  "RELEASE_DOWNLOAD_URL": "%s",\n  "PYTHON_VERSION": "%s",\n  "UV": "%s"\n}\n' \
      "$C_MEMORY_APP_REPO_URL" "$C_RELEASE_DOWNLOAD_URL" "$C_PYTHON_VERSION" "$uvp" > "$cfg"
  fi
}
ws_memoria_shortcut() { # bundle .app minimo que abre a janela da app pelo caminho absoluto
  local app="$HOME/Applications/$WS_APP_BUNDLE" b=$1 gui
  gui="$(dirname "$b")/memoria-gui"; [ -x "$gui" ] || gui=$b
  mkdir -p "$app/Contents/MacOS" || return 1
  cat > "$app/Contents/Info.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key><string>Memória</string>
  <key>CFBundleDisplayName</key><string>Memória</string>
  <key>CFBundleIdentifier</key><string>pt.workshop.memoria</string>
  <key>CFBundleExecutable</key><string>memoria-app</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleShortVersionString</key><string>${C_MEMORY_APP_VERSION#v}</string>
  <key>LSMinimumSystemVersion</key><string>11.0</string>
  <key>NSHighResolutionCapable</key><true/>
</dict>
</plist>
EOF
  printf '#!/bin/sh\nexec "%s" "$@"\n' "$gui" > "$app/Contents/MacOS/memoria-app"
  chmod +x "$app/Contents/MacOS/memoria-app"
  ws_registar atalho "$WS_APP_BUNDLE" "$app"
}

# ================================================================= PASSO 11 - Claude Desktop (opcional)
ws_s11_detect() {
  local a
  for a in "/Applications/Claude.app" "$HOME/Applications/Claude.app"; do
    if [ -d "$a" ]; then ws_detail "$(ws_msg s11_ja CAMINHO="$a")"; ws_warn E-DESK-01 ""; return 0; fi
  done
  [ "$WS_MODE" = install ] || ws_fail E-DESK-02 ""
  return 1
}
ws_s11_install() {
  local d="$WS_TMP/desktop" mnt
  rm -rf "$d"; mkdir -p "$d"
  ws_say "  $(ws_msg a_descarregar O_QUE="Claude.dmg")"
  ws_dl "$C_DESKTOP_MAC_URL" "$d/Claude.dmg" || { ws_fail E-DESK-02 "HTTP $WS_DL_HTTP"; ws_warn E-DESK-01 ""; return 1; }
  mnt="$d/mnt"; mkdir -p "$mnt"
  ws_run hdiutil attach -nobrowse -readonly -noautoopen -mountpoint "$mnt" "$d/Claude.dmg" || { ws_fail E-DESK-02 hdiutil; return 1; }
  mkdir -p "$HOME/Applications"
  rm -rf "$HOME/Applications/Claude.app.tmp"
  ws_run ditto "$mnt/Claude.app" "$HOME/Applications/Claude.app.tmp" && rm -rf "$HOME/Applications/Claude.app" && mv "$HOME/Applications/Claude.app.tmp" "$HOME/Applications/Claude.app"
  local rc=$?
  ws_run hdiutil detach "$mnt" -quiet || ws_run hdiutil detach "$mnt" -force
  [ "$rc" = 0 ] || { ws_fail E-DESK-02 ditto; return 1; }
  ws_s11_detect
}

# ================================================================= PASSO 12 - teste final
ws_parse_result() { # ficheiro-json -> define WSR_*
  local k v
  WSR_JSON=0; WSR_ERRO=1; WSR_RESPOSTA=""; WSR_USD=""; WSR_USD_TEXTO="US\$ ?"; WSR_CAUSA=""; WSR_CMDS=""
  while IFS="$WS_TAB" read -r k v; do
    case "$k" in
      json) WSR_JSON=$v ;; erro) WSR_ERRO=$v ;; resposta) WSR_RESPOSTA=$v ;; usd) WSR_USD=$v ;; usd_texto) WSR_USD_TEXTO=$v ;;
      causa) WSR_CAUSA=$v ;; cmd) WSR_CMDS="$WSR_CMDS$v
" ;;
    esac
  done <<EOF
$(ws_js "$WS_JS_RESULTADO" "$1" "$WS_PRICING")
EOF
}
ws_s12_detect() {
  [ "$WS_MODE" = install ] && return 1
  ws_s12_install
}
ws_s12_install() {
  local out="$WS_TMP/smoke.json" err="$WS_TMP/smoke.err" t0 t1
  [ -n "${WS_CLAUDE:-}" ] || WS_CLAUDE=$(ws_claude)
  t0=$(date +%s)
  ( cd "$WS_TMP" && "$WS_CLAUDE" -p "$(ws_m s12_prompt)" --model claude-haiku-5-5 --output-format json --tools "" > "$out" 2> "$err" </dev/null )
  local rc=$?; t1=$(date +%s)
  { cat "$err"; head -c 4000 "$out"; printf '\n'; } >> "$WS_STEP_LOG"
  ws_parse_result "$out"
  ws_log "teste final: rc=$rc erro=$WSR_ERRO custo=$WSR_USD_TEXTO"
  if [ "$rc" = 0 ] && [ "$WSR_JSON" = 1 ] && [ "$WSR_ERRO" = 0 ]; then
    ws_detail "$(ws_msg s12_ok RESPOSTA="$(ws_trim "$WSR_RESPOSTA")" SEG="$((t1 - t0))" USD="$WSR_USD_TEXTO")"
    [ "$WSR_USD_TEXTO" = "US\$ ?" ] && ws_note "$(ws_m s12_custo_desconhecido)"
    return 0
  fi
  local all; all="$(cat "$err") $WSR_RESPOSTA"
  case "$all" in
    *[Cc]redit\ balance*|*billing*) ws_fail E-SMOKE-02 "" ;;
    *429*|*rate_limit*|*[Rr]ate\ limit*) ws_fail E-SMOKE-03 "" ;;
    *not_found_error*|*model:*|*[Ii]nvalid\ model*) ws_fail E-SMOKE-04 "claude-haiku-5-5" ;;
    *certificate*|*CERT_*|*SELF_SIGNED*) ws_fail E-NET-04 "" ;;
    *ENOTFOUND*|*ECONNREFUSED*|*ETIMEDOUT*|*ECONNRESET*|*fetch\ failed*|*[Uu]nable\ to\ connect*) ws_fail E-NET-05 "" ;;
    *[Nn]ot\ logged\ in*|*/login*|*authentication_error*|*[Ii]nvalid\ API\ key*) ws_fail E-AUTH-01 "" ;;
    *) ws_fail E-SMOKE-01 "codigo $rc" ;;
  esac
  return 1
}

# ================================================================= ajudante Claude
ws_versions_line() {
  printf 'SO: %s; git %s; Claude Code %s; Node %s; uv %s; gh %s; kit %s' "${WS_OS:-?}" "${WS_GIT_VER:-?}" "${WS_CLAUDE_VER:-?}" \
    "$( [ -n "${WS_NODE:-}" ] && "$WS_NODE" -v 2>/dev/null </dev/null || echo '?')" "${WS_UV_VER:-?}" "${WS_GH_VER:-?}" "$C_WORKSHOP_VERSION"
}

ws_helper_call() { # ficheiro-prompt ficheiro-saida [schema]
  [ -n "${WS_CLAUDE:-}" ] || return 1
  if [ -n "${3:-}" ]; then
    ( cd "$WS_TMP" && "$WS_CLAUDE" -p --model claude-haiku-5-5 --tools "" --disallowedTools "mcp__*" --output-format json --json-schema "$3" < "$1" > "$2" 2>>"$WS_LOG" )
  else
    ( cd "$WS_TMP" && "$WS_CLAUDE" -p --model claude-haiku-5-5 --tools "" --disallowedTools "mcp__*" --output-format json < "$1" > "$2" 2>>"$WS_LOG" )
  fi
}

# Depois de um passo falhar: oferece a analise do Claude. Devolve 0 se valer a pena repetir o passo.
ws_helper_offer() {
  local n=$1 f code
  f="SF_$n"; code=${!f%%|*}
  [ "${WS_AUTH_OK:-0}" = 1 ] || return 1
  case "$code" in E-NET-*|E-AUTH-*) return 1 ;; esac
  ws_say ""
  ws_ask "$(ws_m helper_pergunta)" s || return 1
  ws_say "  $(ws_m helper_a_pedir)"
  local p="$WS_TMP/helper-$n.txt" o="$WS_TMP/helper-$n.json" title="M_passos_$n"
  {
    printf 'Es um assistente de suporte tecnico do setup de um workshop de Claude Code.\n'
    printf 'Responde em portugues de Portugal, com frases curtas, para alguem sem experiencia.\n'
    printf 'Diz a causa provavel em 1 a 3 frases e ate 4 comandos de terminal (macOS, bash/zsh) que a pessoa pode correr para corrigir.\n'
    printf 'Nunca sugiras sudo, comandos destrutivos, nem pedir ou mostrar chaves de API. Se nao tiveres a certeza, nao sugiras comandos.\n\n'
    printf 'Passo que falhou: %s (%s)\nCodigo: %s\n%s\n\n' "$n" "${!title}" "$code" "$(ws_versions_line)"
    printf 'Excerto do log (sem segredos):\n'
    tail -n 80 "$WS_STEP_LOG" | ws_redact
  } > "$p"
  ws_log "ajudante: pedido de $(wc -c < "$p" | tr -d ' ') bytes"
  if ! ws_helper_call "$p" "$o" "$WS_SCHEMA_HELPER"; then ws_say "  $(ws_m helper_falhou)"; return 1; fi
  ws_parse_result "$o"
  ws_log "ajudante: custo $WSR_USD_TEXTO"
  if [ -z "$WSR_CAUSA" ]; then ws_say "  $(ws_m helper_falhou)"; return 1; fi
  ws_say "  $(ws_bold "$(ws_m helper_causa)") $WSR_CAUSA"
  ws_say "  $(ws_dim "$(ws_msg helper_custo USD="$WSR_USD_TEXTO")")"
  if [ -z "$WSR_CMDS" ]; then ws_say "  $(ws_m helper_sem_comandos)"; return 1; fi
  ws_say "  $(ws_m helper_comandos)"
  local cmd ran=0
  [ "$WS_SIM" = 1 ] && ws_say "  $(ws_m helper_sim)"
  while IFS= read -r cmd; do
    [ -n "$cmd" ] || continue
    ws_say "    \$ $cmd"
    if ws_ask "$(ws_m helper_correr)" n nunca-sim; then
      ws_log "ajudante: corre $cmd"
      bash -c "$cmd" </dev/tty 2>&1 | tee -a "$WS_STEP_LOG"
      ran=1
    fi
  done <<EOF
$WSR_CMDS
EOF
  [ "$ran" = 1 ]
}

ws_doctor() {
  local n st any=0 p="$WS_TMP/doctor.txt" o="$WS_TMP/doctor.json" f w title
  ws_say ""; ws_say "$(ws_bold "$(ws_m doctor_titulo)")"
  for n in 0 1 2 3 4 5 6 7 8 9 10 11 12; do case "$(ws_st "$n")" in falta|falhou|naoexec|aviso) any=1 ;; esac; done
  if [ "$any" = 0 ]; then ws_say "  $(ws_m doctor_sem_falhas)"; return 0; fi
  if [ "${WS_AUTH_OK:-0}" != 1 ] || [ "${WS_NET_API_OK:-1}" = 0 ]; then ws_say "  $(ws_m doctor_sem_claude)"; return 0; fi
  {
    printf 'Es um assistente de suporte do setup de um workshop de Claude Code (macOS). Responde em portugues de Portugal, frases curtas, para alguem sem experiencia.\n'
    printf 'Faz um diagnostico completo: o que esta mal, porque, e os passos exatos (com comandos) por ordem. Nunca sugiras sudo nem mostrar chaves de API.\n\n%s\n\n' "$(ws_versions_line)"
    for n in 0 1 2 3 4 5 6 7 8 9 10 11 12; do
      st=$(ws_st "$n"); title="M_passos_$n"; f="SF_$n"; w="SW_$n"
      printf 'Passo %s (%s): %s %s %s\n' "$n" "${!title}" "$st" "${!f}" "$(printf '%s' "${!w}" | tr '\n' ' ')"
    done
    printf '\nExcerto do log:\n'; tail -n 120 "$WS_LOG" | ws_redact
  } > "$p"
  if ws_helper_call "$p" "$o" ""; then
    ws_parse_result "$o"
    local res; res=$(ws_js 'try{return String(JSON.parse(readText(A[0])).result||"");}catch(e){return "";}' "$o")
    [ -n "$res" ] && ws_say "$res" || ws_say "  $(ws_m helper_falhou)"
    ws_say "  $(ws_dim "$(ws_msg doctor_custo USD="$WSR_USD_TEXTO")")"
    ws_log "doctor: custo $WSR_USD_TEXTO"
  else
    ws_say "  $(ws_m helper_falhou)"
  fi
}

# ================================================================= resumo
ws_summary() {
  local n st title d line="" faltam=0 lista="" avisos=0 r="$WS_TMP/resumo.txt"
  {
    printf '%s\n' "$(ws_m resumo) · $(date '+%Y-%m-%d %H:%M') · $WS_OS"
    printf '%s %s %s\n' "$(ws_pad "$(ws_m resumo_cab_passo)" 42)" "$(ws_pad "$(ws_m resumo_cab_estado)" 20)" "$(ws_m resumo_cab_detalhe)"
    for n in 0 1 2 3 4 5 6 7 8 9 10 11 12; do
      st=$(ws_st "$n"); title="M_passos_$n"; d="SD_$n"
      printf '%s %s %s %s %s\n' "$(ws_pad "$n" 5)" "$(ws_pad "${!title}" 36)" "$(ws_sym "$st")" "$(ws_pad "$(ws_state_label "$st")" 17)" "${!d}"
      case "$st" in
        falhou|falta|naoexec) faltam=$((faltam + 1)); lista="${lista:+$lista; }$n (${!title})" ;;
        aviso) avisos=$((avisos + 1)) ;;
      esac
    done
    printf '\n'
    if [ "$faltam" = 0 ]; then
      if [ "$WS_MODE" = install ]; then printf '%s\n' "$(ws_m final_pronto)"; else printf '%s\n' "$(ws_m final_check_ok)"; fi
      [ "$avisos" -gt 0 ] && printf '%s\n' "$(ws_msg final_avisos N="$avisos")"
    else
      if [ "$faltam" = 1 ]; then printf '%s\n' "$(ws_msg final_falta1 LISTA="$lista")"; else printf '%s\n' "$(ws_msg final_faltam N="$faltam" LISTA="$lista")"; fi
      printf '%s\n' "$(ws_m final_voltar)"
    fi
  } > "$r"
  ws_say ""
  ws_say "$(ws_bold "────────────────────────────────────────────────────────────────")"
  while IFS= read -r line; do ws_say "$line"; done < "$r"
  [ "$WS_MODE" = install ] && ws_say "$(ws_m final_reiniciar)"
  [ "${WS_TODO_MCP:-0}" = 1 ] && ws_say "$(ws_m s7_oauth)"
  ws_say "$(ws_dim "$(ws_msg final_ficheiros RESUMO="$WS_RESUMO" LOG="$WS_LOG")")"
  cp -f "$r" "$WS_RESUMO" 2>/dev/null || true
  WS_FALTAM=$faltam
}

# ================================================================= desinstalar
ws_uninstall() {
  local man="$WS_HOME/manifest.json" t n c v a k
  if [ ! -f "$man" ]; then ws_say "$(ws_msg desinst_sem_manifest MANIFEST="$man")"; return 0; fi
  ws_s4_detect >/dev/null 2>&1 || true
  if [ -z "${WS_NODE:-}" ]; then WS_NODE=$(sed -n 's/.*"node": *"\([^"]*\)".*/\1/p' "$man" | head -n 1); fi
  [ -x "${WS_NODE:-}" ] || { ws_print_code E-NODE-01 "" "  "; return 1; }
  ws_kit_ensure || KIT_SRC=""
  local iu="$KIT_SRC/installer/install-user.mjs"
  [ -f "$iu" ] || iu="$WS_HOME/kit-src/$C_WORKSHOP_VERSION/installer/install-user.mjs"
  [ -f "$iu" ] || { ws_print_code E-KIT-01 "" "  "; return 1; }
  WS_CLAUDE=$(ws_claude)
  while IFS="$WS_TAB" read -r t n c v a; do
    case "$t" in
      mcp) [ -n "$WS_CLAUDE" ] && "$WS_CLAUDE" mcp remove --scope user "$n" >>"$WS_LOG" 2>&1 </dev/null && ws_say "  $(ws_msg desinst_mcp NOME="$n")" ;;
      app) uv tool uninstall memoria >>"$WS_LOG" 2>&1 </dev/null && { ws_say "  $(ws_m desinst_app)"; ws_say "  $(ws_m desinst_memorias)"; } ;;
      atalho) [ -n "$c" ] && rm -rf "$c" && ws_say "  $(ws_msg desinst_atalho CAMINHO="$c")" ;;
      perfil) if [ -f "$c" ]; then ws_profile_strip "$c" > "$c.ws-tmp" && mv -f "$c.ws-tmp" "$c" && ws_say "  $(ws_msg desinst_perfil FICHEIRO="$c")"; fi ;;
    esac
  done <<EOF
$("$WS_NODE" "$iu" extras 2>>"$WS_LOG" </dev/null)
EOF
  while IFS="$WS_TAB" read -r k v; do
    case "$k" in
      settings) [ "$v" = reposto ] && ws_say "  $(ws_m desinst_settings_reposto)"; [ "$v" = limpo ] && ws_say "  $(ws_m desinst_settings_limpo)" ;;
      projeto_removido) ws_say "  $(ws_msg desinst_projeto_removido CAMINHO="$v")" ;;
      projeto_mantido) ws_say "  $(ws_msg desinst_projeto_mantido CAMINHO="$v")" ;;
      erro) ws_say "  ❌ $v" ;;
    esac
  done <<EOF
$("$WS_NODE" "$iu" desinstalar 2>>"$WS_LOG" </dev/null)
EOF
  rm -rf "$WS_HOME/kit-src" "$WS_HOME/extras-pendentes.tsv"
  ws_say ""
  ws_say "$(ws_msg desinst_fim BACKUP="$WS_HOME/backup")"
}

# ================================================================= arranque
ws_usage() {
  cat <<'__WS_USO__'
Setup do workshop (macOS). Uso:
  curl -fsSL <url>/setup-mac.sh | bash                 instala
  curl -fsSL <url>/setup-mac.sh | bash -s -- --check   so verifica
  bash ~/.workshop-claude/setup-mac.sh [opcoes]        depois da primeira vez
Opcoes:
  --check                  so verifica (2 a 3 minutos), nao instala nada
  --doctor                 verifica e, se algo falhar, pede um diagnostico ao Claude
  --desinstalar            desfaz o que o setup instalou (manifest.json)
  --sem-desktop            nao instala o Claude Desktop
  --sim                    responde sim as perguntas simples (testes)
  --substituir-statusline  usa a statusline do workshop em vez da tua
__WS_USO__
}

ws_load_messages() {
  if [ -n "${M_ui_titulo:-}" ]; then return 0; fi
  local f="$WS_DEV_ROOT/setup/messages.pt.json" code
  [ -f "$f" ] || return 1
  code=$(ws_js "$WS_JS_MSGS" "$f") || return 1
  eval "$code"
}

ws_save_self() { # guarda uma copia local do script (para "bash ~/.workshop-claude/setup-mac.sh --check")
  local dst="$WS_HOME/setup-mac.sh" src=${BASH_SOURCE[0]:-} sums url
  [ "$WS_MODE" = uninstall ] && return 0
  if [ "$WS_DEV" = 1 ]; then
    printf '#!/usr/bin/env bash\n# Copia de desenvolvimento: chama o script do repositorio.\nexec bash "%s" "$@"\n' "$WS_DEV_ROOT/setup/setup-mac.sh" > "$dst.tmp" && mv -f "$dst.tmp" "$dst"
    return 0
  fi
  if [ -n "$src" ] && [ -f "$src" ]; then
    [ "$(cd "$(dirname "$src")" && pwd -P)/$(basename "$src")" = "$(cd "$WS_HOME" && pwd -P)/setup-mac.sh" ] && return 0
    grep -q "WS_INJ_KIT_SHA256=" "$src" 2>/dev/null && cp -f "$src" "$dst.tmp" && mv -f "$dst.tmp" "$dst" && return 0
  fi
  # Veio por "curl | bash": descarrega o mesmo ficheiro da release e confirma pelo SHA256SUMS.
  WS_STEP_LOG="$WS_TMP/self.log"
  url=$(ws_release_url workshop setup-mac.sh)
  ws_dl "$(ws_release_url workshop SHA256SUMS)" "$WS_TMP/SHA256SUMS" auth && ws_dl "$url" "$WS_TMP/setup-mac.sh" auth || return 0
  sums=$(ws_sum_for "$WS_TMP/SHA256SUMS" setup-mac.sh)
  [ -n "$sums" ] && [ "$sums" = "$(ws_sha256 "$WS_TMP/setup-mac.sh")" ] && mv -f "$WS_TMP/setup-mac.sh" "$dst" && chmod +x "$dst"
}

ws_lock() {
  local l="$WS_HOME/.lock" pid
  if mkdir "$l" 2>/dev/null; then echo $$ > "$l/pid"; return 0; fi
  pid=$(cat "$l/pid" 2>/dev/null)
  if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then printf 'O setup ja esta a correr (PID %s).\n' "$pid"; return 1; fi
  rm -rf "$l"; mkdir "$l" 2>/dev/null && echo $$ > "$l/pid"
}

ws_cleanup() { rm -rf "$WS_HOME/.lock" "${WS_TMP:-/nonexistent}" 2>/dev/null; }
ws_interrupted() {
  printf '\n%s\n' "$(ws_m interrompido)" >&2
  ws_log "interrompido"
  ws_cleanup; exit 130
}

ws_main() {
  WS_MODE=install; WS_SIM=0; WS_SEM_DESKTOP=0; WS_SUBST_SL=0
  local a
  for a in "$@"; do
    case "$a" in
      --check|-check|--verificar) WS_MODE=check ;;
      --doctor|-doctor|--diagnostico) WS_MODE=doctor ;;
      --desinstalar|--uninstall) WS_MODE=uninstall ;;
      --sem-desktop|--no-desktop) WS_SEM_DESKTOP=1 ;;
      --sim|--yes|-y) WS_SIM=1 ;;
      --substituir-statusline) WS_SUBST_SL=1 ;;
      --ajuda|--help|-h) ws_usage; return 0 ;;
      *) printf 'Opcao desconhecida: %s\n' "$a" >&2; ws_usage >&2; return 2 ;;
    esac
  done
  [ "$(uname -s)" = Darwin ] || { printf 'Este script e para macOS. No Windows usa o bootstrap-windows.ps1.\n' >&2; return 2; }
  [ -n "${HOME:-}" ] && [ -d "$HOME" ] || { printf 'HOME invalida.\n' >&2; return 2; }
  [ "$(id -u)" = 0 ] && { printf 'Nao corras o setup com sudo nem como root.\n' >&2; return 2; }

  WS_HOME="$HOME/.workshop-claude"; WS_LOG="$WS_HOME/setup.log"; WS_RESUMO="$WS_HOME/resumo.txt"
  CLAUDE_DIR="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
  WS_PROJ="$HOME/workshop-claude"
  # shellcheck disable=SC2088  # texto para mostrar, nao e um caminho a expandir
  WS_PROJ_SHOW='~/workshop-claude'
  WS_UA="workshop-claude-setup (curl; macOS)"
  mkdir -p "$WS_HOME" || { printf 'Sem permissao para criar %s\n' "$WS_HOME" >&2; return 1; }
  WS_TMP=$(mktemp -d "${TMPDIR:-/tmp}/ws-setup.XXXXXX") || return 1
  WS_STEP_LOG="$WS_TMP/inicio.log"
  if [ -t 1 ]; then WS_COLOR=1; else WS_COLOR=0; fi
  ws_lock || { rm -rf "$WS_TMP"; return 1; }
  trap ws_interrupted INT TERM HUP
  trap ws_cleanup EXIT

  # Modo dev (a correr de um clone do repositorio) ou modo release (valores injetados).
  WS_DEV=0; WS_DEV_ROOT=""
  local src=${BASH_SOURCE[0]:-} dir
  ws_injetado
  if [ -z "${WS_INJ_CONF:-}" ] && [ -n "$src" ] && [ -f "$src" ]; then
    dir=$(cd "$(dirname "$src")/.." 2>/dev/null && pwd -P)
    if [ -f "$dir/repos.conf" ] && [ -f "$dir/installer/install-user.mjs" ]; then WS_DEV=1; WS_DEV_ROOT=$dir; fi
  fi
  if [ "$WS_DEV" = 1 ]; then
    ws_conf_parse < "$WS_DEV_ROOT/repos.conf"
    WS_PRICING="$WS_DEV_ROOT/pricing.json"
    KIT_SRC=$WS_DEV_ROOT
  elif [ -n "${WS_INJ_CONF:-}" ]; then
    ws_conf_parse <<EOF
$WS_INJ_CONF
EOF
    WS_PRICING="$WS_TMP/pricing.json"; printf '%s\n' "$WS_INJ_PRICING" > "$WS_PRICING"
  else
    printf 'Este script tem de vir da release (com os valores injetados) ou correr dentro do repositorio.\n' >&2; return 2
  fi
  ws_path_setup
  # valores derivados (D_*) para as mensagens
  ws_repo_parts "$C_WORKSHOP_REPO_URL"; D_REPO_HOST=$R_HOST
  ws_repo_parts "$C_MEMORY_APP_REPO_URL"; D_MEMORY_HOST=$R_HOST
  [ "$D_MEMORY_HOST" = "$D_REPO_HOST" ] && D_MEMORY_HOST=""
  D_SETUP_MAC_URL=$(ws_release_url workshop setup-mac.sh)
  D_KIT_URL_MAC=$(ws_release_url workshop "workshop-kit-$C_WORKSHOP_VERSION.tar.gz")
  D_KIT_URL_WINDOWS=$(ws_release_url workshop "workshop-kit-$C_WORKSHOP_VERSION.zip")
  D_ONE_LINER_MAC="curl -fsSL $D_SETUP_MAC_URL | bash"
  D_ONE_LINER_WINDOWS="irm $(ws_release_url workshop bootstrap-windows.ps1) | iex"
  D_UV_INSTALL_SH_URL_V=$(ws_expand "$C_UV_INSTALL_SH_URL" "" "" "" "" "$C_UV_VERSION" "" "")
  D_UV_INSTALL_PS1_URL_V=$(ws_expand "$C_UV_INSTALL_PS1_URL" "" "" "" "" "$C_UV_VERSION" "" "")
  D_PROJETOS=$WS_PROJ_SHOW; D_MANIFEST="$WS_HOME/manifest.json"; D_LOG=$WS_LOG; D_RESUMO=$WS_RESUMO; D_BACKUP="$WS_HOME/backup"
  D_FLAG_SEM_DESKTOP=--sem-desktop; D_FLAG_STATUSLINE=--substituir-statusline
  local k n
  for k in $WS_CONF_KEYS; do n="C_$k"; printf -v "D_$k" '%s' "${!n}"; done
  WS_FILL_KEYS="$WS_CONF_KEYS REPO_HOST MEMORY_HOST SETUP_MAC_URL KIT_URL_MAC KIT_URL_WINDOWS ONE_LINER_MAC ONE_LINER_WINDOWS UV_INSTALL_SH_URL_V UV_INSTALL_PS1_URL_V PROJETOS MANIFEST LOG RESUMO BACKUP FLAG_SEM_DESKTOP FLAG_STATUSLINE"

  ws_load_messages || { printf 'Nao consegui ler as mensagens (setup/messages.pt.json).\n' >&2; return 2; }

  { printf '\n'; printf '=%.0s' 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20; printf ' %s · modo %s · %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$WS_MODE" "$C_WORKSHOP_VERSION"; } >> "$WS_LOG"

  ws_say "$(ws_bold "$(ws_msg titulo)")"
  case "$WS_MODE" in
    uninstall) ws_say "$(ws_msg modo_desinstalar MANIFEST="$WS_HOME/manifest.json")"; ws_uninstall; return $? ;;
    check) ws_say "$(ws_m tempo_check)" ;;
    doctor) ws_say "$(ws_m modo_doctor)"; ws_say "$(ws_m tempo_check)" ;;
    install)
      ws_say "$(ws_m instala)"
      local i=0 nn
      while [ "$i" -lt "${M_ui_instala_lista_n:-0}" ]; do nn="M_ui_instala_lista_$i"; ws_say "  • $(ws_fill "${!nn}")"; i=$((i + 1)); done
      ws_say "$(ws_m tempo)"
      [ "$WS_SIM" = 1 ] && ws_say "$(ws_m modo_sim)" ;;
  esac
  ws_say "$(ws_dim "$(ws_msg log_em LOG="$WS_LOG")")"
  ws_save_self

  ws_step 0
  ws_step 1
  ws_step 2
  ws_step 3 2
  ws_step 4
  ws_step 5
  ws_step 6
  ws_step 7 2
  ws_step 8 4
  ws_step 9 1 4
  ws_step 10 5
  ws_step 11
  ws_step 12 2 3
  [ "$WS_MODE" = install ] && ws_profile_update
  ws_registar_flush
  ws_summary
  [ "$WS_MODE" = doctor ] && ws_doctor
  [ "$WS_FALTAM" = 0 ]
}

if [ "${WS_SOURCE_ONLY:-0}" = 1 ]; then return 0; fi
ws_main "$@"
}
main "$@"
