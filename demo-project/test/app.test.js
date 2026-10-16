// Testes da propria app: cabecalhos do servidor, caminhos recusados, API e fonte segura.
// So Node (nao corre no botao "Correr testes"): node --test test/app.test.js
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, extname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { criarServidor, iniciar } from '../server.js';
import { problemasDeSeguranca } from '../lib/seguranca.js';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const CSP_ESPERADA = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; require-trusted-types-for 'script'";
const MOTOR = join(RAIZ, 'tools', 'workshop', 'orquestrador', 'lib', 'estado.mjs');
const MOTOR_LINGUA = join(RAIZ, 'tools', 'workshop', 'hooks', 'lib');

function ouvir(srv) {
  return new Promise((ok) => srv.listen(0, '127.0.0.1', () => ok(srv.address().port)));
}

// http.request envia o caminho tal como esta (sem normalizar "..").
function pedir(porta, caminho, metodo = 'GET') {
  return new Promise((ok, falha) => {
    const req = http.request({ host: '127.0.0.1', port: porta, path: caminho, method: metodo }, (res) => {
      const partes = [];
      res.on('data', (c) => partes.push(c));
      res.on('end', () => ok({ status: res.statusCode, headers: res.headers, corpo: Buffer.concat(partes).toString('utf8') }));
    });
    req.on('error', falha);
    req.end();
  });
}

function ficheiros(dir, filtro, out = []) {
  if (!existsSync(dir)) return out;
  for (const n of readdirSync(dir)) {
    if (n.startsWith('.') || n === 'node_modules') continue;
    const p = join(dir, n);
    if (statSync(p).isDirectory()) ficheiros(p, filtro, out);
    else if (filtro(p)) out.push(p);
  }
  return out;
}

const rel = (p) => relative(RAIZ, p).split(sep).join('/');

let real;
let portaReal;
let falso;
let portaFalsa;
let pastaFalsa;

// Projeto falso com segredos fora das pastas servidas, para provar que nao saem.
function montarProjetoFalso() {
  const d = mkdtempSync(join(tmpdir(), 'arena-app-test-'));
  const escrever = (rel, txt) => {
    mkdirSync(dirname(join(d, rel)), { recursive: true });
    writeFileSync(join(d, rel), txt);
  };
  escrever('public/index.html', '<!doctype html><title>ok</title>');
  escrever('public/estado.html', '<!doctype html><title>estado</title>');
  escrever('public/app.js', 'export {};');
  escrever('public/.env', 'SEGREDO-ENV');
  escrever('cards/x-01/card.js', 'export default null;');
  escrever('cards/.escondido.js', 'SEGREDO-ESCONDIDO');
  escrever('lib/ok.js', 'export {};');
  escrever('replays/demo/events.jsonl', '{"ts":"2026-10-16T14:00:00.000Z","tipo":"inicio"}\nlinha partida\n');
  escrever('replays/demo/snapshot.json', '{"tarefas":[]}');
  escrever('replays/demo/notas.md', 'SEGREDO-NOTAS');
  escrever('specs/cards.json', JSON.stringify({ categorias: [{ id: 'web', nome: 'Web' }], cartoes: [{ id: 'x-01', titulo: 'X', categoria: 'web', dificuldade: 1, modo: 'participante', modelo: 'escolha' }, { id: 'x-02', titulo: 'Y', categoria: 'web', dificuldade: 2, modo: 'participante', modelo: 'ordenar' }] }));
  escrever('package.json', '{"segredo":"SEGREDO-PACOTE"}');
  escrever('server.js', '// SEGREDO-SERVIDOR');
  escrever('plan.json', JSON.stringify({ v: 1, modo: 'participante', tarefas: [{ id: 'x-01', titulo: 'X', grupo: 'web', grupo_tipo: 'cartao', onda: 1, depende: [] }, { id: 'x-02', titulo: 'Y', grupo: 'web', grupo_tipo: 'cartao', onda: 1, depende: [] }] }));
  escrever('segredo.txt', 'SEGREDO-RAIZ');
  escrever('.workshop/usage.jsonl', JSON.stringify({ tipo: 'subagente', tarefa: 'x-01', agente: 'worker-01', modelo: 'claude-haiku-5-5', custo_usd: 0.0042, duracao_s: 12, segredo: 'SEGREDO-WORKSHOP' }) + '\n');
  escrever('.workshop/status/x-01.json', JSON.stringify({ tarefa: 'x-01', estado: 'verde', tentativa: 1, agente: 'worker-01', inicio: '2026-10-16T14:00:00.000Z', fim: '2026-10-16T14:00:12.000Z' }));
  escrever('.claude/settings.json', '{"segredo":"SEGREDO-CLAUDE"}');
  escrever('.git/config', 'SEGREDO-GIT');
  try {
    symlinkSync(join(d, 'package.json'), join(d, 'public', 'fuga.js'));
    symlinkSync(d, join(d, 'public', 'pasta'));
  } catch {
    /* sem permissao para ligacoes simbolicas (Windows): esses casos ficam por testar */
  }
  if (existsSync(MOTOR)) cpSync(dirname(MOTOR), join(d, 'tools', 'workshop', 'orquestrador', 'lib'), { recursive: true });
  // O orquestrador le a lingua do kit em hooks/lib/lingua.mjs.
  if (existsSync(MOTOR_LINGUA)) cpSync(MOTOR_LINGUA, join(d, 'tools', 'workshop', 'hooks', 'lib'), { recursive: true });
  return d;
}

