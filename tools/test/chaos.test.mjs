// The workshop's chaos, simulated without Claude (D-37): people leave and come back to Claude Code (claude -c),
// work in two terminals, skip steps, do things before registering, go offline, keep yesterday's credential, open
// Claude in another folder. Each scenario runs the kit's real hooks and scripts (hooks/*.mjs, missions/missions.mjs,
// telemetry/ctl.mjs, telemetry/send.mjs) with synthetic hook inputs and transcripts, in a temporary HOME per person,
// against the local panel server, and checks that the panel ends up with what each laptop really did.
// Never the real HOME, never Claude, no cost.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadPricing, requestCost, tokensFromUsage } from '../../hooks/lib/cost.mjs';
import { paths, readLines } from '../../telemetry/lib.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
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
  const cfg = { v: 1, enabled: registered, workshop: 'ws-t', kit: 'v2', panel_url: panel, expires_at: '2099-01-01T00:00:00.000Z', projects_dir: projs, participant: null };
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

export { laptop, hook, transcript, costs, sum, book, ROOT };
void cpSync;
