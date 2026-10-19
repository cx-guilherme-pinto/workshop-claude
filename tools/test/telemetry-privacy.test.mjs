// Privacy of the workshop telemetry (docs/pt/WORKSHOP-V2-SPEC.md, section 6.6, point 8): the telemetry hook is
// fed the real hook inputs of Claude Code 2.1.292 (hook-inputs-2.1.292.json, recorded in the Phase 0 spike) with a
// marker in every free-text value (prompts, paths, cwd, transcript_path, tool_input, tool_response, ids), in a
// workshop project whose settings.local.json also carries markers. No marker may reach local.jsonl, queue.jsonl,
// seen.json or missions.json. Also: the hook exits with 0, prints nothing and stays within the time budget.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { handle } from '../../hooks/telemetry.mjs';
import { paths, record } from '../../telemetry/lib.mjs';
import { emit, parseFields } from '../../telemetry/emit.mjs';
import { checkIncoming, sanitize } from '../../telemetry/schema.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const HOOK = join(ROOT, 'hooks', 'telemetry.mjs');
const CASES = JSON.parse(readFileSync(join(ROOT, 'tools', 'test', 'hook-inputs-2.1.292.json'), 'utf8')).cases;
const ALLOW = JSON.parse(readFileSync(join(ROOT, 'telemetry', 'allowlist.json'), 'utf8'));
const MARK = 'ZQX-PRIVATE';

function setup({ enabled = true } = {}) {
  const base = mkdtempSync(join(tmpdir(), 'ws-tel-'));
  const dir = join(base, 'telemetry');
  const projs = join(base, 'workshop-claude');
  const proj = join(projs, 'missions-project');
  mkdirSync(join(proj, '.claude'), { recursive: true });
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, 'config.json'),
    JSON.stringify({ v: 1, enabled, room: 'A', workshop: 'ws-test', kit: 'v9.9.9', expires_at: '2099-01-01T00:00:00.000Z', projects_dir: projs }),
  );
  // the person's own hook and statusline, with private text in the commands
  writeFileSync(
    join(proj, '.claude', 'settings.local.json'),
    JSON.stringify({
      statusLine: { type: 'command', command: `echo ${MARK}-statusline` },
      hooks: { PostToolUse: [{ matcher: 'Edit|Write', hooks: [{ type: 'command', command: `echo ${MARK}-hook >> edits.log` }] }] },
    }),
  );
  return { base, dir, proj, P: paths(dir) };
}

// Every MARKnnnn and every string that is not an enum the hook reads gets the marker; paths point into the project.
function marked(input, proj, n) {
  const s = JSON.stringify(input).replace(/MARK\d{4}/g, () => `${MARK}-${n++}`);
  const o = JSON.parse(s);
  if (o.hook_event_name === 'ConfigChange') o.file_path = join(proj, '.claude', 'settings.local.json');
  o.cwd = proj;
  return o;
}

function everyFile(dir) {
  return readdirSync(dir)
    .map((f) => readFileSync(join(dir, f), 'utf8'))
    .join('\n');
}

test('no free text of any recorded hook input reaches the telemetry files (realistic enum values)', () => {
  const t = setup();
  try {
    let n = 0;
    const features = [];
    for (const c of CASES) {
      const input = marked(c.input, t.proj, (n += 100));
      features.push(...handle(input, { env: { ...c.env, CLAUDE_PROJECT_DIR: t.proj }, P: t.P }).map((f) => f.name));
    }
    // the inputs do show features (so the test covers the paths that write)
    for (const f of ['plan_mode', 'subagent', 'skill_user', 'loop', 'memory_write', 'model_switch', 'hook_user', 'statusline_user', 'headless']) {
      assert.ok(features.includes(f), `feature ${f} not seen`);
    }
    const all = everyFile(t.dir);
    assert.ok(!all.includes(MARK), 'a marker reached the telemetry files');
    assert.ok(!all.includes(t.proj), 'the project path reached a telemetry file other than config.json');
  } catch (e) {
    throw e;
  } finally {
    rmSync(t.base, { recursive: true, force: true });
  }
});

test('with every string value replaced by a marker (enums too), nothing private is written', () => {
  const t = setup();
  try {
    let n = 0;
    const deep = (v) =>
      Array.isArray(v) ? v.map(deep) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, k === 'hook_event_name' ? x : deep(x)])) : typeof v === 'string' ? `${MARK}-${n++}` : v;
    for (const c of CASES) handle({ ...deep(c.input), cwd: t.proj }, { env: { CLAUDE_PROJECT_DIR: t.proj }, P: t.P });
    assert.ok(!everyFile(t.dir).includes(MARK));
  } finally {
    rmSync(t.base, { recursive: true, force: true });
  }
});

test('outside the workshop projects the hook records nothing', () => {
  const t = setup();
  try {
    const other = mkdtempSync(join(tmpdir(), 'ws-other-'));
    for (const c of CASES) handle({ ...c.input, cwd: other }, { env: { ...c.env, CLAUDE_PROJECT_DIR: other }, P: t.P });
    assert.deepEqual(readdirSync(t.dir).sort(), ['config.json']);
    rmSync(other, { recursive: true, force: true });
  } finally {
    rmSync(t.base, { recursive: true, force: true });
  }
});

