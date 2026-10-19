#!/usr/bin/env node
// Verificacoes do repositorio (correm no CI e antes de cada release):
//  1. O servidor de desenvolvimento (DEV_REPO_HOST) e o servidor atual dos repositorios so podem aparecer
//     no repos.conf e nos ficheiros gerados listados em tools/generated-files.json.
//  2. Os .ps1 sao so ASCII (o PowerShell 5.1 le UTF-8 sem BOM como ANSI): os textos vao no messages.en.json.
//  3. Os ficheiros gerados estao atualizados (node tools/render.mjs --check).
//  4. Todos os codigos de erro (E-XXX-NN) e chaves de mensagens usados pelos scripts de setup existem
//     em setup/messages.en.json (o setup fala so ingles, D-20), e o messages.pt.json (que gera o
//     docs/TROUBLESHOOTING.md) tem as mesmas chaves, listas e marcadores {NOME}.
//  5. Nenhum script em setup/ ou installer/ chama python, python3 ou py: o kit nao depende de um Python do
//     sistema (no Mac um python3 solto pode abrir o instalador das Command Line Tools; no Windows o alias
//     python.exe abre a Microsoft Store). O Python da app Memoria e o que o uv gere.
//
//   node tools/check-repo.mjs [--so-git]    (--so-git: so ficheiros ja seguidos pelo git)
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { KIT_ROOT, loadConf, repoParts } from '../installer/lib/conf.mjs';

const PUBLIC_FORGES = new Set(['github.com', 'gitlab.com', 'bitbucket.org', 'codeberg.org']);
const BINARIO = /\.(png|jpe?g|gif|webp|ico|mp4|mov|woff2?|ttf|otf|pdf|pptx|zip|gz|tgz|whl|sqlite)$/i;

export function hostPatterns(conf) {
  const pats = new Set();
  if (conf.DEV_REPO_HOST) pats.add(conf.DEV_REPO_HOST);
  for (const url of [conf.WORKSHOP_REPO_URL, conf.MEMORY_APP_REPO_URL]) {
    const p = repoParts(url);
    if (!p.host) continue;
    pats.add(PUBLIC_FORGES.has(p.host) ? `${p.host}/${p.owner}/` : p.host);
  }
  return [...pats];
}

export function nonAsciiPositions(buf) {
  const out = [];
  let line = 1;
  let col = 0;
  for (let i = 0; i < buf.length; i++) {
    const b = buf[i];
    col++;
    if (b === 0x0a) {
      line++;
      col = 0;
    } else if (b > 0x7f) {
      out.push({ line, col, byte: b });
      if (out.length >= 5) break;
    }
  }
  return out;
}

