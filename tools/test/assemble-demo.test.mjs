// Testes do installer/assemble-demo.mjs: lingua da Arena (pt/en), copia sem i18n/, sobreposicao inglesa,
// ficheiros gerados e coerencia entre as traducoes do codigo (demo-project/i18n/en/) e o original.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, dirname, relative, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { args, linguaArena, montar } from '../../installer/assemble-demo.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DEMO = join(ROOT, 'demo-project');
const EN = join(DEMO, 'i18n', 'en');
const temEn = existsSync(join(EN, 'specs', 'cards.json'));

const ler = (p) => readFileSync(p, 'utf8');
const lerJson = (p) => JSON.parse(ler(p));
const semLingua = () => Object.fromEntries(Object.entries(process.env).filter(([k]) => k !== 'WORKSHOP_LANG'));

function ficheiros(dir, out = []) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) ficheiros(p, out);
    else out.push(relative(EN, p).split(sep).join('/'));
  }
  return out;
}

function montarEm(l) {
  const dest = join(mkdtempSync(join(tmpdir(), `arena-${l}-`)), 'arena');
  const r = montar({ dest, node: process.execPath, git: false, probe: false, lingua: l });
  return { dest, r, limpar: () => rmSync(dirname(dest), { recursive: true, force: true }) };
}

function correr(cwd, script, ...a) {
  return spawnSync(process.execPath, [script, ...a], { cwd, encoding: 'utf8', env: semLingua() });
}

test('linguaArena: WORKSHOP_LANG, depois lingua.json do kit, depois o locale', () => {
  const vazio = mkdtempSync(join(tmpdir(), 'arena-kit-'));
  try {
    assert.equal(linguaArena({ env: { WORKSHOP_LANG: 'en', LANG: 'pt_PT.UTF-8' }, raiz: vazio }), 'en');
    assert.equal(linguaArena({ env: { WORKSHOP_LANG: 'pt_BR.UTF-8' }, raiz: vazio }), 'pt');
    assert.equal(linguaArena({ env: { LANG: 'pt_PT.UTF-8' }, raiz: vazio }), 'pt');
    assert.equal(linguaArena({ env: { LC_ALL: 'he_IL.UTF-8', LANG: 'pt_PT.UTF-8' }, raiz: vazio }), 'en');
    writeFileSync(join(vazio, 'lingua.json'), '{"lingua":"pt"}');
    assert.equal(linguaArena({ env: { LANG: 'en_US.UTF-8' }, raiz: vazio }), 'pt');
    assert.equal(linguaArena({ env: { WORKSHOP_LANG: 'en' }, raiz: vazio }), 'en');
  } finally {
    rmSync(vazio, { recursive: true, force: true });
  }
});

test('args: --lingua aceita pt, en e etiquetas de locale; vazio e erro', () => {
  assert.equal(args(['--dest', 'x', '--lingua', 'en']).lingua, 'en');
  assert.equal(args(['--dest', 'x', '--lingua', 'pt-PT']).lingua, 'pt');
  assert.equal(args(['--dest', 'x']).lingua, null);
  assert.throws(() => args(['--dest', 'x', '--lingua']), /--lingua/);
  assert.throws(() => args(['--dest', 'x', '--lingua', 'C']), /--lingua/);
});

test('Arena em pt: igual a demo-project/ (sem i18n/), com a lingua gravada', () => {
  const { dest, r, limpar } = montarEm('pt');
  try {
    assert.equal(r.lingua, 'pt');
    assert.equal(lerJson(join(dest, '.arena-kit.json')).lingua, 'pt');
    assert.deepEqual(lerJson(join(dest, 'tools', 'workshop', 'lingua.json')), { lingua: 'pt' });
    assert.ok(!existsSync(join(dest, 'i18n')), 'i18n/ nao entra na Arena');
    for (const f of ['TASKS.md', 'README.md', 'specs/cards.json', 'cards/pw-01/spec.md', 'cards/pw-01/card.test.js', 'lib/textos.js', 'public/index.html', 'pages/categoria.test.js']) {
      assert.equal(ler(join(dest, f)), ler(join(DEMO, f)), `${f} mudou na Arena em pt`);
    }
    const p = correr(dest, 'tools/reset.mjs', '--sim');
    assert.match(p.stderr, /^Recusado: esta pasta não é um repositório git\./);
  } finally {
    limpar();
  }
});

