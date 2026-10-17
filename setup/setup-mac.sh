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
# Opcoes: --check  --doctor  --uninstall  --no-desktop  --yes  --replace-statusline  --help
#   (as antigas --desinstalar --sem-desktop --sim --substituir-statusline --ajuda continuam a funcionar)
#
# Todo o codigo esta dentro de main(), chamado na ultima linha: um download incompleto nao executa nada.
# As perguntas e os logins leem de /dev/tty, por isso "curl | bash" funciona.
# O setup fala so ingles (D-20): os textos vem de setup/messages.en.json (o mesmo catalogo de docs/TROUBLESHOOTING.md).
# A lingua da maquina (WORKSHOP_LANG, a lingua guardada na instalacao, AppleLanguages, LC_ALL, LC_MESSAGES, LANG)
# so configura o resto: a "language" do Claude Code e a lingua dos textos do kit e dos projetos (pt ou en).

# Um bash nao interativo ("curl | bash", "bash ficheiro") ja leu o $BASH_ENV (um .bashrc partilhado) e importou as
# funcoes exportadas antes desta linha: desfaz-se o que mudam no setup (noclobber recusa os ">", errexit/nounset
# param a meio, xtrace mostra os comandos, uma funcao cd que corre ls suja os "$(cd X && pwd -P)", CDPATH, IFS,
# aliases). Aqui e nao dentro de main(): os aliases expandem-se quando o bash le a definicao de main. So neste
# processo e nos filhos dele (o BASH_ENV sai do ambiente: o install.sh do Claude e do uv nao o voltam a ler).
set +o noclobber +o errexit +o nounset +o pipefail +o xtrace +o verbose +o allexport +o noglob +o errtrace +o functrace 2>/dev/null
set +o posix 2>/dev/null
for _ws_o in expand_aliases failglob nullglob nocasematch nocaseglob dotglob extdebug; do shopt -u "$_ws_o" 2>/dev/null; done
unalias -a 2>/dev/null
trap - DEBUG ERR RETURN 2>/dev/null
unset -f cd pushd popd 2>/dev/null
# (os testes fazem "source" deste ficheiro com WS_SOURCE_ONLY=1 e tem as suas funcoes: so a execucao a serio as limpa)
if [ "${WS_SOURCE_ONLY:-0}" != 1 ]; then for _ws_o in $(compgen -A function); do unset -f "$_ws_o"; done; fi
unset _ws_o CDPATH BASH_ENV ENV GLOBIGNORE TMOUT POSIXLY_CORRECT
IFS=$' \t\n'

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
WS_NL='
'
# Limites de tempo (segundos, ws_timeout) dos comandos que esperam pela rede e podem ficar presos sem VPN ou com
# um proxy parado. O "auth status" tem mais tempo porque pode esperar pelo dialogo do Keychain.
WS_TMO_GH=25 WS_TMO_MCP=60 WS_TMO_AUTH=120 WS_TMO_SMOKE=90 WS_TMO_HELPER=90 WS_TMO_DOCTOR=180
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
ws_ver_of() { printf '%s' "$1" | grep --color=never -Eo '[0-9]+\.[0-9]+(\.[0-9]+)?' | head -n 1; }

# Filtro de redacao (mesmas regras que installer/lib/redact.mjs; casos em tools/test/redact-cases.json).
# Na ultima regra (chave=valor) a palavra-chave nao pode vir logo a seguir a um algarismo: em "1Password: agent"
# e o nome de um programa, nao um segredo.
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
    -e "s/(^|[^0-9])(([Tt][Oo][Kk][Ee][Nn]|[Ss][Ee][Cc][Rr][Ee][Tt]|[Pp][Aa][Ss][Ss][Ww][Oo][Rr][Dd]|[Pp][Aa][Ss][Ss][Ww][Dd]|[Aa][Pp][Ii][_-]?[Kk][Ee][Yy])[\"']?[[:blank:]]*[:=][[:blank:]]*[\"']?)[^\"'[:space:],&]+/\\1\\2***/g"
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
# Um dos servidores do workshop (NET_CHECK_HOSTS e os dos repositorios)? Um redirecionamento para outro e um filtro.
ws_host_known() { case " $C_NET_CHECK_HOSTS ${D_REPO_HOST:-} ${D_MEMORY_HOST:-} " in *" ${1%%:*} "*) return 0 ;; esac; return 1; }
# Servidor que falhou (o primeiro do detalhe: "host · url ..." ou "host1 host2"), para os comandos do E-NET-01/02.
ws_hint_host() { # detalhe
  local h=${1%% *}; h=${h%,}; h=${h#*://}; h=${h%%[/:?]*}
  case "$h" in *.*[a-zA-Z]) printf '%s' "$h" ;; *) printf 'api.anthropic.com' ;; esac
}
# URL para testar esse servidor. A raiz do claude.ai e do downloads.claude.ai responde 403 ao curl mesmo numa rede
# aberta: para esses testa-se o instalador.
ws_hint_url() { # detalhe
  local h; h=$(ws_hint_host "$1")
  case "$h" in claude.ai|downloads.claude.ai) printf '%s' "$C_CLAUDE_INSTALL_SH_URL" ;; *) printf 'https://%s/' "$h" ;; esac
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

# Lingua da maquina (D-20): etiqueta como "pt-PT", "he" ou "en". Mesmas regras que installer/lib/languages.mjs;
# casos partilhados em tools/test/language-cases.json.
ws_lang_tag() { # texto -> etiqueta normalizada (vazio se nao houver informacao: '', C, POSIX, ou nao for uma etiqueta)
  local t=${1%%.*} base rest out p
  t=${t%%@*}; t=${t//_/-}; t=$(ws_trim "$t")
  case "$t" in ''|C|c|POSIX|posix) return 0 ;; esac
  # So letras e algarismos ASCII e '-': acentos, bytes Latin-1, '*', ',' e espacos nao sao etiquetas
  # (assim o "for p in $rest" abaixo nunca expande nomes de ficheiros e o tr nunca ve bytes invalidos).
  case "$t" in *[!abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-]*) return 0 ;; esac
  base=$(printf '%s' "${t%%-*}" | LC_ALL=C tr '[:upper:]' '[:lower:]')
  case "$base" in [a-z][a-z]|[a-z][a-z][a-z]) ;; *) return 0 ;; esac   # klingon, portuguese, brasil: sem informacao
  [ "$base" = utf ] && return 0                                        # "UTF-8" e um charset, nao uma lingua
  [ "$base" = iw ] && base=he
  out=$base
  case "$t" in *-*) rest=${t#*-} ;; *) rest="" ;; esac
  local IFS=-
  for p in $rest; do
    [ -n "$p" ] || continue
    [ "${#p}" -le 8 ] || return 0                                      # subetiquetas BCP 47: 1 a 8 caracteres
    case ${#p} in
      2) p=$(printf '%s' "$p" | LC_ALL=C tr '[:lower:]' '[:upper:]') ;;
      4) p="$(printf '%s' "${p:0:1}" | LC_ALL=C tr '[:lower:]' '[:upper:]')$(printf '%s' "${p:1}" | LC_ALL=C tr '[:upper:]' '[:lower:]')" ;;
    esac
    out="$out-$p"
  done
  printf '%s' "$out"
}
# WORKSHOP_LANG (e a lingua guardada na instalacao) so contam se forem uma das linguas do workshop: uma
# gralha como "br", "brasil" ou "pt-*" nao pode ganhar a lingua da maquina (o kit ficava em ingles).
ws_lang_ok() { case "$(ws_lang_tag "$1")" in pt|pt-*|en|en-*|hi|hi-*|he|he-*) return 0 ;; esac; return 1; }
ws_lang_pick() { # WORKSHOP_LANG "defaults read -g AppleLanguages" LC_ALL LC_MESSAGES LANG -> etiqueta (en se nada servir)
  local t="" c
  ws_lang_ok "$1" && t=$(ws_lang_tag "$1")
  if [ -z "$t" ]; then
    c=$(printf '%s\n' "$2" | LC_ALL=C sed -n 's/^[[:space:]]*"\{0,1\}\([A-Za-z][A-Za-z0-9_-]*\)"\{0,1\},\{0,1\}[[:space:]]*$/\1/p' | head -n 1)
    t=$(ws_lang_tag "$c")
  fi
  for c in "$3" "$4" "$5"; do [ -n "$t" ] && break; t=$(ws_lang_tag "$c"); done
  printf '%s' "${t:-en}"
}
ws_lang_kit() { case "$1" in pt|pt-*) printf pt ;; *) printf en ;; esac; }  # o kit so tem textos pt e en
# Valor de texto de um campo num JSON simples escrito pelo kit ($2: nomes alternativos, ex.: 'language|lingua').
ws_json_field() { LC_ALL=C sed -n -E "s/.*\"($2)\"[[:space:]]*:[[:space:]]*\"([^\"]*)\".*/\\2/p" "$1" 2>/dev/null | head -n 1; }
# Etiqueta guardada na instalacao (kit/language.json "machine"; lingua.json "maquina" nas instalacoes antigas).
ws_lang_saved() {
  local f v
  for f in "$WS_HOME/kit/language.json" "$WS_HOME/kit/lingua.json"; do
    [ -f "$f" ] || continue
    v=$(ws_json_field "$f" 'machine|maquina')
    ws_lang_ok "$v" && { ws_lang_tag "$v"; return 0; }
  done
  return 0
}
# Ordem: WORKSHOP_LANG (se for uma lingua do workshop), a lingua guardada na instalacao, a lingua da maquina.
# A lingua guardada vem primeiro para uma janela nova, o --check ou "VAR=x curl | bash" (a variavel fica no curl)
# nao trocarem a lingua escolhida na instalacao pela do sistema; so o WORKSHOP_LANG a muda.
# WS_LANG_IGNORADA: WORKSHOP_LANG nao reconhecido (para a nota do passo 0); WS_LANG_MAQUINA: a lingua do sistema.
ws_lang_detect() {
  local w=${WORKSHOP_LANG:-} apple saved=""
  WS_LANG_IGNORADA=""; WS_LANG_GUARDADA=""
  if [ -n "$(ws_trim "$w")" ] && ! ws_lang_ok "$w"; then
    WS_LANG_IGNORADA=$(printf '%s' "${w:0:40}" | LC_ALL=C tr -d '\000-\037\177'); w=""
  fi
  apple=$(defaults read -g AppleLanguages 2>/dev/null </dev/null)
  WS_LANG_MAQUINA=$(ws_lang_pick "" "$apple" "${LC_ALL:-}" "${LC_MESSAGES:-}" "${LANG:-}")
  [ -z "$w" ] && saved=$(ws_lang_saved)
  if [ -n "$w" ]; then WS_LANG=$(ws_lang_tag "$w")
  elif [ -n "$saved" ]; then WS_LANG=$saved; WS_LANG_GUARDADA=$saved
  else WS_LANG=$WS_LANG_MAQUINA; fi
  WS_LANG_KIT=$(ws_lang_kit "$WS_LANG")
}

# ---------------------------------------------------------------- JS (node se houver, senao JXA)
ws_js() { # codigo-js args...  (o codigo define o corpo de main(A) e devolve texto)
  local code=$1 f; shift
  ws_tmp_gone
  f="$WS_TMP/js-$RANDOM.js"
  if [ -n "${WS_NODE:-}" ] && [ -x "$WS_NODE" ]; then
    { printf '%s\n' 'var readText=function(p){return require("fs").readFileSync(p,"utf8");};'
      printf 'var main=function(A){\n%s\n};\n' "$code"
      printf '%s\n' 'var r=main(process.argv.slice(2)); if(r!==undefined&&r!==null) process.stdout.write(String(r));'
    } 2>/dev/null > "$f" || return 1   # disco cheio ou pasta temporaria apagada: sem script, nada a correr
    # Um erro do node (pilha de chamadas) vai para o log do passo, nunca para o ecra.
    "$WS_NODE" "$f" "$@" </dev/null 2>>"${WS_STEP_LOG:-/dev/null}"
  else
    { printf '%s\n' 'ObjC.import("Foundation");' 'var readText=function(p){var s=$.NSString.stringWithContentsOfFileEncodingError(p,$.NSUTF8StringEncoding,null); return s.isNil()?"":ObjC.unwrap(s);};'
      printf 'var main=function(A){\n%s\n};\n' "$code"
      printf '%s\n' 'function run(argv){var r=main(argv); return (r===undefined||r===null)?"":String(r);}'
    } 2>/dev/null > "$f" || return 1
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
// Para o resumo: so a primeira linha com texto, sem espacos nas pontas e com no maximo 40 caracteres (o Haiku pode
// juntar avisos, ex.: um MCP que pede login; o resto fica no log).
var r1=String(r.result||"").replace(/^\s+/,"").split(/[\r\n]/)[0].replace(/\s+$/,""), r1c=Array.from?Array.from(r1):r1.split("");
line("resposta_curta", r1c.length>40 ? r1c.slice(0,39).join("")+"\u2026" : r1);
function res(id){
  if(!pr||!id) return null;
  var m=String(id).toLowerCase().replace(/\[.*\]$/,"");
  if(pr.aliases&&pr.aliases[m]) return pr.aliases[m];
  var ks=Object.keys(pr.models||pr.modelos||{}).sort(function(a,b){return b.length-a.length;});
  for(var i=0;i<ks.length;i++){var k=ks[i]; if(m===k||m.indexOf(k+"-")===0||m.indexOf(k+"@")===0) return k;}
  return null;
}
var mu=r.modelUsage||{}, tot=0, unk=false;
for(var id in mu){
  if(!mu.hasOwnProperty(id)) continue;
  var u=mu[id]||{}, k=res(id);
  if(!k){unk=true; line("desconhecido",id); continue;}
  var p=(pr.models||pr.modelos)[k], it=u.inputTokens||0, cr=u.cacheReadInputTokens||0, cw=u.cacheCreationInputTokens||0, ot=u.outputTokens||0;
  var lp=p.long_prompt||p.prompt_longo;
  if(lp&&(it+cr+cw)>(lp.above_tokens!==undefined?lp.above_tokens:lp.acima_de_tokens)) p=lp;
  tot+=(it*p.input+ot*p.output+cw*p.cache_write_5m+cr*p.cache_read)/1e6;
}
if(unk||!pr){ line("usd",""); line("usd_texto","US$ ?"); }
else { line("usd",tot); line("usd_texto","US$ "+tot.toFixed(tot<0.01?4:2)); }
var so=r.structured_output;
if(!so&&typeof r.result==="string"){ try{ var mm=r.result.match(/\{[\s\S]*\}/); if(mm) so=JSON.parse(mm[0]); }catch(e){} }
if(so&&typeof so==="object"){ line("causa", so.causa||""); var cs=so.comandos||[]; for(var i=0;i<cs.length;i++) line("cmd", cs[i]); }
return out.join("\n")+"\n";
__WS_JS__

# Para o ws_newterm (node -e): segundos ficheiro-de-saida shell args... Corre o shell numa sessao nova (setsid:
# sem terminal de controlo), com o ambiente de uma janela nova do Terminal, o stdout num ficheiro (um processo
# que o .zshrc deixe a correr nao segura nada) e no fim mata o grupo inteiro. Sai com 3 se o shell nao acabou
# a tempo ou nao arrancou, com 130 se o setup foi interrompido. Um node que rebenta (dyld, "Abort trap: 6")
# so acaba o shell: o que ele escreveu antes conta.
IFS= read -r -d '' WS_JS_NEWTERM <<'__WS_JS__' || true
var a=process.argv.slice(1), e=process.env, fs=require("fs"), done=false, cp, t;
var env={HOME:e.HOME, USER:e.USER, LOGNAME:e.LOGNAME||e.USER, SHELL:a[2], TERM:e.TERM||"xterm-256color", LANG:e.LANG, TMPDIR:e.TMPDIR, PATH:"/usr/bin:/bin:/usr/sbin:/sbin"};
for(var k in env) if(!env[k]) delete env[k];
function end(code){ if(done) return; done=true; clearTimeout(t); if(cp&&cp.pid>0){ try{ process.kill(-cp.pid,"SIGKILL"); }catch(x){} } process.exit(code); }
["SIGINT","SIGTERM","SIGHUP"].forEach(function(s){ process.on(s,function(){ end(130); }); });
try { cp=require("child_process").spawn(a[2], a.slice(3), {detached:true, stdio:["ignore", fs.openSync(a[1],"w"), "ignore"], env:env, cwd:e.HOME}); } catch(x) { end(3); }
t=setTimeout(function(){ end(3); }, Number(a[0])*1000);
cp.on("error",function(){ end(3); });
cp.on("exit",function(){ end(0); });
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

# Caminho para mostrar: o HOME como ~.
ws_tilde() { case "$1" in "$HOME"/*) printf '~%s' "${1#"$HOME"}" ;; *) printf '%s' "$1" ;; esac; }

ws_err_field() { # codigo campo
  local c=${1//-/_} n; n="M_erros_${c}_$2"; printf '%s' "${!n:-}"
}

ws_err_list() { # codigo campo (fazer|mac) [CHAVE=valor...] -> uma linha por item
  local c=${1//-/_} f=$2 n i cnt; shift 2; n="M_erros_${c}_${f}_n"; cnt=${!n:-0}
  i=0; while [ "$i" -lt "$cnt" ]; do n="M_erros_${c}_${f}_$i"; ws_fill "${!n}" "$@"; printf '\n'; i=$((i + 1)); done
}

# ---------------------------------------------------------------- saida e log
ws_log() { printf '%s %s\n' "$(date '+%H:%M:%S')" "$*" | ws_redact 2>/dev/null >> "$WS_LOG" || true; }
ws_say() { printf '%s\n' "$*"; printf '%s\n' "$*" | ws_redact 2>/dev/null >> "$WS_LOG" || true; }
ws_bold() { if [ "$WS_COLOR" = 1 ]; then printf '\033[1m%s\033[0m' "$1"; else printf '%s' "$1"; fi; }
ws_dim() { if [ "$WS_COLOR" = 1 ]; then printf '\033[2m%s\033[0m' "$1"; else printf '%s' "$1"; fi; }
# Negrito e cinzento so num terminal que os mostra (TERM=dumb e NO_COLOR desligam).
# (O ws_env_sanitize poe NO_COLOR=1 para os comandos que o setup corre: conta o que a pessoa tinha, WS_NO_COLOR0.)
ws_color_detect() { if [ -t 1 ] && [ "${TERM:-dumb}" != dumb ] && [ -z "${WS_NO_COLOR0-${NO_COLOR:-}}" ]; then WS_COLOR=1; else WS_COLOR=0; fi; }

ws_has_tty() { [ -r /dev/tty ] && [ -w /dev/tty ] && { : </dev/tty; } 2>/dev/null; }
# Se outro programa ficou com o terminal, ler dele suspende o setup ("zsh: suspended (tty input)").
# Avisa antes, para a pessoa saber que "fg" + Enter continua.
ws_tty_fg_check() {
  local pg tp
  pg=$(ps -o pgid= -p $$ 2>/dev/null | tr -d ' '); tp=$(ps -o tpgid= -p $$ 2>/dev/null | tr -d ' ')
  if [ -n "$pg" ] && [ -n "$tp" ] && [ "$tp" != "$pg" ] && [ "$tp" != "-1" ]; then
    ws_log "tty: setup not in the foreground (pgid $pg, tpgid $tp)"
    printf '\n  %s\n' "$(ws_m tty_fg)" > /dev/tty
  fi
}

# Deita fora o que foi escrito antes de uma pergunta ou de um login (um Enter carregado durante um download,
# o comando colado duas vezes): so conta o que a pessoa escreve depois de ver a pergunta.
# So em primeiro plano: o stty em segundo plano suspende o setup (SIGTTOU). Sem read -t/-n (bash 3.2).
ws_tty_drain() {
  local pg tp
  pg=$(ps -o pgid= -p $$ 2>/dev/null | tr -d ' '); tp=$(ps -o tpgid= -p $$ 2>/dev/null | tr -d ' ')
  [ -n "$pg" ] && [ "$pg" = "$tp" ] || return 0
  # Num subshell, para o terminal voltar sempre ao modo normal, mesmo com Ctrl-C a meio.
  (
    old=$(stty -g </dev/tty 2>/dev/null) || exit 0
    trap 'stty "$old" </dev/tty 2>/dev/null; exit 1' INT TERM HUP
    stty -icanon min 0 time 0 </dev/tty 2>/dev/null || exit 0
    cat </dev/tty >/dev/null 2>&1
    stty "$old" </dev/tty 2>/dev/null
  )
  return 0
}

# Pergunta sim/nao. $1 texto, $2 defeito (s|n), $3 "nunca-sim" para nao aceitar o --sim.
ws_ask() {
  local q=$1 def=${2:-n} nosim=${3:-} ans hint tries=0
  if [ "$def" = s ]; then hint=$(ws_m sn); else hint=$(ws_m ns); fi
  if [ "$WS_SIM" = 1 ] && [ "$nosim" != nunca-sim ]; then ws_say "  ? $q $hint y (--yes)"; return 0; fi
  if [ "$WS_SIM" = 1 ]; then ws_say "  ? $q $hint n (--yes)"; return 1; fi
  if ! ws_has_tty; then ws_say "  ? $q $hint n · $(ws_m sem_tty)"; return 1; fi
  ws_tty_fg_check
  ws_tty_drain
  while :; do
    printf '  ? %s %s ' "$q" "$hint" > /dev/tty
    IFS= read -r ans < /dev/tty || ans=""
    ans=$(ws_trim "$ans")
    ws_log "question: $q -> ${ans:-<enter>}"
    case "$ans" in
      [SsYy]*) return 0 ;;
      [Nn]*) return 1 ;;
      '') [ "$def" = s ]; return ;;
    esac
    # Outra coisa (um comando colado, "talvez"): pergunta outra vez; a terceira assim conta como "nao".
    tries=$((tries + 1)); [ "$tries" -lt 3 ] || return 1
    printf '  %s\n' "$(ws_m sn_repetir)" > /dev/tty
  done
}

# Corre um comando com a saida (stdout+stderr) no log do passo. Devolve o codigo de saida.
ws_run() {
  ws_log "\$ $*"
  "$@" </dev/null >> "$WS_STEP_LOG" 2>&1
  local rc=$?
  ws_log "  -> exit $rc"
  return $rc
}

# Corre um comando com limite de tempo (o macOS nao tem timeout(1)). Devolve 124 se passar o limite.
# O comando fica no seu proprio grupo de processos: no fim do tempo leva TERM e depois KILL, com os filhos
# (o gh e o acli sao programas Go e ignoram o SIGALRM). Um Ctrl-C (INT/TERM/HUP) tambem termina o grupo e
# chega a seguir ao setup (a trap ws_interrupted corre como antes). O stdin passa para o comando.
# As variaveis PERL5* da pessoa ficam vazias so para este perl. Sem perl, o comando corre sem limite.
ws_timeout() { # segundos comando [args...]
  local s=$1; shift
  [ -x /usr/bin/perl ] || { "$@"; return; }
  PERL5OPT='' PERL5LIB='' PERLLIB='' /usr/bin/perl -e '
    my $t = shift; my $p = fork; defined $p or exit 125;
    if (!$p) { setpgrp(0, 0); exec { $ARGV[0] } @ARGV; exit 127 }
    setpgrp($p, $p);
    my $stop = sub { kill "TERM", -$p; select(undef, undef, undef, 0.5); kill "KILL", -$p; waitpid($p, 0) };
    $SIG{ALRM} = sub { $stop->(); exit 124 };
    $SIG{$_} = sub { my $g = shift; $stop->(); $SIG{$g} = "DEFAULT"; kill $g, $$ } for qw(INT TERM HUP);
    alarm $t; waitpid($p, 0); exit($? & 127 ? 128 + ($? & 127) : $? >> 8)' "$s" "$@"
}

# Corre um login interativo no terminal (claude, gh, acli). Um Ctrl-C cancela so o login e o setup continua:
# com "curl | bash" o Ctrl-C chega tambem ao bash do setup, que sem isto saia logo, sem os outros passos nem o resumo.
# A trap tem de ser um comando (nao ''): assim o login recebe o SIGINT normal e termina.
ws_run_login() {
  ws_tty_drain  # teclas escritas antes (G1): nao respondem ao login
  WS_LOGIN_INT=0
  trap 'WS_LOGIN_INT=1' INT
  "$@" </dev/tty >/dev/tty 2>&1
  trap ws_interrupted INT
  if [ "$WS_LOGIN_INT" = 1 ]; then
    { printf '\n' > /dev/tty; } 2>/dev/null
    ws_log "login cancelled (Ctrl-C)"; ws_note "$(ws_m login_cancelado)"
  fi
  return 0
}

ws_flush_step_log() {
  [ -s "$WS_STEP_LOG" ] || return 0
  { printf -- '--- command output (step %s) ---\n' "$WS_CUR"; cat "$WS_STEP_LOG"; printf -- '--- end ---\n'; } | ws_redact 2>/dev/null >> "$WS_LOG" || true
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

# Limites de todos os downloads: ligar em 20 s; uma transferencia parada (menos de 1 KB/s durante 60 s, ex.: WiFi
# cheio) falha com o codigo 28 e o curl tenta mais 2 vezes. Sem --max-time: um download lento mas a andar nunca e cortado.
WS_CURL_LIMITS="--retry 2 --connect-timeout 20 --speed-limit 1024 --speed-time 60"
# HTTP final, HTTP do CONNECT do proxy (o 407 de um proxy com autenticacao so aparece ai) e o URL final (depois do -L).
WS_CURL_W='%{http_code} %{http_connect} %{url_effective}'

# Codigo HTTP a partir de http_code e http_connect: um 407 (ou outra recusa) no CONNECT do proxy conta como esse codigo.
ws_http_of() { # http_code http_connect
  case "${2:-000}" in 407) echo 407; return ;; 000|2??) ;; *) [ "${1:-000}" = 000 ] && { echo "$2"; return; } ;; esac
  echo "${1:-000}"
}

# Pagina web (bloqueio de um filtro ou proxy, portal de WiFi) em vez do ficheiro: comeca por uma marca HTML.
# Os scripts comecam por "#!" e os arquivos por bytes binarios, por isso nunca dao falso positivo.
ws_is_html() {
  head -c 512 "$1" 2>/dev/null | LC_ALL=C tr -d ' \t\r\n\357\273\277' | head -c 160 |
    LC_ALL=C grep -aqiE '^(<\?xml[^>]*>)?(<!--[^>]*-->)?<(!doctypehtml|html|head|body)'
}

# Enquanto um download corre, mostra de 30 em 30 s quanto ja chegou (nunca mais de um minuto sem nada no ecra).
ws_heartbeat() { # ficheiros ou pastas a medir
  local mb
  while sleep "${WS_HB_EVERY:-30}" >/dev/null 2>&1; do
    mb=$(du -skc "$@" 2>/dev/null | tail -n 1 | LC_ALL=C awk '{ m = $1 / 1024; if (m < 10) printf "%.1f", m; else printf "%d", m }')
    printf '  %s\n' "$(ws_msg a_descarregar_mb MB="${mb:-0}")"
  done
}
ws_hb_start() { ws_hb_stop; ws_heartbeat "$@" & WS_HB=$!; }
ws_hb_stop() { [ -n "${WS_HB:-}" ] || return 0; kill "$WS_HB" 2>/dev/null; wait "$WS_HB" 2>/dev/null; WS_HB=""; }

# Pasta para CURL_HOME dos instaladores oficiais (install.sh do Claude Code e do uv), que chamam o curl sem limites:
# o curlrc da pessoa (proxy, certificados...) mais os limites do setup, que vem depois e por isso ganham.
ws_curl_home() {
  local d="$WS_TMP/curlhome" f
  mkdir -p "$d"
  # A mesma ordem que o curl: $CURL_HOME/.curlrc, $XDG_CONFIG_HOME/curlrc, ~/.curlrc (so o primeiro que existir).
  for f in "${CURL_HOME:+$CURL_HOME/.curlrc}" "${XDG_CONFIG_HOME:+$XDG_CONFIG_HOME/curlrc}" "$HOME/.curlrc"; do
    [ -n "$f" ] && [ -f "$f" ] && { cat "$f" 2>/dev/null; printf '\n'; break; }
  done >| "$d/.curlrc"
  printf '%s\n' 'connect-timeout = 20' 'speed-limit = 1024' 'speed-time = 60' 'retry = 2' >> "$d/.curlrc"
  printf '%s' "$d"
}
# Um instalador oficial falhou por causa da rede? O curl dele escreve "curl: (N) ..." no log do passo (so se olha
# para o que veio depois de $1 bytes). Devolve o codigo de rede; nada (1) se nao for claramente a rede.
ws_installer_net_code() { # bytes-do-log-antes
  local line rc c
  line=$(tail -c +"$(( ${1:-0} + 1 ))" "$WS_STEP_LOG" 2>/dev/null | grep -aE 'curl: \([0-9]+\)' | tail -n 1)
  [ -n "$line" ] || return 1
  case "$line" in *"Operation too slow"*|*"transfer closed with"*) echo E-NET-07; return 0 ;; esac
  rc=${line#*curl: (}; rc=${rc%%)*}
  c=$(ws_net_code "$rc" 000); [ "$c" = E-NET-07 ] && return 1
  echo "$c"
}

# Download para um ficheiro (via .part). $3=auth envia o REPO_TOKEN so ao servidor do repositorio.
# Define WS_DL_HTTP (codigo HTTP, ver ws_http_of; "html" se veio uma pagina web em vez do ficheiro), WS_DL_RC
# (codigo do curl) e WS_DL_HOST (o servidor final, so se o pedido foi redirecionado para outro).
ws_dl() {
  local url=$1 out=$2 auth=${3:-} part="$2.part" host w code conn
  rm -f "$part"
  # Disco cheio (WS_DISK_FULL, ver ws_disk_full) e ainda cheio: nem se descarrega (curl 23, erro de escrita).
  if [ "${WS_DISK_FULL:-0}" = 1 ] && ws_disk_full; then ws_log "download skipped, disk full: $url"; WS_DL_RC=23; WS_DL_HTTP=000; WS_DL_HOST=""; return 23; fi
  ws_log "download: $url"
  host=${url#*://}; host=${host%%/*}; WS_DL_URLHOST=$host
  ws_hb_start "$part"
  # shellcheck disable=SC2086  # WS_CURL_LIMITS sao varias opcoes
  if [ "$auth" = auth ] && [ -n "${REPO_TOKEN:-}" ] && { [ "$host" = "$D_REPO_HOST" ] || [ "$host" = "${D_MEMORY_HOST:-$D_REPO_HOST}" ]; }; then
    w=$(printf 'header = "Authorization: token %s"\n' "$REPO_TOKEN" |
      curl -fsSL $WS_CURL_LIMITS -A "$WS_UA" -w "$WS_CURL_W" -K - -o "$part" "$url" 2>>"$WS_STEP_LOG")
  else
    w=$(curl -fsSL $WS_CURL_LIMITS -A "$WS_UA" -w "$WS_CURL_W" -o "$part" "$url" 2>>"$WS_STEP_LOG" </dev/null)
  fi
  WS_DL_RC=$?
  ws_hb_stop
  code=${w%% *}; w=${w#"$code"}; w=${w# }; conn=${w%% *}; w=${w#"$conn"}; w=${w# }
  WS_DL_HTTP=$(ws_http_of "$code" "$conn")
  # So o nome do servidor final vai para o log: os URLs de release-assets levam uma assinatura na query string.
  WS_DL_HOST=${w#*://}; WS_DL_HOST=${WS_DL_HOST%%[/?]*}
  [ "$WS_DL_HOST" = "$host" ] && WS_DL_HOST=""
  ws_log "  -> curl $WS_DL_RC, HTTP $WS_DL_HTTP${WS_DL_HOST:+, redirected to $WS_DL_HOST}"
  if [ "$WS_DL_RC" -eq 0 ] && [ -s "$part" ] && ws_is_html "$part"; then
    ws_log "  -> HTML page instead of the file (proxy, content filter or WiFi login page)"
    WS_DL_RC=1; WS_DL_HTTP=html
  fi
  if [ "$WS_DL_RC" -eq 0 ] && [ -s "$part" ]; then mv -f "$part" "$out"; return 0; fi
  rm -f "$part"
  [ "$WS_DL_RC" -eq 0 ] && WS_DL_RC=1
  return "$WS_DL_RC"
}

# Download com verificacao do SHA-256. Se nao bater certo (ficheiro truncado ou alterado pelo caminho), apaga-o e
# descarrega uma segunda vez. 0 = ok; 1 = o download falhou (ver WS_DL_*); 2 = o SHA-256 nao bate certo.
ws_dl_check() { # url destino sha256-esperado [auth]
  local want got try=1
  want=$(printf '%s' "$3" | tr 'A-F' 'a-f')
  while :; do
    ws_dl "$1" "$2" "${4:-}" || return 1
    got=$(ws_sha256 "$2")
    [ -n "$want" ] && [ "$got" = "$want" ] && return 0
    ws_log "  -> SHA-256 $got != ${want:-?} (try $try)"
    rm -f "$2"
    [ -n "$want" ] && [ "$try" = 1 ] || return 2
    try=2
  done
}

# Falha de um download (depois de ws_dl): o codigo vem do curl/HTTP; o detalhe comeca sempre pelo servidor que o IT
# tem de libertar: o final, quando o pedido foi redirecionado para outro servidor do workshop (ex.: github.com ->
# release-assets.githubusercontent.com), senao o do URL. Um redirecionamento para outro servidor (a pagina de
# bloqueio de um filtro) vai no fim, como "redirecionado para".
ws_dl_fail() { # o-que-falhou
  local d=$1 h=${WS_DL_HOST:-} u=${WS_DL_URLHOST:-}
  if [ -n "$h" ] && ws_host_known "$h"; then d="$h · $d"
  else
    [ -n "$h" ] && d="$d · $(ws_msg dl_redirigido HOST="$h")"
    case "$d" in *"://"*|"$u "*|"") ;; *) [ -n "$u" ] && d="$u · $d" ;; esac
  fi
  case "${WS_DL_HTTP:-}" in [45]??) d="$d · HTTP $WS_DL_HTTP" ;; html) d="$d · $(ws_m dl_html)" ;; esac
  ws_fail "$(ws_net_code "${WS_DL_RC:-1}" "${WS_DL_HTTP:-000}")" "$d"
}

# Codigo de erro de rede a partir do codigo do curl / HTTP (HTTP ja passado por ws_http_of).
# Com o proxy da sessao morto (WS_PROXY_DEAD, ver ws_detect_proxy), "nao liga" e "nao resolve" sao do proxy.
ws_net_code() { # rc http
  case "$2" in 407) echo E-NET-03; return ;; 403|451|html) echo E-NET-01; return ;; esac
  # A resposta chegou (2xx) e a transferencia parou ou partiu-se a meio: falha passageira, nao um bloqueio.
  case "$1:$2" in 18:2??|28:2??|56:2??|92:2??) echo E-NET-07; return ;; esac
  case "$1" in
    5|97) echo E-NET-03 ;;
    6) if [ "${WS_PROXY_DEAD:-0}" = 1 ]; then echo E-NET-03; else echo E-NET-02; fi ;;
    7|28) if [ "${WS_PROXY_DEAD:-0}" = 1 ]; then echo E-NET-03; else echo E-NET-01; fi ;;
    52|55|56) echo E-NET-01 ;;
    # 77: o ficheiro de certificados que o curl devia ler nao existe (SSL_CERT_FILE, CURL_CA_BUNDLE, o cacert do ~/.curlrc).
    77) echo E-NET-09 ;;
    35|51|53|54|58|59|60|83|90|91) echo E-NET-04 ;;
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
  ws_log "warning $1 ${2:-}"
}
ws_fail() { # codigo [detalhe]
  printf -v "SF_$WS_CUR" '%s|%s' "$1" "${2:-}"
  ws_log "failure $1 ${2:-}"
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
  local c=$1 d=$2 ind=$3 pre=${4:-} line fic
  # nos comandos: o servidor que falhou (E-NET-01/02), o ficheiro de perfil (E-PROF-01/02) e a pasta do projeto
  # (E-DEMO-03), tirados do detalhe
  fic=${d:-"~/.zshrc"}; fic=${fic/#"~"/$HOME}; fic=$(ws_show_path "$fic")
  ws_say "${ind}${pre}$(ws_bold "$(ws_fill "$(ws_err_field "$c" titulo)")")"
  ws_say "${ind}$(ws_m porque): $(ws_fill "$(ws_err_field "$c" causa)")${d:+ ($d)}"
  ws_say "${ind}$(ws_m fazer):"
  while IFS= read -r line; do [ -n "$line" ] && ws_say "${ind}  - $line"; done <<EOF
$(ws_err_list "$c" fazer)
EOF
  while IFS= read -r line; do [ -n "$line" ] && ws_say "${ind}    \$ $line"; done <<EOF
$(ws_err_list "$c" mac HOST="$(ws_hint_host "$d")" URL="$(ws_hint_url "$d")" FICHEIRO="$fic" NOME="${d##*/}")
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
  # Sem detalhe, o resumo mostra o titulo do codigo (da falha ou do primeiro aviso), para a linha nao ficar vazia.
  if [ -z "$d" ] && [ -n "$f" ]; then ws_set SD "$n" "$(ws_fill "$(ws_err_field "${f%%|*}" titulo)") (${f%%|*})"
  elif [ -z "$d" ] && [ -n "$w" ]; then line=${w%%$'\n'*}; ws_set SD "$n" "$(ws_fill "$(ws_err_field "${line%%|*}" titulo)") (${line%%|*})"; fi
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
  WS_CUR=$n; WS_STEP_FAILED=""
  # A pasta temporaria apagada entre passos volta a existir; sem espaco para o log do passo, o log e o /dev/null
  # (assim cada "2>>" do passo nao falha antes de correr o comando, nem escreve erros do bash no ecra).
  ws_tmp_gone; WS_TMP_WIPED_STEP=""
  WS_STEP_LOG="$WS_TMP/passo-$n.log"; { : > "$WS_STEP_LOG"; } 2>/dev/null || WS_STEP_LOG=/dev/null
  ws_set SD "$n" ""; ws_set SW "$n" ""; ws_set SF "$n" ""; ws_set SN "$n" ""
  local title="M_passos_$n"; title=${!title}
  ws_say ""
  ws_say "$(ws_bold "$(ws_msg passo N="$n" TITULO="$title")")"
  ws_log "=== step $n: $title (mode $WS_MODE)"
  for d in "$@"; do
    case "$(ws_st "$d")" in falhou|naoexec|falta)
      ws_set ST "$n" naoexec; ws_detail "$(ws_msg dep_falhou N="$d")"; ws_print_result "$n"; return 0 ;;
    esac
  done
  if [ "$n" = 11 ] && [ "$WS_SEM_DESKTOP" = 1 ]; then
    ws_set ST "$n" saltado; ws_detail "--no-desktop"; ws_print_result "$n"; return 0
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
    local f="SF_$n" prev=""; [ -n "${!f}" ] || ws_fail "$(ws_default_code "$n")" ""
    ws_fail_reclass
    # "Ainda nao instalado": a causa real da ultima instalacao (se falhou) vem do setup.log, porque o
    # --check e o --doctor nao voltam a correr a instalacao.
    if ws_is_missing_code "${!f%%|*}"; then prev=$(ws_last_install_result "$n"); ws_fail E-SETUP-01 "${!f%%|*}"; fi
    if ws_nonblocking "$n"; then ws_set ST "$n" aviso; ws_warn "${!f%%|*}" "${!f#*|}"; ws_set SF "$n" ""
    else ws_set ST "$n" falta; fi
    [ -n "$prev" ] && ws_warn "${prev%%|*}" "${prev#*|}"
  else
    ws_set SW "$n" ""
    ws_set SF "$n" ""
    # Disco cheio (no passo 0 ou num passo anterior) e ainda cheio: os passos que descarregam nem tentam instalar
    # (cada um falhava com outra causa, a rede ou o GitHub, e descarregava tudo outra vez). O que ja esta feito fica;
    # os logins (3, 6), o MCP (7) e o teste final (12) correm, e uma falha deles passa a E-SO-06 (ws_fail_reclass).
    local ok=1
    if [ "${WS_DISK_FULL:-0}" = 1 ] && case "$n" in 1|2|4|5|8|9|10|11) true ;; *) false ;; esac && ws_disk_full; then
      ws_fail E-SO-06 "$(ws_disk_detail)"; ok=0
    elif ! "ws_s${n}_install"; then ok=0; fi
    if [ "$ok" = 1 ]; then
      local w="SW_$n"; if [ -n "${!w}" ]; then ws_set ST "$n" aviso; else ws_set ST "$n" feito; fi
    else
      local f="SF_$n"; [ -n "${!f}" ] || ws_fail "$(ws_default_code "$n")" ""
      ws_fail_reclass
      WS_STEP_FAILED=${!f}
      if ws_nonblocking "$n"; then
        ws_set ST "$n" aviso; ws_warn "${!f%%|*}" "${!f#*|}"; ws_set SF "$n" ""
      else
        ws_set ST "$n" falhou
      fi
    fi
  fi
  ws_flush_step_log
  [ "$WS_MODE" = install ] && ws_log "result step $n: $(ws_st "$n") $WS_STEP_FAILED"
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