before(async () => {
  real = criarServidor({ raiz: RAIZ });
  portaReal = await ouvir(real);
  pastaFalsa = montarProjetoFalso();
  falso = criarServidor({ raiz: pastaFalsa });
  portaFalsa = await ouvir(falso);
});

after(() => {
  for (const s of [real, falso]) {
    s?.fecharTudo();
    s?.close();
  }
  if (pastaFalsa) rmSync(pastaFalsa, { recursive: true, force: true });
});

// ---------- cabecalhos ----------

function cartaoQualquer() {
  const dir = join(RAIZ, 'cards');
  for (const n of existsSync(dir) ? readdirSync(dir).sort() : []) {
    if (existsSync(join(dir, n, 'card.test.js'))) return `/cards/${n}/card.test.js`;
  }
  return '/templates/escolha.js';
}

test('cabecalhos estritos em todas as respostas (paginas, ficheiros, API e erros)', async () => {
  const caminhos = ['/', '/estado', '/app.js', '/styles.css', '/estado.js', cartaoQualquer(), '/templates/common.js', '/lib/testkit.js', '/api/cards', '/api/status', '/api/replay', '/nao-existe.js', '/../package.json'];
  for (const c of caminhos) {
    const r = await pedir(portaReal, c);
    assert.equal(r.headers['content-security-policy'], CSP_ESPERADA, `CSP em ${c}`);
    assert.equal(r.headers['x-content-type-options'], 'nosniff', `nosniff em ${c}`);
    assert.ok(r.headers['referrer-policy'], `Referrer-Policy em ${c}`);
    assert.equal(r.headers['cross-origin-opener-policy'], 'same-origin', `COOP em ${c}`);
    assert.ok(!/unsafe-(inline|eval)/.test(r.headers['content-security-policy']), `CSP sem unsafe-* em ${c}`);
  }
});

test('tipos MIME corretos', async () => {
  const esperado = {
    '/': 'text/html; charset=utf-8',
    '/estado': 'text/html; charset=utf-8',
    '/app.js': 'text/javascript; charset=utf-8',
    '/styles.css': 'text/css; charset=utf-8',
    '/fonts/bricolage-grotesque-latin.woff2': 'font/woff2',
    '/favicon.svg': 'image/svg+xml',
    '/api/cards': 'application/json; charset=utf-8',
    [cartaoQualquer()]: 'text/javascript; charset=utf-8',
  };
  for (const [c, tipo] of Object.entries(esperado)) {
    const r = await pedir(portaReal, c);
    assert.equal(r.status, 200, `${c} devia existir`);
    assert.equal(r.headers['content-type'], tipo, `tipo de ${c}`);
  }
});

test('so GET e HEAD', async () => {
  assert.equal((await pedir(portaReal, '/', 'POST')).status, 405);
  assert.equal((await pedir(portaReal, '/api/cards', 'DELETE')).status, 405);
  const h = await pedir(portaReal, '/', 'HEAD');
  assert.equal(h.status, 200);
  assert.equal(h.corpo, '');
});

// ---------- caminhos ----------

const ATAQUES = [
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
  '/replays/demo/notas.md',
  '/package.json',
  '/server.js',
  '/plan.json',
  '/segredo.txt',
  '/specs/cards.json',
  '/.workshop/usage.jsonl',
  '/%2eworkshop/usage.jsonl',
  '/.workshop/status/x-01.json',
  '/.claude/settings.json',
  '/%2eclaude/settings.json',
  '/.git/config',
  '/.env',
  '/cards/.escondido.js',
  '/fuga.js',
  '/pasta/package.json',
  '/pasta/segredo.txt',
  '//etc/passwd',
  '/app.js%00.html',
  '/%ff%fe',
  '/api/replay/..%2f..%2fpackage.json',
  '/api/replay/%2e%2e',
  '/api/replay/demo/../../package.json',
  '/api/replay/demo/notas.md',
  '/api/replay/.workshop',
];

