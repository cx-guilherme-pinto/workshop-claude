// GERADO por tools/gen.mjs a partir de specs/cards.json. Não editar à mão.
// Cartão cr-07: Que password gerada aguenta mais?
// Cartão partido de propósito: a spec.md não decide a resposta, e este teste só guarda um hash curto dela.
import { test, assert, readSource, newContainer } from '../../lib/testkit.js';
import { cardProblems } from '../../lib/security.js';

const SPEC = {"id":"cr-07","category":"cryptography","template":"order","depends":[]};
const GAP = {"right":["498b063e"],"wrong":[],"head":"o cartão põe os itens pela ordem %s, mas não é essa a resposta que o teste espera.","none":"o cartão não aceita nenhuma resposta.","tail":" A spec cards/cr-07/spec.md não diz qual é a ordem certa: decide-o a partir do enunciado e do conceito, escreve-o na spec (Campo `answer` (ordem certa): […]) e corre /demo-swarm --retry cr-07 (os agentes não mudam specs)."};
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

test('cr-07: card.js existe e carrega', () => {
  assert.ok(card, 'cards/cr-07/card.js não existe, não tem export default ou tem um erro: ' + (loadError?.message ?? ''));
});

if (card) {
  test('cr-07: cumpre o contrato', () => {
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
    const ids = Array.from(c.querySelectorAll('[data-item]'), (n) => n.getAttribute('data-item')).slice(0, 8);
    const found = [];
    const walk = (done, rest) => {
      if (!rest.length) {
        if (card.validate(done)) found.push({ value: done, key: JSON.stringify(done), label: '[' + done.map((x) => JSON.stringify(x)).join(', ') + ']' });
        return;
      }
      for (const x of rest) walk([...done, x], rest.filter((y) => y !== x));
    };
    walk([], ids);
    return found;
  }

  test('cr-07: aceita a resposta certa', async () => {
    const found = await accepted();
    const keys = found.map((a) => hash(a.key));
    const message = (found.length ? GAP.head.replace('%s', () => found.slice(0, 6).map((a) => a.label).join(', ')) : GAP.none) + GAP.tail;
    assert.ok(found.length === 1 && keys[0] === GAP.right[0], message);
  });

  test('cr-07: rejeita as respostas erradas', () => {
    for (const w of [[]]) assert.equal(card.validate(w), false, 'validate não devia aceitar ' + JSON.stringify(w));
  });

  test('cr-07: desenha o desafio e devolve a resposta', async () => {
    const answer = (await accepted())[0]?.value;
    const c = newContainer();
    let received;
    card.render(c, { submit: (r) => { received = r; return { correct: card.validate(r) }; } });
    assert.ok(c.textContent.includes(card.title), 'o render tem de mostrar o title');
    if (answer === undefined) return;
    for (let p = 0; p < answer.length; p++) {
      for (let guard = 0; guard < 50; guard++) {
        const current = Array.from(c.querySelectorAll('[data-item]'), (n) => n.getAttribute('data-item'));
        if (current.indexOf(answer[p]) <= p) break;
        c.querySelector('[data-item="' + answer[p] + '"]').querySelector('[data-move="up"]').click();
      }
    }
    c.querySelector('.button-primary').click();
    assert.deepEqual(received, answer, 'a interação devia devolver a resposta certa');
  });

  test('cr-07: fonte segura', async () => {
    const src = await readSource('./card.js', import.meta.url);
    assert.deepEqual(cardProblems(src), []);
    if (SPEC.depends.includes('lib-hash')) assert.match(src, /from\s+['"]\.\.\/\.\.\/lib\/hash\.js['"]/, 'este cartão tem de usar ../../lib/hash.js');
  });
}
