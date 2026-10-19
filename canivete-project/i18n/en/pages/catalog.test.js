// Pre-written test for the index-page task (see specs/index-page.md). Agents never change it.
// Runs in Node (node --test pages/catalog.test.js) and in the browser: the shell runs it before it uses pages/catalog.js.
import { test, assert, readSource } from '../lib/testkit.js';
import { securityProblems, stripStringsAndComments } from '../lib/security.js';
import { T } from '../lib/texts.js';

// In the browser the shell asks for this test with ?v=<version>, and the same ?v= goes to catalog.js (a new module for
// each version). In Node there is no ?v=.
const VERSION = new URL(import.meta.url).search;

let mod = null;
let importError = null;
try {
  mod = await import('./catalog.js' + VERSION);
} catch (e) {
  importError = e;
}

test('pages/catalog.js exists and exports normalize, search, byCategory and summary', () => {
  assert.ok(mod, `pages/catalog.js does not exist or has an error: ${importError?.message ?? ''}`);
  for (const name of ['normalize', 'search', 'byCategory', 'summary']) assert.equal(typeof mod[name], 'function', `missing export function ${name}`);
});

const CATEGORIES = [
  { id: 'text', name: 'Text' },
  { id: 'numbers', name: 'Numbers' },
  { id: 'dates', name: 'Dates' },
  { id: 'money', name: 'Money' },
  { id: 'daily', name: 'Everyday' },
];

const tool = (id, category, title, concept, built) => ({ id, category, category_name: CATEGORIES.find((c) => c.id === category)?.name ?? null, title, concept, template: 'calc', built });

// In the order of the catalogue, which is not the order of the categories: dd-01 comes before nm-01.
const TOOLS = [
  tool('tx-01', 'text', 'Word count', 'Counts the words of a text and estimates the reading time.', true),
  tool('dd-01', 'daily', 'Kitchen measures', 'Turns cups and spoons into grams, for recipes.', false),
  tool('nm-01', 'numbers', 'Percentages', 'How much X % of Y is, and what percentage one number is of another.', true),
  tool('tx-04', 'text', 'Remove accents', 'Strips accents and the cedilla: façade gives facade.', false),
  tool('dt-01', 'dates', 'Days between two dates', 'How many days are left until the holidays or have passed since a birthday.', true),
  tool('dn-01', 'money', 'Tip and bill split', 'At a group dinner: the tip and how much each person pays.', true),
  tool('nm-03', 'numbers', 'Round to decimal places', 'Rounds a number to the places you choose.', false),
  tool('dd-02', 'daily', 'Café timer', 'How long to brew a cafe filter coffee, by the cups.', true),
];

// Freezes the list and each tool: a function that changes them (sort, push, t.x = …) throws an error.
const frozen = () => Object.freeze(TOOLS.map((t) => Object.freeze({ ...t })));
const ids = (list) => list.map((t) => t.id);

