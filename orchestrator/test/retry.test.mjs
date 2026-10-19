// Tests of next-wave --retry <id>: runs one task again, with its attempts from zero, keeping the rest of the run.
process.env.WORKSHOP_LANG = 'en';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { proximaOnda, textoOnda } from '../next-wave.mjs';

const NEXT_WAVE = new URL('../next-wave.mjs', import.meta.url).pathname;
// Green when ok.txt exists in the project (the "fix" a person makes), red otherwise.
const WHEN_FIXED = ['node', '-e', 'process.exit(require("fs").existsSync("ok.txt") ? 0 : (console.log("✖ ok.txt is missing"), 1))'];
const OK = ['node', '-e', 'process.exit(0)'];

function project(tasks, config = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'ws-retry-'));
  const plan = {
    v: 1, project: 't', mode: 'test',
    config: { max_parallel: 4, max_attempts: 3, escalate_to: 'implementer', ...config },
    agents: { worker: { model: 'claude-haiku-5-5' }, implementer: { model: 'claude-sonnet-5-5' } },
    tasks: tasks.map((t) => ({ group_type: 'card', wave: 1, agent: 'worker', depends_on: [], files: [`cards/${t.id}/card.js`], instructions: `build ${t.id}`, ...t })),
  };
  writeFileSync(join(dir, 'plan.json'), JSON.stringify(plan));
  return { dir, plan: join(dir, 'plan.json') };
}
const state = (dir, id) => JSON.parse(readFileSync(join(dir, '.workshop', 'status', `${id}.json`), 'utf8'));
const run = (p, extra = {}) => proximaOnda({ projeto: p.dir, plano: p.plan, l: 'en', ...extra });

// Runs the swarm to the end (no agents: the tests decide). Returns the last result.
async function untilDone(p, extra = {}) {
  let r;
  for (let i = 0; i < 12; i++) {
    r = await run(p, extra);
    if (!r.chamadas.length) return r;
  }
  throw new Error('did not end');
}