# A causa comum de uma falha ganha ao codigo generico do passo: o disco cheio, a pasta temporaria apagada a meio
# (uma app de limpeza) e a falta de permissao (ws_perm_reclass).
ws_fail_reclass() {
  ws_disk_reclass && return 0
  if ws_tmp_gone || [ -n "${WS_TMP_WIPED_STEP:-}" ]; then ws_fail E-SO-10 "$(ws_tilde "$WS_TMP")"; return 0; fi
  ws_perm_reclass
}
# Disco cheio: menos de 50 MB livres na HOME ou na pasta temporaria (WS_DISK_MB), ou "No space left" no log do
# passo. Com o disco a 0 o log do passo nem se escreve: por isso tambem o df.
ws_disk_full() {
  local t kb
  WS_DISK_MB=""
  for t in "$HOME" "${WS_TMP:-$HOME}"; do
    kb=$(df -k "$t" 2>/dev/null | awk 'NR==2{print $4}')
    case "$kb" in ''|*[!0-9]*) continue ;; esac
    [ "$kb" -lt 51200 ] && { WS_DISK_MB=$((kb / 1024)); return 0; }
  done
  grep -aqE 'No space left on device|ENOSPC|os error 28' "$WS_STEP_LOG" 2>/dev/null
}
ws_disk_detail() { if [ -n "${WS_DISK_MB:-}" ]; then printf '%s MB free' "$WS_DISK_MB"; else printf 'No space left on device'; fi; }
ws_disk_reclass() {
  local f="SF_$WS_CUR"
  case "${!f%%|*}" in E-SO-06|E-PERM-*|E-CFG-05|E-GH-02|E-SMOKE-02|E-SMOKE-03) return 1 ;; esac
  ws_disk_full || return 1
  WS_DISK_FULL=1
  ws_fail E-SO-06 "$(ws_disk_detail) · ${!f%%|*}"
}
# Um erro de permissao (ou "nao e uma pasta") na saida do passo ganha ao codigo generico do passo, que fala da
# rede ou do antivirus: mostra-se E-PERM-01 com a linha que o diz (restos de um "sudo", pastas bloqueadas).
ws_perm_reclass() {
  local f="SF_$WS_CUR" p c
  case "${!f%%|*}" in E-PERM-*|E-CFG-05|E-GH-02|E-SMOKE-02|E-SMOKE-03) return 0 ;; esac
  p=$(grep -E 'EACCES|EEXIST|ENOTDIR|EROFS|Permission denied|File exists|Not a directory|Read-only file system' "$WS_STEP_LOG" 2>/dev/null |
    grep -v 'publickey' | head -n 1 | ws_redact)
  [ -n "$p" ] || return 0
  p="${p//"$HOME"/~}"
  # cortada no fim da ultima frase antes dos 160 caracteres, senao na ultima palavra (se ficarem pelo menos 80),
  # e nao a meio de uma palavra
  if [ "${#p}" -gt 160 ]; then
    p=${p:0:160}
    case "$p" in
      *". "*) p="${p%. *}." ;;
      *" "*) c="${p% *} ..."; [ "${#c}" -ge 80 ] && p=$c ;;
    esac
  fi
  ws_fail E-PERM-01 "$(ws_trim "$p")"
}

# O ws_step escreve "result step N: estado [codigo|detalhe da falha]" no setup.log de cada instalacao: o --check e
# o --doctor nao voltam a instalar, mas assim sabem porque falhou a ultima instalacao (num passo nao bloqueante
# a falha aparece como aviso).
ws_last_install_result() { # passo -> "codigo|detalhe" se a ultima instalacao desse passo falhou
  local r
  r=$(awk -v n="$1:" '$2 == "result" && $3 == "step" && $4 == n { st = $5; $1 = $2 = $3 = $4 = $5 = ""; last = st " " $0 } END { print last }' "$WS_LOG" 2>/dev/null)
  case "$r" in falhou\ *|aviso\ *) r=$(ws_trim "${r#* }"); case "$r" in E-*) printf '%s' "$r" ;; esac ;; esac
}

# Caminho para mostrar num comando: ~/... sem aspas (para o ~ expandir) se nao tiver espacos nem simbolos,
# senao o caminho completo entre aspas simples.
ws_show_path() {
  local p=$1
  # shellcheck disable=SC2088  # texto para mostrar, nao e um caminho a expandir
  case "$p" in "$HOME"/*) p="~/${p#"$HOME"/}" ;; esac
  case "$p" in *[!A-Za-z0-9._/~+-]*) printf "'%s'" "${1//\'/\'\\\'\'}" ;; *) printf '%s' "$p" ;; esac
}
# Tipo de correcao para um caminho sem escrita: mover (nao e uma pasta), chown (tem coisas de outro utilizador,
# p. ex. do root depois de um sudo) ou chmod (e da pessoa, so sem permissao).
ws_perm_kind() { # caminho [dir]
  local p=$1
  if [ -L "$p" ] && [ ! -e "$p" ]; then echo mv; return; fi
  if [ "${2:-}" = dir ] && [ -e "$p" ] && [ ! -d "$p" ]; then echo mv; return; fi
  if [ -e "$p" ] && { [ ! -O "$p" ] || [ -n "$(find "$p" -maxdepth 3 ! -user "$(id -u)" -print 2>/dev/null | head -n 1)" ]; }; then echo chown; return; fi
  echo chmod
}
# Notas com os comandos exatos (um por tipo) para os caminhos dados: pastas, ou "f:<caminho>" para um ficheiro.
ws_perm_fix_notes() {
  local w p own="" mod="" mv=""
  for p in "$@"; do
    w=dir; case "$p" in f:*) w=""; p=${p#f:} ;; esac
    # Ainda nao existe: a correcao e na primeira pasta de cima que existe.
    while [ ! -e "$p" ] && [ ! -L "$p" ] && [ "$p" != / ] && [ "$p" != . ]; do p=$(dirname "$p"); w=dir; done
    case "$(ws_perm_kind "$p" "$w")" in
      mv) mv="$mv
mv $(ws_show_path "$p") $(ws_show_path "$p.old")" ;;
      chown) own="$own $(ws_show_path "$p")" ;;
      *) mod="$mod $(ws_show_path "$p")" ;;
    esac
  done
  [ -n "$own" ] && ws_note "$(ws_msg perm_corrigir CMD="sudo chown -R \"\$USER\"$own")"
  [ -n "$mod" ] && ws_note "$(ws_msg perm_corrigir CMD="chmod -R u+rwX$mod")"
  while IFS= read -r p; do [ -n "$p" ] && ws_note "$(ws_msg perm_corrigir CMD="$p")"; done <<EOF
$mv
EOF
}

# ---------------------------------------------------------------- comandos
# Poe a pasta $1 a frente do PATH e tira-a de onde ja estiver: um claude, uv ou gh antigo que venha antes no
# PATH (npm, pipx, nvm) nao passa a frente do do workshop. Seguro com espacos e [ * ? no caminho.
ws_path_front() {
  PATH=":$PATH:"
  while case "$PATH" in *":$1:"*) true ;; *) false ;; esac; do PATH="${PATH%%":$1:"*}:${PATH#*":$1:"}"; done
  PATH="${PATH#:}"; PATH="${PATH%:}"; PATH="$1${PATH:+:$PATH}"
}
ws_path_setup() {
  local d rest="$PATH:" e out=""
  # So ficam as entradas absolutas: um ".", um "./node_modules/.bin" ou uma vazia (o terminal do VS Code num
  # projeto JavaScript) tornavam relativo o claude ou o node encontrado aqui, que deixava de servir depois de um
  # cd e ia parar ao settings.json.
  while [ -n "$rest" ]; do e=${rest%%:*}; rest=${rest#*:}; case "$e" in /*) out="${out:+$out:}$e" ;; esac; done
  PATH=$out
  # A mesma ordem que o bloco do perfil (fica node/bin, depois bin, depois .local/bin a frente): um gh, git ou
  # acli antigo em ~/.local/bin nao passa a frente dos do setup, e cada pasta vai para a frente mesmo que ja
  # esteja no PATH (um claude antigo do npm a frente do ~/.local/bin).
  for d in "$HOME/.local/bin" "$WS_HOME/bin" "$WS_HOME/node/bin"; do
    ws_path_front "$d"
  done
  export PATH
  hash -r 2>/dev/null || true
}

ws_claude() { command -v claude 2>/dev/null || { [ -x "$HOME/.local/bin/claude" ] && printf '%s' "$HOME/.local/bin/claude"; }; }

# Bloco no perfil do shell que poe as pastas do workshop a frente do PATH (removido pelo --uninstall).
# Vai para os ficheiros que um terminal novo le: o .zshrc e o .zprofile do $ZDOTDIR (ou da HOME), o ficheiro
# que o bash de login le e, para o fish, conf.d/workshop-claude.fish.
ws_profile_update() {
  [ "$WS_MODE" = install ] || return 0
  local f dirs d block fblock bf fd
  dirs='"$HOME/.local/bin" "$HOME/.workshop-claude/bin"'
  if [ -n "${WS_NODE_BIN_DIR:-}" ]; then
    case "$WS_NODE_BIN_DIR" in "$HOME"/*) d="\"\$HOME${WS_NODE_BIN_DIR#"$HOME"}\"" ;; *) d="\"$WS_NODE_BIN_DIR\"" ;; esac
    dirs="$dirs $d"
  fi
  # sh, bash e zsh. Cada pasta vai para a frente mesmo que ja esteja no PATH (a linha do pipx que poe o
  # ~/.local/bin no fim, o nvm que se pos a frente dele): assim um claude antigo do npm nao passa a frente.
  block=$(printf '%s\n' '# >>> workshop-claude >>>' \
    '# Added by the workshop setup. Remove it with: bash ~/.workshop-claude/setup-mac.sh --uninstall' \
    "for _ws_d in $dirs; do" \
    '  [ -d "$_ws_d" ] || continue' \
    '  PATH=":$PATH:"' \
    '  while case "$PATH" in *":$_ws_d:"*) true ;; *) false ;; esac; do PATH="${PATH%%":$_ws_d:"*}:${PATH#*":$_ws_d:"}"; done' \
    '  PATH="${PATH#:}"; PATH="${PATH%:}"; PATH="$_ws_d${PATH:+:$PATH}"' \
    'done' 'unset _ws_d' 'export PATH' '# <<< workshop-claude <<<')
  # fish (fish_add_path desde o fish 3.2; -P mexe so no PATH da sessao: nada fica nas variaveis universais)
  fblock=$(printf '%s\n' '# >>> workshop-claude >>>' \
    '# Added by the workshop setup. Remove it with: bash ~/.workshop-claude/setup-mac.sh --uninstall' \
    'if functions -q fish_add_path' "    fish_add_path -P -m $dirs" 'else' "    set -gx PATH $dirs \$PATH" 'end' \
    '# <<< workshop-claude <<<')
  # zsh: le o .zshrc e o .zprofile do $ZDOTDIR, se o ~/.zshenv o definir (calculado uma vez por execucao)
  [ "${WS_ZDOTDIR_HOME:-}" = "$HOME" ] || { WS_ZDOTDIR=$(ws_zdotdir); WS_ZDOTDIR_HOME=$HOME; }
  ws_profile_put "$WS_ZDOTDIR/.zshrc" "$block"
  ws_profile_put "$WS_ZDOTDIR/.zprofile" "$block"
  # bash de login: le SO o primeiro que existir (e puder ler) de .bash_profile, .bash_login e .profile. O bloco
  # vai para esse: nunca se cria um .bash_profile que esconda o .bash_login ou o .profile da pessoa.
  bf=""
  for f in "$HOME/.bash_profile" "$HOME/.bash_login" "$HOME/.profile"; do
    if [ -f "$f" ] && [ -r "$f" ]; then bf=$f; break; fi
  done
  # ... e um .bash_profile so com o bloco (criado por uma versao antiga do setup) por cima de um .profile sai
  if [ "$bf" = "$HOME/.bash_profile" ] && [ ! -L "$bf" ] && { [ -f "$HOME/.bash_login" ] || [ -f "$HOME/.profile" ]; } &&
     ws_profile_strip "$bf" > "$WS_TMP/perfil-bp" 2>/dev/null && ! cmp -s "$bf" "$WS_TMP/perfil-bp" &&
     ! LC_ALL=C grep -q '[^[:space:]]' "$WS_TMP/perfil-bp"; then
    rm -f "$bf"; ws_log "profile: removed $bf (only the workshop block, it hid .bash_login or .profile)"
    WS_PERFIL_MUDOU=1; bf=""
    for f in "$HOME/.bash_login" "$HOME/.profile"; do
      if [ -f "$f" ] && [ -r "$f" ]; then bf=$f; break; fi
    done
  fi
  rm -f "$WS_TMP/perfil-bp"
  case "${SHELL:-}" in
    */bash) [ -n "$bf" ] || bf="$HOME/.bash_profile" ;;
    *) [ "$bf" = "$HOME/.bash_profile" ] || bf="" ;;
  esac
  [ -z "$bf" ] || ws_profile_put "$bf" "$block"
  # o fish nao le nenhum destes
  fd="${XDG_CONFIG_HOME:-$HOME/.config}/fish"
  case "${SHELL:-}" in */fish) ;; *) [ -d "$fd" ] || return 0 ;; esac
  ws_profile_put "$fd/conf.d/workshop-claude.fish" "$fblock"
  return 0
}

