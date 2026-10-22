// The workshop panel's events from the orchestrator (docs/pt/WORKSHOP-V2-SPEC.md, section 6.4): p1_swarm_done (or
// p2_swarm_done) once when the swarm ends, with the duration and the greens at the first try, and p1_retry_green when a
// task broken on purpose goes green after a person fixed its spec (--retry). The events go to the local book of a
// telemetry config in a temporary folder (WORKSHOP_TELEMETRY_DIR); the bridge finds telemetry/ next to the kit.
process.env.WORKSHOP_LANG = 'en';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { proximaOnda } from '../next-wave.mjs';

const WHEN_FIXED = ['node', '-e', 'process.exit(require("fs").existsSync("ok.txt") ? 0 : 1)'];
const OK = ['node', '-e', 'process.exit(0)'];

function setup(block) {
  const base = mkdtempSync(join(tmpdir(), 'ws-pe-'));
  const dir = join(base, 'proj');
  mkdirSync(dir);
  if (block) writeFileSync(join(dir, 'workshop.project.json'), JSON.stringify({ v: 1, id: 't', block }));
  const tel = join(base, 'telemetry');
  mkdirSync(tel);
  writeFileSync(join(tel, 'config.json'), JSON.stringify({ v: 1, enabled: false, expires_at: '2099-01-01T00:00:00.000Z' }));
  process.env.WORKSHOP_TELEMETRY_DIR = tel;
  const plan = {
    v: 1,
    project: 't',
    mode: 'test',
    config: { max_parallel: 4, max_attempts: 3, escalate_to: 'implementer' },
    agents: { worker: { model: 'claude-haiku-5-5' }, implementer: { model: 'claude-sonnet-5-5' } },
    tasks: [
      { id: 'nm-03', test: WHEN_FIXED, spec_gap: true },
      { id: 'nm-01', test: OK },
      { id: 'tx-01', test: OK },
    ].map((t) => ({ group_type: 'card', wave: 1, agent: 'worker', depends_on: [], files: [`tools/${t.id}/tool.js`], instructions: `build ${t.id}`, ...t })),
  };
  writeFileSync(join(dir, 'plan.json'), JSON.stringify(plan));
  return { base, dir, plan: join(dir, 'plan.json'), events: () => (existsSync(join(tel, 'local.jsonl')) ? readFileSync(join(tel, 'local.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l)) : []) };
}

async function untilDone(p, extra = {}) {
  for (let i = 0; i < 12; i++) {
    const r = await proximaOnda({ projeto: p.dir, plano: p.plan, l: 'en', ...extra });
    if (!r.chamadas.length) return r;
  }
  throw new Error('did not end');
}

test('Project 1: p1_swarm_done once at the end; p1_retry_green when the fixed spec makes the broken task green', async () => {
  const p = setup('p1');
  try {
    await untilDone(p);
    await untilDone(p);
    const done = p.events().filter((e) => e.ev === 'p1_swarm_done');
    assert.equal(done.length, 1, 'once per run');
    assert.deepEqual([done[0].green, done[0].red, done[0].green_first], [2, 1, 2]);
    assert.ok(Number.isInteger(done[0].duration_s));
    writeFileSync(join(p.dir, 'ok.txt'), 'the person decided the rule');
    await untilDone(p, { retry: 'nm-03' });
    assert.deepEqual(p.events().filter((e) => e.ev === 'p1_retry_green').map((e) => e.tool), ['nm-03'], 'once per retry, for the retried tool');
  } finally {
    delete process.env.WORKSHOP_TELEMETRY_DIR;
    rmSync(p.base, { recursive: true, force: true });
  }
});

test('Project 2 (no workshop.project.json): p2_swarm_done, and no p1_retry_green', async () => {
  const p = setup(null);
  try {
    await untilDone(p);
    writeFileSync(join(p.dir, 'ok.txt'), 'fixed');
    await untilDone(p, { retry: 'nm-03' });
    const evs = p.events().map((e) => e.ev);
    assert.ok(evs.includes('p2_swarm_done'));
    assert.ok(!evs.includes('p1_swarm_done') && !evs.includes('p1_retry_green'));
  } finally {
    delete process.env.WORKSHOP_TELEMETRY_DIR;
    rmSync(p.base, { recursive: true, force: true });
  }
});

test('Project 2 funnel: /task-intake, /task-plan and /task-report scripts record p2_intake, p2_plan and p2_report; a local task gets report.md', async () => {
  const { spawnSync } = await import('node:child_process');
  const { fileURLToPath } = await import('node:url');
  const KIT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
  const base = mkdtempSync(join(tmpdir(), 'ws-p2-'));
  try {
    const repo = join(base, 'practice-project');
    mkdirSync(join(repo, 'issues'), { recursive: true });
    writeFileSync(join(repo, 'issues', 'EX-1.json'), JSON.stringify({ id: 'EX-1', title: 'Fix the date filter' }));
    const tel = join(base, 'telemetry');
    mkdirSync(tel);
    writeFileSync(join(tel, 'config.json'), JSON.stringify({ v: 1, enabled: false, expires_at: '2099-01-01T00:00:00.000Z' }));
    const env = { PATH: process.env.PATH, HOME: base, WORKSHOP_TELEMETRY_DIR: tel, WORKSHOP_LANG: 'en', GIT_AUTHOR_NAME: 'a', GIT_AUTHOR_EMAIL: 'a@b', GIT_COMMITTER_NAME: 'a', GIT_COMMITTER_EMAIL: 'a@b' };
    const run = (cmd, ...args) => spawnSync(cmd, args, { cwd: repo, env, encoding: 'utf8' });
    run('git', 'init', '-q');
    run('git', 'add', '-A');
    run('git', 'commit', '-qm', 'init');
    assert.equal(run('node', join(KIT, 'init-workshop.mjs')).status, 0);
    writeFileSync(join(repo, '.workshop', 'plan-proposal.json'), JSON.stringify({ tarefas: [{ id: 'a', agente: 'ws-worker', ficheiros: ['a.js'], teste: ['npm', 'test'], instrucoes: 'Do thing A carefully.' }] }));
    assert.equal(run('node', join(KIT, 'validate-plan.mjs'), '.workshop/plan-proposal.json', '--global-test', '["npm","test"]').status, 0);
    writeFileSync(join(repo, '.workshop', 'task.json'), JSON.stringify({ source: 'local', id: 'EX-1', title: 'Fix the date filter' }));
    assert.equal(run('node', join(KIT, 'publish-text.mjs')).status, 0);
    const evs = readFileSync(join(tel, 'local.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
    assert.deepEqual(evs.map((e) => e.ev), ['p2_intake', 'p2_plan', 'p2_report']);
    assert.equal(evs[0].origin, 'practice');
    assert.ok(evs[1].n_agents >= 1);
    assert.equal(evs[2].destination, 'file');
    assert.ok(existsSync(join(repo, '.workshop', 'report.md')), 'the report of a local task is a file');
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});
