// The mission book (docs/pt/WORKSHOP-V2-SPEC.md, section 4; validation in docs/OBSERVABILITY.md): each rule of
// missions/rules.json with fake events and files, once per person, the queue, the book text, the statusline
// segment, the npm test reporter, the missions project assembly and the hook starting the check by itself.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { check, render, reset, VALIDATED, RULES } from '../../missions/missions.mjs';
import { paths, readLines, record } from '../../telemetry/lib.mjs';
import { montar, testScript } from '../../installer/assemble-missions.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

function setup({ enabled = false } = {}) {
  const base = mkdtempSync(join(tmpdir(), 'ws-mis-'));
  const dir = join(base, 'telemetry');
  const projs = join(base, 'workshop-claude');
  const proj = join(projs, 'missions-project');
  mkdirSync(join(proj, '.claude'), { recursive: true });
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'config.json'), JSON.stringify({ v: 1, enabled, workshop: 'ws-test', kit: 'v9', expires_at: '2099-01-01T00:00:00.000Z', projects_dir: projs, participant: enabled ? { p: 'c'.repeat(32), credential: 'x', name: 'Ana' } : null }));
  const P = paths(dir);
  const env = { HOME: base, USERPROFILE: base, WS_HOME_OVERRIDE: base };
  const run = (opts = {}) => check({ P, env, runTests: () => false, ...opts });
  const feature = (name, family) => record('feature', { name }, { local: family ? { family } : {}, P });
  return { base, dir, proj, P, env, run, feature };
}
const done = (b) => Object.keys(b.done).sort();
const local = (proj, obj) => writeFileSync(join(proj, '.claude', 'settings.local.json'), JSON.stringify(obj));
const KIT_CMD = '"/Users/a/.workshop-claude/kit/node" "/Users/a/.workshop-claude/kit/hooks/stop.mjs"';