# Pasta de onde um zsh novo le o .zshrc e o .zprofile: o ZDOTDIR que o /etc/zshenv ou o ~/.zshenv definirem,
# senao a HOME. Num ambiente limpo, como uma janela nova do Terminal (o ZDOTDIR herdado pode ser o de uma
# integracao de terminal: o VS Code poe la uma pasta temporaria), e no maximo 5 s (um .zshenv que fica a
# espera nao para o setup).
ws_zdotdir() {
  local z="" o="$WS_TMP/zdotdir.out" pid i=0
  if [ -e /etc/zshenv ] || [ -e "$HOME/.zshenv" ]; then
    : 2>/dev/null > "$o"
    env -i HOME="$HOME" USER="${USER:-}" LOGNAME="${LOGNAME:-${USER:-}}" PATH=/usr/bin:/bin:/usr/sbin:/sbin \
      /bin/zsh -c 'print -r -- "WSZDOTDIR=${ZDOTDIR:-$HOME}"' </dev/null 2>/dev/null >|"$o" &
    pid=$!
    while kill -0 "$pid" 2>/dev/null && [ "$i" -lt 50 ]; do sleep 0.1; i=$((i + 1)); done
    if kill -0 "$pid" 2>/dev/null; then { kill -9 "$pid"; wait "$pid"; } 2>/dev/null; ws_log "zsh -c (ZDOTDIR) did not answer in 5 s"; fi
    z=$(sed -n 's/^WSZDOTDIR=//p' "$o" 2>/dev/null | tail -n 1)
    rm -f "$o"
  fi
  z=${z%/}
  case "$z" in /?*) ;; *) z=$HOME ;; esac
  # Nunca a HOME em vez do ZDOTDIR: o zsh nao le o ~/.zshrc quando o ZDOTDIR esta definido. Numa pasta sem escrita
  # o ws_profile_put escreve nos ficheiros que deixarem (ou avisa com E-PROF-01, a dizer qual).
  [ "$z" = "$HOME" ] || mkdir -p "$z" 2>/dev/null || true
  ws_log "zsh profile folder: $z"
  printf '%s' "$z"
}

# Escreve o bloco num ficheiro de perfil sem nunca perder as linhas da pessoa:
# - le e escreve bytes (LC_ALL=C no awk: um .zshrc em Latin-1 nao o faz falhar);
# - segue as ligacoes (stow, chezmoi, Mackup): a ligacao fica, o bloco vai para o ficheiro real e as
#   permissoes ficam iguais (um 600 continua 600);
# - nao mexe num ficheiro que nao consegue ler ou escrever (so de leitura, de outro utilizador, ligacao
#   partida) nem num com um bloco antigo incompleto: avisa uma vez, com o que fazer;
# - antes da primeira alteracao guarda uma copia em ~/.workshop-claude/backup.
ws_profile_put() { # ficheiro bloco
  local f=$1 tmp="$WS_TMP/perfil.ws-tmp" novo="" bk="" rc
  ws_tmp_gone
  [ -f "$f.ws-tmp" ] && [ ! -L "$f.ws-tmp" ] && rm -f "$f.ws-tmp"   # sobra das versoes antigas do setup
  if [ -e "$f" ] || [ -L "$f" ]; then
    if [ ! -f "$f" ] || [ ! -r "$f" ]; then ws_profile_warn E-PROF-01 "$f"; return 1; fi
    # (o erro de um ">" que falha, ex.: disco cheio, vai para o log e nao para o ecra)
    { ws_profile_strip "$f" > "$tmp"; } 2>>"$WS_LOG"; rc=$?
    if [ "$rc" != 0 ]; then
      rm -f "$tmp"
      # bloco antigo incompleto: fica no manifest, para o --uninstall dizer que nao o conseguiu tirar
      if [ "$rc" = 3 ]; then ws_registar perfil "$f" "$f"; ws_profile_warn E-PROF-02 "$f"; else ws_profile_warn E-PROF-01 "$f"; fi
      return 1
    fi
    # copia de seguranca so se houver linhas da pessoa (um ficheiro so com o bloco foi o setup que o criou)
    LC_ALL=C grep -q '[^[:space:]]' "$tmp" && bk="$WS_HOME/backup/profile-$(printf '%s' "${f#"$HOME"/}" | tr '/' '_')"
  else
    mkdir -p "$(dirname "$f")" 2>>"$WS_LOG" || { ws_profile_warn E-PROF-01 "$f"; return 1; }
    : > "$tmp"; novo=criado
  fi
  # (sem esta verificacao, uma escrita que falhasse deixava o perfil sem o bloco)
  printf '\n%s\n' "$2" >> "$tmp" 2>/dev/null || { rm -f "$tmp"; ws_profile_warn E-PROF-01 "$f"; return 1; }
  if [ -z "$novo" ]; then
    if cmp -s "$f" "$tmp"; then rm -f "$tmp"; ws_registar perfil "$f" "$f"; return 0; fi
    [ -w "$f" ] || { rm -f "$tmp"; ws_profile_warn E-PROF-01 "$f"; return 1; }
    if [ -n "$bk" ] && [ ! -e "$bk" ] && ! { mkdir -p "$WS_HOME/backup" && cp -p "$f" "$bk"; } 2>>"$WS_LOG"; then
      rm -f "$tmp"; ws_profile_warn E-PROF-01 "$f"; return 1
    fi
  fi
  if ! ws_profile_write "$f" "$tmp"; then
    [ -n "$bk" ] && ! cmp -s "$bk" "$f" && cat "$bk" > "$f" 2>/dev/null   # escrita a meio: volta ao que era
    rm -f "$tmp"; ws_profile_warn E-PROF-01 "$f"; return 1
  fi
  rm -f "$tmp"
  WS_PERFIL_MUDOU=1   # o resumo diz para reabrir o terminal
  ws_log "profile updated: $f"
  ws_registar perfil "$f" "$f" "$novo"
}

# Troca o conteudo de $1 pelo de $2 sem trocar uma ligacao por um ficheiro: segue a ligacao e substitui o
# ficheiro real de uma vez (copia ao lado e mv, com as mesmas permissoes). Se a pasta do ficheiro real nao
# deixar criar a copia, escreve por cima.
ws_profile_write() { # ficheiro conteudo
  local real=$1 l n=0 m t
  [ -e "$real" ] || { { cat "$2" > "$real"; } 2>>"$WS_LOG"; return; }
  while [ -L "$real" ] && [ "$n" -lt 40 ]; do
    l=$(readlink "$real") || return 1
    case "$l" in /*) real=$l ;; *) real="$(dirname "$real")/$l" ;; esac
    n=$((n + 1))
  done
  t="$real.ws-tmp"; m=$(stat -f %Lp "$real" 2>/dev/null)
  # (com mais de uma ligacao fisica, o mv separava-as: escreve-se por cima)
  if [ -n "$m" ] && [ "$(stat -f %l "$real" 2>/dev/null)" = 1 ] && ( umask 077; cat "$2" > "$t" ) 2>/dev/null &&
     chmod "$m" "$t" 2>/dev/null && mv -f "$t" "$real" 2>/dev/null; then
    return 0
  fi
  rm -f "$t" 2>/dev/null
  cat "$2" > "$real" 2>>"$WS_LOG"
}

# Aviso de um perfil que ficou como estava: uma vez por ficheiro em cada execucao (o ws_profile_update corre
# em varios passos). Fica no passo que esta a correr (que passa a "com aviso"); depois do resultado do passo 12 ja
# nao ha passo onde o mostrar: vai logo para o ecra e o passo 12 passa a "com aviso" (conta no resumo).
ws_profile_warn() { # codigo ficheiro
  # Sem espaco no disco a copia do perfil nao se escreve: nao e um ficheiro so de leitura nem de outro utilizador.
  [ "$1" = E-PROF-01 ] && ws_disk_full && set -- E-SO-06 "$2"
  ws_log "profile left unchanged ($1): $2"
  case "${WS_PERFIL_AVISADOS:-}" in *"|$2|"*) return 0 ;; esac
  WS_PERFIL_AVISADOS="${WS_PERFIL_AVISADOS:-}|$2|"
  if [ -n "${WS_CUR:-}" ] && [ -z "$(ws_st "$WS_CUR")" ]; then ws_warn "$1" "${2/#"$HOME"/~}"
  else
    ws_print_code "$1" "${2/#"$HOME"/~}" "     " "⚠️  "
    if [ -n "${WS_CUR:-}" ]; then
      ws_warn "$1" "${2/#"$HOME"/~}"
      case "$(ws_st "$WS_CUR")" in feito|ja|ok) ws_set ST "$WS_CUR" aviso ;; esac
    fi
  fi
}

# Tira os blocos completos do workshop (e a linha vazia que o setup pos antes de cada um), mesmo indentados. Um
# bloco indentado (dentro de um "if ...; then" ou de uma funcao) fica um ":" com a mesma indentacao: um "if" sem
# corpo e um erro de sintaxe no bash, e o resto do .bash_profile deixava de correr.
# LC_ALL=C: le bytes e nao caracteres (um .zshrc em Latin-1 fazia o awk falhar num locale UTF-8). Se um
# marcador nao tiver par (um bloco antigo sem o fim, um fim solto), nao imprime nada e devolve 3: apagar ate
# ao fim do ficheiro levaria as linhas da pessoa.
ws_profile_strip() {
  LC_ALL=C awk '
    /^[ \t]*# >>> workshop-claude >>>/ { if (skip) bad = 1; skip = 1; held = 0; i = $0; sub(/#.*/, "", i); if (i != "") out[++n] = i ":"; next }
    /^[ \t]*# <<< workshop-claude <<</ { if (!skip) bad = 1; skip = 0; next }
    skip { next }
    /^$/ { if (held) out[++n] = ""; held = 1; next }
    { if (held) out[++n] = ""; held = 0; out[++n] = $0 }
    END { if (bad || skip) exit 3; for (i = 1; i <= n; i++) print out[i] }' "$1"
}

# --uninstall: tira o bloco. Um ficheiro que o setup criou e que fica vazio e apagado (um ~/.bash_profile vazio
# esconderia o ~/.profile). Com um marcador sem par ou sem permissao, avisa e deixa o ficheiro como esta.
ws_profile_remove() { # ficheiro [criado]
  local f=$1 tmp="$WS_TMP/perfil.ws-tmp"
  [ -f "$f" ] || return 0
  if [ -r "$f" ] && ws_profile_strip "$f" > "$tmp" 2>>"$WS_LOG"; then
    if cmp -s "$f" "$tmp"; then rm -f "$tmp"; return 0; fi
    if [ "${2:-}" = criado ] && [ ! -L "$f" ] && ! LC_ALL=C grep -q '[^[:space:]]' "$tmp"; then
      rm -f "$f" "$tmp"; ws_say "  $(ws_msg desinst_perfil FICHEIRO="$f")"; return 0
    fi
    if [ -w "$f" ] && ws_profile_write "$f" "$tmp"; then rm -f "$tmp"; ws_say "  $(ws_msg desinst_perfil FICHEIRO="$f")"; return 0; fi
  fi
  rm -f "$tmp"
  ws_say "  ⚠️  $(ws_msg desinst_perfil_falhou FICHEIRO="$f")"
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
  # O .ws-kit-ok guarda o SHA-256 do arquivo: uma release republicada com a mesma tag (outro SHA-256) volta a
  # ser descarregada ao instalar. O --check usa o que houver.
  if [ -f "$dest/.ws-kit-ok" ]; then
    if [ "$WS_MODE" != install ] || [ -z "$WS_INJ_KIT_SHA256" ] || grep -qx "$WS_INJ_KIT_SHA256" "$dest/.ws-kit-ok" 2>/dev/null; then KIT_SRC=$dest; return 0; fi
    ws_log "kit-src $C_WORKSHOP_VERSION is not the published kit (republished release?): downloading it again"
  fi
  [ "$WS_MODE" = install ] || return 1
  local name="workshop-kit-$C_WORKSHOP_VERSION.tar.gz" url tmpd rc sum
  url=$(ws_release_url workshop "$name")
  tmpd="$WS_TMP/kit"; rm -rf "$tmpd"; mkdir -p "$tmpd/x" 2>>"$WS_STEP_LOG" || return 1
  ws_say "  $(ws_msg a_descarregar O_QUE="$name")"
  # Com o SHA-256 injetado (release), um arquivo truncado ou alterado e descarregado uma segunda vez.
  if [ -n "$WS_INJ_KIT_SHA256" ]; then ws_dl_check "$url" "$tmpd/$name" "$WS_INJ_KIT_SHA256" auth; else ws_dl "$url" "$tmpd/$name" auth; fi
  rc=$?
  if [ "$rc" = 2 ]; then
    ws_log "kit SHA-256 mismatch (expected $WS_INJ_KIT_SHA256)"
    ws_warn E-KIT-02 "$name"
  elif [ "$rc" = 0 ]; then
    sum=$(ws_sha256 "$tmpd/$name")
    if tar -xzf "$tmpd/$name" -C "$tmpd/x" 2>>"$WS_STEP_LOG" && [ -d "$tmpd/x/workshop-kit-$C_WORKSHOP_VERSION" ]; then
      rm -rf "$dest"; mkdir -p "$(dirname "$dest")"
      mv "$tmpd/x/workshop-kit-$C_WORKSHOP_VERSION" "$dest" && printf '%s\n' "$sum" > "$dest/.ws-kit-ok"
      KIT_SRC=$dest; return 0
    fi
  fi
  # Sem o arquivo novo, o kit que ja estava descarregado continua a servir.
  if [ -f "$dest/.ws-kit-ok" ]; then KIT_SRC=$dest; return 0; fi
  # Recurso: git clone da tag (o REPO_TOKEN, se existir, vai por variaveis de configuracao do git).
  # Os mesmos limites que o ws_dl: uma transferencia parada (menos de 1 KB/s durante 60 s) falha.
  command -v git >/dev/null 2>&1 && xcode_ok || return 1
  [ "${WS_DISK_FULL:-0}" = 1 ] && return 1   # disco cheio: o clone tambem nao cabe
  rm -rf "$tmpd/clone"
  ws_log "fallback: git clone --depth 1 --branch $C_WORKSHOP_VERSION $C_WORKSHOP_REPO_URL"
  if [ -n "${REPO_TOKEN:-}" ]; then
    GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=http.extraHeader GIT_CONFIG_VALUE_0="Authorization: token $REPO_TOKEN" GIT_TERMINAL_PROMPT=0 \
      GIT_HTTP_LOW_SPEED_LIMIT=1024 GIT_HTTP_LOW_SPEED_TIME=60 \
      git clone -q --depth 1 --branch "$C_WORKSHOP_VERSION" "$C_WORKSHOP_REPO_URL" "$tmpd/clone" </dev/null >>"$WS_STEP_LOG" 2>&1
  else
    GIT_TERMINAL_PROMPT=0 GIT_HTTP_LOW_SPEED_LIMIT=1024 GIT_HTTP_LOW_SPEED_TIME=60 \
      git clone -q --depth 1 --branch "$C_WORKSHOP_VERSION" "$C_WORKSHOP_REPO_URL" "$tmpd/clone" </dev/null >>"$WS_STEP_LOG" 2>&1
  fi || return 1
  rm -rf "$tmpd/clone/.git" "$dest"; mkdir -p "$(dirname "$dest")"
  mv "$tmpd/clone" "$dest" && date > "$dest/.ws-kit-ok" && KIT_SRC=$dest
}

xcode_ok() {
  case "$(command -v git 2>/dev/null)" in /usr/bin/git) ws_clt_ok ;; '') return 1 ;; *) return 0 ;; esac
}
# Command Line Tools (ou Xcode) instaladas a serio? O "xcode-select -p" pode apontar para uma pasta que ja nao existe
# (ferramentas apagadas): nesse caso o /usr/bin/git e os outros "shims" da Apple abrem o dialogo de instalacao.
ws_clt_ok() { local d; d=$(xcode-select -p 2>/dev/null </dev/null) || return 1; [ -n "$d" ] && [ -x "$d/usr/bin/git" ]; }

# ================================================================= PASSO 0 - ambiente
# Lingua: a escolhida, um WORKSHOP_LANG ignorado (gralha) e a lingua guardada quando o sistema diz outra.
ws_s0_lang_notes() {
  ws_note "$(ws_msg s0_lingua LINGUA="${WS_LANG:-en}")"
  [ -n "${WS_LANG_IGNORADA:-}" ] && ws_note "$(ws_msg s0_lingua_ignorada VALOR="$WS_LANG_IGNORADA" LINGUA="${WS_LANG:-en}")"
  if [ -n "${WS_LANG_GUARDADA:-}" ] && [ "$WS_LANG_GUARDADA" != "${WS_LANG_MAQUINA:-}" ]; then
    ws_note "$(ws_msg s0_lingua_guardada LINGUA="$WS_LANG_GUARDADA" MAQUINA="${WS_LANG_MAQUINA:-en}")"
  fi
  return 0
}
ws_s0_detect() {
  local ver arch extra f
  ver=$(sw_vers -productVersion 2>/dev/null)
  if [ "$(sysctl -n hw.optional.arm64 2>/dev/null)" = 1 ]; then arch=arm64; else arch=x64; fi
  WS_ARCH=$arch
  [ "$(sysctl -n sysctl.proc_translated 2>/dev/null)" = 1 ] && extra=" (Rosetta)"
  WS_OS="macOS $ver $arch${extra:-}"
  ws_note "$(ws_msg s0_so SO="$WS_OS")"
  ws_s0_lang_notes
  ws_ver_ge "$ver" 13 || ws_warn E-SO-04 "macOS $ver"

  for f in "/Library/Application Support/ClaudeCode/managed-settings.json" "/Library/Application Support/ClaudeCode/managed-settings.d" "/Library/Managed Preferences/com.anthropic.claudecode.plist"; do
    # Comum em portateis da empresa: so uma nota (a ajuda E-CFG-01 fica no TROUBLESHOOTING, se um passo for bloqueado).
    [ -e "$f" ] && { ws_note "$(ws_msg s0_gerido CAMINHO="$f")"; ws_log "managed settings: $f"; }
  done
  local keys; keys=$(ws_env_keys) && ws_warn E-CFG-02 "$keys"
  local cloud; cloud=$(ws_cloud_where) && ws_warn E-CFG-04 "$cloud"
  local b; for b in $(ws_uv_python_blockers); do ws_warn E-CFG-07 "$b=${!b}"; done
  ws_s0_env_warnings

  local kb; kb=$(df -k "$HOME" 2>/dev/null | awk 'NR==2{print $4}')
  # Com uma casa decimal: "0 GB" com 590 MB livres escondia quanto falta.
  local gb; gb=$(LC_ALL=C awk -v k="${kb:-0}" 'BEGIN { g = k / 1048576; printf (g < 0.1 ? "%.2f" : "%.1f"), g }')
  if [ -n "$kb" ]; then ws_note "$(ws_msg s0_disco GB="$gb")"; [ "$kb" -lt 3145728 ] && ws_warn E-SO-06 "$gb GB"; fi
  # Menos de 50 MB: os passos que ainda faltam nem tentam instalar (ws_step).
  ws_disk_full && WS_DISK_FULL=1
  case "$(cd "$HOME" 2>/dev/null && pwd -P)" in *OneDrive*|*CloudStorage*) ws_warn E-SO-03 "$HOME" ;; esac
  [ -d "$WS_PROJ" ] && case "$(cd "$WS_PROJ" && pwd -P)" in *OneDrive*|*CloudStorage*) ws_warn E-SO-03 "$WS_PROJ" ;; esac
  ws_perm_scan

  ws_detect_proxy
  ws_detect_tls
  ws_check_network
  # O Claude Code usa o proxy do settings.json mesmo que o terminal ja nao tenha nenhum (o passo 8 tira o que o setup gravou).
  ws_settings_proxy_dead && ws_note "$(ws_msg s0_proxy_settings PROXY="$WS_SP_SHOW")"
  ws_gw_detect
  ws_detail "$WS_OS · ${WS_LANG:-en} · $(ws_msg s0_rede_ok OK="$WS_NET_OK" TOTAL="$WS_NET_TOTAL")"
  return 0
}
ws_s0_install() { ws_s0_detect; }
# Variaveis do terminal que o setup contorna mas que continuam a partir o que a pessoa corre la.
ws_s0_env_warnings() {
  # Modelos trocados por variaveis (na shell ou no "env" das definicoes): mudam o "sonnet"/"haiku" das skills e dos
  # agentes e o modelo da sessao; um id antigo ou so do Bedrock falha com o login do Console. Os ids nao sao segredos.
  local mv r out=""
  for mv in ANTHROPIC_MODEL ANTHROPIC_DEFAULT_OPUS_MODEL ANTHROPIC_DEFAULT_SONNET_MODEL ANTHROPIC_DEFAULT_HAIKU_MODEL ANTHROPIC_SMALL_FAST_MODEL CLAUDE_CODE_SUBAGENT_MODEL; do
    if [ -n "${!mv:-}" ]; then out="$out · $mv=${!mv} (shell)"
    elif r=$(ws_settings_env "$mv"); then out="$out · $mv=${r%%"$WS_TAB"*} ($(ws_path_show "${r#*"$WS_TAB"}"))"; fi
  done
  [ -z "$out" ] || ws_warn E-CFG-10 "${out# · }"
  # O que o ws_env_sanitize tirou do ambiente do setup, mas o terminal da pessoa ainda tem (um aviso para todas).
  [ -z "${WS_CA_BAD0:-}" ] || ws_warn E-NET-09 "${WS_CA_BAD0//$WS_NL/ · }"
  [ -z "${WS_TMPDIR_BAD0:-}" ] || ws_warn E-SO-09 "TMPDIR=$WS_TMPDIR_BAD0"
}

# shellcheck disable=SC2088  # texto para mostrar, nao e um caminho a expandir
ws_path_show() { case "$1" in "$HOME"/*) printf '~/%s' "${1#"$HOME"/}" ;; *) printf '%s' "$1" ;; esac; }
ws_truthy() { case "$1" in 1|[Tt]rue|TRUE|[Yy]es|YES|[Oo]n|ON) return 0 ;; esac; return 1; }

# Valor de uma variavel no bloco "env" das definicoes do Claude Code (as do utilizador e as geridas pela empresa,
# que e como as empresas ligam o Bedrock ou um gateway). -> "valor<TAB>ficheiro"; rc 1 se nao houver.
# O plutil le JSON e plist (sem node nem python). O valor pode ser uma chave: nunca se mostra nem vai para o log.
ws_settings_env() { # VARIAVEL
  local f v
  for f in "${CLAUDE_DIR:-$HOME/.claude}/settings.json" "/Library/Application Support/ClaudeCode/managed-settings.json" \
           "/Library/Application Support/ClaudeCode/managed-settings.d"/*.json "/Library/Managed Preferences/com.anthropic.claudecode.plist"; do
    [ -f "$f" ] || continue
    v=$(plutil -extract "env.$1" raw -o - "$f" 2>/dev/null </dev/null) || continue
    [ -n "$v" ] && { printf '%s\t%s\n' "$v" "$f"; return 0; }
  done
  return 1
}

# Chaves da API que passam a frente do login (na shell ou no "env" das definicoes). -> nomes, nunca os valores.
ws_env_keys() {
  local v out="" r
  for v in ANTHROPIC_AUTH_TOKEN ANTHROPIC_API_KEY; do
    if [ -n "${!v:-}" ]; then out="$out, $v"
    elif r=$(ws_settings_env "$v"); then out="$out, $v ($(ws_path_show "${r#*"$WS_TAB"}"))"; fi
  done
  [ -n "$out" ] && printf '%s' "${out#, }"
}

# Claude Code configurado para uma cloud (Bedrock, Vertex, Foundry): o login do Console e ignorado e, sem as
# credenciais da cloud, os pedidos nunca acabam. -> "VARIAVEL (shell|ficheiro)"; rc 1 se nao houver.
ws_cloud_where() {
  local v r
  for v in CLAUDE_CODE_USE_BEDROCK CLAUDE_CODE_USE_VERTEX CLAUDE_CODE_USE_FOUNDRY; do
    ws_truthy "${!v:-}" && { printf '%s (shell)' "$v"; return 0; }
  done
  for v in CLAUDE_CODE_USE_BEDROCK CLAUDE_CODE_USE_VERTEX CLAUDE_CODE_USE_FOUNDRY; do
    r=$(ws_settings_env "$v") && ws_truthy "${r%%"$WS_TAB"*}" && { printf '%s (%s)' "$v" "$(ws_path_show "${r#*"$WS_TAB"}")"; return 0; }
  done
  return 1
}

# Gateway da empresa (ANTHROPIC_BASE_URL, na shell ou nas definicoes): aviso e, se nao responder, WS_GW_DOWN=1.
# Nesse caso o teste final e o ajudante nao chamam o Claude (esperariam minutos pelas novas tentativas e o erro
# apontaria para o api.anthropic.com, que pode estar bem).
ws_gw_detect() {
  local r src=""
  WS_GW_URL=${ANTHROPIC_BASE_URL:-}; WS_GW_DOWN=0
  if [ -z "$WS_GW_URL" ] && r=$(ws_settings_env ANTHROPIC_BASE_URL); then
    WS_GW_URL=${r%%"$WS_TAB"*}; src=" ($(ws_path_show "${r#*"$WS_TAB"}"))"
  fi
  [ -n "$WS_GW_URL" ] || return 0
  ws_warn E-CFG-03 "ANTHROPIC_BASE_URL$src"
  ws_probe_gateway "$WS_GW_URL" || { WS_GW_DOWN=1; ws_warn E-AUTH-05 "$(ws_gw_show)"; }
}
# 1 = o gateway nao responde. Qualquer resposta HTTP conta como vivo (mesmo 401 ou 404); so a falta de ligacao
# (DNS, recusada, sem resposta) ou um 502/503/504 de um proxy pelo meio conta como em baixo.
ws_probe_gateway() { # url
  local code rc
  code=$(curl -sS -o /dev/null --connect-timeout 5 -m 10 -A "$WS_UA" -w '%{http_code}' "$1" 2>>"$WS_STEP_LOG" </dev/null); rc=$?
  ws_log "gateway: curl $rc HTTP $code"
  case "$rc" in 5|6|7|28) return 1 ;; esac
  case "$code" in 502|503|504) return 1 ;; esac
  return 0
}
# URL do gateway para mostrar: so esquema://host:porta/ (sem caminho, utilizador nem password).
ws_gw_show() {
  local u=${WS_GW_URL:-} rest
  [ -n "$u" ] || return 0
  u=$(ws_url_base "$u")
  case "$u" in *://*) rest=${u#*://}; printf '%s://%s' "${u%%://*}" "${rest#*@}" ;; *) printf '%s' "${u#*@}" ;; esac
}

# Restos de um "sudo" (pastas ou ficheiros do root na pasta da pessoa) e caminhos que deviam ser pastas e nao
# sao (ex.: ~/.local/bin como ficheiro). O Claude Code, o uv, o gh, o Node e o kit escrevem ai: deteta-se antes
# dos downloads e mostra-se o comando exato que resolve. So avisa: os passos que nao precisam desses caminhos
# continuam, e os que precisam (2 e 5, ver ws_perm_blocked) falham logo com E-PERM-01, sem descarregar nada.
ws_perm_scan() {
  local p q skip show="" cj fix=()
  cj=$(ws_claude_json)
  WS_PERM_BAD=()
  for p in "$WS_HOME" "$WS_HOME/bin" "$WS_HOME/kit" "$WS_HOME/kit-src" "$WS_HOME/node" "$WS_HOME/backup" \
    "$CLAUDE_DIR" "$CLAUDE_DIR/skills" "$CLAUDE_DIR/agents" "$CLAUDE_DIR/downloads" \
    "$HOME/.local" "$HOME/.local/bin" "$HOME/.local/share" "$HOME/.local/share/claude" "$HOME/.local/share/uv" \
    "$HOME/.cache" "$HOME/.cache/uv" "$HOME/.config" "$HOME/.config/gh" "$HOME/.npm"; do
    skip=0; for q in ${WS_PERM_BAD[@]+"${WS_PERM_BAD[@]}"}; do case "$p" in "$q"/*) skip=1 ;; esac; done
    [ "$skip" = 1 ] && continue
    if [ -L "$p" ] && [ ! -e "$p" ]; then :
    elif [ ! -e "$p" ]; then continue
    elif [ -d "$p" ] && [ -w "$p" ] && [ -x "$p" ]; then continue
    fi
    WS_PERM_BAD+=("$p"); fix+=("$p")
    if [ -d "$p" ]; then show="$show $(ws_show_path "$p")"; else show="$show $(ws_show_path "$p") ($(ws_m perm_nao_pasta))"; fi
  done
  for p in "$cj" "$CLAUDE_DIR/settings.json" "$WS_LOG" "$WS_HOME/manifest.json"; do
    [ -e "$p" ] || [ -L "$p" ] || continue
    skip=0; for q in ${WS_PERM_BAD[@]+"${WS_PERM_BAD[@]}"}; do case "$p" in "$q"/*) skip=1 ;; esac; done
    [ "$skip" = 1 ] && continue
    [ -r "$p" ] && [ -w "$p" ] && continue
    WS_PERM_BAD+=("$p"); fix+=("f:$p"); show="$show $(ws_show_path "$p")"
  done
  [ -n "$show" ] || return 0
  ws_log "permissions: no write access to:$show"
  ws_warn E-PERM-01 "$(ws_trim "$show")"
  ws_perm_fix_notes "${fix[@]}"
  return 0
}
ws_claude_json() { printf '%s\n' "${CLAUDE_CONFIG_DIR:-$HOME}/.claude.json"; }
# Um passo que vai escrever num destes caminhos, se o passo 0 os viu sem escrita: E-PERM-01 sem descarregar nada.
ws_perm_blocked() { # caminhos...
  local p q
  for p in "$@"; do
    for q in ${WS_PERM_BAD[@]+"${WS_PERM_BAD[@]}"}; do
      case "$p/" in "$q"/*) ws_fail E-PERM-01 "$(ws_show_path "$q")"; return 0 ;; esac
    done
  done
  return 1
}

# Proxy da sessao. O curl usa HTTPS_PROXY/https_proxy e, sem eles, ALL_PROXY/all_proxy (HTTP_PROXY nao conta para
# https). WS_PROXY_ENV e o proxy em uso, para mostrar; WS_PROXY e o que vai para o settings.json do Claude Code: so
# HTTPS_PROXY ou o proxy do sistema (o Claude Code nao usa ALL_PROXY nem SOCKS), e nunca um proxy que nao responde.
ws_detect_proxy() {
  WS_PROXY=""; WS_PROXY_ENV=""; WS_PROXY_DEAD=0
  local v p="" out en host port pac bp
  for v in HTTPS_PROXY https_proxy ALL_PROXY all_proxy; do
    p=${!v:-}; [ -n "$p" ] && break
  done
  if [ -n "$p" ]; then
    WS_PROXY_ENV="$(ws_proxy_show "$p") ($v)"
    case "$v" in HTTPS_PROXY|https_proxy) WS_PROXY=$p ;; esac
    ws_note "$(ws_msg s0_proxy_sistema PROXY="$WS_PROXY_ENV")"
  else
    out=$(scutil --proxy 2>/dev/null)
    en=$(printf '%s\n' "$out" | awk -F' : ' '/HTTPSEnable/{print $2}' | tr -d ' ')
    host=$(printf '%s\n' "$out" | awk -F' : ' '/HTTPSProxy/{print $2}' | tr -d ' ')
    port=$(printf '%s\n' "$out" | awk -F' : ' '/HTTPSPort/{print $2}' | tr -d ' ')
    if [ "$en" = 1 ] && [ -n "$host" ]; then
      p="http://$host:${port:-8080}"; WS_PROXY=$p; WS_PROXY_ENV=$p
      export HTTPS_PROXY="$p" https_proxy="$p"
      # As excecoes do proxy do sistema (Definicoes > Rede > Proxies) tambem vao para o NO_PROXY (e dai para o settings.json).
      bp=$(printf '%s\n' "$out" | ws_proxy_bypass)
      export NO_PROXY="localhost,127.0.0.1${NO_PROXY:+,$NO_PROXY}${bp:+,$bp}"
      ws_note "$(ws_msg s0_proxy_sistema PROXY="$p")"
    else
      pac=$(printf '%s\n' "$out" | awk -F' : ' '/ProxyAutoConfigURLString/{print $2}' | tr -d ' ')
      if [ "$(printf '%s\n' "$out" | awk -F' : ' '/ProxyAutoConfigEnable/{print $2}' | tr -d ' ')" = 1 ] && [ -n "$pac" ]; then
        WS_PAC=$pac; ws_note "$(ws_msg s0_proxy_pac PAC="$pac")"; return
      fi
      ws_note "$(ws_m s0_sem_proxy)"; return
    fi
  fi
  # Um proxy que ficou da rede do escritorio ou de uma VPN antiga: nome que nao resolve, porta fechada, SOCKS morto.
  if ws_proxy_dead "$p"; then
    WS_PROXY_DEAD=1; WS_PROXY=""
    ws_log "proxy does not answer: $WS_PROXY_ENV"
  fi
}

# Excecoes do proxy do sistema (o ExceptionsList do "scutil --proxy", lido do stdin) no formato do NO_PROXY, separadas
# por virgulas. As mesmas regras que o Merge-WsNoProxy do Windows: "*.empresa.pt" passa a ".empresa.pt"; os outros
# curingas, "<local>" e as redes (169.254/16) nao tem equivalente e ficam de fora.
ws_proxy_bypass() {
  LC_ALL=C awk '
    /ExceptionsList[[:space:]]*:[[:space:]]*<array>/ { on = 1; next }
    on && /^[[:space:]]*}/ { on = 0; next }
    on && /:/ { v = $0; sub(/^[^:]*:[[:space:]]*/, "", v); sub(/[[:space:]]+$/, "", v); sub(/^[A-Za-z][A-Za-z0-9+.-]*:\/\//, "", v)
      if (v ~ /^\*\./) v = substr(v, 2)
      if (v ~ /^[A-Za-z0-9._:-]+$/ && !(v in seen)) { seen[v] = 1; out = out (out == "" ? "" : ",") v } }
    END { printf "%s", out }'
}