test('tentativas de path traversal e ficheiros escondidos sao recusadas (projeto falso com segredos)', async () => {
  for (const c of ATAQUES) {
    const r = await pedir(portaFalsa, c);
    assert.notEqual(r.status, 200, `${c} devia ser recusado`);
    assert.ok(!r.corpo.includes('SEGREDO'), `${c} devolveu um segredo`);
    assert.equal(r.headers['content-security-policy'], CSP_ESPERADA, `CSP na recusa de ${c}`);
  }
});

test('tentativas de path traversal sao recusadas (projeto real)', async () => {
  const pacote = existsSync(join(RAIZ, 'package.json')) ? readFileSync(join(RAIZ, 'package.json'), 'utf8') : '"scripts"';
  for (const c of ['/../package.json', '/%2e%2e/package.json', '/..%2fpackage.json', '/cards/..%2f..%2fpackage.json', '/package.json', '/server.js', '/.workshop/usage.jsonl', '/.claude/settings.json', '/.arena-kit.json', '/tools/reset.mjs']) {
    const r = await pedir(portaReal, c);
    assert.notEqual(r.status, 200, `${c} devia ser recusado`);
    assert.ok(!r.corpo.includes(pacote.slice(0, 40)), `${c} devolveu o package.json`);
  }
});

test('as pastas permitidas continuam a servir', async () => {
  for (const c of ['/', '/estado', '/app.js', '/cards/x-01/card.js', '/lib/ok.js', '/replays/demo/events.jsonl']) {
    assert.equal((await pedir(portaFalsa, c)).status, 200, `${c} devia ser servido`);
  }
});

// ---------- API ----------

test('/api/cards junta as specs com os cartoes que existem', async () => {
  const r = await pedir(portaFalsa, '/api/cards');
  const d = JSON.parse(r.corpo);
  assert.deepEqual(d.categorias, [{ id: 'web', nome: 'Web' }]);
  const porId = Object.fromEntries(d.cartoes.map((c) => [c.id, c]));
  assert.equal(porId['x-01'].existe, true);
  assert.equal(porId['x-02'].existe, false);
  assert.equal(porId['x-02'].title, 'Y');
  for (const k of ['id', 'title', 'category', 'difficulty', 'modo', 'model']) assert.ok(k in porId['x-02'], `falta ${k}`);
  assert.equal(d.modo, 'participante');

  const real = JSON.parse((await pedir(portaReal, '/api/cards')).corpo);
  const specs = JSON.parse(readFileSync(join(RAIZ, 'specs', 'cards.json'), 'utf8'));
  for (const c of specs.cartoes) assert.ok(real.cartoes.some((x) => x.id === c.id), `falta ${c.id} em /api/cards`);
});

test('/api/status devolve uma fotografia (vazia sem plano)', async () => {
  const d = JSON.parse((await pedir(portaReal, '/api/status')).corpo);
  assert.ok(Array.isArray(d.tarefas));
  assert.ok(d.contagem && typeof d.contagem.verde === 'number');
  assert.ok(d.custo && typeof d.custo.total === 'number');
});

test('/api/status usa o orquestrador quando ha plano', { skip: !existsSync(MOTOR) && 'sem tools/workshop/ (so numa Arena montada)' }, async () => {
  const d = JSON.parse((await pedir(portaFalsa, '/api/status')).corpo);
  assert.equal(d.total, 2);
  const x1 = d.tarefas.find((t) => t.id === 'x-01');
  assert.equal(x1.estado, 'verde');
  assert.equal(x1.custo_usd, 0.0042);
  assert.equal(x1.existe, true);
  assert.equal(d.tarefas.find((t) => t.id === 'x-02').estado, 'por_fazer');
  assert.ok(!JSON.stringify(d).includes('SEGREDO'), 'a fotografia nao copia campos estranhos do usage.jsonl');
});

test('/api/events envia a fotografia por SSE', async () => {
  const texto = await new Promise((ok, falha) => {
    const t = setTimeout(() => falha(new Error('sem evento "estado" em 3 s')), 3000);
    const req = http.get({ host: '127.0.0.1', port: portaReal, path: '/api/events' }, (res) => {
      try {
        assert.equal(res.headers['content-type'], 'text/event-stream; charset=utf-8');
        assert.equal(res.headers['content-security-policy'], CSP_ESPERADA);
      } catch (e) {
        falha(e);
      }
      let buf = '';
      res.on('data', (c) => {
        buf += c;
        const i = buf.indexOf('event: estado\n');
        if (i >= 0 && buf.indexOf('\n\n', i) > i) {
          clearTimeout(t);
          req.destroy();
          ok(buf);
        }
      });
    });
    req.on('error', (e) => {
      if (e.code !== 'ECONNRESET') falha(e);
    });
  });
  const linha = texto.slice(texto.indexOf('event: estado\n')).split('\n')[1];
  assert.ok(linha.startsWith('data: '));
  assert.ok(Array.isArray(JSON.parse(linha.slice(6)).tarefas));
});