test('emit and record keep only the allowlisted fields and values', () => {
  const t = setup();
  try {
    record('p2_intake', { origin: 'own', issue: `${MARK}-REAL-123`, url: `https://${MARK}` }, { P: t.P });
    record('p1_plan', { parallel: 8, model: 'haiku', forecast_min: null, tasks: 31, prompt: MARK }, { P: t.P });
    record('feature', { name: 'loop', extra: MARK }, { local: { family: MARK, project: 'p1' }, P: t.P });
    assert.throws(() => record(`${MARK}_event`, {}, { P: t.P }));
    assert.deepEqual(emit(`${MARK}_event`, {}, { P: t.P }), { recorded: false, queued: false });
    assert.deepEqual(parseFields(['n_agents=4', 'forecast_min=null', 'x', 'name=loop']), { n_agents: 4, forecast_min: null, name: 'loop' });
    const all = everyFile(t.dir);
    assert.ok(!all.includes(MARK));
    const q = readFileSync(t.P.queue, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
    assert.deepEqual(q[0], { v: 1, ws: 'ws-test', room: 'A', p: q[0].p, ev: 'p2_intake', t: q[0].t, kit: 'v9.9.9', origin: 'own' });
    assert.match(q[0].p, /^[0-9a-f]{32}$/);
    assert.equal(q[1].parallel, 8);
    assert.equal(q[1].forecast_min, null);
    // local fields never go in the queue
    assert.ok(!('local' in q[2]) && !('project' in q[2]));
    for (const e of q) assert.ok(JSON.stringify(e).length <= 512);
  } finally {
    rmSync(t.base, { recursive: true, force: true });
  }
});

test('participation off: the local book is written, the queue never; tests_run never goes in the queue', () => {
  const t = setup({ enabled: false });
  try {
    record('feature', { name: 'loop' }, { P: t.P });
    record('mission_done', { mission: 'M6' }, { P: t.P });
    assert.equal(readFileSync(t.P.local, 'utf8').trim().split('\n').length, 2);
    assert.throws(() => readFileSync(t.P.queue));
    const on = setup({ enabled: true });
    record('tests_run', { green: 6, red: 2 }, { P: on.P });
    assert.throws(() => readFileSync(on.P.queue));
    assert.match(readFileSync(on.P.local, 'utf8'), /"tests_run","green":6,"red":2/);
    rmSync(on.base, { recursive: true, force: true });
  } finally {
    rmSync(t.base, { recursive: true, force: true });
  }
});

test('past expires_at nothing is recorded', () => {
  const t = setup();
  try {
    const cfg = JSON.parse(readFileSync(t.P.config, 'utf8'));
    writeFileSync(t.P.config, JSON.stringify({ ...cfg, expires_at: '2020-01-01T00:00:00.000Z' }));
    for (const c of CASES) handle({ ...c.input, cwd: t.proj }, { env: { ...c.env, CLAUDE_PROJECT_DIR: t.proj }, P: t.P });
    assert.deepEqual(record('feature', { name: 'loop' }, { P: t.P }), { recorded: false, queued: false });
    assert.deepEqual(readdirSync(t.dir).sort(), ['config.json']);
  } finally {
    rmSync(t.base, { recursive: true, force: true });
  }
});

test('the server-side check refuses events outside the allowlist', () => {
  const ok = { v: 1, ws: 'ws-test', room: 'B', p: 'a'.repeat(32), ev: 'feature', t: '2026-10-19T10:00:00.000Z', kit: 'v1', name: 'loop' };
  assert.deepEqual(checkIncoming(ALLOW, ok, 'ws-test'), ok);
  assert.equal(checkIncoming(ALLOW, { ...ok, ws: 'other' }, 'ws-test'), null);
  assert.equal(checkIncoming(ALLOW, { ...ok, prompt: 'x' }, 'ws-test'), null);
  assert.equal(checkIncoming(ALLOW, { ...ok, name: 'not_a_feature' }, 'ws-test'), null);
  assert.equal(checkIncoming(ALLOW, { ...ok, ev: 'tests_run', green: 1, red: 0, name: undefined }, 'ws-test'), null);
  assert.equal(checkIncoming(ALLOW, { ...ok, room: 'C' }, 'ws-test'), null);
  assert.equal(checkIncoming(ALLOW, { ...ok, p: 'Ana' }, 'ws-test'), null);
  assert.deepEqual(sanitize(ALLOW, 'cost', { cost_usd: 0.123456789, model: 'sonnet', block: 'p1' }).fields, { cost_usd: 0.123457, model: 'sonnet', block: 'p1' });
  assert.deepEqual(sanitize(ALLOW, 'cost', { cost_usd: -1, model: 'gpt', block: 'x' }).fields, {});
});

test('the hook process exits with 0, prints nothing and is fast (p95 ≤ 300 ms), even with bad input', () => {
  const t = setup();
  try {
    const env = { PATH: process.env.PATH, WORKSHOP_TELEMETRY_DIR: t.dir, WORKSHOP_TELEMETRY_NO_CHECK: '1', CLAUDE_PROJECT_DIR: t.proj };
    const times = [];
    const inputs = [...CASES.map((c) => JSON.stringify(marked(c.input, t.proj, 9000))), 'not json', '', '{"hook_event_name":"UserPromptSubmit"'];
    for (const i of inputs) {
      const t0 = process.hrtime.bigint();
      const r = spawnSync(process.execPath, [HOOK], { input: i, env, encoding: 'utf8', timeout: 5000 });
      times.push(Number(process.hrtime.bigint() - t0) / 1e6);
      assert.equal(r.status, 0);
      assert.equal(r.stdout, '');
    }
    times.sort((a, b) => a - b);
    const p95 = times[Math.floor(times.length * 0.95)];
    assert.ok(p95 <= 300, `p95 ${p95.toFixed(0)} ms`);
    assert.ok(!everyFile(t.dir).includes(MARK));
  } finally {
    rmSync(t.base, { recursive: true, force: true });
  }
});