# Proxy para mostrar no ecra, sem utilizador nem palavra-passe (http://u:p@proxy:8080 -> http://proxy:8080).
ws_proxy_show() { case "$1" in *://*@*) printf '%s://%s' "${1%%://*}" "${1##*@}" ;; *@*) printf '%s' "${1##*@}" ;; *) printf '%s' "$1" ;; esac; }

# 0 se o proxy nao responde: nao resolve (5; 6 num proxy SOCKS), recusa a ligacao (7), falha o SOCKS (97) ou nem
# aceita a ligacao em 5 s. Um proxy que responde, mesmo com 407 ou 403, conta como vivo (esses casos sao tratados
# pelo codigo HTTP).
ws_proxy_dead() { # url-do-proxy
  local w rc err ph
  [ -n "$1" ] || return 1
  [ "$1" = "${WS_PROBE_URL:-}" ] && return "$WS_PROBE_RC"
  w=$(curl -sS -o /dev/null --connect-timeout 5 -m 15 -x "$1" -A "$WS_UA" -w '%{time_connect}' https://api.anthropic.com/ 2>"$WS_TMP/proxy-probe.err" </dev/null); rc=$?
  err=$(cat "$WS_TMP/proxy-probe.err" 2>/dev/null); [ -n "$err" ] && printf '%s\n' "$err" >> "$WS_STEP_LOG"
  ws_log "proxy probe: $(ws_proxy_show "$1") -> curl $rc, connect ${w:-?}"
  WS_PROBE_URL=$1; WS_PROBE_RC=1
  # Num proxy SOCKS, o curl da "nao resolve o servidor" (6), e nao o 5, quando o nome do proprio proxy nao resolve.
  # So o nome do proxy conta: um SOCKS vivo em que o destino nao resolve continua vivo (E-NET-02).
  ph=${1#*://}; ph=${ph##*@}; ph=${ph%%[:/]*}
  case "$rc" in
    5|7|97) WS_PROBE_RC=0 ;;
    6) case "$err" in *"resolve host: $ph"*) WS_PROBE_RC=0 ;; esac ;;
    28) awk -v t="${w:-0}" 'BEGIN { exit !(t + 0 == 0) }' && WS_PROBE_RC=0 ;;
  esac
  return "$WS_PROBE_RC"
}

# Proxy no "env" do settings.json do Claude Code: o Claude Code aplica-o por cima do ambiente do terminal.
ws_settings_proxy() {
  local f="$CLAUDE_DIR/settings.json" k p
  [ -f "$f" ] || return 1
  for k in HTTPS_PROXY https_proxy; do
    p=$(plutil -extract "env.$k" raw -o - "$f" 2>/dev/null </dev/null) && [ -n "$p" ] && { printf '%s' "$p"; return 0; }
  done
  return 1
}
# 0 se o Claude Code esta configurado com um proxy que nao responde nesta rede (ex.: o do escritorio, gravado por um
# setup anterior). WS_SP_SHOW fica com o proxy e o ficheiro, para mostrar.
# shellcheck disable=SC2088  # texto para mostrar, nao e um caminho a expandir
ws_settings_proxy_dead() {
  local p f="$CLAUDE_DIR/settings.json"
  p=$(ws_settings_proxy) || return 1
  case "$f" in "$HOME"/*) f="~/${f#"$HOME"/}" ;; esac
  WS_SP_SHOW="$(ws_proxy_show "$p") · $f"
  ws_proxy_dead "$p"
}

# NO_PROXY para o settings.json: localhost,127.0.0.1 mais o NO_PROXY da sessao, sem repetidos (nunca se perdem
# as excecoes da pessoa, ex.: os servidores internos da empresa).
ws_no_proxy() {
  local rest="localhost,127.0.0.1,${NO_PROXY:-},${no_proxy:-}" x out=""
  while [ -n "$rest" ]; do
    x=${rest%%,*}; case "$rest" in *,*) rest=${rest#*,} ;; *) rest="" ;; esac
    x=$(ws_trim "$x"); [ -n "$x" ] || continue
    case ",$out," in *",$x,"*) ;; *) out="${out:+$out,}$x" ;; esac
  done
  printf '%s' "$out"
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
  [ -n "$issuer" ] || { ws_log "no issuer (curl $rc)"; return 0; }
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
  local hosts h u i=0 dir="$WS_TMP/rede" base fails="" rc code conn redir rh blocked cprobe=$C_CLAUDE_INSTALL_SH_URL
  mkdir -p "$dir"; rm -f "$dir/codes"
  hosts=""
  for h in $C_NET_CHECK_HOSTS "$D_REPO_HOST" "$D_MEMORY_HOST"; do
    [ -n "$h" ] || continue
    # A raiz do claude.ai responde 403 ao curl mesmo numa rede aberta: testa-se o instalador (302 com a rede aberta),
    # para um filtro que devolve 403 nao passar por "acessivel".
    u="https://$h/"; [ "$u" = "$(ws_url_base "$cprobe")" ] && u=$cprobe
    case " $hosts " in *" $u "*) ;; *) hosts="$hosts $u" ;; esac
  done
  base=$(ws_url_base "$D_KIT_URL_MAC")
  case " $hosts " in *" $base "*) ;; *) hosts="$hosts $base" ;; esac
  WS_NET_TOTAL=0
  for h in $hosts; do WS_NET_TOTAL=$((WS_NET_TOTAL + 1)); done
  ws_say "  $(ws_msg a_verificar_rede N="$WS_NET_TOTAL")"
  for h in $hosts; do
    i=$((i + 1))
    ( code=$(curl -sS -o /dev/null --connect-timeout 8 -m 12 -A "$WS_UA" -w '%{http_code} %{http_connect} r=%{redirect_url}' "$h" 2>"$dir/$i.err" </dev/null); printf '%s %s %s\n' "$?" "$code" "$h" > "$dir/$i.res" ) &
  done
  wait
  WS_NET_OK=0; WS_NET_API_OK=1
  i=0
  for h in $hosts; do
    i=$((i + 1))
    read -r rc code conn redir _ < "$dir/$i.res" 2>/dev/null || { rc=99; code=000; conn=000; redir=r=; }
    code=$(ws_http_of "$code" "$conn")
    # O instalador do claude.ai: 403/451 e um filtro; um 3xx so conta se for para um servidor do workshop (com a rede
    # aberta, downloads.claude.ai), senao e a pagina de bloqueio de um filtro (Forcepoint, Websense).
    rh=""; blocked=0
    if [ "$h" = "$cprobe" ]; then
      case "$code" in
        403|451) blocked=1 ;;
        3??) rh=${redir#r=}; rh=${rh#*://}; rh=${rh%%[/?]*}; ws_host_known "$rh" || { blocked=1; code=html; } ;;
      esac
    fi
    ws_log "network: $h -> curl $rc HTTP $code${rh:+ -> $rh} $(tr '\n' ' ' < "$dir/$i.err" 2>/dev/null)"
    if [ "$rc" = 0 ] && [ "$code" != 407 ] && [ "$blocked" = 0 ]; then
      WS_NET_OK=$((WS_NET_OK + 1)); continue
    fi
    u=${h#*://}; u=${u%%/*}; fails="$fails $u"
    case "$h" in *api.anthropic.com*) WS_NET_API_OK=0 ;; esac
    printf '%s %s\n' "$(ws_net_code "$rc" "$code")" "$u" >> "$dir/codes"
  done
  if [ -n "$fails" ]; then
    ws_note "$(ws_msg s0_rede_falha LISTA="$(ws_trim "$fails")")"
    # Se a causa e o proxy (E-NET-03), o E-NET-05 ("define o HTTPS_PROXY") so confundia.
    # O mesmo com um ficheiro de certificados que nao existe (E-NET-09): a rede esta bem.
    [ "$WS_NET_API_OK" = 0 ] && ! grep -qxE 'E-NET-0[39]' "$dir/codes" && ws_warn E-NET-05 "api.anthropic.com"
    # um aviso por codigo, com os servidores desse codigo (o primeiro vai para os comandos do aviso)
    local c d; while IFS= read -r c; do
      [ -n "$c" ] || continue
      d=$(awk -v c="$c" '$1 == c { printf "%s%s", (n++ ? " " : ""), $2 }' "$dir/codes")
      [ "$c" = E-NET-03 ] && [ -n "${WS_PROXY_ENV:-}" ] && d=$WS_PROXY_ENV
      ws_warn "$c" "$d"
    done < <(cut -d ' ' -f 1 "$dir/codes" | sort -u)
  fi
}

# ================================================================= PASSO 1 - git
# Ordem: um git real no PATH (Command Line Tools, Homebrew, ...) -> o git portatil do workshop
# (dugite-native, em ~/.workshop-claude/git, sem admin). /usr/bin/git sem Command Line Tools e so
# um "shim" que abre o instalador da Apple: nunca o chamamos nesse caso.
ws_git_portatil_ok() { [ -x "$WS_HOME/bin/git" ] && [ -x "$WS_HOME/git/bin/git" ]; }
ws_s1_detect() {
  local g v
  g=$(command -v git 2>/dev/null)
  if [ "$g" = /usr/bin/git ] || [ -z "$g" ]; then
    if ws_clt_ok; then :
    elif ws_git_portatil_ok; then g="$WS_HOME/bin/git"
    else return 1
    fi
  fi
  v=$("${g:-git}" --version 2>>"$WS_STEP_LOG" </dev/null) || return 1
  WS_GIT_VER=$(ws_ver_of "$v")
  if [ "$g" = "$WS_HOME/bin/git" ]; then ws_detail "$(ws_msg s1_portatil VERSAO="$WS_GIT_VER")"; else ws_detail "$(ws_msg s1_ja VERSAO="$WS_GIT_VER")"; fi
  return 0
}
ws_s1_install() {
  local file sha url d
  if [ "$WS_ARCH" = arm64 ]; then file=$C_GIT_MAC_FILE_ARM64; sha=$C_GIT_MAC_SHA256_ARM64; else file=$C_GIT_MAC_FILE_X64; sha=$C_GIT_MAC_SHA256_X64; fi
  url=$(ws_expand "$C_GIT_MAC_URL" "" "" "" "" "$C_GIT_MAC_VERSION" "$file" "")
  d="$WS_TMP/git"; mkdir -p "$d" "$WS_HOME/bin" || { ws_fail E-PERM-01 "$WS_HOME"; return 1; }
  ws_dl_check "$url" "$d/$file" "$sha"
  case $? in 1) ws_dl_fail "$url"; return 1 ;; 2) ws_fail E-GIT-04 "SHA-256 $file"; return 1 ;; esac
  # O stderr do tar vai para o log: com um locale invalido (LC_ALL=en_US.utf8 vindo do Linux) o tar escreve
  # avisos de locale, que nao devem aparecer no terminal.
  rm -rf "$WS_HOME/git.tmp" && mkdir -p "$WS_HOME/git.tmp" && tar -xzf "$d/$file" -C "$WS_HOME/git.tmp" 2>>"$WS_STEP_LOG" ||
    { ws_fail E-PERM-01 "$WS_HOME/git"; return 1; }
  rm -rf "$WS_HOME/git" && mv "$WS_HOME/git.tmp" "$WS_HOME/git" || { ws_fail E-PERM-01 "$WS_HOME/git"; return 1; }
  # O wrapper define as variaveis do git portatil so para o proprio git (nao mexe no ambiente).
  # O wrapper fica em <WS_HOME>/bin/git e encontra o git portatil em <WS_HOME>/git a partir de onde esta.
  printf '%s\n' '#!/bin/sh' '# Workshop portable git (dugite-native, without the Apple Command Line Tools).' \
    'R="$(cd "$(dirname "$0")/.." && pwd)/git"' \
    'GIT_EXEC_PATH="$R/libexec/git-core" GIT_TEMPLATE_DIR="$R/share/git-core/templates" exec "$R/bin/git" "$@"' > "$WS_HOME/bin/git"
  chmod +x "$WS_HOME/bin/git" || { ws_fail E-PERM-01 "$WS_HOME/bin/git"; return 1; }
  ws_registar ficheiro git-portatil "$WS_HOME/git"
  ws_registar ficheiro git-wrapper "$WS_HOME/bin/git"
  hash -r 2>/dev/null || true
  ws_s1_detect || { ws_fail E-GIT-01 "git --version"; return 1; }
}

# ================================================================= PASSO 2 - Claude Code
# ~/.claude.json invalido (ex.: uma virgula a mais de uma edicao a mao): o instalador oficial e o "claude auth status"
# trocam-no por um ficheiro novo, e os servidores MCP da pessoa so ficam numa copia em ~/.claude/backups.
# Por isso verifica-se antes de qualquer comando do Claude Code (os passos 3, 7 e 12 dependem deste).
# O JSON.parse e o mesmo do Claude Code (node ou JXA). Sem node nem osascript, o teste passa (nao bloqueia).
ws_claude_json_ok() {
  local f="${CLAUDE_CONFIG_DIR:-$HOME}/.claude.json" r
  [ -s "$f" ] || return 0
  r=$(ws_js 'var t=readText(A[0]); if(!t||!t.replace(/^\uFEFF/,"").trim()) return "ok"; try{JSON.parse(t.replace(/^\uFEFF/,"")); return "ok";}catch(e){return "bad "+e.message;}' "$f" 2>/dev/null)
  case "$r" in bad*) ws_log "$f: $r"; ws_fail E-CC-04 "$(ws_path_show "$f")"; return 1 ;; esac
  return 0
}
ws_s2_detect() {
  local c v
  ws_claude_json_ok || return 1
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
  ws_claude_json_ok || return 1
  ws_perm_blocked "$HOME/.claude/downloads" "$HOME/.local/bin/claude" "$HOME/.local/share/claude" && return 1
  ws_say "  $(ws_m a_instalar)"
  if ! ws_dl "$C_CLAUDE_INSTALL_SH_URL" "$f"; then ws_dl_fail "$C_CLAUDE_INSTALL_SH_URL"; return 1; fi
  # O install.sh chama o curl sem limites: com o curlrc do setup (ws_curl_home) uma transferencia parada falha em vez
  # de esperar para sempre. O progresso vai aparecendo enquanto descarrega (sao mais de 200 MB).
  local ch rc n0; ch=$(ws_curl_home); n0=$(wc -c < "$WS_STEP_LOG")
  ws_hb_start "$HOME/.claude/downloads" "$HOME/.local/share/claude/versions"
  CURL_HOME="$ch" ws_run bash "$f" "$C_CLAUDE_CODE_VERSION"; rc=$?
  ws_hb_stop
  if [ "$rc" != 0 ]; then
    # Rede de seguranca: o Claude Code achou o ~/.claude.json corrompido, guardou-o e escreveu um novo.
    v=$(sed -n 's/.*[Bb]acked up to: *//p' "$WS_STEP_LOG" | head -n 1)
    if [ -n "$v" ]; then ws_fail E-CC-04 "$(ws_path_show "$v")"; else ws_fail "$(ws_installer_net_code "$n0" || echo E-CC-01)" "install.sh"; fi
    return 1
  fi
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
ws_auth_read() { # define WS_AUTH_LOGGED WS_AUTH_METHOD WS_AUTH_SOURCE WS_AUTH_SUB WS_AUTH_ORG WS_AUTH_PROVIDER
  local j flat rc
  # Limite largo: o "auth status" pode esperar pelo dialogo do Keychain.
  j=$(ws_timeout "$WS_TMO_AUTH" "$WS_CLAUDE" auth status 2>>"$WS_STEP_LOG" </dev/null); rc=$?
  [ "$rc" = 124 ] && ws_log "claude auth status: no answer in $WS_TMO_AUTH s"
  flat=$(printf '%s' "$j" | tr -d '\n')
  ws_jf() { printf '%s' "$flat" | sed -n "s/.*\"$1\"[[:space:]]*:[[:space:]]*\"\{0,1\}\([^\",}]*\)\"\{0,1\}.*/\1/p" | head -n 1; }
  WS_AUTH_LOGGED=$(ws_jf loggedIn); WS_AUTH_METHOD=$(ws_jf authMethod); WS_AUTH_SOURCE=$(ws_jf apiKeySource)
  WS_AUTH_SUB=$(ws_jf subscriptionType); WS_AUTH_ORG=$(ws_jf orgName); WS_AUTH_PROVIDER=$(ws_jf apiProvider)
  # Versoes sem "apiProvider": o metodo "third_party" e uma cloud (Bedrock, Vertex ou Foundry).
  [ -z "$WS_AUTH_PROVIDER" ] && [ "$WS_AUTH_METHOD" = third_party ] && WS_AUTH_PROVIDER=third_party
  ws_log "auth: loggedIn=$WS_AUTH_LOGGED authMethod=$WS_AUTH_METHOD apiKeySource=$WS_AUTH_SOURCE subscriptionType=$WS_AUTH_SUB apiProvider=$WS_AUTH_PROVIDER"
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
  # Bedrock, Vertex ou Foundry (na shell ou no "env" das definicoes): o login do Console e ignorado e, sem as
  # credenciais da cloud, o "claude -p" nunca acaba. O passo falha (o teste final fica por correr) com a origem.
  WS_AUTH_CLOUD=""
  case "${WS_AUTH_PROVIDER:-firstParty}" in
    firstParty) ;;
    *) WS_AUTH_CLOUD="$WS_AUTH_PROVIDER: $(ws_cloud_where || printf 'managed settings')"
       ws_detail "$(ws_msg s3_outro METODO="$WS_AUTH_PROVIDER")"; ws_fail E-CFG-04 "$WS_AUTH_CLOUD"; return 1 ;;
  esac
  case "$(ws_auth_classify)" in
    console) ws_detail "$(ws_msg s3_console EMAIL="${WS_AUTH_ORG:-Console}")"; WS_AUTH_OK=1; return 0 ;;
    assinatura)
      if [ "$WS_MODE" = install ] && [ -z "${WS_AUTH_ASKED:-}" ]; then return 1; fi
      ws_detail "$(ws_msg s3_outro METODO="claude.ai ($WS_AUTH_SUB)")"; ws_warn E-AUTH-02 "$WS_AUTH_SUB"; WS_AUTH_OK=1; return 0 ;;
    outro) ws_detail "$(ws_msg s3_outro METODO="${WS_AUTH_METHOD:-?}")"; ws_warn E-AUTH-03 "${WS_AUTH_SOURCE:-$WS_AUTH_METHOD}"; WS_AUTH_OK=1; return 0 ;;
    *) ws_fail E-AUTH-01 ""; return 1 ;;
  esac
}
ws_s3_install() {
  local kind; kind=$(ws_auth_classify)
  # Com uma cloud configurada, o login do Console seria ignorado: nao o oferecer.
  [ -n "${WS_AUTH_CLOUD:-}" ] && { ws_fail E-CFG-04 "$WS_AUTH_CLOUD"; return 1; }
  WS_AUTH_ASKED=1
  if [ "$kind" = assinatura ]; then
    if [ "$WS_SIM" = 1 ] || ! ws_ask "$(ws_m s3_pergunta_trocar)" n nunca-sim; then
      ws_note "$(ws_m s3_manter)"; ws_s3_detect; return 0
    fi
  elif [ "$WS_SIM" = 1 ]; then
    ws_note "$(ws_m s3_login_sim)"; ws_fail E-AUTH-01 ""; return 1
  elif ! ws_ask "$(ws_m s3_pergunta_login)" s; then
    # Sem terminal (agente de IA, tarefa do IDE): diz onde fazer o login.
    ws_has_tty || ws_note "$(ws_m s3_sem_tty)"
    ws_fail E-AUTH-01 ""; return 1
  fi
  ws_has_tty || { ws_note "$(ws_m s3_sem_tty)"; ws_fail E-AUTH-01 ""; return 1; }
  ws_log "\$ claude auth login --console (interativo)"
  ws_run_login "$WS_CLAUDE" auth login --console
  ws_s3_detect
}

