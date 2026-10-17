// Tests of the app itself: server headers, refused paths, API and safe source.
// Node only (it does not run with the "Run tests" button): node --test test/app.test.js
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, extname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createArenaServer, start } from '../server.js';
import { securityProblems } from '../lib/security.js';
import { enginePath, loadEngine } from '../tools/engine.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const EXPECTED_CSP = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; require-trusted-types-for 'script'";
// The workshop engine (only in an assembled Arena): its state module and the hooks' language module.
const ENGINE = enginePath(ROOT, 'state');
const ENGINE_LANGUAGE = enginePath(ROOT, 'language');

function listen(srv) {
  return new Promise((ok) => srv.listen(0, '127.0.0.1', () => ok(srv.address().port)));
}

// http.request sends the path as it is (without normalizing "..").
function ask(port, path, method = 'GET') {
  return new Promise((ok, fail) => {
    const req = http.request({ host: '127.0.0.1', port, path, method }, (res) => {
      const parts = [];
      res.on('data', (c) => parts.push(c));
      res.on('end', () => ok({ status: res.statusCode, headers: res.headers, body: Buffer.concat(parts).toString('utf8') }));
    });
    req.on('error', fail);
    req.end();
  });
}

function files(dir, filter, out = []) {
  if (!existsSync(dir)) return out;
  for (const n of readdirSync(dir)) {
    if (n.startsWith('.') || n === 'node_modules') continue;
    const p = join(dir, n);
    if (statSync(p).isDirectory()) files(p, filter, out);
    else if (filter(p)) out.push(p);
  }
  return out;
}

const rel = (p) => relative(ROOT, p).split(sep).join('/');

let real;
let realPort;
let fake;
let fakePort;
let fakeDir;

// A fake project with secrets outside the served folders, to prove they do not get out.
function buildFakeProject() {
  const d = mkdtempSync(join(tmpdir(), 'arena-app-test-'));
  const write = (rel, txt) => {
    mkdirSync(dirname(join(d, rel)), { recursive: true });
    writeFileSync(join(d, rel), txt);
  };
  write('public/index.html', '<!doctype html><title>ok</title>');
  write('public/status.html', '<!doctype html><title>status</title>');
  write('public/app.js', 'export {};');
  write('public/.env', 'SECRET-ENV');
  write('cards/x-01/card.js', 'export default null;');
  write('cards/.hidden.js', 'SECRET-HIDDEN');
  write('lib/ok.js', 'export {};');
  write('replays/demo/events.jsonl', '{"ts":"2026-10-16T14:00:00.000Z","tipo":"inicio"}\nbroken line\n');
  write('replays/demo/snapshot.json', '{"tarefas":[]}');
  write('replays/demo/notes.md', 'SECRET-NOTES');
  write('replays/gravacao/events.jsonl', '{"ts":"2026-10-16T14:00:00.000Z","type":"start"}\n');
  write('specs/cards.json', JSON.stringify({ categories: [{ id: 'web', name: 'Web' }], cards: [{ id: 'x-01', title: 'X', category: 'web', difficulty: 1, mode: 'participant', template: 'choice' }, { id: 'x-02', title: 'Y', category: 'web', difficulty: 2, mode: 'participant', template: 'order' }] }));
  write('package.json', '{"secret":"SECRET-PACKAGE"}');
  write('server.js', '// SECRET-SERVER');
  write('plan.json', JSON.stringify({ v: 1, mode: 'participant', tasks: [{ id: 'x-01', title: 'X', group: 'web', group_type: 'card', wave: 1, depends_on: [] }, { id: 'x-02', title: 'Y', group: 'web', group_type: 'card', wave: 1, depends_on: [] }] }));
  write('secret.txt', 'SECRET-ROOT');
  write('.workshop/usage.jsonl', JSON.stringify({ tipo: 'subagente', tarefa: 'x-01', agente: 'worker-01', modelo: 'claude-haiku-5-5', custo_usd: 0.0042, duracao_s: 12, segredo: 'SECRET-WORKSHOP' }) + '\n');
  write('.workshop/status/x-01.json', JSON.stringify({ tarefa: 'x-01', estado: 'verde', tentativa: 1, agente: 'worker-01', inicio: '2026-10-16T14:00:00.000Z', fim: '2026-10-16T14:00:12.000Z' }));
  write('.claude/settings.json', '{"secret":"SECRET-CLAUDE"}');
  write('.git/config', 'SECRET-GIT');
  try {
    symlinkSync(join(d, 'package.json'), join(d, 'public', 'escape.js'));
    symlinkSync(d, join(d, 'public', 'folder'));
  } catch {
    /* no permission for symbolic links (Windows): those cases stay untested */
  }
  // The engine, as the installer puts it: its state module and the hooks' language module.
  if (ENGINE) cpSync(dirname(ENGINE), join(d, relative(ROOT, dirname(ENGINE))), { recursive: true });
  if (ENGINE_LANGUAGE) cpSync(dirname(ENGINE_LANGUAGE), join(d, relative(ROOT, dirname(ENGINE_LANGUAGE))), { recursive: true });
  return d;
}

