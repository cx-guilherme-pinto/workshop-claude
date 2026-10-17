#!/usr/bin/env node
// Check of the "integration" task: runs node --test on every test of the project, EXCEPT the ones of the
// card (and lib) tasks that the orchestrator marked as failed for good in .workshop/status/<id>.json.
// Those have used up their attempts and the integrator does not redo them. Exits with 0 only if
// everything else passes.
//
//   node tools/check-integration.mjs          runs the suite
//   node tools/check-integration.mjs --list   only shows which files are in and which are left out
//
// (--lista still works.)
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { ARENA as ROOT, arenaTexts, planTasks, taskType, taskTest } from './engine.mjs';

// Texts in the Arena's language; outside an assembled Arena, Portuguese.
const T = await arenaTexts({
  pt: {
    outsidePlan: (n) => `(${n} cartões fora do plano deste modo não entram.)`,
    integration: (n) => `Integração: ${n} ficheiro(s) de teste.`,
    leftOut: (list) => `Ficam de fora (falharam de vez no swarm): ${list}`,
    noTests: 'Não há testes para correr.',
    green: '\nIntegração verde: todos os testes passam.',
    red: '\nIntegração vermelha: há testes a falhar (vê acima).',
  },
  en: {
    outsidePlan: (n) => `(${n} cards outside the plan for this mode are left out.)`,
    integration: (n) => `Integration: ${n} test file(s).`,
    leftOut: (list) => `Left out (failed for good in the swarm): ${list}`,
    noTests: 'No tests to run.',
    green: '\nIntegration green: all tests pass.',
    red: '\nIntegration red: some tests fail (see above).',
  },
});

const LIST_ONLY = process.argv.includes('--list') || process.argv.includes('--lista');
const FAILED_FOR_GOOD = new Set(['failed', 'falhou']);

const readJson = (f) => {
  try {
    return JSON.parse(readFileSync(f, 'utf8'));
  } catch {
    return null;
  }
};
const rel = (p) => relative(ROOT, p).split(sep).join('/');

// The same patterns that "node --test" uses with no arguments.
const PATTERNS = [/\.test\.[cm]?js$/, /-test\.[cm]?js$/, /_test\.[cm]?js$/, /(^|\/)test-[^/]*\.[cm]?js$/, /(^|\/)test\.[cm]?js$/, /(^|\/)test\/.*\.[cm]?js$/];

function discover(dir, out = []) {
  let names = [];
  try {
    names = readdirSync(dir);
  } catch {
    return out;
  }
  for (const n of names.sort()) {
    if (n === 'node_modules' || n.startsWith('.')) continue;
    const p = join(dir, n);
    let st;
    try {
      st = statSync(p);
    } catch {
      continue;
    }
    if (st.isDirectory()) discover(p, out);
    else if (PATTERNS.some((re) => re.test(rel(p)))) out.push(rel(p));
  }
  return out;
}

// Tasks that failed for good: their test file is left out.
function excluded() {
  const dir = join(ROOT, '.workshop', 'status');
  const plan = readJson(join(ROOT, 'plan.json'));
  const byId = new Map(planTasks(plan).map((t) => [t.id, t]));
  const out = new Map(); // file -> id
  let names = [];
  try {
    names = readdirSync(dir).filter((n) => n.endsWith('.json'));
  } catch {
    return out;
  }
  for (const n of names) {
    const st = readJson(join(dir, n));
    if (!FAILED_FOR_GOOD.has(st?.state ?? st?.estado)) continue;
    const id = String(st.task || st.tarefa || n.slice(0, -5));
    const t = byId.get(id);
    if (t && !['card', 'lib'].includes(taskType(t))) continue; // pages and app: the integrator fixes them
    const test = taskTest(t);
    const tests = Array.isArray(test) ? test.filter((a) => /\.[cm]?js$/.test(a)) : [];
    if (!tests.length && /^[a-z0-9][a-z0-9-]*$/.test(id)) tests.push(`cards/${id}/card.test.js`);
    for (const f of tests) if (existsSync(join(ROOT, f))) out.set(f.split(sep).join('/'), id);
  }
  return out;
}

// Cards that are not part of the current plan (for example in a plan written by an older kit, whose
// participant mode had only 15 cards) are left out too: nobody builds them in this run.
function outsidePlan() {
  const plan = readJson(join(ROOT, 'plan.json'));
  const tasks = planTasks(plan);
  if (!tasks.length) return new Set();
  const inPlan = new Set(tasks.filter((t) => taskType(t) === 'card').map((t) => t.id));
  const out = new Set();
  let ids = [];
  try {
    ids = readdirSync(join(ROOT, 'cards')).filter((n) => /^[a-z0-9][a-z0-9-]*$/.test(n));
  } catch {
    return out;
  }
  for (const id of ids) if (!inPlan.has(id)) out.add(`cards/${id}/card.test.js`);
  return out;
}

const all = discover(ROOT);
const left = excluded();
const notPlanned = outsidePlan();
const run = all.filter((f) => !left.has(f) && !notPlanned.has(f));
if (notPlanned.size) console.log(T.outsidePlan(notPlanned.size));

console.log(T.integration(run.length));
if (left.size) {
  console.log(T.leftOut([...left].map(([f, id]) => `${f} (${id})`).join(', ')));
}
if (LIST_ONLY) {
  for (const f of run) console.log(`  ${f}`);
  process.exit(0);
}
if (!run.length) {
  console.log(T.noTests);
  process.exit(0);
}

const r = spawnSync(process.execPath, ['--test', '--test-timeout=20000', ...run], { cwd: ROOT, stdio: 'inherit' });
const code = r.status ?? 1;
console.log(code === 0 ? T.green : T.red);
process.exit(code);
