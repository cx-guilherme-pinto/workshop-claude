#!/usr/bin/env node
// The mission book (docs/pt/WORKSHOP-V2-SPEC.md, sections 4.3, 4.4 and 6.7):
//
//   node ~/.workshop-claude/kit/missions/missions.mjs status [--json]   the book: ✔/○ per mission, the next one and a hint
//   node missions.mjs check [--quiet] [--delay ms]                      evaluates rules.json and records mission_done
//   node missions.mjs reset                                             starts the book again (for a rehearsal)
//
// The rules read the local book (~/.workshop-claude/telemetry/local.jsonl, written by the telemetry hook and the
// npm test reporter) and a few files in the workshop projects (the folder in config.json). Each mission counts once
// per person: once done, it stays done. With participation on, mission_done also goes to the panel queue.
import { closeSync, existsSync, openSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync, writeSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { isMain } from '../orchestrator/lib/is-main.mjs';
import { lingua } from '../hooks/lib/language.mjs';
import { active, homeDir, paths, readConfig, readJson, readLines, record, scope, writeJson } from '../telemetry/lib.mjs';

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
// "After" is by the order of the local book (n), not the clock: two events of the same millisecond keep their order.
function greenAfterLoop(ctx) {
  const loop = ctx.features.find((f) => f.name === 'loop');
  if (!loop) return false;
  const runs = ctx.tests;
  const redAt = runs.findIndex((r) => r.red > 0);
  if (redAt >= 0 && runs.slice(redAt + 1).some((r) => r.red === 0 && r.green > 0 && r.n > loop.n)) return true;
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
    features: lines.map((l, n) => ({ l, n })).filter(({ l }) => l.ev === 'feature').map(({ l, n }) => ({ name: l.name, family: l.local?.family, t: l.t, n })),
    tests: lines.map((l, n) => ({ l, n })).filter(({ l }) => l.ev === 'tests_run').map(({ l, n }) => ({ green: l.green, red: l.red, t: l.t, n })),
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
  if (!lock(P)) {
    // Someone else is checking right now: leave a mark, and the one with the lock looks once more at the end
    // (a file that became true meanwhile, e.g. edits.log written while the check was running, is not lost).
    try {
      writeFileSync(P.dirty, String(Date.now()));
    } catch {
      /* best effort */
    }
    return book;
  }
  try {
    let changed = false;
    for (let round = 0; round < 2; round++) {
      rmSync(P.dirty, { force: true });
      const ok = evaluate(context(P, cfg, env, runTests ? { runTests } : {}), book.done);
      for (const id of RULES.order) {
        if (!ok[id] || book.done[id]) continue;
        book.done[id] = now.toISOString();
        record('mission_done', { mission: id }, { P, now });
        changed = true;
      }
      if (!existsSync(P.dirty)) break;
    }
    if (changed || !existsSync(P.missions)) writeJson(P.missions, { ...book, updated: now.toISOString() });
    return book;
  } finally {
    rmSync(P.lock, { force: true });
  }
}

// Why a mission has not counted yet: one short sentence per condition that does not hold (for /missions).
const WHY = {
  pt: {
    'feature:plan_mode': 'ainda não vi uma mensagem enviada em plan mode (Shift+Tab) num projeto do workshop',
    'feature:model_switch': 'ainda não vi a troca para o Haiku (/model haiku, e confirmar)',
    'feature:subagent': 'ainda não vi um subagente teu a arrancar (pede ao Claude para usar um subagente)',
    'feature:skill_user': 'ainda não vi a tua skill a ser usada: /exit, claude -c e depois /<nome-da-skill>',
    'feature:loop': 'ainda não vi o /loop',
    'feature:headless': 'ainda não vi uma sessão claude -p na pasta do projeto',
    'feature:memory_write': 'ainda não vi o Claude a guardar uma memória (memory_add)',
    'file:skill': 'não encontro .claude/skills/<nome>/SKILL.md com name e description',
    'file:user_hook': 'o teu hook PostToolUse ainda não está no .claude/settings.local.json',
    'file:edits_log': 'o edits.log ainda está vazio: pede ao Claude uma edição',
    'file:user_statusline': 'a tua statusLine ainda não está no .claude/settings.local.json',
    'file:summary_txt': 'o resumo.txt (ou summary.txt) ainda não existe ou está vazio',
    'file:memory_note': 'ainda não há uma nota da app de memória para o missions-project',
    'tests:green_after_loop': 'os testes ainda não passaram todos depois do /loop (npm test)',
  },
  en: {
    'feature:plan_mode': 'I have not seen a message sent in plan mode (Shift+Tab) in a workshop project yet',
    'feature:model_switch': 'I have not seen the switch to Haiku yet (/model haiku, then confirm)',
    'feature:subagent': 'I have not seen a subagent of yours start yet (ask Claude to use a subagent)',
    'feature:skill_user': 'I have not seen your skill used yet: /exit, claude -c, then /<skill-name>',
    'feature:loop': 'I have not seen /loop yet',
    'feature:headless': 'I have not seen a claude -p session in the project folder yet',
    'feature:memory_write': 'I have not seen Claude save a memory yet (memory_add)',
    'file:skill': 'I cannot find .claude/skills/<name>/SKILL.md with a name and a description',
    'file:user_hook': 'your PostToolUse hook is not in .claude/settings.local.json yet',
    'file:edits_log': 'edits.log is still empty: ask Claude for an edit',
    'file:user_statusline': 'your statusLine is not in .claude/settings.local.json yet',
    'file:summary_txt': 'summary.txt (or resumo.txt) does not exist yet or is empty',
    'file:memory_note': 'there is no note of the memory app for missions-project yet',
    'tests:green_after_loop': 'the tests are not all green after /loop yet (npm test)',
  },
};
function whyKey(c, ctx) {
  if (c.feature) return `feature:${c.feature}`;
  if (c.tests) return `tests:${c.tests}`;
  if (c.file === 'user_hook_log') return ctx.projs.some((p) => userHook(localSettings(p))) ? 'file:edits_log' : 'file:user_hook';
  return `file:${c.file}`;
}
export function missing(id, ctx, l = lingua()) {
  const m = RULES.missions.find((x) => x.id === id);
  if (!m || m.validated === false) return [];
  const w = WHY[l] || WHY.en;
  const quick = { ...ctx, runTests: null };
  const fails = (m.all || m.any || []).filter((c) => !holds(c, quick)).map((c) => w[whyKey(c, ctx)]).filter(Boolean);
  if (m.any) return fails.length === m.any.length ? [fails.join(` — ${(T[l] || T.en).ou} — `)] : [];
  return fails;
}

export const VALIDATED = RULES.missions.filter((m) => m.validated !== false).map((m) => m.id);

const T = {
  pt: { fora: 'Estás fora da pasta do workshop ({pasta}): o que fazes aqui não conta para as missões. Abre o Claude num dos projetos dessa pasta.', falta: 'Ainda falta', ou: 'ou', titulo: 'Missões', proxima: 'Próxima', dica: 'dica, não é validada', todas: 'Fizeste todas as missões validadas. Experimenta a M7 numa espera.', semConfig: 'A caderneta de missões não está instalada (corre o setup do kit).', expirou: 'A caderneta expirou: o workshop já acabou.' },
  en: { fora: 'You are outside the workshop folder ({pasta}): what you do here does not count for the missions. Open Claude in one of the projects in that folder.', falta: 'Still missing', ou: 'or', titulo: 'Missions', proxima: 'Next', dica: 'a hint, not validated', todas: 'You did every validated mission. Try M7 while you wait.', semConfig: 'The mission book is not installed (run the kit setup).', expirou: 'The mission book has expired: the workshop is over.' },
};

// `extra` (from the status command): outside = the projects folder when Claude is outside it; why(id) = what is
// still missing for a mission.
export function render(book, l = lingua(), extra = {}) {
  const t = T[l] || T.en;
  const done = book?.done || {};
  const n = VALIDATED.filter((id) => done[id]).length;
  const out = [`${t.titulo} ${n}/${VALIDATED.length}`];
  if (extra.outside) out.unshift(t.fora.replace('{pasta}', extra.outside), '');
  for (const m of RULES.missions) {
    const mark = m.validated === false ? '·' : done[m.id] ? '✔' : '○';
    out.push(`  ${mark} ${m.id.padEnd(3)} ${m.title[l] || m.title.en}${m.validated === false ? ` (${t.dica})` : ''}`);
  }
  const next = RULES.order.map((id) => RULES.missions.find((m) => m.id === id)).find((m) => m.validated !== false && !done[m.id]);
  if (next) {
    out.push('', `${t.proxima}: ${next.id} ${next.title[l] || next.title.en}`, `  → ${next.hint[l] || next.hint.en}`);
    const why = extra.why?.(next.id) || [];
    if (why.length) out.push(`  ${t.falta}: ${why.join('; ')}`);
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
      // --delay <ms>: the telemetry hook asks for a check a little later (it ran one less than 10 s ago)
      const i = rest.indexOf('--delay');
      const ms = i >= 0 ? Math.min(Math.max(Number(rest[i + 1]) || 0, 0), 15000) : 0;
      if (ms) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
      if (ms) rmSync(P.checkDelayed, { force: true });
      const b = check({ P });
      if (!rest.includes('--quiet')) console.log(b ? render(b, l) : (T[l] || T.en).semConfig);
    } else if (cmd === 'status') {
      const cfg = readConfig(P);
      if (!cfg) console.log((T[l] || T.en).semConfig);
      else if (!active(cfg)) console.log((T[l] || T.en).expirou);
      else {
        const b = check({ P }) || readJson(P.missions, { done: {} });
        const here = process.env.CLAUDE_PROJECT_DIR || process.cwd();
        const outside = scope(here, cfg) ? null : cfg.projects_dir || join(homeDir(), 'workshop-claude');
        const ctx = context(P, cfg, process.env, { runTests: null });
        console.log(rest.includes('--json') ? JSON.stringify({ done: Object.keys(b.done || {}), validated: VALIDATED, outside: !!outside }) : render(b, l, { outside, why: (id) => missing(id, ctx, l) }));
      }
    } else if (cmd === 'reset') reset(P);
    else {
      console.log('usage: missions.mjs status [--json] | check [--quiet] [--delay ms] | reset');
      process.exitCode = 2;
    }
  } catch (e) {
    if (cmd !== 'check') console.error(String(e?.message || e));
  }
}