before(async () => {
  real = createArenaServer({ root: ROOT });
  realPort = await listen(real);
  fakeDir = buildFakeProject();
  fake = createArenaServer({ root: fakeDir });
  fakePort = await listen(fake);
});

after(() => {
  for (const s of [real, fake]) {
    s?.closeAll();
    s?.close();
  }
  if (fakeDir) rmSync(fakeDir, { recursive: true, force: true });
});

// ---------- headers ----------

function anyCard() {
  const dir = join(ROOT, 'cards');
  for (const n of existsSync(dir) ? readdirSync(dir).sort() : []) {
    if (existsSync(join(dir, n, 'card.test.js'))) return `/cards/${n}/card.test.js`;
  }
  return '/templates/choice.js';
}

test('strict headers on every response (pages, files, API and errors)', async () => {
  const paths = ['/', '/status', '/estado', '/app.js', '/styles.css', '/status.js', anyCard(), '/templates/common.js', '/lib/testkit.js', '/api/cards', '/api/status', '/api/replay', '/does-not-exist.js', '/../package.json'];
  for (const p of paths) {
    const r = await ask(realPort, p);
    assert.equal(r.headers['content-security-policy'], EXPECTED_CSP, `CSP on ${p}`);
    assert.equal(r.headers['x-content-type-options'], 'nosniff', `nosniff on ${p}`);
    assert.ok(r.headers['referrer-policy'], `Referrer-Policy on ${p}`);
    assert.equal(r.headers['cross-origin-opener-policy'], 'same-origin', `COOP on ${p}`);
    assert.ok(!/unsafe-(inline|eval)/.test(r.headers['content-security-policy']), `CSP without unsafe-* on ${p}`);
  }
});

test('right MIME types', async () => {
  const expected = {
    '/': 'text/html; charset=utf-8',
    '/status': 'text/html; charset=utf-8',
    '/estado': 'text/html; charset=utf-8',
    '/app.js': 'text/javascript; charset=utf-8',
    '/styles.css': 'text/css; charset=utf-8',
    '/fonts/bricolage-grotesque-latin.woff2': 'font/woff2',
    '/favicon.svg': 'image/svg+xml',
    '/api/cards': 'application/json; charset=utf-8',
    [anyCard()]: 'text/javascript; charset=utf-8',
  };
  for (const [p, type] of Object.entries(expected)) {
    const r = await ask(realPort, p);
    assert.equal(r.status, 200, `${p} should exist`);
    assert.equal(r.headers['content-type'], type, `type of ${p}`);
  }
});

test('/status and its older alias serve the same page', async () => {
  const a = await ask(realPort, '/status');
  const b = await ask(realPort, '/estado');
  assert.equal(a.status, 200);
  assert.equal(b.status, 200);
  assert.equal(a.body, b.body);
  assert.match(a.body, /src="\/status\.js"/);
});

test('only GET and HEAD', async () => {
  assert.equal((await ask(realPort, '/', 'POST')).status, 405);
  assert.equal((await ask(realPort, '/api/cards', 'DELETE')).status, 405);
  const h = await ask(realPort, '/', 'HEAD');
  assert.equal(h.status, 200);
  assert.equal(h.body, '');
});

// ---------- paths ----------

