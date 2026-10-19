// The live panel (docs/pt/WORKSHOP-V2-SPEC.md, sections 6.3 to 6.5): the aggregate's metrics, the API (allowlist,
// workshop code, batch and body limits, duplicates, rate limit, admin, snapshot), the SSE stream, the local server
// with the sender (offline queue, no duplicates), the Durable Object's SQLite store and a 250-person load.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { Aggregate, MISSIONS, ACTIVE_MS } from '../../panel/aggregate.mjs';
import { createApi, RATE_PER_MIN } from '../../panel/api.mjs';
import { memoryStore } from '../../panel/store-file.mjs';
import { startServer } from '../../panel/server.mjs';
import { simulate } from '../../panel/simulate.mjs';
import { sqlStore, PanelRoom, default as worker } from '../../panel/worker/index.mjs';
import { sendQueue } from '../../telemetry/send.mjs';
import { paths, readLines, record } from '../../telemetry/lib.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const ALLOW = JSON.parse(readFileSync(join(ROOT, 'telemetry', 'allowlist.json'), 'utf8'));
const T0 = Date.parse('2026-11-20T09:00:00.000Z');
const id = (n) => n.toString(16).padStart(32, '0');
const at = (min) => new Date(T0 + min * 60000).toISOString();
const ev = (n, room, ev, min, f = {}) => ({ v: 1, ws: 'ws-t', room, p: id(n), ev, t: at(min), kit: 'v2', ...f });

test('MISSIONS is the list of validated missions of missions/rules.json', () => {
  const rules = JSON.parse(readFileSync(join(ROOT, 'missions', 'rules.json'), 'utf8'));
  assert.deepEqual(MISSIONS, rules.missions.filter((m) => m.validated !== false).map((m) => m.id));
});

