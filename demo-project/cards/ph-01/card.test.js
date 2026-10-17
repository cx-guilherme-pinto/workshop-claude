// GERADO por tools/gen.mjs a partir de specs/cards.json. Não editar à mão.
// Cartão ph-01: Qual é o site verdadeiro?
import { test, assert, readSource, newContainer } from '../../lib/testkit.js';
import { cardProblems } from '../../lib/security.js';

const SPEC = {"id":"ph-01","category":"phishing","template":"choice","answer":"c","wrong":["a","b","d"],"depends":[]};

let card = null;
let loadError = null;
try {
  card = (await import('./card.js')).default ?? null;
} catch (e) {
  loadError = e;
}

test('ph-01: card.js existe e carrega', () => {
  assert.ok(card, 'cards/ph-01/card.js não existe, não tem export default ou tem um erro: ' + (loadError?.message ?? ''));
});

if (card) {
  test('ph-01: cumpre o contrato', () => {
    assert.equal(card.id, SPEC.id, 'id errado');
    assert.equal(card.category, SPEC.category, 'category errada');
    assert.equal(card.template, SPEC.template, 'tem de usar o modelo ' + SPEC.template);
    assert.ok([1, 2, 3].includes(card.difficulty), 'difficulty tem de ser 1, 2 ou 3');
    assert.ok(typeof card.title === 'string' && card.title.length > 3, 'falta title');
    assert.ok(typeof card.explanation === 'string' && card.explanation.length > 10, 'falta explanation');
    assert.equal(typeof card.render, 'function');
    assert.equal(typeof card.validate, 'function');
  });

  test('ph-01: aceita a resposta certa', () => {
    assert.equal(card.validate(SPEC.answer), true, 'validate devia aceitar ' + JSON.stringify(SPEC.answer));
  });

  test('ph-01: rejeita as respostas erradas', () => {
    for (const w of SPEC.wrong) assert.equal(card.validate(w), false, 'validate não devia aceitar ' + JSON.stringify(w));
  });

  test('ph-01: desenha o desafio e devolve a resposta', () => {
    const c = newContainer();
    let received;
    card.render(c, { submit: (r) => { received = r; return { correct: card.validate(r) }; } });
    assert.ok(c.textContent.includes(card.title), 'o render tem de mostrar o title');
    c.querySelector('[data-option="' + SPEC.answer + '"]').click();
    c.querySelector('.button-primary').click();
    assert.equal(received, SPEC.answer, 'a interação devia devolver a resposta certa');
  });

  test('ph-01: fonte segura', async () => {
    const src = await readSource('./card.js', import.meta.url);
    assert.deepEqual(cardProblems(src), []);
    if (SPEC.depends.includes('lib-hash')) assert.match(src, /from\s+['"]\.\.\/\.\.\/lib\/hash\.js['"]/, 'este cartão tem de usar ../../lib/hash.js');
  });
}
