#!/usr/bin/env node
// Generates, from specs/cards.json, the pre-written files of the project:
//   cards/<id>/spec.md, cards/<id>/card.test.js and TASKS.md.
// Run it when you change specs/cards.json:  node tools/gen.mjs   (--check only checks)
// The language of the generated files comes from specs/cards.json ("lang": "pt" or "en"; no field, pt).
//
// "Your card": with specs/my-card.json (a copy of specs/my-card.example.json) it also validates that file and
// generates the card my-01 (tools/my-card.mjs). Without that file nothing changes.
//
// Cards broken on purpose: a card with "spec_gaps": ["answer"] (or ["accept"]) in specs/cards.json gets a spec.md
// WITHOUT the line that decides its answer, so the agent has to guess. Its card.test.js keeps only a short hash
// (FNV-1a, 32 bits) of the right answer, never the answer itself: it finds the answer the card accepts, compares
// the hashes and, when they differ, says what the card produced and what the spec does not decide. A person
// decides the answer from the prompt and the concept, writes it in cards/<id>/spec.md and runs the card again
// (/demo-swarm --retry <id>). A spec.md completed that way (every generated line still there, in order) is kept,
// also by --check. --no-gaps writes the complete specs (the reference solutions use it: tools/dev/check-solutions.mjs).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readMyCard, myCardReport, MY_CARD_ID } from './my-card.mjs';
import { normalize } from '../templates/common.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHECK = process.argv.includes('--check');
const NO_GAPS = process.argv.includes('--no-gaps');

const specs = JSON.parse(readFileSync(join(ROOT, 'specs/cards.json'), 'utf8'));
const extra = JSON.parse(readFileSync(join(ROOT, 'specs/tasks.json'), 'utf8'));
const LANG = specs.lang === 'en' ? 'en' : 'pt';

