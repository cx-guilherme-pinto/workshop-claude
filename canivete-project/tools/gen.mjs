#!/usr/bin/env node
// Generates, from specs/tools.json, the pre-written files of the Pocketknife:
//   tools/<id>/spec.md, tools/<id>/tool.test.js and TASKS.md.
// Run it when you change specs/tools.json:  node tools/gen.mjs   (--check only checks)
// The language of the generated files comes from specs/tools.json ("lang": "pt" or "en"; no field, pt).
//
// Your tool: with specs/my-tool.json (a copy of specs/my-tool.example.json) it also validates that file and
// generates the tool my-01 (tools/my-tool.mjs). Without that file nothing changes.
//
// The tests check the examples of the spec (the output for each input), the invalid inputs (the error message),
// the contract (tools/CONTRACT.md) and a safe source. A generate tool is checked with properties and the same seed.
//
// Tools broken on purpose ("spec_gaps"): the spec.md leaves out the rule that decides some cases, so the agent
// guesses (and usually guesses the "obvious" answer). The tool.test.js keeps only a short hash (FNV-1a, 32 bits)
// of the right output of each of those cases; its message says what the tool returned and what the spec does not
// decide, never the expected value. A person decides the rule, writes it in tools/<id>/spec.md and runs
// /demo-swarm --retry <id>. A spec.md completed that way (every generated line still there, in order) is kept,
// also by --check. --no-gaps writes the complete specs (the reference solutions use it: tools/dev/check-solutions.mjs).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readMyTool, myToolReport, MY_TOOL_ID } from './my-tool.mjs';
import { gapHash } from './gaps.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHECK = process.argv.includes('--check');
const NO_GAPS = process.argv.includes('--no-gaps');
export const TEMPLATES = ['calc', 'convert', 'text', 'generate'];

const specs = JSON.parse(readFileSync(join(ROOT, 'specs/tools.json'), 'utf8'));
const extra = JSON.parse(readFileSync(join(ROOT, 'specs/tasks.json'), 'utf8'));
const LANG = specs.lang === 'en' ? 'en' : 'pt';

