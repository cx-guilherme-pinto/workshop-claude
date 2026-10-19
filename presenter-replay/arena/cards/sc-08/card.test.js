// GERADO por tools/gen.mjs a partir de specs/cards.json. Não editar à mão.
// Cartão sc-08: O segredo de produção
// Cartão partido de propósito: a spec.md não decide a resposta, e este teste só guarda um hash curto dela.
import { test, assert, readSource, newContainer } from '../../lib/testkit.js';
import { cardProblems } from '../../lib/security.js';
import { normalize } from '../../templates/answer.js';

const SPEC = {"id":"sc-08","category":"cloud-secrets","template":"answer","depends":[]};
const GAP = {"right":["5c485eb8"],"wrong":["634869bd","61486697","8e46ceac","6dee1ad1"],"head":"o cartão aceita [%s], mas não é essa a resposta que o teste espera.","none":"o cartão não aceita nenhuma resposta.","tail":" A spec cards/sc-08/spec.md não diz que respostas são aceites: decide-o a partir do enunciado e do conceito, escreve-o na spec (Campo `accept`: […]) e corre /demo-swarm --retry sc-08 (os agentes não mudam specs)."};
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

test('sc-08: card.js existe e carrega', () => {
  assert.ok(card, 'cards/sc-08/card.js não existe, não tem export default ou tem um erro: ' + (loadError?.message ?? ''));
});

if (card) {
  test('sc-08: cumpre o contrato', () => {
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
    const src = await readSource('./card.js', import.meta.url);
    const seen = new Set();
    const found = [];
    for (const m of src.matchAll(/'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\$]|\\.)*)`/g)) {
      const v = unquote(m[1] ?? m[2] ?? m[3]);
      const key = normalize(v);
      if (v.length > 200 || key === '' || seen.has(key) || !card.validate(v)) continue;
      seen.add(key);
      found.push({ value: v, key, label: JSON.stringify(v) });
    }
    return found;
  }

  function unquote(s) {
    return s.replace(/\\(u[0-9a-fA-F]{4}|.)/g, (all, e) => (e.length === 5 ? String.fromCharCode(parseInt(e.slice(1), 16)) : { n: '\n', t: '\t' }[e] ?? e));
  }

  test('sc-08: aceita a resposta certa', async () => {
    const found = await accepted();
    const keys = found.map((a) => hash(a.key));
    const message = (found.length ? GAP.head.replace('%s', () => found.slice(0, 6).map((a) => a.label).join(', ')) : GAP.none) + GAP.tail;
    assert.ok(GAP.right.every((h) => keys.includes(h)) && !keys.some((h) => GAP.wrong.includes(h)), message);
  });

  test('sc-08: rejeita as respostas erradas', () => {
    for (const w of [""," "]) assert.equal(card.validate(w), false, 'validate não devia aceitar ' + JSON.stringify(w));
  });

  test('sc-08: desenha o desafio e devolve a resposta', async () => {
    const answer = (await accepted())[0]?.value;
    const c = newContainer();
    let received;
    card.render(c, { submit: (r) => { received = r; return { correct: card.validate(r) }; } });
    assert.ok(c.textContent.includes(card.title), 'o render tem de mostrar o title');
    if (answer === undefined) return;
    c.querySelector('input').value = answer;
    c.querySelector('.button-primary').click();
    assert.equal(received, answer, 'a interação devia devolver a resposta certa');
  });

  test('sc-08: fonte segura', async () => {
    const src = await readSource('./card.js', import.meta.url);
    assert.deepEqual(cardProblems(src), []);
    if (SPEC.depends.includes('lib-hash')) assert.match(src, /from\s+['"]\.\.\/\.\.\/lib\/hash\.js['"]/, 'este cartão tem de usar ../../lib/hash.js');
  });
}
