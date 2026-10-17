// GERADO por tools/gen.mjs a partir de specs/cards.json. Não editar à mão.
// Cartão mb-01: Do bloqueio mais fraco ao mais forte
import { test, assert, readSource, newContainer } from '../../lib/testkit.js';
import { cardProblems } from '../../lib/security.js';

const SPEC = {"id":"mb-01","category":"mobile","template":"order","answer":["b","d","c","a"],"wrong":[["a","b","c","d"],["a","c","d","b"],["d","b","c","a"]],"depends":[]};

let card = null;
let loadError = null;
try {
  card = (await import('./card.js')).default ?? null;
} catch (e) {
  loadError = e;
}

test('mb-01: card.js existe e carrega', () => {
  assert.ok(card, 'cards/mb-01/card.js não existe, não tem export default ou tem um erro: ' + (loadError?.message ?? ''));
});

if (card) {
  test('mb-01: cumpre o contrato', () => {
    assert.equal(card.id, SPEC.id, 'id errado');
    assert.equal(card.category, SPEC.category, 'category errada');
    assert.equal(card.template, SPEC.template, 'tem de usar o modelo ' + SPEC.template);
    assert.ok([1, 2, 3].includes(card.difficulty), 'difficulty tem de ser 1, 2 ou 3');
    assert.ok(typeof card.title === 'string' && card.title.length > 3, 'falta title');
    assert.ok(typeof card.explanation === 'string' && card.explanation.length > 10, 'falta explanation');
    assert.equal(typeof card.render, 'function');
    assert.equal(typeof card.validate, 'function');
  });

  test('mb-01: aceita a resposta certa', () => {
    assert.equal(card.validate(SPEC.answer), true, 'validate devia aceitar ' + JSON.stringify(SPEC.answer));
  });

  test('mb-01: rejeita as respostas erradas', () => {
    for (const w of SPEC.wrong) assert.equal(card.validate(w), false, 'validate não devia aceitar ' + JSON.stringify(w));
  });

  test('mb-01: desenha o desafio e devolve a resposta', () => {
    const c = newContainer();
    let received;
    card.render(c, { submit: (r) => { received = r; return { correct: card.validate(r) }; } });
    assert.ok(c.textContent.includes(card.title), 'o render tem de mostrar o title');
    for (let p = 0; p < SPEC.answer.length; p++) {
      for (let guard = 0; guard < 50; guard++) {
        const current = Array.from(c.querySelectorAll('[data-item]'), (n) => n.getAttribute('data-item'));
        if (current.indexOf(SPEC.answer[p]) <= p) break;
        c.querySelector('[data-item="' + SPEC.answer[p] + '"]').querySelector('[data-move="up"]').click();
      }
    }
    c.querySelector('.button-primary').click();
    assert.deepEqual(received, SPEC.answer, 'a interação devia devolver a resposta certa');
  });

  test('mb-01: fonte segura', async () => {
    const src = await readSource('./card.js', import.meta.url);
    assert.deepEqual(cardProblems(src), []);
    if (SPEC.depends.includes('lib-hash')) assert.match(src, /from\s+['"]\.\.\/\.\.\/lib\/hash\.js['"]/, 'este cartão tem de usar ../../lib/hash.js');
  });
}