const TEXTS = {
  pt: {
    tool: 'Ferramenta',
    category: 'Categoria',
    template: 'Modelo',
    templateFrom: (t) => `\`${t}\` de \`../../templates/${t}.js\``,
    concept: 'Conceito',
    inputs: 'Entradas (campo `inputs`, por esta ordem)',
    inputCols: ['name', 'type', 'label', 'outros'],
    output: 'Saída',
    outputText: (o) => (o.type === 'fields' ? `Um objeto com os campos ${o.fields.map((f) => `\`${f.name}\` (${f.label})`).join(', ')}.` : o.type === 'list' ? `Uma lista (array) — ${o.label}.` : o.type === 'number' ? `Um número — ${o.label}.` : `Um texto — ${o.label}.`),
    rules: 'Regras',
    examples: 'Exemplos (o teste verifica-os)',
    exampleCols: ['entrada', 'saída'],
    seed: (s) => `seed ${s}`,
    check: { length: (n) => `${n} itens`, unique: 'sem repetidos', match: (r) => `cada um corresponde a \`${r}\``, charsets: (c) => `com ${c.join(', ')}`, from: (f) => `todos vêm de \`${f}\``, min_length: (n) => `pelo menos ${n} caracteres` },
    errors: 'Entradas inválidas (devolve `{ error }` com esta mensagem)',
    errorCols: ['entrada', 'error'],
    doneWhen: 'Feito quando',
    passes: 'passa sem erros. Regras: `tools/CONTRACT.md`.',
    generated: '// GERADO por tools/gen.mjs a partir de specs/tools.json. Não editar à mão.',
    gapComment: '// Ferramenta partida de propósito: a spec.md não decide alguns casos, e este teste só guarda um hash curto do resultado certo.',
    gapTest: 'os casos que a spec decide por uma regra',
    tasks: {
      title: '# TASKS — Canivete',
      intro: 'Cada tarefa é feita por um agente. **Este ficheiro é gerado** por `node tools/gen.mjs` a partir de `specs/tools.json` e `specs/tasks.json`.',
      count: (n) => `- **${n} ferramentas** + a página de pesquisa e categorias + integração + revisão.`,
      support: '## Tarefas de suporte',
      supportColumns: ['id', 'onda', 'o quê', 'spec', 'depende de'],
      toolColumns: ['id', 'modelo', 'título', 'conceito'],
      allTools: 'todas as ferramentas',
    },
    msg: {
      repeatedId: (id) => `id repetido: ${id}`,
      category: (id, cat) => `${id}: categoria desconhecida ${cat}`,
      template: (id, m) => `${id}: modelo desconhecido ${m}`,
      inputs: (id) => `${id}: inputs inválidos (name, type e label em cada um)`,
      examples: (id) => `${id}: precisa de pelo menos 2 exemplos`,
      exampleInput: (id, n) => `${id}: o exemplo ${n} usa uma entrada que não existe`,
      generateCheck: (id, n) => `${id}: o exemplo ${n} de um gerador precisa de "seed" e "check"`,
      gap: (id) => `${id}: spec_gaps precisa de "what", "rule", "cases" e "obvious" (do mesmo tamanho que "cases")`,
      reserved: (id) => `${id}: este id está reservado para a ferramenta do participante (specs/my-tool.json)`,
      problems: 'specs/tools.json tem problemas:',
      outOfDate: (rel) => `desatualizado: ${rel}`,
      outOfDateN: (n) => `${n} ficheiro(s) desatualizados. Corre: node tools/gen.mjs`,
      upToDate: 'gen: tudo atualizado',
      written: (n, m) => `gen: ${n} ferramentas, ${m} ficheiro(s) escritos`,
    },
  },
  en: {
    tool: 'Tool',
    category: 'Category',
    template: 'Template',
    templateFrom: (t) => `\`${t}\` from \`../../templates/${t}.js\``,
    concept: 'Concept',
    inputs: 'Inputs (field `inputs`, in this order)',
    inputCols: ['name', 'type', 'label', 'other'],
    output: 'Output',
    outputText: (o) => (o.type === 'fields' ? `An object with the fields ${o.fields.map((f) => `\`${f.name}\` (${f.label})`).join(', ')}.` : o.type === 'list' ? `A list (array) — ${o.label}.` : o.type === 'number' ? `A number — ${o.label}.` : `A text — ${o.label}.`),
    rules: 'Rules',
    examples: 'Examples (the test checks them)',
    exampleCols: ['input', 'output'],
    seed: (s) => `seed ${s}`,
    check: { length: (n) => `${n} items`, unique: 'no repeats', match: (r) => `each one matches \`${r}\``, charsets: (c) => `with ${c.join(', ')}`, from: (f) => `all come from \`${f}\``, min_length: (n) => `at least ${n} characters` },
    errors: 'Invalid inputs (returns `{ error }` with this message)',
    errorCols: ['input', 'error'],
    doneWhen: 'Done when',
    passes: 'passes with no errors. Rules: `tools/CONTRACT.md`.',
    generated: '// GENERATED by tools/gen.mjs from specs/tools.json. Do not edit by hand.',
    gapComment: '// Tool broken on purpose: the spec.md does not decide some cases, and this test keeps only a short hash of the right result.',
    gapTest: 'the cases the spec decides with a rule',
    tasks: {
      title: '# TASKS — Pocketknife',
      intro: 'Each task is done by one agent. **This file is generated** by `node tools/gen.mjs` from `specs/tools.json` and `specs/tasks.json`.',
      count: (n) => `- **${n} tools** + the search and categories page + integration + review.`,
      support: '## Support tasks',
      supportColumns: ['id', 'wave', 'what', 'spec', 'depends on'],
      toolColumns: ['id', 'template', 'title', 'concept'],
      allTools: 'all the tools',
    },
    msg: {
      repeatedId: (id) => `repeated id: ${id}`,
      category: (id, cat) => `${id}: unknown category ${cat}`,
      template: (id, m) => `${id}: unknown template ${m}`,
      inputs: (id) => `${id}: invalid inputs (name, type and label in each)`,
      examples: (id) => `${id}: needs at least 2 examples`,
      exampleInput: (id, n) => `${id}: example ${n} uses an input that does not exist`,
      generateCheck: (id, n) => `${id}: example ${n} of a generator needs "seed" and "check"`,
      gap: (id) => `${id}: spec_gaps needs "what", "rule", "cases" and "obvious" (as long as "cases")`,
      reserved: (id) => `${id}: this id is reserved for the participant's tool (specs/my-tool.json)`,
      problems: 'specs/tools.json has problems:',
      outOfDate: (rel) => `out of date: ${rel}`,
      outOfDateN: (n) => `${n} file(s) out of date. Run: node tools/gen.mjs`,
      upToDate: 'gen: everything up to date',
      written: (n, m) => `gen: ${n} tools, ${m} file(s) written`,
    },
  },
}[LANG];
const M = TEXTS.msg;