// Texts of the generated files. Field names, ids and commands are not translated.
const TEXTS = {
  pt: {
    card: 'Cartão',
    category: 'Categoria',
    difficulty: 'Dificuldade',
    template: 'Modelo',
    templateFrom: (fn, file) => `\`${fn}\` de \`../../templates/${file}\``,
    dependsOn: 'Depende de',
    concept: 'Conceito',
    prompt: 'Enunciado (campo `prompt`)',
    scenario: 'Cenário (campo `scenario`)',
    content: 'Conteúdo',
    options: 'Campo `options` (mantém os ids):',
    field: (name) => `Campo \`${name}\``,
    segments: 'Campo `segments` (índices a partir de 0):',
    unsafeAnswer: 'Campo `answer` (índices inseguros)',
    items: 'Campo `items` (já baralhados; mantém esta ordem):',
    orderAnswer: 'Campo `answer` (ordem certa)',
    checkLogic: 'Lógica do `check` (em vez de `accept`):',
    example: 'Exemplo de resposta certa',
    explanation: 'Explicação (campo `explanation`)',
    doneWhen: 'Feito quando',
    passes: 'passa sem erros. Regras: `cards/CONTRACT.md`.',
    test: {
      generated: '// GERADO por tools/gen.mjs a partir de specs/cards.json. Não editar à mão.',
      card: 'Cartão',
      loads: 'card.js existe e carrega',
      doesNotLoad: (id) => `cards/${id}/card.js não existe, não tem export default ou tem um erro: `,
      contract: 'cumpre o contrato',
      wrongId: 'id errado',
      wrongCategory: 'category errada',
      usesTemplate: 'tem de usar o modelo ',
      difficulty: 'difficulty tem de ser 1, 2 ou 3',
      noTitle: 'falta title',
      noExplanation: 'falta explanation',
      accepts: 'aceita a resposta certa',
      shouldAccept: 'validate devia aceitar ',
      rejects: 'rejeita as respostas erradas',
      shouldReject: 'validate não devia aceitar ',
      draws: 'desenha o desafio e devolve a resposta',
      showsTitle: 'o render tem de mostrar o title',
      returns: 'a interação devia devolver a resposta certa',
      safeSource: 'fonte segura',
      usesHash: 'este cartão tem de usar ../../lib/hash.js',
    },
    // A broken card's test: what the card produced and what its spec does not decide (never the expected value).
    gap: {
      comment: '// Cartão partido de propósito: a spec.md não decide a resposta, e este teste só guarda um hash curto dela.',
      head: {
        choice: 'o cartão escolhe a opção %s, mas não é essa a resposta que o teste espera.',
        'spot-the-flaw': 'o cartão marca os índices %s como inseguros, mas não é essa a resposta que o teste espera.',
        order: 'o cartão põe os itens pela ordem %s, mas não é essa a resposta que o teste espera.',
        answer: 'o cartão aceita [%s], mas não é essa a resposta que o teste espera.',
      },
      none: 'o cartão não aceita nenhuma resposta.',
      what: { choice: 'qual é a opção certa', 'spot-the-flaw': 'que linhas contam como inseguras', order: 'qual é a ordem certa', answer: 'que respostas são aceites' },
      line: { choice: 'Campo `answer`: "…"', 'spot-the-flaw': 'Campo `answer` (índices inseguros): […]', order: 'Campo `answer` (ordem certa): […]', answer: 'Campo `accept`: […]' },
      tail: (id, what, line) => ` A spec cards/${id}/spec.md não diz ${what}: decide-o a partir do enunciado e do conceito, escreve-o na spec (${line}) e corre /demo-swarm --retry ${id} (os agentes não mudam specs).`,
    },
    tasks: {
      title: '# TASKS — Arena de Segurança',
      intro: 'Cada tarefa é feita por um agente. **Este ficheiro é gerado** por `node tools/gen.mjs` a partir de `specs/cards.json` e `specs/tasks.json`.',
      participant: (n) => `- Modo participante: **${n} cartões** + utilitário + 2 páginas + integração + revisão, com até 8 agentes em paralelo.`,
      presenter: (n) => `- Modo apresentador: as mesmas tarefas, com até 16 agentes em paralelo.`,
      support: '## Tarefas de suporte',
      supportColumns: ['id', 'onda', 'o quê', 'spec', 'depende de'],
      cardColumns: ['id', 'modelo', 'título', 'conceito', 'depende de'],
      allCards: 'todos os cartões',
    },
    msg: {
      repeatedId: (id) => `id repetido: ${id}`,
      category: (id, cat) => `${id}: categoria desconhecida ${cat}`,
      template: (id, m) => `${id}: modelo desconhecido ${m}`,
      mode: (id) => `${id}: modo inválido`,
      wrong: (id) => `${id}: precisa de respostas erradas`,
      dependency: (id, d) => `${id}: dependência desconhecida ${d}`,
      gap: (id, g, t) => `${id}: spec_gaps "${g}" não serve para o modelo ${t} (usa "answer" em choice, spot-the-flaw e order, e "accept" em answer com accept)`,
      reserved: (id) => `${id}: este id está reservado para o cartão do participante (specs/my-card.json)`,
      problems: 'specs/cards.json tem problemas:',
      outOfDate: (rel) => `desatualizado: ${rel}`,
      outOfDateN: (n) => `${n} ficheiro(s) desatualizados. Corre: node tools/gen.mjs`,
      upToDate: 'gen: tudo atualizado',
      written: (n, m) => `gen: ${n} cartões, ${m} ficheiro(s) escritos`,
    },
  },
  en: {
    card: 'Card',
    category: 'Category',
    difficulty: 'Difficulty',
    template: 'Template',
    templateFrom: (fn, file) => `\`${fn}\` from \`../../templates/${file}\``,
    dependsOn: 'Depends on',
    concept: 'Concept',
    prompt: 'Prompt (field `prompt`)',
    scenario: 'Scenario (field `scenario`)',
    content: 'Content',
    options: 'Field `options` (keep the ids):',
    field: (name) => `Field \`${name}\``,
    segments: 'Field `segments` (indexes start at 0):',
    unsafeAnswer: 'Field `answer` (unsafe indexes)',
    items: 'Field `items` (already shuffled; keep this order):',
    orderAnswer: 'Field `answer` (right order)',
    checkLogic: 'Logic of `check` (instead of `accept`):',
    example: 'Example of a right answer',
    explanation: 'Explanation (field `explanation`)',
    doneWhen: 'Done when',
    passes: 'passes with no errors. Rules: `cards/CONTRACT.md`.',
    test: {
      generated: '// GENERATED by tools/gen.mjs from specs/cards.json. Do not edit by hand.',
      card: 'Card',
      loads: 'card.js exists and loads',
      doesNotLoad: (id) => `cards/${id}/card.js does not exist, has no default export or has an error: `,
      contract: 'follows the contract',
      wrongId: 'wrong id',
      wrongCategory: 'wrong category',
      usesTemplate: 'must use the template ',
      difficulty: 'difficulty must be 1, 2 or 3',
      noTitle: 'missing title',
      noExplanation: 'missing explanation',
      accepts: 'accepts the right answer',
      shouldAccept: 'validate should accept ',
      rejects: 'rejects the wrong answers',
      shouldReject: 'validate should not accept ',
      draws: 'draws the challenge and returns the answer',
      showsTitle: 'render must show the title',
      returns: 'the interaction should return the right answer',
      safeSource: 'safe source',
      usesHash: 'this card must use ../../lib/hash.js',
    },
    // A broken card's test: what the card produced and what its spec does not decide (never the expected value).
    gap: {
      comment: '// Card broken on purpose: its spec.md does not decide the answer, and this test keeps only a short hash of it.',
      head: {
        choice: 'the card picks option %s, but that is not the answer the test expects.',
        'spot-the-flaw': 'the card marks the indexes %s as unsafe, but that is not the answer the test expects.',
        order: 'the card puts the items in the order %s, but that is not the answer the test expects.',
        answer: 'the card accepts [%s], but that is not the answer the test expects.',
      },
      none: 'the card does not accept any answer.',
      what: { choice: 'which option is right', 'spot-the-flaw': 'which lines count as unsafe', order: 'which order is right', answer: 'which answers are accepted' },
      line: { choice: 'Field `answer`: "…"', 'spot-the-flaw': 'Field `answer` (unsafe indexes): […]', order: 'Field `answer` (right order): […]', answer: 'Field `accept`: […]' },
      tail: (id, what, line) => ` cards/${id}/spec.md does not say ${what}: decide it from the prompt and the concept, write it in the spec (${line}) and run /demo-swarm --retry ${id} (agents do not change specs).`,
    },
    tasks: {
      title: '# TASKS — Security Arena',
      intro: 'Each task is done by one agent. **This file is generated** by `node tools/gen.mjs` from `specs/cards.json` and `specs/tasks.json`.',
      participant: (n) => `- Participant mode: **${n} cards** + utility + 2 pages + integration + review, with up to 8 agents in parallel.`,
      presenter: (n) => `- Presenter mode: the same tasks, with up to 16 agents in parallel.`,
      support: '## Support tasks',
      supportColumns: ['id', 'wave', 'what', 'spec', 'depends on'],
      cardColumns: ['id', 'template', 'title', 'concept', 'depends on'],
      allCards: 'all the cards',
    },
    msg: {
      repeatedId: (id) => `repeated id: ${id}`,
      category: (id, cat) => `${id}: unknown category ${cat}`,
      template: (id, m) => `${id}: unknown template ${m}`,
      mode: (id) => `${id}: invalid mode`,
      wrong: (id) => `${id}: needs wrong answers`,
      dependency: (id, d) => `${id}: unknown dependency ${d}`,
      gap: (id, g, t) => `${id}: spec_gaps "${g}" does not fit the template ${t} (use "answer" with choice, spot-the-flaw and order, and "accept" with answer and accept)`,
      reserved: (id) => `${id}: this id is reserved for the participant's card (specs/my-card.json)`,
      problems: 'specs/cards.json has problems:',
      outOfDate: (rel) => `out of date: ${rel}`,
      outOfDateN: (n) => `${n} file(s) out of date. Run: node tools/gen.mjs`,
      upToDate: 'gen: everything up to date',
      written: (n, m) => `gen: ${n} cards, ${m} file(s) written`,
    },
  },
}[LANG];
const M = TEXTS.msg;

