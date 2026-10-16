// Pre-written test for the tabela-pontuacao task (see specs/tabela-pontuacao.md).
// Runs in Node with the fake DOM from lib/fakedom.js: node --test pages/pontuacao.test.js
import { test, assert, readSource, novoContentor } from '../lib/testkit.js';
import { problemasDeSeguranca, semStringsNemComentarios } from '../lib/seguranca.js';

let mod = null;
let erroImport = null;
try {
  mod = await import('./pontuacao.js');
} catch (e) {
  erroImport = e;
}

test('pages/pontuacao.js exists and exports renderPontuacao', () => {
  assert.ok(mod, `pages/pontuacao.js does not exist or has an error: ${erroImport?.message ?? ''}`);
  assert.equal(typeof mod.renderPontuacao, 'function', 'missing export function renderPontuacao(container, dados)');
});

function dados(extra = {}) {
  return {
    categorias: [
      { id: 'web', nome: 'Web (XSS, SQLi, CSRF)' },
      { id: 'passwords', nome: 'Passwords' },
      { id: 'redes', nome: 'Networks' },
    ],
    cartoes: [
      { id: 'web-01', category: 'web', difficulty: 2 },
      { id: 'web-02', category: 'web', difficulty: 3 },
      { id: 'web-03', category: 'web', difficulty: 1 },
      { id: 'pw-01', category: 'passwords', difficulty: 1 },
      { id: 'pw-02', category: 'passwords', difficulty: 2 },
    ],
    progresso: {
      'web-01': { certo: true },
      'web-02': { certo: false },
      'pw-01': { certo: true },
      'pw-02': { certo: true },
      'fantasma-01': { certo: true },
    },
    ...extra,
  };
}

function desenhar(extra) {
  const c = novoContentor();
  mod.renderPontuacao(c, dados(extra));
  return c;
}

const linha = (c, id) => Array.from(c.querySelectorAll('tr')).find((tr) => tr.getAttribute('data-categoria') === id);
const total = (c) => Array.from(c.querySelectorAll('tr')).find((tr) => tr.hasAttribute('data-total'));
const celula = (tr, nome) => tr?.querySelector(`[${nome}]`);
const texto = (n) => (n ? n.textContent.trim() : null);

if (typeof mod?.renderPontuacao === 'function') {
  test('draws a table with an h1', () => {
    const c = desenhar();
    assert.ok(c.querySelector('table'), 'missing the <table>');
    assert.ok(c.querySelector('h1'), 'missing the <h1> "Score"');
    assert.equal(texto(c.querySelector('h1')), 'Score');
  });

  test('one row per category, in the order received', () => {
    const c = desenhar();
    const ids = Array.from(c.querySelectorAll('tr')).map((tr) => tr.getAttribute('data-categoria')).filter(Boolean);
    assert.deepEqual(ids, ['web', 'passwords', 'redes']);
    assert.ok(texto(linha(c, 'passwords')).includes('Passwords'), 'each row shows the category name');
  });

  test('points = difficulty x 10 per solved card', () => {
    const c = desenhar();
    assert.equal(texto(celula(linha(c, 'web'), 'data-pontos')), '20');
    assert.equal(texto(celula(linha(c, 'passwords'), 'data-pontos')), '30');
    assert.equal(texto(celula(linha(c, 'redes'), 'data-pontos')), '0');
  });

  test('solved: "X of Y" per category', () => {
    const c = desenhar();
    assert.equal(texto(celula(linha(c, 'web'), 'data-resolvidos')), '1 of 3');
    assert.equal(texto(celula(linha(c, 'passwords'), 'data-resolvidos')), '2 of 2');
    assert.equal(texto(celula(linha(c, 'redes'), 'data-resolvidos')), '0 of 0');
  });

  test('total row', () => {
    const c = desenhar();
    const t = total(c);
    assert.ok(t, 'missing the <tr data-total> row');
    assert.equal(texto(celula(t, 'data-pontos')), '50');
    assert.equal(texto(celula(t, 'data-resolvidos')), '3 of 5');
    assert.ok(texto(t).includes('Total'));
  });

  test('numbers use the "numero" class (tabular-nums in the CSS)', () => {
    const c = desenhar();
    for (const n of [celula(linha(c, 'web'), 'data-pontos'), celula(linha(c, 'web'), 'data-resolvidos'), celula(total(c), 'data-pontos')]) {
      assert.ok(n.classList.contains('numero'), 'each number cell has class="numero"');
    }
  });

  test('only certo === true counts; progress of unknown cards is ignored', () => {
    const c = desenhar({ progresso: { 'web-01': { certo: 'sim' }, 'web-03': { certo: true }, 'x-01': { certo: true } } });
    assert.equal(texto(celula(linha(c, 'web'), 'data-pontos')), '10');
    assert.equal(texto(celula(total(c), 'data-pontos')), '10');
    assert.equal(texto(celula(total(c), 'data-resolvidos')), '1 of 5');
  });

  test('no progress: everything at zero', () => {
    const c = desenhar({ progresso: {} });
    assert.equal(texto(celula(total(c), 'data-pontos')), '0');
    assert.equal(texto(celula(total(c), 'data-resolvidos')), '0 of 5');
  });

  test('summary with the total points and the maximum possible', () => {
    const c = desenhar();
    const r = c.querySelector('[data-resumo]');
    assert.ok(r, 'missing the element with data-resumo');
    assert.ok(texto(r).includes('50 points'), `expected "50 points" in ${JSON.stringify(texto(r))}`);
    assert.ok(texto(r).includes('90'), `the maximum possible (90) must show up in ${JSON.stringify(texto(r))}`);
  });

  test('the text from the data never becomes HTML', () => {
    const mau = '<img src=x onerror=alert(1)>';
    const c = desenhar({ categorias: [{ id: 'web', nome: mau }] });
    assert.equal(c.querySelector('img'), null, 'created an <img> from the text');
    assert.ok(texto(linha(c, 'web')).includes(mau));
  });

  test('drawing again replaces the previous content', () => {
    const c = novoContentor();
    mod.renderPontuacao(c, dados());
    mod.renderPontuacao(c, dados());
    assert.equal(c.querySelectorAll('table').length, 1, 'there are two tables');
  });

  test('safe source', async () => {
    const src = await readSource('./pontuacao.js', import.meta.url);
    assert.deepEqual(problemasDeSeguranca(src), []);
    const codigo = semStringsNemComentarios(src);
    assert.ok(!/\bdocument\b|\bwindow\b/.test(codigo), 'use container.ownerDocument, never document or window');
    assert.ok(!/\bfetch\s*\(|\blocalStorage\b|\bsessionStorage\b|\bimport\s*\(/.test(codigo), 'no fetch, storage or dynamic import()');
    for (const m of src.matchAll(/^\s*import\s[^'"]*['"]([^'"]+)['"]/gm)) {
      assert.match(m[1], /^\.\.\/(templates|lib)\/[\w-]+\.js$/, `import not allowed: ${m[1]}`);
    }
    assert.match(src, /from\s+['"]\.\.\/templates\/common\.js['"]/, 'use h() from ../templates/common.js');
  });
}
