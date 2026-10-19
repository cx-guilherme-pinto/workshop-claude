// GERADO por tools/gen.mjs a partir de specs/cards.json. Não editar à mão.
// Cartão rd-09: O router mal configurado
import { test, assert, readSource, newContainer, environment } from '../../lib/testkit.js';
import { cardProblems } from '../../lib/security.js';

const SPEC = {"id":"rd-09","category":"networks","template":"spot-the-flaw","answer":[1,3],"wrong":[[1],[3],[0],[2,4]],"depends":[]};

const GAPS = [{"field":"answer","value":"[1,3]","message":"falta em cards/rd-09/spec.md um detalhe que o teste verifica: os bocados inseguros. Uma pessoa acrescenta à spec esta linha: Campo `answer` (índices inseguros): `[1,3]` — e depois corre /demo-swarm --retry rd-09 (os agentes não mudam specs)."}];
const flat = (s) => String(s).replace(/[\s`]/g, '').replace(/'/g, '"').toLowerCase();

if (environment === 'node') {
  test('rd-09: a spec.md tem todos os detalhes que o teste verifica', async () => {
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

test('rd-09: card.js existe e carrega', () => {
  assert.ok(card, 'cards/rd-09/card.js não existe, não tem export default ou tem um erro: ' + (loadError?.message ?? ''));
});

if (card) {
  test('rd-09: cumpre o contrato', () => {
    assert.equal(card.id, SPEC.id, 'id errado');
    assert.equal(card.category, SPEC.category, 'category errada');
    assert.equal(card.template, SPEC.template, 'tem de usar o modelo ' + SPEC.template);
    assert.ok([1, 2, 3].includes(card.difficulty), 'difficulty tem de ser 1, 2 ou 3');
    assert.ok(typeof card.title === 'string' && card.title.length > 3, 'falta title');
    assert.ok(typeof card.explanation === 'string' && card.explanation.length > 10, 'falta explanation');
    assert.equal(typeof card.render, 'function');
    assert.equal(typeof card.validate, 'function');
  });

  test('rd-09: aceita a resposta certa', () => {
    assert.equal(card.validate(SPEC.answer), true, 'validate devia aceitar ' + JSON.stringify(SPEC.answer));
  });

  test('rd-09: rejeita as respostas erradas', () => {
    for (const w of SPEC.wrong) assert.equal(card.validate(w), false, 'validate não devia aceitar ' + JSON.stringify(w));
  });

  test('rd-09: desenha o desafio e devolve a resposta', () => {
    const c = newContainer();
    let received;
    card.render(c, { submit: (r) => { received = r; return { correct: card.validate(r) }; } });
    assert.ok(c.textContent.includes(card.title), 'o render tem de mostrar o title');
    for (const i of SPEC.answer) c.querySelector('[data-index="' + i + '"]').click();
    c.querySelector('.button-primary').click();
    assert.deepEqual(received, SPEC.answer, 'a interação devia devolver a resposta certa');
  });

  test('rd-09: fonte segura', async () => {
    const src = await readSource('./card.js', import.meta.url);
    assert.deepEqual(cardProblems(src), []);
    if (SPEC.depends.includes('lib-hash')) assert.match(src, /from\s+['"]\.\.\/\.\.\/lib\/hash\.js['"]/, 'este cartão tem de usar ../../lib/hash.js');
  });
}