// ---------- validation ----------

const TYPES = new Set(['number', 'integer', 'text', 'multiline', 'date', 'choice', 'list']);
const cats = new Set(specs.categories.map((c) => c.id));
export function problemsOf(t, { reserved = true } = {}) {
  const p = [];
  if (reserved && t.id === MY_TOOL_ID) p.push(M.reserved(t.id));
  if (!cats.has(t.category)) p.push(M.category(t.id, t.category));
  if (!TEMPLATES.includes(t.template)) p.push(M.template(t.id, t.template));
  if (!Array.isArray(t.inputs) || !t.inputs.length || !t.inputs.every((d) => d && /^[a-z][a-z0-9_]*$/.test(d.name || '') && TYPES.has(d.type) && d.label)) p.push(M.inputs(t.id));
  if (!Array.isArray(t.examples) || t.examples.length < 2) p.push(M.examples(t.id));
  const names = new Set((t.inputs || []).map((d) => d.name));
  (t.examples || []).forEach((ex, i) => {
    if (Object.keys(ex.in || {}).some((k) => !names.has(k))) p.push(M.exampleInput(t.id, i + 1));
    if (t.template === 'generate' && (!Number.isInteger(ex.seed) || !ex.check)) p.push(M.generateCheck(t.id, i + 1));
  });
  // A gap is complete (what, rule, cases with out, obvious) in the kit's catalogue; in an assembled project the
  // installer keeps only what the test needs (what and cases with the hash "right"), so no answer is on disk.
  for (const g of t.spec_gaps || []) {
    const cases = Array.isArray(g.cases) && g.cases.length ? g.cases : null;
    const full = g.rule && cases?.every((c) => c.out !== undefined) && Array.isArray(g.obvious) && g.obvious.length === cases.length;
    const hashed = cases?.every((c) => /^[0-9a-f]{8}$/.test(c.right || ''));
    if (!g.what || !cases || !(full || hashed) || (NO_GAPS && !full)) p.push(M.gap(t.id));
  }
  return p;
}

const problems = [];
const seen = new Set();
for (const t of specs.tools) {
  if (seen.has(t.id)) problems.push(M.repeatedId(t.id));
  seen.add(t.id);
  problems.push(...problemsOf(t));
}
const mine = readMyTool(ROOT, specs);
if (mine.errors.length) {
  console.error(myToolReport(mine.errors, LANG));
  process.exit(1);
}
const tools = mine.tool ? [...specs.tools, mine.tool] : specs.tools;
if (problems.length) {
  console.error(M.problems);
  for (const p of problems) console.error('  - ' + p);
  process.exit(1);
}

// ---------- spec.md ----------

const gapsOf = (t) => (NO_GAPS ? [] : t.spec_gaps || []);
const j = (v) => JSON.stringify(v);
const cell = (s) => String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
const tableRow = (cols) => '| ' + cols.map(cell).join(' | ') + ' |';
const inText = (o) => Object.entries(o || {}).map(([k, v]) => `${k}: ${j(v)}`).join(', ') || '—';
const checkText = (c) => Object.entries(c).map(([k, v]) => (k === 'unique' ? TEXTS.check.unique : TEXTS.check[k]?.(v) ?? `${k}: ${j(v)}`)).join('; ');

