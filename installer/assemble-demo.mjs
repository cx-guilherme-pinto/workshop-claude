#!/usr/bin/env node
// Monta o projeto demo (Arena de Seguranca) numa pasta, pronto a usar:
//   - copia demo-project/ (sem i18n/) e poe por cima demo-project/i18n/<lingua>/, se existir;
//     noutra lingua que nao pt, corre tools/gen.mjs no destino (cartoes, testes e TASKS.md nessa lingua)
//   - copia o motor do kit (hooks/, orquestrador/, statusline/, pricing.json) para tools/workshop/
//     e escreve tools/workshop/lingua.json (a lingua dos textos das ferramentas)
//   - copia skills-demo/, skills-shared/ e agents/demo/ para .claude/
//   - escreve .claude/settings.json com caminhos absolutos (node, hooks, statusline)
//   - git init + commit inicial (para /demo-reset e worktrees)
//
//   node installer/assemble-demo.mjs --dest <pasta> [--lingua pt|en] [--node <caminho do node>] [--force] [--sem-git] [--probe]
//
// Sem --lingua: WORKSHOP_LANG, o lingua.json do kit instalado e o locale do sistema (ver linguaArena()).
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync, rmSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { ehPrincipal } from './lib/principal.mjs';
import { lingua, normalizar } from '../hooks/lib/lingua.mjs';

const KIT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Lingua da Arena por omissao, como o lingua() do kit: WORKSHOP_LANG, depois o lingua.json do kit
// instalado (escrito pelo install-user), depois LC_ALL/LC_MESSAGES/LANG e o Intl do Node. 'pt' ou 'en'.
export function linguaArena({ env = process.env, raiz = KIT } = {}) {
  return lingua({ env, raiz });
}

export function args(argv) {
  const o = { dest: null, node: process.execPath, force: false, git: true, probe: false, lingua: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dest') o.dest = resolve(argv[++i]);
    else if (a === '--lingua') {
      o.lingua = normalizar(argv[++i]);
      if (!o.lingua) throw new Error('--lingua tem de ser pt ou en');
    } else if (a === '--node') o.node = argv[++i];
    else if (a === '--force') o.force = true;
    else if (a === '--sem-git') o.git = false;
    else if (a === '--probe') o.probe = true;
  }
  if (!o.dest) throw new Error('falta --dest <pasta>');
  return o;
}

const barra = (p) => p.replace(/\\/g, '/');
const q = (p) => `"${barra(p)}"`;

export function kitVersion() {
  const conf = readFileSync(join(KIT, 'repos.conf'), 'utf8');
  return /^WORKSHOP_VERSION=(.*)$/m.exec(conf)?.[1]?.trim() || 'dev';
}

export function settingsDemo(dest, node, { probe = false } = {}) {
  const motor = join(dest, 'tools', 'workshop');
  const cmd = (rel) => `${q(node)} ${q(join(motor, rel))}`;
  const hook = (rel, timeout = 30) => ({ type: 'command', command: cmd(rel), timeout });
  const s = {
    model: 'claude-sonnet-5-5',
    permissions: {
      defaultMode: 'acceptEdits',
      allow: [
        'Bash(node --test *)',
        'Bash(node tools/*)',
        'Bash(node server.js*)',
        'Bash(git status*)',
        'Bash(git diff*)',
        'Bash(git log*)',
        'Read(**)',
        'Edit(cards/**)',
        'Write(cards/**)',
        'Edit(lib/hash.js)',
        'Write(lib/hash.js)',
        'Edit(pages/**)',
        'Write(pages/**)',
        'Edit(public/**)',
        'Write(.workshop/**)',
        'Edit(.workshop/**)',
        'mcp__memoria__memoria_procurar',
        'mcp__memoria__memoria_relacionadas',
      ],
      deny: ['Read(.env)', 'Read(.env.*)', 'Bash(curl *)', 'Bash(wget *)', 'Bash(rm -rf *)', 'Bash(git push*)'],
    },
    // O paralelismo vem do plan.json (8 participante, 16 apresentador); ARENA_MAX_PARALELO no ambiente sobrepoe-se.
    hooks: {
      SubagentStop: [{ hooks: [hook('hooks/subagent-stop.mjs')] }],
      Stop: [{ hooks: [hook('hooks/stop.mjs')] }],
    },
    statusLine: { type: 'command', command: cmd('statusline/statusline.mjs'), refreshInterval: 5 },
  };
  if (probe) {
    const p = { type: 'command', command: `${q(node)} ${q(join(KIT, 'tools/dev/probe-hook.mjs'))}`, timeout: 10 };
    for (const ev of ['SubagentStart', 'SubagentStop', 'PreToolUse', 'PostToolUse', 'Stop']) {
      s.hooks[ev] = [...(s.hooks[ev] || []), { ...(ev.endsWith('ToolUse') ? { matcher: 'Agent|Task|Workflow' } : {}), hooks: [p] }];
    }
  }
  return s;
}