test('aggregate: every metric of spec 6.3, per room and for both', () => {
  const a = new Aggregate({ ws: 'ws-t' });
  const list = [
    ev(1, 'A', 'register', 0, { name: 'Ana Silva' }),
    ev(2, 'A', 'register', 0, { name: 'Rui Costa' }),
    ev(1, 'A', 'join', 0, { lang: 'pt', os: 'mac' }),
    ev(1, 'A', 'check_ok', 1),
    ev(2, 'A', 'join', 0, { lang: 'en', os: 'win' }),
    ev(3, 'B', 'join', 0, { lang: 'pt', os: 'mac' }),
    ev(3, 'B', 'check_ok', 2),
    ev(1, 'A', 'mission_done', 10, { mission: 'M1' }),
    ev(1, 'A', 'mission_done', 10.5, { mission: 'M1' }),
    ev(2, 'A', 'mission_done', 11, { mission: 'M1' }),
    ev(2, 'A', 'mission_done', 12, { mission: 'M2' }),
    ev(1, 'A', 'cost', 20, { cost_usd: 0.5, model: 'sonnet', block: 'missions' }),
    ev(1, 'A', 'cost', 30, { cost_usd: 1, model: 'haiku', block: 'p1' }),
    ev(2, 'A', 'cost', 30, { cost_usd: 0.5, model: 'sonnet', block: 'p1' }),
    ev(1, 'A', 'p1_tool_created', 26, { tool_template: 'calc' }),
    ev(1, 'A', 'p1_plan', 31, { parallel: 8, model: 'haiku', forecast_min: 5, tasks: 31 }),
    ev(2, 'A', 'p1_plan', 31, { parallel: 12, model: 'sonnet', forecast_min: null, tasks: 31 }),
    ev(1, 'A', 'p1_swarm_done', 35, { duration_s: 240, green: 28, red: 3, green_first: 27 }),
    ev(2, 'A', 'p1_swarm_done', 34, { duration_s: 180, green: 31, red: 0, green_first: 29 }),
    ev(1, 'A', 'p1_retry_green', 40, { tool: 'nm-03' }),
    ev(1, 'A', 'p1_gate', 44, { verdict: 'APPROVED' }),
    ev(3, 'B', 'p2_intake', 50, { origin: 'practice', issue: 'EX-1' }),
    ev(3, 'B', 'p2_plan', 55, { n_agents: 4 }),
    ev(1, 'A', 'p2_intake', 50, { origin: 'practice', issue: 'EX-1' }),
    ev(1, 'A', 'p2_plan', 55, { n_agents: 4 }),
    ev(1, 'A', 'p2_swarm_done', 65, { duration_s: 200, green: 4, red: 0, green_first: 4 }),
    ev(1, 'A', 'p2_gate', 72, { verdict: 'APPROVED' }),
    ev(1, 'A', 'p2_report', 78, { destination: 'file' }),
  ];
  for (const e of list) a.apply(e);
  const now = T0 + 80 * 60000;
  const s = a.state(now);
  const A = s.rooms.A;
  const B = s.rooms.B;
  assert.equal(A.people, 2);
  assert.equal(A.ready, 1);
  assert.equal(A.active, 1, 'events in the last 10 min (person 2 went quiet after the swarm)');
  assert.equal(a.state(now + ACTIVE_MS + 60000).rooms.A.active, 0);
  assert.equal(A.cost_avg_usd, 1);
  assert.deepEqual([A.missions.M1.done, A.missions.M1.pct, A.missions.M2.pct], [2, 100, 50]);
  assert.equal(A.least_done, 'M3');
  assert.equal(A.coverage_avg, 0.167);
  assert.deepEqual(A.p1.points.sort((x, y) => x.duration_s - y.duration_s), [
    { duration_s: 180, cost_usd: 0.5, parallel: 12, model: 'sonnet' },
    { duration_s: 240, cost_usd: 1, parallel: 8, model: 'haiku' },
  ]);
  assert.equal(A.p1.forecast_median_min, 5);
  assert.equal(A.p1.actual_median_min, 3.5);
  assert.deepEqual([A.p1.specs_fixed, A.p1.swarm_done, A.p1.tools_invented, A.p1.gates_approved], [1, 2, 1, 1]);
  assert.deepEqual(A.p2.funnel, { intake: 0, plan: 0, swarm: 0, gate: 0, report: 1 });
  assert.deepEqual(A.p2.agents_hist, { 4: 1 });
  assert.deepEqual(s.rooms.all.p2.agents_hist, { 4: 2 });
  assert.equal(A.p2.closed, 1);
  assert.equal(A.closing.cost_per_green_usd, round4(1.5 / 63));
  assert.equal(A.closing.green_first_pct, Math.round((100 * 60) / 66));
  assert.equal(A.closing.haiku_pct, 50);
  assert.equal(A.closing.agents_launched, 31 + 31 + 4);
  assert.equal(B.people, 1);
  assert.deepEqual(B.p2.funnel.plan, 1);
  assert.equal(s.rooms.all.people, 3);
  // the feed: the first of each room, never a ranking; a hidden nickname is not shown
  assert.deepEqual(s.feed.map((f) => [f.room, f.kind, f.mission ?? f.project ?? null, f.name]), [
    ['A', 'mission', 'M1', 'Ana Silva'],
    ['A', 'mission', 'M2', 'Rui Costa'],
    ['A', 'tool', null, 'Ana Silva'],
    ['A', 'swarm', 'p1', 'Ana Silva'],
    ['A', 'report', null, 'Ana Silva'],
  ]);
  // the leaderboard (D-34): registered people by points (coverage and quality), ties by who got there first
  assert.deepEqual(s.board.all.top.map((r) => [r.rank, r.name, r.room, r.points, r.missions.join(','), r.p1, r.p2]), [
    [1, 'Ana Silva', 'A', 1 + 1 + 1 + 2 + 1 + 2 + 1, 'M1', 'approved', 'report'],
    [2, 'Rui Costa', 'A', 2 + 1, 'M1,M2', 'swarm', null],
  ]);
  assert.equal(s.board.all.people, 2, 'person 3 never registered: not on the board');
  assert.deepEqual(s.registrations.all, { people: 2, ready: 1, recent: [{ name: 'Rui Costa', room: 'A' }, { name: 'Ana Silva', room: 'A' }] });
  assert.deepEqual(s.registrations.B, { people: 0, ready: 0, recent: [] }, 'person 3 is ready but not registered');
  assert.deepEqual(s.feed_rooms.B, []);
  assert.equal(s.feed_rooms.A.length, 5);
  assert.equal(s.board.B.people, 0);
  a.hide('Ana Silva');
  const hidden = a.state(now);
  assert.ok(hidden.feed.every((f) => f.name !== 'Ana Silva'));
  assert.equal(hidden.board.all.top[0].name, null, 'hidden: still ranked, without the name');
  // no person ids in the state
  assert.ok(!JSON.stringify(a.state(now)).includes(id(1)) && !JSON.stringify(a.state(now)).includes(id(2)));
  // snapshot round trip
  assert.deepEqual(Aggregate.fromJSON(JSON.parse(JSON.stringify(a))).state(now), a.state(now));
});

