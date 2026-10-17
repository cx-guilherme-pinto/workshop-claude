// Teste pré-escrito para a tarefa score-table (ver specs/score-table.md).
// Corre em Node com o DOM falso de lib/fakedom.js: node --test pages/score.test.js
import { test, assert, readSource, newContainer } from '../lib/testkit.js';
import { securityProblems, stripStringsAndComments } from '../lib/security.js';

let mod = null;
let importError = null;
try {
  mod = await import('./score.js');
} catch (e) {
  importError = e;
}

test('pages/score.js existe e exporta renderScore', () => {
  assert.ok(mod, `pages/score.js não existe ou tem um erro: ${importError?.message ?? ''}`);
  assert.equal(typeof mod.renderScore, 'function', 'falta export function renderScore(container, data)');
});

function data(extra = {}) {
  return {
    categories: [
      { id: 'web', name: 'Web (XSS, SQLi, CSRF)' },
      { id: 'passwords', name: 'Passwords' },
      { id: 'networks', name: 'Redes' },
    ],
    cards: [
      { id: 'web-01', category: 'web', difficulty: 2 },
      { id: 'web-02', category: 'web', difficulty: 3 },
      { id: 'web-03', category: 'web', difficulty: 1 },
      { id: 'pw-01', category: 'passwords', difficulty: 1 },
      { id: 'pw-02', category: 'passwords', difficulty: 2 },
    ],
    progress: {
      'web-01': { correct: true },
      'web-02': { correct: false },
      'pw-01': { correct: true },
      'pw-02': { correct: true },
      'ghost-01': { correct: true },
    },
    ...extra,
  };
}

function draw(extra) {
  const c = newContainer();
  mod.renderScore(c, data(extra));
  return c;
}

const row = (c, id) => Array.from(c.querySelectorAll('tr')).find((tr) => tr.getAttribute('data-category') === id);
const total = (c) => Array.from(c.querySelectorAll('tr')).find((tr) => tr.hasAttribute('data-total'));
const cell = (tr, name) => tr?.querySelector(`[${name}]`);
const text = (n) => (n ? n.textContent.trim() : null);

if (typeof mod?.renderScore === 'function') {
  test('desenha uma tabela com um h1', () => {
    const c = draw();
    assert.ok(c.querySelector('table'), 'falta a <table>');
    assert.ok(c.querySelector('h1'), 'falta o <h1> "Pontuação"');
    assert.equal(text(c.querySelector('h1')), 'Pontuação');
  });

  test('uma linha por categoria, pela ordem recebida', () => {
    const c = draw();
    const ids = Array.from(c.querySelectorAll('tr')).map((tr) => tr.getAttribute('data-category')).filter(Boolean);
    assert.deepEqual(ids, ['web', 'passwords', 'networks']);
    assert.ok(text(row(c, 'passwords')).includes('Passwords'), 'cada linha mostra o nome da categoria');
  });

  test('pontos = dificuldade x 10 por cartão resolvido', () => {
    const c = draw();
    assert.equal(text(cell(row(c, 'web'), 'data-points')), '20');
    assert.equal(text(cell(row(c, 'passwords'), 'data-points')), '30');
    assert.equal(text(cell(row(c, 'networks'), 'data-points')), '0');
  });

  test('resolvidos: "X de Y" por categoria', () => {
    const c = draw();
    assert.equal(text(cell(row(c, 'web'), 'data-solved')), '1 de 3');
    assert.equal(text(cell(row(c, 'passwords'), 'data-solved')), '2 de 2');
    assert.equal(text(cell(row(c, 'networks'), 'data-solved')), '0 de 0');
  });

  test('linha do total', () => {
    const c = draw();
    const t = total(c);
    assert.ok(t, 'falta a linha <tr data-total>');
    assert.equal(text(cell(t, 'data-points')), '50');
    assert.equal(text(cell(t, 'data-solved')), '3 de 5');
    assert.ok(text(t).includes('Total'));
  });

  test('os números usam a classe "number" (tabular-nums no CSS)', () => {
    const c = draw();
    for (const n of [cell(row(c, 'web'), 'data-points'), cell(row(c, 'web'), 'data-solved'), cell(total(c), 'data-points')]) {
      assert.ok(n.classList.contains('number'), 'cada célula numérica tem class="number"');
    }
  });

  test('só correct === true conta; progresso de cartões desconhecidos é ignorado', () => {
    const c = draw({ progress: { 'web-01': { correct: 'yes' }, 'web-03': { correct: true }, 'x-01': { correct: true } } });
    assert.equal(text(cell(row(c, 'web'), 'data-points')), '10');
    assert.equal(text(cell(total(c), 'data-points')), '10');
    assert.equal(text(cell(total(c), 'data-solved')), '1 de 5');
  });

  test('sem progresso: tudo a zero', () => {
    const c = draw({ progress: {} });
    assert.equal(text(cell(total(c), 'data-points')), '0');
    assert.equal(text(cell(total(c), 'data-solved')), '0 de 5');
  });

  test('resumo com o total de pontos e o máximo possível', () => {
    const c = draw();
    const r = c.querySelector('[data-summary]');
    assert.ok(r, 'falta o elemento com data-summary');
    assert.ok(text(r).includes('50 pontos'), `esperava "50 pontos" em ${JSON.stringify(text(r))}`);
    assert.ok(text(r).includes('90'), `o máximo possível (90) tem de aparecer em ${JSON.stringify(text(r))}`);
  });

  test('o texto dos dados nunca vira HTML', () => {
    const bad = '<img src=x onerror=alert(1)>';
    const c = draw({ categories: [{ id: 'web', name: bad }] });
    assert.equal(c.querySelector('img'), null, 'criou um <img> a partir do texto');
    assert.ok(text(row(c, 'web')).includes(bad));
  });

  test('desenhar outra vez substitui o conteúdo anterior', () => {
    const c = newContainer();
    mod.renderScore(c, data());
    mod.renderScore(c, data());
    assert.equal(c.querySelectorAll('table').length, 1, 'ficaram duas tabelas');
  });

  test('fonte segura', async () => {
    const src = await readSource('./score.js', import.meta.url);
    assert.deepEqual(securityProblems(src), []);
    const code = stripStringsAndComments(src);
    assert.ok(!/\bdocument\b|\bwindow\b/.test(code), 'usa container.ownerDocument, nunca document nem window');
    assert.ok(!/\bfetch\s*\(|\blocalStorage\b|\bsessionStorage\b|\bimport\s*\(/.test(code), 'sem fetch, armazenamento nem import() dinâmico');
    for (const m of src.matchAll(/^\s*import\s[^'"]*['"]([^'"]+)['"]/gm)) {
      assert.match(m[1], /^\.\.\/(templates|lib)\/[\w-]+\.js$/, `import não permitido: ${m[1]}`);
    }
    assert.match(src, /from\s+['"]\.\.\/templates\/common\.js['"]/, 'usa h() de ../templates/common.js');
  });
}