# ================================================================= PASSO 4 - Node
# Com -e e nao -v: um node que responde ao -v mas nao corre scripts (um NODE_OPTIONS que o parte) nao serve.
ws_node_major() { "$1" -e 'process.stdout.write(process.versions.node)' 2>/dev/null </dev/null | sed -E 's/^([0-9]+).*/\1/'; }
# O Node do workshop inteiro? Um tar que acabou bem com a pasta temporaria apagada a meio (uma app de limpeza)
# deixa o bin/node sem o npm: o node -v responde e o "npm test" dos projetos nao.
ws_node_complete() { # pasta do node
  [ -x "$1/bin/node" ] && [ -f "$1/lib/node_modules/npm/bin/npm-cli.js" ] &&
    "$1/bin/node" "$1/lib/node_modules/npm/bin/npm-cli.js" -v </dev/null >/dev/null 2>&1
}

ws_node_candidates() {
  local brew major=${C_NODE_VERSION%%.*}
  [ -n "${WS_NODE:-}" ] && printf '%s\n' "$WS_NODE"
  command -v node 2>/dev/null
  printf '%s\n' "$WS_HOME/node/bin/node"
  brew=$(command -v brew 2>/dev/null) && printf '%s\n' "$("$brew" --prefix 2>/dev/null)/opt/node@$major/bin/node"
}

# Corre um comando como numa janela nova do Terminal: shell de login interativo (le o .zprofile e o .zshrc),
# com o ambiente e o PATH com que o launchd abre o Terminal (com o PATH do setup, o bloco do perfil nao voltava
# a por as pastas do workshop a frente do brew shellenv). E nunca com o terminal da pessoa: sessao nova sem
# terminal de controlo (setsid, pelo node: o macOS nao tem setsid nem timeout), stdin em /dev/null, stderr
# deitado fora, no maximo WS_NEWTERM_SECS segundos e o grupo inteiro morto no fim. Assim o .zshrc nao pode
# perguntar no terminal (compinit "insecure directories"), ficar com ele (setopt monitor, tmux), comer as
# teclas da pergunta seguinte nem parar o setup. O +m fica (sem controlo de tarefas, D-24).
# Imprime o que o comando escreveu. Devolve 1 se nao deu para saber: sem node, o shell nao respondeu a tempo,
# foi trocado por outro programa (exec tmux) ou falhou antes do comando.
ws_newterm() { # comando
  local sh=${SHELL:-/bin/zsh} out="$WS_TMP/newterm-$RANDOM.out" rc
  ws_tmp_gone
  [ -x "$sh" ] || sh=/bin/zsh
  [ -n "${WS_NODE:-}" ] && [ -x "$WS_NODE" ] || return 1
  case "$sh" in
    */zsh|*/bash) set -- "$sh" +m -lic "echo WS-NEWTERM; $1" ;;
    *) set -- "$sh" -lc "echo WS-NEWTERM; $1" ;;
  esac
  "$WS_NODE" -e "$WS_JS_NEWTERM" -- "${WS_NEWTERM_SECS:-15}" "$out" "$@" </dev/null >/dev/null 2>&1
  rc=$?
  if [ "$rc" = 0 ]; then LC_ALL=C awk 'f {print} $0 == "WS-NEWTERM" {f = 1} END {exit f ? 0 : 1}' "$out" 2>/dev/null; rc=$?; fi
  rm -f "$out"
  [ "$rc" = 0 ]
}

# Major do node que um terminal novo encontra (as skills e os testes chamam "node" pelo PATH):
# o numero, "none" (nenhum node que arranque) ou "unknown" (nao deu para saber, ver ws_newterm).
ws_login_node_major() {
  local o
  o=$(ws_newterm 'node -v') || { printf unknown; return 0; }
  o=$(printf '%s\n' "$o" | sed -nE 's/^v([0-9]+)\..*/\1/p' | head -n 1)
  printf '%s' "${o:-none}"
}

ws_s4_detect() {
  local c m found=""
  while IFS= read -r c; do
    [ -n "$c" ] && [ -x "$c" ] || continue
    [ "$c" = "$WS_HOME/node/bin/node" ] && ! ws_node_complete "$WS_HOME/node" && { ws_log "incomplete node in $WS_HOME/node (npm does not start)"; continue; }
    m=$(ws_node_major "$c")
    if [ -n "$m" ] && [ "$m" -ge "$C_NODE_MIN_MAJOR" ] 2>/dev/null; then found=$c; break; fi
  done <<EOF
$(ws_node_candidates)
EOF
  WS_NODE=$found
  [ -n "$WS_NODE" ] || { ws_fail E-NODE-01 "node >= $C_NODE_MIN_MAJOR"; return 1; }
  case "$WS_NODE" in "$WS_HOME"/node/bin/node|*/opt/node@*/bin/node) WS_NODE_BIN_DIR=$(dirname "$WS_NODE") ;; esac
  ws_detail "$(ws_msg s4_ja VERSAO="$("$WS_NODE" -v </dev/null)" CAMINHO="${WS_NODE/#"$HOME"/~}")"
  # O setup corre o node sem o NODE_OPTIONS da pessoa (ws_env_sanitize); se esse partir o Node, os hooks, a
  # statusline e as skills partem no terminal dela.
  if [ -n "${WS_NODE_OPTIONS0:-}" ] && ! NODE_OPTIONS="$WS_NODE_OPTIONS0" "$WS_NODE" -e 0 >/dev/null 2>&1 </dev/null; then
    ws_warn E-NODE-03 "NODE_OPTIONS=$WS_NODE_OPTIONS0"
  fi
  ws_registar_flush
  # O --uninstall so precisa do WS_NODE: nao corre o perfil da pessoa.
  [ "$WS_MODE" = uninstall ] && return 0
  m=$(ws_login_node_major)
  ws_log "node in a new login shell: $m"
  if [ "$m" != unknown ] && ! [ "$m" -ge "$C_NODE_MIN_MAJOR" ] 2>/dev/null && [ "$WS_MODE" = install ]; then
    ws_profile_update
    m=$(ws_login_node_major)
    ws_log "node in a new login shell: $m"
  fi
  # unknown: o .zshrc nao respondeu (ou arranca o tmux); nao e um Node antigo, so uma nota.
  if [ "$m" = unknown ]; then
    ws_note "$(ws_msg s4_terminal_sem_resposta SEGUNDOS="${WS_NEWTERM_SECS:-15}")"
  elif ! [ "$m" -ge "$C_NODE_MIN_MAJOR" ] 2>/dev/null; then
    [ "$m" = none ] && m=""
    ws_warn E-NODE-02 "${m:+v$m}"
  fi
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
    # O brew falhou (Command Line Tools antigas, sem rede): diz que segue pelo download oficial.
    [ -n "${WS_NODE:-}" ] || ws_say "  $(ws_m brew_falhou)"
  fi
  if [ -z "${WS_NODE:-}" ]; then
    local file="node-v$C_NODE_VERSION-darwin-$WS_ARCH.tar.xz" url sums want got d="$WS_TMP/node"
    rm -rf "$d"; mkdir -p "$d/x"
    url=$(ws_expand "$C_NODE_DIST_URL" "" "" "" "" "$C_NODE_VERSION" "$file" "")
    ws_say "  $(ws_msg a_descarregar O_QUE="$file")"
    sums=$(ws_expand "$C_NODE_DIST_URL" "" "" "" "" "$C_NODE_VERSION" SHASUMS256.txt "")
    ws_dl "$sums" "$d/SHASUMS256.txt" || { ws_dl_fail "$sums"; return 1; }
    want=$(ws_sum_for "$d/SHASUMS256.txt" "$file")
    ws_dl_check "$url" "$d/$file" "$want"
    case $? in 1) ws_dl_fail "$url"; return 1 ;; 2) ws_fail E-NODE-01 "SHA-256 $file"; return 1 ;; esac
    # Extrai-se ao lado do destino (fora da pasta temporaria) e so se troca depois de o npm arrancar.
    local nn="$WS_HOME/node.new"
    rm -rf "$nn"; mkdir -p "$nn" || { ws_fail E-PERM-01 "$nn"; return 1; }
    ws_run tar -xJf "$d/$file" -C "$nn" || { rm -rf "$nn"; ws_fail E-NODE-01 "tar"; return 1; }
    ws_node_complete "$nn/node-v$C_NODE_VERSION-darwin-$WS_ARCH" || { rm -rf "$nn"; ws_fail E-NODE-01 "tar (incomplete)"; return 1; }
    rm -rf "$WS_HOME/node.old"; [ -d "$WS_HOME/node" ] && mv "$WS_HOME/node" "$WS_HOME/node.old"
    mv "$nn/node-v$C_NODE_VERSION-darwin-$WS_ARCH" "$WS_HOME/node" || { ws_fail E-PERM-01 "$WS_HOME/node"; return 1; }
    rm -rf "$WS_HOME/node.old" "$nn"
    WS_NODE="$WS_HOME/node/bin/node"; WS_NODE_BIN_DIR="$WS_HOME/node/bin"
  fi
  ws_path_setup
  "$WS_NODE" -e 0 >/dev/null 2>&1 </dev/null || { ws_fail E-PERM-02 "$WS_NODE"; return 1; }
  ws_profile_update
  ws_s4_detect
}

# ================================================================= PASSO 5 - uv
# O uv usa-se sempre pelo caminho (WS_UV): primeiro o do workshop (~/.local/bin/uv), depois o do PATH.
# Um uv antigo primeiro no PATH (Homebrew, pipx) nao serve: o passo 10 precisa de "uv tool install --managed-python"
# (UV_MIN_VERSION no repos.conf). Se so houver um antigo, o passo instala o do workshop.
ws_s5_detect() {
  local c v first min=${C_UV_MIN_VERSION:-0.6.8}
  WS_UV=""
  for c in "$HOME/.local/bin/uv" "$(command -v uv 2>/dev/null)"; do
    [ -n "$c" ] && [ -x "$c" ] && [ -z "$WS_UV" ] || continue
    v=$("$c" --version 2>/dev/null </dev/null) || continue
    if ! ws_ver_ge "$(ws_ver_of "$v")" "$min"; then ws_log "uv too old: $c ($v < $min)"; continue; fi
    WS_UV=$c; WS_UV_VER=$(ws_ver_of "$v")
  done
  [ -n "$WS_UV" ] || return 1
  first=$(command -v uv 2>/dev/null)
  if [ -n "$first" ] && [ "$first" != "$WS_UV" ]; then
    v=$("$first" --version 2>/dev/null </dev/null)
    ws_ver_ge "$(ws_ver_of "$v")" "$min" || ws_warn E-UV-02 "$first: ${v:-?}"
  fi
  ws_detail "$(ws_msg s5_ja VERSAO="$WS_UV_VER")"
}
ws_s5_install() {
  local f="$WS_TMP/uv-install.sh" url
  ws_perm_blocked "$HOME/.local/bin/uv" && return 1
  url=$(ws_expand "$C_UV_INSTALL_SH_URL" "" "" "" "" "$C_UV_VERSION" "" "")
  ws_dl "$url" "$f" || { ws_dl_fail "$url"; return 1; }
  # Como no passo 2: o instalador do uv usa o curl sem limites (curlrc do setup) e descarrega para uma pasta nossa.
  local ch t="$WS_TMP/uv-tmp" rc n0; ch=$(ws_curl_home); mkdir -p "$t"; n0=$(wc -c < "$WS_STEP_LOG")
  ws_hb_start "$t"
  TMPDIR="$t" CURL_HOME="$ch" UV_NO_MODIFY_PATH=1 UV_INSTALL_DIR="$HOME/.local/bin" ws_run sh "$f"; rc=$?
  ws_hb_stop
  [ "$rc" = 0 ] || { ws_fail "$(ws_installer_net_code "$n0" || echo E-UV-01)" "install.sh"; return 1; }
  ws_path_setup
  ws_s5_detect || { ws_fail E-UV-01 "uv --version"; return 1; }
  ws_profile_update
}

# ================================================================= PASSO 6 - gh
# Servidores com login no gh (hosts.yml), para dizer qual nao respondeu.
ws_gh_hosts() {
  local d=${GH_CONFIG_DIR:-${XDG_CONFIG_HOME:-$HOME/.config}/gh} h
  h=$(sed -n 's/^\([A-Za-z0-9][A-Za-z0-9.:-]*\):.*/\1/p' "$d/hosts.yml" 2>/dev/null | tr '\n' ' ')
  h=$(ws_trim "${GH_HOST:+$GH_HOST }$h")
  printf '%s' "${h:-github.com}"
}
ws_s6_detect() { # [caminho do gh] (depois de instalar: o que o setup acabou de por, nao o primeiro do PATH)
  local g=${1:-gh} v rc
  v=$(ws_timeout 15 "$g" --version 2>/dev/null </dev/null | head -n 1)
  [ -n "$v" ] || return 1
  WS_GH_VER=$(ws_ver_of "$v")
  ws_detail "$(ws_msg s6_ja VERSAO="$WS_GH_VER")"
  # O login no GitHub e obrigatorio (o Projeto 2 le issues e abre PRs com o gh).
  # O "gh auth status" fala com cada servidor do hosts.yml: sem VPN ou com um proxy parado nunca acabaria.
  ws_timeout "$WS_TMO_GH" "$g" auth status >/dev/null 2>&1 </dev/null; rc=$?
  if [ "$rc" != 0 ] && [ "$rc" != 124 ] && [ "$WS_MODE" = install ] && [ "$WS_SIM" != 1 ] && [ -z "${WS_GH_ASKED:-}" ] && ws_has_tty; then
    WS_GH_ASKED=1
    if ws_ask "$(ws_m s6_pergunta_login)" s; then
      ws_log "\$ gh auth login --hostname github.com --git-protocol https --web (interativo)"
      ws_run_login "$g" auth login --hostname github.com --git-protocol https --web
      ws_timeout "$WS_TMO_GH" "$g" auth status >/dev/null 2>&1 </dev/null; rc=$?
    fi
  fi
  if [ "$rc" = 124 ]; then
    # Sem resposta: o problema e a rede (VPN, proxy), nao o login. Nao perguntar nem voltar a instalar.
    ws_log "gh auth status: no answer in $WS_TMO_GH s"
    WS_GH_SEM_LOGIN=1; WS_GH_SEM_REDE=1
    ws_detail ""
    ws_fail E-GH-03 "$(ws_gh_hosts)"
    return 1
  elif [ "$rc" != 0 ]; then
    WS_GH_SEM_LOGIN=1
    ws_detail ""
    ws_fail E-GH-02 ""
    return 1
  fi
  WS_GH_SEM_LOGIN=0; WS_GH_SEM_REDE=0
  # O git passa a usar as credenciais do gh (push e PR no /task-report sem pedir password).
  [ "$WS_MODE" = install ] && ws_timeout "$WS_TMO_GH" "$g" auth setup-git >>"$WS_STEP_LOG" 2>&1 </dev/null
  return 0
}
ws_s6_install() {
  # O GitHub nao respondeu (VPN, proxy): descarregar outra vez nao ajuda.
  if [ "${WS_GH_SEM_REDE:-}" = 1 ]; then ws_fail E-GH-03 "$(ws_gh_hosts)"; return 1; fi
  # Ja instalado, so falta o login: nao voltar a descarregar.
  if [ "${WS_GH_SEM_LOGIN:-}" = 1 ] && command -v gh >/dev/null 2>&1; then ws_fail E-GH-02 ""; return 1; fi
  local brew; brew=$(command -v brew 2>/dev/null)
  if [ -n "$brew" ] && [ -w "$("$brew" --prefix 2>/dev/null)/bin" ]; then
    ws_say "  $(ws_m a_instalar) (brew install gh)"
    HOMEBREW_NO_AUTO_UPDATE=1 ws_run "$brew" install gh && { ws_s6_detect "$("$brew" --prefix 2>/dev/null)/bin/gh"; return $?; }
    ws_say "  $(ws_m brew_falhou)"
  fi
  local a=arm64 file sums url d="$WS_TMP/gh" want got
  [ "$WS_ARCH" = x64 ] && a=amd64
  file="gh_${C_GH_VERSION}_macOS_$a.zip"
  rm -rf "$d"; mkdir -p "$d/x"
  url=$(ws_expand "$C_GH_RELEASE_URL" "" "" "" "" "$C_GH_VERSION" "$file" "")
  ws_say "  $(ws_msg a_descarregar O_QUE="$file")"
  sums=$(ws_expand "$C_GH_RELEASE_URL" "" "" "" "" "$C_GH_VERSION" "gh_${C_GH_VERSION}_checksums.txt" "")
  ws_dl "$sums" "$d/sums" || { ws_dl_fail "$sums"; return 1; }
  want=$(ws_sum_for "$d/sums" "$file")
  ws_dl_check "$url" "$d/$file" "$want"
  case $? in 1) ws_dl_fail "$url"; return 1 ;; 2) ws_fail E-GH-01 "SHA-256 $file"; return 1 ;; esac
  ws_run unzip -q -o "$d/$file" -d "$d/x" || { ws_fail E-GH-01 unzip; return 1; }
  mkdir -p "$WS_HOME/bin"
  cp -f "$d/x/gh_${C_GH_VERSION}_macOS_$a/bin/gh" "$WS_HOME/bin/gh.tmp" && mv -f "$WS_HOME/bin/gh.tmp" "$WS_HOME/bin/gh" || { ws_fail E-PERM-01 "$WS_HOME/bin"; return 1; }
  chmod +x "$WS_HOME/bin/gh"
  ws_path_setup
  ws_profile_update
  # Pelo caminho: um gh estragado mais a frente no PATH nao faz o passo culpar o download.
  ws_s6_detect "$WS_HOME/bin/gh" && return 0
  [ "${WS_GH_SEM_LOGIN:-}" = 1 ] && return 1
  ws_fail E-GH-01 "$WS_HOME/bin/gh --version"; return 1
}

# ================================================================= PASSO 7 - Jira: MCP Atlassian + Atlassian CLI (reserva)
ws_acli() { command -v acli 2>/dev/null || { [ -x "$WS_HOME/bin/acli" ] && printf '%s' "$WS_HOME/bin/acli"; }; }
# Ha dois logins no acli: o global (acli auth login, Jira + Confluence) e o so do Jira (acli jira auth login).
# Com limite de tempo (sem VPN ou com um proxy parado, o acli espera pela rede); sem resposta, nao tenta o segundo.
ws_acli_login_ok() {
  local rc
  ws_timeout "$WS_TMO_GH" "$1" auth status >/dev/null 2>&1 </dev/null; rc=$?
  [ "$rc" = 0 ] && return 0
  [ "$rc" = 124 ] && { ws_log "acli auth status: no answer in $WS_TMO_GH s"; return 1; }
  ws_timeout "$WS_TMO_GH" "$1" jira auth status >/dev/null 2>&1 </dev/null
}
# O acli e a reserva do MCP: faltar ou nao ter login nunca bloqueia o passo (aviso ou nota).
ws_s7_acli() { # $1=1 depois de tentar instalar
  local a v
  a=$(ws_acli)
  if [ -z "$a" ] || ! v=$(ws_timeout 15 "$a" --version 2>/dev/null </dev/null); then
    [ "$WS_MODE" = install ] && [ "${1:-}" != 1 ] && return 1
    # O tar do acli num disco cheio ("Write failed: No space left") nao e a rede da empresa.
    if [ "$WS_MODE" = install ] && ws_disk_full; then WS_DISK_FULL=1; ws_warn E-SO-06 "$(ws_disk_detail) · acli"; else ws_warn E-ACLI-01 "${WS_ACLI_ERR:-}"; fi
    return 0
  fi
  ws_detail "$(ws_msg s7_ja_acli VERSAO="$(ws_ver_of "$v")")"
  ws_acli_login_ok "$a" && return 0
  if [ "$WS_MODE" = install ] && [ "$WS_SIM" != 1 ] && [ -z "${WS_ACLI_ASKED:-}" ] && ws_has_tty; then
    WS_ACLI_ASKED=1
    if ws_ask "$(ws_m s7_pergunta_acli)" s; then
      ws_log "\$ acli auth login (interativo)"
      ws_run_login "$a" auth login
    fi
  fi
  ws_acli_login_ok "$a" || ws_note "$(ws_m s7_acli_login)"
  return 0
}
# "claude mcp get" com limite de tempo (liga-se ao servidor para ver o estado). A saida fica em WS_MCP_OUT.
# O codigo de saida so diz que o registo existe, mesmo que aponte para um programa ou URL que ja nao serve:
# o destino le-se com ws_mcp_field (linhas "  Command: ..." e "  URL: ...").
ws_mcp_get() { # nome
  local rc
  WS_MCP_OUT=$(ws_timeout "$WS_TMO_MCP" "$WS_CLAUDE" mcp get "$1" 2>&1 </dev/null); rc=$?
  printf '%s\n' "$WS_MCP_OUT" >> "$WS_STEP_LOG"
  [ "$rc" = 124 ] && ws_log "claude mcp get $1: no answer in $WS_TMO_MCP s"
  return "$rc"
}
ws_mcp_field() { printf '%s\n' "$WS_MCP_OUT" | sed -n "s/^[[:space:]]*$1:[[:space:]]*//p" | head -n 1; }
# O registo atlassian (lido por ws_mcp_get) aponta para o MCP do workshop? Um antigo (o SSE .../v1/sse, ou um
# servidor local como o mcp-remote) nao serve. Se a saida nao tiver nenhum destes campos, nao da para comparar: aceita.
ws_s7_url_ok() {
  local u; u=$(ws_mcp_field URL)
  [ "$u" = "$C_ATLASSIAN_MCP_URL" ] && return 0
  [ -n "$u" ] && return 1
  [ -z "$(ws_mcp_field Command)" ]
}
ws_s7_detect() {
  [ -n "${WS_CLAUDE:-}" ] || WS_CLAUDE=$(ws_claude)
  # Um ~/.claude.json sem leitura parece vazio ao "claude mcp get" (so "No MCP server named"): e E-PERM-01, nao E-MCP-01.
  ws_perm_blocked "$(ws_claude_json)" && return 1
  ws_mcp_get atlassian || { ws_fail E-MCP-01 ""; return 1; }
  ws_s7_url_ok || { ws_fail E-MCP-01 "atlassian: $(ws_mcp_field URL)$(ws_mcp_field Command)"; return 1; }
  ws_detail "$(ws_m s7_ja)"
  ws_note "$(ws_m s7_oauth)"
  WS_TODO_MCP=1
  ws_s7_acli "${1:-}"
}
ws_s7_acli_install() { # falhar aqui so deixa um aviso (WS_ACLI_ERR)
  local file sha url d="$WS_TMP/acli"
  if [ "$WS_ARCH" = arm64 ]; then file=$C_ACLI_MAC_FILE_ARM64; sha=$C_ACLI_MAC_SHA256_ARM64; else file=$C_ACLI_MAC_FILE_X64; sha=$C_ACLI_MAC_SHA256_X64; fi
  url=$(ws_expand "$C_ACLI_MAC_URL" "" "" "" "" "$C_ACLI_VERSION" "$file" "")
  rm -rf "$d"; mkdir -p "$d/x" "$WS_HOME/bin" || { WS_ACLI_ERR="$WS_HOME/bin"; return 1; }
  ws_say "  $(ws_msg a_descarregar O_QUE="$file")"
  ws_dl_check "$url" "$d/$file" "$sha"
  case $? in
    1) WS_ACLI_ERR="$(ws_net_code "$WS_DL_RC" "$WS_DL_HTTP") ${WS_DL_HOST:+$WS_DL_HOST · }$url"; return 1 ;;
    2) WS_ACLI_ERR="SHA-256 $file"; return 1 ;;
  esac
  ws_run tar -xzf "$d/$file" -C "$d/x" || { WS_ACLI_ERR="tar $file"; return 1; }
  cp -f "$d/x/${file%.tar.gz}/acli" "$WS_HOME/bin/acli.tmp" && chmod +x "$WS_HOME/bin/acli.tmp" &&
    mv -f "$WS_HOME/bin/acli.tmp" "$WS_HOME/bin/acli" || { WS_ACLI_ERR="$WS_HOME/bin/acli"; return 1; }
  ws_path_setup
  ws_profile_update
}
ws_s7_install() {
  ws_set SN 7 ""   # o detect volta a escrever as notas
  local old
  ws_perm_blocked "$(ws_claude_json)" && return 1
  # Um registo atlassian antigo (ex.: o SSE .../v1/sse) e trocado pelo do workshop, com uma nota a dizer qual era.
  if ws_mcp_get atlassian && ! ws_s7_url_ok; then
    old="$(ws_mcp_field URL)$(ws_mcp_field Command)"
    ws_run "$WS_CLAUDE" mcp remove --scope user atlassian || ws_run "$WS_CLAUDE" mcp remove atlassian ||
      { ws_fail E-MCP-01 "claude mcp remove atlassian"; return 1; }
    ws_note "$(ws_msg s7_substituido ANTIGO="${old:-?}")"
  fi
  if ! ws_mcp_get atlassian; then
    ws_run "$WS_CLAUDE" mcp add --transport http --scope user atlassian "$C_ATLASSIAN_MCP_URL" || { ws_fail E-MCP-01 ""; return 1; }
    ws_registar mcp atlassian
    # "mcp get" e nao "mcp list": o list verifica todos os servidores da pessoa (lento se algum nao responder).
    ws_mcp_get atlassian || { ws_fail E-MCP-01 "claude mcp get atlassian"; return 1; }
  fi
  [ -n "$(ws_acli)" ] || ws_s7_acli_install
  ws_s7_detect 1
}