test('/api/replay/<nome> serve eventos e fotografia, e ignora linhas partidas', async () => {
  const d = JSON.parse((await pedir(portaFalsa, '/api/replay/demo')).corpo);
  assert.equal(d.nome, 'demo');
  assert.equal(d.eventos.length, 1);
  assert.deepEqual(d.snapshot, { tarefas: [] });
  assert.equal((await pedir(portaFalsa, '/api/replay/demo/events.jsonl')).status, 200);
  assert.equal((await pedir(portaFalsa, '/api/replay/nao-existe')).status, 404);
  const lista = JSON.parse((await pedir(portaFalsa, '/api/replay')).corpo);
  assert.deepEqual(lista.repeticoes.map((x) => x.nome), ['demo']);
});

test('a repeticao de exemplo existe e e coerente', { skip: !existsSync(join(RAIZ, 'replays', 'exemplo')) && 'sem replays/exemplo' }, async () => {
  const d = JSON.parse((await pedir(portaReal, '/api/replay/exemplo')).corpo);
  assert.ok(d.eventos.length > 10);
  assert.ok(d.eventos.some((e) => e.tipo === 'inicio') && d.eventos.some((e) => e.tipo === 'fim'));
  const ids = new Set(d.snapshot.tarefas.map((t) => t.id));
  for (const e of d.eventos) if (e.tarefa) assert.ok(ids.has(e.tarefa), `evento de uma tarefa fora do snapshot: ${e.tarefa}`);
});

test('iniciar() liga so a 127.0.0.1 e passa a porta seguinte se estiver ocupada', async () => {
  const ocupado = http.createServer();
  const p = await ouvir(ocupado);
  const srv = await iniciar({ porta: p, raiz: pastaFalsa });
  try {
    assert.equal(srv.address().address, '127.0.0.1');
    assert.notEqual(srv.address().port, p);
  } finally {
    srv.fecharTudo();
    srv.close();
    ocupado.close();
  }
});

// ---------- fonte ----------

test('sem padroes perigosos em public/, templates/, pages/ e server.js', () => {
  const alvo = [
    ...['public', 'templates', 'pages'].flatMap((d) => ficheiros(join(RAIZ, d), (p) => /\.m?js$/.test(p))),
    join(RAIZ, 'server.js'),
  ];
  assert.ok(alvo.length > 5, 'nao encontrei os ficheiros da app');
  const achados = [];
  for (const f of alvo) for (const prob of problemasDeSeguranca(readFileSync(f, 'utf8'))) achados.push(`${rel(f)}: ${prob}`);
  assert.deepEqual(achados, []);
});

test('HTML sem scripts nem estilos inline e so com recursos locais', () => {
  const html = ficheiros(join(RAIZ, 'public'), (p) => extname(p) === '.html');
  assert.ok(html.length >= 2, 'faltam public/index.html e public/estado.html');
  for (const f of html) {
    const src = readFileSync(f, 'utf8');
    const nome = rel(f);
    for (const m of src.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
      assert.match(m[1], /\ssrc=["']\//, `${nome}: <script> sem src local`);
      assert.equal(m[2].trim(), '', `${nome}: <script> com codigo inline`);
    }
    assert.ok(!/<style\b/i.test(src), `${nome}: elemento <style>`);
    assert.ok(!/\sstyle\s*=/i.test(src), `${nome}: atributo style=`);
    assert.ok(!/\son[a-z]+\s*=/i.test(src), `${nome}: atributo on...=`);
    assert.ok(!/javascript\s*:/i.test(src), `${nome}: URL javascript:`);
    for (const m of src.matchAll(/\s(?:src|href)\s*=\s*["']([^"']*)["']/gi)) {
      const v = m[1];
      assert.ok(v.startsWith('#') || (v.startsWith('/') && !v.startsWith('//')), `${nome}: recurso externo ${v}`);
    }
  }
});

test('CSS so com recursos locais', () => {
  for (const f of ficheiros(join(RAIZ, 'public'), (p) => extname(p) === '.css')) {
    const src = readFileSync(f, 'utf8');
    assert.ok(!/@import/i.test(src), `${rel(f)}: @import`);
    assert.ok(!/expression\s*\(/i.test(src), `${rel(f)}: expression()`);
    for (const m of src.matchAll(/url\(\s*['"]?([^'")]+)/gi)) assert.ok(m[1].startsWith('/') && !m[1].startsWith('//'), `${rel(f)}: url externo ${m[1]}`);
  }
});
