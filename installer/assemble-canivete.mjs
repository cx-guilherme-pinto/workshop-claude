#!/usr/bin/env node
// Assembles the Pocketknife (canivete-project, Project 1 of workshop v2) in a folder, like assemble-demo.mjs does for
// the Security Arena:
//   - copies canivete-project/ without i18n/ and lays i18n/<language>/ over it (English);
//   - generates the specs and tests of the tools (tools/gen.mjs) in that language;
//   - copies the kit engine (hooks/, orchestrator/, statusline/, pricing.json) to tools/workshop/, without the kit's
//     own tests and without the user-level telemetry hook;
//   - copies the demo skills (generic: they read workshop.project.json), the shared skills (not /missions, which is
//     installed for the user) and the demo agents to .claude/, the agents with the names of workshop.project.json
//     filled in (lib/project-agents.mjs: tools/CONTRACT.md, tools/<id>/tool.js);
//   - writes .claude/settings.json with absolute paths (node, hooks, statusline) and the permissions of the swarm;
//   - git init with the kit's isolated git (lib/kit-repo.mjs), a first commit and the tag canivete-start.
//
//   node installer/assemble-canivete.mjs --dest <folder> [--language pt|en] [--node <node>] [--force] [--no-git]
//
// The marker .canivete-kit.json is written first as {"status":"incomplete"}: an interrupted copy is rebuilt on the
// next run; --force moves an existing project to the backup folder.
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { isMain } from './lib/is-main.mjs';
import { clearForAssembly, initKitRepo, isIncomplete, kitGit, writeIncompleteMark } from './lib/kit-repo.mjs';
import { lingua, normalizar, LANGUAGE_FILE } from '../hooks/lib/language.mjs';
import { ENGINE, kitVersion } from './assemble-demo.mjs';
import { copyDemoAgents } from './lib/project-agents.mjs';

const KIT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const CANIVETE_DIR = 'canivete-project';
export const START_TAG = 'canivete-start';
const MARK = '.canivete-kit.json';
const TEXTS = {
  pt: { name: 'Participante do Workshop', email: 'participante@workshop.invalid', commit: 'Estado inicial do Canivete' },
  en: { name: 'Workshop Participant', email: 'participant@workshop.invalid', commit: 'Initial state of the Pocketknife' },
};

export function args(argv) {
  const o = { dest: null, node: process.execPath, force: false, git: true, lingua: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dest') o.dest = resolve(argv[++i]);
    else if (a === '--language' || a === '--lingua') {
      o.lingua = normalizar(argv[++i]);
      if (!o.lingua) throw new Error('--language must be pt or en');
    } else if (a === '--node') o.node = argv[++i];
    else if (a === '--force') o.force = true;
    else if (a === '--no-git') o.git = false;
  }
  if (!o.dest) throw new Error('missing --dest <folder>');
  return o;
}

const slash = (p) => p.replace(/\\/g, '/');
const q = (p) => `"${slash(p)}"`;

export function settingsCanivete(dest, node) {
  const engine = join(dest, 'tools', 'workshop');
  const cmd = (rel) => `${q(node)} ${q(join(engine, rel))}`;
  const hook = (rel, timeout = 30) => ({ type: 'command', command: cmd(rel), timeout });
  return {
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
        'Edit(tools/*/tool.js)',
        'Write(tools/*/tool.js)',
        'Edit(pages/**)',
        'Write(pages/**)',
        'Edit(public/**)',
        'Write(.workshop/**)',
        'Edit(.workshop/**)',
        'mcp__agent-memory__memory_search',
        'mcp__agent-memory__memory_related',
        'mcp__agent-memory__memory_add',
      ],
      // The tools' specs and tests are the contract: no agent changes them. A person completes a broken tool's spec.md
      // by hand (specs/tools.json "spec_gaps") and runs it again with /demo-swarm --retry <id>.
      deny: ['Read(.env)', 'Read(.env.*)', 'Bash(curl *)', 'Bash(wget *)', 'Bash(rm -rf *)', 'Bash(git push*)', 'Edit(tools/*/spec.md)', 'Edit(tools/*/tool.test.js)'],
    },
    hooks: {
      SubagentStop: [{ hooks: [hook('hooks/subagent-stop.mjs')] }],
      Stop: [{ hooks: [hook('hooks/stop.mjs')] }],
    },
    statusLine: { type: 'command', command: cmd('statusline/statusline.mjs'), refreshInterval: 5 },
  };
}

