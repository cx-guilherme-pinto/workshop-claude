// Testes da própria app: cabeçalhos do servidor, caminhos recusados, API e fonte segura (adaptados da Arena).
// Só Node (não corre no botão "Correr testes"): node --test test/app.test.js
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, extname, join, relative, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createCaniveteServer, start } from '../server.js';
import { securityProblems } from '../lib/security.js';
import { enginePath } from '../tools/engine.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const EXPECTED_CSP = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; require-trusted-types-for 'script'";
// The workshop engine (only in an assembled project): its state module.
const ENGINE = enginePath(ROOT, 'state');

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

const MY_TOOL = {
  title: 'Minutos em horas',
  concept: 'Diz quantas horas e minutos são um número de minutos.',
  template: 'calc',
  category: 'text',
  inputs: [{ name: 'minutes', type: 'integer', label: 'Minutos', min: 0 }],
  output: { type: 'fields', fields: [{ name: 'hours', label: 'Horas' }, { name: 'minutes', label: 'Minutos' }] },
  rules: ['SECRET-RULE: as horas são os minutos a dividir por 60.'],
  examples: [{ in: { minutes: '125' }, out: { hours: 2, minutes: 5 } }, { in: { minutes: '59' }, out: { hours: 0, minutes: 59 } }],
};

// A fake project with secrets outside what the server may send, to prove they do not get out.
function buildFakeProject() {
  const d = mkdtempSync(join(tmpdir(), 'canivete-app-test-'));
  const write = (rel, txt) => {
    mkdirSync(dirname(join(d, rel)), { recursive: true });
    writeFileSync(join(d, rel), txt);
  };
  write('public/index.html', '<!doctype html><title>ok</title>');
  write('public/status.html', '<!doctype html><title>status</title>');
  write('public/app.js', 'export {};');
  write('public/.env', 'SECRET-ENV');
  write('tools/xx-01/tool.js', 'export default null;');
  write('tools/xx-01/tool.test.js', 'export {};');
  write('tools/xx-01/spec.md', 'SECRET-SPEC');
  write('tools/xx-01/notes.js', 'SECRET-NOTES-JS');
  write('tools/xx-01/.hidden.js', 'SECRET-HIDDEN');
  write('tools/gen.mjs', '// SECRET-GEN');
  write('tools/helper.js', '// SECRET-HELPER');
  write('tools/workshop/orchestrator/x.js', '// SECRET-ENGINE');
  write('tools/Not-An-Id/tool.js', '// SECRET-BAD-ID');
  write('lib/ok.js', 'export {};');
  write('lib/sub/deep.js', '// SECRET-DEEP');
  write('templates/ok.js', 'export {};');
  write('pages/catalog.js', 'export {};');
  write('pages/notes.json', '{"secret":"SECRET-PAGES-JSON"}');
  write('replays/demo/events.jsonl', '{"ts":"2026-10-16T14:00:00.000Z","tipo":"inicio"}\nbroken line\n');
  write('replays/demo/snapshot.json', '{"tarefas":[]}');
  write('replays/demo/notes.md', 'SECRET-NOTES');
  write('specs/tools.json', JSON.stringify({
    lang: 'pt',
    categories: [{ id: 'text', name: 'Texto' }],
    tools: [
      { id: 'xx-01', category: 'text', template: 'text', title: 'X', concept: 'Conceito X.', inputs: [{ name: 'text', type: 'text', label: 'Texto', secret: 'SECRET-INPUT' }], output: { type: 'text', label: 'Saída' }, rules: ['SECRET-RULE-X'], examples: [{ in: { text: 'a' }, out: 'A' }, { in: { text: 'b' }, out: 'B' }], spec_gaps: [{ what: 'SECRET-GAP' }] },
      { id: 'xx-02', category: 'text', template: 'calc', title: 'Y', concept: 'Conceito Y.', inputs: [{ name: 'n', type: 'number', label: 'N', default: '2', min: 0 }], output: { type: 'number', label: 'Resultado' }, examples: [{ in: { n: '1' }, out: 1 }, { in: { n: '2' }, out: 2 }] },
    ],
  }));
  write('specs/my-tool.json', JSON.stringify(MY_TOOL));
  write('package.json', '{"secret":"SECRET-PACKAGE"}');
  write('server.js', '// SECRET-SERVER');
  write('plan.json', JSON.stringify({ v: 1, mode: 'participant', tasks: [{ id: 'xx-01', title: 'X', group: 'text', group_type: 'tool', wave: 1, depends_on: [] }, { id: 'xx-02', title: 'Y', group: 'text', group_type: 'tool', wave: 1, depends_on: [] }] }));
  write('secret.txt', 'SECRET-ROOT');
  write('.workshop/usage.jsonl', JSON.stringify({ tipo: 'subagente', tarefa: 'xx-01', agente: 'worker-01', modelo: 'claude-haiku-5-5', custo_usd: 0.0042, duracao_s: 12, segredo: 'SECRET-WORKSHOP' }) + '\n');
  write('.workshop/status/xx-01.json', JSON.stringify({ tarefa: 'xx-01', estado: 'verde', tentativa: 1, agente: 'worker-01', inicio: '2026-10-16T14:00:00.000Z', fim: '2026-10-16T14:00:12.000Z' }));
  write('.workshop/verdict.json', '{"summary":"SECRET-VERDICT"}');
  write('.claude/settings.json', '{"secret":"SECRET-CLAUDE"}');
  write('.git/config', 'SECRET-GIT');
  try {
    symlinkSync(join(d, 'package.json'), join(d, 'public', 'escape.js'));
    symlinkSync(d, join(d, 'public', 'folder'));
    symlinkSync(join(d, 'server.js'), join(d, 'lib', 'link.js'));
    symlinkSync(join(d, 'specs'), join(d, 'replays', 'specs'));
  } catch {
    /* no permission for symbolic links (Windows): those cases stay untested */
  }
  // The engine, as the installer puts it.
  if (ENGINE) cpSync(join(ROOT, 'tools', 'workshop'), join(d, 'tools', 'workshop'), { recursive: true });
  return d;
}

