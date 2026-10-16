#!/usr/bin/env node
// Monta o projeto demo (Arena de Seguranca) numa pasta, pronto a usar:
//   - copia demo-project/
//   - copia o motor do kit (hooks/, orquestrador/, statusline/, pricing.json) para tools/workshop/
//   - copia skills-demo/, skills-shared/ e agents/demo/ para .claude/
//   - escreve .claude/settings.json com caminhos absolutos (node, hooks, statusline)
//   - git init + commit inicial (para /demo-reset e worktrees)
//
//   node installer/assemble-demo.mjs --dest <pasta> [--node <caminho do node>] [--force] [--sem-git] [--probe]
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync, rmSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { ehPrincipal } from './lib/principal.mjs';

const KIT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function args(argv) {
  const o = { dest: null, node: process.execPath, force: false, git: true, probe: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dest') o.dest = resolve(argv[++i]);
    else if (a === '--node') o.node = argv[++i];
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

function copiar(src, dst) {
  if (!existsSync(src)) return;
  cpSync(src, dst, { recursive: true, filter: (p) => !/(^|[\\/])(\.DS_Store|node_modules|\.workshop)([\\/]|$)/.test(p) });
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
      if (existsSync(marca)) return { estado: 'ja_existia', versao: JSON.parse(readFileSync(marca, 'utf8')).versao };
      throw new Error(`a pasta ${o.dest} ja existe e nao e um projeto da Arena (usa --force para substituir)`);
    }
    rmSync(o.dest, { recursive: true, force: true });
  }
  mkdirSync(o.dest, { recursive: true });
  copiar(join(KIT, 'demo-project'), o.dest);
  const motor = join(o.dest, 'tools', 'workshop');
  for (const d of ['hooks', 'orquestrador', 'statusline']) copiar(join(KIT, d), join(motor, d));
  cpSync(join(KIT, 'pricing.json'), join(motor, 'pricing.json'));
  const skills = join(o.dest, '.claude', 'skills');
  copiar(join(KIT, 'skills-demo'), skills);
  copiar(join(KIT, 'skills-shared'), skills);
  copiar(join(KIT, 'agents', 'demo'), join(o.dest, '.claude', 'agents'));
  writeFileSync(join(o.dest, '.claude', 'settings.json'), JSON.stringify(settingsDemo(o.dest, o.node, o), null, 2) + '\n');
  mkdirSync(join(o.dest, '.workshop'), { recursive: true });
  writeFileSync(join(o.dest, '.gitignore'), '.workshop/\nnode_modules/\n.DS_Store\n');
  writeFileSync(marca, JSON.stringify({ versao: kitVersion(), montado_em: new Date().toISOString() }, null, 2) + '\n');
  if (o.git) {
    git(o.dest, 'init', '-q', '-b', 'main');
    git(o.dest, 'config', 'user.name', 'Participante do Workshop');
    git(o.dest, 'config', 'user.email', 'participante@workshop.invalid');
    git(o.dest, 'config', 'core.autocrlf', 'false');
    git(o.dest, 'add', '-A');
    git(o.dest, 'commit', '-q', '-m', 'Estado inicial da Arena de Seguranca');
    git(o.dest, 'tag', 'arena-inicial');
  }
  return { estado: 'montado', versao: kitVersion() };
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
