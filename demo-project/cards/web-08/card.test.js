// GERADO por tools/gen.mjs a partir de specs/cards.json. Não editar à mão.
// Cartão web-08: A sessão do princípio ao fim
import { test, assert, readSource, newContainer } from '../../lib/testkit.js';
import { cardProblems } from '../../lib/security.js';

const SPEC = {"id":"web-08","category":"web","template":"order","answer":["b","c","a","d"],"wrong":[["a","b","c","d"],["d","a","c","b"],["c","b","a","d"]],"depends":[]};

let card = null;
let loadError = null;
try {
  card = (await import('./card.js')).default ?? null;
} catch (e) {
  loadError = e;
}

test('web-08: card.js existe e carrega', () => {
  assert.ok(card, 'cards/web-08/card.js não existe, não tem export default ou tem um erro: ' + (loadError?.message ?? ''));
});

if (card) {
  test('web-08: cumpre o contrato', () => {
    assert.equal(card.id, SPEC.id, 'id errado');
    assert.equal(card.category, SPEC.category, 'category errada');
    assert.equal(card.template, SPEC.template, 'tem de usar o modelo ' + SPEC.template);
    assert.ok([1, 2, 3].includes(card.difficulty), 'difficulty tem de ser 1, 2 ou 3');
    assert.ok(typeof card.title === 'string' && card.title.length > 3, 'falta title');
    assert.ok(typeof card.explanation === 'string' && card.explanation.length > 10, 'falta explanation');
    assert.equal(typeof card.render, 'function');
    assert.equal(typeof card.validate, 'function');
  });

  test('web-08: aceita a resposta certa', () => {
    assert.equal(card.validate(SPEC.answer), true, 'validate devia aceitar ' + JSON.stringify(SPEC.answer));
  });

  test('web-08: rejeita as respostas erradas', () => {
    for (const w of SPEC.wrong) assert.equal(card.validate(w), false, 'validate não devia aceitar ' + JSON.stringify(w));
  });

  test('web-08: desenha o desafio e devolve a resposta', () => {
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

  test('web-08: fonte segura', async () => {
    const src = await readSource('./card.js', import.meta.url);
    assert.deepEqual(cardProblems(src), []);
    if (SPEC.depends.includes('lib-hash')) assert.match(src, /from\s+['"]\.\.\/\.\.\/lib\/hash\.js['"]/, 'este cartão tem de usar ../../lib/hash.js');
  });
}
