#!/usr/bin/env node
// The mission book (docs/pt/WORKSHOP-V2-SPEC.md, sections 4.3, 4.4 and 6.7):
//
//   node ~/.workshop-claude/kit/missions/missions.mjs status [--json]   the book: ✔/○ per mission, the next one and a hint
//   node missions.mjs check [--quiet]                                   evaluates rules.json and records mission_done
//   node missions.mjs reset                                             starts the book again (for a rehearsal)
//
// The rules read the local book (~/.workshop-claude/telemetry/local.jsonl, written by the telemetry hook and the
// npm test reporter) and a few files in the workshop projects (the folder in config.json). Each mission counts once
// per person: once done, it stays done. With participation on, mission_done also goes to the panel queue.
import { closeSync, existsSync, openSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { isMain } from '../orchestrator/lib/is-main.mjs';
import { lingua } from '../hooks/lib/language.mjs';
import { active, homeDir, paths, readConfig, readJson, readLines, record, writeJson } from '../telemetry/lib.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
export const RULES = JSON.parse(readFileSync(join(HERE, 'rules.json'), 'utf8'));
const LOCK_STALE_MS = 20000;
const KIT_SKILLS = new Set(['memory', 'memoria', 'missions', 'design-taste-frontend', 'task-intake', 'task-plan', 'task-swarm', 'task-gate', 'task-report', 'demo-plan', 'demo-swarm', 'demo-review', 'demo-cost', 'demo-reset']);

const ours = (cmd) => typeof cmd === 'string' && cmd.replace(/\\/g, '/').includes('/.workshop-claude/kit/');
const nonEmpty = (f) => {
  try {
    return statSync(f).isFile() && readFileSync(f, 'utf8').trim().length > 0;
  } catch {
    return false;
  }
};
const dirs = (d) => {
  try {
    return readdirSync(d, { withFileTypes: true }).filter((x) => x.isDirectory() && !x.name.startsWith('.')).map((x) => join(d, x.name));
  } catch {
    return [];
  }
};

// The workshop projects: every folder in the projects folder of config.json (~/workshop-claude by default).
export function projectDirs(cfg, env = process.env) {
  return dirs(cfg?.projects_dir || join(homeDir(env), 'workshop-claude'));
}

function frontmatter(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (!m) return null;
  const out = {};
  for (const l of m[1].split(/\r?\n/)) {
    const k = /^([A-Za-z_-]+):\s*(.*)$/.exec(l);
    if (k) out[k[1]] = k[2].trim();
  }
  return out;
}

const localSettings = (proj) => readJson(join(proj, '.claude', 'settings.local.json'), null);
const userHook = (s) => (Array.isArray(s?.hooks?.PostToolUse) ? s.hooks.PostToolUse : []).some((g) => Array.isArray(g?.hooks) && g.hooks.some((h) => typeof h?.command === 'string' && !ours(h.command)));

export const FILE_CHECKS = {
  // A skill of the person's own with valid frontmatter (name and description), not one of the kit's.
  skill: (projs) =>
    projs.some((p) =>
      dirs(join(p, '.claude', 'skills')).some((d) => {
        try {
          const fm = frontmatter(readFileSync(join(d, 'SKILL.md'), 'utf8'));
          return !!fm?.name && !!fm?.description && !KIT_SKILLS.has(fm.name);
        } catch {
          return false;
        }
      }),
    ),
  // A PostToolUse hook of the person's own in settings.local.json and an edits.log with a line, in one project.
  user_hook_log: (projs) => projs.some((p) => userHook(localSettings(p)) && nonEmpty(join(p, 'edits.log'))),
  user_statusline: (projs) =>
    projs.some((p) => {
      const sl = localSettings(p)?.statusLine;
      return typeof sl?.command === 'string' && !ours(sl.command);
    }),
  summary_txt: (projs) => projs.some((p) => nonEmpty(join(p, 'resumo.txt')) || nonEmpty(join(p, 'summary.txt'))),
  // A note of the Agent Memory app for the missions project (~/.agent-memory/<project>/*.md).
  memory_note: (projs, env) => {
    const home = homeDir(env);
    const roots = [env.AGENT_MEMORY_HOME, env.MEMORIA_HOME, join(home, '.agent-memory'), join(home, '.memoria')].filter(Boolean);
    return roots.some((r) => {
      try {
        return readdirSync(join(r, 'missions-project')).some((f) => f.endsWith('.md'));
      } catch {
        return false;
      }
    });
  },
};

// M6: after /loop started, an npm test with 0 red that follows one with red. Without those events (the tests were
// run with node --test, not npm test), the tests of the missions project are run here once: all green is enough
// (the spec's plan B), because the project ships with 2 red tests.
function greenAfterLoop(ctx) {
  const loopT = ctx.features.filter((f) => f.name === 'loop').map((f) => f.t).sort()[0];
  if (!loopT) return false;
  const runs = ctx.tests;
  const redAt = runs.findIndex((r) => r.red > 0);
  if (redAt >= 0 && runs.slice(redAt + 1).some((r) => r.red === 0 && r.green > 0 && r.t >= loopT)) return true;
  const proj = ctx.projs.find((p) => /[\\/]missions-project$/.test(p));
  if (!proj || !ctx.runTests) return false;
  return ctx.runTests(proj);
}

function runProjectTests(proj) {
  const r = spawnSync(process.execPath, ['--test'], { cwd: proj, encoding: 'utf8', timeout: 15000, env: { ...process.env, WORKSHOP_TELEMETRY_NO_CHECK: '1' } });
  return r.status === 0;
}

function holds(c, ctx) {
  if (c.feature) return ctx.features.some((f) => f.name === c.feature && (!c.family || f.family === c.family));
  if (c.file) return !!FILE_CHECKS[c.file]?.(ctx.projs, ctx.env);
  if (c.tests === 'green_after_loop') return greenAfterLoop(ctx);
  return false;
}

export function evaluate(ctx, skip = {}) {
  const done = {};
  for (const m of RULES.missions) {
    if (m.validated === false || skip[m.id]) continue;
    const ok = m.all ? m.all.every((c) => holds(c, ctx)) : (m.any || []).some((c) => holds(c, ctx));
    if (ok) done[m.id] = true;
  }
  return done;
}

export function context(P, cfg, env = process.env, { runTests = runProjectTests } = {}) {
  const lines = readLines(P.local);
  return {
    env,
    projs: projectDirs(cfg, env),
    features: lines.filter((l) => l.ev === 'feature').map((l) => ({ name: l.name, family: l.local?.family, t: l.t })),
    tests: lines.filter((l) => l.ev === 'tests_run').map((l) => ({ green: l.green, red: l.red, t: l.t })),
    runTests,
  };
}

function lock(P) {
  try {
    const fd = openSync(P.lock, 'wx');
    writeSync(fd, String(process.pid));
    closeSync(fd);
    return true;
  } catch {
    try {
      if (Date.now() - statSync(P.lock).mtimeMs > LOCK_STALE_MS) {
        rmSync(P.lock, { force: true });
        return lock(P);
      }
    } catch {
      /* gone meanwhile */
    }
    return false;
  }
}

// Evaluates and records the missions that became done. Returns the book ({ done: {M1: iso…} }) or null.
export function check({ P = paths(), env = process.env, now = new Date(), runTests } = {}) {
  const cfg = readConfig(P);
  if (!active(cfg, now)) return null;
  const book = readJson(P.missions, null) || { v: 1, done: {} };
  if (!lock(P)) return book;
  try {
    const ok = evaluate(context(P, cfg, env, runTests ? { runTests } : {}), book.done);
    let changed = false;
    for (const id of RULES.order) {
      if (!ok[id] || book.done[id]) continue;
      book.done[id] = now.toISOString();
      record('mission_done', { mission: id }, { P, now });
      changed = true;
    }
    if (changed || !existsSync(P.missions)) writeJson(P.missions, { ...book, updated: now.toISOString() });
    return book;
  } finally {
    rmSync(P.lock, { force: true });
  }
}

export const VALIDATED = RULES.missions.filter((m) => m.validated !== false).map((m) => m.id);

const T = {
  pt: { titulo: 'Missões', proxima: 'Próxima', dica: 'dica, não é validada', todas: 'Fizeste todas as missões validadas. Experimenta a M7 numa espera.', semConfig: 'A caderneta de missões não está instalada (corre o setup do kit).', expirou: 'A caderneta expirou: o workshop já acabou.' },
  en: { titulo: 'Missions', proxima: 'Next', dica: 'a hint, not validated', todas: 'You did every validated mission. Try M7 while you wait.', semConfig: 'The mission book is not installed (run the kit setup).', expirou: 'The mission book has expired: the workshop is over.' },
};

export function render(book, l = lingua()) {
  const t = T[l] || T.en;
  const done = book?.done || {};
  const n = VALIDATED.filter((id) => done[id]).length;
  const out = [`${t.titulo} ${n}/${VALIDATED.length}`];
  for (const m of RULES.missions) {
    const mark = m.validated === false ? '·' : done[m.id] ? '✔' : '○';
    out.push(`  ${mark} ${m.id.padEnd(3)} ${m.title[l] || m.title.en}${m.validated === false ? ` (${t.dica})` : ''}`);
  }
  const next = RULES.order.map((id) => RULES.missions.find((m) => m.id === id)).find((m) => m.validated !== false && !done[m.id]);
  if (next) {
    out.push('', `${t.proxima}: ${next.id} ${next.title[l] || next.title.en}`, `  → ${next.hint[l] || next.hint.en}`);
  } else out.push('', t.todas, `  → ${RULES.missions.find((m) => m.id === 'M7').hint[l]}`);
  return out.join('\n');
}

export function reset(P = paths(), now = new Date()) {
  const stamp = now.toISOString().replace(/[:.]/g, '-');
  if (existsSync(P.local)) renameSync(P.local, join(P.dir, `local-${stamp}.jsonl`));
  for (const f of [P.missions, P.seen]) rmSync(f, { force: true });
}

if (isMain(import.meta.url)) {
  const [cmd = 'status', ...rest] = process.argv.slice(2);
  const P = paths();
  const l = lingua();
  try {
    if (cmd === 'check') {
      const b = check({ P });
      if (!rest.includes('--quiet')) console.log(b ? render(b, l) : (T[l] || T.en).semConfig);
    } else if (cmd === 'status') {
      const cfg = readConfig(P);
      if (!cfg) console.log((T[l] || T.en).semConfig);
      else if (!active(cfg)) console.log((T[l] || T.en).expirou);
      else {
        const b = check({ P }) || readJson(P.missions, { done: {} });
        console.log(rest.includes('--json') ? JSON.stringify({ done: Object.keys(b.done || {}), validated: VALIDATED }) : render(b, l));
      }
    } else if (cmd === 'reset') reset(P);
    else {
      console.log('usage: missions.mjs status [--json] | check [--quiet] | reset');
      process.exitCode = 2;
    }
  } catch (e) {
    if (cmd !== 'check') console.error(String(e?.message || e));
  }
}
