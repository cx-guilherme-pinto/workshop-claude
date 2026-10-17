#!/usr/bin/env node
// Assembles the demo project (the Security Arena) in a folder, ready to use:
//   - copies demo-project/ (without i18n/) and lays demo-project/i18n/<language>/ over it, if it exists;
//     in a language other than pt, runs tools/gen.mjs in the destination (cards, tests and TASKS.md in that language)
//   - copies the kit engine (hooks/, orchestrator/, statusline/, pricing.json) to tools/workshop/
//     and writes tools/workshop/language.json (the language of the tools' texts)
//   - copies skills-demo/, skills-shared/ and agents/demo/ to .claude/
//   - writes .claude/settings.json with absolute paths (node, hooks, statusline)
//   - git init + first commit, tagged arena-start (for /demo-reset, the gate and worktrees), isolated from the
//     person's global git config (lib/kit-repo.mjs: no signing, no company hooks, no global gitignore, no CRLF)
//
// The marker .arena-kit.json is written first with {"status":"incomplete"}: an interrupted copy is rebuilt on the
// next run. --force never deletes someone's Arena: it moves it to ~/.workshop-claude/backup/<date>/ ("backup" in
// the JSON output). Only the kit's own incomplete copy is deleted.
//
//   node installer/assemble-demo.mjs --dest <folder> [--language pt|en] [--node <node path>] [--force] [--no-git] [--probe]
//   (--lingua and --sem-git still work.)
//
// Without --language: WORKSHOP_LANG, the installed kit's language.json and the system locale (see linguaArena()).
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { isMain } from './lib/is-main.mjs';
import { clearForAssembly, gitSync, initKitRepo, isIncomplete, kitGit, writeIncompleteMark } from './lib/kit-repo.mjs';
import { lingua, normalizar, LANGUAGE_FILE } from '../hooks/lib/language.mjs';

const KIT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// The git tag of the Arena's initial state (arena-inicial until v1.0.0-rc.1).
export const START_TAG = 'arena-start';
export const LEGACY_START_TAG = 'arena-inicial';

// The engine folders copied to tools/workshop/.
export const ENGINE = ['hooks', 'orchestrator', 'statusline'];

const TEXTOS = {
  pt: { nome: 'Participante do Workshop', email: 'participante@workshop.invalid', commit: 'Estado inicial da Arena de Segurança' },
  en: { nome: 'Workshop Participant', email: 'participant@workshop.invalid', commit: 'Initial state of the Security Arena' },
};

// Default Arena language, like the kit's lingua(): WORKSHOP_LANG, then the installed kit's language.json
// (written by install-user), then LC_ALL/LC_MESSAGES/LANG and Node's Intl. 'pt' or 'en'.
export function linguaArena({ env = process.env, raiz = KIT } = {}) {
  return lingua({ env, raiz });
}

export function args(argv) {
  const o = { dest: null, node: process.execPath, force: false, git: true, probe: false, lingua: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dest') o.dest = resolve(argv[++i]);
    else if (a === '--language' || a === '--lingua') {
      o.lingua = normalizar(argv[++i]);
      if (!o.lingua) throw new Error('--language must be pt or en');
    } else if (a === '--node') o.node = argv[++i];
    else if (a === '--force') o.force = true;
    else if (a === '--no-git' || a === '--sem-git') o.git = false;
    else if (a === '--probe') o.probe = true;
  }
  if (!o.dest) throw new Error('missing --dest <folder>');
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
        'mcp__agent-memory__memory_search',
        'mcp__agent-memory__memory_related',
        'mcp__agent-memory__memory_add',
      ],
      deny: ['Read(.env)', 'Read(.env.*)', 'Bash(curl *)', 'Bash(wget *)', 'Bash(rm -rf *)', 'Bash(git push*)'],
    },
    // The parallelism comes from plan.json (8 participant, 16 presenter); ARENA_MAX_PARALLEL in the environment overrides it.
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

