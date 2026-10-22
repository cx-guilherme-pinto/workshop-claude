// The workshop's chaos, simulated without Claude (D-37): people leave and come back to Claude Code (claude -c),
// work in two terminals, skip steps, do things before registering, go offline, keep yesterday's credential, open
// Claude in another folder. Each scenario runs the kit's real hooks and scripts (hooks/*.mjs, missions/missions.mjs,
// telemetry/ctl.mjs, telemetry/send.mjs) with synthetic hook inputs and transcripts, in a temporary HOME per person,
// against the local panel server, and checks that the panel ends up with what each laptop really did.
// Never the real HOME, never Claude, no cost.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadPricing, requestCost, tokensFromUsage } from '../../hooks/lib/cost.mjs';
import { paths, readConfig, readLines } from '../../telemetry/lib.mjs';
import { register } from '../../telemetry/ctl.mjs';
import { sendQueue } from '../../telemetry/send.mjs';
import { startServer } from '../../panel/server.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
// what runs in this process (register, record) never starts a sender by itself: the tests send with sendQueue, or
// let a hook (a child process with its own environment) start send.mjs
process.env.WORKSHOP_TELEMETRY_NO_SEND = '1';
const PRICING = loadPricing(join(ROOT, 'pricing.json'));
const MODEL = 'claude-sonnet-5-5';
const usage = (i) => ({ input_tokens: 1000 + i, output_tokens: 200 + i, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 });
const costOf = (i, model = MODEL) => requestCost(tokensFromUsage(usage(i)), model, PRICING).usd;

// A laptop: a HOME with the projects folder and the missions project (with .workshop/), and the telemetry config.
function laptop({ registered = false, panel = '' } = {}) {
  const home = mkdtempSync(join(tmpdir(), 'ws-chaos-'));
  const projs = join(home, 'workshop-claude');
  const missions = join(projs, 'missions-project');
  mkdirSync(join(missions, '.workshop'), { recursive: true });
  mkdirSync(join(missions, '.claude'), { recursive: true });
  const tel = join(home, '.workshop-claude', 'telemetry');
  mkdirSync(tel, { recursive: true });
  const cfg = { v: 1, enabled: registered, workshop: 'ws-t', kit: 'v2', panel_url: panel, email_domain: 'checkmarx.com', expires_at: '2099-01-01T00:00:00.000Z', projects_dir: projs, participant: null };
  writeFileSync(join(tel, 'config.json'), JSON.stringify(cfg));
  const env = { PATH: process.env.PATH, HOME: home, USERPROFILE: home, WS_HOME_OVERRIDE: home, WORKSHOP_TELEMETRY_DIR: tel, WORKSHOP_TELEMETRY_NO_SEND: '1', CLAUDE_PROJECT_DIR: missions, WORKSHOP_LANG: 'en' };
  return { home, projs, missions, tel, P: paths(tel), env, cleanup: () => rmSync(home, { recursive: true, force: true }) };
}

// Runs one of the kit's hooks with a hook input on stdin, like Claude Code does.
function hook(l, script, input, extraEnv = {}) {
  const r = spawnSync(process.execPath, [join(ROOT, 'hooks', script)], { input: JSON.stringify(input), env: { ...l.env, ...extraEnv }, encoding: 'utf8', timeout: 20000 });
  assert.equal(r.status, 0, `${script}: ${r.stderr}`);
  return r;
}