const ATTACKS = [
  '/../package.json',
  '/%2e%2e/package.json',
  '/%2E%2E/package.json',
  '/%2e%2e%2fpackage.json',
  '/..%2fpackage.json',
  '/..%5cpackage.json',
  '/%2e%2e/%2e%2e/%2e%2e/etc/passwd',
  '/cards/../package.json',
  '/cards/..%2f..%2fpackage.json',
  '/cards/%2e%2e/%2e%2e/package.json',
  '/lib/%2e%2e/server.js',
  '/replays/demo/../../package.json',
  '/replays/demo/notes.md',
  '/package.json',
  '/server.js',
  '/plan.json',
  '/secret.txt',
  '/specs/cards.json',
  '/.workshop/usage.jsonl',
  '/%2eworkshop/usage.jsonl',
  '/.workshop/status/x-01.json',
  '/.claude/settings.json',
  '/%2eclaude/settings.json',
  '/.git/config',
  '/.env',
  '/cards/.hidden.js',
  '/escape.js',
  '/folder/package.json',
  '/folder/secret.txt',
  '//etc/passwd',
  '/app.js%00.html',
  '/%ff%fe',
  '/api/replay/..%2f..%2fpackage.json',
  '/api/replay/%2e%2e',
  '/api/replay/demo/../../package.json',
  '/api/replay/demo/notes.md',
  '/api/replay/.workshop',
];

test('path traversal attempts and hidden files are refused (fake project with secrets)', async () => {
  for (const p of ATTACKS) {
    const r = await ask(fakePort, p);
    assert.notEqual(r.status, 200, `${p} should be refused`);
    assert.ok(!r.body.includes('SECRET'), `${p} returned a secret`);
    assert.equal(r.headers['content-security-policy'], EXPECTED_CSP, `CSP on the refusal of ${p}`);
  }
});

test('path traversal attempts are refused (real project)', async () => {
  const pkg = existsSync(join(ROOT, 'package.json')) ? readFileSync(join(ROOT, 'package.json'), 'utf8') : '"scripts"';
  for (const p of ['/../package.json', '/%2e%2e/package.json', '/..%2fpackage.json', '/cards/..%2f..%2fpackage.json', '/package.json', '/server.js', '/.workshop/usage.jsonl', '/.claude/settings.json', '/.arena-kit.json', '/tools/reset.mjs']) {
    const r = await ask(realPort, p);
    assert.notEqual(r.status, 200, `${p} should be refused`);
    assert.ok(!r.body.includes(pkg.slice(0, 40)), `${p} returned package.json`);
  }
});

test('the allowed folders are still served', async () => {
  for (const p of ['/', '/status', '/app.js', '/cards/x-01/card.js', '/lib/ok.js', '/replays/demo/events.jsonl']) {
    assert.equal((await ask(fakePort, p)).status, 200, `${p} should be served`);
  }
});

// ---------- API ----------

test('/api/cards joins the specs with the cards that exist', async () => {
  const r = await ask(fakePort, '/api/cards');
  const d = JSON.parse(r.body);
  assert.deepEqual(d.categories, [{ id: 'web', name: 'Web' }]);
  const byId = Object.fromEntries(d.cards.map((c) => [c.id, c]));
  assert.equal(byId['x-01'].exists, true);
  assert.equal(byId['x-02'].exists, false);
  assert.equal(byId['x-02'].title, 'Y');
  assert.equal(byId['x-01'].in_plan, true);
  for (const k of ['id', 'title', 'category', 'difficulty', 'mode', 'template']) assert.ok(k in byId['x-02'], `missing ${k}`);
  assert.equal(d.mode, 'participant');

  const realCards = JSON.parse((await ask(realPort, '/api/cards')).body);
  const specs = JSON.parse(readFileSync(join(ROOT, 'specs', 'cards.json'), 'utf8'));
  for (const c of specs.cards) assert.ok(realCards.cards.some((x) => x.id === c.id), `missing ${c.id} in /api/cards`);
});

