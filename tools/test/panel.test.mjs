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
    ev(1, 'A', 'join', 0, { lang: 'pt', os: 'mac', nickname: 'Ana' }),
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
  assert.deepEqual(s.feed.map((f) => [f.room, f.kind, f.mission ?? f.project ?? null, f.nickname]), [
    ['A', 'mission', 'M1', 'Ana'],
    ['A', 'mission', 'M2', null],
    ['A', 'tool', null, 'Ana'],
    ['A', 'swarm', 'p1', 'Ana'],
    ['A', 'report', null, 'Ana'],
  ]);
  a.hide('Ana');
  assert.ok(a.state(now).feed.every((f) => f.nickname === null));
  // no person ids in the state
  assert.ok(!JSON.stringify(a.state(now)).includes(id(1)));
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
const post = (x, body, h = {}) => x.fetch(new Request('http://p/e', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Workshop-Code': 'ws-t', ...h }, body: typeof body === 'string' ? body : JSON.stringify(body) }));
const get = async (x, path) => (await x.fetch(new Request(`http://p${path}`))).json();
const admin = (x, what, body, token = 'adm-secret') => x.fetch(new Request(`http://p/admin/${what}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { 'X-Admin-Token': token } : {}) }, body: JSON.stringify(body) }));

test('API: workshop code, allowlist, limits, duplicates and the rate limit', async () => {
  const { x, store } = await api();
  try {
    assert.equal((await post(x, [ev(1, 'A', 'join', 0, { lang: 'pt', os: 'mac' })], { 'X-Workshop-Code': 'other' })).status, 403);
    const good = ev(1, 'A', 'mission_done', 10, { mission: 'M1' });
    const bad = [{ ...good, prompt: 'secret' }, { ...good, ev: 'tests_run', green: 1, red: 0 }, { ...good, ws: 'other' }, { ...good, mission: 'M99' }, 'x', null];
    assert.equal((await post(x, [good, ...bad])).status, 204);
    assert.equal(store.rows.length, 1, 'only the valid event is stored');
    assert.equal((await post(x, [good])).status, 204);
    assert.equal(store.rows.length, 1, 'a duplicate (a sender retry) is ignored');
    assert.equal((await get(x, '/state')).rooms.A.missions.M1.done, 1);
    assert.equal((await post(x, Array.from({ length: 51 }, (_, i) => ev(2, 'A', 'cost', i, { cost_usd: 0.01, model: 'haiku', block: 'p1' })))).status, 413);
    assert.equal((await post(x, 'x'.repeat(70000))).status, 413);
    assert.equal((await post(x, '{not json')).status, 400);
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
    await post(x, [ev(1, 'A', 'join', 0, { lang: 'pt', os: 'mac', nickname: 'Rui' }), ev(1, 'A', 'mission_done', 10, { mission: 'M3' })]);
    assert.equal((await admin(x, 'hide', { nickname: 'Rui' })).status, 200);
    await x.flush();
    const y = (await api({ store })).x;
    const s = await get(y, '/state');
    assert.equal(s.phase, 'p1');
    assert.equal(s.rooms.A.missions.M3.done, 1);
    assert.equal(s.hidden, undefined, 'hidden nicknames are not listed in the public state');
    assert.ok(s.feed.every((f) => f.nickname !== 'Rui'));
    assert.ok(!JSON.stringify(s).includes('Rui'));
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
    const res = await x.fetch(new Request('http://p/stream'));
    assert.equal(res.headers.get('Content-Type'), 'text/event-stream');
    const p = readSse(res, (m) => m.length >= 2);
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
  const r = await worker.fetch(new Request('https://w.example/e', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Workshop-Code': 'ws-t', 'User-Agent': 'secret-agent', Cookie: 'c=1' }, body: JSON.stringify([ev(1, 'A', 'check_ok', 1)]) }), env);
  assert.equal(r.status, 204);
  assert.equal(seen.i, 'id:ws-t');
  assert.equal(seen.r.headers.get('User-Agent'), null);
  assert.equal(seen.r.headers.get('Cookie'), null);
  const st = await (await worker.fetch(new Request('https://w.example/state', { headers: { Origin: 'https://panel.pages.dev' } }), env)).json();
  assert.equal(st.rooms.A.ready, 1);
  assert.equal((await worker.fetch(new Request('https://w.example/'), env)).status, 404);
  room.api.close();
});

function telemetryHome(url, { enabled = true } = {}) {
  const base = mkdtempSync(join(tmpdir(), 'ws-send-'));
  const dir = join(base, 'telemetry');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'config.json'), JSON.stringify({ v: 1, enabled, room: 'A', workshop: 'ws-t', kit: 'v2', panel_url: url, expires_at: '2099-01-01T00:00:00.000Z' }));
  return { base, P: paths(dir) };
}
const queue = (P, list) => writeFileSync(P.queue, list.map((e) => JSON.stringify(e)).join('\n') + '\n');

test('sender: the queue goes in batches of 50, only confirmed events leave it; offline it waits; no duplicates', async () => {
  const data = mkdtempSync(join(tmpdir(), 'ws-srv-'));
  let srv = await startServer({ port: 0, data, ws: 'ws-t', adminToken: 'adm', throttleMs: 20 });
  const port = new URL(srv.url).port;
  const t = telemetryHome(srv.url);
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
    const lines = readFileSync(join(data, 'ws-t', 'events.jsonl'), 'utf8').trim().split('\n');
    assert.equal(lines.length, 120, 'each event stored once');
    // participation off or no panel: nothing is sent
    const off = telemetryHome(srv.url, { enabled: false });
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
  const t = telemetryHome(srv.url);
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
    for (let i = 0; i < people.length; i += 25) {
      await Promise.all(
        people.slice(i, i + 25).map(async (list) => {
          for (let k = 0; k < list.length; k += 50) {
            // a laptop sends at most 50 events every 2 s: within the rate limit
            const r = await fetch(`${srv.url}/e`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Workshop-Code': 'ws-t' }, body: JSON.stringify(list.slice(k, k + 50)) });
            if (r.status !== 204) errors++;
          }
        }),
      );
    }
    assert.equal(errors, 0);
    const s = await (await fetch(`${srv.url}/state`)).json();
    assert.equal(s.rooms.all.people, 250);
    assert.equal(s.events, events.length);
    // latency: one more event → the SSE message that shows it
    const res = await fetch(`${srv.url}/stream`);
    const t0 = Date.now();
    const p = readSse(res, (m) => m.some((x) => x.rooms.A.ready > s.rooms.A.ready), 3000);
    await fetch(`${srv.url}/e`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Workshop-Code': 'ws-t' }, body: JSON.stringify([{ v: 1, ws: 'ws-t', room: 'A', p: id(99999), ev: 'check_ok', t: new Date().toISOString(), kit: 'v2' }]) });
    const msgs = await p;
    assert.ok(msgs.some((x) => x.rooms.A.ready === s.rooms.A.ready + 1), 'no update');
    assert.ok(Date.now() - t0 <= 2000, `update after ${Date.now() - t0} ms`);
  } finally {
    await srv.close();
    rmSync(data, { recursive: true, force: true });
  }
});
