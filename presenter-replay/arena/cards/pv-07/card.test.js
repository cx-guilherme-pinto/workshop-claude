// GERADO por tools/gen.mjs a partir de specs/cards.json. Não editar à mão.
// Cartão pv-07: Sem cookies e ainda te reconhecem
// Cartão partido de propósito: a spec.md não decide a resposta, e este teste só guarda um hash curto dela.
import { test, assert, readSource, newContainer } from '../../lib/testkit.js';
import { cardProblems } from '../../lib/security.js';

const SPEC = {"id":"pv-07","category":"privacy","template":"choice","depends":[]};
const GAP = {"right":["d456f48b"],"wrong":[],"head":"o cartão escolhe a opção %s, mas não é essa a resposta que o teste espera.","none":"o cartão não aceita nenhuma resposta.","tail":" A spec cards/pv-07/spec.md não diz qual é a opção certa: decide-o a partir do enunciado e do conceito, escreve-o na spec (Campo `answer`: \"…\") e corre /demo-swarm --retry pv-07 (os agentes não mudam specs)."};
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

  async function accepted() {
    const c = newContainer();
    card.render(c, { submit: () => ({ correct: false }) });
    return Array.from(c.querySelectorAll('[data-option]'))
      .map((n) => ({ value: n.getAttribute('data-option'), text: (n.querySelector('.option-text') ?? n).textContent }))
      .filter((o) => card.validate(o.value))
      .map((o) => ({ value: o.value, key: o.value, label: o.value + ' (' + JSON.stringify(o.text.length > 70 ? o.text.slice(0, 69) + '…' : o.text) + ')' }));
  }

  test('pv-07: aceita a resposta certa', async () => {
    const found = await accepted();
    const keys = found.map((a) => hash(a.key));
    const message = (found.length ? GAP.head.replace('%s', () => found.slice(0, 6).map((a) => a.label).join(', ')) : GAP.none) + GAP.tail;
    assert.ok(found.length === 1 && keys[0] === GAP.right[0], message);
  });

  test('pv-07: rejeita as respostas erradas', () => {
    for (const w of ["","zz"]) assert.equal(card.validate(w), false, 'validate não devia aceitar ' + JSON.stringify(w));
  });

  test('pv-07: desenha o desafio e devolve a resposta', async () => {
    const answer = (await accepted())[0]?.value;
    const c = newContainer();
    let received;
    card.render(c, { submit: (r) => { received = r; return { correct: card.validate(r) }; } });
    assert.ok(c.textContent.includes(card.title), 'o render tem de mostrar o title');
    if (answer === undefined) return;
    c.querySelector('[data-option="' + answer + '"]').click();
    c.querySelector('.button-primary').click();
    assert.equal(received, answer, 'a interação devia devolver a resposta certa');
  });

  test('pv-07: fonte segura', async () => {
    const src = await readSource('./card.js', import.meta.url);
    assert.deepEqual(cardProblems(src), []);
    if (SPEC.depends.includes('lib-hash')) assert.match(src, /from\s+['"]\.\.\/\.\.\/lib\/hash\.js['"]/, 'este cartão tem de usar ../../lib/hash.js');
  });
}