function round4(x) {
  return Math.round(x * 1e4) / 1e4;
}

async function api(opts = {}) {
  const store = opts.store || memoryStore();
  let t = T0 + 60 * 60000;
  const x = await createApi({ allow: ALLOW, wsCode: 'ws-t', adminToken: 'adm-secret', store, now: () => t, throttleMs: 20, ...opts });
  return { x, store, tick: (ms) => (t += ms) };
}
// A registered person: the credential comes from /admin/register (the GitHub registration has its own test).
const creds = new Map();
async function reg(x, n, room = 'A', name = `Pessoa ${n}`) {
  const r = await (await x.fetch(new Request('http://p/admin/register', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Admin-Token': 'adm-secret' }, body: JSON.stringify({ p: id(n), room, name }) }))).json();
  creds.set(id(n), r.credential);
  return `${id(n)}.${r.credential}`;
}
const who = (body) => {
  const first = Array.isArray(body) ? body.find((e) => e && typeof e === 'object') : null;
  return first?.p && creds.has(first.p) ? { 'X-Participant': `${first.p}.${creds.get(first.p)}` } : {};
};
const post = (x, body, h = {}) => x.fetch(new Request('http://p/e', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Workshop-Code': 'ws-t', ...who(body), ...h }, body: typeof body === 'string' ? body : JSON.stringify(body) }));
const get = async (x, path) => (await x.fetch(new Request(`http://p${path}`))).json();
const admin = (x, what, body, token = 'adm-secret') => x.fetch(new Request(`http://p/admin/${what}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { 'X-Admin-Token': token } : {}) }, body: JSON.stringify(body) }));

test('API: workshop code, participant credential, allowlist, limits, duplicates and the rate limit', async () => {
  const { x, store } = await api();
  try {
    for (const n of [1, 2, 3]) await reg(x, n, n === 3 ? 'B' : 'A');
    const regs = store.rows.length;
    assert.equal((await post(x, [ev(1, 'A', 'check_ok', 0)], { 'X-Participant': '' })).status, 401, 'no credential');
    assert.equal((await post(x, [ev(1, 'A', 'check_ok', 0)], { 'X-Participant': `${id(1)}.${'0'.repeat(64)}` })).status, 401, 'a forged credential');
    assert.equal((await post(x, [ev(2, 'A', 'check_ok', 0)], { 'X-Participant': `${id(1)}.${creds.get(id(1))}` })).status, 204);
    assert.equal(store.rows.length, regs, "someone else's events are dropped");
    assert.equal((await post(x, [ev(1, 'A', 'join', 0, { lang: 'pt', os: 'mac' })], { 'X-Workshop-Code': 'other' })).status, 403);
    const good = ev(1, 'A', 'mission_done', 10, { mission: 'M1' });
    const bad = [{ ...good, prompt: 'secret' }, { ...good, ev: 'tests_run', green: 1, red: 0 }, { ...good, ws: 'other' }, { ...good, mission: 'M99' }, 'x', null];
    assert.equal((await post(x, [good, ...bad])).status, 204);
    assert.equal(store.rows.length, regs + 1, 'only the valid event is stored');
    assert.equal((await post(x, [good])).status, 204);
    assert.equal(store.rows.length, regs + 1, 'a duplicate (a sender retry) is ignored');
    assert.equal((await get(x, '/state')).rooms.A.missions.M1.done, 1);
    assert.equal((await post(x, Array.from({ length: 51 }, (_, i) => ev(2, 'A', 'cost', i, { cost_usd: 0.01, model: 'haiku', block: 'p1' })))).status, 413);
    const ana = { 'X-Participant': `${id(1)}.${creds.get(id(1))}` };
    assert.equal((await post(x, 'x'.repeat(70000), ana)).status, 413);
    assert.equal((await post(x, '{not json', ana)).status, 400);
    // 120 events per minute per participant: the 121st stops the batch and says how many were processed
    let processed = 0;
    for (let b = 0; b < 3; b++) {
      const r = await post(x, Array.from({ length: 50 }, (_, i) => ev(3, 'B', 'cost', b + i / 100, { cost_usd: 0.001, model: 'haiku', block: 'p1' })));
      if (r.status === 429) {
        processed = (await r.json()).processed;
        break;
      }
    }
    assert.equal(processed, RATE_PER_MIN - 100);
  } finally {
    x.close();
  }
});

test('API: admin needs the token; phase, hide and reset; the snapshot survives a restart', async () => {
  const { x, store } = await api();
  try {
    assert.equal((await admin(x, 'phase', { phase: 'p1' }, null)).status, 403);
    assert.equal((await admin(x, 'phase', { phase: 'p1' }, 'wrong')).status, 403);
    assert.equal((await admin(x, 'phase', { phase: 'nope' })).status, 400);
    assert.equal((await admin(x, 'phase', { phase: 'p1' })).status, 200);
    await reg(x, 1, 'A', 'Rui Costa');
    await post(x, [ev(1, 'A', 'join', 0, { lang: 'pt', os: 'mac' }), ev(1, 'A', 'mission_done', 10, { mission: 'M3' })]);
    assert.equal((await admin(x, 'hide', { nickname: 'Rui Costa' })).status, 200);
    await x.flush();
    const y = (await api({ store })).x;
    const s = await get(y, '/state');
    assert.equal(s.phase, 'p1');
    assert.equal(s.rooms.A.missions.M3.done, 1);
    assert.equal(s.hidden, undefined, 'hidden nicknames are not listed in the public state');
    assert.ok(s.feed.every((f) => f.name !== 'Rui Costa'));
    assert.ok(!JSON.stringify(s).includes('Rui'));
    assert.equal(s.board.all.top[0].name, null);
    assert.equal((await admin(y, 'reset', {})).status, 200);
    assert.equal((await get(y, '/state')).rooms.all.people, 0);
    y.close();
    // without any token configured, admin is closed
    const z = (await api({ adminToken: '' })).x;
    assert.equal((await admin(z, 'phase', { phase: 'p2' }, '')).status, 403);
    z.close();
  } finally {
    x.close();
  }
});

async function readSse(res, until, timeoutMs = 3000) {
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  const msgs = [];
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    const r = await Promise.race([reader.read(), new Promise((ok) => setTimeout(() => ok({ timeout: true }), end - Date.now()))]);
    if (r.timeout || r.done) break;
    buf += dec.decode(r.value);
    for (const part of buf.split('\n\n').slice(0, -1)) {
      const d = part.split('\n').find((l) => l.startsWith('data: '));
      if (d) msgs.push(JSON.parse(d.slice(6)));
    }
    buf = buf.split('\n\n').pop();
    if (until(msgs)) break;
  }
  await reader.cancel();
  return msgs;
}

test('SSE: the state at once, then an update after a change (throttled)', async () => {
  const { x } = await api();
  try {
    await reg(x, 9, 'B');
    const res = await x.fetch(new Request('http://p/stream'));
    assert.equal(res.headers.get('Content-Type'), 'text/event-stream');
    const p = readSse(res, (m) => m.some((x) => x.rooms.B.ready === 1));
    await new Promise((ok) => setTimeout(ok, 30));
    await post(x, [ev(9, 'B', 'check_ok', 1)]);
    const msgs = await p;
    assert.equal(msgs[0].rooms.B.ready, 0);
    assert.equal(msgs.at(-1).rooms.B.ready, 1);
  } finally {
    x.close();
  }
});

test('the Durable Object store on SQLite (node:sqlite stands in for ctx.storage.sql) and the Worker routing', async () => {
  const db = new DatabaseSync(':memory:');
  // like ctx.storage.sql.exec: runs at once, the rows come from toArray()
  const sql = {
    exec: (q, ...b) => {
      const rows = /^\s*(select|insert[\s\S]*returning)/i.test(q) ? db.prepare(q).all(...b) : (db.prepare(q).run(...b), []);
      return { toArray: () => rows };
    },
  };
  const s = sqlStore(sql);
  assert.equal(s.append({ a: 1 }, 'k1'), 1);
  assert.equal(s.append({ a: 1 }, 'k1'), null);
  const k2 = s.append({ a: 2 }, 'k2');
  assert.ok(k2 > 1, 'a growing sequence (gaps are fine)');
  assert.deepEqual(s.since(1), [{ seq: k2, e: { a: 2 } }]);
  s.setMeta('x', 'y');
  s.setMeta('x', 'z');
  assert.equal(s.getMeta('x'), 'z');
  s.reset();
  assert.deepEqual(s.since(0), []);
  // the Worker sends API paths to the workshop's object and only the headers the API needs
  const env = { WORKSHOP_CODE: 'ws-t', ADMIN_TOKEN: 'adm', ALLOWED_ORIGINS: 'https://panel.pages.dev' };
  const room = new PanelRoom({ storage: { sql } }, env);
  let seen = null;
  env.PANEL = { idFromName: (n) => `id:${n}`, get: (i) => ({ fetch: (r) => ((seen = { i, r }), room.fetch(r)) }) };
  const cred = await (await worker.fetch(new Request('https://w.example/admin/register', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Admin-Token': 'adm' }, body: JSON.stringify({ p: id(1), room: 'A', name: 'Ana' }) }), env)).json();
  const r = await worker.fetch(new Request('https://w.example/e', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Workshop-Code': 'ws-t', 'X-Participant': `${id(1)}.${cred.credential}`, 'User-Agent': 'secret-agent', Cookie: 'c=1' }, body: JSON.stringify([ev(1, 'A', 'check_ok', 1)]) }), env);
  assert.equal(r.status, 204);
  assert.equal(seen.i, 'id:ws-t');
  assert.equal(seen.r.headers.get('User-Agent'), null);
  assert.equal(seen.r.headers.get('Cookie'), null);
  const st = await (await worker.fetch(new Request('https://w.example/state', { headers: { Origin: 'https://panel.pages.dev' } }), env)).json();
  assert.equal(st.rooms.A.ready, 1);
  assert.equal((await worker.fetch(new Request('https://w.example/'), env)).status, 404);
  room.api.close();
});

// A laptop registered on the panel (the credential from /admin/register; the GitHub one has its own test).
async function telemetryHome(url, { registered = true, n = 1 } = {}) {
  const base = mkdtempSync(join(tmpdir(), 'ws-send-'));
  const dir = join(base, 'telemetry');
  mkdirSync(dir, { recursive: true });
  let participant = null;
  if (registered) {
    const r = await (await fetch(`${url}/admin/register`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Admin-Token': 'adm' }, body: JSON.stringify({ p: id(n), room: 'A', name: 'Ana' }) })).json();
    participant = { p: r.p, credential: r.credential, name: r.name };
  }
  writeFileSync(join(dir, 'config.json'), JSON.stringify({ v: 1, enabled: registered, room: 'A', workshop: 'ws-t', kit: 'v2', panel_url: url, expires_at: '2099-01-01T00:00:00.000Z', participant }));
  return { base, P: paths(dir) };
}
const queue = (P, list) => writeFileSync(P.queue, list.map((e) => JSON.stringify(e)).join('\n') + '\n');

test('sender: the queue goes in batches of 50, only confirmed events leave it; offline it waits; no duplicates', async () => {
  const data = mkdtempSync(join(tmpdir(), 'ws-srv-'));
  let srv = await startServer({ port: 0, data, ws: 'ws-t', adminToken: 'adm', throttleMs: 20 });
  const port = new URL(srv.url).port;
  const t = await telemetryHome(srv.url);
  try {
    const list = Array.from({ length: 120 }, (_, i) => ev(1, 'A', 'cost', i / 10, { cost_usd: 0.001, model: 'haiku', block: 'p1' }));
    queue(t.P, list.slice(0, 70));
    let r = await sendQueue({ P: t.P });
    assert.deepEqual(r, { sent: 70, left: 0 });
    assert.ok(!existsSync(t.P.queue) && !existsSync(t.P.sending));
    assert.equal(readLines(t.P.sent).length, 20, 'the last 20 sent, for ctl show');
    // offline: nothing leaves the queue
    await srv.close();
    queue(t.P, list.slice(60, 120));
    r = await sendQueue({ P: t.P });
    assert.equal(r.sent, 0);
    assert.equal(r.left, 60);
    // back online (same port, same data): the 10 already sent are ignored by the server
    srv = await startServer({ port: Number(port), data, ws: 'ws-t', adminToken: 'adm', throttleMs: 20 });
    r = await sendQueue({ P: t.P });
    assert.deepEqual(r, { sent: 60, left: 0 });
    const lines = readFileSync(join(data, 'ws-t', 'events.jsonl'), 'utf8').trim().split('\n').filter((l) => !l.includes('"register"'));
    assert.equal(lines.length, 120, 'each event stored once');
    // not registered: nothing is sent
    const off = await telemetryHome(srv.url, { registered: false });
    queue(off.P, list.slice(0, 5));
    assert.equal((await sendQueue({ P: off.P })).sent, 0);
    rmSync(off.base, { recursive: true, force: true });
  } finally {
    await srv.close();
    rmSync(t.base, { recursive: true, force: true });
    rmSync(data, { recursive: true, force: true });
  }
});

test('end to end: record() queues the event and starts the sender, which posts it to the panel', async () => {
  const data = mkdtempSync(join(tmpdir(), 'ws-e2e-'));
  const srv = await startServer({ port: 0, data, ws: 'ws-t', adminToken: 'adm', throttleMs: 20 });
  const t = await telemetryHome(srv.url);
  try {
    assert.deepEqual(record('mission_done', { mission: 'M4' }, { P: t.P }), { recorded: true, queued: true });
    let s = null;
    for (let i = 0; i < 60 && !s?.rooms.A.missions.M4.done; i++) {
      await new Promise((ok) => setTimeout(ok, 100));
      s = await (await fetch(`${srv.url}/state`)).json();
    }
    assert.equal(s.rooms.A.missions.M4.done, 1);
    assert.equal(readLines(t.P.sent).at(-1).mission, 'M4');
  } finally {
    await srv.close();
    rmSync(t.base, { recursive: true, force: true });
    rmSync(data, { recursive: true, force: true });
  }
});

test('load: 250 people in 2 rooms (the whole agenda, ~7500 events) with no errors; the panel updates within 2 s', async () => {
  const data = mkdtempSync(join(tmpdir(), 'ws-load-'));
  const srv = await startServer({ port: 0, data, ws: 'ws-t', adminToken: 'adm', throttleMs: 500 });
  try {
    const events = simulate({ people: 250, rooms: 2, ws: 'ws-t', start: Date.now() - 95 * 60000 });
    const byPerson = new Map();
    for (const e of events) (byPerson.get(e.p) || byPerson.set(e.p, []).get(e.p)).push(e);
    let errors = 0;
    const people = [...byPerson.values()];
    const cred = new Map();
    for (const list of people) {
      const r = await (await fetch(`${srv.url}/admin/register`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Admin-Token': 'adm' }, body: JSON.stringify({ p: list[0].p, room: list[0].room, name: `P ${cred.size}` }) })).json();
      cred.set(list[0].p, r.credential);
    }
    for (let i = 0; i < people.length; i += 25) {
      await Promise.all(
        people.slice(i, i + 25).map(async (list) => {
          for (let k = 0; k < list.length; k += 50) {
            // a laptop sends at most 50 events every 2 s: within the rate limit
            const r = await fetch(`${srv.url}/e`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Workshop-Code': 'ws-t', 'X-Participant': `${list[0].p}.${cred.get(list[0].p)}` }, body: JSON.stringify(list.slice(k, k + 50)) });
            if (r.status !== 204) errors++;
          }
        }),
      );
    }
    assert.equal(errors, 0);
    const s = await (await fetch(`${srv.url}/state`)).json();
    assert.equal(s.rooms.all.people, 250);
    assert.equal(s.events, events.length + 250, 'the events and the 250 registrations');
    assert.equal(s.board.all.people, 250);
    // latency: one more event → the SSE message that shows it
    const res = await fetch(`${srv.url}/stream`);
    const t0 = Date.now();
    const p = readSse(res, (m) => m.some((x) => x.events > s.events), 3000);
    const extra = people[0][0];
    await fetch(`${srv.url}/e`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Workshop-Code': 'ws-t', 'X-Participant': `${extra.p}.${cred.get(extra.p)}` }, body: JSON.stringify([{ v: 1, ws: 'ws-t', room: extra.room, p: extra.p, ev: 'check_ok', t: new Date().toISOString(), kit: 'v2' }]) });
    const msgs = await p;
    assert.ok(msgs.some((x) => x.events === s.events + 1), 'no update');
    assert.ok(Date.now() - t0 <= 2000, `update after ${Date.now() - t0} ms`);
  } finally {
    await srv.close();
    rmSync(data, { recursive: true, force: true });
  }
});

test('registration with the GitHub token: a verified company email; the same account keeps its id; the token is not kept', async () => {
  const seen = [];
  const accounts = {
    'tok-ana-000000': { id: 11, name: 'Ana Silva', emails: [{ email: 'ana@gmail.com', verified: true }, { email: 'Ana.Silva@Checkmarx.com', verified: true }] },
    'tok-other-0000': { id: 12, name: 'Zé', emails: [{ email: 'ze@gmail.com', verified: true }] },
    'tok-unverified': { id: 13, name: 'Rita', emails: [{ email: 'rita@checkmarx.com', verified: false }] },
  };
  const github = async (token) => {
    seen.push(token);
    if (token === 'tok-noscope-00') return { error: 'scope' };
    return accounts[token] ?? { error: 'token' };
  };
  const { x, store } = await api({ github, emailDomain: 'checkmarx.com' });
  const register = (token, room = 'A') => x.fetch(new Request('http://p/register', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Workshop-Code': 'ws-t' }, body: JSON.stringify({ token, room }) }));
  try {
    let r = await register('tok-ana-000000');
    assert.equal(r.status, 200);
    const ana = await r.json();
    assert.equal(ana.name, 'Ana Silva');
    assert.match(ana.p, /^[0-9a-f]{32}$/);
    assert.equal((await post(x, [{ v: 1, ws: 'ws-t', room: 'A', p: ana.p, ev: 'check_ok', t: at(1), kit: 'v2' }], { 'X-Participant': `${ana.p}.${ana.credential}` })).status, 204);
    assert.equal((await (await register('tok-ana-000000', 'B')).json()).p, ana.p, 'same account, same id');
    r = await register('tok-other-0000');
    assert.deepEqual([r.status, (await r.json()).reason], [403, 'domain']);
    r = await register('tok-unverified');
    assert.deepEqual([r.status, (await r.json()).reason], [403, 'domain'], 'an unverified company email does not count');
    r = await register('tok-noscope-00');
    assert.deepEqual([r.status, (await r.json()).reason], [400, 'scope']);
    r = await register('tok-wrong-0000');
    assert.equal(r.status, 401);
    assert.equal((await x.fetch(new Request('http://p/register', { method: 'POST', headers: { 'X-Workshop-Code': 'other' }, body: '{}' }))).status, 403);
    // the token never reaches the store, the state or the snapshot
    await x.flush();
    const everything = JSON.stringify(store.rows) + JSON.stringify(await get(x, '/state')) + String(store.getMeta('snapshot')) + String(store.getMeta('participants'));
    for (const t of seen) assert.ok(!everything.includes(t), 'a token was kept');
    assert.ok(!everything.includes('checkmarx.com') && !everything.includes('gmail'), 'no email is kept');
    assert.equal((await get(x, '/state')).board.all.top[0].name, 'Ana Silva');
  } finally {
    x.close();
  }
});

test('ctl.mjs register: gh token → the panel → config.json with the credential; the join reaches the board; clear errors', async () => {
  const { register } = await import('../../telemetry/ctl.mjs');
  const data = mkdtempSync(join(tmpdir(), 'ws-reg-'));
  const github = async (token) => (token === 'gho_company_token' ? { id: 7, name: 'Marta Reis', emails: [{ email: 'marta@checkmarx.com', verified: true }] } : token === 'gho_noscope_tok' ? { error: 'scope' } : { id: 8, name: 'X', emails: [{ email: 'x@example.com', verified: true }] });
  const srv = await startServer({ port: 0, data, ws: 'ws-t', adminToken: 'adm', throttleMs: 20, emailDomain: 'checkmarx.com', github });
  const t = await telemetryHome(srv.url, { registered: false });
  const out = [];
  try {
    const cfg = JSON.parse(readFileSync(t.P.config, 'utf8'));
    writeFileSync(t.P.config, JSON.stringify({ ...cfg, email_domain: 'checkmarx.com' }));
    assert.equal(await register('A', { P: t.P, print: (m) => out.push(m), token: () => null }), 4);
    assert.match(out.at(-1), /gh auth login/);
    assert.equal(await register('A', { P: t.P, print: (m) => out.push(m), token: () => 'gho_other_token' }), 3);
    assert.match(out.at(-1), /@checkmarx\.com/);
    assert.equal(await register('A', { P: t.P, print: (m) => out.push(m), token: () => 'gho_noscope_tok' }), 4);
    assert.match(out.at(-1), /gh auth refresh -h github\.com -s user:email/);
    assert.equal(await register('Z', { P: t.P, print: (m) => out.push(m), token: () => 'gho_company_token' }), 2);
    assert.equal(await register('b', { P: t.P, print: (m) => out.push(m), token: () => 'gho_company_token' }), 0);
    assert.match(out.at(-1), /Marta Reis/);
    const c = JSON.parse(readFileSync(t.P.config, 'utf8'));
    assert.equal(c.room, 'B');
    assert.match(c.participant.p, /^[0-9a-f]{32}$/);
    assert.ok(!JSON.stringify(c).includes('gho_'), 'the token is not written');
    for (const f of ['local.jsonl', 'queue.jsonl']) assert.ok(!readFileSync(join(t.P.dir, f), 'utf8').includes('gho_'));
    await sendQueue({ P: t.P });
    const s = await (await fetch(`${srv.url}/state`)).json();
    assert.deepEqual(s.board.B.top.map((r) => r.name), ['Marta Reis']);
  } finally {
    await srv.close();
    rmSync(t.base, { recursive: true, force: true });
    rmSync(data, { recursive: true, force: true });
  }
});