// A transcript with assistant messages ids[] (and the user's first prompt), as Claude Code writes it.
function transcript(l, name, ids, { sidechain = false } = {}) {
  const f = join(l.home, `${name}.jsonl`);
  const rows = [{ type: 'user', message: { role: 'user', content: 'hello' }, isSidechain: sidechain, timestamp: '2026-11-20T09:00:00.000Z' }];
  for (const i of ids) rows.push({ type: 'assistant', isSidechain: sidechain, timestamp: '2026-11-20T09:01:00.000Z', message: { id: `msg_${i}`, model: MODEL, usage: usage(i), content: [] } });
  writeFileSync(f, rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
  return f;
}

const costs = (l) => readLines(l.P.local).filter((e) => e.ev === 'cost');
const sum = (list) => Math.round(list.reduce((a, e) => a + e.cost_usd, 0) * 1e6) / 1e6;
const round = (x) => Math.round(x * 1e6) / 1e6;

test('cost: claude -c three times (the history copied into each new session) counts each request once', () => {
  const l = laptop();
  try {
    // session 1: two answers
    hook(l, 'stop.mjs', { session_id: 's1', transcript_path: transcript(l, 's1', [1, 2]), cwd: l.missions });
    // /exit, claude -c: a new session id, the old messages copied, one new answer
    hook(l, 'stop.mjs', { session_id: 's2', transcript_path: transcript(l, 's2', [1, 2, 3]), cwd: l.missions });
    // again, and a Stop with nothing new
    hook(l, 'stop.mjs', { session_id: 's3', transcript_path: transcript(l, 's3', [1, 2, 3, 4]), cwd: l.missions });
    hook(l, 'stop.mjs', { session_id: 's3', transcript_path: transcript(l, 's3', [1, 2, 3, 4]), cwd: l.missions });
    assert.equal(sum(costs(l)), round(costOf(1) + costOf(2) + costOf(3) + costOf(4)));
  } finally {
    l.cleanup();
  }
});

test('cost: a resumed subagent (the same agent transcript, longer) counts its requests once', () => {
  const l = laptop();
  try {
    const a = { session_id: 's1', agent_id: 'ag1', agent_type: 'Explore', cwd: l.missions };
    hook(l, 'subagent-stop.mjs', { ...a, agent_transcript_path: transcript(l, 'ag1', [10, 11], { sidechain: true }) });
    hook(l, 'subagent-stop.mjs', { ...a, agent_transcript_path: transcript(l, 'ag1', [10, 11, 12], { sidechain: true }) });
    assert.equal(sum(costs(l)), round(costOf(10) + costOf(11) + costOf(12)));
  } finally {
    l.cleanup();
  }
});

test('cost: two terminals of the same person at the same time count the shared history once', async () => {
  const l = laptop();
  try {
    const t1 = transcript(l, 't1', [20, 21, 22]);
    const t2 = transcript(l, 't2', [20, 21, 22, 23]);
    const run = (sid, f) =>
      new Promise((ok) => {
        const c = spawnSync(process.execPath, [join(ROOT, 'hooks', 'stop.mjs')], { input: JSON.stringify({ session_id: sid, transcript_path: f, cwd: l.missions }), env: l.env, encoding: 'utf8' });
        ok(c.status);
      });
    await Promise.all([run('a', t1), run('b', t2), run('a', t1), run('b', t2)]);
    assert.equal(sum(costs(l)), round(costOf(20) + costOf(21) + costOf(22) + costOf(23)));
  } finally {
    l.cleanup();
  }
});

// The mission book of a laptop, waiting for the background check (detached, like on a real laptop).
async function book(l, want, ms = 8000) {
  const t0 = Date.now();
  for (;;) {
    const done = Object.keys(JSON.parse(existsSync(l.P.missions) ? readFileSync(l.P.missions, 'utf8') : '{"done":{}}').done || {});
    if (want.every((m) => done.includes(m)) || Date.now() - t0 > ms) return done;
    await new Promise((r) => setTimeout(r, 100));
  }
}
const CHECK = { WORKSHOP_CHECK_EVERY_MS: '1500' };

test('missions: M5 with edits.log written after the hook validates at the next Stop (not only on a new feature)', async () => {
  const l = laptop();
  try {
    // the person writes their PostToolUse hook in settings.local.json: ConfigChange records hook_user and checks
    const local = join(l.missions, '.claude', 'settings.local.json');
    writeFileSync(local, JSON.stringify({ hooks: { PostToolUse: [{ matcher: 'Edit|Write', hooks: [{ type: 'command', command: 'echo edit >> edits.log' }] }] } }));
    hook(l, 'telemetry.mjs', { hook_event_name: 'ConfigChange', session_id: 's1', source: 'local_settings', file_path: local, cwd: l.missions }, CHECK);
    assert.deepEqual(await book(l, ['M5'], 1500), [], 'edits.log is still empty: M5 is not done yet');
    // Claude edits a file: the person's hook writes edits.log (no feature, so no check from that)
    writeFileSync(join(l.missions, 'edits.log'), 'edit\n');
    // the turn ends
    hook(l, 'telemetry.mjs', { hook_event_name: 'Stop', session_id: 's1', cwd: l.missions }, CHECK);
    assert.ok((await book(l, ['M5'])).includes('M5'), 'M5 validated at the Stop');
    assert.equal(readLines(l.P.local).filter((e) => e.ev === 'mission_done' && e.mission === 'M5').length, 1);
  } finally {
    l.cleanup();
  }
});

test('missions: M9 with summary.txt filled after the headless session started validates later, once', async () => {
  const l = laptop();
  try {
    // claude -p starts (headless): the feature is recorded, but summary.txt is not there yet
    hook(l, 'telemetry.mjs', { hook_event_name: 'SessionStart', session_id: 'h1', source: 'startup', cwd: l.missions }, { ...CHECK, CLAUDE_CODE_ENTRYPOINT: 'sdk-cli' });
    assert.deepEqual(await book(l, ['M9'], 1000), []);
    writeFileSync(join(l.missions, 'summary.txt'), 'three lines\n');
    // a Stop right away (inside the 1.5 s window) asks for one delayed check; a second Stop adds nothing
    hook(l, 'telemetry.mjs', { hook_event_name: 'Stop', session_id: 'i1', cwd: l.missions }, CHECK);
    hook(l, 'telemetry.mjs', { hook_event_name: 'Stop', session_id: 'i1', cwd: l.missions }, CHECK);
    assert.ok((await book(l, ['M9'])).includes('M9'));
    // and the next session start does not record it twice
    hook(l, 'telemetry.mjs', { hook_event_name: 'SessionStart', session_id: 'i2', source: 'resume', cwd: l.missions }, CHECK);
    await new Promise((r) => setTimeout(r, 1500));
    assert.equal(readLines(l.P.local).filter((e) => e.ev === 'mission_done' && e.mission === 'M9').length, 1);
  } finally {
    l.cleanup();
  }
});

// The local panel (panel/server.mjs, the same code as the Worker) in a temporary folder.
async function panel() {
  const data = mkdtempSync(join(tmpdir(), 'ws-chaos-panel-'));
  let srv = await startServer({ port: 0, data, ws: 'ws-t', adminToken: 'adm', throttleMs: 20 });
  const port = Number(new URL(srv.url).port);
  const state = async () => (await fetch(`${srv.url}/state`)).json();
  const wipe = async () => (await fetch(`${srv.url}/admin/reset`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Admin-Token': 'adm' }, body: '{}' })).status;
  let up = true;
  return {
    url: srv.url,
    state,
    wipe,
    // the network goes away and comes back: the same panel, the same address, its data kept
    down: async () => (await srv.close(), (up = false)),
    up: async () => ((srv = await startServer({ port, data, ws: 'ws-t', adminToken: 'adm', throttleMs: 20 })), (up = true)),
    close: async () => (up && (await srv.close()), rmSync(data, { recursive: true, force: true })),
  };
}

// A GitHub account as gh would answer it (a fake gh: no network, no token), for ctl.mjs register.
const account = (id, name) => () => ({ id, name, emails: [{ email: `${name.split(' ')[0].toLowerCase()}@checkmarx.com`, verified: true }] });
function fakeGh(l, id, name) {
  const f = join(l.home, 'fake-gh.mjs');
  writeFileSync(f, `#!/usr/bin/env node
const a = process.argv.slice(2).join(' ');
if (a.endsWith('user/emails')) console.log(JSON.stringify([{ email: '${name.split(' ')[0].toLowerCase()}@checkmarx.com', verified: true }]));
else console.log(JSON.stringify({ id: ${id}, login: 'x', name: '${name}' }));
`);
  chmodSync(f, 0o755);
  return f;
}
const mine = async (pn, name) => ((await pn.state()).board.top.find((r) => r.name === name) || {}).missions || [];

test('register: the missions done before registering reach the panel, with the time they were done', async () => {
  const pn = await panel();
  const l = laptop({ panel: pn.url });
  try {
    // M1 (plan mode) before registering: only the local book has it
    hook(l, 'telemetry.mjs', { hook_event_name: 'UserPromptSubmit', session_id: 's1', permission_mode: 'plan', cwd: l.missions }, CHECK);
    await book(l, ['M1']);
    const at = readLines(l.P.local).find((e) => e.ev === 'mission_done').t;
    assert.equal(readLines(l.P.queue).length, 0, 'nothing queued before registering');
    // now the person registers (the setup's step 8, or ctl.mjs register later)
    assert.equal(await register(undefined, { P: l.P, print: () => {}, account: account(11, 'Ana Silva') }), 0);
    await sendQueue({ P: l.P });
    assert.deepEqual(await mine(pn, 'Ana Silva'), ['M1']);
    const first = (await pn.state()).feed.find((f) => /M1/.test(JSON.stringify(f)));
    assert.equal(first?.t, at, 'with the time it was done, not the time of the registration');
    // a register --again later replays the same events: the panel does not count them twice
    assert.equal(await register(undefined, { P: l.P, print: () => {}, account: account(11, 'Ana Silva'), again: true }), 0);
    await sendQueue({ P: l.P });
    const row = (await pn.state()).board.top.find((r) => r.name === 'Ana Silva');
    assert.deepEqual(row.missions, ['M1']);
    assert.equal((await pn.state()).board.people, 1);
  } finally {
    l.cleanup();
    await pn.close();
  }
});

test('midnight wipe: the old credential gets a 401, the next hook registers again by itself and today goes back', async () => {
  const pn = await panel();
  const l = laptop({ panel: pn.url });
  try {
    assert.equal(await register(undefined, { P: l.P, print: () => {}, account: account(12, 'Rui Costa') }), 0);
    hook(l, 'telemetry.mjs', { hook_event_name: 'UserPromptSubmit', session_id: 's1', permission_mode: 'plan', cwd: l.missions }, CHECK);
    await book(l, ['M1']);
    await sendQueue({ P: l.P });
    assert.deepEqual(await mine(pn, 'Rui Costa'), ['M1']);
    // midnight: the panel deletes everything (the admin reset does the same)
    assert.equal(await pn.wipe(), 200);
    // the next mission: the sender gets a 401
    hook(l, 'telemetry.mjs', { hook_event_name: 'SessionStart', session_id: 's2', source: 'startup', model: 'claude-haiku-5-5', cwd: l.missions }, CHECK);
    await book(l, ['M2']);
    await sendQueue({ P: l.P });
    let cfg = JSON.parse(readFileSync(l.P.config, 'utf8'));
    assert.deepEqual([cfg.enabled, cfg.participant, typeof cfg.needs_register], [true, null, 'string'], 'not silently off');
    // the next hook (any) registers again in the background, with gh, asking nothing
    const gh = fakeGh(l, 12, 'Rui Costa');
    hook(l, 'telemetry.mjs', { hook_event_name: 'Stop', session_id: 's2', cwd: l.missions }, { ...CHECK, WORKSHOP_GH: gh, WORKSHOP_TELEMETRY_REREGISTER: '1' });
    for (let i = 0; i < 80 && !cfg.participant; i++) {
      await new Promise((r) => setTimeout(r, 100));
      cfg = JSON.parse(readFileSync(l.P.config, 'utf8'));
    }
    assert.ok(cfg.participant?.p, 'registered again');
    assert.equal(cfg.needs_register, undefined);
    await sendQueue({ P: l.P });
    assert.deepEqual(await mine(pn, 'Rui Costa'), ['M1', 'M2'], "today's missions are back on the panel");
  } finally {
    l.cleanup();
    await pn.close();
  }
});

test('unregister wins: a 401 after the person left the panel never registers them again', async () => {
  const l = laptop({ panel: 'http://127.0.0.1:9' });
  try {
    const cfg = JSON.parse(readFileSync(l.P.config, 'utf8'));
    writeFileSync(l.P.config, JSON.stringify({ ...cfg, needs_register: '2026-11-20T00:00:00.000Z', unregistered_at: '2026-11-20T10:00:00.000Z' }));
    const gh = fakeGh(l, 13, 'Eva Lopes');
    hook(l, 'telemetry.mjs', { hook_event_name: 'Stop', session_id: 's1', cwd: l.missions }, { WORKSHOP_GH: gh, WORKSHOP_TELEMETRY_REREGISTER: '1' });
    await new Promise((r) => setTimeout(r, 800));
    assert.equal(existsSync(l.P.registerStamp), false, 'no registration was even tried');
    assert.equal(JSON.parse(readFileSync(l.P.config, 'utf8')).participant, null);
  } finally {
    l.cleanup();
  }
});

test('another folder: Claude opened outside the workshop records nothing, and the statusline and /missions say why', () => {
  const l = laptop();
  try {
    const elsewhere = join(l.home, 'Documents', 'my-app');
    mkdirSync(elsewhere, { recursive: true });
    const env = { CLAUDE_PROJECT_DIR: elsewhere };
    hook(l, 'telemetry.mjs', { hook_event_name: 'UserPromptSubmit', session_id: 'x1', permission_mode: 'plan', cwd: elsewhere }, env);
    hook(l, 'stop.mjs', { session_id: 'x1', transcript_path: transcript(l, 'x1', [40]), cwd: elsewhere }, env);
    assert.equal(readLines(l.P.local).length, 0, 'nothing recorded outside the workshop');
    const sl = spawnSync(process.execPath, [join(ROOT, 'statusline', 'statusline.mjs')], { input: JSON.stringify({ model: { display_name: 'Sonnet 5.5' }, workspace: { project_dir: elsewhere } }), env: { ...l.env, ...env }, encoding: 'utf8' }).stdout;
    assert.match(sl, /outside the workshop$/);
    const st = spawnSync(process.execPath, [join(ROOT, 'missions', 'missions.mjs'), 'status'], { cwd: elsewhere, env: { ...l.env, ...env, WORKSHOP_TELEMETRY_NO_CHECK: '1' }, encoding: 'utf8' }).stdout;
    assert.match(st.split('\n')[0], /outside the workshop folder/);
    assert.ok(st.includes(l.projs), 'it names the folder to open Claude in');
  } finally {
    l.cleanup();
  }
});

test('/missions says why the next mission has not counted yet (M5: the hook is there, edits.log is empty)', () => {
  const l = laptop();
  try {
    // M1 to M4 done, so M5 is the next one
    writeFileSync(l.P.missions, JSON.stringify({ v: 1, done: { M1: 'x', M2: 'x', M3: 'x', M4: 'x' } }));
    const status = () => spawnSync(process.execPath, [join(ROOT, 'missions', 'missions.mjs'), 'status'], { cwd: l.missions, env: { ...l.env, WORKSHOP_TELEMETRY_NO_CHECK: '1' }, encoding: 'utf8' }).stdout;
    assert.match(status(), /Next: M5[\s\S]*Still missing: your PostToolUse hook is not in \.claude\/settings\.local\.json yet/);
    writeFileSync(join(l.missions, '.claude', 'settings.local.json'), JSON.stringify({ hooks: { PostToolUse: [{ hooks: [{ type: 'command', command: 'echo x >> edits.log' }] }] } }));
    assert.match(status(), /Still missing: edits\.log is still empty: ask Claude for an edit/);
    writeFileSync(join(l.missions, 'edits.log'), 'x\n');
    assert.match(status(), /✔ M5/, 'and /missions itself checks: M5 is done');
  } finally {
    l.cleanup();
  }
});

test('offline for a block, then the network: the queue leaves at the next hook by itself, with nothing new to record', async () => {
  const pn = await panel();
  const l = laptop({ panel: pn.url });
  try {
    assert.equal(await register(undefined, { P: l.P, print: () => {}, account: account(14, 'Inês Rocha') }), 0);
    await sendQueue({ P: l.P });
    // the network goes away: M1 waits in the queue
    await pn.down();
    hook(l, 'telemetry.mjs', { hook_event_name: 'UserPromptSubmit', session_id: 's1', permission_mode: 'plan', cwd: l.missions }, CHECK);
    await book(l, ['M1']);
    assert.equal((await sendQueue({ P: l.P })).sent, 0);
    assert.ok(readLines(l.P.queue).length + readLines(l.P.sending).length > 0, 'it waits');
    // the network is back; the person only opens Claude again (a hook with nothing new to record)
    await pn.up();
    rmSync(l.P.sendStamp, { force: true });
    hook(l, 'telemetry.mjs', { hook_event_name: 'SessionStart', session_id: 's2', source: 'resume', cwd: l.missions }, { WORKSHOP_TELEMETRY_NO_SEND: '', WORKSHOP_TELEMETRY_NO_CHECK: '1' });
    let got = [];
    for (let i = 0; i < 60 && !got.includes('M1'); i++) {
      await new Promise((r) => setTimeout(r, 100));
      got = await mine(pn, 'Inês Rocha');
    }
    assert.deepEqual(got, ['M1']);
  } finally {
    l.cleanup();
    await pn.close();
  }
});

test('429: the sender keeps the rest and nobody kicks it again before Retry-After', async () => {
  const l = laptop({ panel: 'http://127.0.0.1:9' });
  try {
    const cfg = JSON.parse(readFileSync(l.P.config, 'utf8'));
    writeFileSync(l.P.config, JSON.stringify({ ...cfg, enabled: true, participant: { p: 'a'.repeat(32), credential: 'c', name: 'Ana' } }));
    const e = (i) => ({ v: 1, ws: 'ws-t', p: 'a'.repeat(32), ev: 'feature', name: 'plan_mode', t: `2026-11-20T09:00:0${i}.000Z`, kit: 'v2' });
    writeFileSync(l.P.queue, [1, 2, 3].map((i) => JSON.stringify(e(i))).join('\n') + '\n');
    const r = await sendQueue({ P: l.P, fetchImpl: async () => new Response(JSON.stringify({ processed: 1 }), { status: 429, headers: { 'Retry-After': '30' } }) });
    assert.deepEqual(r, { sent: 1, left: 2 });
    const until = Number(readFileSync(l.P.retryAt, 'utf8'));
    assert.ok(until > Date.now() + 25000 && until <= Date.now() + 30000);
    const { kickSender } = await import('../../telemetry/lib.mjs');
    rmSync(l.P.sendStamp, { force: true });
    assert.equal(kickSender(l.P, readConfig(l.P), { ...l.env, WORKSHOP_TELEMETRY_NO_SEND: '' }), false, 'not before Retry-After');
    writeFileSync(l.P.retryAt, String(Date.now() - 1));
    const ok = await sendQueue({ P: l.P, fetchImpl: async () => new Response(null, { status: 204 }) });
    assert.deepEqual(ok, { sent: 2, left: 0 });
    assert.equal(existsSync(l.P.retryAt), false);
  } finally {
    l.cleanup();
  }
});

test('auto view: the panel follows the block where most active people are; a forced view wins until key 0', async () => {
  const pn = await panel();
  try {
    const now = Date.now();
    const iso = (s) => new Date(now - s * 1000).toISOString();
    const people = [];
    for (const [i, name] of ['Ana', 'Rui', 'Eva'].entries()) {
      const r = await (await fetch(`${pn.url}/admin/register`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Admin-Token': 'adm' }, body: JSON.stringify({ name }) })).json();
      people.push({ ...r, i });
    }
    const send = (who, list) => fetch(`${pn.url}/e`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Workshop-Code': 'ws-t', 'X-Participant': `${who.p}.${who.credential}` }, body: JSON.stringify(list.map((e) => ({ v: 1, ws: 'ws-t', p: who.p, kit: 'v2', ...e }))) });
    const view = async () => {
      const s = await pn.state();
      return [s.phase, s.phase_mode];
    };
    const phase = (body, token = 'adm') => fetch(`${pn.url}/admin/phase`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { 'X-Admin-Token': token } : {}) }, body: JSON.stringify(body) });
    assert.deepEqual(await (await fetch(`${pn.url}/health`)).json(), { ok: true, build: 'dev' }, '/health says which build answers');
    assert.deepEqual(await view(), ['opening', 'auto'], 'nobody did anything yet: the opening, in auto');
    // everybody does missions
    for (const w of people) await send(w, [{ ev: 'mission_done', mission: 'M1', t: iso(300) }]);
    assert.deepEqual(await view(), ['missions', 'auto']);
    // two of three start Project 1 (one skipped ahead): the view follows the majority
    await send(people[0], [{ ev: 'p1_plan', parallel: 4, model: 'sonnet', forecast_min: 5, tasks: 6, t: iso(120) }]);
    assert.deepEqual(await view(), ['missions', 'auto'], 'one person ahead does not move the room');
    await send(people[1], [{ ev: 'cost', cost_usd: 0.1, model: 'sonnet', block: 'p1', t: iso(60) }]);
    assert.deepEqual(await view(), ['p1', 'auto']);
    // the presenter forces the missions view (key 2) without the token: refused; with it: forced
    assert.equal((await phase({ phase: 'missions' }, '')).status, 403);
    assert.equal((await phase({ phase: 'missions' })).status, 200);
    assert.deepEqual(await view(), ['missions', 'forced']);
    // key 0: back to auto
    assert.equal((await phase({ phase: 'auto' })).status, 200);
    assert.deepEqual(await view(), ['p1', 'auto']);
    assert.equal((await phase({ phase: 'nonsense' })).status, 400);
  } finally {
    await pn.close();
  }
});

export { laptop, hook, transcript, costs, sum, book, panel, account, ROOT };
void cpSync;
