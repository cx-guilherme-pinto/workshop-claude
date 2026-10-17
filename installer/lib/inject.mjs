// Injecao dos valores da release no bloco marcado dos scripts de setup (usado por tools/build-release.sh).
//   # >>> WS-INJETADO >>>
//   ...
//   # <<< WS-INJETADO <<<
// O bloco da fonte e substituido por valores: o repos.conf efetivo, o SHA-256 do arquivo do kit,
// o pricing.json e as mensagens (setup/messages.en.json). Nos .ps1 tudo vai em base64 (ASCII), lido como UTF-8.
import { readFileSync as _read, writeFileSync as _write } from 'node:fs';
import { join as _join, resolve as _resolve } from 'node:path';
import { fileURLToPath as _f2p } from 'node:url';
import { expand, loadConf, repoParts } from './conf.mjs';
import { flattenToShell } from './messages.mjs';
import { isMain as ehPrincipal } from './is-main.mjs';

export const INICIO = '# >>> WS-INJETADO >>>';
export const FIM = '# <<< WS-INJETADO <<<';

export function replaceBlock(text, body) {
  const a = text.indexOf(INICIO);
  const b = text.indexOf(FIM);
  if (a < 0 || b < a) throw new Error('bloco WS-INJETADO nao encontrado');
  return text.slice(0, a) + INICIO + '\n' + body.replace(/\n?$/, '\n') + text.slice(b);
}

export function confText(conf) {
  return Object.entries(conf)
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
}

function heredocSafe(text, tag) {
  if (text.split('\n').some((l) => l === tag)) throw new Error(`o texto contem a linha delimitadora ${tag}`);
  return text;
}

export function injectMac(script, { conf, kitSha256, pricingText, messages }) {
  const body = [
    '# Valores da release (gerados por tools/build-release.sh). Nao editar.',
    'ws_injetado() {',
    `WS_INJ_VERSAO='${conf.WORKSHOP_VERSION}'`,
    `WS_INJ_KIT_SHA256='${kitSha256}'`,
    "IFS= read -r -d '' WS_INJ_CONF <<'__WS_CONF__' || true",
    heredocSafe(confText(conf), '__WS_CONF__'),
    '__WS_CONF__',
    "IFS= read -r -d '' WS_INJ_PRICING <<'__WS_PRICING__' || true",
    heredocSafe(pricingText.trimEnd(), '__WS_PRICING__'),
    '__WS_PRICING__',
    flattenToShell(messages).trimEnd(),
    '}',
  ].join('\n');
  return replaceBlock(script, body);
}

const b64 = (t) => Buffer.from(t, 'utf8').toString('base64');

// Linhas de base64 com 76 colunas, para o .ps1 continuar legivel e so ASCII.
function psB64(name, text) {
  const s = b64(text);
  const parts = s.match(/.{1,76}/g) || [''];
  return `$script:${name} = (@(\n${parts.map((p) => `'${p}'`).join(",\n")}\n) -join '')`;
}

export function injectWindows(script, { conf, kitSha256, pricingText, messages }) {
  const body = [
    '# Valores da release (gerados por tools/build-release.sh). Nao editar.',
    `$script:WsInjVersao = '${conf.WORKSHOP_VERSION}'`,
    `$script:WsInjKitSha256 = '${kitSha256}'`,
    psB64('WsInjConfB64', confText(conf)),
    psB64('WsInjPricingB64', pricingText),
    psB64('WsInjMessagesB64', JSON.stringify(messages)),
  ].join('\n');
  const out = replaceBlock(script, body);
  if (/[^\x00-\x7f]/.test(out)) throw new Error('o setup-windows.ps1 injetado tem bytes nao ASCII');
  return out;
}

export function injectBootstrap(script, { conf, setupSha256 }) {
  const body = [
    '# Valores da release (gerados por tools/build-release.sh). Nao editar.',
    `$WsRepoUrl = '${conf.WORKSHOP_REPO_URL}'`,
    `$WsVersion = '${conf.WORKSHOP_VERSION}'`,
    `$WsReleasePattern = '${conf.RELEASE_DOWNLOAD_URL}'`,
    `$WsSetupSha256 = '${setupSha256}'`,
  ].join('\n');
  const out = replaceBlock(script, body);
  if (/[^\x00-\x7f]/.test(out)) throw new Error('o bootstrap-windows.ps1 injetado tem bytes nao ASCII');
  return out;
}

export function setupWindowsUrl(conf) {
  return expand(conf.RELEASE_DOWNLOAD_URL, { ...repoParts(conf.WORKSHOP_REPO_URL), version: conf.WORKSHOP_VERSION, file: 'setup-windows.ps1' });
}

export const toCrlf = (t) => t.replace(/\r?\n/g, '\r\n');

// CLI usada por tools/build-release.sh:
//   node installer/lib/inject.mjs mac|windows|bootstrap --raiz <arvore do kit> --entrada <f> --saida <f>
//        [--kit-sha <sha>] [--setup-sha <sha>]
// O repos.conf, o pricing.json e as mensagens vem de --raiz (o arquivo da release), com as variaveis
// de ambiente do mesmo nome a sobreporem o repos.conf.

if (ehPrincipal(import.meta.url)) {
  const [kind, ...rest] = process.argv.slice(2);
  const o = {};
  for (let i = 0; i < rest.length; i += 2) o[rest[i].replace(/^--/, '')] = rest[i + 1];
  const conf = loadConf({ root: o.raiz });
  const pricingText = _read(_join(o.raiz, 'pricing.json'), 'utf8');
  // O setup fala so ingles (D-20): injeta-se o catalogo em ingles.
  const messages = JSON.parse(_read(_join(o.raiz, 'setup', 'messages.en.json'), 'utf8'));
  const src = _read(o.entrada, 'utf8').replace(/\r\n/g, '\n');
  let out;
  if (kind === 'mac') out = injectMac(src, { conf, kitSha256: o['kit-sha'], pricingText, messages });
  else if (kind === 'windows') out = toCrlf(injectWindows(src, { conf, kitSha256: o['kit-sha'], pricingText, messages }));
  else if (kind === 'bootstrap') out = toCrlf(injectBootstrap(src, { conf, setupSha256: o['setup-sha'] }));
  else {
    console.error('uso: inject.mjs mac|windows|bootstrap --raiz <dir> --entrada <f> --saida <f> [--kit-sha s] [--setup-sha s]');
    process.exit(2);
  }
  _write(o.saida, out);
}