# ================================================================= PASSO 8 - instalacao ao nivel do utilizador
ws_iu() { # subcomando [extra]
  local sub=$1; shift
  set -- --node "$WS_NODE" --kit-src "$KIT_SRC" --lingua-maquina "${WS_LANG:-en}" "$@"
  [ -n "${WS_CA_PEM:-}" ] && set -- "$@" --ca-pem "$WS_CA_PEM"
  [ -n "${WS_PROXY:-}" ] && set -- "$@" --https-proxy "$WS_PROXY"
  # Sem --https-proxy, o install-user tira o proxy que um setup anterior gravou (ex.: o do escritorio).
  { [ -n "${WS_CA_PEM:-}" ] || [ -n "${WS_PROXY:-}" ]; } && set -- "$@" --no-proxy "$(ws_no_proxy)"
  "$WS_NODE" "$KIT_SRC/installer/install-user.mjs" "$sub" "$@" 2>>"$WS_STEP_LOG" </dev/null
}
ws_s8_parse() { # le a saida TSV de install-user
  local k v skills=0 agentes=0 lang="" nossa=0 kit="" de="" para="" err="" det="" lingua=0 outra=0
  # WS_S8_SO_LINGUA=1: so falta mudar a lingua (WORKSHOP_LANG diferente da instalada); WS_S8_DE/PARA: de qual para qual
  WS_S8_SO_LINGUA=0; WS_S8_DE=""; WS_S8_PARA=""
  while IFS="$WS_TAB" read -r k v; do
    case "$k" in
      skills) skills=$v ;; agentes) agentes=$v ;;
      language) lang=$v ;; language_nossa) nossa=$v ;; lingua_kit) kit=$v ;;
      aviso) [ "$v" = E-CFG-06 ] && ws_note "$(ws_m s8_statusline_mantida)"; ws_warn "$v" "statusLine" ;;
      erro) err=$v ;;
      erro_detalhe) det=$v ;;
      falta) ws_log "missing: $v"
        # "lingua do kit (pt -> en)" ou "language do Claude (European Portuguese -> Brazilian Portuguese)"
        case "$v" in "lingua do kit ("*" -> "*")"|"language do Claude ("*" -> "*")")
          lingua=1
          de=${v#*"("}; de=${de%%" -> "*}; para=${v##*" -> "}; para=${para%")"}
          case "$v" in "lingua do kit"*) case "$de" in pt|en) de=$(ws_m "lingua_$de"); para=$(ws_m "lingua_$para") ;; *) de="" ;; esac ;; esac ;;
          *) outra=1 ;;
        esac ;;
      # skills/agentes do kit que a pessoa tinha alterado: a copia dela ficou no backup
      editado) ws_note "$(ws_msg s8_editado NOME="${v##*/}" PASTA="$(ws_tilde "$v")")" ;;
      anteriores) ws_note "$(ws_msg s8_anteriores PASTA="$(ws_tilde "$v")")" ;;
    esac
  done <<EOF
$1
EOF
  [ "$lingua" = 1 ] && [ "$outra" = 0 ] && [ -z "$err" ] && WS_S8_SO_LINGUA=1
  WS_S8_DE=$de; WS_S8_PARA=$para
  # settings.json com erro: o caminho e onde esta o erro (linha e coluna, ou o campo) ficam no ecra.
  if [ -n "$err" ]; then
    case "$err" in E-CFG-05) det="${CLAUDE_DIR/#"$HOME"/~}/settings.json${det:+ · $det}" ;; esac
    ws_fail "$err" "$det"; return 0
  fi
  ws_detail "$(ws_msg s8_ja SKILLS="$skills" AGENTES="$agentes")"
  # Em --check, a lingua instalada diferente da pedida (WORKSHOP_LANG) nao e uma instalacao a meio: diz-se qual e.
  [ "${WS_MODE:-}" != install ] && [ -n "$de" ] &&
    ws_note "$(ws_msg s8_lingua_muda DE="$de" PARA="$para" CMD="curl -fsSL ${D_SETUP_MAC_URL:-<url>/setup-mac.sh} | WORKSHOP_LANG=${WS_LANG:-en} bash")"
  kit=$(ws_m "lingua_${kit:-${WS_LANG_KIT:-en}}")
  if [ -z "$lang" ]; then ws_note "$(ws_msg s8_lingua_nenhuma LINGUA="${WS_LANG:-en}" KIT="$kit")"
  elif [ "$nossa" = 1 ]; then ws_note "$(ws_msg s8_lingua_nossa NOME="$lang" KIT="$kit")"
  else ws_note "$(ws_msg s8_lingua_tua NOME="$lang" KIT="$kit")"; fi
}
# Com CLAUDE_CONFIG_DIR, as skills, os hooks e os MCP vao para essa pasta: diz-se qual e e, se um terminal novo
# nao tiver a mesma variavel (exportada so neste terminal, por um IDE ou pelo direnv), o claude de la nao os ve.
ws_s8_config_dir() {
  [ -n "${CLAUDE_CONFIG_DIR:-}" ] || return 0
  ws_note "$(ws_msg s8_claude_dir CAMINHO="$(ws_path_show "$CLAUDE_DIR")")"
  local nt
  nt=$(ws_newterm 'printf "%s\n" "${CLAUDE_CONFIG_DIR:-}"') || return 0
  nt=$(printf '%s\n' "$nt" | head -n 1)
  ws_log "CLAUDE_CONFIG_DIR in a new login shell: ${nt:-unset}"
  [ "${nt%/}" = "$CLAUDE_CONFIG_DIR" ] || ws_warn E-CFG-09 "$(ws_path_show "$CLAUDE_DIR") · new terminal: ${nt:-not set}"
}
ws_s8_detect() {
  ws_kit_ensure || { ws_fail E-KIT-01 ""; return 1; }
  ws_registar_flush
  local out rc
  out=$(ws_iu verificar); rc=$?
  printf '%s\n' "$out" >> "$WS_STEP_LOG"
  ws_s8_parse "$out"
  if [ "$rc" = 0 ]; then ws_s8_config_dir; return 0; fi
  # --check/--doctor: so a lingua diferente da pedida (WORKSHOP_LANG) nao e uma instalacao a meio (ver a nota)
  [ "${WS_MODE:-}" != install ] && [ "${WS_S8_SO_LINGUA:-0}" = 1 ] && return 0
  return 1
}
ws_s8_install() {
  ws_set SW 8 ""; ws_set SN 8 ""; ws_set SF 8 ""
  ws_kit_ensure || { ws_fail E-KIT-01 ""; return 1; }
  # a mudanca de lingua que o detect viu (a saida do instalar nao a diz): no fim, uma nota a dizer qual foi
  local out rc de=${WS_S8_DE:-} para=${WS_S8_PARA:-}
  if [ "$WS_SUBST_SL" = 1 ]; then out=$(ws_iu instalar --substituir-statusline); else out=$(ws_iu instalar); fi
  rc=$?
  printf '%s\n' "$out" >> "$WS_STEP_LOG"
  ws_s8_parse "$out"
  # Numa falha o detalhe ("0 skills, 0 agents") e as notas da lingua nao valem: fica o titulo do codigo.
  [ "$rc" = 0 ] || { ws_set SD 8 ""; ws_set SN 8 ""; }
  case "$rc" in 0) ;; 3) [ -n "${SF_8:-}" ] || ws_fail E-CFG-05 "$CLAUDE_DIR/settings.json"; return 1 ;; *) ws_fail E-KIT-03 "install-user ($rc)"; return 1 ;; esac
  [ -n "$de" ] && ws_note "$(ws_msg s8_lingua_mudou DE="$de" PARA="$para")"
  ws_registar_flush
  ws_s8_config_dir
  return 0
}

# ================================================================= PASSO 9 - projetos
# Nomes desde a v1.0.0-rc.2: o projeto de treino e ~/workshop-claude/practice-project (era exemplo-projeto-real)
# e a tag do estado inicial da Arena e arena-start (era arena-inicial). Instalacoes antigas sao migradas sem
# perder trabalho: a pasta antiga so e movida se a nova nao existir, e a tag nova aponta para o mesmo commit.
WS_PRACTICE=practice-project
WS_PRACTICE_OLD=exemplo-projeto-real
# git so no .git da propria pasta (nunca num repositorio acima, ex.: um HOME com os dotfiles em git), sem tag assinada.
ws_git_own() { local d=$1; shift; git --git-dir="$d/.git" -c tag.gpgsign=false "$@" </dev/null; }
# Estado de um projeto do workshop (pasta marca ref):
#   vazia       nao existe ou esta vazia
#   alheia      tem ficheiros e nao tem a marca do kit (E-DEMO-03: o setup nao lhe toca)
#   incompleta  montagem interrompida: marca {"status":"incomplete"} (Ctrl-C a meio da copia) ou sem commits no
#               proprio .git (git falhou, ou a pessoa apagou o .git); o assembler volta a montar e, se a pasta
#               nao for so a copia incompleta do kit, guarda-a primeiro em ~/.workshop-claude/backup/
#   ok          marca e ref (a tag arena-start da Arena, o HEAD do projeto de treino)
#   propria     marca e commits, mas sem a ref: historico da pessoa (E-DEMO-04, fica como esta)
ws_proj_state() {
  local dir=$1 mark=$2 ref=$3
  if [ ! -e "$dir" ] || [ -z "$(ls -A "$dir" 2>/dev/null)" ]; then echo vazia; return 0; fi
  [ -f "$dir/$mark" ] || { echo alheia; return 0; }
  if grep -Eq '"status" *: *"incomplete"' "$dir/$mark" 2>/dev/null; then echo incompleta; return 0; fi
  ws_git_own "$dir" rev-parse -q --verify HEAD >/dev/null 2>&1 || { echo incompleta; return 0; }
  if ws_git_own "$dir" rev-parse -q --verify "$ref" >/dev/null 2>&1; then echo ok; else echo propria; fi
}
ws_s9_migrate() {
  local demo="$WS_PROJ/demo-project" old="$WS_PROJ/$WS_PRACTICE_OLD" new="$WS_PROJ/$WS_PRACTICE"
  if [ -f "$demo/.arena-kit.json" ] && ! ws_git_own "$demo" rev-parse -q --verify refs/tags/arena-start >/dev/null 2>&1 &&
    ws_git_own "$demo" rev-parse -q --verify refs/tags/arena-inicial >/dev/null 2>&1; then
    ws_git_own "$demo" tag arena-start arena-inicial >>"$WS_LOG" 2>&1 && ws_log "demo-project: tag arena-start added (from arena-inicial)"
  fi
  # Montagem interrompida entre o commit do kit e a tag: com a marca final, so o commit do kit e nada alterado, a
  # Arena e a do kit e ganha a tag (sem ela parecia historico da pessoa, E-DEMO-04).
  if [ -f "$demo/.arena-kit.json" ] && ! grep -Eq '"status" *: *"incomplete"' "$demo/.arena-kit.json" 2>/dev/null &&
    ! ws_git_own "$demo" rev-parse -q --verify refs/tags/arena-start >/dev/null 2>&1 &&
    [ "$(ws_git_own "$demo" rev-list --count HEAD 2>/dev/null)" = 1 ] &&
    [ -z "$(ws_git_own "$demo" --work-tree="$demo" status --porcelain --untracked-files=all 2>/dev/null)" ]; then
    ws_git_own "$demo" tag arena-start HEAD >>"$WS_LOG" 2>&1 && ws_log "demo-project: tag arena-start added (interrupted assembly)"
  fi
  if [ ! -e "$new" ] && [ -f "$old/.sandbox-kit.json" ]; then
    mv "$old" "$new" >>"$WS_LOG" 2>&1 && ws_log "practice project moved: $old -> $new"
  fi
  return 0
}
ws_s9_detect() {
  local demo="$WS_PROJ/demo-project" sb="$WS_PROJ/$WS_PRACTICE" ref=refs/tags/arena-start
  ws_kit_ensure || { ws_fail E-KIT-01 ""; return 1; }
  # Ao instalar, as migracoes (arena-inicial -> arena-start, a pasta do projeto de treino) vem antes do estado: sem
  # elas uma Arena antiga e intacta parecia historico da pessoa (E-DEMO-04). No --check, que nao muda nada, a tag
  # antiga conta como a nova (o /demo-reset dessa Arena usa a arena-inicial).
  if [ "$WS_MODE" = install ]; then ws_s9_migrate
  else ws_git_own "$demo" rev-parse -q --verify "$ref" >/dev/null 2>&1 || ref=refs/tags/arena-inicial; fi
  case "$(ws_proj_state "$demo" .arena-kit.json "$ref")" in
    ok) ;;
    propria) ws_warn E-DEMO-04 "$(ws_tilde "$demo")" ;;
    *) ws_fail E-DEMO-01 "$demo"; return 1 ;;
  esac
  if [ -f "$KIT_SRC/installer/assemble-sandbox.mjs" ]; then
    [ "$(ws_proj_state "$sb" .sandbox-kit.json HEAD)" = ok ] || { ws_fail E-DEMO-01 "$sb"; return 1; }
  fi
  ws_detail "$(ws_msg s9_ja PROJETOS="$WS_PROJ_SHOW")"
  ws_s9_lang_check
  [ "$WS_MODE" = install ] || ws_s9_tests
  return 0
}
# Os projetos ja montados nao mudam de lingua sozinhos (tem o trabalho da pessoa): se a lingua do kit mudou
# (WORKSHOP_LANG), diz-se como os ter na lingua nova em vez de um "Already done" calado.
ws_s9_lang_check() {
  local f l nome
  for f in "demo-project/.arena-kit.json" "$WS_PRACTICE/.sandbox-kit.json"; do
    [ -f "$WS_PROJ/$f" ] || continue
    l=$(ws_json_field "$WS_PROJ/$f" 'language|lingua')
    case "$l" in pt|en) ;; *) continue ;; esac
    [ "$l" = "${WS_LANG_KIT:-en}" ] && continue
    nome="$WS_PROJ_SHOW/${f%%/*}"
    ws_note "$(ws_msg s9_lingua_diferente CAMINHO="$nome" LINGUA="$(ws_m "lingua_$l")" KIT="$(ws_m "lingua_${WS_LANG_KIT:-en}")")"
  done
  return 0
}
# Numero de testes que passaram na saida do "node --test" ("ℹ pass 16"; TAP antigo: "# pass 7").
# Alternativa e LC_ALL=C, e nao [#ℹ]: no locale C (LANG vazio ou invalido) o sed le o ℹ como 3 bytes soltos.
ws_count_pass() { LC_ALL=C sed -n -E 's/^(#|ℹ) *pass ([0-9]+).*/\2/p' | tail -n 1; }
ws_s9_tests() {
  local demo="$WS_PROJ/demo-project" out n
  if [ ! -f "$demo/test/app.test.js" ]; then ws_note "$(ws_m s9_sem_testes)"; return 0; fi
  out=$(cd "$demo" && "$WS_NODE" --test test/app.test.js 2>&1 </dev/null); local rc=$?
  printf '%s\n' "$out" >> "$WS_STEP_LOG"
  n=$(printf '%s\n' "$out" | ws_count_pass)
  if [ "$rc" = 0 ]; then ws_note "$(ws_msg s9_testes_ok OK="${n:-?}")"; return 0; fi
  ws_fail E-DEMO-02 "node --test test/app.test.js"; return 1
}
# Monta um projeto conforme o estado (ws_proj_state). Nunca apaga trabalho da pessoa: o historico proprio fica
# como esta (E-DEMO-04) e uma pasta substituida vai para o backup (o assembler diz onde: "backup" no JSON).
ws_assemble() { # script destino marca ref [--node ...]
  local script=$1 dest=$2 mark=$3 ref=$4; shift 4
  local force="" out rc why bk
  case "$(ws_proj_state "$dest" "$mark" "$ref")" in
    alheia) ws_fail E-DEMO-03 "$dest"; return 1 ;;
    incompleta) force=--force ;;
    propria) ws_warn E-DEMO-04 "$(ws_tilde "$dest")"; ws_registar projeto "$(basename "$dest")" "$dest"; return 0 ;;
  esac
  ws_log "\$ $WS_NODE $KIT_SRC/installer/$script --dest $dest $* $force"
  out=$("$WS_NODE" "$KIT_SRC/installer/$script" --dest "$dest" "$@" ${force:+"$force"} 2>>"$WS_STEP_LOG" </dev/null); rc=$?
  printf '%s\n' "$out" >> "$WS_STEP_LOG"
  ws_log "  -> exit $rc"
  if [ "$rc" != 0 ]; then
    # A causa no ecra (ex.: "git commit ... failed: ..."), nao so no log.
    why=$(sed -n 's/^ERROR: //p' "$WS_STEP_LOG" | tail -n 1 | cut -c1-200 | ws_redact)
    ws_fail E-DEMO-01 "$script${why:+: $why}"; return 1
  fi
  bk=$(printf '%s\n' "$out" | sed -n 's/.*"backup":"\([^"]*\)".*/\1/p' | head -n 1)
  [ -n "$bk" ] && ws_note "$(ws_msg s9_backup PASTA="$(ws_tilde "$bk")")"
  ws_registar projeto "$(basename "$dest")" "$dest"
}
ws_s9_install() {
  ws_set SF 9 ""
  ws_kit_ensure || { ws_fail E-KIT-01 ""; return 1; }
  mkdir -p "$WS_PROJ" || { ws_fail E-PERM-01 "$WS_PROJ"; return 1; }
  ws_s9_migrate
  ws_assemble assemble-demo.mjs "$WS_PROJ/demo-project" .arena-kit.json refs/tags/arena-start --node "$WS_NODE" --language "${WS_LANG_KIT:-en}" || return 1
  if [ -f "$KIT_SRC/installer/assemble-sandbox.mjs" ]; then
    ws_assemble assemble-sandbox.mjs "$WS_PROJ/$WS_PRACTICE" .sandbox-kit.json HEAD --language "${WS_LANG_KIT:-en}" || return 1
  fi
  ws_detail "$(ws_msg s9_ja PROJETOS="$WS_PROJ_SHOW")"
  ws_s9_lang_check
  ws_s9_tests
}