if (mod && ['normalize', 'search', 'byCategory', 'summary'].every((n) => typeof mod[n] === 'function')) {
  // ---------- normalize ----------

  test('normalize: lower case, no accents or cedilla, spaces joined and trimmed', () => {
    assert.equal(mod.normalize('  Café   NOIR  '), 'cafe noir');
    assert.equal(mod.normalize('Façade and Naïve'), 'facade and naive');
    assert.equal(mod.normalize('Crème Brûlée'), 'creme brulee');
    assert.equal(mod.normalize('tab\tline\nend'), 'tab line end');
    assert.equal(mod.normalize(''), '');
  });

  test('normalize: null and undefined give an empty text', () => {
    assert.equal(mod.normalize(null), '');
    assert.equal(mod.normalize(undefined), '');
  });

  // ---------- search ----------

  test('search: with no search (empty or only spaces) returns all of them, in the same order, in a new list', () => {
    const list = frozen();
    for (const q of ['', '   ', undefined, null]) {
      const r = mod.search(list, q);
      assert.deepEqual(ids(r), ids(TOOLS), `search ${JSON.stringify(q)}`);
      assert.ok(r !== list, 'returns a new list, not the same one');
    }
  });

  test('search: ignores upper and lower case', () => {
    assert.deepEqual(ids(mod.search(frozen(), 'DINNER')), ['dn-01']);
    assert.deepEqual(ids(mod.search(frozen(), 'wOrD')), ['tx-01']);
  });

  test('search: ignores accents, both in the search and in the text', () => {
    assert.deepEqual(ids(mod.search(frozen(), 'cafe')), ['dd-02'], '"cafe" finds the title "Café timer"');
    assert.deepEqual(ids(mod.search(frozen(), 'café')), ['dd-02'], '"café" finds it too');
    assert.deepEqual(ids(mod.search(frozen(), 'FACADE')), ['tx-04'], '"FACADE" finds "façade" in the concept');
    assert.deepEqual(ids(mod.search(frozen(), 'façade')), ['tx-04'], '"façade" finds it too');
  });

  test('search: looks in the title, the concept and the category name', () => {
    assert.deepEqual(ids(mod.search(frozen(), 'round')), ['nm-03'], 'in the title');
    assert.deepEqual(ids(mod.search(frozen(), 'holidays')), ['dt-01'], 'in the concept');
    assert.deepEqual(ids(mod.search(frozen(), 'numbers')), ['nm-01', 'nm-03'], 'in the category name (category_name)');
    assert.deepEqual(ids(mod.search(frozen(), 'MONEY')), ['dn-01'], 'in the category name, in upper case');
  });

  test('search: looks in the id too', () => {
    assert.deepEqual(ids(mod.search(frozen(), 'nm-03')), ['nm-03']);
    assert.deepEqual(ids(mod.search(frozen(), 'TX-')), ['tx-01', 'tx-04']);
  });

  test('search: with several words, each one must show up (in any order and in any field)', () => {
    assert.deepEqual(ids(mod.search(frozen(), 'person  tip')), ['dn-01'], 'both words are in dn-01');
    assert.deepEqual(ids(mod.search(frozen(), 'tip person')), ['dn-01'], 'in another order');
    assert.deepEqual(ids(mod.search(frozen(), 'money dinner')), ['dn-01'], 'one in the category name, the other in the concept');
    assert.deepEqual(ids(mod.search(frozen(), 'text grams')), [], 'no tool has both');
  });

  test('search: the words can be parts of words', () => {
    assert.deepEqual(ids(mod.search(frozen(), 'percent')), ['nm-01']);
    assert.deepEqual(ids(mod.search(frozen(), 'recip')), ['dd-01']);
  });

  test('search: with no results returns an empty list', () => {
    assert.deepEqual(mod.search(frozen(), 'xylophone'), []);
  });

  test('search: keeps the order received and returns the same tools (not copies)', () => {
    const list = frozen();
    const r = mod.search(list, 'a');
    assert.deepEqual(ids(r), ids(TOOLS.filter((t) => /a/.test(mod.normalize([t.id, t.title, t.concept, t.category_name].join(' '))))));
    assert.ok(r.every((t) => list.includes(t)), 'each result is the very object of the list');
  });

  test('search: missing fields count as an empty text, and what is not a list gives []', () => {
    const list = [{ id: 'xx-01', title: 'Only a title' }, { id: 'xx-02', concept: 'Only a concept' }, { id: 'xx-03', category_name: null }];
    assert.deepEqual(ids(mod.search(list, 'only')), ['xx-01', 'xx-02']);
    assert.deepEqual(mod.search(null, 'a'), []);
    assert.deepEqual(mod.search(undefined, ''), []);
  });

  // ---------- byCategory ----------

  test('byCategory: one group per category, in the order of the categories, with the tools in the order received', () => {
    const g = mod.byCategory(frozen(), CATEGORIES);
    assert.deepEqual(g.map((x) => x.id), ['text', 'numbers', 'dates', 'money', 'daily']);
    assert.deepEqual(g.map((x) => x.name), ['Text', 'Numbers', 'Dates', 'Money', 'Everyday']);
    assert.deepEqual(g.map((x) => ids(x.tools)), [['tx-01', 'tx-04'], ['nm-01', 'nm-03'], ['dt-01'], ['dn-01'], ['dd-01', 'dd-02']]);
  });

  test('byCategory: built counts the tools with built === true in each group', () => {
    const g = mod.byCategory(frozen(), CATEGORIES);
    assert.deepEqual(g.map((x) => x.built), [1, 1, 1, 1, 1]);
    const truthy = [{ ...TOOLS[0], built: 'yes' }, { ...TOOLS[3], built: 1 }];
    assert.equal(mod.byCategory(truthy, CATEGORIES)[0].built, 0, 'only true counts');
  });

  test('byCategory: the categories with no tools are left out', () => {
    const g = mod.byCategory(mod.search(frozen(), 'round'), CATEGORIES);
    assert.equal(g.length, 1);
    assert.equal(g[0].id, 'numbers');
    assert.deepEqual(ids(g[0].tools), ['nm-03']);
    assert.deepEqual(mod.byCategory([], CATEGORIES), []);
  });

  test('byCategory: the tools of an unknown category (or with no category) go into a last group "other"', () => {
    const list = [tool('zz-01', 'space', 'Distance to the Moon', 'In kilometres.', true), TOOLS[0], { ...TOOLS[2], category: null }];
    const g = mod.byCategory(list, CATEGORIES);
    assert.deepEqual(g.map((x) => x.id), ['text', 'other']);
    const other = g[g.length - 1];
    assert.equal(other.name, T.catalog.other, 'the name of the group comes from T.catalog.other (lib/texts.js)');
    assert.deepEqual(ids(other.tools), ['zz-01', 'nm-01']);
    assert.equal(other.built, 2);
  });

  test('byCategory: each group has exactly id, name, tools and built, and does not change what it receives', () => {
    const g = mod.byCategory(frozen(), Object.freeze(CATEGORIES.map((c) => Object.freeze({ ...c }))));
    for (const x of g) assert.deepEqual(Object.keys(x).sort(), ['built', 'id', 'name', 'tools']);
  });

  // ---------- summary ----------

  test('summary: total, ready (built === true) and to build', () => {
    assert.deepEqual(mod.summary(frozen()), { total: 8, built: 5, to_build: 3 });
    assert.deepEqual(mod.summary([]), { total: 0, built: 0, to_build: 0 });
    assert.deepEqual(mod.summary(null), { total: 0, built: 0, to_build: 0 });
  });

  // ---------- source ----------

  test('pages/catalog.js is a pure and safe module', async () => {
    const src = await readSource('./catalog.js', import.meta.url);
    assert.deepEqual(securityProblems(src), [], 'dangerous patterns');
    const code = stripStringsAndComments(src);
    const forbidden = [
      ['document', '\\bdocument\\b'],
      ['window', '\\bwindow\\b'],
      ['fetch', '\\bfetch\\s*\\('],
      ['XMLHttpRequest', 'XMLHttpRequest'],
      ['localStorage', '\\blocalStorage\\b'],
      ['sessionStorage', '\\bsessionStorage\\b'],
      ['import()', '\\bimport\\s*\\('],
    ];
    const found = forbidden.filter(([, re]) => new RegExp(re).test(code)).map(([name]) => name);
    assert.deepEqual(found, [], 'a pure module: no DOM, no network, no storage and no dynamic import()');
    for (const m of src.matchAll(/^\s*import\s[^'"]*['"]([^'"]+)['"]/gm)) {
      assert.ok(/^\.\.\/(lib|templates)\/[\w-]+\.js$/.test(m[1]), `import not allowed: ${m[1]} (only ../lib/*.js and ../templates/*.js)`);
    }
  });
}