function specMd(t) {
  const X = TEXTS;
  const L = [`# ${X.tool} ${t.id} — ${t.title}`, ''];
  L.push(`- **${X.category}:** ${t.category}`, `- **${X.template}:** ${X.templateFrom(t.template)}`, '');
  L.push(`## ${X.concept}`, '', t.concept, '');
  L.push(`## ${X.inputs}`, '', tableRow(X.inputCols), tableRow(['---', '---', '---', '---']));
  for (const d of t.inputs) {
    const other = Object.entries(d).filter(([k]) => !['name', 'type', 'label'].includes(k)).map(([k, v]) => `${k}: ${j(v)}`).join(', ');
    L.push(tableRow([`\`${d.name}\``, d.type, d.label, other || '—']));
  }
  L.push('', `## ${X.output}`, '', X.outputText(t.output), '', `## ${X.rules}`, '');
  for (const r of t.rules || []) L.push(`- ${r}`);
  // A broken tool's spec has neither the rule nor its cases; the complete spec (--no-gaps) has both.
  for (const g of NO_GAPS ? t.spec_gaps || [] : []) L.push(`- ${g.rule}`);
  L.push('', `## ${X.examples}`, '', tableRow(X.exampleCols), tableRow(['---', '---']));
  const examples = [...t.examples, ...(NO_GAPS ? (t.spec_gaps || []).flatMap((g) => g.cases) : [])];
  for (const ex of examples) L.push(tableRow([inText(ex.in) + (ex.seed !== undefined ? ` (${X.seed(ex.seed)})` : ''), ex.check ? checkText(ex.check) : `\`${j(ex.out)}\``]));
  if (t.errors?.length) {
    L.push('', `## ${X.errors}`, '', tableRow(X.errorCols), tableRow(['---', '---']));
    for (const e of t.errors) L.push(tableRow([inText(e.in), e.error]));
  }
  L.push('', `## ${X.doneWhen}`, '', '```', `node --test tools/${t.id}/tool.test.js`, '```', '', X.passes, '');
  return L.join('\n');
}

// ---------- tool.test.js ----------

// The canonical form of an output for the hash: numbers with 12 significant digits (no float noise), JSON.
const CANON_JS = `(v) => JSON.stringify(v, (k, x) => (typeof x === 'number' ? Number(x.toPrecision(12)) : x))`;
// FNV-1a (32 bits) of "<id>:<canonical output>": the same function goes into the test (tools/gaps.mjs).
const HASH_JS = `(v) => {
  const s = SPEC.id + ':' + v;
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
  return h.toString(16).padStart(8, '0');
}`;
const q = (s) => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

function testJs(t) {
  const X = TEXTS;
  const gaps = gapsOf(t);
  const spec = {
    id: t.id,
    template: t.template,
    inputs: t.inputs.map((d) => d.name),
    examples: t.examples,
    errors: t.errors || [],
    gaps: gaps.map((g) => ({ cases: g.cases.map((c) => ({ in: c.in, right: c.right ?? gapHash(t.id, c.out) })) })),
    what: gaps.map((g) => g.what),
  };
  return `${X.generated}
// ${X.tool} ${t.id}: ${t.title}
${gaps.length ? X.gapComment + '\n' : ''}import { test, assert, readSource, same } from '../../lib/testkit.js';
import { toolProblems } from '../../lib/security.js';
import { T } from '../../lib/texts.js';

const SPEC = ${JSON.stringify(spec)};
const M = T.tests;
const show = (v) => JSON.stringify(v);
const canon = ${CANON_JS};
const hash = ${HASH_JS};

let tool = null;
let loadError = null;
try {
  tool = (await import('./tool.js')).default ?? null;
} catch (e) {
  loadError = e;
}

test(SPEC.id + ': ' + M.loads, () => {
  assert.ok(tool, M.doesNotLoad(SPEC.id) + (loadError?.message ?? ''));
});

// The checks of a generator's example (specs/tools.json "check").
function check(out, c) {
  const items = Array.isArray(out) ? out : [out];
  if (c.length !== undefined) assert.equal(Array.isArray(out) || typeof out === 'string' ? out.length : NaN, c.length, M.expected(c.length, show(out)));
  if (c.min_length !== undefined) for (const x of items) assert.ok(String(x).length >= c.min_length, M.expected('>= ' + c.min_length, show(x)));
  if (c.unique) assert.equal(new Set(items.map(show)).size, items.length, M.expected('unique', show(out)));
  if (c.match) for (const x of items) assert.match(String(x), new RegExp(c.match), M.expected(c.match, show(x)));
  if (c.charsets) {
    const re = { lower: /[a-z]/, upper: /[A-Z]/, digit: /[0-9]/, symbol: /[^A-Za-z0-9]/ };
    for (const x of items) for (const k of c.charsets) assert.ok(re[k].test(String(x)), M.expected(k, show(x)));
  }
}

if (tool) {
  test(SPEC.id + ': ' + M.contract, () => {
    assert.equal(tool.id, SPEC.id, M.wrongId);
    assert.equal(tool.template, SPEC.template, M.usesTemplate(SPEC.template));
    assert.ok(typeof tool.title === 'string' && tool.title.length > 2, M.noTitle);
    assert.deepEqual((tool.inputs || []).map((d) => d.name), SPEC.inputs, M.inputs);
    assert.equal(typeof tool.run, 'function');
  });

  SPEC.examples.forEach((ex, i) => {
    test(SPEC.id + ': ' + M.example(i + 1), () => {
      const r = tool.run(ex.in, ex.seed !== undefined ? { seed: ex.seed } : {});
      assert.ok(r && !r.error, r?.error ? M.gotError(r.error) : M.expected(show(ex.out), show(r)));
      if (ex.check) check(r.output, ex.check);
      else assert.ok(same(r.output, ex.out), M.expected(show(ex.out), show(r.output)));
    });
  });

  SPEC.errors.forEach((e, i) => {
    test(SPEC.id + ': ' + M.errorCase(i + 1), () => {
      const r = tool.run(e.in);
      assert.equal(r?.error, e.error, M.shouldError(e.error, show(r)));
    });
  });
${
  t.template === 'generate'
    ? `
  test(SPEC.id + ': ' + M.deterministic, () => {
    const ex = SPEC.examples[0];
    assert.deepEqual(tool.run(ex.in, { seed: 3 }), tool.run(ex.in, { seed: 3 }));
    assert.notEqual(show(tool.run(ex.in, { seed: 3 })), show(tool.run(ex.in, { seed: 4 })));
  });
`
    : ''
}
  SPEC.gaps.forEach((g, i) => {
    test(SPEC.id + ': ${q(X.gapTest)}' + (SPEC.gaps.length > 1 ? ' ' + (i + 1) : ''), () => {
      for (const c of g.cases) {
        const r = tool.run(c.in);
        const got = r?.error ? r : r?.output;
        assert.ok(!r?.error && hash(canon(r.output)) === c.right, M.gapHead(show(c.in), show(got)) + M.gapTail(SPEC.id, SPEC.what[i]));
      }
    });
  });

  test(SPEC.id + ': ' + M.safeSource, async () => {
    const src = await readSource('./tool.js', import.meta.url);
    assert.deepEqual(toolProblems(src), []);
  });
}
`;
}