# ================================================================= PASSO 10 - app Agent Memory (nao bloqueante)
# Instala o wheel publicado (SHA-256 verificado) com "uv tool install --managed-python" (Python com FTS5).
# Desde a v0.5.0 os comandos da app sao "agent-memory" (CLI e MCP) e "agent-memory-gui" (janela); "memoria" e
# "memoria-gui" ficam como sinonimos, e as versoes antigas so tem esses. O servidor MCP regista-se como
# "agent-memory" (um registo antigo "memoria" e substituido). As memorias sao dados da pessoa: ficam em
# ~/.agent-memory (ou em ~/.memoria, de versoes antigas; ver ws_memory_home) e o --desinstalar nunca lhes toca.
WS_APP_BUNDLE='Agent Memory.app'
WS_APP_BUNDLE_OLD='Memória.app'
WS_APP_EXE=agent-memory-app
WS_MCP_NAME=agent-memory
ws_uv_bin_dir() { "${WS_UV:-uv}" tool dir --bin 2>/dev/null </dev/null || printf '%s' "$HOME/.local/bin"; }
ws_memory_bin() {
  local d b; d=$(ws_uv_bin_dir)
  for b in "$d/agent-memory" "$d/memoria"; do [ -x "$b" ] && { printf '%s' "$b"; return 0; }; done
  return 1
}
# Pasta dos dados da app (o mesmo contrato da app): AGENT_MEMORY_HOME; MEMORIA_HOME; ~/.memoria se existir e
# ~/.agent-memory nao; senao ~/.agent-memory. Nunca se move nem apaga nada.
ws_memory_home() {
  if [ -n "${AGENT_MEMORY_HOME:-}" ]; then printf '%s' "$AGENT_MEMORY_HOME"
  elif [ -n "${MEMORIA_HOME:-}" ]; then printf '%s' "$MEMORIA_HOME"
  elif [ ! -d "$HOME/.agent-memory" ] && [ -d "$HOME/.memoria" ]; then printf '%s' "$HOME/.memoria"
  else printf '%s' "$HOME/.agent-memory"; fi
}
# shellcheck disable=SC2088  # texto para mostrar, nao e um caminho a expandir
ws_memory_home_show() { local h; h=$(ws_memory_home); case "$h" in "$HOME"/*) printf '~/%s' "${h#"$HOME"/}" ;; *) printf '%s' "$h" ;; esac; }
# Nome do wheel publicado para a versao (lido do SHA256SUMS: "memoria-..." ate a v0.4, o nome novo depois).
ws_memory_wheel() {
  local ver=$1 f=$2 w
  w=$(awk -v v="-$ver-py3-none-any.whl" '{n=$2; sub(/^\*/,"",n); if (substr(n, length(n)-length(v)+1) == v) {print n; exit}}' "$f" 2>/dev/null)
  printf '%s' "${w:-memoria-$ver-py3-none-any.whl}"
}
ws_s10_detect() {
  local b ver=${C_MEMORY_APP_VERSION#v}
  b=$(ws_memory_bin) || { ws_fail E-MEM-01 ""; return 1; }
  "${WS_UV:-uv}" tool list 2>/dev/null </dev/null | grep -Eq "^(agent-memory|agent_memory|memoria) v?$ver( |$)" || { ws_fail E-MEM-03 "version $ver"; return 1; }
  if [ -n "${WS_CLAUDE:-}" ]; then
    # ~/.claude.json sem leitura: o "mcp get" falha como se a app nao estivesse registada (reinstalar nao resolve)
    ws_perm_blocked "$(ws_claude_json)" && return 1
    ws_memory_mcp_ok "$b" || { ws_fail E-MEM-03 "mcp"; return 1; }
  fi
  # O config.json e o atalho sao extras: ao instalar refazem-se aqui (sem reinstalar a app). Sem escrita na pasta
  # (dados ou ~/Applications), reinstalar nao resolve: fica um aviso (o selftest diz o resto).
  if [ ! -f "$(ws_memory_home)/config.json" ]; then
    if [ "$WS_MODE" = install ]; then ws_memory_config || ws_log "config.json not written in $(ws_memory_home_show) (see the step output)"
    elif ws_dir_writable "$(ws_memory_home)"; then ws_fail E-MEM-03 "config.json"; return 1; fi
  fi
  if [ ! -x "$HOME/Applications/$WS_APP_BUNDLE/Contents/MacOS/$WS_APP_EXE" ]; then
    if [ "$WS_MODE" = install ]; then ws_memory_shortcut "$b" || ws_warn E-MEM-06 "$(ws_show_path "$HOME/Applications")"
    elif ws_dir_writable "$HOME/Applications"; then ws_fail E-MEM-03 "shortcut"; return 1
    else ws_warn E-MEM-06 "$(ws_show_path "$HOME/Applications")"; fi
  fi
  ws_memory_selftest "$b" "$ver"
  return 0
}
# 0 se a pasta existe e aceita escrita, ou se ainda nao existe e a pasta de cima aceita.
ws_dir_writable() {
  if [ -d "$1" ]; then [ -w "$1" ] && [ -x "$1" ]; return; fi
  [ ! -e "$1" ] && [ ! -L "$1" ] && [ -w "$(dirname "$1")" ]
}
# O registo MCP "agent-memory" aponta para este programa? (o "claude mcp get" sai com 0 para qualquer registo, mesmo
# um que aponte para um programa que ja nao existe, ex.: de outro utilizador num Mac migrado). Um registo antigo
# "memoria" tambem fica por arrumar. Sem a linha "Command:" na saida (outro formato), basta o caminho aparecer.
ws_memory_mcp_ok() { # bin
  local c
  ws_mcp_get "$WS_MCP_NAME" || return 1
  c=$(ws_mcp_field Command)
  if [ -n "$c" ]; then [ "$c" = "$1" ] || return 1
  else case "$WS_MCP_OUT" in *"$1"*) ;; *) return 1 ;; esac; fi
  # Com um PYTHONHOME/PYTHONPATH na shell, um registo sem as variaveis vazias nao arranca.
  [ -z "${WS_PYTHON_ENV0:-}" ] || ws_memory_mcp_env || return 1
  ! ws_mcp_get memoria
}
# O registo lido por ws_mcp_get tem o PYTHONHOME vazio (ws_memory_mcp)?
ws_memory_mcp_env() { case "$WS_MCP_OUT" in *PYTHONHOME=*) return 0 ;; esac; return 1; }
# Corre "agent-memory selftest" e mostra o Python gerido pelo uv ("Agent Memory 0.5.0 · Python 3.12.13 · Darwin arm64").
# O texto do selftest segue a lingua da app (pt, en, hi, he): pede-se em ingles (AGENT_MEMORY_LANG=en e, para
# versoes antigas, MEMORIA_LANG=en, como o resto do setup) e o resultado vem do codigo de saida. So a etiqueta
# [OK] e igual em todas as linguas; qualquer outra etiqueta ([FAIL]...) e um motivo de falha.
ws_memory_selftest() {
  local out rc py fails
  out=$(AGENT_MEMORY_LANG=en MEMORIA_LANG=en "$1" selftest 2>&1 </dev/null); rc=$?
  printf '%s\n' "$out" >> "$WS_STEP_LOG"
  py=$(printf '%s\n' "$out" | sed -nE 's/.*Python ([0-9]+\.[0-9]+(\.[0-9]+)?).*/\1/p' | head -n 1)
  # O setup corre a app sem o PYTHONHOME/PYTHONPATH da pessoa (ws_env_sanitize) e o MCP regista-se sem eles; no
  # terminal dela, "agent-memory" escrito a mao continua a falhar.
  [ -n "${WS_PYTHON_ENV0:-}" ] && ws_warn E-MEM-09 "$WS_PYTHON_ENV0"
  if [ "$rc" = 0 ]; then
    ws_detail "$(ws_msg s10_ok VERSAO="$2" PY="${py:-?}")"; return 0
  fi
  ws_detail "$(ws_msg s10_ja VERSAO="$2")"
  fails=$(printf '%s\n' "$out" | grep -Ev '^[[:space:]]*\[OK\]' | sed -nE 's/^[[:space:]]*\[[^]]+\][[:space:]]*//p' | tr '\n' ';' | sed 's/;$//')
  # Pasta das memorias sem escrita (do root depois de um sudo, um ficheiro, um link partido): reinstalar nao
  # resolve, por isso tem o seu codigo e o comando exato.
  # O SQLite do Python do uv nao abre bases de dados com mais de 504 bytes no caminho (MAX_PATHNAME 512 com o
  # "-journal"): com uma HOME muito comprida o indice nunca abre, e reinstalar ou reindexar nao resolve.
  local nb; nb=$(printf '%s' "$(ws_memory_home)/.index/index-v3.sqlite" | LC_ALL=C wc -c | tr -d ' ')
  if [ "$nb" -gt 504 ] 2>/dev/null; then ws_warn E-MEM-10 "$nb bytes: $(ws_memory_home_show)"; return 1; fi
  case "$fails" in
    *"Cannot write to"*|*"readonly database"*|*"Permission denied"*|*"Read-only file system"*|*"Not a directory"*|*"File exists"*)
      ws_warn E-MEM-07 "$fails"; ws_perm_fix_notes "$(ws_memory_home)" ;;
    *) ws_warn E-MEM-05 "${fails:-$(basename "$1") selftest ($rc)}" ;;
  esac
  return 1
}
ws_s10_install() {
  local ver=${C_MEMORY_APP_VERSION#v} d="$WS_TMP/agent-memory" whl want got b f dist
  [ -n "${WS_CLAUDE:-}" ] && ws_perm_blocked "$(ws_claude_json)" && return 1
  rm -rf "$d"; mkdir -p "$d"
  if ! ws_dl "$(ws_release_url memory SHA256SUMS)" "$d/SHA256SUMS" auth; then
    case "$WS_DL_HTTP" in 404|403|410) ws_fail E-MEM-01 "$C_MEMORY_APP_VERSION" ;; *) ws_dl_fail SHA256SUMS ;; esac
    return 1
  fi
  whl=$(ws_memory_wheel "$ver" "$d/SHA256SUMS"); dist=${whl%%-*}
  # No ecra so o nome da app (o wheel ate a v0.5 chama-se "memoria-..."); o nome do ficheiro fica no log.
  ws_log "app wheel: $whl"
  ws_say "  $(ws_m a_descarregar_app)"
  for f in "$whl" constraints.txt; do
    ws_dl_check "$(ws_release_url memory "$f")" "$d/$f" "$(ws_sum_for "$d/SHA256SUMS" "$f")" auth
    case $? in
      1) case "$WS_DL_HTTP" in 404|403|410) ws_fail E-MEM-01 "$f" ;; *) ws_dl_fail "$f" ;; esac; return 1 ;;
      2) ws_fail E-MEM-02 "$f"; return 1 ;;
    esac
  done
  ws_say "  $(ws_m a_instalar)"
  if ! ws_uv_tool_install "$d/$whl" "$d/constraints.txt"; then
    # Certificado da empresa: o passo 0 so testa a api.anthropic.com, e um proxy pode inspecionar so o github.com
    # (o Python do uv) ou o pypi.org. Repete uma vez com os certificados do sistema (Keychain).
    if ! grep -qiE 'certificate|UnknownIssuer|CERTIFICATE_VERIFY_FAILED|local issuer|self.signed' "$WS_STEP_LOG"; then
      # O uv apontado para um espelho de pacotes da empresa (UV_DEFAULT_INDEX...) que nao responde ou nao tem os
      # pacotes: a causa e essa, nao o pypi.org. O URL aparece sem utilizador nem palavra-passe.
      local ix; ix=$(ws_uv_index)
      if [ -n "$ix" ]; then ws_fail E-MEM-08 "$ix"; else ws_fail E-MEM-03 "uv tool install"; fi
      return 1
    fi
    # O uv da prioridade ao SSL_CERT_FILE (e ao SSL_CERT_DIR) mesmo com UV_SYSTEM_CERTS: um ficheiro antigo de
    # certificados (um Zscaler de outra empresa) so se resolve sem ele, e so neste comando.
    [ "${UV_SYSTEM_CERTS:-}" = true ] && [ -z "${SSL_CERT_FILE:-}${SSL_CERT_DIR:-}" ] && { ws_fail E-NET-04 "uv: github.com / pypi.org"; return 1; }
    ws_log "uv: certificate error, retrying with UV_SYSTEM_CERTS=true, without SSL_CERT_FILE/SSL_CERT_DIR"
    if ( unset SSL_CERT_FILE SSL_CERT_DIR; UV_SYSTEM_CERTS=true ws_uv_tool_install "$d/$whl" "$d/constraints.txt" ); then
      [ -n "${SSL_CERT_FILE:-}" ] && ws_warn E-NET-09 "SSL_CERT_FILE=$SSL_CERT_FILE"
    else
      if [ -n "${SSL_CERT_FILE:-}" ]; then ws_fail E-NET-09 "SSL_CERT_FILE=$SSL_CERT_FILE"; else ws_fail E-NET-04 "uv: github.com / pypi.org"; fi
      return 1
    fi
  fi
  # A distribuicao mudou de nome? Tirar a antiga do uv (so o programa: os dados ficam).
  if [ "$dist" != memoria ] && "${WS_UV:-uv}" tool list 2>/dev/null </dev/null | grep -Eq '^memoria v?[0-9]'; then
    "${WS_UV:-uv}" tool uninstall memoria >>"$WS_LOG" 2>&1 </dev/null || true
    ws_uv_tool_install "$d/$whl" "$d/constraints.txt" >/dev/null 2>&1 || true
  fi
  ws_registar app "$dist"
  b=$(ws_memory_bin) || { ws_fail E-MEM-03 "agent-memory"; return 1; }
  # O config.json e o atalho nao impedem o resto: sem eles a app, o MCP e o selftest continuam.
  ws_memory_config || ws_log "config.json not written in $(ws_memory_home_show) (see the step output)"
  ws_memory_shortcut "$b" || ws_warn E-MEM-06 "$(ws_show_path "$HOME/Applications")"
  ws_memory_mcp "$b" || { ws_fail E-MEM-03 "claude mcp add $WS_MCP_NAME"; return 1; }
  ws_memory_selftest "$b" "$ver"
  ws_note "$(ws_m s10_update)"
}
# Espelho de pacotes para o uv (o primeiro definido), sem utilizador nem palavra-passe no URL.
ws_uv_index() {
  local v
  for v in UV_DEFAULT_INDEX UV_INDEX_URL UV_INDEX UV_EXTRA_INDEX_URL; do
    [ -n "${!v:-}" ] || continue
    printf '%s=%s' "$v" "$(ws_proxy_show "${!v}")"; return 0
  done
  return 1
}
# "uv tool install" do wheel, com o uv do passo 5 e o Python gerido pelo uv (--managed-python): nao depende de
# nenhum Python do sistema. As variaveis que o proibiriam sao retiradas so deste comando (env -u), nunca globalmente.
# Sem as Command Line Tools, o /usr/bin/install_name_tool (que o uv corre depois de descarregar o Python) e um "shim"
# da Apple que abre o dialogo "instalar ferramentas de programador": so neste comando, um install_name_tool vazio
# fica primeiro no PATH (o acerto da libpython so serve para compilar extensoes em C).
ws_uv_tool_install() { # wheel constraints
  local pre=""
  if [ "$(command -v install_name_tool 2>/dev/null)" = /usr/bin/install_name_tool ] && ! ws_clt_ok; then
    pre="$WS_TMP/no-clt"
    { mkdir -p "$pre" && printf '#!/bin/sh\nexit 0\n' > "$pre/install_name_tool" && chmod +x "$pre/install_name_tool"; } || pre=""
    [ -n "$pre" ] && ws_log "no Command Line Tools: empty install_name_tool for uv"
  fi
  ws_run env -u UV_PYTHON_DOWNLOADS -u UV_NO_MANAGED_PYTHON -u UV_PYTHON_PREFERENCE -u UV_PYTHON ${pre:+"PATH=$pre:$PATH"} \
    "${WS_UV:-uv}" tool install --managed-python --python "$C_PYTHON_VERSION" "$1" --constraints "$2" --force
}
# Regista o servidor MCP da app como "agent-memory" (comando "<bin> mcp"). Um registo antigo "memoria" sai, e um
# "agent-memory" que aponte para outro programa (ex.: o "memoria" de uma versao antiga) e refeito, com uma nota.
ws_memory_mcp() {
  local b=$1 c
  [ -n "${WS_CLAUDE:-}" ] || return 0
  if ws_mcp_get memoria; then
    ws_timeout "$WS_TMO_MCP" "$WS_CLAUDE" mcp remove --scope user memoria >>"$WS_LOG" 2>&1 </dev/null || true
  fi
  if ws_mcp_get "$WS_MCP_NAME"; then
    c=$(ws_mcp_field Command)
    # Um registo de uma versao anterior do setup (sem o PYTHONHOME vazio, ver abaixo) e refeito.
    if [ -n "$c" ]; then [ "$c" = "$b" ] && ws_memory_mcp_env && return 0
    else case "$WS_MCP_OUT" in *"$b"*) ws_memory_mcp_env && return 0 ;; esac; fi
    ws_timeout "$WS_TMO_MCP" "$WS_CLAUDE" mcp remove --scope user "$WS_MCP_NAME" >>"$WS_LOG" 2>&1 </dev/null || true
    [ -n "$c" ] && [ "$c" != "$b" ] && ws_note "$(ws_msg s10_mcp_substituido ANTIGO="$c")"
  fi
  # O Claude Code passa ao servidor o ambiente do terminal: um PYTHONHOME ou PYTHONPATH de um Anaconda antigo
  # partia o Python da app ("No module named encodings"). Vazios, o Python ignora-os. O nome vem antes do -e
  # (o -e aceita varios valores e engolia o nome).
  ws_run "$WS_CLAUDE" mcp add --scope user "$WS_MCP_NAME" -e PYTHONHOME= -e PYTHONPATH= -e PYTHONSTARTUP= -- "$b" mcp || return 1
  ws_registar mcp "$WS_MCP_NAME"
}
# <pasta dos dados>/config.json com as chaves que a app usa para se atualizar (mesmos nomes que o repos.conf).
# Sem escrita na pasta (do root depois de um sudo, um ficheiro, um link partido) devolve 1: os erros vao para o
# log do passo, nunca para o ecra.
ws_memory_config() {
  local home cfg uvp
  home=$(ws_memory_home); cfg="$home/config.json"
  mkdir -p "$home" 2>>"$WS_STEP_LOG" || return 1
  uvp=${WS_UV:-$(command -v uv 2>/dev/null)}
  if [ -n "${WS_NODE:-}" ]; then
    "$WS_NODE" -e '
      const fs = require("fs"); const [f, repo, pat, py, uv] = process.argv.slice(1);
      let c = {}; try { c = JSON.parse(fs.readFileSync(f, "utf8")); } catch {}
      Object.assign(c, { MEMORY_APP_REPO_URL: repo, RELEASE_DOWNLOAD_URL: pat, PYTHON_VERSION: py });
      if (uv) c.UV = uv;
      try { fs.writeFileSync(f, JSON.stringify(c, null, 2) + "\n"); }
      catch (e) { process.stderr.write("config.json: " + e.message + "\n"); process.exit(1); }' "$cfg" "$C_MEMORY_APP_REPO_URL" "$C_RELEASE_DOWNLOAD_URL" "$C_PYTHON_VERSION" "$uvp" </dev/null 2>>"$WS_STEP_LOG" || return 1
  elif [ ! -f "$cfg" ]; then
    { printf '{\n  "MEMORY_APP_REPO_URL": "%s",\n  "RELEASE_DOWNLOAD_URL": "%s",\n  "PYTHON_VERSION": "%s",\n  "UV": "%s"\n}\n' \
      "$C_MEMORY_APP_REPO_URL" "$C_RELEASE_DOWNLOAD_URL" "$C_PYTHON_VERSION" "$uvp" > "$cfg"; } 2>>"$WS_STEP_LOG" || return 1
  fi
}
ws_memory_shortcut() { # bundle .app minimo que abre a janela da app pelo caminho absoluto
  local app="$HOME/Applications/$WS_APP_BUNDLE" old="$HOME/Applications/$WS_APP_BUNDLE_OLD" b=$1 gui g
  gui=$b
  for g in "$(dirname "$b")/agent-memory-gui" "$(dirname "$b")/memoria-gui"; do [ -x "$g" ] && { gui=$g; break; }; done
  # O atalho antigo ("Memória.app") era nosso: sai (so se tiver o nosso executavel).
  [ -x "$old/Contents/MacOS/memoria-app" ] && rm -rf "$old" 2>>"$WS_STEP_LOG"
  # Cada escrita e verificada e os erros vao para o log do passo: ~/Applications sem escrita (ou um atalho
  # antigo so de leitura) devolve 1 e o passo continua com um aviso (E-MEM-06).
  { mkdir -p "$app/Contents/MacOS" &&
  cat > "$app/Contents/Info.plist" <<EOF &&
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key><string>Agent Memory</string>
  <key>CFBundleDisplayName</key><string>Agent Memory</string>
  <key>CFBundleIdentifier</key><string>pt.workshop.agent-memory</string>
  <key>CFBundleExecutable</key><string>$WS_APP_EXE</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleShortVersionString</key><string>${C_MEMORY_APP_VERSION#v}</string>
  <key>LSMinimumSystemVersion</key><string>11.0</string>
  <key>NSHighResolutionCapable</key><true/>
</dict>
</plist>
EOF
  printf '#!/bin/sh\nexec "%s" "$@"\n' "$gui" > "$app/Contents/MacOS/$WS_APP_EXE" &&
  chmod +x "$app/Contents/MacOS/$WS_APP_EXE"; } 2>>"$WS_STEP_LOG" || return 1
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
  WSR_JSON=0; WSR_ERRO=1; WSR_RESPOSTA=""; WSR_CURTA=""; WSR_USD=""; WSR_USD_TEXTO="US\$ ?"; WSR_CAUSA=""; WSR_CMDS=""
  # O pricing.json da release esta na pasta temporaria: uma app de limpeza pode te-lo apagado entretanto.
  [ -f "${WS_PRICING:-}" ] || [ -z "${WS_INJ_PRICING:-}" ] || printf '%s\n' "$WS_INJ_PRICING" > "$WS_PRICING" 2>/dev/null
  while IFS="$WS_TAB" read -r k v; do
    case "$k" in
      json) WSR_JSON=$v ;; erro) WSR_ERRO=$v ;; resposta) WSR_RESPOSTA=$v ;; resposta_curta) WSR_CURTA=$v ;; usd) WSR_USD=$v ;; usd_texto) WSR_USD_TEXTO=$v ;;
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
  local out="$WS_TMP/smoke.json" err="$WS_TMP/smoke.err" t0 t1 gw keys
  [ -n "${WS_CLAUDE:-}" ] || WS_CLAUDE=$(ws_claude)
  # Um proxy morto no settings.json faz o claude -p tentar em silencio durante 3 minutos: falha ja, com a causa.
  if ws_settings_proxy_dead; then ws_fail E-NET-08 "$WS_SP_SHOW"; return 1; fi
  gw=$(ws_gw_show)
  # O gateway da empresa nao respondeu no passo 0: o Claude ficaria minutos a tentar outra vez.
  if [ "${WS_GW_DOWN:-0}" = 1 ]; then ws_fail E-AUTH-05 "$gw"; return 1; fi
  ws_say "  $(ws_msg s12_a_testar SEG="$WS_TMO_SMOKE")"
  t0=$(date +%s)
  # Com limite de tempo (sem resposta, o Claude Code tenta outra vez durante minutos) e sem servidores MCP
  # (--strict-mcp-config sem --mcp-config): o teste so fala com o modelo.
  ( cd "$WS_TMP" && ws_timeout "$WS_TMO_SMOKE" "$WS_CLAUDE" -p "$(ws_m s12_prompt)" --model claude-haiku-5-5 --output-format json --tools "" --strict-mcp-config > "$out" 2> "$err" </dev/null ) 2>/dev/null
  local rc=$?; t1=$(date +%s)
  { cat "$err"; head -c 4000 "$out"; printf '\n'; } >> "$WS_STEP_LOG" 2>/dev/null
  ws_parse_result "$out"
  ws_log "final test: rc=$rc error=$WSR_ERRO cost=$WSR_USD_TEXTO"
  if [ "$rc" = 0 ] && [ "$WSR_JSON" = 1 ] && [ "$WSR_ERRO" = 0 ]; then
    # No resumo so a resposta curta esperada ("OK"); uma resposta maior fica inteira no log.
    [ "$(ws_trim "$WSR_RESPOSTA")" = "$WSR_CURTA" ] || ws_log "final test: full reply: $WSR_RESPOSTA"
    ws_detail "$(ws_msg s12_ok RESPOSTA="$WSR_CURTA" SEG="$((t1 - t0))" USD="$WSR_USD_TEXTO")"
    [ "$WSR_USD_TEXTO" = "US\$ ?" ] && ws_note "$(ws_m s12_custo_desconhecido)"
    return 0
  fi
  if [ "$rc" = 124 ]; then
    if [ -n "$gw" ]; then ws_fail E-AUTH-05 "$gw"; else ws_fail E-SMOKE-01 "no answer in $WS_TMO_SMOKE s"; fi
    return 1
  fi
  # O claude respondeu (rc 0) mas o JSON nao se leu: o problema e do setup (node, disco), nao do login nem da rede.
  [ "$rc" = 0 ] && [ "$WSR_JSON" = 0 ] && { ws_fail E-SMOKE-01 "exit 0, reply not readable"; return 1; }
  local all; all="$(cat "$err" 2>/dev/null) $WSR_RESPOSTA"
  case "$all" in
    *[Cc]redit\ balance*|*billing*) ws_fail E-SMOKE-02 "" ;;
    *429*|*rate_limit*|*[Rr]ate\ limit*) ws_fail E-SMOKE-03 "" ;;
    *not_found_error*|*model:*|*[Ii]nvalid\ model*) ws_fail E-SMOKE-04 "claude-haiku-5-5" ;;
    *certificate*|*CERT_*|*SELF_SIGNED*) ws_fail E-NET-04 "" ;;
    *ENOTFOUND*|*ECONNREFUSED*|*ETIMEDOUT*|*ECONNRESET*|*fetch\ failed*|*[Uu]nable\ to\ connect*)
      # Com ANTHROPIC_BASE_URL o Claude nem fala com o api.anthropic.com: o que falha e o gateway.
      if [ -n "$gw" ]; then ws_fail E-AUTH-05 "$gw"; else ws_fail E-NET-05 ""; fi ;;
    *[Nn]ot\ logged\ in*|*/login*|*authentication_error*|*[Ii]nvalid\ API\ key*|*[Ii]nvalid\ auth\ token*|*[Ii]nvalid\ bearer*|*[Ff]ailed\ to\ authenticate*)
      # Uma chave nas variaveis (ou um apiKeyHelper) passa a frente do login: voltar a fazer login nao resolve.
      keys=$(ws_env_keys)
      case "${WS_AUTH_SOURCE:-}" in ''|none|"/login managed key") ;; *) [ -n "$keys" ] || keys=$WS_AUTH_SOURCE ;; esac
      if [ -n "$keys" ]; then ws_fail E-AUTH-04 "$keys"; else ws_fail E-AUTH-01 ""; fi ;;
    # 126/127: o claude nao arranca ou nao esta onde estava (um caminho relativo, um programa apagado).
    *) case "$rc" in 126|127) ws_fail E-CC-02 "$WS_CLAUDE (exit $rc)" ;; *) ws_fail E-SMOKE-01 "exit $rc" ;; esac ;;
  esac
  return 1
}

# ================================================================= ajudante Claude
ws_versions_line() {
  printf 'SO: %s; git %s; Claude Code %s; Node %s; uv %s; gh %s; kit %s' "${WS_OS:-?}" "${WS_GIT_VER:-?}" "${WS_CLAUDE_VER:-?}" \
    "$( [ -n "${WS_NODE:-}" ] && "$WS_NODE" -v 2>/dev/null </dev/null || echo '?')" "${WS_UV_VER:-?}" "${WS_GH_VER:-?}" "$C_WORKSHOP_VERSION"
}

ws_helper_call() { # ficheiro-prompt ficheiro-saida [schema] [segundos]
  [ -n "${WS_CLAUDE:-}" ] || return 1
  [ "${WS_GW_DOWN:-0}" = 1 ] && return 1
  local s=${4:-$WS_TMO_HELPER}
  # Com limite de tempo e sem servidores MCP (--strict-mcp-config), como o teste final.
  if [ -n "${3:-}" ]; then
    ( cd "$WS_TMP" && ws_timeout "$s" "$WS_CLAUDE" -p --model claude-haiku-5-5 --tools "" --strict-mcp-config --disallowedTools "mcp__*" --output-format json --json-schema "$3" < "$1" > "$2" 2>>"$WS_LOG" )
  else
    ( cd "$WS_TMP" && ws_timeout "$s" "$WS_CLAUDE" -p --model claude-haiku-5-5 --tools "" --strict-mcp-config --disallowedTools "mcp__*" --output-format json < "$1" > "$2" 2>>"$WS_LOG" )
  fi
}

# Depois de um passo falhar: oferece a analise do Claude. Devolve 0 se valer a pena repetir o passo.
ws_helper_offer() {
  local n=$1 f code
  f="SF_$n"; code=${!f%%|*}
  [ "${WS_AUTH_OK:-0}" = 1 ] || return 1
  [ "${WS_GW_DOWN:-0}" = 1 ] && return 1
  # Sem rede ou sem login o Claude tambem nao responde; o GitHub sem resposta (E-GH-03) ja tem a causa certa e,
  # sem login no GitHub (E-GH-02), o setup ja mostra o comando: a analise so custaria dinheiro.
  case "$code" in E-NET-*|E-AUTH-*|E-GH-02|E-GH-03|E-SO-06|E-SO-10) return 1 ;; esac
  ws_say ""
  ws_ask "$(ws_m helper_pergunta)" s || return 1
  ws_say "  $(ws_m helper_a_pedir)"
  local p="$WS_TMP/helper-$n.txt" o="$WS_TMP/helper-$n.json" title="M_passos_$n"
  {
    printf 'You are a technical support assistant for the setup of a Claude Code workshop.\n'
    printf 'Answer in plain English, with short sentences, for someone with no experience.\n'
    printf 'Give the likely cause in 1 to 3 sentences and up to 4 terminal commands (macOS, bash/zsh) the person can run to fix it.\n'
    printf 'Never suggest sudo or destructive commands, and never ask for or show API keys. If you are not sure, do not suggest commands.\n\n'
    printf 'Failed step: %s (%s)\nCode: %s\n%s\n\n' "$n" "${!title}" "$code" "$(ws_versions_line)"
    printf 'Log excerpt (no secrets):\n'
    grep -v '^\[claude-code:' "$WS_STEP_LOG" | tail -n 80 | ws_redact
  } > "$p"
  ws_log "helper: request of $(wc -c < "$p" | tr -d ' ') bytes"
  if ! ws_helper_call "$p" "$o" "$WS_SCHEMA_HELPER"; then ws_say "  $(ws_m helper_falhou)"; return 1; fi
  ws_parse_result "$o"
  ws_log "helper: cost $WSR_USD_TEXTO"
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
      ws_log "helper: runs $cmd"
      ws_tty_drain
      bash -c "$cmd" </dev/tty 2>&1 | tee -a "$WS_STEP_LOG"
      ran=1
    fi
  done <<EOF
$WSR_CMDS
EOF
  [ "$ran" = 1 ]
}

# O ultimo bloco "--- command output (step N) ---" escrito por uma instalacao (mode install) no setup.log.
ws_last_step_output() {
  awk -v h="--- command output (step $1) ---" '
    / === step [0-9]+: / && / \(mode [a-z]+\)$/ { m = $NF; sub(/\)$/, "", m) }
    $0 == h && m == "install" { b = ""; on = 1 }
    on { b = b $0 "\n" }
    on && $0 == "--- end ---" { on = 0; last = b }
    END { printf "%s", last }' "$WS_LOG" 2>/dev/null
}

ws_doctor() {
  local n st any=0 p="$WS_TMP/doctor.txt" o="$WS_TMP/doctor.json" f w title
  ws_say ""; ws_say "$(ws_bold "$(ws_m doctor_titulo)")"
  for n in 0 1 2 3 4 5 6 7 8 9 10 11 12; do case "$(ws_st "$n")" in falta|falhou|naoexec|aviso) any=1 ;; esac; done
  if [ "$any" = 0 ]; then ws_say "  $(ws_m doctor_sem_falhas)"; return 0; fi
  if [ "${WS_AUTH_OK:-0}" != 1 ] || [ "${WS_NET_API_OK:-1}" = 0 ] || [ "${WS_GW_DOWN:-0}" = 1 ]; then ws_say "  $(ws_m doctor_sem_claude)"; return 0; fi
  {
    printf 'You are a support assistant for the setup of a Claude Code workshop (macOS). Answer in plain English, short sentences, for someone with no experience.\n'
    printf 'Make a full diagnosis: what is wrong, why, and the exact steps (with commands) in order. Never suggest sudo or showing API keys.\n'
    printf 'You cannot use tools, run commands or read files: answer now, only from the information below.\n\n%s\n\n' "$(ws_versions_line)"
    for n in 0 1 2 3 4 5 6 7 8 9 10 11 12; do
      st=$(ws_st "$n"); title="M_passos_$n"; f="SF_$n"; w="SW_$n"
      printf 'Step %s (%s): %s %s %s\n' "$n" "${!title}" "$st" "${!f}" "$(printf '%s' "${!w}" | tr '\n' ' ')"
    done
    # A causa de uma falha esta na saida da instalacao que falhou, que pode ser de uma execucao anterior (o
    # --doctor nao instala) e ficar muito antes das ultimas 120 linhas.
    printf '\nLast recorded install output of each step with a problem (it may come from an earlier run):\n'
    for n in 0 1 2 3 4 5 6 7 8 9 10 11 12; do
      case "$(ws_st "$n")" in falta|falhou|naoexec|aviso) ws_last_step_output "$n" | grep -v '^\[claude-code:' | tail -n 30 | ws_redact ;; esac
    done
    printf '\nLog excerpt:\n'; tail -n 120 "$WS_LOG" | grep -v '^\[claude-code:' | ws_redact
  } > "$p"
  if ws_helper_call "$p" "$o" "" "$WS_TMO_DOCTOR"; then
    ws_parse_result "$o"
    local res; res=$(ws_js 'try{return String(JSON.parse(readText(A[0])).result||"");}catch(e){return "";}' "$o")
    [ -n "$res" ] && ws_say "$res" || ws_say "  $(ws_m helper_falhou)"
    ws_say "  $(ws_dim "$(ws_msg doctor_custo USD="$WSR_USD_TEXTO")")"
    ws_log "doctor: cost $WSR_USD_TEXTO"
  else
    ws_say "  $(ws_m helper_falhou)"
  fi
}

