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
// WITHOUT that detail, and its card.test.js checks that the spec has it. No agent can make it green: a person
// adds the line the failing test names to cards/<id>/spec.md and runs the card again (/demo-swarm --retry <id>).
// A spec.md completed that way (every generated line still there, in order) is kept, also by --check.
// --no-gaps writes the complete specs (the reference solutions use it: tools/dev/check-solutions.mjs).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readMyCard, myCardReport, MY_CARD_ID } from './my-card.mjs';

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
      specComplete: 'a spec.md tem todos os detalhes que o teste verifica',
      specGap: (id, what, line) => `falta em cards/${id}/spec.md um detalhe que o teste verifica: ${what}. Uma pessoa acrescenta à spec esta linha: ${line} — e depois corre /demo-swarm --retry ${id} (os agentes não mudam specs).`,
    },
    gaps: { answer: { choice: 'a resposta certa', 'spot-the-flaw': 'os bocados inseguros', order: 'a ordem certa' }, accept: 'as respostas aceites' },
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
      specComplete: 'spec.md has every detail the test checks',
      specGap: (id, what, line) => `cards/${id}/spec.md is missing a detail the test checks: ${what}. A person adds this line to the spec: ${line} — then runs /demo-swarm --retry ${id} (agents do not change specs).`,
    },
    gaps: { answer: { choice: 'the right answer', 'spot-the-flaw': 'the unsafe pieces', order: 'the right order' }, accept: 'the accepted answers' },
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
// What the test looks for in spec.md: a line with the field name and the value (spaces and backticks ignored).
const gapCheck = (c, gap) => ({ field: gap, value: j(gap === 'accept' ? c.accept : c.answer) });

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

function interaction(c) {
  switch (c.template) {
    case 'choice':
      return `c.querySelector('[data-option="' + SPEC.answer + '"]').click();`;
    case 'spot-the-flaw':
      return `for (const i of SPEC.answer) c.querySelector('[data-index="' + i + '"]').click();`;
    case 'order':
      return [
        `for (let p = 0; p < SPEC.answer.length; p++) {`,
        `      for (let guard = 0; guard < 50; guard++) {`,
        `        const current = Array.from(c.querySelectorAll('[data-item]'), (n) => n.getAttribute('data-item'));`,
        `        if (current.indexOf(SPEC.answer[p]) <= p) break;`,
        `        c.querySelector('[data-item="' + SPEC.answer[p] + '"]').querySelector('[data-move="up"]').click();`,
        `      }`,
        `    }`,
      ].join('\n');
    case 'answer':
      return `c.querySelector('input').value = SPEC.answer;`;
    default:
      return '';
  }
}

function testJs(c) {
  const spec = { id: c.id, category: c.category, template: c.template, answer: c.answer, wrong: c.wrong, depends: c.depends || [] };
  const cmp = c.template === 'choice' || c.template === 'answer' ? 'equal' : 'deepEqual';
  const X = TEXTS.test;
  const q = (s) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  // A broken card: the test also checks that spec.md has the details gen left out (only in Node: the server
  // does not serve .md files to the browser).
  const gaps = (c.spec_gaps || []).map((g) => ({ ...gapCheck(c, g), message: X.specGap(c.id, g === 'accept' ? TEXTS.gaps.accept : TEXTS.gaps.answer[c.template], detailLine(c, g)) }));
  const gapTest = gaps.length
    ? `
const GAPS = ${JSON.stringify(gaps)};
const flat = (s) => String(s).replace(/[\\s\`]/g, '').replace(/'/g, '"').toLowerCase();

if (environment === 'node') {
  test('${c.id}: ${q(X.specComplete)}', async () => {
    const lines = (await readSource('./spec.md', import.meta.url)).split('\\n').map(flat);
    for (const g of GAPS) assert.ok(lines.some((l) => l.includes(g.field) && l.includes(flat(g.value))), g.message);
  });
}
`
    : '';
  return `${X.generated}
// ${X.card} ${c.id}: ${c.title}
import { test, assert, readSource, newContainer${gaps.length ? ', environment' : ''} } from '../../lib/testkit.js';
import { cardProblems } from '../../lib/security.js';

const SPEC = ${JSON.stringify(spec)};
${gapTest}
let card = null;
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

  test('${c.id}: ${q(X.safeSource)}', async () => {
    const src = await readSource('./card.js', import.meta.url);
    assert.deepEqual(cardProblems(src), []);
    if (SPEC.depends.includes('lib-hash')) assert.match(src, /from\\s+['"]\\.\\.\\/\\.\\.\\/lib\\/hash\\.js['"]/, '${q(X.usesHash)}');
  });
}
`;
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
console.log(CHECK ? M.upToDate : M.written(cards.length, changed));