// ---------- TASKS.md ----------

function tasksMd() {
  const X = TEXTS.tasks;
  const L = [X.title, '', X.intro, '', X.count(tools.length), '', X.support, '', tableRow(X.supportColumns), tableRow(['---', '---', '---', '---', '---'])];
  const dep = (d) => (d === '*tools' ? X.allTools : d);
  for (const t of [...extra.pages, extra.integration, extra.review]) L.push(tableRow([t.id, t.wave, t.title, t.spec ? `\`${t.spec}\`` : '—', (t.depends || []).map(dep).join(', ') || '—']));
  L.push('');
  for (const cat of specs.categories) {
    const ts = tools.filter((t) => t.category === cat.id);
    if (!ts.length) continue;
    L.push(`## ${cat.name}`, '', tableRow(X.toolColumns), tableRow(['---', '---', '---', '---']));
    for (const t of ts) L.push(tableRow([t.id, t.template, t.title, t.concept]));
    L.push('');
  }
  return L.join('\n');
}

// ---------- writing ----------

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

// Your tool generated for the first time now (for the panel event below).
const freshMine = !!mine.tool && !existsSync(join(ROOT, 'tools', MY_TOOL_ID, 'tool.test.js'));

let changed = 0;
function write(rel, content, { keepCompleted = false } = {}) {
  const p = join(ROOT, rel);
  const current = existsSync(p) ? readFileSync(p, 'utf8').replace(/\r\n/g, '\n') : null;
  if (current === content) return;
  if (keepCompleted && current !== null && extends_(current, content)) return;
  changed++;
  if (CHECK) {
    console.error(M.outOfDate(rel));
    return;
  }
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, content, 'utf8');
}

for (const t of tools) {
  write(`tools/${t.id}/spec.md`, specMd(t), { keepCompleted: gapsOf(t).length > 0 });
  write(`tools/${t.id}/tool.test.js`, testJs(t));
}
write('TASKS.md', tasksMd());

if (CHECK && changed) {
  console.error(M.outOfDateN(changed));
  process.exit(1);
}
// Your tool, generated for the first time: the panel counts the tools the room invented (only the template).
if (!CHECK && freshMine) {
  try {
    const { emit } = await import('./workshop/orchestrator/lib/telemetry.mjs');
    await emit('p1_tool_created', { tool_template: mine.tool.template });
  } catch {
    /* no telemetry: the tool is generated all the same */
  }
}
console.log(CHECK ? M.upToDate : M.written(tools.length, changed));
