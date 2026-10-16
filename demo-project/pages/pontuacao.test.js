// Teste pre-escrito para a tarefa tabela-pontuacao (ver specs/tabela-pontuacao.md).
// Corre em Node com o DOM falso de lib/fakedom.js: node --test pages/pontuacao.test.js
import { test, assert, readSource, novoContentor } from '../lib/testkit.js';
import { problemasDeSeguranca, semStringsNemComentarios } from '../lib/seguranca.js';

let mod = null;
let erroImport = null;
try {
  mod = await import('./pontuacao.js');
} catch (e) {
  erroImport = e;
}

test('pages/pontuacao.js existe e exporta renderPontuacao', () => {
  assert.ok(mod, `pages/pontuacao.js nao existe ou tem um erro: ${erroImport?.message ?? ''}`);
  assert.equal(typeof mod.renderPontuacao, 'function', 'falta export function renderPontuacao(container, dados)');
});

function dados(extra = {}) {
  return {
    categorias: [
      { id: 'web', nome: 'Web (XSS, SQLi, CSRF)' },
      { id: 'passwords', nome: 'Passwords' },
      { id: 'redes', nome: 'Redes' },
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
  test('desenha uma tabela com um h1', () => {
    const c = desenhar();
    assert.ok(c.querySelector('table'), 'falta a <table>');
    assert.ok(c.querySelector('h1'), 'falta o <h1> "Pontuação"');
    assert.equal(texto(c.querySelector('h1')), 'Pontuação');
  });

  test('uma linha por categoria, pela ordem recebida', () => {
    const c = desenhar();
    const ids = Array.from(c.querySelectorAll('tr')).map((tr) => tr.getAttribute('data-categoria')).filter(Boolean);
    assert.deepEqual(ids, ['web', 'passwords', 'redes']);
    assert.ok(texto(linha(c, 'passwords')).includes('Passwords'), 'cada linha mostra o nome da categoria');
  });

  test('pontos = dificuldade x 10 por cartao resolvido', () => {
    const c = desenhar();
    assert.equal(texto(celula(linha(c, 'web'), 'data-pontos')), '20');
    assert.equal(texto(celula(linha(c, 'passwords'), 'data-pontos')), '30');
    assert.equal(texto(celula(linha(c, 'redes'), 'data-pontos')), '0');
  });

  test('resolvidos: "X de Y" por categoria', () => {
    const c = desenhar();
    assert.equal(texto(celula(linha(c, 'web'), 'data-resolvidos')), '1 de 3');
    assert.equal(texto(celula(linha(c, 'passwords'), 'data-resolvidos')), '2 de 2');
    assert.equal(texto(celula(linha(c, 'redes'), 'data-resolvidos')), '0 de 0');
  });

  test('linha do total', () => {
    const c = desenhar();
    const t = total(c);
    assert.ok(t, 'falta a linha <tr data-total>');
    assert.equal(texto(celula(t, 'data-pontos')), '50');
    assert.equal(texto(celula(t, 'data-resolvidos')), '3 de 5');
    assert.ok(texto(t).includes('Total'));
  });

  test('os numeros usam a classe "numero" (tabular-nums no CSS)', () => {
    const c = desenhar();
    for (const n of [celula(linha(c, 'web'), 'data-pontos'), celula(linha(c, 'web'), 'data-resolvidos'), celula(total(c), 'data-pontos')]) {
      assert.ok(n.classList.contains('numero'), 'cada celula numerica tem class="numero"');
    }
  });

  test('so certo === true conta; progresso de cartoes desconhecidos e ignorado', () => {
    const c = desenhar({ progresso: { 'web-01': { certo: 'sim' }, 'web-03': { certo: true }, 'x-01': { certo: true } } });
    assert.equal(texto(celula(linha(c, 'web'), 'data-pontos')), '10');
    assert.equal(texto(celula(total(c), 'data-pontos')), '10');
    assert.equal(texto(celula(total(c), 'data-resolvidos')), '1 de 5');
  });

  test('sem progresso: tudo a zero', () => {
    const c = desenhar({ progresso: {} });
    assert.equal(texto(celula(total(c), 'data-pontos')), '0');
    assert.equal(texto(celula(total(c), 'data-resolvidos')), '0 de 5');
  });

  test('resumo com o total de pontos e o maximo possivel', () => {
    const c = desenhar();
    const r = c.querySelector('[data-resumo]');
    assert.ok(r, 'falta o elemento com data-resumo');
    assert.ok(texto(r).includes('50 pontos'), `esperava "50 pontos" em ${JSON.stringify(texto(r))}`);
    assert.ok(texto(r).includes('90'), `o maximo possivel (90) tem de aparecer em ${JSON.stringify(texto(r))}`);
  });

  test('o texto dos dados nunca vira HTML', () => {
    const mau = '<img src=x onerror=alert(1)>';
    const c = desenhar({ categorias: [{ id: 'web', nome: mau }] });
    assert.equal(c.querySelector('img'), null, 'criou um <img> a partir do texto');
    assert.ok(texto(linha(c, 'web')).includes(mau));
  });

  test('desenhar outra vez substitui o conteudo anterior', () => {
    const c = novoContentor();
    mod.renderPontuacao(c, dados());
    mod.renderPontuacao(c, dados());
    assert.equal(c.querySelectorAll('table').length, 1, 'ficaram duas tabelas');
  });

  test('fonte segura', async () => {
    const src = await readSource('./pontuacao.js', import.meta.url);
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