test('Arena em en: sobreposicao de i18n/en/, cartoes e TASKS.md gerados em ingles', { skip: !temEn && 'sem demo-project/i18n/en/specs/cards.json' }, () => {
  const { dest, r, limpar } = montarEm('en');
  try {
    assert.equal(r.lingua, 'en');
    assert.equal(lerJson(join(dest, '.arena-kit.json')).lingua, 'en');
    assert.deepEqual(lerJson(join(dest, 'tools', 'workshop', 'lingua.json')), { lingua: 'en' });
    assert.ok(!existsSync(join(dest, 'i18n')), 'i18n/ nao entra na Arena');
    for (const f of ficheiros(EN)) assert.equal(ler(join(dest, f)), ler(join(EN, f)), `${f} devia vir de i18n/en/`);
    assert.ok(ler(join(dest, 'TASKS.md')).startsWith('# TASKS — Security Arena\n'));
    assert.ok(ler(join(dest, 'cards', 'pw-01', 'spec.md')).startsWith('# Card pw-01 — '));
    assert.match(ler(join(dest, 'cards', 'pw-01', 'card.test.js')), /test\('pw-01: card\.js exists and loads'/);
    assert.equal(correr(dest, 'tools/gen.mjs', '--check').status, 0, 'os ficheiros gerados estao atualizados');
    // As ferramentas leem tools/workshop/lingua.json.
    const p = correr(dest, 'tools/reset.mjs', '--sim');
    assert.match(p.stderr, /^Refused: this folder is not a git repository\./);
    const plano = correr(dest, 'tools/plan.mjs');
    assert.equal(plano.status, 0, plano.stderr);
    assert.ok(ler(join(dest, 'PLANO.md')).startsWith('# Arena plan — participant mode\n'));
    assert.match(ler(join(dest, 'plan.json')), /"instrucoes": "Build the card pw-01/);
    // A app em ingles passa os proprios testes (servidor, CSP, HTML sem inline).
    const app = spawnSync(process.execPath, ['--test', 'test/app.test.js'], { cwd: dest, encoding: 'utf8', env: semLingua() });
    assert.equal(app.status, 0, app.stdout.slice(-2000));
  } finally {
    limpar();
  }
});

// ---------- coerencia das traducoes do codigo ----------

function forma(v) {
  if (typeof v === 'function') return `fn/${v.length}`;
  if (v && typeof v === 'object') return Object.fromEntries(Object.keys(v).sort().map((k) => [k, forma(v[k])]));
  return typeof v;
}

test('i18n/en: cada ficheiro substitui um ficheiro que existe em demo-project/', () => {
  for (const f of ficheiros(EN)) assert.ok(existsSync(join(DEMO, f)), `i18n/en/${f} nao tem original em demo-project/${f}`);
});

test('lib/textos.js: a versao inglesa tem as mesmas chaves (e os mesmos argumentos)', async () => {
  const pt = await import(pathToFileURL(join(DEMO, 'lib', 'textos.js')).href);
  const en = await import(pathToFileURL(join(EN, 'lib', 'textos.js')).href);
  assert.equal(pt.LINGUA, 'pt');
  assert.equal(en.LINGUA, 'en');
  assert.deepEqual(forma(en.T), forma(pt.T));
});

test('HTML ingles: a mesma estrutura (ids, data-*, scripts e estilos) e lang="en"', () => {
  const estrutura = (src) => [...src.matchAll(/\s(id|data-[a-z-]+|src|href|rel|class)="([^"]*)"/g)].map((m) => `${m[1]}=${m[2]}`);
  for (const f of ['index.html', 'estado.html']) {
    const pt = ler(join(DEMO, 'public', f));
    const en = ler(join(EN, 'public', f));
    assert.match(pt, /<html lang="pt-PT"/);
    assert.match(en, /<html lang="en"/);
    assert.deepEqual(estrutura(en), estrutura(pt), `public/${f}: a estrutura mudou numa das versoes`);
  }
});

test('testes ingleses: os mesmos testes que os portugueses', () => {
  const conta = (src) => (src.match(/^\s*test\(/gm) || []).length;
  for (const f of ['pages/categoria.test.js', 'pages/pontuacao.test.js', 'lib/hash.test.js']) {
    assert.equal(conta(ler(join(EN, f))), conta(ler(join(DEMO, f))), `${f}: numero de testes diferente`);
  }
});