const TEMPLATES = {
  choice: { fn: 'choice', file: 'choice.js' },
  'spot-the-flaw': { fn: 'spotTheFlaw', file: 'spot-the-flaw.js' },
  order: { fn: 'order', file: 'order.js' },
  answer: { fn: 'answer', file: 'answer.js' },
};

const errors = [];
const ids = new Set();
const cats = new Set(specs.categories.map((c) => c.id));
for (const c of specs.cards) {
  if (ids.has(c.id)) errors.push(M.repeatedId(c.id));
  ids.add(c.id);
  if (!cats.has(c.category)) errors.push(M.category(c.id, c.category));
  if (!TEMPLATES[c.template]) errors.push(M.template(c.id, c.template));
  if (!['participant', 'presenter'].includes(c.mode)) errors.push(M.mode(c.id));
  if (!Array.isArray(c.wrong) || c.wrong.length === 0) errors.push(M.wrong(c.id));
  for (const d of c.depends || []) if (!extra.lib.some((l) => l.id === d) && !specs.cards.some((x) => x.id === d)) errors.push(M.dependency(c.id, d));
  if (c.id === MY_CARD_ID) errors.push(M.reserved(c.id));
  for (const g of c.spec_gaps || []) {
    const fits = g === 'answer' ? ['choice', 'spot-the-flaw', 'order'].includes(c.template) : g === 'accept' && c.template === 'answer' && Array.isArray(c.accept);
    if (!fits) errors.push(M.gap(c.id, g, c.template));
  }
}
if (errors.length) {
  console.error(M.problems + '\n- ' + errors.join('\n- '));
  process.exit(1);
}

