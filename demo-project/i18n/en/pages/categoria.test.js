// Pre-written test for the pagina-categoria task (see specs/pagina-categoria.md).
// Runs in Node with the fake DOM from lib/fakedom.js: node --test pages/categoria.test.js
import { test, assert, readSource, novoContentor } from '../lib/testkit.js';
import { problemasDeSeguranca, semStringsNemComentarios } from '../lib/seguranca.js';

let mod = null;
let erroImport = null;
try {
  mod = await import('./categoria.js');
} catch (e) {
  erroImport = e;
}

test('pages/categoria.js exists and exports renderCategoria', () => {
  assert.ok(mod, `pages/categoria.js does not exist or has an error: ${erroImport?.message ?? ''}`);
  assert.equal(typeof mod.renderCategoria, 'function', 'missing export function renderCategoria(container, dados)');
});

function dados(extra = {}) {
  const abertos = [];
  return {
    abertos,
    args: {
      categoria: { id: 'web', nome: 'Web (XSS, SQLi, CSRF)' },
      cartoes: [
        { id: 'web-01', title: 'Find the SQL injection', difficulty: 1, template: 'clica-erro', estado: 'jogavel' },
        { id: 'web-02', title: 'Is this link safe?', difficulty: 2, template: 'escolha', estado: 'jogavel' },
        { id: 'web-03', title: 'Order the CSRF defense', difficulty: 2, template: 'ordenar', estado: 'jogavel' },
        { id: 'web-04', title: 'Escape the HTML', difficulty: 3, template: 'resposta', estado: 'por_construir' },
      ],
      progresso: { 'web-01': { certo: true }, 'web-02': { certo: false }, 'web-04': { certo: true }, 'outro-99': { certo: true } },
      abrir: (id) => abertos.push(id),
      ...extra,
    },
  };
}

function desenhar(extra) {
  const c = novoContentor();
  const d = dados(extra);
  mod.renderCategoria(c, d.args);
  return { c, ...d };
}

const itens = (c) => Array.from(c.querySelectorAll('li'));

if (typeof mod?.renderCategoria === 'function') {
  test('shows the category name in an h1', () => {
    const { c } = desenhar();
    const h1 = c.querySelector('h1');
    assert.ok(h1, 'missing an <h1> with the category name');
    assert.equal(h1.textContent.trim(), 'Web (XSS, SQLi, CSRF)');
  });

  test('one <li data-cartao> per card, in the order received', () => {
    const { c } = desenhar();
    const ids = itens(c).map((li) => li.getAttribute('data-cartao'));
    assert.deepEqual(ids, ['web-01', 'web-02', 'web-03', 'web-04']);
    assert.ok(c.querySelector('ul'), 'the cards go in a <ul> list');
  });

  test('each card shows the title, the level and the points', () => {
    const { c } = desenhar();
    const [a, b, , d] = itens(c);
    assert.ok(a.textContent.includes('Find the SQL injection'), 'missing the title');
    assert.ok(a.textContent.includes('Level 1'), 'missing "Level 1"');
    assert.ok(a.textContent.includes('10 points'), 'missing "10 points"');
    assert.ok(b.textContent.includes('Level 2') && b.textContent.includes('20 points'));
    assert.ok(d.textContent.includes('Level 3') && d.textContent.includes('30 points'));
  });

  test('data-estado: certo, errado, por_jogar and por_construir', () => {
    const { c } = desenhar();
    const estados = itens(c).map((li) => li.getAttribute('data-estado'));
    assert.deepEqual(estados, ['certo', 'errado', 'por_jogar', 'por_construir'], 'por_construir always wins over progress');
  });

  test('the state text of each card', () => {
    const { c } = desenhar();
    const textos = itens(c).map((li) => li.querySelector('.tile-estado')?.textContent.trim());
    assert.deepEqual(textos, ['Solved', 'Wrong, try again', 'Not played', 'Not built yet']);
  });

  test('clicking a playable card calls abrir(id)', () => {
    const { c, abertos } = desenhar();
    const b = itens(c)[2].querySelector('button');
    assert.ok(b, 'each playable card is a <button>');
    assert.equal(b.getAttribute('type'), 'button');
    assert.equal(b.getAttribute('data-abrir'), 'web-03');
    b.click();
    assert.deepEqual(abertos, ['web-03']);
  });

  test('a card not built yet is disabled and does not call abrir', () => {
    const { c, abertos } = desenhar();
    const b = itens(c)[3].querySelector('button');
    if (b) {
      assert.ok(b.hasAttribute('disabled') || b.disabled === true, 'the button of a card not built yet must have disabled');
      b.disabled = false; // even if the browser let the click through, it must not open
      b.click();
    }
    assert.deepEqual(abertos, []);
  });

  test('summary: solved cards and points of the category', () => {
    const { c } = desenhar();
    const r = c.querySelector('[data-resumo]');
    assert.ok(r, 'missing the element with data-resumo');
    assert.ok(r.textContent.includes('1 of 4 solved'), `expected "1 of 4 solved" in ${JSON.stringify(r.textContent)}`);
    assert.ok(r.textContent.includes('10 points'), `expected "10 points" in ${JSON.stringify(r.textContent)}`);
  });

  test('only certo === true counts as solved', () => {
    const { c } = desenhar({ progresso: { 'web-01': { certo: 'sim' }, 'web-02': {} } });
    const estados = itens(c).map((li) => li.getAttribute('data-estado'));
    assert.deepEqual(estados, ['errado', 'errado', 'por_jogar', 'por_construir']);
    assert.ok(c.querySelector('[data-resumo]').textContent.includes('0 of 4 solved'));
  });

  test('category with no cards: a message instead of the list', () => {
    const { c } = desenhar({ cartoes: [] });
    assert.equal(itens(c).length, 0);
    assert.ok(c.textContent.includes('No cards in this category yet.'), 'missing the empty list message');
  });

  test('the text from the data never becomes HTML', () => {
    const mau = '<img src=x onerror=alert(1)>';
    const { c } = desenhar({
      categoria: { id: 'web', nome: mau },
      cartoes: [{ id: 'web-09', title: mau, difficulty: 1, template: 'escolha', estado: 'jogavel' }],
    });
    assert.equal(c.querySelector('img'), null, 'created an <img> from the text');
    assert.equal(c.querySelector('h1').textContent.trim(), mau);
    assert.ok(itens(c)[0].textContent.includes(mau));
  });

  test('drawing again replaces the previous content', () => {
    const c = novoContentor();
    const d = dados();
    mod.renderCategoria(c, d.args);
    mod.renderCategoria(c, d.args);
    assert.equal(itens(c).length, 4, 'the cards were repeated');
    assert.equal(c.querySelectorAll('h1').length, 1);
  });

  test('marks the section with the category', () => {
    const { c } = desenhar();
    const s = c.querySelector('[data-categoria]');
    assert.ok(s, 'missing <section class="categoria" data-categoria="...">');
    assert.equal(s.getAttribute('data-categoria'), 'web');
    assert.ok(s.classList.contains('categoria'));
  });

  test('safe source', async () => {
    const src = await readSource('./categoria.js', import.meta.url);
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