function copiar(src, dst, { sem = [] } = {}) {
  if (!existsSync(src)) return;
  cpSync(src, dst, { recursive: true, filter: (p) => !/(^|[\\/])(\.DS_Store|node_modules|\.workshop)([\\/]|$)/.test(p) && !sem.includes(resolve(p)) });
}

// Copia demo-project/ sem i18n/ e poe por cima as traducoes de i18n/<lingua>/ (os mesmos caminhos).
// Noutra lingua que nao pt, gera cards/*/spec.md, card.test.js e TASKS.md a partir das specs traduzidas.
export function copiarArena(dest, l, { demo = join(KIT, 'demo-project') } = {}) {
  copiar(demo, dest, { sem: [resolve(demo, 'i18n')] });
  copiar(join(demo, 'i18n', l), dest);
  if (l !== 'pt') {
    const r = spawnSync(process.execPath, [join('tools', 'gen.mjs')], { cwd: dest, encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`tools/gen.mjs falhou: ${r.stderr || r.stdout}`);
  }
}

function git(dest, ...a) {
  const r = spawnSync('git', a, { cwd: dest, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`git ${a.join(' ')} falhou: ${r.stderr || r.stdout}`);
  return r.stdout.trim();
}

export function montar(o) {
  const marca = join(o.dest, '.arena-kit.json');
  if (existsSync(o.dest) && readdirSync(o.dest).length) {
    if (!o.force) {
      if (existsSync(marca)) {
        const m = JSON.parse(readFileSync(marca, 'utf8'));
        return { estado: 'ja_existia', versao: m.versao, lingua: m.lingua ?? 'pt' };
      }
      throw new Error(`a pasta ${o.dest} ja existe e nao e um projeto da Arena (usa --force para substituir)`);
    }
    rmSync(o.dest, { recursive: true, force: true });
  }
  const l = normalizar(o.lingua) || linguaArena();
  mkdirSync(o.dest, { recursive: true });
  copiarArena(o.dest, l);
  const motor = join(o.dest, 'tools', 'workshop');
  for (const d of ['hooks', 'orquestrador', 'statusline']) copiar(join(KIT, d), join(motor, d));
  cpSync(join(KIT, 'pricing.json'), join(motor, 'pricing.json'));
  writeFileSync(join(motor, 'lingua.json'), JSON.stringify({ lingua: l }) + '\n');
  const skills = join(o.dest, '.claude', 'skills');
  copiar(join(KIT, 'skills-demo'), skills);
  copiar(join(KIT, 'skills-shared'), skills);
  copiar(join(KIT, 'agents', 'demo'), join(o.dest, '.claude', 'agents'));
  writeFileSync(join(o.dest, '.claude', 'settings.json'), JSON.stringify(settingsDemo(o.dest, o.node, o), null, 2) + '\n');
  mkdirSync(join(o.dest, '.workshop'), { recursive: true });
  writeFileSync(join(o.dest, '.gitignore'), '.workshop/\nnode_modules/\n.DS_Store\n');
  writeFileSync(marca, JSON.stringify({ versao: kitVersion(), lingua: l, montado_em: new Date().toISOString() }, null, 2) + '\n');
  if (o.git) {
    git(o.dest, 'init', '-q', '-b', 'main');
    git(o.dest, 'config', 'user.name', 'Participante do Workshop');
    git(o.dest, 'config', 'user.email', 'participante@workshop.invalid');
    git(o.dest, 'config', 'core.autocrlf', 'false');
    git(o.dest, 'add', '-A');
    git(o.dest, 'commit', '-q', '-m', 'Estado inicial da Arena de Seguranca');
    git(o.dest, 'tag', 'arena-inicial');
  }
  return { estado: 'montado', versao: kitVersion(), lingua: l };
}

if (ehPrincipal(import.meta.url)) {
  try {
    const r = montar(args(process.argv.slice(2)));
    console.log(JSON.stringify(r));
  } catch (e) {
    console.error(`ERRO: ${e.message}`);
    process.exit(1);
  }
}