// Chamadas a um interpretador Python (como comando, nao como texto: "--managed-python" e "Python 3.12" passam).
export function pythonCalls(text) {
  const out = [];
  // em posicao de comando (inicio, depois de ; & | ( $( ` ou de exec/command/Start-Process) ou como nome de
  // programa entre aspas (spawn('python3'), "py.exe"). Um "py" usado como nome de variavel nao conta.
  const cmd = /(?:^|[;&|(`]|\$\()\s*(?:&\s*)?(?:(?:exec|command|Start-Process)\s+)?(?:python3?|py)(?:\.exe)?(?=$|\s|[;)|&])/;
  const lit = /['"](?:python3?|py)(?:\.exe)?['"]/;
  String(text)
    .split(/\r?\n/)
    .forEach((l, i) => {
      const code = l.replace(/^\s*(#|\/\/|<#|\*).*$/, '');
      if (cmd.test(code) || lit.test(code)) out.push({ line: i + 1, text: l.trim() });
    });
  return out;
}

// Diferencas de estrutura entre dois catalogos (chaves, tamanho das listas, campo "so", marcadores {NOME}).
export function catalogDiff(a, b, path = '$') {
  const out = [];
  const marks = (v) => [...new Set(String(v).match(/\{[A-Z][A-Z0-9_]*\}/g) || [])].sort().join(',');
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return [`${path}: listas diferentes`];
    a.forEach((x, i) => out.push(...catalogDiff(x, b[i], `${path}[${i}]`)));
  } else if (a && typeof a === 'object') {
    if (!b || typeof b !== 'object') return [`${path}: tipos diferentes`];
    const ka = Object.keys(a);
    const kb = Object.keys(b);
    for (const k of ka) if (!(k in b)) out.push(`${path}.${k}: falta no segundo`);
    for (const k of kb) if (!(k in a)) out.push(`${path}.${k}: falta no primeiro`);
    for (const k of ka) if (k in b && k !== 'nota') out.push(...(k === 'so' ? (a[k] === b[k] ? [] : [`${path}.so: ${a[k]} != ${b[k]}`]) : catalogDiff(a[k], b[k], `${path}.${k}`)));
  } else if (marks(a) !== marks(b)) out.push(`${path}: marcadores ${marks(a) || '-'} != ${marks(b) || '-'}`);
  return out;
}

export function usedCodesAndKeys(text, kind) {
  const codes = new Set(text.match(/\bE-[A-Z]+-\d{2}\b/g) || []);
  const keys = new Set();
  const re = kind === 'sh' ? /\bws_(?:m|msg)\s+([a-z0-9_]+)/g : /\b(?:Get-WsMsg|M)\s+'([a-z0-9_]+)'/g;
  for (const m of text.matchAll(re)) keys.add(m[1]);
  return { codes, keys };
}

function listFiles(soGit) {
  const args = soGit ? ['ls-files', '-z'] : ['ls-files', '-z', '-co', '--exclude-standard'];
  const r = spawnSync('git', args, { cwd: KIT_ROOT, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`git ls-files falhou: ${r.stderr}`);
  return [...new Set(r.stdout.split('\0').filter(Boolean))].filter((f) => existsSync(join(KIT_ROOT, f)));
}

export function run({ soGit = false } = {}) {
  const erros = [];
  const conf = loadConf({ env: {} });
  const generated = JSON.parse(readFileSync(join(KIT_ROOT, 'tools/generated-files.json'), 'utf8')).ficheiros;
  // as saidas do slides/build-v2.mjs tambem levam os valores do repos.conf (o URL do repositorio no ultimo slide)
  const allowed = new Set(['repos.conf', 'tools/generated-files.json', ...generated, 'slides/palco.html', 'slides/speaker-notes-v2.md', 'slides/speaker-notes-v2.en.md']);
  const pats = hostPatterns(conf);
  const files = listFiles(soGit);

  for (const f of files) {
    if (BINARIO.test(f)) continue;
    const buf = readFileSync(join(KIT_ROOT, f));
    if (f.toLowerCase().endsWith('.ps1')) {
      for (const p of nonAsciiPositions(buf)) erros.push(`${f}:${p.line}:${p.col}: byte 0x${p.byte.toString(16)} (os .ps1 tem de ser ASCII)`);
    }
    if (allowed.has(f)) continue;
    const text = buf.toString('utf8');
    for (const pat of pats) {
      const i = text.indexOf(pat);
      if (i >= 0) erros.push(`${f}:${text.slice(0, i).split('\n').length}: contem "${pat}" (so pode estar no repos.conf ou em ficheiros gerados)`);
    }
  }

  for (const f of files) {
    if (!/^(setup|installer)\//.test(f) || /\/test\//.test(f) || !/\.(sh|ps1|psm1|mjs|js|cmd|bat)$/i.test(f)) continue;
    for (const c of pythonCalls(readFileSync(join(KIT_ROOT, f), 'utf8'))) erros.push(`${f}:${c.line}: chama um Python do sistema ("${c.text.slice(0, 80)}")`);
  }

  const render = spawnSync(process.execPath, [join(KIT_ROOT, 'tools/render.mjs'), '--check'], { cwd: KIT_ROOT, encoding: 'utf8' });
  if (render.status !== 0) erros.push(...render.stderr.trim().split('\n').filter(Boolean));

  const msgs = JSON.parse(readFileSync(join(KIT_ROOT, 'setup/messages.en.json'), 'utf8'));
  const msgsPt = JSON.parse(readFileSync(join(KIT_ROOT, 'setup/messages.pt.json'), 'utf8'));
  for (const d of catalogDiff(msgsPt, msgs)) erros.push(`setup/messages.pt.json vs messages.en.json: ${d}`);
  for (const [f, kind] of [
    ['setup/setup-mac.sh', 'sh'],
    ['setup/setup-windows.ps1', 'ps1'],
  ]) {
    if (!existsSync(join(KIT_ROOT, f))) continue;
    const { codes, keys } = usedCodesAndKeys(readFileSync(join(KIT_ROOT, f), 'utf8'), kind);
    for (const c of codes) if (!msgs.erros[c]) erros.push(`${f}: codigo ${c} nao existe em setup/messages.en.json`);
    for (const k of keys) if (msgs.ui[k] === undefined) erros.push(`${f}: mensagem "${k}" nao existe em setup/messages.en.json (ui)`);
  }
  return { erros, ficheiros: files.length, padroes: pats };
}

if (process.argv[1] && process.argv[1].endsWith('check-repo.mjs')) {
  const r = run({ soGit: process.argv.includes('--so-git') });
  if (r.erros.length) {
    for (const e of r.erros) console.error(`ERRO ${e}`);
    console.error(`\n${r.erros.length} problema(s) em ${r.ficheiros} ficheiros.`);
    process.exitCode = 1;
  } else {
    console.log(`OK: ${r.ficheiros} ficheiros verificados (padroes: ${r.padroes.join(', ')}; .ps1 so ASCII; gerados atualizados; mensagens completas e iguais em pt e en; sem chamadas a python).`);
  }
}
