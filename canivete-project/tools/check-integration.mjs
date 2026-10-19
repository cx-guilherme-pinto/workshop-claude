#!/usr/bin/env node
// Check of the "integration" task (adapted from the Security Arena): runs node --test on every test of the project,
// EXCEPT the ones of the tools that the orchestrator marked as failed for good in .workshop/status/<id>.json (they
// have used up their attempts and the integrator does not redo them) and the tools outside the current plan.
// Exits with 0 only if everything else passes.
//
//   node tools/check-integration.mjs          runs the suite
//   node tools/check-integration.mjs --list   only shows which files are in and which are left out
//
// (--lista still works.)
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { PROJECT as ROOT, TOOL_ID, planTasks, projectTexts, taskType } from './engine.mjs';

// Texts in the project's language.
const T = projectTexts({
  pt: {
    outsidePlan: (n) => `(${n} ferramenta(s) fora do plano não entram.)`,
    integration: (n) => `Integração: ${n} ficheiro(s) de teste.`,
    leftOut: (list) => `Ficam de fora (falharam de vez no swarm): ${list}`,
    noTests: 'Não há testes para correr.',
    green: '\nIntegração verde: todos os testes passam.',
    red: '\nIntegração vermelha: há testes a falhar (vê acima).',
  },
  en: {
    outsidePlan: (n) => `(${n} tool(s) outside the plan are left out.)`,
    integration: (n) => `Integration: ${n} test file(s).`,
    leftOut: (list) => `Left out (failed for good in the swarm): ${list}`,
    noTests: 'No tests to run.',
    green: '\nIntegration green: all tests pass.',
    red: '\nIntegration red: some tests fail (see above).',
  },
}, ROOT);

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

const plan = readJson(join(ROOT, 'plan.json'));
const tasks = planTasks(plan);
const byId = new Map(tasks.map((t) => [t.id, t]));
const toolTest = (id) => `tools/${id}/tool.test.js`;

// Tools that failed for good: their test file is left out. Pages and the app are never left out: the integrator
// fixes them.
function excluded() {
  const dir = join(ROOT, '.workshop', 'status');
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
    if (!TOOL_ID.test(id) || (t && !['tool', 'card'].includes(taskType(t)))) continue;
    if (existsSync(join(ROOT, toolTest(id)))) out.set(toolTest(id), id);
  }
  return out;
}

// Tools that are not part of the current plan (your tool generated after /demo-plan, for example): nobody builds
// them in this run. With no plan, every tool is in.
function outsidePlan() {
  const out = new Set();
  if (!tasks.length) return out;
  for (const id of readdirSync(join(ROOT, 'tools')).filter((n) => TOOL_ID.test(n))) if (!byId.has(id)) out.add(toolTest(id));
  return out;
}

const all = discover(ROOT);
const left = excluded();
const notPlanned = outsidePlan();
const run = all.filter((f) => !left.has(f) && !notPlanned.has(f));
const notPlannedHere = [...notPlanned].filter((f) => all.includes(f));
if (notPlannedHere.length) console.log(T.outsidePlan(notPlannedHere.length));

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