before(async () => {
  real = createCaniveteServer({ root: ROOT });
  realPort = await listen(real);
  fakeDir = buildFakeProject();
  fake = createCaniveteServer({ root: fakeDir });
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

// A file of tools/ the server serves: a generated test (after node tools/gen.mjs) or, with none, a template.
function anyToolFile() {
  const dir = join(ROOT, 'tools');
  for (const n of existsSync(dir) ? readdirSync(dir).sort() : []) {
    if (/^[a-z]{2}-\d{2}$/.test(n) && existsSync(join(dir, n, 'tool.test.js'))) return `/tools/${n}/tool.test.js`;
  }
  return '/templates/common.js';
}

test('cabeçalhos estritos em todas as respostas (páginas, ficheiros, API e erros)', async () => {
  const paths = ['/', '/status', '/estado', '/app.js', '/styles.css', '/status.js', '/tool-view.js', anyToolFile(), '/templates/common.js', '/lib/testkit.js', '/pages/catalog.test.js', '/api/tools', '/api/status', '/api/replay', '/does-not-exist.js', '/../package.json', '/tools/gen.mjs'];
  for (const p of paths) {
    const r = await ask(realPort, p);
    assert.equal(r.headers['content-security-policy'], EXPECTED_CSP, `CSP em ${p}`);
    assert.equal(r.headers['x-content-type-options'], 'nosniff', `nosniff em ${p}`);
    assert.ok(r.headers['referrer-policy'], `Referrer-Policy em ${p}`);
    assert.equal(r.headers['cross-origin-opener-policy'], 'same-origin', `COOP em ${p}`);
    assert.ok(!/unsafe-(inline|eval)/.test(r.headers['content-security-policy']), `CSP sem unsafe-* em ${p}`);
  }
});

test('tipos MIME corretos', async () => {
  const expected = {
    '/': 'text/html; charset=utf-8',
    '/status': 'text/html; charset=utf-8',
    '/estado': 'text/html; charset=utf-8',
    '/app.js': 'text/javascript; charset=utf-8',
    '/styles.css': 'text/css; charset=utf-8',
    '/fonts/bricolage-grotesque-latin.woff2': 'font/woff2',
    '/favicon.svg': 'image/svg+xml',
    '/api/tools': 'application/json; charset=utf-8',
    '/templates/calc.js': 'text/javascript; charset=utf-8',
    '/pages/catalog.test.js': 'text/javascript; charset=utf-8',
    [anyToolFile()]: 'text/javascript; charset=utf-8',
  };
  for (const [p, type] of Object.entries(expected)) {
    const r = await ask(realPort, p);
    assert.equal(r.status, 200, `${p} devia existir`);
    assert.equal(r.headers['content-type'], type, `tipo de ${p}`);
  }
});

test('/status e o antigo /estado servem a mesma página', async () => {
  const a = await ask(realPort, '/status');
  const b = await ask(realPort, '/estado');
  assert.equal(a.status, 200);
  assert.equal(b.status, 200);
  assert.equal(a.body, b.body);
  assert.match(a.body, /src="\/status\.js"/);
});

test('só GET e HEAD', async () => {
  assert.equal((await ask(realPort, '/', 'POST')).status, 405);
  assert.equal((await ask(realPort, '/api/tools', 'DELETE')).status, 405);
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
  '/tools/../package.json',
  '/tools/xx-01/..%2f..%2fpackage.json',
  '/tools/%2e%2e/%2e%2e/package.json',
  '/lib/%2e%2e/server.js',
  '/replays/demo/../../package.json',
  '/replays/demo/notes.md',
  '/replays/specs/my-tool.json',
  '/replays/specs/tools.json',
  '/package.json',
  '/server.js',
  '/plan.json',
  '/secret.txt',
  '/specs/tools.json',
  '/specs/my-tool.json',
  '/specs%2fmy-tool.json',
  '/tools/xx-01/spec.md',
  '/tools/xx-01/notes.js',
  '/tools/xx-01/.hidden.js',
  '/tools/gen.mjs',
  '/tools/helper.js',
  '/tools/workshop/orchestrator/x.js',
  '/tools/Not-An-Id/tool.js',
  '/tools/xx-01',
  '/tools/xx-01/',
  '/lib/sub/deep.js',
  '/lib/link.js',
  '/pages/notes.json',
  '/.workshop/usage.jsonl',
  '/%2eworkshop/usage.jsonl',
  '/.workshop/status/xx-01.json',
  '/.workshop/verdict.json',
  '/.claude/settings.json',
  '/%2eclaude/settings.json',
  '/.git/config',
  '/.env',
  '/escape.js',
  '/folder/package.json',
  '/folder/secret.txt',
  '/folder/specs/my-tool.json',
  '//etc/passwd',
  '/app.js%00.html',
  '/%ff%fe',
  '/api/replay/..%2f..%2fpackage.json',
  '/api/replay/%2e%2e',
  '/api/replay/demo/../../package.json',
  '/api/replay/demo/notes.md',
  '/api/replay/.workshop',
  '/api/replay/specs',
  '/api/specs',
];

test('tentativas de path traversal e ficheiros fora da lista são recusados (projeto falso com segredos)', async () => {
  for (const p of ATTACKS) {
    const r = await ask(fakePort, p);
    assert.notEqual(r.status, 200, `${p} devia ser recusado`);
    assert.ok(!r.body.includes('SECRET'), `${p} devolveu um segredo`);
    assert.equal(r.headers['content-security-policy'], EXPECTED_CSP, `CSP na recusa de ${p}`);
  }
});

test('tentativas de path traversal são recusadas (projeto real)', async () => {
  const pkg = existsSync(join(ROOT, 'package.json')) ? readFileSync(join(ROOT, 'package.json'), 'utf8') : '"scripts"';
  for (const p of ['/../package.json', '/%2e%2e/package.json', '/..%2fpackage.json', '/tools/..%2f..%2fpackage.json', '/package.json', '/server.js', '/.workshop/usage.jsonl', '/.claude/settings.json', '/.canivete-kit.json', '/tools/reset.mjs', '/tools/gen.mjs', '/tools/my-tool.mjs', '/tools/CONTRACT.md', '/specs/tools.json', '/specs/my-tool.example.json', '/workshop.project.json', '/TASKS.md', '/test/app.test.js']) {
    const r = await ask(realPort, p);
    assert.notEqual(r.status, 200, `${p} devia ser recusado`);
    assert.ok(!r.body.includes(pkg.slice(0, 40)), `${p} devolveu o package.json`);
  }
});

test('o que está na lista continua a ser servido', async () => {
  for (const p of ['/', '/status', '/app.js', '/tools/xx-01/tool.js', '/tools/xx-01/tool.test.js', '/lib/ok.js', '/templates/ok.js', '/pages/catalog.js', '/replays/demo/events.jsonl', '/replays/demo/snapshot.json']) {
    assert.equal((await ask(fakePort, p)).status, 200, `${p} devia ser servido`);
  }
});

// ---------- API ----------

test('/api/tools junta o catálogo, a tua ferramenta e o que existe, só com os campos da casca', async () => {
  const r = await ask(fakePort, '/api/tools');
  assert.equal(r.status, 200);
  assert.ok(!r.body.includes('SECRET'), 'não copia campos que a casca não usa (rules, spec_gaps, campos desconhecidos)');
  const d = JSON.parse(r.body);
  assert.deepEqual(d.categories, [{ id: 'text', name: 'Texto' }]);
  assert.equal(d.lang, 'pt');
  assert.deepEqual(d.tools.map((t) => t.id), ['xx-01', 'xx-02', 'my-01'], 'a tua ferramenta vem no fim');
  const byId = Object.fromEntries(d.tools.map((t) => [t.id, t]));
  assert.equal(byId['xx-01'].built, true);
  assert.equal(byId['xx-01'].test, true);
  assert.equal(typeof byId['xx-01'].version, 'number');
  assert.equal(byId['xx-02'].built, false);
  assert.equal(byId['xx-02'].version, null);
  assert.equal(byId['xx-02'].category_name, 'Texto');
  assert.deepEqual(byId['xx-02'].inputs, [{ name: 'n', type: 'number', label: 'N', default: '2', min: 0 }]);
  assert.deepEqual(byId['xx-02'].example, { n: '1' });
  assert.equal(byId['my-01'].mine, true);
  assert.equal(byId['my-01'].title, 'Minutos em horas');
  assert.deepEqual(d.my_tool, { file: true, ok: true });
  for (const k of ['id', 'title', 'concept', 'category', 'category_name', 'template', 'inputs', 'output', 'example', 'mine', 'built', 'version', 'test', 'in_plan', 'state', 'attempt']) {
    assert.ok(k in byId['xx-02'], `falta ${k}`);
  }
  assert.deepEqual(Object.keys(byId['xx-02']).sort(), ['attempt', 'built', 'category', 'category_name', 'concept', 'example', 'id', 'in_plan', 'inputs', 'mine', 'output', 'state', 'template', 'test', 'title', 'version']);
  assert.equal(d.mode, 'participant');
  assert.equal(byId['xx-01'].in_plan, true);
  assert.equal(byId['my-01'].in_plan, false);
  assert.equal(typeof d.pages.catalog.version, 'number');
  assert.equal(typeof d.signature, 'string');
});

test('/api/tools com um specs/my-tool.json com problemas: a ferramenta não aparece e nada do ficheiro sai', async () => {
  writeFileSync(join(fakeDir, 'specs', 'my-tool.json'), '{ "title": "SECRET-BROKEN", ');
  try {
    const r = await ask(fakePort, '/api/tools');
    const d = JSON.parse(r.body);
    assert.deepEqual(d.tools.map((t) => t.id), ['xx-01', 'xx-02']);
    assert.deepEqual(d.my_tool, { file: true, ok: false });
    assert.ok(!r.body.includes('SECRET'));
  } finally {
    writeFileSync(join(fakeDir, 'specs', 'my-tool.json'), JSON.stringify(MY_TOOL));
  }
});

test('/api/tools no projeto real tem todas as ferramentas de specs/tools.json', async () => {
  const d = JSON.parse((await ask(realPort, '/api/tools')).body);
  const specs = JSON.parse(readFileSync(join(ROOT, 'specs', 'tools.json'), 'utf8'));
  for (const t of specs.tools) assert.ok(d.tools.some((x) => x.id === t.id), `falta ${t.id} em /api/tools`);
  assert.deepEqual(d.categories.map((c) => c.id), specs.categories.map((c) => c.id));
});

test('/api/status devolve uma fotografia em inglês (vazia sem plano)', async () => {
  const d = JSON.parse((await ask(realPort, '/api/status')).body);
  assert.ok(Array.isArray(d.tasks));
  assert.ok(d.counts && typeof d.counts.green === 'number');
  assert.ok(d.cost && typeof d.cost.total === 'number');
  assert.ok(d.budget && typeof d.budget.target_usd === 'number');
});

test('/api/status e /api/tools usam o orquestrador quando há plano', { skip: !ENGINE && 'sem tools/workshop/ (só num Canivete montado)' }, async () => {
  const d = JSON.parse((await ask(fakePort, '/api/status')).body);
  assert.equal(d.total, 2);
  assert.equal(d.mode, 'participant');
  const x1 = d.tasks.find((t) => t.id === 'xx-01');
  assert.equal(x1.state, 'green');
  assert.equal(x1.cost_usd, 0.0042);
  assert.equal(x1.exists, true);
  assert.equal(x1.start, '2026-10-16T14:00:00.000Z');
  const x2 = d.tasks.find((t) => t.id === 'xx-02');
  assert.equal(x2.state, 'todo');
  assert.equal(x2.exists, false);
  assert.ok(!JSON.stringify(d).includes('SECRET'), 'a fotografia não copia campos estranhos do usage.jsonl');
  const tools = JSON.parse((await ask(fakePort, '/api/tools')).body);
  assert.equal(tools.tools.find((t) => t.id === 'xx-01').state, 'green');
  assert.equal(tools.tools.find((t) => t.id === 'xx-02').state, 'todo');
});

test('/api/events envia a fotografia por SSE', async () => {
  const text = await new Promise((ok, fail) => {
    const t = setTimeout(() => fail(new Error('sem evento "snapshot" em 3 s')), 3000);
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

test('/api/replay/<name> serve eventos e fotografia em inglês, e ignora linhas partidas', async () => {
  const d = JSON.parse((await ask(fakePort, '/api/replay/demo')).body);
  assert.equal(d.name, 'demo');
  assert.equal(d.events.length, 1);
  assert.equal(d.events[0].type, 'start');
  assert.deepEqual(d.snapshot.tasks, []);
  assert.equal((await ask(fakePort, '/api/replay/demo/events.jsonl')).status, 200);
  assert.equal((await ask(fakePort, '/api/replay/does-not-exist')).status, 404);
  const list = JSON.parse((await ask(fakePort, '/api/replay')).body);
  assert.deepEqual(list.replays.map((x) => x.name), ['demo']);
});

test('a repetição de exemplo existe e é coerente', { skip: !existsSync(join(ROOT, 'replays', 'example')) && 'sem replays/example' }, async () => {
  const d = JSON.parse((await ask(realPort, '/api/replay/example')).body);
  assert.ok(d.events.length > 10);
  assert.ok(d.events.some((e) => e.type === 'start') && d.events.some((e) => e.type === 'end'));
  const ids = new Set(d.snapshot.tasks.map((t) => t.id));
  for (const e of d.events) if (e.task) assert.ok(ids.has(e.task), `evento de uma tarefa fora da fotografia: ${e.task}`);
  for (const t of d.snapshot.tasks) assert.ok(['todo', 'working', 'green', 'red', 'failed'].includes(t.state), `estado de ${t.id}: ${t.state}`);
});

test('start() liga só a 127.0.0.1 e passa à porta seguinte se estiver ocupada', async () => {
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

// Outro servidor de desenvolvimento em [::] (Next.js, Express) ou em ::1 (Vite): no macOS o bind em 127.0.0.1
// funciona na mesma, mas o browser abre "localhost" em ::1 e chegava à outra app.
for (const host of ['::', '::1']) {
  test(`start() passa à porta seguinte se outro programa estiver em [${host}]`, async (t) => {
    const busy = http.createServer((q, s) => s.end('OTHER-APP'));
    const p = await new Promise((ok) => {
      busy.once('error', () => ok(null));
      busy.listen(0, host, () => ok(busy.address().port));
    });
    if (!p) return t.skip('sem IPv6 nesta máquina');
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
}

test('start() fica com a porta pedida se estiver livre', async () => {
  const probe = http.createServer();
  const p = await listen(probe);
  await new Promise((ok) => probe.close(ok));
  const srv = await start({ port: p, root: fakeDir });
  try {
    assert.equal(srv.address().port, p);
  } finally {
    srv.closeAll();
    srv.close();
  }
});

// ---------- source ----------

test('sem padrões perigosos em public/, templates/, pages/ e server.js', () => {
  const target = [
    ...['public', 'templates', 'pages'].flatMap((d) => files(join(ROOT, d), (p) => /\.m?js$/.test(p))),
    join(ROOT, 'server.js'),
  ];
  assert.ok(target.length > 5, 'não encontrei os ficheiros da app');
  const found = [];
  for (const f of target) for (const prob of securityProblems(readFileSync(f, 'utf8'))) found.push(`${rel(f)}: ${prob}`);
  assert.deepEqual(found, []);
});

test('a casca só faz import() de caminhos deste servidor', () => {
  for (const f of files(join(ROOT, 'public'), (p) => p.endsWith('.js'))) {
    const code = readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
    for (const m of code.matchAll(/\bimport\s*\(\s*([^)]*)\)/g)) {
      assert.match(m[1].trim(), /^(`\/(tools|pages)\/|url$)/, `${rel(f)}: import(${m[1]}) não começa por /tools/ ou /pages/`);
    }
  }
});

test('HTML sem scripts nem estilos inline e só com recursos locais', () => {
  const html = files(join(ROOT, 'public'), (p) => extname(p) === '.html');
  assert.ok(html.length >= 2, 'faltam public/index.html e public/status.html');
  for (const f of html) {
    const src = readFileSync(f, 'utf8');
    const name = rel(f);
    for (const m of src.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
      assert.match(m[1], /\ssrc=["']\//, `${name}: <script> sem src local`);
      assert.equal(m[2].trim(), '', `${name}: <script> com código inline`);
    }
    assert.ok(!/<style\b/i.test(src), `${name}: elemento <style>`);
    assert.ok(!/\sstyle\s*=/i.test(src), `${name}: atributo style=`);
    assert.ok(!/\son[a-z]+\s*=/i.test(src), `${name}: atributo on...=`);
    assert.ok(!/javascript\s*:/i.test(src), `${name}: URL javascript:`);
    for (const m of src.matchAll(/\s(?:src|href)\s*=\s*["']([^"']*)["']/gi)) {
      const v = m[1];
      assert.ok(v.startsWith('#') || (v.startsWith('/') && !v.startsWith('//')), `${name}: recurso externo ${v}`);
    }
  }
});

test('CSS só com recursos locais', () => {
  for (const f of files(join(ROOT, 'public'), (p) => extname(p) === '.css')) {
    const src = readFileSync(f, 'utf8');
    assert.ok(!/@import/i.test(src), `${rel(f)}: @import`);
    assert.ok(!/expression\s*\(/i.test(src), `${rel(f)}: expression()`);
    for (const m of src.matchAll(/url\(\s*['"]?([^'")]+)/gi)) assert.ok(m[1].startsWith('/') && !m[1].startsWith('//'), `${rel(f)}: url externo ${m[1]}`);
  }
});

// Only in the kit's repository (an assembled project has one language): both texts.js have the same keys.
test('lib/texts.js e i18n/en/lib/texts.js têm as mesmas chaves', { skip: !existsSync(join(ROOT, 'i18n', 'en', 'lib', 'texts.js')) && 'sem i18n/ (projeto montado)' }, async () => {
  const keys = (o, p = '') => Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' ? keys(v, `${p}${k}.`) : [`${p}${k}:${typeof v}`])).sort();
  const pt = (await import(pathToFileURL(join(ROOT, 'lib', 'texts.js')).href)).T;
  const en = (await import(pathToFileURL(join(ROOT, 'i18n', 'en', 'lib', 'texts.js')).href)).T;
  assert.deepEqual(keys(en), keys(pt));
});