test('--retry <id>: back to attempt 1 with the plan agent (Haiku), a batch with only that task, the rest kept', async () => {
  const p = project([{ id: 'x', test: WHEN_FIXED }, { id: 'y', test: OK }, { id: 'z', test: OK }]);
  try {
    const end = await untilDone(p);
    assert.equal(state(p.dir, 'x').estado, 'falhou');
    assert.equal(state(p.dir, 'x').tentativa, 3);
    assert.equal(state(p.dir, 'y').estado, 'verde');
    assert.match(textoOnda(end, 'en'), /STATE: DONE · 2 green, 1 failed/);
    const yBefore = readFileSync(join(p.dir, '.workshop', 'status', 'y.json'), 'utf8');

    // The person fixes the cause, then: --retry x.
    writeFileSync(join(p.dir, 'ok.txt'), 'fixed');
    let r = await run(p, { retry: 'x' });
    assert.deepEqual(r.lote.map((t) => t.id), ['x']);
    assert.equal(r.chamadas.length, 1);
    assert.equal(r.chamadas[0].subagent_type, 'worker');
    assert.match(r.chamadas[0].prompt, /^TASK: x\nAGENT: worker-\d\d\nATTEMPT: 1\n/);
    assert.doesNotMatch(r.chamadas[0].prompt, /Attempt \d failed/, 'a fresh start: no excerpt of the old failure');
    assert.equal(state(p.dir, 'x').estado, 'em_curso');
    assert.equal(state(p.dir, 'x').repeticoes, 1);
    assert.match(textoOnda(r, 'en'), /STATE: BATCH \d+ · wave 1 · 1 agent\(s\)[\s\S]*<<<CALLS[\s\S]*CALLS>>>/);
    assert.equal(readFileSync(join(p.dir, '.workshop', 'status', 'y.json'), 'utf8'), yBefore, 'the other tasks are not touched');
    const events = readFileSync(join(p.dir, '.workshop', 'events.jsonl'), 'utf8');
    assert.match(events, /"tipo":"retry","tarefa":"x","antes":"falhou","tentativa":3/);

    // The same command again: grades x (green) and ends with the usual markers.
    r = await run(p, { retry: 'x' });
    assert.equal(r.chamadas.length, 0);
    assert.equal(state(p.dir, 'x').estado, 'verde');
    const out = textoOnda(r, 'en');
    assert.match(out, /## Previous batch result/);
    assert.match(out, /Retry of x: green\./);
    assert.match(out, /STATE: DONE · 3 green, 0 failed/);
    // A normal next-wave afterwards has nothing to do.
    assert.equal((await run(p)).chamadas.length, 0);
  } finally {
    rmSync(p.dir, { recursive: true, force: true });
  }
});

test('--retry <id>: still red, it is launched again (the last attempt on Sonnet) and ends failed', async () => {
  const p = project([{ id: 'x', test: WHEN_FIXED }]);
  try {
    await untilDone(p);
    const agents = [];
    let r = await run(p, { retry: 'x' });
    while (r.chamadas.length) {
      agents.push(r.chamadas[0].subagent_type + ' ' + /ATTEMPT: (\d)/.exec(r.chamadas[0].prompt)[1]);
      r = await run(p, { retry: 'x' });
    }
    assert.deepEqual(agents, ['worker 1', 'worker 2', 'implementer 3']);
    assert.equal(state(p.dir, 'x').estado, 'falhou');
    assert.match(textoOnda(r, 'en'), /Retry of x: failed again[\s\S]*STATE: DONE · 0 green, 1 failed/);
  } finally {
    rmSync(p.dir, { recursive: true, force: true });
  }
});

test('--retry <id> in the middle of a run: the running batch is graded, only that task is launched, STATE: DONE at the end', async () => {
  const p = project([{ id: 'a', test: WHEN_FIXED }, { id: 'b', test: OK, depends_on: ['a'] }, { id: 'c', test: OK }], { max_attempts: 1 });
  try {
    await run(p); // a and c running
    await run(p); // a red -> failed (1 attempt), c green; b launched
    assert.equal(state(p.dir, 'b').estado, 'em_curso');
    writeFileSync(join(p.dir, 'ok.txt'), 'fixed');
    let r = await run(p, { retry: 'a' });
    assert.deepEqual(r.lote.map((t) => t.id), ['a']);
    assert.equal(state(p.dir, 'b').estado, 'verde', 'the running batch is graded as usual');
    r = await run(p, { retry: 'a' });
    assert.equal(state(p.dir, 'a').estado, 'verde');
    assert.match(textoOnda(r, 'en'), /STATE: DONE/);
  } finally {
    rmSync(p.dir, { recursive: true, force: true });
  }
});

test('--retry: unknown id, missing id and a task whose dependencies are not done are clear errors', async () => {
  const p = project([{ id: 'a', test: OK }, { id: 'b', test: OK, depends_on: ['a'] }]);
  try {
    await assert.rejects(run(p, { retry: 'nope' }), /the task nope is not in the plan/);
    await assert.rejects(run(p, { retry: '' }), /the task id is missing: --retry <id>/);
    await assert.rejects(run(p, { retry: 'b' }), /b still waits for a: run the swarm first/);
    // From the command line: ERROR: and exit 1; "--retry" alone is not a normal run.
    for (const a of [['--retry'], ['--retry', '--max', '2'], ['--retry', 'nope']]) {
      const r = spawnSync(process.execPath, [NEXT_WAVE, '--project', p.dir, ...a], { encoding: 'utf8', env: { ...process.env, WORKSHOP_LANG: 'en' } });
      assert.equal(r.status, 1, a.join(' '));
      assert.match(r.stderr, /^ERROR: /);
    }
    assert.ok(!existsSync(join(p.dir, '.workshop', 'status', 'a.json')), 'nothing was launched');
    // A task with no dependencies can be retried before the swarm ran: it is just run alone.
    const r = await run(p, { retry: 'a' });
    assert.deepEqual(r.lote.map((t) => t.id), ['a']);
    const out = spawnSync(process.execPath, [NEXT_WAVE, '--project', p.dir, '--retry', 'a'], { encoding: 'utf8', env: { ...process.env, WORKSHOP_LANG: 'en' } });
    assert.equal(out.status, 0, out.stderr);
    assert.match(out.stdout, /Retry of a: green\.\n\nSTATE: DONE · 1 green, 0 failed/);
  } finally {
    rmSync(p.dir, { recursive: true, force: true });
  }
});

test('a card broken on purpose (spec_gap in the plan) fails for good on its first failed attempt, motivo "spec"; --retry grades the person\'s attempt the same way', async () => {
  // A plain failing test: the flag decides, not the message.
  const p = project([{ id: 'x', test: WHEN_FIXED, spec_gap: true }, { id: 'y', test: WHEN_FIXED }]);
  try {
    let r = await untilDone(p);
    let st = state(p.dir, 'x');
    assert.equal(st.estado, 'falhou');
    assert.equal(st.tentativa, 1, 'only the first attempt');
    assert.equal(st.motivo, 'spec');
    assert.match(st.teste.excerto, /ok\.txt is missing/, 'the test message is kept for /status');
    // The same plan without the flag: the usual 3 attempts and no motivo.
    assert.equal(state(p.dir, 'y').tentativa, 3);
    assert.equal(state(p.dir, 'y').motivo, undefined);
    assert.match(textoOnda(r, 'en'), /STATE: DONE · 0 green, 2 failed/);

    // The person decided wrong: --retry runs one attempt (Haiku) and fails for good again, with no automatic retries.
    const agents = [];
    r = await run(p, { retry: 'x' });
    while (r.chamadas.length) {
      agents.push(r.chamadas[0].subagent_type + ' ' + /ATTEMPT: (\d)/.exec(r.chamadas[0].prompt)[1]);
      r = await run(p, { retry: 'x' });
    }
    assert.deepEqual(agents, ['worker 1']);
    st = state(p.dir, 'x');
    assert.equal(st.estado, 'falhou');
    assert.equal(st.motivo, 'spec');
    assert.equal(st.repeticoes, 1);
    assert.match(textoOnda(r, 'en'), /Retry of x: failed again/);

    // Decided right this time: --retry is graded green and the motivo goes away.
    writeFileSync(join(p.dir, 'ok.txt'), '');
    await untilDone(p, { retry: 'x' });
    st = state(p.dir, 'x');
    assert.equal(st.estado, 'verde');
    assert.equal(st.tentativa, 1);
    assert.equal(st.motivo, undefined);
  } finally {
    rmSync(p.dir, { recursive: true, force: true });
  }
});

test('a plan without the flag: the broken-card message of the test (new and old wording) still fails it at once', async () => {
  const messages = [
    '✖ AssertionError: the card marks the indexes [1, 2] as unsafe, but that is not the answer the test expects. cards/x/spec.md does not say which lines count as unsafe.',
    '✖ AssertionError: o cartão aceita ["403"], mas não é essa a resposta que o teste espera. A spec cards/x/spec.md não diz que respostas são aceites.',
    '✖ cards/x/spec.md is missing a detail the test checks: the right answer.',
  ];
  for (const m of messages) {
    const GAP = ['node', '-e', `process.exit(require("fs").existsSync("ok.txt") ? 0 : (console.log(${JSON.stringify(m)}), 1))`];
    const p = project([{ id: 'x', test: GAP }]);
    try {
      await untilDone(p);
      const st = state(p.dir, 'x');
      assert.equal(st.estado, 'falhou', m);
      assert.equal(st.tentativa, 1, m);
      assert.equal(st.motivo, 'spec', m);
      writeFileSync(join(p.dir, 'ok.txt'), '');
      await untilDone(p, { retry: 'x' });
      assert.equal(state(p.dir, 'x').estado, 'verde', m);
    } finally {
      rmSync(p.dir, { recursive: true, force: true });
    }
  }
});

test('--retry: when the SubagentStop hook grades the task before the next call, that call closes the retry (no loop)', async () => {
  const p = project([{ id: 'x', test: WHEN_FIXED }, { id: 'y', test: OK }]);
  try {
    await untilDone(p);
    writeFileSync(join(p.dir, 'ok.txt'), '');
    let r = await run(p, { retry: 'x' });
    assert.equal(r.chamadas.length, 1, 'the retry launches one agent');
    // The hook grades it first (as in a real session), then the skill calls the same command again.
    const { grade } = await import('../grade.mjs');
    const plan = JSON.parse(readFileSync(p.plan, 'utf8'));
    await grade(p.dir, plan, plan.tasks.find((t) => t.id === 'x'));
    assert.equal(state(p.dir, 'x').estado, 'verde');
    r = await run(p, { retry: 'x' });
    assert.equal(r.chamadas.length, 0, 'no new attempt: the retry is closed');
    assert.equal(state(p.dir, 'x').estado, 'verde');
    assert.match(textoOnda(r, 'en'), /STATE: DONE/);
    // A later, new /demo-swarm --retry x starts again.
    r = await run(p, { retry: 'x' });
    assert.equal(r.chamadas.length, 1, 'a new retry after the closed one starts again');
  } finally {
    rmSync(p.dir, { recursive: true, force: true });
  }
});
