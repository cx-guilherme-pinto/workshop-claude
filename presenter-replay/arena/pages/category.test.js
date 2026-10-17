// Teste pré-escrito para a tarefa category-page (ver specs/category-page.md).
// Corre em Node com o DOM falso de lib/fakedom.js: node --test pages/category.test.js
import { test, assert, readSource, newContainer } from '../lib/testkit.js';
import { securityProblems, stripStringsAndComments } from '../lib/security.js';

let mod = null;
let importError = null;
try {
  mod = await import('./category.js');
} catch (e) {
  importError = e;
}

test('pages/category.js existe e exporta renderCategory', () => {
  assert.ok(mod, `pages/category.js não existe ou tem um erro: ${importError?.message ?? ''}`);
  assert.equal(typeof mod.renderCategory, 'function', 'falta export function renderCategory(container, data)');
});

function data(extra = {}) {
  const opened = [];
  return {
    opened,
    args: {
      category: { id: 'web', name: 'Web (XSS, SQLi, CSRF)' },
      cards: [
        { id: 'web-01', title: 'Encontra a injeção SQL', difficulty: 1, template: 'spot-the-flaw', status: 'playable' },
        { id: 'web-02', title: 'Este link é seguro?', difficulty: 2, template: 'choice', status: 'playable' },
        { id: 'web-03', title: 'Ordena a defesa contra CSRF', difficulty: 2, template: 'order', status: 'playable' },
        { id: 'web-04', title: 'Escapa o HTML', difficulty: 3, template: 'answer', status: 'not_built' },
      ],
      progress: { 'web-01': { correct: true }, 'web-02': { correct: false }, 'web-04': { correct: true }, 'other-99': { correct: true } },
      open: (id) => opened.push(id),
      ...extra,
    },
  };
}

function draw(extra) {
  const c = newContainer();
  const d = data(extra);
  mod.renderCategory(c, d.args);
  return { c, ...d };
}

const items = (c) => Array.from(c.querySelectorAll('li'));

if (typeof mod?.renderCategory === 'function') {
  test('mostra o nome da categoria num h1', () => {
    const { c } = draw();
    const h1 = c.querySelector('h1');
    assert.ok(h1, 'falta um <h1> com o nome da categoria');
    assert.equal(h1.textContent.trim(), 'Web (XSS, SQLi, CSRF)');
  });

  test('um <li data-card> por cartão, pela ordem recebida', () => {
    const { c } = draw();
    const ids = items(c).map((li) => li.getAttribute('data-card'));
    assert.deepEqual(ids, ['web-01', 'web-02', 'web-03', 'web-04']);
    assert.ok(c.querySelector('ul'), 'os cartões vão numa lista <ul>');
  });

  test('cada cartão mostra o título, o nível e os pontos', () => {
    const { c } = draw();
    const [a, b, , d] = items(c);
    assert.ok(a.textContent.includes('Encontra a injeção SQL'), 'falta o título');
    assert.ok(a.textContent.includes('Nível 1'), 'falta "Nível 1"');
    assert.ok(a.textContent.includes('10 pontos'), 'falta "10 pontos"');
    assert.ok(b.textContent.includes('Nível 2') && b.textContent.includes('20 pontos'));
    assert.ok(d.textContent.includes('Nível 3') && d.textContent.includes('30 pontos'));
  });

  test('data-status: solved, wrong, not_played e not_built', () => {
    const { c } = draw();
    const states = items(c).map((li) => li.getAttribute('data-status'));
    assert.deepEqual(states, ['solved', 'wrong', 'not_played', 'not_built'], 'not_built ganha sempre ao progresso');
  });

  test('o texto do estado de cada cartão', () => {
    const { c } = draw();
    const texts = items(c).map((li) => li.querySelector('.tile-status')?.textContent.trim());
    assert.deepEqual(texts, ['Resolvido', 'Errado, tenta outra vez', 'Por jogar', 'Por construir']);
  });

  test('carregar num cartão jogável chama open(id)', () => {
    const { c, opened } = draw();
    const b = items(c)[2].querySelector('button');
    assert.ok(b, 'cada cartão jogável é um <button>');
    assert.equal(b.getAttribute('type'), 'button');
    assert.equal(b.getAttribute('data-open'), 'web-03');
    b.click();
    assert.deepEqual(opened, ['web-03']);
  });

  test('um cartão por construir fica desativado e não chama open', () => {
    const { c, opened } = draw();
    const b = items(c)[3].querySelector('button');
    if (b) {
      assert.ok(b.hasAttribute('disabled') || b.disabled === true, 'o botão de um cartão por construir tem de ter disabled');
      b.disabled = false; // mesmo que o browser deixasse carregar, não pode abrir
      b.click();
    }
    assert.deepEqual(opened, []);
  });

  test('resumo: resolvidos e pontos da categoria', () => {
    const { c } = draw();
    const r = c.querySelector('[data-summary]');
    assert.ok(r, 'falta o elemento com data-summary');
    assert.ok(r.textContent.includes('1 de 4 resolvidos'), `esperava "1 de 4 resolvidos" em ${JSON.stringify(r.textContent)}`);
    assert.ok(r.textContent.includes('10 pontos'), `esperava "10 pontos" em ${JSON.stringify(r.textContent)}`);
  });

  test('só correct === true conta como resolvido', () => {
    const { c } = draw({ progress: { 'web-01': { correct: 'yes' }, 'web-02': {} } });
    const states = items(c).map((li) => li.getAttribute('data-status'));
    assert.deepEqual(states, ['wrong', 'wrong', 'not_played', 'not_built']);
    assert.ok(c.querySelector('[data-summary]').textContent.includes('0 de 4 resolvidos'));
  });

  test('categoria sem cartões: mensagem em vez da lista', () => {
    const { c } = draw({ cards: [] });
    assert.equal(items(c).length, 0);
    assert.ok(c.textContent.includes('Ainda não há cartões nesta categoria.'), 'falta a mensagem de lista vazia');
  });

  test('o texto dos dados nunca vira HTML', () => {
    const bad = '<img src=x onerror=alert(1)>';
    const { c } = draw({
      category: { id: 'web', name: bad },
      cards: [{ id: 'web-09', title: bad, difficulty: 1, template: 'choice', status: 'playable' }],
    });
    assert.equal(c.querySelector('img'), null, 'criou um <img> a partir do texto');
    assert.equal(c.querySelector('h1').textContent.trim(), bad);
    assert.ok(items(c)[0].textContent.includes(bad));
  });

  test('desenhar outra vez substitui o conteúdo anterior', () => {
    const c = newContainer();
    const d = data();
    mod.renderCategory(c, d.args);
    mod.renderCategory(c, d.args);
    assert.equal(items(c).length, 4, 'os cartões ficaram repetidos');
    assert.equal(c.querySelectorAll('h1').length, 1);
  });

  test('marca a secção com a categoria', () => {
    const { c } = draw();
    const s = c.querySelector('[data-category]');
    assert.ok(s, 'falta <section class="category" data-category="...">');
    assert.equal(s.getAttribute('data-category'), 'web');
    assert.ok(s.classList.contains('category'));
  });

  test('fonte segura', async () => {
    const src = await readSource('./category.js', import.meta.url);
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
