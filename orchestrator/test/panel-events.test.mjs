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