test('/api/cards also reads a plan in the older Portuguese schema', async () => {
  writeFileSync(join(fakeDir, 'plan.json'), JSON.stringify({ v: 1, modo: 'apresentador', tarefas: [{ id: 'x-02', grupo_tipo: 'cartao', onda: 1, depende: [] }] }));
  try {
    const d = JSON.parse((await ask(fakePort, '/api/cards')).body);
    assert.equal(d.mode, 'presenter');
    assert.equal(d.cards.find((c) => c.id === 'x-02').in_plan, true);
    assert.equal(d.cards.find((c) => c.id === 'x-01').in_plan, false);
  } finally {
    writeFileSync(join(fakeDir, 'plan.json'), JSON.stringify({ v: 1, mode: 'participant', tasks: [{ id: 'x-01', title: 'X', group: 'web', group_type: 'card', wave: 1, depends_on: [] }, { id: 'x-02', title: 'Y', group: 'web', group_type: 'card', wave: 1, depends_on: [] }] }));
  }
});

test('/api/status returns a snapshot in English (empty with no plan)', async () => {
  const d = JSON.parse((await ask(realPort, '/api/status')).body);
  assert.ok(Array.isArray(d.tasks));
  assert.ok(d.counts && typeof d.counts.green === 'number');
  assert.ok(d.cost && typeof d.cost.total === 'number');
  assert.ok(d.budget && typeof d.budget.target_usd === 'number');
});

test('/api/status uses the orchestrator when there is a plan', { skip: !ENGINE && 'no tools/workshop/ (only in an assembled Arena)' }, async () => {
  // An older engine only reads plans in the Portuguese schema.
  if (!(await loadEngine(ROOT)).state?.normalizePlan) {
    writeFileSync(join(fakeDir, 'plan.json'), JSON.stringify({ v: 1, modo: 'participante', tarefas: [{ id: 'x-01', titulo: 'X', grupo: 'web', grupo_tipo: 'cartao', onda: 1, depende: [] }, { id: 'x-02', titulo: 'Y', grupo: 'web', grupo_tipo: 'cartao', onda: 1, depende: [] }] }));
  }
  const d = JSON.parse((await ask(fakePort, '/api/status')).body);
  assert.equal(d.total, 2);
  assert.equal(d.mode, 'participant');
  const x1 = d.tasks.find((t) => t.id === 'x-01');
  assert.equal(x1.state, 'green');
  assert.equal(x1.cost_usd, 0.0042);
  assert.equal(x1.exists, true);
  assert.equal(x1.start, '2026-10-16T14:00:00.000Z');
  assert.equal(d.tasks.find((t) => t.id === 'x-02').state, 'todo');
  assert.ok(!JSON.stringify(d).includes('SECRET'), 'the snapshot does not copy stray fields from usage.jsonl');
});

test('/api/events sends the snapshot by SSE', async () => {
  const text = await new Promise((ok, fail) => {
    const t = setTimeout(() => fail(new Error('no "snapshot" event in 3 s')), 3000);
    const req = http.get({ host: '127.0.0.1', port: realPort, path: '/api/events' }, (res) => {
      try {
        assert.equal(res.headers['content-type'], 'text/event-stream; charset=utf-8');
        assert.equal(res.headers['content-security-policy'], EXPECTED_CSP);
      } catch (e) {
        fail(e);
      }
      let buf = '';
      res.on('data', (c) => {
        buf += c;
        const i = buf.indexOf('event: snapshot\n');
        if (i >= 0 && buf.indexOf('\n\n', i) > i) {
          clearTimeout(t);
          req.destroy();
          ok(buf);
        }
      });
    });
    req.on('error', (e) => {
      if (e.code !== 'ECONNRESET') fail(e);
    });
  });
  const line = text.slice(text.indexOf('event: snapshot\n')).split('\n')[1];
  assert.ok(line.startsWith('data: '));
  assert.ok(Array.isArray(JSON.parse(line.slice(6)).tasks));
});

test('/api/replay/<name> serves events and snapshot in English, and ignores broken lines', async () => {
  const d = JSON.parse((await ask(fakePort, '/api/replay/demo')).body);
  assert.equal(d.name, 'demo');
  assert.equal(d.events.length, 1);
  assert.equal(d.events[0].type, 'start');
  assert.deepEqual(d.snapshot.tasks, []);
  assert.equal((await ask(fakePort, '/api/replay/demo/events.jsonl')).status, 200);
  assert.equal((await ask(fakePort, '/api/replay/does-not-exist')).status, 404);
  const list = JSON.parse((await ask(fakePort, '/api/replay')).body);
  assert.deepEqual(list.replays.map((x) => x.name), ['demo', 'recording']);
});

