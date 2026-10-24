// Chaos with a whole room (D-37): 200 laptops, each its own HOME with the kit's real hooks and scripts, against one local
// panel (panel/server.mjs, the same code as the Worker). Every laptop lives one story out of eight (registered from the
// start, registered halfway, claude -c with two terminals, offline for a block, skips ahead to M11, never registers,
// registers in the same minute as everybody, leaves with unregister). At the end the panel's totals have to equal the sum
// of the local books of the people who are registered. Not part of tools/test-all.sh's default run time budget: set
// CHAOS_PEOPLE to change the size (default 200).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadPricing, requestCost, tokensFromUsage } from '../../hooks/lib/cost.mjs';
import { paths, readLines } from '../../telemetry/lib.mjs';
import { register } from '../../telemetry/ctl.mjs';
import { sendQueue } from '../../telemetry/send.mjs';
import { startServer } from '../../panel/server.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
process.env.WORKSHOP_TELEMETRY_NO_SEND = '1';
const N = Number(process.env.CHAOS_PEOPLE || 200);
const PRICING = loadPricing(join(ROOT, 'pricing.json'));
const MODEL = 'claude-sonnet-5-5';
const usage = (i) => ({ input_tokens: 1000 + i, output_tokens: 200 + i, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 });
const costOf = (i) => requestCost(tokensFromUsage(usage(i)), MODEL, PRICING).usd;
const CHECK = { WORKSHOP_CHECK_EVERY_MS: '1500' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// a pool: at most `max` child processes at once, so 200 laptops do not start 800 nodes together
function pool(max) {
  let running = 0;
  const waiting = [];
  const next = () => {
    while (running < max && waiting.length) {
      running++;
      waiting.shift()();
    }
  };
  return (fn) =>
    new Promise((ok, no) => {
      waiting.push(() => fn().then(ok, no).finally(() => (running--, next())));
      next();
    });
}
const slot = pool(12);

function laptop(i, panel) {
  const home = mkdtempSync(join(tmpdir(), 'ws-c200-'));
  const projs = join(home, 'workshop-claude');
  const missions = join(projs, 'missions-project');
  mkdirSync(join(missions, '.workshop'), { recursive: true });
  mkdirSync(join(missions, '.claude'), { recursive: true });
  const tel = join(home, '.workshop-claude', 'telemetry');
  mkdirSync(tel, { recursive: true });
  writeFileSync(join(tel, 'config.json'), JSON.stringify({ v: 1, enabled: false, workshop: 'ws-t', kit: 'v2', panel_url: panel, email_domain: 'checkmarx.com', expires_at: '2099-01-01T00:00:00.000Z', projects_dir: projs, participant: null }));
  const env = { PATH: process.env.PATH, HOME: home, USERPROFILE: home, WS_HOME_OVERRIDE: home, WORKSHOP_TELEMETRY_DIR: tel, WORKSHOP_TELEMETRY_NO_SEND: '1', CLAUDE_PROJECT_DIR: missions, WORKSHOP_LANG: 'en' };
  return { i, name: `Person ${String(i).padStart(3, '0')}`, home, projs, missions, tel, P: paths(tel), env, registered: false, left: false };
}

// a hook, like Claude Code runs it
const hook = (l, script, input, extra = {}) =>
  slot(
    () =>
      new Promise((ok, no) => {
        const c = spawn(process.execPath, [join(ROOT, 'hooks', script)], { env: { ...l.env, ...extra }, stdio: ['pipe', 'ignore', 'pipe'] });
        let err = '';
        c.stderr.on('data', (d) => (err += d));
        c.on('close', (code) => (code === 0 ? ok() : no(new Error(`${script}: ${err}`))));
        c.stdin.end(JSON.stringify(input));
      }),
  );
const tele = (l, input, extra = {}) => hook(l, 'telemetry.mjs', { cwd: l.missions, ...input }, { ...CHECK, ...extra });
const plan = (l, sid) => tele(l, { hook_event_name: 'UserPromptSubmit', session_id: sid, permission_mode: 'plan' });
const haiku = (l, sid) => tele(l, { hook_event_name: 'SessionStart', session_id: sid, source: 'startup', model: 'claude-haiku-5-5' });
function transcript(l, name, ids) {
  const f = join(l.home, `${name}.jsonl`);
  const rows = [{ type: 'user', message: { role: 'user', content: 'hello' }, timestamp: '2026-11-20T09:00:00.000Z' }];
  for (const k of ids) rows.push({ type: 'assistant', timestamp: '2026-11-20T09:01:00.000Z', message: { id: `msg_${l.i}_${k}`, model: MODEL, usage: usage(k), content: [] } });
  writeFileSync(f, rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
  return f;
}
const stop = (l, sid, ids) => hook(l, 'stop.mjs', { session_id: sid, transcript_path: transcript(l, sid, ids), cwd: l.missions });
async function book(l, want, ms = 20000) {
  const t0 = Date.now();
  for (;;) {
    const done = Object.keys(JSON.parse(existsSync(l.P.missions) ? readFileSync(l.P.missions, 'utf8') : '{"done":{}}').done || {});
    if (want.every((m) => done.includes(m)) || Date.now() - t0 > ms) return done;
    await sleep(150);
  }
}
const account = (l) => () => ({ id: 1000 + l.i, name: l.name, emails: [{ email: `p${l.i}@checkmarx.com`, verified: true }] });
const reg = async (l) => {
  const r = await register(undefined, { P: l.P, print: () => {}, account: account(l) });
  l.registered = r === 0;
  return r;
};
const costs = (l) => readLines(l.P.local).filter((e) => e.ev === 'cost');
const sum = (list) => Math.round(list.reduce((a, e) => a + e.cost_usd, 0) * 1e6) / 1e6;

const STORIES = ['early', 'late', 'resume', 'offline', 'skip', 'never', 'burst', 'leaves'];

// what each story does (all of them leave their facts in the local book)
async function live(l, panelUrl, story) {
  const ids = (k) => [l.i * 10 + k, l.i * 10 + k + 1];
  switch (story) {
    case 'early':
      await reg(l);
      await plan(l, 'a');
      await book(l, ['M1']);
      await haiku(l, 'b');
      await book(l, ['M1', 'M2']);
      await stop(l, 'b', ids(1));
      break;
    case 'late':
      await plan(l, 'a');
      await book(l, ['M1']);
      await stop(l, 'a', ids(1));
      await sleep(300);
      await reg(l);
      await haiku(l, 'b');
      await book(l, ['M1', 'M2']);
      break;
    case 'resume':
      await reg(l);
      await plan(l, 'a');
      await book(l, ['M1']);
      await stop(l, 'a', ids(1));
      await Promise.all([stop(l, 'b', [...ids(1), l.i * 10 + 3]), stop(l, 'c', [...ids(1), l.i * 10 + 3, l.i * 10 + 4])]);
      await stop(l, 'b', [...ids(1), l.i * 10 + 3]);
      break;
    case 'offline': {
      await reg(l);
      const real = JSON.parse(readFileSync(l.P.config, 'utf8'));
      writeFileSync(l.P.config, JSON.stringify({ ...real, panel_url: 'http://127.0.0.1:9' }));
      await plan(l, 'a');
      await haiku(l, 'b');
      await book(l, ['M1', 'M2']);
      await stop(l, 'b', ids(1));
      await sendQueue({ P: l.P });
      writeFileSync(l.P.config, JSON.stringify(real));
      break;
    }
    case 'skip': {
      await reg(l);
      const canivete = join(l.projs, 'canivete-project');
      mkdirSync(canivete, { recursive: true });
      await tele(l, { hook_event_name: 'PostToolUse', session_id: 'e1', tool_name: 'mcp__canivete__my-01', tool_input: {}, tool_response: {}, cwd: canivete }, { CLAUDE_PROJECT_DIR: canivete });
      await book(l, ['M11']);
      await plan(l, 'e2');
      await book(l, ['M1', 'M11']);
      break;
    }
    case 'never':
      await plan(l, 'a');
      await book(l, ['M1']);
      await stop(l, 'a', ids(1));
      break;
    case 'burst':
      await reg(l);
      await haiku(l, 'a');
      await book(l, ['M2']);
      await plan(l, 'b');
      await book(l, ['M1', 'M2']);
      await stop(l, 'b', ids(1));
      break;
    case 'leaves': {
      await reg(l);
      await plan(l, 'a');
      await book(l, ['M1']);
      await sendQueue({ P: l.P });
      const { unregister } = await import('../../telemetry/ctl.mjs');
      await unregister({ P: l.P, print: () => {} });
      l.left = true;
      await haiku(l, 'b');
      await book(l, ['M1', 'M2']);
      break;
    }
  }
}

test(`${N} laptops, eight stories, one panel: the panel equals the sum of the registered local books`, { timeout: 900000 }, async () => {
  const data = mkdtempSync(join(tmpdir(), 'ws-c200-panel-'));
  // the panel's clock can jump: the registration limit is per minute, so a refused laptop is retried a minute later
  let skew = 0;
  const srv = await startServer({ port: 0, data, ws: 'ws-t', adminToken: 'adm', throttleMs: 50, now: () => Date.now() + skew });
  const people = Array.from({ length: N }, (_, i) => laptop(i + 1, srv.url));
  const story = (l) => STORIES[l.i % STORIES.length];
  try {
    const t0 = Date.now();
    // the whole room works at the same time
    await Promise.all(people.map((l) => live(l, srv.url, story(l))));
    // the room registers again in the same minute (the burst story registered above; a re-run is the same account)
    const retry = people.filter((l) => !l.registered && story(l) !== 'never' && story(l) !== 'leaves');
    const rejected = retry.length;
    // the panel takes 400 registrations a minute (a room of 200 re-registering after the midnight wipe is not refused)
    if (N <= 300) assert.equal(rejected, 0, 'nobody is refused in the burst');
    const waiting = () => people.filter((x) => !x.registered && story(x) !== 'never' && !x.left);
    for (let round = 0; round < 4 && waiting().length; round++) {
      skew += 61000;
      for (const l of waiting()) await reg(l);
    }
    assert.equal(waiting().length, 0, 'everybody gets in after at most a few minutes');
    console.log(`# ${N} laptops lived their stories in ${Math.round((Date.now() - t0) / 1000)} s; ${rejected} registrations were refused in the burst`);
    // everybody who can sends what they have (some send in parallel, like the real senders)
    await Promise.all(people.map((l) => slot(() => sendQueue({ P: l.P }))));
    await Promise.all(people.map((l) => slot(() => sendQueue({ P: l.P }))));

    // the books: the people who stay registered (never = never registered; leaves = left the panel)
    const onPanel = people.filter((l) => l.registered && !l.left);
    const local = onPanel.map((l) => {
      const done = new Set(readLines(l.P.local).filter((e) => e.ev === 'mission_done').map((e) => e.mission));
      return { name: l.name, missions: done, cost: sum(costs(l)) };
    });
    // a person who left the panel keeps what was sent before leaving (unregister drops only the queue), so they are on the
    // panel too, with the missions they had sent
    const st = await (await fetch(`${srv.url}/state`)).json();
    const pres = await (await fetch(`${srv.url}/admin/presenter`, { headers: { 'X-Admin-Token': 'adm' } })).json();
    const leavers = people.filter((l) => l.registered && l.left);
    const nm = new Set([...pres.missions.flatMap((m) => m.names), ...pres.finished.names].map((n) => n.name));
    console.log('# counts', pres.people, st.summary.people, st.board.people, onPanel.length, leavers.length, people.filter((l) => l.registered).length);
    console.log('# missing', people.filter((l) => l.registered && !nm.has(l.name)).map((l) => l.name + ':' + story(l)).join(' '));
    assert.equal(st.summary.people, onPanel.length + leavers.length, 'everybody who registered is on the panel, once');
    for (const m of st.missions) {
      const want = local.filter((x) => x.missions.has(m)).length + leavers.filter(() => m === 'M1').length;
      assert.equal(st.summary.missions[m].done, want, `${m}: people who did it`);
      assert.equal(pres.missions.find((x) => x.id === m).done, want, `${m}: presenter`);
    }
    const names = new Set([...pres.missions.flatMap((m) => m.names), ...pres.finished.names].map((n) => n.name));
    for (const x of local) assert.ok(names.has(x.name), `${x.name} is in the presenter view`);
    assert.equal(pres.people, st.summary.people);
    const paid = local.filter((x) => x.cost > 0);
    const want = paid.reduce((a, x) => a + x.cost, 0);
    // the leavers sent no cost before leaving, so the panel's cost is exactly the paid people's
    assert.equal(st.summary.cost_avg_usd, Math.round((want / paid.length) * 1000) / 1000, 'the cost is the sum of the books');
    // the one person per story we can check one by one: the top of the board is real people with real missions
    for (const r of st.board.top) {
      const l = local.find((x) => x.name === r.name);
      if (l) assert.deepEqual(r.missions, st.missions.filter((m) => l.missions.has(m)), r.name);
    }
    // nothing of the never-registered reached the panel
    const lone = people.filter((l) => story(l) === 'never');
    for (const l of lone) assert.equal(JSON.parse(readFileSync(l.P.config, 'utf8')).participant, null);
  } finally {
    for (const l of people) rmSync(l.home, { recursive: true, force: true });
    await srv.close();
    rmSync(data, { recursive: true, force: true });
    void chmodSync;
  }
});
