// Teste pre-escrito para a tarefa pagina-categoria (ver specs/pagina-categoria.md).
// Corre em Node com o DOM falso de lib/fakedom.js: node --test pages/categoria.test.js
import { test, assert, readSource, novoContentor } from '../lib/testkit.js';
import { problemasDeSeguranca, semStringsNemComentarios } from '../lib/seguranca.js';

let mod = null;
let erroImport = null;
try {
  mod = await import('./categoria.js');
} catch (e) {
  erroImport = e;
}

test('pages/categoria.js existe e exporta renderCategoria', () => {
  assert.ok(mod, `pages/categoria.js nao existe ou tem um erro: ${erroImport?.message ?? ''}`);
  assert.equal(typeof mod.renderCategoria, 'function', 'falta export function renderCategoria(container, dados)');
});

function dados(extra = {}) {
  const abertos = [];
  return {
    abertos,
    args: {
      categoria: { id: 'web', nome: 'Web (XSS, SQLi, CSRF)' },
      cartoes: [
        { id: 'web-01', title: 'Encontra a injeção SQL', difficulty: 1, template: 'clica-erro', estado: 'jogavel' },
        { id: 'web-02', title: 'Este link é seguro?', difficulty: 2, template: 'escolha', estado: 'jogavel' },
        { id: 'web-03', title: 'Ordena a defesa contra CSRF', difficulty: 2, template: 'ordenar', estado: 'jogavel' },
        { id: 'web-04', title: 'Escapa o HTML', difficulty: 3, template: 'resposta', estado: 'por_construir' },
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
  test('mostra o nome da categoria num h1', () => {
    const { c } = desenhar();
    const h1 = c.querySelector('h1');
    assert.ok(h1, 'falta um <h1> com o nome da categoria');
    assert.equal(h1.textContent.trim(), 'Web (XSS, SQLi, CSRF)');
  });

  test('um <li data-cartao> por cartao, pela ordem recebida', () => {
    const { c } = desenhar();
    const ids = itens(c).map((li) => li.getAttribute('data-cartao'));
    assert.deepEqual(ids, ['web-01', 'web-02', 'web-03', 'web-04']);
    assert.ok(c.querySelector('ul'), 'os cartoes vao numa lista <ul>');
  });

  test('cada cartao mostra o titulo, o nivel e os pontos', () => {
    const { c } = desenhar();
    const [a, b, , d] = itens(c);
    assert.ok(a.textContent.includes('Encontra a injeção SQL'), 'falta o titulo');
    assert.ok(a.textContent.includes('Nível 1'), 'falta "Nível 1"');
    assert.ok(a.textContent.includes('10 pontos'), 'falta "10 pontos"');
    assert.ok(b.textContent.includes('Nível 2') && b.textContent.includes('20 pontos'));
    assert.ok(d.textContent.includes('Nível 3') && d.textContent.includes('30 pontos'));
  });

  test('data-estado: certo, errado, por_jogar e por_construir', () => {
    const { c } = desenhar();
    const estados = itens(c).map((li) => li.getAttribute('data-estado'));
    assert.deepEqual(estados, ['certo', 'errado', 'por_jogar', 'por_construir'], 'por_construir ganha sempre ao progresso');
  });

  test('o texto do estado de cada cartao', () => {
    const { c } = desenhar();
    const textos = itens(c).map((li) => li.querySelector('.tile-estado')?.textContent.trim());
    assert.deepEqual(textos, ['Resolvido', 'Errado, tenta outra vez', 'Por jogar', 'Por construir']);
  });

  test('carregar num cartao jogavel chama abrir(id)', () => {
    const { c, abertos } = desenhar();
    const b = itens(c)[2].querySelector('button');
    assert.ok(b, 'cada cartao jogavel e um <button>');
    assert.equal(b.getAttribute('type'), 'button');
    assert.equal(b.getAttribute('data-abrir'), 'web-03');
    b.click();
    assert.deepEqual(abertos, ['web-03']);
  });

  test('um cartao por construir fica desativado e nao chama abrir', () => {
    const { c, abertos } = desenhar();
    const b = itens(c)[3].querySelector('button');
    if (b) {
      assert.ok(b.hasAttribute('disabled') || b.disabled === true, 'o botao de um cartao por construir tem de ter disabled');
      b.disabled = false; // mesmo que o browser deixasse carregar, nao pode abrir
      b.click();
    }
    assert.deepEqual(abertos, []);
  });

  test('resumo: resolvidos e pontos da categoria', () => {
    const { c } = desenhar();
    const r = c.querySelector('[data-resumo]');
    assert.ok(r, 'falta o elemento com data-resumo');
    assert.ok(r.textContent.includes('1 de 4 resolvidos'), `esperava "1 de 4 resolvidos" em ${JSON.stringify(r.textContent)}`);
    assert.ok(r.textContent.includes('10 pontos'), `esperava "10 pontos" em ${JSON.stringify(r.textContent)}`);
  });

  test('so certo === true conta como resolvido', () => {
    const { c } = desenhar({ progresso: { 'web-01': { certo: 'sim' }, 'web-02': {} } });
    const estados = itens(c).map((li) => li.getAttribute('data-estado'));
    assert.deepEqual(estados, ['errado', 'errado', 'por_jogar', 'por_construir']);
    assert.ok(c.querySelector('[data-resumo]').textContent.includes('0 de 4 resolvidos'));
  });

  test('categoria sem cartoes: mensagem em vez da lista', () => {
    const { c } = desenhar({ cartoes: [] });
    assert.equal(itens(c).length, 0);
    assert.ok(c.textContent.includes('Ainda não há cartões nesta categoria.'), 'falta a mensagem de lista vazia');
  });

  test('o texto dos dados nunca vira HTML', () => {
    const mau = '<img src=x onerror=alert(1)>';
    const { c } = desenhar({
      categoria: { id: 'web', nome: mau },
      cartoes: [{ id: 'web-09', title: mau, difficulty: 1, template: 'escolha', estado: 'jogavel' }],
    });
    assert.equal(c.querySelector('img'), null, 'criou um <img> a partir do texto');
    assert.equal(c.querySelector('h1').textContent.trim(), mau);
    assert.ok(itens(c)[0].textContent.includes(mau));
  });

  test('desenhar outra vez substitui o conteudo anterior', () => {
    const c = novoContentor();
    const d = dados();
    mod.renderCategoria(c, d.args);
    mod.renderCategoria(c, d.args);
    assert.equal(itens(c).length, 4, 'os cartoes ficaram repetidos');
    assert.equal(c.querySelectorAll('h1').length, 1);
  });

  test('marca a seccao com a categoria', () => {
    const { c } = desenhar();
    const s = c.querySelector('[data-categoria]');
    assert.ok(s, 'falta <section class="categoria" data-categoria="...">');
    assert.equal(s.getAttribute('data-categoria'), 'web');
    assert.ok(s.classList.contains('categoria'));
  });

  test('fonte segura', async () => {
    const src = await readSource('./categoria.js', import.meta.url);
    assert.deepEqual(problemasDeSeguranca(src), []);
    const codigo = semStringsNemComentarios(src);
    assert.ok(!/\bdocument\b|\bwindow\b/.test(codigo), 'usa container.ownerDocument, nunca document nem window');
    assert.ok(!/\bfetch\s*\(|\blocalStorage\b|\bsessionStorage\b|\bimport\s*\(/.test(codigo), 'sem fetch, armazenamento nem import() dinamico');
    for (const m of src.matchAll(/^\s*import\s[^'"]*['"]([^'"]+)['"]/gm)) {
      assert.match(m[1], /^\.\.\/(templates|lib)\/[\w-]+\.js$/, `import nao permitido: ${m[1]}`);
    }
    assert.match(src, /from\s+['"]\.\.\/templates\/common\.js['"]/, 'usa h() de ../templates/common.js');
  });
}