test('?replay=recording also opens a recording saved under the older folder name (and the other way round)', async () => {
  const d = JSON.parse((await ask(fakePort, '/api/replay/recording')).body);
  assert.equal(d.name, 'recording');
  assert.equal(d.events[0].type, 'start');
  assert.equal((await ask(fakePort, '/api/replay/recording/events.jsonl')).status, 200);
});

test('the example replay exists and is consistent', { skip: !existsSync(join(ROOT, 'replays', 'example')) && 'no replays/example' }, async () => {
  for (const name of ['example', 'exemplo']) {
    const d = JSON.parse((await ask(realPort, `/api/replay/${name}`)).body);
    assert.ok(d.events.length > 10);
    assert.ok(d.events.some((e) => e.type === 'start') && d.events.some((e) => e.type === 'end'));
    const ids = new Set(d.snapshot.tasks.map((t) => t.id));
    for (const e of d.events) if (e.task) assert.ok(ids.has(e.task), `event of a task outside the snapshot: ${e.task}`);
    for (const t of d.snapshot.tasks) assert.ok(['todo', 'working', 'green', 'red', 'failed'].includes(t.state), `state of ${t.id}: ${t.state}`);
  }
});

test('start() binds only to 127.0.0.1 and moves to the next port if it is busy', async () => {
  const busy = http.createServer();
  const p = await listen(busy);
  const srv = await start({ port: p, root: fakeDir });
  try {
    assert.equal(srv.address().address, '127.0.0.1');
    assert.notEqual(srv.address().port, p);
  } finally {
    srv.closeAll();
    srv.close();
    busy.close();
  }
});

// ---------- source ----------

test('no dangerous patterns in public/, templates/, pages/ and server.js', () => {
  const target = [
    ...['public', 'templates', 'pages'].flatMap((d) => files(join(ROOT, d), (p) => /\.m?js$/.test(p))),
    join(ROOT, 'server.js'),
  ];
  assert.ok(target.length > 5, 'could not find the app files');
  const found = [];
  for (const f of target) for (const prob of securityProblems(readFileSync(f, 'utf8'))) found.push(`${rel(f)}: ${prob}`);
  assert.deepEqual(found, []);
});

test('HTML with no inline scripts or styles and only local resources', () => {
  const html = files(join(ROOT, 'public'), (p) => extname(p) === '.html');
  assert.ok(html.length >= 2, 'missing public/index.html and public/status.html');
  for (const f of html) {
    const src = readFileSync(f, 'utf8');
    const name = rel(f);
    for (const m of src.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
      assert.match(m[1], /\ssrc=["']\//, `${name}: <script> without a local src`);
      assert.equal(m[2].trim(), '', `${name}: <script> with inline code`);
    }
    assert.ok(!/<style\b/i.test(src), `${name}: <style> element`);
    assert.ok(!/\sstyle\s*=/i.test(src), `${name}: style= attribute`);
    assert.ok(!/\son[a-z]+\s*=/i.test(src), `${name}: on...= attribute`);
    assert.ok(!/javascript\s*:/i.test(src), `${name}: javascript: URL`);
    for (const m of src.matchAll(/\s(?:src|href)\s*=\s*["']([^"']*)["']/gi)) {
      const v = m[1];
      assert.ok(v.startsWith('#') || (v.startsWith('/') && !v.startsWith('//')), `${name}: external resource ${v}`);
    }
  }
});

test('CSS with only local resources', () => {
  for (const f of files(join(ROOT, 'public'), (p) => extname(p) === '.css')) {
    const src = readFileSync(f, 'utf8');
    assert.ok(!/@import/i.test(src), `${rel(f)}: @import`);
    assert.ok(!/expression\s*\(/i.test(src), `${rel(f)}: expression()`);
    for (const m of src.matchAll(/url\(\s*['"]?([^'")]+)/gi)) assert.ok(m[1].startsWith('/') && !m[1].startsWith('//'), `${rel(f)}: external url ${m[1]}`);
  }
});