# ================================================================= resumo
# A tabela monta-se em memoria e so depois se grava: num disco cheio o ecra mostra-a na mesma.
ws_summary() {
  local n st title d txt faltam=0 lista="" avisos=0 r="$WS_RESUMO.tmp"
  for n in 0 1 2 3 4 5 6 7 8 9 10 11 12; do
    st=$(ws_st "$n"); title="M_passos_$n"
    case "$st" in
      falhou|falta|naoexec) faltam=$((faltam + 1)); lista="${lista:+$lista; }$n (${!title})" ;;
      aviso) avisos=$((avisos + 1)) ;;
    esac
  done
  txt=$({
    printf '%s\n' "$(ws_m resumo) · $(date '+%Y-%m-%d %H:%M') · $WS_OS"
    printf '%s %s %s\n' "$(ws_pad "$(ws_m resumo_cab_passo)" 42)" "$(ws_pad "$(ws_m resumo_cab_estado)" 20)" "$(ws_m resumo_cab_detalhe)"
    for n in 0 1 2 3 4 5 6 7 8 9 10 11 12; do
      st=$(ws_st "$n"); title="M_passos_$n"; d="SD_$n"
      printf '%s %s %s %s %s\n' "$(ws_pad "$n" 5)" "$(ws_pad "${!title}" 36)" "$(ws_sym "$st")" "$(ws_pad "$(ws_state_label "$st")" 17)" "${!d}"
    done
    printf '\n'
    if [ "$faltam" = 0 ]; then
      if [ "$WS_MODE" = install ]; then printf '%s\n' "$(ws_m final_pronto)"; else printf '%s\n' "$(ws_m final_check_ok)"; fi
    else
      if [ "$faltam" = 1 ]; then printf '%s\n' "$(ws_msg final_falta1 LISTA="$lista")"; else printf '%s\n' "$(ws_msg final_faltam N="$faltam" LISTA="$lista")"; fi
      # O --check e o --doctor nao instalam nada: "os passos feitos sao saltados" so vale para a instalacao.
      if [ "$WS_MODE" = install ]; then printf '%s\n' "$(ws_m final_voltar)"; else printf '%s\n' "$(ws_m final_voltar_check)"; fi
    fi
    if [ "$avisos" = 1 ]; then printf '%s\n' "$(ws_m final_aviso1)"
    elif [ "$avisos" -gt 1 ]; then printf '%s\n' "$(ws_msg final_avisos N="$avisos")"; fi
  })
  ws_say ""
  ws_say "$(ws_bold "────────────────────────────────────────────────────────────────")"
  ws_say "$txt"
  [ "$WS_MODE" = install ] && ws_need_reopen && ws_say "$(ws_m final_reiniciar)"
  [ "${WS_TODO_MCP:-0}" = 1 ] && ws_say "$(ws_m s7_oauth)"
  # O resumo antigo so e trocado se o novo ficou gravado inteiro (resumo.txt e o nome antigo).
  if { printf '%s\n' "$txt" > "$r" && mv -f "$r" "$WS_RESUMO"; } 2>/dev/null; then
    rm -f "$WS_HOME/resumo.txt"
    ws_say "$(ws_dim "$(ws_msg final_ficheiros RESUMO="$WS_RESUMO" LOG="$WS_LOG")")"
  else
    rm -f "$r" 2>/dev/null
  fi
  WS_FALTAM=$faltam
}
# Reabrir o terminal so faz falta se esta execucao mudou o perfil, ou se o terminal onde o setup arrancou
# (WS_PATH0, o PATH antes do ws_path_setup) ainda nao tem uma pasta do workshop com programas (ex.: a primeira
# instalacao foi feita neste mesmo terminal). Numa segunda execucao num terminal novo, sem nada a mudar, nao se diz.
ws_need_reopen() {
  local d
  [ "${WS_PERFIL_MUDOU:-0}" = 1 ] && return 0
  for d in "$HOME/.local/bin" "$WS_HOME/bin" ${WS_NODE_BIN_DIR:+"$WS_NODE_BIN_DIR"}; do
    [ -d "$d" ] && [ -n "$(ls -A "$d" 2>/dev/null)" ] || continue
    case ":${WS_PATH0:-}:" in *":$d:"*|*":$d/:"*) ;; *) return 0 ;; esac
  done
  return 1
}

# ================================================================= desinstalar
ws_uninstall() {
  local man="$WS_HOME/manifest.json" t n c v a k
  if [ ! -f "$man" ]; then ws_say "$(ws_msg desinst_sem_manifest MANIFEST="$man")"; return 0; fi
  ws_s4_detect >/dev/null 2>&1 || true
  ws_s5_detect >/dev/null 2>&1 || true   # WS_UV: o uv do workshop, mesmo com um antigo primeiro no PATH
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
      app) "${WS_UV:-uv}" tool uninstall "${n:-memoria}" >>"$WS_LOG" 2>&1 </dev/null && { ws_say "  $(ws_m desinst_app)"; ws_say "  $(ws_msg desinst_memorias CAMINHO="$(ws_memory_home_show)")"; } ;;
      atalho) [ -n "$c" ] && [ -e "$c" ] && rm -rf "$c" && ws_say "  $(ws_msg desinst_atalho CAMINHO="$c")" ;;
      perfil) ws_profile_remove "$c" "$v" ;;
    esac
  done <<EOF
$("$WS_NODE" "$iu" extras 2>>"$WS_LOG" </dev/null)
EOF
  # o codigo de saida do desinstalar conta: com o settings.json por repor, o resto fica (kit-src incluido, para repetir)
  local iu_out iu_rc=0
  iu_out=$("$WS_NODE" "$iu" desinstalar 2>>"$WS_LOG" </dev/null) || iu_rc=$?
  while IFS="$WS_TAB" read -r k v; do
    case "$k" in
      settings) [ "$v" = reposto ] && ws_say "  $(ws_m desinst_settings_reposto)"; [ "$v" = limpo ] && ws_say "  $(ws_m desinst_settings_limpo)" ;;
      projeto_removido) ws_say "  $(ws_msg desinst_projeto_removido CAMINHO="$v")" ;;
      projeto_mantido) ws_say "  $(ws_msg desinst_projeto_mantido CAMINHO="$v")" ;;
      editado) ws_say "  $(ws_msg desinst_editado NOME="${v##*/}" PASTA="$(ws_tilde "$v")")" ;;
      anteriores) ws_say "  $(ws_msg s8_anteriores PASTA="$(ws_tilde "$v")")" ;;
      erro) ws_say "  ❌ $v" ;;
    esac
  done <<EOF
$iu_out
EOF
  if [ "$iu_rc" != 0 ]; then
    ws_log "install-user desinstalar: saida $iu_rc"
    ws_say ""; ws_say "$(ws_msg desinst_incompleto LOG="$WS_LOG")"; return 1
  fi
  rm -rf "$WS_HOME/kit-src" "$WS_HOME/extras-pendentes.tsv"
  ws_say ""
  ws_say "$(ws_msg desinst_fim BACKUP="$WS_HOME/backup")"
}

# ================================================================= arranque
ws_usage() {
  cat <<'__WS_USO__'
Workshop setup (macOS). Usage:
  curl -fsSL <url>/setup-mac.sh | bash                 install
  curl -fsSL <url>/setup-mac.sh | bash -s -- --check   check only
  bash ~/.workshop-claude/setup-mac.sh [options]       after the first time
Options:
  --check                  check only (2 to 3 minutes), installs nothing
  --doctor                 check and, if something fails, ask Claude for a diagnosis
  --uninstall              undo what the setup installed (manifest.json)
  --no-desktop             do not install Claude Desktop
  --yes                    answer yes to simple questions (tests)
  --replace-statusline     use the workshop statusline instead of yours
  --help                   this help
The setup speaks English. The machine language configures Claude's answers and the workshop texts;
the language chosen at the first install is kept on later runs. To choose it, put WORKSHOP_LANG
(pt-BR, pt-PT, en, hi or he) right before bash, after the pipe:
  curl -fsSL <url>/setup-mac.sh | WORKSHOP_LANG=pt-BR bash
  WORKSHOP_LANG=pt-BR bash ~/.workshop-claude/setup-mac.sh
__WS_USO__
}

# Ambiente herdado que parte o setup (dotfiles antigos, o terminal do VS Code, restos de outras instalacoes).
# Muda so este processo e os filhos dele, nunca o terminal da pessoa. O que a pessoa tinha fica em WS_*0
# (exportadas: chegam a copia nova do ws_self_update) para os avisos dos passos.
ws_env_sanitize() {
  local v l bad=""
  # Cores forcadas: o grep -o (GREP_OPTIONS), o uv (CLICOLOR_FORCE/FORCE_COLOR), o node --test e o claude
  # (FORCE_COLOR) punham codigos ESC no texto que o setup le (versoes, pastas, numero de testes). O negrito do
  # proprio setup segue o NO_COLOR original (ws_color_detect).
  export WS_NO_COLOR0="${WS_NO_COLOR0-${NO_COLOR-}}"
  unset GREP_OPTIONS GREP_COLOR GREP_COLORS CLICOLOR_FORCE FORCE_COLOR
  export NO_COLOR=1
  # NODE_OPTIONS (o "Auto Attach" do VS Code/Cursor, um agente de APM): um --require de um ficheiro que ja nao
  # existe, ou uma opcao que o Node recusa, partia todos os scripts do setup. O passo 4 avisa (E-NODE-03).
  export WS_NODE_OPTIONS0="${WS_NODE_OPTIONS0-${NODE_OPTIONS-}}"
  unset NODE_OPTIONS
  # Python de outro ambiente (Anaconda/conda antigo, um venv ativo): o PYTHONHOME e o PYTHONPATH partem o Python
  # que o uv instala para a app (selftest e MCP). O passo 10 avisa (E-MEM-09).
  for v in PYTHONHOME PYTHONPATH; do [ -n "${!v:-}" ] && bad="$bad${bad:+ }$v=${!v}"; done
  export WS_PYTHON_ENV0="${WS_PYTHON_ENV0-$bad}"
  unset PYTHONHOME PYTHONPATH PYTHONSTARTUP VIRTUAL_ENV CONDA_PREFIX
  # Certificados que apontam para um ficheiro (ou pasta) que ja nao existe: o curl falha com 77 em todos os
  # sites, e o node e o git tambem. Saem do ambiente do setup; o passo 0 avisa com o nome e o valor (E-NET-09).
  bad=""
  for v in SSL_CERT_FILE CURL_CA_BUNDLE GIT_SSL_CAINFO NODE_EXTRA_CA_CERTS REQUESTS_CA_BUNDLE SSL_CERT_DIR; do
    [ -n "${!v:-}" ] || continue
    if [ "$v" = SSL_CERT_DIR ]; then [ -d "$SSL_CERT_DIR" ] && continue; else [ -f "${!v}" ] && [ -r "${!v}" ] && continue; fi
    l="$v=${!v}"; bad="$bad${bad:+$WS_NL}$l"; unset "$v"
  done
  export WS_CA_BAD0="${WS_CA_BAD0-$bad}"
}
# Pasta temporaria do setup: o TMPDIR, senao /tmp, senao ~/.workshop-claude/tmp. O TMPDIR dos dotfiles pode
# apontar para uma pasta que ja nao existe (copiados de outro portatil) ou sem escrita. O que serve passa para
# os filhos (instaladores, uv, node); o que nao serve fica em WS_TMPDIR_BAD0 para o aviso do passo 0 (E-SO-09).
# O .ws-tmp marca a pasta: se desaparecer, uma app de limpeza apagou-a a meio (ws_tmp_gone).
ws_tmp_make() {
  local t
  WS_TMP=""
  for t in "${TMPDIR:-}" /tmp "$WS_HOME/tmp"; do
    [ -n "$t" ] || continue
    [ "$t" = "$WS_HOME/tmp" ] && mkdir -p "$t" 2>/dev/null
    [ -d "$t" ] && [ -w "$t" ] && WS_TMP=$(mktemp -d "${t%/}/ws-setup.XXXXXX" 2>/dev/null) && [ -d "$WS_TMP" ] &&
      : > "$WS_TMP/.ws-tmp" 2>/dev/null && break
    [ -n "$WS_TMP" ] && rm -rf "$WS_TMP" 2>/dev/null
    WS_TMP=""
  done
  if [ -z "$WS_TMP" ]; then
    printf 'No usable temporary folder: TMPDIR (%s), /tmp and %s/tmp do not exist, cannot be written or the disk is full.\n' "${TMPDIR:-not set}" "$WS_HOME" >&2
    printf 'Fix or remove the "export TMPDIR=" line in ~/.zshrc or ~/.zprofile, free some disk space, open a new terminal and run the setup again.\n' >&2
    return 1
  fi
  if [ -n "${TMPDIR:-}" ] && [ "$t" != "$TMPDIR" ]; then export WS_TMPDIR_BAD0="${WS_TMPDIR_BAD0-$TMPDIR}"; export TMPDIR="$t"; fi
  return 0
}
# 0 se a pasta temporaria (ou a marca dela) desapareceu: volta a ser criada (WS_TMP_WIPED_STEP fica com o passo), e
# o passo que falhar diz porque (E-SO-10). Chama-se antes de escrever la (ws_js, ws_newterm, ws_profile_put).
ws_tmp_gone() {
  [ -f "$WS_TMP/.ws-tmp" ] && return 1
  { mkdir -p "$WS_TMP" && : > "$WS_TMP/.ws-tmp"; } 2>/dev/null || return 1
  WS_TMP_WIPED_STEP=${WS_CUR:-?}
  ws_log "temporary folder $WS_TMP was deleted while the setup ran (a cleaning app?): created again"
  return 0
}

ws_load_messages() {
  if [ -n "${M_ui_titulo:-}" ]; then return 0; fi
  local f="$WS_DEV_ROOT/setup/messages.en.json" code
  [ -f "$f" ] || return 1
  code=$(ws_js "$WS_JS_MSGS" "$f") || return 1
  eval "$code"
}

ws_save_self() { # guarda uma copia local do script (para "bash ~/.workshop-claude/setup-mac.sh --check")
  local dst="$WS_HOME/setup-mac.sh" src=${BASH_SOURCE[0]:-} sums url
  [ "$WS_MODE" = uninstall ] && return 0
  if [ "$WS_DEV" = 1 ]; then
    printf '#!/usr/bin/env bash\n# Development copy: runs the script in the repository.\nexec bash "%s" "$@"\n' "$WS_DEV_ROOT/setup/setup-mac.sh" > "$dst.tmp" && mv -f "$dst.tmp" "$dst"
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

# A correr da copia guardada (~/.workshop-claude/setup-mac.sh): se a release (a mesma tag) tem outro
# setup-mac.sh, confirmado pelo SHA256SUMS, a copia e substituida e corre-se a nova. Sem rede, fica a copia local.
# Sem isto, uma correcao publicada nunca chegaria a quem corre "bash ~/.workshop-claude/setup-mac.sh".
ws_self_update() {
  local dst="$WS_HOME/setup-mac.sh" src=${BASH_SOURCE[0]:-} sum new="$WS_TMP/setup-mac.new"
  [ "$WS_DEV" = 1 ] || [ -n "${WS_REEXEC:-}" ] && return 0
  [ -n "$src" ] && [ -f "$src" ] && [ -f "$dst" ] || return 0
  [ "$(cd "$(dirname "$src")" && pwd -P)/$(basename "$src")" = "$(cd "$WS_HOME" && pwd -P)/setup-mac.sh" ] || return 0
  ws_dl "$(ws_release_url workshop SHA256SUMS)" "$WS_TMP/SHA256SUMS" auth || return 0
  sum=$(ws_sum_for "$WS_TMP/SHA256SUMS" setup-mac.sh)
  [ -n "$sum" ] && [ "$sum" != "$(ws_sha256 "$dst")" ] || return 0
  ws_dl "$(ws_release_url workshop setup-mac.sh)" "$new" auth || return 0
  [ "$sum" = "$(ws_sha256 "$new")" ] && grep -q "WS_INJ_KIT_SHA256=" "$new" || return 0
  chmod +x "$new" && mv -f "$new" "$dst" || return 0
  ws_log "saved setup-mac.sh updated from the release ($sum): running the new copy"
  # O exec mantem o PID: a nova copia ve o .lock com o seu proprio PID e fica com ele (ws_lock_alive).
  trap - EXIT INT TERM HUP
  rm -rf "$WS_TMP"
  WS_REEXEC=1 WS_PATH0=$WS_PATH0 exec bash "$dst" ${WS_ARGS[@]+"${WS_ARGS[@]}"}
}

# .lock/pid: PID e hora de arranque (ps lstart) do setup que tem o lock. Depois de um kill -9, de uma falta de luz
# ou de um reboot, o PID pode ser agora de outro programa: com outra hora de arranque (ou, num .lock antigo so com
# o PID, sem ser um bash), o lock e velho e passa para este setup. Um setup parado (Ctrl+Z, estado T) continua com
# o lock: a mensagem diz como o continuar (fg) ou fechar.
ws_proc_start() { LC_ALL=C ps -o lstart= -p "$1" 2>/dev/null | sed 's/^ *//; s/ *$//'; }
ws_lock_mine() { { echo $$; ws_proc_start $$; } > "$1/pid.$$" 2>/dev/null && mv -f "$1/pid.$$" "$1/pid" 2>/dev/null; }
ws_lock_alive() { # pid hora -> 0 se o setup que escreveu o .lock ainda existe
  local pid=$1 st=$2 cur
  case "$pid" in ''|*[!0-9]*) return 1 ;; esac
  [ "$pid" != $$ ] && kill -0 "$pid" 2>/dev/null || return 1
  cur=$(ws_proc_start "$pid")
  if [ -n "$st" ] && [ -n "$cur" ]; then [ "$cur" = "$st" ]; return; fi
  case "$(ps -o comm= -p "$pid" 2>/dev/null)" in *bash|*/sh|sh|'') return 0 ;; esac
  return 1
}
ws_lock() {
  local l="$WS_HOME/.lock" pid st since age
  if mkdir "$l" 2>/dev/null; then ws_lock_mine "$l"; return 0; fi
  pid=$(sed -n 1p "$l/pid" 2>/dev/null); st=$(sed -n 2p "$l/pid" 2>/dev/null)
  since=$(stat -f %Sm -t %H:%M "$l" 2>/dev/null)
  if ws_lock_alive "$pid" "$st"; then
    ws_log "lock held by PID $pid (state $(ps -o stat= -p "$pid" 2>/dev/null | tr -d ' '))"
    case "$(ps -o stat= -p "$pid" 2>/dev/null)" in
      T*) printf '%s\n' "$(ws_msg lock_parado PID="$pid" HORA="${since:-?}")" >&2 ;;
      *) printf '%s\n' "$(ws_msg lock_ativo PID="$pid" HORA="${since:-?}")" >&2 ;;
    esac
    return 1
  fi
  # Sem PID ha menos de 10 s: outro setup acabou de criar o .lock e ainda esta a escrever o PID.
  if [ -z "$pid" ]; then
    age=$(( $(date +%s) - $(stat -f %m "$l" 2>/dev/null || echo 0) ))
    if [ "$age" -lt 10 ]; then printf '%s\n' "$(ws_msg lock_ativo PID="?" HORA="${since:-?}")" >&2; return 1; fi
  fi
  ws_log "stale lock removed (PID ${pid:-?})"
  rm -rf "$l"
  if mkdir "$l" 2>/dev/null; then ws_lock_mine "$l"; return 0; fi
  printf '%s\n' "$(ws_msg lock_ativo PID="?" HORA="${since:-?}")" >&2; return 1
}

# So apaga o .lock se for deste setup: um segundo terminal que foi recusado nao tira o lock ao primeiro.
ws_cleanup() {
  [ -n "${WS_HB:-}" ] && kill "$WS_HB" 2>/dev/null
  [ "$(sed -n 1p "$WS_HOME/.lock/pid" 2>/dev/null)" = "$$" ] && rm -rf "$WS_HOME/.lock" 2>/dev/null
  rm -rf "${WS_TMP:-/nonexistent}" 2>/dev/null
  return 0
}
ws_interrupted() {
  # Fechar a janela manda mais do que um HUP: ignora os seguintes. A mensagem vai para o ecra so no fim: com a
  # janela fechada a escrita falha, e cada processo criado depois voltaria a despeja-la no setup.log.
  # So uma linha no setup.log por interrupcao (os subshells nao herdam esta trap; os sinais seguintes sao ignorados).
  trap '' INT TERM HUP
  local msg
  case "${WS_MODE:-}" in check|doctor) msg=$(ws_m interrompido_check) ;; *) msg=$(ws_m interrompido) ;; esac
  ws_log "interrupted"
  ws_cleanup
  # Para o terminal: o sinal pode chegar a meio de uma funcao com a saida redirecionada (ex.: ws_timeout ... >/dev/null).
  { printf '\n%s\n' "$msg" > /dev/tty; } 2>/dev/null || printf '\n%s\n' "$msg" >&2
  exit 130
}

ws_main() {
  WS_MODE=install; WS_SIM=0; WS_SEM_DESKTOP=0; WS_SUBST_SL=0
  WS_ARGS=("$@")
  local a
  for a in "$@"; do
    case "$a" in
      --check|-check|--verificar) WS_MODE=check ;;
      --doctor|-doctor|--diagnostico) WS_MODE=doctor ;;
      --desinstalar|--uninstall) WS_MODE=uninstall ;;
      --sem-desktop|--no-desktop) WS_SEM_DESKTOP=1 ;;
      --sim|--yes|-y) WS_SIM=1 ;;
      --substituir-statusline|--replace-statusline) WS_SUBST_SL=1 ;;
      --ajuda|--help|-h) ws_usage; return 0 ;;
      *) printf 'Unknown option: %s\n' "$a" >&2; ws_usage >&2; return 2 ;;
    esac
  done
  [ "$(uname -s)" = Darwin ] || { printf 'This script is for macOS. On Windows use bootstrap-windows.ps1.\n' >&2; return 2; }
  [ -n "${HOME:-}" ] && [ -d "$HOME" ] || { printf 'Invalid HOME.\n' >&2; return 2; }
  [ "$(id -u)" = 0 ] && { printf 'Do not run the setup with sudo or as root.\n' >&2; return 2; }

  WS_HOME="$HOME/.workshop-claude"; WS_LOG="$WS_HOME/setup.log"; WS_RESUMO="$WS_HOME/summary.txt"
  CLAUDE_DIR="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
  WS_PROJ="$HOME/workshop-claude"
  # shellcheck disable=SC2088  # texto para mostrar, nao e um caminho a expandir
  WS_PROJ_SHOW='~/workshop-claude'
  WS_UA="workshop-claude-setup (curl; macOS)"
  mkdir -p "$WS_HOME" || { printf 'No permission to create %s\n' "$WS_HOME" >&2; return 1; }
  ws_env_sanitize
  ws_tmp_make || return 1
  WS_STEP_LOG="$WS_TMP/inicio.log"
  ws_color_detect
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
    printf 'This script must come from the release (with the injected values) or run inside the repository.\n' >&2; return 2
  fi
  # O PATH do terminal da pessoa (ws_need_reopen). Depois do exec da copia nova (ws_self_update) vem no ambiente.
  [ -n "${WS_REEXEC:-}" ] && [ -n "${WS_PATH0:-}" ] || WS_PATH0=$PATH
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
  D_FLAG_SEM_DESKTOP=--no-desktop; D_FLAG_STATUSLINE=--replace-statusline
  local k n
  for k in $WS_CONF_KEYS; do n="C_$k"; printf -v "D_$k" '%s' "${!n}"; done
  WS_FILL_KEYS="$WS_CONF_KEYS REPO_HOST MEMORY_HOST SETUP_MAC_URL KIT_URL_MAC KIT_URL_WINDOWS ONE_LINER_MAC ONE_LINER_WINDOWS UV_INSTALL_SH_URL_V UV_INSTALL_PS1_URL_V PROJETOS MANIFEST LOG RESUMO BACKUP FLAG_SEM_DESKTOP FLAG_STATUSLINE"

  ws_load_messages || { printf 'Could not read the messages (setup/messages.en.json).\n' >&2; return 2; }
  ws_lang_detect
  # CLAUDE_CONFIG_DIR relativo ou com um "~" literal (export CLAUDE_CONFIG_DIR="~/.claude-work"): o Claude Code
  # nao o expande e cada pasta onde se corre o claude ganhava a sua copia (um "~" dentro da Arena). Para aqui,
  # com o que fazer. Um caminho absoluto fica sem a "/" do fim (o resto do setup compara caminhos).
  if [ -n "${CLAUDE_CONFIG_DIR:-}" ]; then
    case "$CLAUDE_CONFIG_DIR" in
      /*) CLAUDE_CONFIG_DIR=${CLAUDE_CONFIG_DIR%/}; export CLAUDE_CONFIG_DIR="${CLAUDE_CONFIG_DIR:-/}"; CLAUDE_DIR=$CLAUDE_CONFIG_DIR ;;
      *) WS_CUR=pre; ws_print_code E-CFG-08 "CLAUDE_CONFIG_DIR=$CLAUDE_CONFIG_DIR" "  "; return 1 ;;
    esac
  fi
  # ~/.workshop-claude do root (um "sudo" antigo): sem escrita nao ha lock, log nem copia guardada.
  if [ ! -w "$WS_HOME" ] || [ ! -x "$WS_HOME" ]; then
    WS_CUR=pre; ws_print_code E-PERM-01 "$(ws_show_path "$WS_HOME")" "  "
    SN_pre=""; ws_perm_fix_notes "$WS_HOME"; printf '%s' "$SN_pre" | sed 's/^/  /'
    return 1
  fi
  # setup.log de outro utilizador (o mesmo "sudo"): fica de lado, com outro nome, e comeca-se um novo. Sem isto,
  # cada comando com ">> setup.log" falharia sem correr.
  if [ -e "$WS_LOG" ] && [ ! -w "$WS_LOG" ]; then mv -f "$WS_LOG" "$WS_LOG.unwritable-$(date +%Y%m%d%H%M%S)" 2>/dev/null; fi
  ws_lock || return 1
  [ "$WS_MODE" = uninstall ] || ws_self_update

  { printf '\n'; printf '=%.0s' 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20; printf ' %s · mode %s · %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$WS_MODE" "$C_WORKSHOP_VERSION"; } >> "$WS_LOG"
  ws_log "language: $WS_LANG (kit $WS_LANG_KIT) · saved ${WS_LANG_GUARDADA:--} · machine $WS_LANG_MAQUINA${WS_LANG_IGNORADA:+ · WORKSHOP_LANG ignored: $WS_LANG_IGNORADA}"

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