// Copies demo-project/ without i18n/ and lays the translations from i18n/<language>/ over it (the same paths).
// In a language other than pt, generates cards/*/spec.md, card.test.js and TASKS.md from the translated specs.
export function copiarArena(dest, l, { demo = join(KIT, 'demo-project') } = {}) {
  copiar(demo, dest, { sem: [resolve(demo, 'i18n')] });
  copiar(join(demo, 'i18n', l), dest);
  if (l !== 'pt') {
    const r = spawnSync(process.execPath, [join('tools', 'gen.mjs')], { cwd: dest, encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`tools/gen.mjs failed: ${r.stderr || r.stdout}`);
  }
}

const git = (dest, ...a) => kitGit(dest, a);

const temTag = (dest, t) => gitSync(dest, ['rev-parse', '-q', '--verify', `refs/tags/${t}`]).status === 0;

// An Arena assembled before the rename only has the arena-inicial tag: add arena-start on the same commit
// (nothing else changes; the participant's work stays as it is). Returns true if it added the tag.
// With the overrides, a global tag.gpgsign does not turn it into a signed tag that asks for a message.
export function migrarTag(dest) {
  if (!existsSync(join(dest, '.git')) || temTag(dest, START_TAG) || !temTag(dest, LEGACY_START_TAG)) return false;
  return gitSync(dest, ['tag', START_TAG, LEGACY_START_TAG]).status === 0;
}

const lerMarca = (f) => {
  try {
    const m = JSON.parse(readFileSync(f, 'utf8'));
    return { version: m.version ?? m.versao, language: m.language ?? m.lingua ?? 'pt' };
  } catch {
    return { version: null, language: 'pt' };
  }
};

export function montar(o) {
  const marca = join(o.dest, '.arena-kit.json');
  let backup = null;
  if (existsSync(o.dest) && readdirSync(o.dest).length) {
    // An incomplete copy (Ctrl-C, closed window, crash) is the kit's own: it is rebuilt even without --force.
    if (!o.force && !isIncomplete(o.dest, marca)) {
      if (existsSync(marca)) {
        const m = lerMarca(marca);
        const tag = migrarTag(o.dest);
        return { status: 'already_there', version: m.version, language: m.language, ...(tag ? { tag_added: START_TAG } : {}) };
      }
      throw new Error(`the folder ${o.dest} already exists and is not an Arena project (use --force to replace it)`);
    }
    backup = clearForAssembly(o.dest, marca);
  }
  const l = normalizar(o.lingua) || linguaArena();
  mkdirSync(o.dest, { recursive: true });
  // Marker first: until the real one below replaces it, the folder is an incomplete copy (see lib/kit-repo.mjs).
  writeIncompleteMark(marca, l);
  copiarArena(o.dest, l);
  const motor = join(o.dest, 'tools', 'workshop');
  // Without the kit's own tests (hooks/test/, orchestrator/test/): "node --test" and tools/check-integration.mjs in
  // the Arena would run them too, and their names are the kit's (Portuguese), not the Arena's language.
  for (const d of ENGINE) copiar(join(KIT, d), join(motor, d), { sem: [resolve(KIT, d, 'test')] });
  cpSync(join(KIT, 'pricing.json'), join(motor, 'pricing.json'));
  writeFileSync(join(motor, LANGUAGE_FILE), JSON.stringify({ language: l }) + '\n');
  const skills = join(o.dest, '.claude', 'skills');
  copiar(join(KIT, 'skills-demo'), skills);
  copiar(join(KIT, 'skills-shared'), skills);
  copiar(join(KIT, 'agents', 'demo'), join(o.dest, '.claude', 'agents'));
  writeFileSync(join(o.dest, '.claude', 'settings.json'), JSON.stringify(settingsDemo(o.dest, o.node, o), null, 2) + '\n');
  mkdirSync(join(o.dest, '.workshop'), { recursive: true });
  writeFileSync(join(o.dest, '.gitignore'), '.workshop/\nnode_modules/\n.DS_Store\n');
  writeFileSync(marca, JSON.stringify({ version: kitVersion(), language: l, assembled_at: new Date().toISOString() }, null, 2) + '\n');
  if (o.git) {
    const t = TEXTOS[l] ?? TEXTOS.en;
    initKitRepo(o.dest, { name: t.nome, email: t.email });
    git(o.dest, 'add', '-A');
    git(o.dest, 'commit', '-q', '-m', t.commit);
    git(o.dest, 'tag', START_TAG);
  }
  return { status: 'assembled', version: kitVersion(), language: l, ...(backup ? { backup } : {}) };
}

if (isMain(import.meta.url)) {
  try {
    const r = montar(args(process.argv.slice(2)));
    console.log(JSON.stringify(r));
  } catch (e) {
    console.error(`ERROR: ${e.message}`);
    process.exit(1);
  }
}
