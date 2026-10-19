// The Pocketknife (Project 1 of workshop v2, docs/pt/WORKSHOP-V2-SPEC.md section 5): the generator with your tool
// (and its panel event), the 3 tools broken on purpose (the "obvious" answer is rejected and the message never
// gives the right one), the assembled catalogue without the answers, and the plan's decisions (D2, D3, D4) with the
// p1_plan event.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { montar } from '../../installer/assemble-canivete.mjs';
import { canon } from '../../canivete-project/tools/gaps.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CAT = (l) => JSON.parse(readFileSync(join(ROOT, 'canivete-project', ...(l === 'en' ? ['i18n', 'en'] : []), 'specs', 'tools.json'), 'utf8'));

// The telemetry of an installed kit in a fake HOME: the project's engine finds it in ~/.workshop-claude/kit/telemetry.
function telemetryDir(base) {
  cpSync(join(ROOT, 'telemetry'), join(base, '.workshop-claude', 'kit', 'telemetry'), { recursive: true });
  const dir = join(base, '.workshop-claude', 'telemetry');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'config.json'), JSON.stringify({ v: 1, enabled: false, expires_at: '2099-01-01T00:00:00.000Z' }));
  return dir;
}
const env = (dir) => ({ PATH: process.env.PATH, WORKSHOP_TELEMETRY_DIR: dir, WS_HOME_OVERRIDE: join(dir, '..', '..'), WORKSHOP_LANG: '' });
// a child node --test must not inherit the parent runner's context (it would always exit with 0)
const clean = () => {
  const e = { ...process.env };
  delete e.NODE_TEST_CONTEXT;
  return e;
};
const local = (dir) => (existsSync(join(dir, 'local.jsonl')) ? readFileSync(join(dir, 'local.jsonl'), 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);

for (const l of ['pt', 'en']) {
  test(`assembled (${l}): generated specs and tests, the catalogue without the answers, skills, engine and the start tag`, async () => {
    const base = mkdtempSync(join(tmpdir(), `canivete-asm-${l}-`));
    try {
      const dest = join(base, 'Ana Ç', 'canivete-project');
      assert.equal((await montar({ dest, lingua: l, node: process.execPath, git: true })).status, 'assembled');
      const cat = JSON.parse(readFileSync(join(dest, 'specs', 'tools.json'), 'utf8'));
      const kit = CAT(l);
      for (const t of kit.tools.filter((x) => x.spec_gaps?.length)) {
        const g = cat.tools.find((x) => x.id === t.id).spec_gaps[0];
        assert.deepEqual(Object.keys(g).sort(), ['cases', 'what']);
        for (const c of g.cases) assert.deepEqual(Object.keys(c).sort(), ['in', 'right']);
        const text = JSON.stringify(cat.tools.find((x) => x.id === t.id)) + readFileSync(join(dest, 'tools', t.id, 'spec.md'), 'utf8') + readFileSync(join(dest, 'tools', t.id, 'tool.test.js'), 'utf8');
        // every distinctive value of a right output (not a trivial number, not in an example) stays out of the project
        const leaves = (v) => (v && typeof v === 'object' ? Object.values(v).flatMap(leaves) : [v]);
        const shown = new Set(t.examples.flatMap((e) => leaves(e.out)).map(String));
        for (const c of t.spec_gaps[0].cases)
          for (const v of leaves(c.out).map(String).filter((x) => x.length >= 4 && !shown.has(x)))
            assert.ok(!text.includes(v) && !text.includes(v.replace('.', ',')), `${t.id}: the right output ${v} is in the project`);
        assert.ok(!text.includes(t.spec_gaps[0].rule.slice(0, 40)), `${t.id}: the rule is in the project`);
      }
      for (const t of kit.tools) assert.ok(existsSync(join(dest, 'tools', t.id, 'tool.test.js')), t.id);
      assert.equal(spawnSync(process.execPath, ['tools/gen.mjs', '--check'], { cwd: dest, encoding: 'utf8' }).status, 0, 'gen --check keeps the assembled project');
      assert.deepEqual(readdirSync(join(dest, '.claude', 'skills')).sort(), ['demo-cost', 'demo-plan', 'demo-reset', 'demo-review', 'demo-swarm', 'design-taste-frontend', 'memory']);
      assert.ok(!existsSync(join(dest, 'tools', 'workshop', 'hooks', 'telemetry.mjs')));
      assert.ok(!existsSync(join(dest, 'tools', 'workshop', 'orchestrator', 'test')));
      assert.ok(existsSync(join(dest, 'tools', 'workshop', 'orchestrator', 'lib', 'telemetry.mjs')));
      const s = JSON.parse(readFileSync(join(dest, '.claude', 'settings.json'), 'utf8'));
      assert.ok(s.permissions.deny.includes('Edit(tools/*/spec.md)') && s.permissions.deny.includes('Edit(tools/*/tool.test.js)'));
      // the demo agents name the Pocketknife's contract and files, never the Arena's cards (installer/lib/project-agents.mjs)
      const worker = readFileSync(join(dest, '.claude', 'agents', 'worker.md'), 'utf8');
      assert.ok(worker.includes('tools/CONTRACT.md') && worker.includes('tools/<id>/tool.js'), 'worker.md names the Pocketknife files');
      for (const a of readdirSync(join(dest, '.claude', 'agents'))) assert.doesNotMatch(readFileSync(join(dest, '.claude', 'agents', a), 'utf8'), /Arena|card|\{\{/i, a);
      assert.equal(spawnSync('git', ['-C', dest, 'tag'], { encoding: 'utf8' }).stdout.trim(), 'canivete-start');
      assert.equal((await montar({ dest, lingua: l, node: process.execPath })).status, 'already_there');
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });
}

// A tool.js that answers from a table: the examples right, the gap cases with the obvious answer (or the right one).
function tableTool(t, gapOut) {
  const rows = [...t.examples.filter((e) => e.out !== undefined).map((e) => [e.in, e.out]), ...t.spec_gaps[0].cases.map((c, i) => [c.in, gapOut(c, i)])];
  return `import { ${t.template} } from '../../templates/${t.template}.js';
const ROWS = ${JSON.stringify(rows)};
const key = (o) => JSON.stringify(Object.keys(o).sort().map((k) => [k, o[k]]));
let current = null;
const tool = ${t.template}({ id: ${JSON.stringify(t.id)}, title: ${JSON.stringify(t.title)}, inputs: ${JSON.stringify(t.inputs)}, run() { const r = ROWS.find(([i]) => key(i) === current); return r ? r[1] : null; } });
const run = tool.run;
tool.run = (values, o) => { current = key(Object.fromEntries(Object.entries(values).filter(([, v]) => v !== undefined))); return run(values, o); };
export default tool;
`;
}

for (const l of ['pt', 'en']) {
  test(`the 3 ambiguous tools (${l}): the obvious answer is rejected with a message that never gives the right one`, async () => {
    const base = mkdtempSync(join(tmpdir(), `canivete-gap-${l}-`));
    try {
      const dest = join(base, 'p');
      await montar({ dest, lingua: l, node: process.execPath, git: false });
      const gapTools = CAT(l).tools.filter((t) => t.spec_gaps?.length);
      assert.deepEqual(gapTools.map((t) => t.id).sort(), ['dn-01', 'nm-03', 'tx-02']);
      for (const t of gapTools) {
        const file = join(dest, 'tools', t.id, 'tool.js');
        writeFileSync(file, tableTool(t, (c, i) => t.spec_gaps[0].obvious[i]));
        let r = spawnSync(process.execPath, ['--test', `tools/${t.id}/tool.test.js`], { cwd: dest, encoding: 'utf8', env: clean() });
        assert.notEqual(r.status, 0, `${t.id}: the obvious answer passes`);
        const out = r.stdout + r.stderr;
        for (const c of t.spec_gaps[0].cases) {
          if (t.spec_gaps[0].obvious.some((o) => canon(o) === canon(c.out))) continue;
          assert.ok(!out.includes(canon(c.out)) && !out.includes(JSON.stringify(c.out)), `${t.id}: the message gives ${canon(c.out)} away`);
        }
        assert.match(out, new RegExp(`/demo-swarm --retry ${t.id}`));
        writeFileSync(file, tableTool(t, (c) => c.out));
        r = spawnSync(process.execPath, ['--test', `tools/${t.id}/tool.test.js`], { cwd: dest, encoding: 'utf8', env: clean() });
        assert.equal(r.status, 0, `${t.id}: the right answer fails: ${r.stdout.slice(-400)}`);
      }
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });
}

test('your tool: the example works as it is; gen generates my-01 and records p1_tool_created once; errors are explained', async () => {
  const base = mkdtempSync(join(tmpdir(), 'canivete-mine-'));
  try {
    const dest = join(base, 'p');
    await montar({ dest, lingua: 'pt', node: process.execPath, git: false });
    const tel = telemetryDir(base);
    cpSync(join(dest, 'specs', 'my-tool.example.json'), join(dest, 'specs', 'my-tool.json'));
    let r = spawnSync(process.execPath, ['tools/gen.mjs'], { cwd: dest, encoding: 'utf8', env: env(tel) });
    assert.equal(r.status, 0, r.stderr);
    assert.ok(existsSync(join(dest, 'tools', 'my-01', 'tool.test.js')));
    assert.match(readFileSync(join(dest, 'tools', 'my-01', 'spec.md'), 'utf8'), /Minutos em horas/);
    spawnSync(process.execPath, ['tools/gen.mjs'], { cwd: dest, encoding: 'utf8', env: env(tel) });
    assert.deepEqual(local(tel).map((e) => [e.ev, e.tool_template]), [['p1_tool_created', 'calc']]);
    writeFileSync(join(dest, 'specs', 'my-tool.json'), '{ "title": "x", "template": "magic", }');
    r = spawnSync(process.execPath, ['tools/gen.mjs'], { cwd: dest, encoding: 'utf8', env: env(tel) });
    assert.equal(r.status, 1);
    assert.match(r.stderr, /não é JSON válido: há um erro na linha 1/);
    writeFileSync(join(dest, 'specs', 'my-tool.json'), JSON.stringify({ title: 'x', template: 'magic', inputs: [] }));
    r = spawnSync(process.execPath, ['tools/gen.mjs'], { cwd: dest, encoding: 'utf8', env: env(tel) });
    assert.match(r.stderr, /"title" tem de ser um texto com 3 a 60/);
    assert.match(r.stderr, /"template" tem de ser um destes: calc, convert, text, generate/);
    assert.match(r.stderr, /falta o campo "concept"/);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('the plan: --parallel 4|8|12, --model haiku|sonnet, --forecast; the broken tools flagged; p1_plan with the decisions', { skip: !existsSync(join(ROOT, 'canivete-project', 'tools', 'engine.mjs')) }, async () => {
  const base = mkdtempSync(join(tmpdir(), 'canivete-plan-'));
  try {
    const dest = join(base, 'p');
    await montar({ dest, lingua: 'en', node: process.execPath, git: false });
    const tel = telemetryDir(base);
    const plan = (...a) => spawnSync(process.execPath, ['tools/plan.mjs', ...a], { cwd: dest, encoding: 'utf8', env: env(tel) });
    let r = plan('--parallel', '12', '--model', 'sonnet', '--forecast', '6');
    assert.equal(r.status, 0, r.stderr);
    let p = JSON.parse(readFileSync(join(dest, 'plan.json'), 'utf8'));
    const tools = p.tasks.filter((t) => t.group_type === 'card');
    assert.equal(p.config.max_parallel, 12);
    assert.ok(tools.every((t) => t.agent === 'implementer'));
    assert.deepEqual(tools.filter((t) => t.spec_gap).map((t) => t.id).sort(), ['dn-01', 'nm-03', 'tx-02']);
    assert.deepEqual(p.tasks.filter((t) => t.group_type !== 'card').map((t) => [t.id, t.wave]), [['index-page', 2], ['integration', 3], ['review', 4]]);
    assert.match(readFileSync(join(dest, 'PLAN.md'), 'utf8'), /12 agents in parallel\*\*, tools on \*\*Sonnet\*\*, forecast \*\*6 min/);
    r = plan();
    p = JSON.parse(readFileSync(join(dest, 'plan.json'), 'utf8'));
    assert.equal(p.config.max_parallel, 8);
    assert.ok(p.tasks.filter((t) => t.group_type === 'card').every((t) => t.agent === 'worker'));
    assert.equal(plan('--parallel', '6').status, 2);
    assert.equal(plan('--model', 'opus').status, 2);
    assert.equal(plan('--forecast', '0').status, 2);
    assert.deepEqual(
      local(tel).filter((e) => e.ev === 'p1_plan').map((e) => [e.parallel, e.model, e.forecast_min, e.tasks]),
      [
        [12, 'sonnet', 6, tools.length + 3],
        [8, 'haiku', null, tools.length + 3],
      ],
    );
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});
