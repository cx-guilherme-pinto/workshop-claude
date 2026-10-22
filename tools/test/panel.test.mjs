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
import { createApi, dayOf, nextMidnight, RATE_PER_MIN } from '../../panel/api.mjs';
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
const ev = (n, ev, min, f = {}) => ({ v: 1, ws: 'ws-t', p: id(n), ev, t: at(min), kit: 'v2', ...f });

test('MISSIONS is the list of validated missions of missions/rules.json', () => {
  const rules = JSON.parse(readFileSync(join(ROOT, 'missions', 'rules.json'), 'utf8'));
  assert.deepEqual(MISSIONS, rules.missions.filter((m) => m.validated !== false).map((m) => m.id));
});

test('aggregate: every metric of spec 6.3, for everybody (no rooms, D-34)', () => {
  const a = new Aggregate({ ws: 'ws-t' });
  const list = [
    ev(1, 'register', 0, { name: 'Ana Silva' }),
    ev(2, 'register', 0, { name: 'Rui Costa' }),
    ev(1, 'join', 0, { lang: 'pt', os: 'mac' }),
    ev(1, 'check_ok', 1),
    ev(2, 'join', 0, { lang: 'en', os: 'win' }),
    ev(3, 'join', 0, { lang: 'pt', os: 'mac' }),
    ev(3, 'check_ok', 2),
    ev(1, 'mission_done', 10, { mission: 'M1' }),
    ev(1, 'mission_done', 10.5, { mission: 'M1' }),
    ev(2, 'mission_done', 11, { mission: 'M1' }),
    ev(2, 'mission_done', 12, { mission: 'M2' }),
    ev(1, 'cost', 20, { cost_usd: 0.5, model: 'sonnet', block: 'missions' }),
    ev(1, 'cost', 30, { cost_usd: 1, model: 'haiku', block: 'p1' }),
    ev(2, 'cost', 30, { cost_usd: 0.5, model: 'sonnet', block: 'p1' }),
    ev(1, 'p1_tool_created', 26, { tool_template: 'calc' }),
    ev(1, 'p1_plan', 31, { parallel: 8, model: 'haiku', forecast_min: 5, tasks: 31 }),
    ev(2, 'p1_plan', 31, { parallel: 12, model: 'sonnet', forecast_min: null, tasks: 31 }),
    ev(1, 'p1_swarm_done', 35, { duration_s: 240, green: 28, red: 3, green_first: 27 }),
    ev(2, 'p1_swarm_done', 34, { duration_s: 180, green: 31, red: 0, green_first: 29 }),
    ev(1, 'p1_retry_green', 40, { tool: 'nm-03' }),
    ev(1, 'p1_gate', 44, { verdict: 'APPROVED' }),
    ev(3, 'p2_intake', 50, { origin: 'practice', issue: 'EX-1' }),
    ev(3, 'p2_plan', 55, { n_agents: 4 }),
    ev(1, 'p2_intake', 50, { origin: 'practice', issue: 'EX-1' }),
    ev(1, 'p2_plan', 55, { n_agents: 4 }),
    ev(1, 'p2_swarm_done', 65, { duration_s: 200, green: 4, red: 0, green_first: 4 }),
    ev(1, 'p2_gate', 72, { verdict: 'APPROVED' }),
    ev(1, 'p2_report', 78, { destination: 'file' }),
  ];
  for (const e of list) a.apply(e);
  const now = T0 + 80 * 60000;
  const s = a.state(now);
  const A = s.summary;
  assert.equal(s.rooms, undefined, 'no rooms');
  assert.equal(A.people, 3);
  assert.equal(A.ready, 2);
  assert.equal(A.active, 1, 'events in the last 10 min (person 2 went quiet after the swarm, person 3 after the plan)');
  assert.equal(a.state(now + ACTIVE_MS + 60000).summary.active, 0);
  assert.equal(A.cost_avg_usd, 1);
  assert.deepEqual([A.missions.M1.done, A.missions.M1.pct, A.missions.M2.pct], [2, 100, 50]);
  assert.equal(A.least_done, 'M3');
  assert.equal(A.coverage_avg, 0.111);
  assert.deepEqual(A.p1.points.sort((x, y) => x.duration_s - y.duration_s), [
    { duration_s: 180, cost_usd: 0.5, parallel: 12, model: 'sonnet' },
    { duration_s: 240, cost_usd: 1, parallel: 8, model: 'haiku' },
  ]);
  assert.equal(A.p1.forecast_median_min, 5);
  assert.equal(A.p1.actual_median_min, 3.5);
  assert.deepEqual([A.p1.specs_fixed, A.p1.swarm_done, A.p1.tools_invented, A.p1.gates_approved], [1, 2, 1, 1]);
  assert.deepEqual(A.p2.funnel, { intake: 0, plan: 1, swarm: 0, gate: 0, report: 1 });
  assert.deepEqual(A.p2.agents_hist, { 4: 2 });
  assert.equal(A.p2.closed, 1);
  assert.equal(A.closing.cost_per_green_usd, round4(1.5 / 63));
  assert.equal(A.closing.green_first_pct, Math.round((100 * 60) / 66));
  assert.equal(A.closing.haiku_pct, 50);
  assert.equal(A.closing.agents_launched, 31 + 31 + 4 + 4);
  // the feed: the first to reach each milestone, never a ranking; a hidden nickname is not shown
  assert.deepEqual(s.feed.map((f) => [f.kind, f.mission ?? f.project ?? null, f.name]), [
    ['mission', 'M1', 'Ana Silva'],
    ['mission', 'M2', 'Rui Costa'],
    ['tool', null, 'Ana Silva'],
    ['swarm', 'p1', 'Ana Silva'],
    ['report', null, 'Ana Silva'],
  ]);
  assert.ok(s.feed.every((f) => !('room' in f)));
  // the leaderboard (D-34): registered people by points (coverage and quality), ties by who got there first
  assert.deepEqual(s.board.top.map((r) => [r.rank, r.name, r.points, r.missions.join(','), r.p1, r.p2]), [
    [1, 'Ana Silva', 1 + 1 + 1 + 2 + 1 + 2 + 1, 'M1', 'approved', 'report'],
    [2, 'Rui Costa', 2 + 1, 'M1,M2', 'swarm', null],
  ]);
  assert.equal(s.board.people, 2, 'person 3 never registered: not on the board');
  assert.deepEqual(s.registrations, { people: 2, ready: 1, recent: [{ name: 'Rui Costa' }, { name: 'Ana Silva' }] }, 'person 3 is ready but not registered');
  assert.equal(s.feed_rooms, undefined);
  a.hide('Ana Silva');
  const hidden = a.state(now);
  assert.ok(hidden.feed.every((f) => f.name !== 'Ana Silva'));
  assert.equal(hidden.board.top[0].name, null, 'hidden: still ranked, without the name');
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
async function reg(x, n, name = `Pessoa ${n}`) {
  const r = await (await x.fetch(new Request('http://p/admin/register', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Admin-Token': 'adm-secret' }, body: JSON.stringify({ p: id(n), name }) }))).json();
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
    for (const n of [1, 2, 3]) await reg(x, n);
    const regs = store.rows.length;
    assert.equal((await post(x, [ev(1, 'check_ok', 0)], { 'X-Participant': '' })).status, 401, 'no credential');
    assert.equal((await post(x, [ev(1, 'check_ok', 0)], { 'X-Participant': `${id(1)}.${'0'.repeat(64)}` })).status, 401, 'a forged credential');
    assert.equal((await post(x, [ev(2, 'check_ok', 0)], { 'X-Participant': `${id(1)}.${creds.get(id(1))}` })).status, 204);
    assert.equal(store.rows.length, regs, "someone else's events are dropped");
    assert.equal((await post(x, [ev(1, 'join', 0, { lang: 'pt', os: 'mac' })], { 'X-Workshop-Code': 'other' })).status, 403);
    const good = ev(1, 'mission_done', 10, { mission: 'M1' });
    const bad = [{ ...good, prompt: 'secret' }, { ...good, ev: 'tests_run', green: 1, red: 0 }, { ...good, ws: 'other' }, { ...good, mission: 'M99' }, 'x', null];
    assert.equal((await post(x, [good, ...bad])).status, 204);
    assert.equal(store.rows.length, regs + 1, 'only the valid event is stored');
    assert.equal((await post(x, [good])).status, 204);
    assert.equal(store.rows.length, regs + 1, 'a duplicate (a sender retry) is ignored');
    assert.equal((await get(x, '/state')).summary.missions.M1.done, 1);
    assert.equal((await post(x, Array.from({ length: 51 }, (_, i) => ev(2, 'cost', i, { cost_usd: 0.01, model: 'haiku', block: 'p1' })))).status, 413);
    const ana = { 'X-Participant': `${id(1)}.${creds.get(id(1))}` };
    assert.equal((await post(x, 'x'.repeat(70000), ana)).status, 413);
    assert.equal((await post(x, '{not json', ana)).status, 400);
    // 120 events per minute per participant: the 121st stops the batch and says how many were processed
    let processed = 0;
    for (let b = 0; b < 3; b++) {
      const r = await post(x, Array.from({ length: 50 }, (_, i) => ev(3, 'cost', b + i / 100, { cost_usd: 0.001, model: 'haiku', block: 'p1' })));
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
    await reg(x, 1, 'Rui Costa');
    await post(x, [ev(1, 'join', 0, { lang: 'pt', os: 'mac' }), ev(1, 'mission_done', 10, { mission: 'M3' })]);
    assert.equal((await admin(x, 'hide', { nickname: 'Rui Costa' })).status, 200);
    await x.flush();
    const y = (await api({ store })).x;
    const s = await get(y, '/state');
    assert.equal(s.phase, 'p1');
    assert.equal(s.summary.missions.M3.done, 1);
    assert.equal(s.hidden, undefined, 'hidden nicknames are not listed in the public state');
    assert.ok(s.feed.every((f) => f.name !== 'Rui Costa'));
    assert.ok(!JSON.stringify(s).includes('Rui'));
    assert.equal(s.board.top[0].name, null);
    assert.equal((await admin(y, 'reset', {})).status, 200);
    assert.equal((await get(y, '/state')).summary.people, 0);
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
    await reg(x, 9);
    const res = await x.fetch(new Request('http://p/stream'));
    assert.equal(res.headers.get('Content-Type'), 'text/event-stream');
    const p = readSse(res, (m) => m.some((x) => x.summary.ready === 1));
    await new Promise((ok) => setTimeout(ok, 30));
    await post(x, [ev(9, 'check_ok', 1)]);
    const msgs = await p;
    assert.equal(msgs[0].summary.ready, 0);
    assert.equal(msgs.at(-1).summary.ready, 1);
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
  let alarm = null;
  const storage = { sql, getAlarm: async () => alarm, setAlarm: async (t) => (alarm = t) };
  const room = new PanelRoom({ storage }, env);
  let seen = null;
  env.PANEL = { idFromName: (n) => `id:${n}`, get: (i) => ({ fetch: (r) => ((seen = { i, r }), room.fetch(r)) }) };
  const cred = await (await worker.fetch(new Request('https://w.example/admin/register', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Admin-Token': 'adm' }, body: JSON.stringify({ p: id(1), name: 'Ana' }) }), env)).json();
  const r = await worker.fetch(new Request('https://w.example/e', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Workshop-Code': 'ws-t', 'X-Participant': `${id(1)}.${cred.credential}`, 'User-Agent': 'secret-agent', Cookie: 'c=1' }, body: JSON.stringify([ev(1, 'check_ok', 1)]) }), env);
  assert.equal(r.status, 204);
  assert.equal(seen.i, 'id:ws-t');
  assert.equal(seen.r.headers.get('User-Agent'), null);
  assert.equal(seen.r.headers.get('Cookie'), null);
  const st = await (await worker.fetch(new Request('https://w.example/state', { headers: { Origin: 'https://panel.pages.dev' } }), env)).json();
  assert.equal(st.summary.ready, 1);
  assert.equal((await worker.fetch(new Request('https://w.example/'), env)).status, 404);
  // the daily wipe has its alarm at the next midnight (DAY_TZ; UTC without it)
  assert.ok(alarm > Date.now() && alarm - nextMidnight(Date.now(), 'UTC') === 5000, 'alarm at midnight + 5 s');
  alarm = null;
  await room.alarm();
  assert.ok(alarm > Date.now(), 'the alarm sets the next one');
  room.api.close();
});

test('daily wipe: dayOf and nextMidnight follow the time zone, summer time included', () => {
  assert.equal(dayOf(Date.parse('2026-11-20T23:30:00Z'), 'Europe/Lisbon'), '2026-11-20');
  assert.equal(dayOf(Date.parse('2026-07-20T23:30:00Z'), 'Europe/Lisbon'), '2026-07-21', 'summer: UTC+1');
  assert.equal(dayOf(Date.parse('2026-11-21T01:00:00Z'), 'America/Sao_Paulo'), '2026-11-20');
  assert.equal(dayOf(0, 'Not/AZone'), '1970-01-01', 'an unknown zone falls back to UTC');
  assert.equal(new Date(nextMidnight(Date.parse('2026-11-20T09:00:00Z'), 'Europe/Lisbon')).toISOString(), '2026-11-21T00:00:00.000Z');
  assert.equal(new Date(nextMidnight(Date.parse('2026-07-20T09:00:00Z'), 'Europe/Lisbon')).toISOString(), '2026-07-20T23:00:00.000Z');
  assert.equal(new Date(nextMidnight(Date.parse('2026-03-28T12:00:00Z'), 'Europe/Lisbon')).toISOString(), '2026-03-29T00:00:00.000Z', 'the night the clocks change');
});

test('daily wipe: at midnight everything is deleted (events, names, registrations, credentials); a store of another day too', async () => {
  const { x, store, tick } = await api({ dayTz: 'Europe/Lisbon' });
  const register = (body) => x.fetch(new Request('http://p/register', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Workshop-Code': 'ws-t' }, body: JSON.stringify(body) }));
  try {
    const ana = await (await register({ name: 'Ana Silva', account: 'a'.repeat(64) })).json();
    const h = { 'X-Participant': `${ana.p}.${ana.credential}` };
    assert.equal((await post(x, [{ v: 1, ws: 'ws-t', p: ana.p, ev: 'mission_done', mission: 'M1', t: at(1), kit: 'v2' }], h)).status, 204);
    assert.equal((await admin(x, 'phase', { phase: 'p2' })).status, 200);
    assert.equal((await get(x, '/state')).board.top[0].name, 'Ana Silva');
    // the same day, later: all still there
    tick(14 * 3600 * 1000 - 60000); // 23:59 in Lisbon (November: UTC)
    assert.equal((await get(x, '/state')).summary.people, 1);
    tick(2 * 60000); // 00:01 the next day
    const s = await get(x, '/state');
    assert.deepEqual([s.summary.people, s.board.people, s.registrations.people, s.events, s.feed.length, s.phase], [0, 0, 0, 0, 0, 'opening']);
    assert.equal(store.rows.length, 0, 'no event is kept');
    assert.equal(store.getMeta('participants'), null, 'no account hash is kept');
    assert.ok(!JSON.stringify(store.getMeta('snapshot')).includes('Ana'));
    assert.equal(store.getMeta('day'), '2026-11-21');
    // yesterday's credential no longer works; the same account registers again with a new id
    assert.equal((await post(x, [{ v: 1, ws: 'ws-t', p: ana.p, ev: 'check_ok', t: at(2), kit: 'v2' }], h)).status, 401);
    const again = await (await register({ name: 'Ana Silva', account: 'a'.repeat(64) })).json();
    assert.notEqual(again.p, ana.p);
    assert.notEqual(again.credential, ana.credential);
  } finally {
    x.close();
  }
  // a server that was off at midnight wipes the old day's store when it starts
  const old = memoryStore();
  old.setMeta('day', '2026-11-19');
  old.setMeta('participants', JSON.stringify({ ['b'.repeat(64)]: id(5) }));
  old.append({ v: 1, ws: 'ws-t', p: id(5), ev: 'register', t: at(0), kit: 'panel', name: 'Rui' }, 'r');
  const y = (await api({ store: old, dayTz: 'Europe/Lisbon' })).x;
  assert.deepEqual([old.rows.length, old.getMeta('participants'), (await get(y, '/state')).board.people], [0, null, 0]);
  y.close();
  // a store from before the daily wipe (no day at all) is wiped too
  const legacy = memoryStore();
  legacy.setMeta('participants', JSON.stringify({ ['c'.repeat(64)]: id(6) }));
  legacy.append({ v: 1, ws: 'ws-t', p: id(6), ev: 'register', t: at(0), kit: 'panel', name: 'Eva' }, 'e');
  const z = (await api({ store: legacy })).x;
  assert.deepEqual([legacy.rows.length, legacy.getMeta('participants'), (await get(z, '/state')).board.people], [0, null, 0]);
  z.close();
});

test('daily wipe on the laptop: a credential the panel no longer knows (401) ends the registration and empties the queue', async () => {
  const data = mkdtempSync(join(tmpdir(), 'ws-401-'));
  const srv = await startServer({ port: 0, data, ws: 'ws-t', adminToken: 'adm', throttleMs: 20 });
  const t = await telemetryHome(srv.url);
  try {
    queue(t.P, [ev(1, 'check_ok', 1)]);
    assert.equal((await sendQueue({ P: t.P })).sent, 1);
    assert.equal((await admin({ fetch: (r) => fetch(srv.url + new URL(r.url).pathname, { method: r.method, headers: r.headers, body: r.body, duplex: 'half' }) }, 'reset', {}, 'adm')).status, 200);
    queue(t.P, [ev(1, 'mission_done', 2, { mission: 'M1' })]);
    assert.deepEqual(await sendQueue({ P: t.P }), { sent: 0, left: 0 });
    const c = JSON.parse(readFileSync(t.P.config, 'utf8'));
    assert.deepEqual([c.enabled, c.participant], [false, null]);
  } finally {
    await srv.close();
    rmSync(t.base, { recursive: true, force: true });
    rmSync(data, { recursive: true, force: true });
  }
});

// A laptop registered on the panel (the credential from /admin/register; the GitHub one has its own test).
async function telemetryHome(url, { registered = true, n = 1 } = {}) {
  const base = mkdtempSync(join(tmpdir(), 'ws-send-'));
  const dir = join(base, 'telemetry');
  mkdirSync(dir, { recursive: true });
  let participant = null;
  if (registered) {
    const r = await (await fetch(`${url}/admin/register`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Admin-Token': 'adm' }, body: JSON.stringify({ p: id(n), name: 'Ana' }) })).json();
    participant = { p: r.p, credential: r.credential, name: r.name };
  }
  writeFileSync(join(dir, 'config.json'), JSON.stringify({ v: 1, enabled: registered, workshop: 'ws-t', kit: 'v2', panel_url: url, expires_at: '2099-01-01T00:00:00.000Z', participant }));
  return { base, P: paths(dir) };
}
const queue = (P, list) => writeFileSync(P.queue, list.map((e) => JSON.stringify(e)).join('\n') + '\n');

test('sender: the queue goes in batches of 50, only confirmed events leave it; offline it waits; no duplicates', async () => {
  const data = mkdtempSync(join(tmpdir(), 'ws-srv-'));
  let srv = await startServer({ port: 0, data, ws: 'ws-t', adminToken: 'adm', throttleMs: 20 });
  const port = new URL(srv.url).port;
  const t = await telemetryHome(srv.url);
  try {
    const list = Array.from({ length: 120 }, (_, i) => ev(1, 'cost', i / 10, { cost_usd: 0.001, model: 'haiku', block: 'p1' }));
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
    for (let i = 0; i < 60 && !s?.summary.missions.M4.done; i++) {
      await new Promise((ok) => setTimeout(ok, 100));
      s = await (await fetch(`${srv.url}/state`)).json();
    }
    assert.equal(s.summary.missions.M4.done, 1);
    assert.equal(readLines(t.P.sent).at(-1).mission, 'M4');
  } finally {
    await srv.close();
    rmSync(t.base, { recursive: true, force: true });
    rmSync(data, { recursive: true, force: true });
  }
});

test('load: 250 people (the whole agenda, ~7500 events) with no errors; the panel updates within 2 s', async () => {
  const data = mkdtempSync(join(tmpdir(), 'ws-load-'));
  const srv = await startServer({ port: 0, data, ws: 'ws-t', adminToken: 'adm', throttleMs: 500 });
  try {
    const events = simulate({ people: 250, ws: 'ws-t', start: Date.now() - 95 * 60000 });
    const byPerson = new Map();
    for (const e of events) (byPerson.get(e.p) || byPerson.set(e.p, []).get(e.p)).push(e);
    let errors = 0;
    const people = [...byPerson.values()];
    const cred = new Map();
    for (const list of people) {
      const r = await (await fetch(`${srv.url}/admin/register`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Admin-Token': 'adm' }, body: JSON.stringify({ p: list[0].p, name: `P ${cred.size}` }) })).json();
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
    assert.equal(s.summary.people, 250);
    assert.equal(s.events, events.length + 250, 'the events and the 250 registrations');
    assert.equal(s.board.people, 250);
    // latency: one more event → the SSE message that shows it
    const res = await fetch(`${srv.url}/stream`);
    const t0 = Date.now();
    const p = readSse(res, (m) => m.some((x) => x.events > s.events), 3000);
    const extra = people[0][0];
    await fetch(`${srv.url}/e`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Workshop-Code': 'ws-t', 'X-Participant': `${extra.p}.${cred.get(extra.p)}` }, body: JSON.stringify([{ v: 1, ws: 'ws-t', p: extra.p, ev: 'check_ok', t: new Date().toISOString(), kit: 'v2' }]) });
    const msgs = await p;
    assert.ok(msgs.some((x) => x.events === s.events + 1), 'no update');
    assert.ok(Date.now() - t0 <= 2000, `update after ${Date.now() - t0} ms`);
  } finally {
    await srv.close();
    rmSync(data, { recursive: true, force: true });
  }
});

test('registration: only the name and an account hash reach the server; the same account keeps its id; bad bodies refused', async () => {
  const { x, store } = await api();
  const register = (body, code = 'ws-t') => x.fetch(new Request('http://p/register', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Workshop-Code': code }, body: JSON.stringify(body) }));
  const acc = (n) => String(n).padStart(64, 'a');
  try {
    let r = await register({ name: 'Ana Silva', account: acc(1) });
    assert.equal(r.status, 200);
    const ana = await r.json();
    assert.equal(ana.name, 'Ana Silva');
    assert.match(ana.p, /^[0-9a-f]{32}$/);
    assert.match(ana.credential, /^[0-9a-f]{64}$/, 'the credential is an HMAC signature');
    assert.equal((await post(x, [{ v: 1, ws: 'ws-t', p: ana.p, ev: 'check_ok', t: at(1), kit: 'v2' }], { 'X-Participant': `${ana.p}.${ana.credential}` })).status, 204);
    assert.equal((await (await register({ name: 'Ana Silva', room: 'B', account: acc(1) })).json()).p, ana.p, 'same account, same id (an old kit still sends a room: ignored)');
    // an old kit's event with a room is taken, and stored without it
    assert.equal((await post(x, [{ v: 1, ws: 'ws-t', room: 'A', p: ana.p, ev: 'mission_done', mission: 'M2', t: at(2), kit: 'v2' }], { 'X-Participant': `${ana.p}.${ana.credential}` })).status, 204);
    assert.ok(store.rows.at(-1).e.mission === 'M2' && !('room' in store.rows.at(-1).e));
    for (const bad of [{ name: 'X' }, { name: '', account: acc(2) }, { name: 'X', account: 'not-a-hash' }, { name: 'X'.repeat(101), account: acc(2) }]) {
      assert.equal((await register(bad)).status, 400, JSON.stringify(bad).slice(0, 60));
    }
    assert.equal((await register({ name: 'X', account: acc(3) }, 'other')).status, 403);
    // the server keeps the name and the hash: nothing else of the registration
    await x.flush();
    assert.deepEqual(Object.keys(JSON.parse(store.getMeta('participants'))), [acc(1)]);
    assert.equal((await get(x, '/state')).board.top[0].name, 'Ana Silva');
  } finally {
    x.close();
  }
});

test('ctl.mjs register: the account checked on the laptop; only the name and the account hash are sent; clear errors', async () => {
  const { register } = await import('../../telemetry/ctl.mjs');
  const data = mkdtempSync(join(tmpdir(), 'ws-reg-'));
  const srv = await startServer({ port: 0, data, ws: 'ws-t', adminToken: 'adm', throttleMs: 20 });
  const t = await telemetryHome(srv.url, { registered: false });
  const out = [];
  const sent = [];
  const spy = (u, o) => (sent.push(o?.body ?? ''), fetch(u, o));
  const marta = { id: 7, name: 'Marta Reis', emails: [{ email: 'marta@gmail.com', verified: true }, { email: 'marta@checkmarx.com', verified: true }] };
  try {
    const cfg = JSON.parse(readFileSync(t.P.config, 'utf8'));
    writeFileSync(t.P.config, JSON.stringify({ ...cfg, email_domain: 'checkmarx.com' }));
    const reg = (account, room) => register(room, { P: t.P, print: (m) => out.push(m), fetchImpl: spy, account: () => account });
    assert.equal(await reg({ error: 'gh' }), 4);
    assert.match(out.at(-1), /gh auth login/);
    assert.equal(await reg({ error: 'scope' }), 4);
    assert.match(out.at(-1), /gh auth refresh -h github\.com -s user:email/);
    assert.equal(await reg({ id: 8, name: 'X', emails: [{ email: 'x@example.com', verified: true }] }), 3);
    assert.equal(await reg({ id: 9, name: 'Y', emails: [{ email: 'y@checkmarx.com', verified: false }] }), 3, 'an unverified company email does not count');
    assert.match(out.at(-1), /@checkmarx\.com/);
    assert.equal(sent.length, 0, 'nothing is sent before the account is checked');
    assert.equal(await reg(marta, 'b'), 0, 'an old room argument is ignored');
    assert.match(out.at(-1), /Marta Reis/);
    assert.equal(sent.length, 1);
    const body = JSON.parse(sent[0]);
    assert.deepEqual(Object.keys(body).sort(), ['account', 'name']);
    assert.match(body.account, /^[0-9a-f]{64}$/);
    assert.ok(!sent[0].includes('checkmarx') && !sent[0].includes('gmail') && !sent[0].includes('"7"') && !sent[0].includes(':7'), 'no email and no raw account id leave the laptop');
    const c = JSON.parse(readFileSync(t.P.config, 'utf8'));
    assert.equal(c.room, undefined);
    assert.match(c.participant.credential, /^[0-9a-f]{64}$/);
    await sendQueue({ P: t.P });
    const s = await (await fetch(`${srv.url}/state`)).json();
    assert.deepEqual(s.board.top.map((r) => r.name), ['Marta Reis']);
  } finally {
    await srv.close();
    rmSync(t.base, { recursive: true, force: true });
    rmSync(data, { recursive: true, force: true });
  }
});

test('ctl.mjs unregister: nothing more is sent, the local book stays; register needs --again (the setup never brings the person back)', async () => {
  const { ctl } = await import('../../telemetry/ctl.mjs');
  const data = mkdtempSync(join(tmpdir(), 'ws-unreg-'));
  const srv = await startServer({ port: 0, data, ws: 'ws-t', adminToken: 'adm', throttleMs: 20 });
  const t = await telemetryHome(srv.url);
  const out = [];
  const print = (m) => out.push(m);
  try {
    const cfg0 = JSON.parse(readFileSync(t.P.config, 'utf8'));
    writeFileSync(t.P.config, JSON.stringify({ ...cfg0, email_domain: 'checkmarx.com' }));
    assert.deepEqual(record('mission_done', { mission: 'M1' }, { P: t.P }), { recorded: true, queued: true });
    queue(t.P, [ev(1, 'mission_done', 2, { mission: 'M2' })]);
    assert.equal(await ctl(['unregister'], { P: t.P, print }), 0);
    assert.match(out.at(-1), /register --again/);
    const c = JSON.parse(readFileSync(t.P.config, 'utf8'));
    assert.deepEqual([c.enabled, c.participant], [false, null]);
    assert.match(c.unregistered_at, /^\d{4}-/);
    assert.ok(!existsSync(t.P.queue) && !existsSync(t.P.sending), 'the events still waiting are deleted');
    const before = readLines(t.P.local).length;
    assert.ok(before >= 1, 'the local book stays');
    // afterwards: recorded locally, never queued, never sent
    assert.deepEqual(record('mission_done', { mission: 'M3' }, { P: t.P }), { recorded: true, queued: false });
    assert.equal(readLines(t.P.local).length, before + 1);
    assert.equal((await sendQueue({ P: t.P })).sent, 0);
    // register without --again (what the setup runs): refused, nothing leaves the laptop
    const sent = [];
    const spy = (u, o) => (sent.push(u), fetch(u, o));
    const marta = { id: 7, name: 'Marta Reis', emails: [{ email: 'marta@checkmarx.com', verified: true }] };
    assert.equal(await ctl(['register'], { P: t.P, print, fetchImpl: spy, account: () => marta }), 6);
    assert.equal(sent.length, 0);
    await ctl(['status'], { P: t.P, print });
    assert.ok(out.some((l) => /unregister/.test(l)), 'status says the person left the panel');
    // --again: back on the panel, and the flag is gone
    assert.equal(await ctl(['register', '--again'], { P: t.P, print, fetchImpl: spy, account: () => marta }), 0);
    const c2 = JSON.parse(readFileSync(t.P.config, 'utf8'));
    assert.ok(c2.participant?.p && !('unregistered_at' in c2));
  } finally {
    await srv.close();
    rmSync(t.base, { recursive: true, force: true });
    rmSync(data, { recursive: true, force: true });
  }
});

test('presenter view: for each mission, how many people are at it and who; only with the admin token, never in /state', async () => {
  const a = new Aggregate({ ws: 'ws-t' });
  const now = T0 + 30 * 60000;
  for (const [n, name] of [[1, 'Ana Silva'], [2, 'Rui Costa'], [3, 'Eva Lima'], [4, 'Zé Faria']]) a.apply(ev(n, 'register', 0, { name }));
  a.apply(ev(1, 'mission_done', 25, { mission: 'M1' }));
  a.apply(ev(1, 'mission_done', 26, { mission: 'M2' }));
  a.apply(ev(2, 'mission_done', 28, { mission: 'M1' }));
  a.apply(ev(3, 'check_ok', 5)); // quiet for 25 minutes: not active
  for (const m of ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M8', 'M9', 'M10']) a.apply(ev(4, 'mission_done', 29, { mission: m }));
  a.apply(ev(9, 'mission_done', 29, { mission: 'M1' })); // an unregistered person is never listed
  a.hide('Rui Costa');
  const v = a.presenter(now);
  const at = Object.fromEntries(v.missions.map((m) => [m.id, [m.at, m.done, m.names.map((x) => [x.name, x.active])]]));
  assert.equal(v.people, 4);
  assert.deepEqual(at.M1, [1, 3, [['Eva Lima', false]]], 'Eva has not done M1 yet; 3 registered did it');
  assert.deepEqual(at.M2, [1, 2, [[null, true]]], 'Rui is at M2, his name hidden but counted');
  assert.deepEqual(at.M3, [1, 1, [['Ana Silva', true]]]);
  assert.deepEqual(v.finished, { at: 1, names: [{ name: 'Zé Faria', active: true }] });
  // someone who skipped M2: at the mission after the last one done, with M2 as missing
  a.apply(ev(5, 'register', 0, { name: 'Lia Mota' }));
  for (const m of ['M1', 'M3', 'M4']) a.apply(ev(5, 'mission_done', 29, { mission: m }));
  const w = a.presenter(now);
  const lia = w.missions.flatMap((m) => m.names.map((x) => ({ ...x, at: m.id }))).find((x) => x.name === 'Lia Mota');
  assert.deepEqual([lia.at, lia.skipped], ['M5', ['M2']]);
  assert.deepEqual(w.missions.find((m) => m.id === 'M3').names.find((x) => x.name === 'Ana Silva').skipped, [], 'nothing skipped');
  // an old snapshot (v1, no last mission) is rebuilt from the events, keeping the phase and the hidden names
  const old = { ...JSON.parse(JSON.stringify(a)), v: 1, phase: 'missions' };
  const b = Aggregate.fromJSON(old);
  assert.deepEqual([b.stale, b.phase, [...b.hidden], b.people.size], [true, 'missions', ['Rui Costa'], 0]);
  assert.equal(a.state(now).presenter, undefined);
  // the API: 403 without the token, 200 with it
  const { x } = await api();
  try {
    await reg(x, 1, 'Ana Silva');
    assert.equal((await x.fetch(new Request('http://p/admin/presenter'))).status, 403);
    assert.equal((await x.fetch(new Request('http://p/admin/presenter', { headers: { 'X-Admin-Token': 'wrong' } }))).status, 403);
    const r = await x.fetch(new Request('http://p/admin/presenter', { headers: { 'X-Admin-Token': 'adm-secret' } }));
    assert.equal(r.status, 200);
    const j = await r.json();
    assert.deepEqual([j.people, j.missions[0].id, j.missions[0].names[0].name], [1, 'M1', 'Ana Silva']);
  } finally {
    x.close();
  }
});

test('API: a snapshot of the old format is rebuilt from every event (the last mission of each person), keeping the phase', async () => {
  const store = memoryStore();
  store.setMeta('day', new Date(T0 + 60 * 60000).toLocaleDateString('en-CA', { timeZone: 'UTC' }));
  store.append(ev(1, 'register', 0, { name: 'Ana Silva' }), 'r1');
  store.append(ev(1, 'mission_done', 5, { mission: 'M1' }), 'm1');
  store.append(ev(1, 'mission_done', 6, { mission: 'M3' }), 'm3');
  store.setMeta('snapshot', JSON.stringify({ v: 1, ws: 'ws-t', phase: 'p1', hidden: [], people: [] }));
  store.setMeta('snapshot_seq', '3');
  const { x } = await api({ store });
  try {
    const s = await get(x, '/state');
    assert.deepEqual([s.phase, s.board.people, s.summary.missions.M3.done], ['p1', 1, 1]);
    const v = await (await x.fetch(new Request('http://p/admin/presenter', { headers: { 'X-Admin-Token': 'adm-secret' } }))).json();
    const ana = v.missions.find((m) => m.names.some((n) => n.name === 'Ana Silva'));
    assert.deepEqual([ana.id, ana.names[0].skipped], ['M4', ['M2']]);
  } finally {
    x.close();
  }
});
