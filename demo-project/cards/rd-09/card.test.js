// GERADO por tools/gen.mjs a partir de specs/cards.json. Não editar à mão.
// Cartão rd-09: O router mal configurado
// Cartão partido de propósito: a spec.md não decide a resposta, e este teste só guarda um hash curto dela.
import { test, assert, readSource, newContainer } from '../../lib/testkit.js';
import { cardProblems } from '../../lib/security.js';

const SPEC = {"id":"rd-09","category":"networks","template":"spot-the-flaw","depends":[]};
const GAP = {"right":["3503d5eb"],"wrong":[],"head":"o cartão marca os índices %s como inseguros, mas não é essa a resposta que o teste espera.","none":"o cartão não aceita nenhuma resposta.","tail":" A spec cards/rd-09/spec.md não diz que linhas contam como inseguras: decide-o a partir do enunciado e do conceito, escreve-o na spec (Campo `answer` (índices inseguros): […]) e corre /demo-swarm --retry rd-09 (os agentes não mudam specs)."};
const hash = (v) => {
  const s = SPEC.id + ':' + v;
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
  return h.toString(16).padStart(8, '0');
};

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

  async function accepted() {
    const c = newContainer();
    card.render(c, { submit: () => ({ correct: false }) });
    const n = Math.min(c.querySelectorAll('[data-index]').length, 12);
    const found = [];
    for (let mask = 1; mask < 2 ** n; mask++) {
      const v = [];
      for (let i = 0; i < n; i++) if (mask & (2 ** i)) v.push(i);
      if (card.validate(v)) found.push({ value: v, key: JSON.stringify(v), label: '[' + v.join(', ') + ']' });
    }
    return found;
  }

  test('rd-09: aceita a resposta certa', async () => {
    const found = await accepted();
    const keys = found.map((a) => hash(a.key));
    const message = (found.length ? GAP.head.replace('%s', () => found.slice(0, 6).map((a) => a.label).join(', ')) : GAP.none) + GAP.tail;
    assert.ok(found.length === 1 && keys[0] === GAP.right[0], message);
  });

  test('rd-09: rejeita as respostas erradas', () => {
    for (const w of [[]]) assert.equal(card.validate(w), false, 'validate não devia aceitar ' + JSON.stringify(w));
  });

  test('rd-09: desenha o desafio e devolve a resposta', async () => {
    const answer = (await accepted())[0]?.value;
    const c = newContainer();
    let received;
    card.render(c, { submit: (r) => { received = r; return { correct: card.validate(r) }; } });
    assert.ok(c.textContent.includes(card.title), 'o render tem de mostrar o title');
    if (answer === undefined) return;
    for (const i of answer) c.querySelector('[data-index="' + i + '"]').click();
    c.querySelector('.button-primary').click();
    assert.deepEqual(received, answer, 'a interação devia devolver a resposta certa');
  });

  test('rd-09: fonte segura', async () => {
    const src = await readSource('./card.js', import.meta.url);
    assert.deepEqual(cardProblems(src), []);
    if (SPEC.depends.includes('lib-hash')) assert.match(src, /from\s+['"]\.\.\/\.\.\/lib\/hash\.js['"]/, 'este cartão tem de usar ../../lib/hash.js');
  });
}