test('rules.json: 10 missions, M7 not validated, every condition is known', () => {
  assert.equal(RULES.missions.length, 10);
  assert.deepEqual(VALIDATED, ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M8', 'M9', 'M10']);
  for (const m of RULES.missions) {
    assert.ok(m.title.pt && m.title.en && m.hint.pt && m.hint.en, m.id);
    for (const c of [...(m.all || []), ...(m.any || [])]) assert.ok(c.feature || ['skill', 'user_hook_log', 'user_statusline', 'summary_txt', 'memory_note'].includes(c.file) || c.tests === 'green_after_loop', JSON.stringify(c));
  }
});

test('M1, M2 (only Haiku), M3 from the features', () => {
  const t = setup();
  try {
    t.feature('plan_mode');
    t.feature('model_switch', 'sonnet');
    t.feature('subagent');
    assert.deepEqual(done(t.run()), ['M1', 'M3']);
    t.feature('model_switch', 'haiku');
    assert.deepEqual(done(t.run()), ['M1', 'M2', 'M3']);
  } finally {
    rmSync(t.base, { recursive: true, force: true });
  }
});

test('M4: the skill feature and a skill file of the person with name and description', () => {
  const t = setup();
  try {
    t.feature('skill_user');
    const sk = (name, fm) => {
      mkdirSync(join(t.proj, '.claude', 'skills', name), { recursive: true });
      writeFileSync(join(t.proj, '.claude', 'skills', name, 'SKILL.md'), fm);
    };
    sk('memory', '---\nname: memory\ndescription: kit\n---\n');
    sk('nodesc', '---\nname: nodesc\n---\n');
    assert.deepEqual(done(t.run()), []);
    sk('resumo', '---\nname: resumo\ndescription: Resume um ficheiro em 3 linhas\n---\n# resumo\n');
    assert.deepEqual(done(t.run()), ['M4']);
  } finally {
    rmSync(t.base, { recursive: true, force: true });
  }
});

test('M5: a PostToolUse hook of the person in settings.local.json and a line in edits.log, in the same project', () => {
  const t = setup();
  try {
    local(t.proj, { hooks: { PostToolUse: [{ hooks: [{ type: 'command', command: KIT_CMD }] }] } });
    writeFileSync(join(t.proj, 'edits.log'), '2026-10-19 10:00 README.md\n');
    assert.deepEqual(done(t.run()), [], 'the kit hook is not the person\'s');
    local(t.proj, { hooks: { PostToolUse: [{ matcher: 'Edit|Write', hooks: [{ type: 'command', command: 'echo x >> edits.log' }] }] } });
    writeFileSync(join(t.proj, 'edits.log'), '');
    assert.deepEqual(done(t.run()), [], 'edits.log is empty');
    writeFileSync(join(t.proj, 'edits.log'), '2026-10-19 10:00 README.md\n');
    assert.deepEqual(done(t.run()), ['M5']);
  } finally {
    rmSync(t.base, { recursive: true, force: true });
  }
});

test('M6: /loop, then a green npm test after a red one; the plan B runs the tests when there are no runs', () => {
  const t = setup();
  try {
    record('tests_run', { green: 6, red: 2 }, { P: t.P });
    record('tests_run', { green: 8, red: 0 }, { P: t.P });
    assert.deepEqual(done(t.run()), [], 'green before /loop does not count');
    t.feature('loop');
    assert.deepEqual(done(t.run()), [], 'no green run after the loop yet');
    record('tests_run', { green: 8, red: 0 }, { P: t.P });
    assert.deepEqual(done(t.run()), ['M6']);
    const u = setup();
    u.feature('loop');
    assert.deepEqual(done(u.run({ runTests: () => false })), []);
    assert.deepEqual(done(u.run({ runTests: (p) => p.endsWith('missions-project') })), ['M6']);
    rmSync(u.base, { recursive: true, force: true });
  } finally {
    rmSync(t.base, { recursive: true, force: true });
  }
});

test('M8, M9 and M10 (feature or the Agent Memory note); M7 never ticks', () => {
  const t = setup();
  try {
    local(t.proj, { statusLine: { type: 'command', command: KIT_CMD } });
    t.feature('headless');
    assert.deepEqual(done(t.run()), []);
    local(t.proj, { statusLine: { type: 'command', command: 'echo $(git branch --show-current)' } });
    writeFileSync(join(t.proj, 'summary.txt'), 'A unit converter.\n');
    assert.deepEqual(done(t.run()), ['M8', 'M9']);
    mkdirSync(join(t.base, '.agent-memory', 'missions-project'), { recursive: true });
    writeFileSync(join(t.base, '.agent-memory', 'missions-project', '2026-10-19-licao.md'), '---\ntype: lesson\n---\n');
    assert.deepEqual(done(t.run()), ['M10', 'M8', 'M9']);
    const u = setup();
    u.feature('memory_write');
    assert.deepEqual(done(u.run()), ['M10']);
    rmSync(u.base, { recursive: true, force: true });
  } finally {
    rmSync(t.base, { recursive: true, force: true });
  }
});

test('each mission counts once and stays done; mission_done goes to the queue with participation on', () => {
  const t = setup({ enabled: true });
  try {
    t.feature('plan_mode');
    local(t.proj, { statusLine: { type: 'command', command: 'echo mine' } });
    t.run();
    t.run();
    rmSync(join(t.proj, '.claude', 'settings.local.json'));
    assert.deepEqual(done(t.run()), ['M1', 'M8']);
    const ev = readLines(t.P.local).filter((e) => e.ev === 'mission_done');
    assert.deepEqual(ev.map((e) => e.mission).sort(), ['M1', 'M8']);
    assert.deepEqual(readLines(t.P.queue).filter((e) => e.ev === 'mission_done').map((e) => e.mission).sort(), ['M1', 'M8']);
  } finally {
    rmSync(t.base, { recursive: true, force: true });
  }
});

test('the book in pt and en: count, marks, the next mission and its hint; reset starts again', () => {
  const t = setup();
  try {
    t.feature('plan_mode');
    const b = t.run();
    const pt = render(b, 'pt');
    assert.match(pt, /^Missões 1\/9/);
    assert.match(pt, /✔ M1 +Planear sem tocar/);
    assert.match(pt, /○ M2 +O modelo certo/);
    assert.match(pt, /· M7 +Pergunta ao lado \(dica, não é validada\)/);
    assert.match(pt, /Próxima: M2 O modelo certo\n {2}→ \/model haiku/);
    const en = render(b, 'en');
    assert.match(en, /^Missions 1\/9/);
    assert.match(en, /Next: M2 The right model/);
    assert.doesNotMatch(en, /Missões|Próxima|dica/);
    reset(t.P);
    assert.ok(!existsSync(t.P.missions) && !existsSync(t.P.local));
    assert.ok(readdirSync(t.dir).some((f) => /^local-.*\.jsonl$/.test(f)));
    assert.deepEqual(done(t.run()), []);
  } finally {
    rmSync(t.base, { recursive: true, force: true });
  }
});

test('the statusline shows the mission book only in the workshop projects', () => {
  const t = setup();
  try {
    t.feature('plan_mode');
    t.feature('subagent');
    t.run();
    const sl = (dir, lang) =>
      spawnSync(process.execPath, [join(ROOT, 'statusline', 'statusline.mjs')], {
        input: JSON.stringify({ model: { display_name: 'Sonnet 5.5' }, workspace: { project_dir: dir } }),
        encoding: 'utf8',
        env: { PATH: process.env.PATH, HOME: t.base, WORKSHOP_TELEMETRY_DIR: t.dir, WORKSHOP_LANG: lang },
      }).stdout;
    assert.match(sl(t.proj, 'pt'), / · missões 2\/9$/);
    assert.match(sl(t.proj, 'en'), / · missions 2\/9$/);
    assert.doesNotMatch(sl(t.base, 'pt'), /missões/);
    // outside the workshop folder, while the config is in force: it says so (nothing counts there)
    assert.match(sl(t.base, 'pt'), / · fora do workshop$/);
    assert.match(sl(t.base, 'en'), / · outside the workshop$/);
  } finally {
    rmSync(t.base, { recursive: true, force: true });
  }
});

test('the npm test reporter records tests_run (local only) with the green and red counts', () => {
  const t = setup({ enabled: true });
  try {
    const d = join(t.base, 'proj');
    mkdirSync(join(d, 'test'), { recursive: true });
    writeFileSync(join(d, 'package.json'), '{"type":"module"}');
    writeFileSync(join(d, 'test', 'a.test.js'), "import { test } from 'node:test';\ntest('a', () => {});\ntest('b', () => { throw new Error('x'); });\ntest('c', () => {});\n");
    const r = spawnSync(process.execPath, ['--test', `--test-reporter=${join(ROOT, 'missions', 'reporter.mjs')}`, '--test-reporter-destination=stdout'], {
      cwd: d,
      encoding: 'utf8',
      env: { PATH: process.env.PATH, WORKSHOP_TELEMETRY_DIR: t.dir, WORKSHOP_TELEMETRY_NO_CHECK: '1' },
    });
    assert.equal(r.stdout.trim(), '');
    const runs = readLines(t.P.local).filter((e) => e.ev === 'tests_run');
    assert.deepEqual(runs.map((e) => [e.green, e.red]), [[2, 1]]);
    assert.ok(!existsSync(t.P.queue));
  } finally {
    rmSync(t.base, { recursive: true, force: true });
  }
});

for (const l of ['pt', 'en']) {
  test(`assemble-missions (${l}): the project with git, 6 green and 2 red tests, npm test with the kit reporter`, () => {
    const base = mkdtempSync(join(tmpdir(), `ws-asm-${l}-`));
    try {
      const dest = join(base, 'Ana Ç', 'workshop-claude', 'missions-project');
      const r = montar({ dest, lingua: l, kitDir: ROOT });
      assert.equal(r.status, 'assembled');
      assert.ok(!existsSync(join(dest, 'i18n')));
      const pkg = JSON.parse(readFileSync(join(dest, 'package.json'), 'utf8'));
      assert.match(pkg.scripts.test, /--test-reporter=spec --test-reporter-destination=stdout --test-reporter=\S+missions\/reporter\.mjs --test-reporter-destination=stdout$/);
      const tdir = join(base, 'tel');
      mkdirSync(tdir);
      writeFileSync(join(tdir, 'config.json'), JSON.stringify({ v: 1, enabled: false, expires_at: '2099-01-01T00:00:00.000Z' }));
      const npm = spawnSync(process.execPath, ['--test', ...pkg.scripts.test.split(' ').slice(2)], { cwd: dest, encoding: 'utf8', env: { PATH: process.env.PATH, WORKSHOP_TELEMETRY_DIR: tdir, WORKSHOP_TELEMETRY_NO_CHECK: '1' } });
      assert.match(npm.stdout, /pass 6/);
      assert.match(npm.stdout, /fail 2/);
      assert.deepEqual(readLines(join(tdir, 'local.jsonl')).map((e) => [e.ev, e.green, e.red]), [['tests_run', 6, 2]]);
      assert.equal(montar({ dest, lingua: l, kitDir: ROOT }).status, 'already_there');
      const log = spawnSync('git', ['-C', dest, 'log', '--oneline'], { encoding: 'utf8' }).stdout.trim().split('\n');
      assert.equal(log.length, 1);
      const readme = readFileSync(join(dest, 'README.md'), 'utf8');
      if (l === 'en') assert.doesNotMatch(readme + readFileSync(join(dest, 'test', 'units.test.js'), 'utf8'), /missões|são|unidade/);
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });
}

test('testScript: a relative path without spaces, a file URL with them, plain node --test without the reporter', () => {
  const base = mkdtempSync(join(tmpdir(), 'ws-ts-'));
  try {
    const kit = join(base, '.workshop-claude', 'kit');
    mkdirSync(join(kit, 'missions'), { recursive: true });
    writeFileSync(join(kit, 'missions', 'reporter.mjs'), '');
    assert.match(testScript(join(base, 'workshop-claude', 'missions-project'), kit), /--test-reporter=\.\.\/\.\.\/\.workshop-claude\/kit\/missions\/reporter\.mjs /);
    const spaced = join(base, 'Ana Spike', 'workshop-claude', 'missions-project');
    assert.match(testScript(spaced, join(base, 'Other Kit')), /^node --test$/);
    const kit2 = join(base, 'Ana Spike', '.workshop-claude', 'kit');
    mkdirSync(join(kit2, 'missions'), { recursive: true });
    writeFileSync(join(kit2, 'missions', 'reporter.mjs'), '');
    assert.match(testScript(join(base, 'x y', 'p'), kit2), /--test-reporter=file:\/\/\S+Ana%20Spike\S+reporter\.mjs /);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('the hook starts the mission check by itself: a ConfigChange with the person\'s hook ticks M5', async () => {
  const t = setup();
  try {
    local(t.proj, { hooks: { PostToolUse: [{ hooks: [{ type: 'command', command: 'echo x >> edits.log' }] }] } });
    writeFileSync(join(t.proj, 'edits.log'), 'x\n');
    const input = { session_id: 's1', hook_event_name: 'ConfigChange', source: 'local_settings', file_path: join(t.proj, '.claude', 'settings.local.json'), cwd: t.proj };
    const r = spawnSync(process.execPath, [join(ROOT, 'hooks', 'telemetry.mjs')], {
      input: JSON.stringify(input),
      encoding: 'utf8',
      env: { PATH: process.env.PATH, HOME: t.base, WORKSHOP_TELEMETRY_DIR: t.dir, CLAUDE_PROJECT_DIR: t.proj },
    });
    assert.equal(r.status, 0);
    let book = null;
    for (let i = 0; i < 50 && !book?.done?.M5; i++) {
      await new Promise((ok) => setTimeout(ok, 100));
      try {
        book = JSON.parse(readFileSync(t.P.missions, 'utf8'));
      } catch {
        /* not yet */
      }
    }
    assert.ok(book?.done?.M5, 'M5 not ticked by the background check');
  } finally {
    rmSync(t.base, { recursive: true, force: true });
  }
});
