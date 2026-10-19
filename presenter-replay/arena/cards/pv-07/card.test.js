// GERADO por tools/gen.mjs a partir de specs/cards.json. Não editar à mão.
// Cartão pv-07: Sem cookies e ainda te reconhecem
import { test, assert, readSource, newContainer, environment } from '../../lib/testkit.js';
import { cardProblems } from '../../lib/security.js';

const SPEC = {"id":"pv-07","category":"privacy","template":"choice","answer":"a","wrong":["b","c","d"],"depends":[]};

const GAPS = [{"field":"answer","value":"\"a\"","message":"falta em cards/pv-07/spec.md um detalhe que o teste verifica: a resposta certa. Uma pessoa acrescenta à spec esta linha: Campo `answer`: `\"a\"` — e depois corre /demo-swarm --retry pv-07 (os agentes não mudam specs)."}];
const flat = (s) => String(s).replace(/[\s`]/g, '').replace(/'/g, '"').toLowerCase();

if (environment === 'node') {
  test('pv-07: a spec.md tem todos os detalhes que o teste verifica', async () => {
    const lines = (await readSource('./spec.md', import.meta.url)).split('\n').map(flat);
    for (const g of GAPS) assert.ok(lines.some((l) => l.includes(g.field) && l.includes(flat(g.value))), g.message);
  });
}

let card = null;
let loadError = null;
try {
  card = (await import('./card.js')).default ?? null;
} catch (e) {
  loadError = e;
}

test('pv-07: card.js existe e carrega', () => {
  assert.ok(card, 'cards/pv-07/card.js não existe, não tem export default ou tem um erro: ' + (loadError?.message ?? ''));
});

if (card) {
  test('pv-07: cumpre o contrato', () => {
    assert.equal(card.id, SPEC.id, 'id errado');
    assert.equal(card.category, SPEC.category, 'category errada');
    assert.equal(card.template, SPEC.template, 'tem de usar o modelo ' + SPEC.template);
    assert.ok([1, 2, 3].includes(card.difficulty), 'difficulty tem de ser 1, 2 ou 3');
    assert.ok(typeof card.title === 'string' && card.title.length > 3, 'falta title');
    assert.ok(typeof card.explanation === 'string' && card.explanation.length > 10, 'falta explanation');
    assert.equal(typeof card.render, 'function');
    assert.equal(typeof card.validate, 'function');
  });

  test('pv-07: aceita a resposta certa', () => {
    assert.equal(card.validate(SPEC.answer), true, 'validate devia aceitar ' + JSON.stringify(SPEC.answer));
  });

  test('pv-07: rejeita as respostas erradas', () => {
    for (const w of SPEC.wrong) assert.equal(card.validate(w), false, 'validate não devia aceitar ' + JSON.stringify(w));
  });

  test('pv-07: desenha o desafio e devolve a resposta', () => {
    const c = newContainer();
    let received;
    card.render(c, { submit: (r) => { received = r; return { correct: card.validate(r) }; } });
    assert.ok(c.textContent.includes(card.title), 'o render tem de mostrar o title');
    c.querySelector('[data-option="' + SPEC.answer + '"]').click();
    c.querySelector('.button-primary').click();
    assert.equal(received, SPEC.answer, 'a interação devia devolver a resposta certa');
  });

  test('pv-07: fonte segura', async () => {
    const src = await readSource('./card.js', import.meta.url);
    assert.deepEqual(cardProblems(src), []);
    if (SPEC.depends.includes('lib-hash')) assert.match(src, /from\s+['"]\.\.\/\.\.\/lib\/hash\.js['"]/, 'este cartão tem de usar ../../lib/hash.js');
  });
}
