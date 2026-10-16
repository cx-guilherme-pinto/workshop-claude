// Leitura do repos.conf (CHAVE=valor) com sobreposicao por variaveis de ambiente,
// expansao dos padroes ({repo}, {version}, {file}...) e valores derivados (one-liners).
// Sem dependencias. Usado por tools/render.mjs, tools/check-repo.mjs, slides e testes.
import { readFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const KIT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

export function parseConf(text) {
  const out = {};
  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i <= 0) continue;
    const k = line.slice(0, i).trim();
    if (!/^[A-Z][A-Z0-9_]*$/.test(k)) continue;
    out[k] = line.slice(i + 1).trim();
  }
  return out;
}

// As variaveis de ambiente com o mesmo nome tem prioridade (so para chaves conhecidas).
export function loadConf({ root = KIT_ROOT, env = process.env, file } = {}) {
  const conf = parseConf(readFileSync(file || join(root, 'repos.conf'), 'utf8'));
  for (const k of Object.keys(conf)) {
    if (env[k] !== undefined && env[k] !== '') conf[k] = env[k];
  }
  return conf;
}

// https://host/dono/nome(.git) -> partes
export function repoParts(url) {
  const u = String(url || '').replace(/\/+$/, '').replace(/\.git$/, '');
  const m = /^([a-z]+:\/\/)([^/]+)\/(.+)\/([^/]+)$/i.exec(u);
  if (!m) return { repo: u, host: '', owner: '', name: '' };
  return { repo: u, host: m[2].replace(/^[^@]*@/, ''), owner: m[3], name: m[4] };
}

export function expand(pattern, vars) {
  return String(pattern).replace(/\{([a-z]+)\}/g, (all, k) => (vars[k] !== undefined ? String(vars[k]) : all));
}

export function releaseFileUrl(conf, which, file) {
  const repoUrl = which === 'memory' ? conf.MEMORY_APP_REPO_URL : conf.WORKSHOP_REPO_URL;
  const version = which === 'memory' ? conf.MEMORY_APP_VERSION : conf.WORKSHOP_VERSION;
  return expand(conf.RELEASE_DOWNLOAD_URL, { ...repoParts(repoUrl), version, file });
}

export function rawFileUrl(conf, which, path) {
  const repoUrl = which === 'memory' ? conf.MEMORY_APP_REPO_URL : conf.WORKSHOP_REPO_URL;
  const version = which === 'memory' ? conf.MEMORY_APP_VERSION : conf.WORKSHOP_VERSION;
  return expand(conf.RAW_BASE_URL, { ...repoParts(repoUrl), version, path });
}

export const kitArchiveName = (version, ext) => `workshop-kit-${version}.${ext}`;

// Valores derivados usados nos templates, nas mensagens e nos slides.
export function derived(conf) {
  const w = repoParts(conf.WORKSHOP_REPO_URL);
  const m = repoParts(conf.MEMORY_APP_REPO_URL);
  const setupMac = releaseFileUrl(conf, 'workshop', 'setup-mac.sh');
  const bootstrap = releaseFileUrl(conf, 'workshop', 'bootstrap-windows.ps1');
  const setupWin = releaseFileUrl(conf, 'workshop', 'setup-windows.ps1');
  const ver = conf.WORKSHOP_VERSION;
  return {
    ...conf,
    REPO_URL: w.repo,
    REPO_HOST: w.host,
    REPO_OWNER: w.owner,
    REPO_NAME: w.name,
    MEMORY_REPO: m.repo,
    MEMORY_HOST: m.host,
    RELEASE_URL: expand(conf.RELEASE_PAGE_URL || '{repo}/releases/tag/{version}', { ...w, version: ver }),
    MEMORY_RELEASE_URL: expand(conf.RELEASE_PAGE_URL || '{repo}/releases/tag/{version}', { ...m, version: conf.MEMORY_APP_VERSION }),
    SHA256SUMS_URL: releaseFileUrl(conf, 'workshop', 'SHA256SUMS'),
    SETUP_MAC_URL: setupMac,
    SETUP_WINDOWS_URL: setupWin,
    BOOTSTRAP_WINDOWS_URL: bootstrap,
    KIT_URL_MAC: releaseFileUrl(conf, 'workshop', kitArchiveName(ver, 'tar.gz')),
    KIT_URL_WINDOWS: releaseFileUrl(conf, 'workshop', kitArchiveName(ver, 'zip')),
    ONE_LINER_MAC: `curl -fsSL ${setupMac} | bash`,
    ONE_LINER_MAC_ALT: `bash <(curl -fsSL ${setupMac})`,
    ONE_LINER_WINDOWS: `irm ${bootstrap} | iex`,
    ONE_LINER_WINDOWS_FALLBACK: 'powershell -NoProfile -ExecutionPolicy Bypass -File setup-windows.ps1',
    CHECK_MAC_FIRST: `curl -fsSL ${setupMac} | bash -s -- --check`,
    CHECK_WINDOWS_FIRST: `$env:WORKSHOP_SETUP_ARGS='-Check'; irm ${bootstrap} | iex`,
    CHECK_MAC: 'bash ~/.workshop-claude/setup-mac.sh --check',
    CHECK_WINDOWS: 'powershell -NoProfile -ExecutionPolicy Bypass -File "$HOME\\.workshop-claude\\setup-windows.ps1" -Check',
    DOCTOR_MAC: 'bash ~/.workshop-claude/setup-mac.sh --doctor',
    DOCTOR_WINDOWS: 'powershell -NoProfile -ExecutionPolicy Bypass -File "$HOME\\.workshop-claude\\setup-windows.ps1" -Doctor',
    UNINSTALL_MAC: 'bash ~/.workshop-claude/setup-mac.sh --desinstalar',
    UNINSTALL_WINDOWS: 'powershell -NoProfile -ExecutionPolicy Bypass -File "$HOME\\.workshop-claude\\setup-windows.ps1" -Desinstalar',
    UV_INSTALL_SH_URL_V: expand(conf.UV_INSTALL_SH_URL || '', { version: conf.UV_VERSION }),
    UV_INSTALL_PS1_URL_V: expand(conf.UV_INSTALL_PS1_URL || '', { version: conf.UV_VERSION }),
    PROJETOS: '~/workshop-claude',
    FLAG_SEM_DESKTOP: '--sem-desktop / -SemDesktop',
    FLAG_STATUSLINE: '--substituir-statusline / -SubstituirStatusline',
  };
}

// Substitui {NOME} (mensagens) por valores; deixa intactos os marcadores desconhecidos.
export function fillUpper(text, vars) {
  return String(text).replace(/\{([A-Z][A-Z0-9_]*)\}/g, (all, k) => (vars[k] !== undefined ? String(vars[k]) : all));
}