// The participant's card (specs/my-card.json), if there is one.
const mine = readMyCard(ROOT, specs);
if (mine.errors.length) {
  console.error(myCardReport(mine.errors, LANG));
  process.exit(1);
}
const cards = mine.card ? [...specs.cards, mine.card] : specs.cards;
// The details left out of a broken card's spec.md (none with --no-gaps).
const gapsOf = (c) => (NO_GAPS ? [] : c.spec_gaps || []);

const j = (v) => JSON.stringify(v);
const code = (s) => '`' + String(s).replace(/`/g, "'") + '`';
const tableRow = (cols) => '| ' + cols.map((x) => String(x).replace(/\|/g, '\\|').replace(/\n/g, ' ')).join(' | ') + ' |';

// The spec.md line of a detail that a broken card can leave out ("answer" or "accept"), as gen writes it.
function detailLine(c, gap) {
  const X = TEXTS;
  if (gap === 'accept') return `${X.field('accept')}: \`${j(c.accept)}\``;
  if (c.template === 'spot-the-flaw') return `${X.unsafeAnswer}: \`${j(c.answer)}\``;
  if (c.template === 'order') return `${X.orderAnswer}: \`${j(c.answer)}\``;
  return `${X.field('answer')}: \`${j(c.answer)}\``;
}
// FNV-1a (32 bits, over UTF-16 code units) of "<id>:<canonical answer>": the same function goes into the test.
// The canonical answer: the option id (choice), the sorted indexes (spot-the-flaw), the ids in order (order) or
// the normalized text (answer).
const HASH_JS = `(v) => {
  const s = SPEC.id + ':' + v;
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
  return h.toString(16).padStart(8, '0');
}`;
function fnv(id, v) {
  const s = id + ':' + v;
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
  return h.toString(16).padStart(8, '0');
}
const canonical = (template, v) =>
  template === 'answer' ? normalize(v) : template === 'choice' ? String(v) : template === 'spot-the-flaw' ? j([...new Set(v)].sort((a, b) => a - b)) : j(v);

function specMd(c) {
  const t = TEMPLATES[c.template];
  const L = [];
  const X = TEXTS;
  const gaps = gapsOf(c);
  L.push(`# ${X.card} ${c.id} — ${c.title}`, '');
  L.push(`- **${X.category}:** ${c.category}`);
  L.push(`- **${X.difficulty}:** ${c.difficulty}`);
  L.push(`- **${X.template}:** ${X.templateFrom(t.fn, t.file)}`);
  if (c.depends?.length) L.push(`- **${X.dependsOn}:** ${c.depends.join(', ')}`);
  L.push('', `## ${X.concept}`, '', c.concept, '', `## ${X.prompt}`, '', c.prompt, '');
  if (c.scenario) {
    L.push(`## ${X.scenario}`, '', '```json', JSON.stringify(c.scenario, null, 2), '```', '');
  }
  L.push(`## ${X.content}`, '');
  if (c.template === 'choice') {
    L.push(X.options, '', tableRow(['id', 'text']), tableRow(['---', '---']));
    for (const o of c.options) L.push(tableRow([o.id, o.text]));
    if (!gaps.includes('answer')) L.push('', detailLine(c, 'answer'));
  } else if (c.template === 'spot-the-flaw') {
    L.push(`${X.field('language')}: \`${j(c.language || 'text')}\``, '', X.segments, '');
    L.push('```json', JSON.stringify(c.segments, null, 2), '```');
    if (!gaps.includes('answer')) L.push('', detailLine(c, 'answer'));
  } else if (c.template === 'order') {
    L.push(X.items, '', tableRow(['id', 'text']), tableRow(['---', '---']));
    for (const o of c.items) L.push(tableRow([o.id, o.text]));
    if (!gaps.includes('answer')) L.push('', detailLine(c, 'answer'));
  } else if (c.template === 'answer') {
    const P = [];
    if (c.placeholder) P.push(`${X.field('placeholder')}: ${code(c.placeholder)}`);
    // Without the accepted answers, the example would give them away: both stay out.
    if (c.accept && !gaps.includes('accept')) P.push(detailLine(c, 'accept'));
    if (c.check) P.push([X.checkLogic, '', c.check].join('\n'));
    if (!gaps.includes('accept')) P.push(`${X.example}: ${code(c.answer)}`);
    L.push(P.join('\n\n'));
  }
  L.push('', `## ${X.explanation}`, '', c.explanation, '');
  L.push(`## ${X.doneWhen}`, '', '```', `node --test cards/${c.id}/card.test.js`, '```', '', X.passes, '');
  return L.join('\n');
}

// The clicks that give the answer `v` (a JS expression) in the rendered card `c`.
function interaction(c, v = 'SPEC.answer') {
  switch (c.template) {
    case 'choice':
      return `c.querySelector('[data-option="' + ${v} + '"]').click();`;
    case 'spot-the-flaw':
      return `for (const i of ${v}) c.querySelector('[data-index="' + i + '"]').click();`;
    case 'order':
      return [
        `for (let p = 0; p < ${v}.length; p++) {`,
        `      for (let guard = 0; guard < 50; guard++) {`,
        `        const current = Array.from(c.querySelectorAll('[data-item]'), (n) => n.getAttribute('data-item'));`,
        `        if (current.indexOf(${v}[p]) <= p) break;`,
        `        c.querySelector('[data-item="' + ${v}[p] + '"]').querySelector('[data-move="up"]').click();`,
        `      }`,
        `    }`,
      ].join('\n');
    case 'answer':
      return `c.querySelector('input').value = ${v};`;
    default:
      return '';
  }
}

const q = (s) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

// The start shared by every card test: card.js loads and follows the contract (the block stays open).
function contractTests(c) {
  const X = TEXTS.test;
  return `let card = null;
let loadError = null;
try {
  card = (await import('./card.js')).default ?? null;
} catch (e) {
  loadError = e;
}

test('${c.id}: ${q(X.loads)}', () => {
  assert.ok(card, '${q(X.doesNotLoad(c.id))}' + (loadError?.message ?? ''));
});

if (card) {
  test('${c.id}: ${q(X.contract)}', () => {
    assert.equal(card.id, SPEC.id, '${q(X.wrongId)}');
    assert.equal(card.category, SPEC.category, '${q(X.wrongCategory)}');
    assert.equal(card.template, SPEC.template, '${q(X.usesTemplate)}' + SPEC.template);
    assert.ok([1, 2, 3].includes(card.difficulty), '${q(X.difficulty)}');
    assert.ok(typeof card.title === 'string' && card.title.length > 3, '${q(X.noTitle)}');
    assert.ok(typeof card.explanation === 'string' && card.explanation.length > 10, '${q(X.noExplanation)}');
    assert.equal(typeof card.render, 'function');
    assert.equal(typeof card.validate, 'function');
  });
`;
}

// The end shared by every card test: the source is safe (and the block closes).
function safeSourceTest(c) {
  const X = TEXTS.test;
  return `  test('${c.id}: ${q(X.safeSource)}', async () => {
    const src = await readSource('./card.js', import.meta.url);
    assert.deepEqual(cardProblems(src), []);
    if (SPEC.depends.includes('lib-hash')) assert.match(src, /from\\s+['"]\\.\\.\\/\\.\\.\\/lib\\/hash\\.js['"]/, '${q(X.usesHash)}');
  });
}
`;
}

function testJs(c) {
  if (c.spec_gaps?.length) return brokenTestJs(c);
  const spec = { id: c.id, category: c.category, template: c.template, answer: c.answer, wrong: c.wrong, depends: c.depends || [] };
  const cmp = c.template === 'choice' || c.template === 'answer' ? 'equal' : 'deepEqual';
  const X = TEXTS.test;
  return `${X.generated}
// ${X.card} ${c.id}: ${c.title}
import { test, assert, readSource, newContainer } from '../../lib/testkit.js';
import { cardProblems } from '../../lib/security.js';

const SPEC = ${JSON.stringify(spec)};

${contractTests(c)}
  test('${c.id}: ${q(X.accepts)}', () => {
    assert.equal(card.validate(SPEC.answer), true, '${q(X.shouldAccept)}' + JSON.stringify(SPEC.answer));
  });

  test('${c.id}: ${q(X.rejects)}', () => {
    for (const w of SPEC.wrong) assert.equal(card.validate(w), false, '${q(X.shouldReject)}' + JSON.stringify(w));
  });

  test('${c.id}: ${q(X.draws)}', () => {
    const c = newContainer();
    let received;
    card.render(c, { submit: (r) => { received = r; return { correct: card.validate(r) }; } });
    assert.ok(c.textContent.includes(card.title), '${q(X.showsTitle)}');
    ${interaction(c)}
    c.querySelector('.button-primary').click();
    assert.${cmp}(received, SPEC.answer, '${q(X.returns)}');
  });

${safeSourceTest(c)}`;
}

// How a broken card's test finds the answers the card accepts, without knowing the right one: it tries every
// option, every set of indexes or every order of the items the card draws (answer: every string in card.js).
// Each answer found is { value, key: the canonical answer that is hashed, label: what the message shows }.
function findAnswers(c) {
  switch (c.template) {
    case 'choice':
      return `async function accepted() {
  const c = newContainer();
  card.render(c, { submit: () => ({ correct: false }) });
  return Array.from(c.querySelectorAll('[data-option]'))
    .map((n) => ({ value: n.getAttribute('data-option'), text: (n.querySelector('.option-text') ?? n).textContent }))
    .filter((o) => card.validate(o.value))
    .map((o) => ({ value: o.value, key: o.value, label: o.value + ' (' + JSON.stringify(o.text.length > 70 ? o.text.slice(0, 69) + '…' : o.text) + ')' }));
}`;
    case 'spot-the-flaw':
      return `async function accepted() {
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
}`;
    case 'order':
      return `async function accepted() {
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
}`;
    case 'answer':
      // Every string literal of card.js that the card accepts (the agent writes them in accept or in check).
      return `async function accepted() {
  const src = await readSource('./card.js', import.meta.url);
  const seen = new Set();
  const found = [];
  for (const m of src.matchAll(/'((?:[^'\\\\\\n]|\\\\.)*)'|"((?:[^"\\\\\\n]|\\\\.)*)"|\`((?:[^\`\\\\$]|\\\\.)*)\`/g)) {
    const v = unquote(m[1] ?? m[2] ?? m[3]);
    const key = normalize(v);
    if (v.length > 200 || key === '' || seen.has(key) || !card.validate(v)) continue;
    seen.add(key);
    found.push({ value: v, key, label: JSON.stringify(v) });
  }
  return found;
}

function unquote(s) {
  return s.replace(/\\\\(u[0-9a-fA-F]{4}|.)/g, (all, e) => (e.length === 5 ? String.fromCharCode(parseInt(e.slice(1), 16)) : { n: '\\n', t: '\\t' }[e] ?? e));
}`;
    default:
      return '';
  }
}

// The test of a card broken on purpose (specs/cards.json "spec_gaps"): it has neither the right answer nor the
// wrong ones (they would give the right one away), only hashes. Its message says what the card produced and what
// the spec does not decide, never the expected value.
function brokenTestJs(c) {
  const X = TEXTS.test;
  const G = TEXTS.gap;
  const t = c.template;
  const spec = { id: c.id, category: c.category, template: t, depends: c.depends || [] };
  const right = [fnv(c.id, canonical(t, c.answer))];
  // answer: the card must not accept the wrong answers either (they are plausible ones: another convention).
  const wrong = t === 'answer' ? [...new Set(c.wrong.map(normalize).filter(Boolean))].map((w) => fnv(c.id, w)) : [];
  const gap = { right, wrong, head: G.head[t], none: G.none, tail: G.tail(c.id, G.what[t], G.line[t]) };
  // Wrong answers that give nothing away: nothing marked, or no text.
  const rejects = { choice: ['', 'zz'], 'spot-the-flaw': [[]], order: [[]], answer: ['', ' '] }[t];
  const cmp = t === 'choice' || t === 'answer' ? 'equal' : 'deepEqual';
  const decides =
    t === 'answer' ? 'GAP.right.every((h) => keys.includes(h)) && !keys.some((h) => GAP.wrong.includes(h))' : 'found.length === 1 && keys[0] === GAP.right[0]';
  const indent = (s) => s.split('\n').map((l) => (l ? '  ' + l : l)).join('\n');
  return `${X.generated}
// ${X.card} ${c.id}: ${c.title}
${G.comment}
import { test, assert, readSource, newContainer } from '../../lib/testkit.js';
import { cardProblems } from '../../lib/security.js';
${t === 'answer' ? "import { normalize } from '../../templates/answer.js';\n" : ''}
const SPEC = ${JSON.stringify(spec)};
const GAP = ${JSON.stringify(gap)};
const hash = ${HASH_JS};

${contractTests(c)}
${indent(findAnswers(c))}

  test('${c.id}: ${q(X.accepts)}', async () => {
    const found = await accepted();
    const keys = found.map((a) => hash(a.key));
    const message = (found.length ? GAP.head.replace('%s', () => found.slice(0, 6).map((a) => a.label).join(', ')) : GAP.none) + GAP.tail;
    assert.ok(${decides}, message);
  });

  test('${c.id}: ${q(X.rejects)}', () => {
    for (const w of ${JSON.stringify(rejects)}) assert.equal(card.validate(w), false, '${q(X.shouldReject)}' + JSON.stringify(w));
  });

  test('${c.id}: ${q(X.draws)}', async () => {
    const answer = (await accepted())[0]?.value;
    const c = newContainer();
    let received;
    card.render(c, { submit: (r) => { received = r; return { correct: card.validate(r) }; } });
    assert.ok(c.textContent.includes(card.title), '${q(X.showsTitle)}');
    if (answer === undefined) return;
    ${interaction(c, 'answer')}
    c.querySelector('.button-primary').click();
    assert.${cmp}(received, answer, '${q(X.returns)}');
  });

${safeSourceTest(c)}`;
}

function tasksMd() {
  const X = TEXTS.tasks;
  const L = [X.title, ''];
  L.push(X.intro, '');
  L.push(X.participant(cards.length));
  L.push(X.presenter(cards.length), '');
  L.push(X.support, '', tableRow(X.supportColumns), tableRow(['---', '---', '---', '---', '---']));
  const dep = (d) => (d === '*cards' ? X.allCards : d);
  for (const t of [...extra.lib, ...extra.pages, extra.integration, extra.review]) {
    L.push(tableRow([t.id, t.wave, t.title, t.spec ? `\`${t.spec}\`` : '—', (t.depends || []).map(dep).join(', ') || '—']));
  }
  L.push('');
  for (const cat of specs.categories) {
    const cs = cards.filter((c) => c.category === cat.id);
    if (!cs.length) continue;
    L.push(`## ${cat.name}`, '', tableRow(X.cardColumns), tableRow(['---', '---', '---', '---', '---']));
    for (const c of cs) L.push(tableRow([c.id, c.template, c.title, c.concept, (c.depends || []).join(', ') || '—']));
    L.push('');
  }
  return L.join('\n');
}

// Whether `current` has every line of `generated`, in the same order (a person only added lines to it).
function extends_(current, generated) {
  const have = current.split('\n');
  let i = 0;
  for (const line of generated.split('\n')) {
    while (i < have.length && have[i] !== line) i++;
    if (i === have.length) return false;
    i++;
  }
  return true;
}

// Your card generated for the first time now (for the workshop panel's event below).
const freshMine = cards.some((c) => c.id === MY_CARD_ID) && !existsSync(join(ROOT, 'cards', MY_CARD_ID, 'card.test.js'));

let changed = 0;
function write(rel, content, { keepCompleted = false } = {}) {
  const p = join(ROOT, rel);
  const current = existsSync(p) ? readFileSync(p, 'utf8').replace(/\r\n/g, '\n') : null;
  if (current === content) return;
  // The spec of a broken card that a person completed: kept (re-running gen does not undo the fix).
  if (keepCompleted && current !== null && extends_(current, content)) return;
  changed++;
  if (CHECK) {
    console.error(M.outOfDate(rel));
    return;
  }
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, content, 'utf8');
}

for (const c of cards) {
  write(`cards/${c.id}/spec.md`, specMd(c), { keepCompleted: gapsOf(c).length > 0 });
  write(`cards/${c.id}/card.test.js`, testJs(c));
}
write('TASKS.md', tasksMd());

if (CHECK && changed) {
  console.error(M.outOfDateN(changed));
  process.exit(1);
}
// The workshop panel counts the cards people invented (only the template; spec 6.4, p1_tool_created).
if (!CHECK && freshMine) {
  try {
    const { emit } = await import('./workshop/orchestrator/lib/telemetry.mjs');
    await emit('p1_tool_created', { tool_template: cards.find((c) => c.id === MY_CARD_ID).template });
  } catch {
    /* no telemetry: the card is generated all the same */
  }
}
console.log(CHECK ? M.upToDate : M.written(cards.length, changed));
