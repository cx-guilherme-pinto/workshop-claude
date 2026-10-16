// GERADO por tools/gen.mjs a partir de specs/cards.json. Nao editar a mao.
// Cartao rd-02: Por onde passa o teu tráfego
import { test, assert, readSource, novoContentor } from '../../lib/testkit.js';
import { problemasNoCartao } from '../../lib/seguranca.js';

const SPEC = {"id":"rd-02","categoria":"redes","modelo":"ordenar","certa":["d","a","b","c"],"erradas":[["a","b","c","d"],["c","b","a","d"],["a","d","b","c"]],"depende":[]};

let cartao = null;
let erro = null;
try {
  cartao = (await import('./card.js')).default ?? null;
} catch (e) {
  erro = e;
}

test('rd-02: card.js existe e carrega', () => {
  assert.ok(cartao, 'cards/rd-02/card.js nao existe, nao tem export default ou tem um erro: ' + (erro?.message ?? ''));
});

if (cartao) {
  test('rd-02: cumpre o contrato', () => {
    assert.equal(cartao.id, SPEC.id, 'id errado');
    assert.equal(cartao.category, SPEC.categoria, 'category errada');
    assert.equal(cartao.template, SPEC.modelo, 'tem de usar o modelo ' + SPEC.modelo);
    assert.ok([1, 2, 3].includes(cartao.difficulty), 'difficulty tem de ser 1, 2 ou 3');
    assert.ok(typeof cartao.title === 'string' && cartao.title.length > 3, 'falta title');
    assert.ok(typeof cartao.explanation === 'string' && cartao.explanation.length > 10, 'falta explanation');
    assert.equal(typeof cartao.render, 'function');
    assert.equal(typeof cartao.validate, 'function');
  });

  test('rd-02: aceita a resposta certa', () => {
    assert.equal(cartao.validate(SPEC.certa), true, 'validate devia aceitar ' + JSON.stringify(SPEC.certa));
  });

  test('rd-02: rejeita as respostas erradas', () => {
    for (const e of SPEC.erradas) assert.equal(cartao.validate(e), false, 'validate nao devia aceitar ' + JSON.stringify(e));
  });

  test('rd-02: desenha o desafio e devolve a resposta', () => {
    const c = novoContentor();
    let recebida;
    cartao.render(c, { responder: (r) => { recebida = r; return { certo: cartao.validate(r) }; } });
    assert.ok(c.textContent.includes(cartao.title), 'o render tem de mostrar o title');
    for (let p = 0; p < SPEC.certa.length; p++) {
      for (let guarda = 0; guarda < 50; guarda++) {
        const ordem = Array.from(c.querySelectorAll('[data-item]'), (n) => n.getAttribute('data-item'));
        if (ordem.indexOf(SPEC.certa[p]) <= p) break;
        c.querySelector('[data-item="' + SPEC.certa[p] + '"]').querySelector('[data-mover="cima"]').click();
      }
    }
    c.querySelector('.botao-principal').click();
    assert.deepEqual(recebida, SPEC.certa, 'a interacao devia devolver a resposta certa');
  });

  test('rd-02: fonte segura', async () => {
    const src = await readSource('./card.js', import.meta.url);
    assert.deepEqual(problemasNoCartao(src), []);
    if (SPEC.depende.includes('lib-hash')) assert.match(src, /from\s+['"]\.\.\/\.\.\/lib\/hash\.js['"]/, 'este cartao tem de usar ../../lib/hash.js');
  });
}