const NOISE = /(^|[\\/])(\.DS_Store|node_modules|\.workshop)([\\/]|$)/;
function copy(src, dst, { without = [] } = {}) {
  if (!existsSync(src)) return;
  cpSync(src, dst, { recursive: true, filter: (p) => !NOISE.test(p) && !without.includes(resolve(p)) });
}

// canivete-project/ (without i18n/) with i18n/<l>/ on top, and the generated specs and tests. The catalogue goes in
// without the answers of the tools broken on purpose (tools/gaps.mjs): only their hashes, as in the tests.
export async function copyCanivete(dest, l, { src = join(KIT, CANIVETE_DIR) } = {}) {
  copy(src, dest, { without: [resolve(src, 'i18n')] });
  if (l !== 'pt') copy(join(src, 'i18n', l), dest);
  const { withoutAnswers } = await import(pathToFileURL(join(src, 'tools', 'gaps.mjs')).href);
  const cat = join(dest, 'specs', 'tools.json');
  writeFileSync(cat, JSON.stringify(withoutAnswers(JSON.parse(readFileSync(cat, 'utf8'))), null, 2) + '\n');
  const r = spawnSync(process.execPath, [join('tools', 'gen.mjs')], { cwd: dest, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`tools/gen.mjs failed: ${r.stderr || r.stdout}`);
}

function readMark(f) {
  try {
    return JSON.parse(readFileSync(f, 'utf8'));
  } catch {
    return {};
  }
}

export async function montar(o) {
  const mark = join(o.dest, MARK);
  let backup = null;
  if (existsSync(o.dest) && readdirSync(o.dest).length) {
    if (!o.force && !isIncomplete(o.dest, mark)) {
      if (existsSync(mark)) return { status: 'already_there', version: readMark(mark).version ?? null, language: readMark(mark).language ?? 'pt' };
      throw new Error(`the folder ${o.dest} already exists and is not a Pocketknife project (use --force to replace it)`);
    }
    backup = clearForAssembly(o.dest, mark);
  }
  const l = normalizar(o.lingua) || lingua();
  mkdirSync(o.dest, { recursive: true });
  writeIncompleteMark(mark, l);
  await copyCanivete(o.dest, l);
  const engine = join(o.dest, 'tools', 'workshop');
  for (const d of ENGINE) copy(join(KIT, d), join(engine, d), { without: [resolve(KIT, d, 'test'), resolve(KIT, 'hooks', 'telemetry.mjs')] });
  cpSync(join(KIT, 'pricing.json'), join(engine, 'pricing.json'));
  writeFileSync(join(engine, LANGUAGE_FILE), JSON.stringify({ language: l }) + '\n');
  const skills = join(o.dest, '.claude', 'skills');
  copy(join(KIT, 'skills-demo'), skills);
  copy(join(KIT, 'skills-shared'), skills, { without: [resolve(KIT, 'skills-shared', 'missions')] });
  copyDemoAgents(join(KIT, 'agents', 'demo'), o.dest);
  writeFileSync(join(o.dest, '.claude', 'settings.json'), JSON.stringify(settingsCanivete(o.dest, o.node), null, 2) + '\n');
  mkdirSync(join(o.dest, '.workshop'), { recursive: true });
  writeFileSync(join(o.dest, '.gitignore'), '.workshop/\nnode_modules/\n.DS_Store\n');
  writeFileSync(mark, JSON.stringify({ version: kitVersion(), language: l, assembled_at: new Date().toISOString() }, null, 2) + '\n');
  if (o.git) {
    const t = TEXTS[l] ?? TEXTS.en;
    initKitRepo(o.dest, { name: t.name, email: t.email });
    kitGit(o.dest, ['add', '-A']);
    kitGit(o.dest, ['commit', '-q', '-m', t.commit]);
    kitGit(o.dest, ['tag', START_TAG]);
  }
  return { status: 'assembled', version: kitVersion(), language: l, ...(backup ? { backup } : {}) };
}

if (isMain(import.meta.url)) {
  try {
    console.log(JSON.stringify(await montar(args(process.argv.slice(2)))));
  } catch (e) {
    console.error(`ERROR: ${e.message}`);
    process.exit(1);
  }
}
