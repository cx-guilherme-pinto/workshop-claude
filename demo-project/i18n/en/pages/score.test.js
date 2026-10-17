// Pre-written test for the score-table task (see specs/score-table.md).
// Runs in Node with the fake DOM from lib/fakedom.js: node --test pages/score.test.js
import { test, assert, readSource, newContainer } from '../lib/testkit.js';
import { securityProblems, stripStringsAndComments } from '../lib/security.js';

let mod = null;
let importError = null;
try {
  mod = await import('./score.js');
} catch (e) {
  importError = e;
}

test('pages/score.js exists and exports renderScore', () => {
  assert.ok(mod, `pages/score.js does not exist or has an error: ${importError?.message ?? ''}`);
  assert.equal(typeof mod.renderScore, 'function', 'missing export function renderScore(container, data)');
});

function data(extra = {}) {
  return {
    categories: [
      { id: 'web', name: 'Web (XSS, SQLi, CSRF)' },
      { id: 'passwords', name: 'Passwords' },
      { id: 'networks', name: 'Networks' },
    ],
    cards: [
      { id: 'web-01', category: 'web', difficulty: 2 },
      { id: 'web-02', category: 'web', difficulty: 3 },
      { id: 'web-03', category: 'web', difficulty: 1 },
      { id: 'pw-01', category: 'passwords', difficulty: 1 },
      { id: 'pw-02', category: 'passwords', difficulty: 2 },
    ],
    progress: {
      'web-01': { correct: true },
      'web-02': { correct: false },
      'pw-01': { correct: true },
      'pw-02': { correct: true },
      'ghost-01': { correct: true },
    },
    ...extra,
  };
}

function draw(extra) {
  const c = newContainer();
  mod.renderScore(c, data(extra));
  return c;
}

const row = (c, id) => Array.from(c.querySelectorAll('tr')).find((tr) => tr.getAttribute('data-category') === id);
const total = (c) => Array.from(c.querySelectorAll('tr')).find((tr) => tr.hasAttribute('data-total'));
const cell = (tr, name) => tr?.querySelector(`[${name}]`);
const text = (n) => (n ? n.textContent.trim() : null);

if (typeof mod?.renderScore === 'function') {
  test('draws a table with an h1', () => {
    const c = draw();
    assert.ok(c.querySelector('table'), 'missing the <table>');
    assert.ok(c.querySelector('h1'), 'missing the <h1> "Score"');
    assert.equal(text(c.querySelector('h1')), 'Score');
  });

  test('one row per category, in the order received', () => {
    const c = draw();
    const ids = Array.from(c.querySelectorAll('tr')).map((tr) => tr.getAttribute('data-category')).filter(Boolean);
    assert.deepEqual(ids, ['web', 'passwords', 'networks']);
    assert.ok(text(row(c, 'passwords')).includes('Passwords'), 'each row shows the category name');
  });

  test('points = difficulty x 10 per solved card', () => {
    const c = draw();
    assert.equal(text(cell(row(c, 'web'), 'data-points')), '20');
    assert.equal(text(cell(row(c, 'passwords'), 'data-points')), '30');
    assert.equal(text(cell(row(c, 'networks'), 'data-points')), '0');
  });

  test('solved: "X of Y" per category', () => {
    const c = draw();
    assert.equal(text(cell(row(c, 'web'), 'data-solved')), '1 of 3');
    assert.equal(text(cell(row(c, 'passwords'), 'data-solved')), '2 of 2');
    assert.equal(text(cell(row(c, 'networks'), 'data-solved')), '0 of 0');
  });

  test('total row', () => {
    const c = draw();
    const t = total(c);
    assert.ok(t, 'missing the <tr data-total> row');
    assert.equal(text(cell(t, 'data-points')), '50');
    assert.equal(text(cell(t, 'data-solved')), '3 of 5');
    assert.ok(text(t).includes('Total'));
  });

  test('numbers use the "number" class (tabular-nums in the CSS)', () => {
    const c = draw();
    for (const n of [cell(row(c, 'web'), 'data-points'), cell(row(c, 'web'), 'data-solved'), cell(total(c), 'data-points')]) {
      assert.ok(n.classList.contains('number'), 'each number cell has class="number"');
    }
  });

  test('only correct === true counts; progress of unknown cards is ignored', () => {
    const c = draw({ progress: { 'web-01': { correct: 'yes' }, 'web-03': { correct: true }, 'x-01': { correct: true } } });
    assert.equal(text(cell(row(c, 'web'), 'data-points')), '10');
    assert.equal(text(cell(total(c), 'data-points')), '10');
    assert.equal(text(cell(total(c), 'data-solved')), '1 of 5');
  });

  test('no progress: everything at zero', () => {
    const c = draw({ progress: {} });
    assert.equal(text(cell(total(c), 'data-points')), '0');
    assert.equal(text(cell(total(c), 'data-solved')), '0 of 5');
  });

  test('summary with the total points and the maximum possible', () => {
    const c = draw();
    const r = c.querySelector('[data-summary]');
    assert.ok(r, 'missing the element with data-summary');
    assert.ok(text(r).includes('50 points'), `expected "50 points" in ${JSON.stringify(text(r))}`);
    assert.ok(text(r).includes('90'), `the maximum possible (90) must show up in ${JSON.stringify(text(r))}`);
  });

  test('the text from the data never becomes HTML', () => {
    const bad = '<img src=x onerror=alert(1)>';
    const c = draw({ categories: [{ id: 'web', name: bad }] });
    assert.equal(c.querySelector('img'), null, 'created an <img> from the text');
    assert.ok(text(row(c, 'web')).includes(bad));
  });

  test('drawing again replaces the previous content', () => {
    const c = newContainer();
    mod.renderScore(c, data());
    mod.renderScore(c, data());
    assert.equal(c.querySelectorAll('table').length, 1, 'there are two tables');
  });

  test('safe source', async () => {
    const src = await readSource('./score.js', import.meta.url);
    assert.deepEqual(securityProblems(src), []);
    const code = stripStringsAndComments(src);
    assert.ok(!/\bdocument\b|\bwindow\b/.test(code), 'use container.ownerDocument, never document or window');
    assert.ok(!/\bfetch\s*\(|\blocalStorage\b|\bsessionStorage\b|\bimport\s*\(/.test(code), 'no fetch, storage or dynamic import()');
    for (const m of src.matchAll(/^\s*import\s[^'"]*['"]([^'"]+)['"]/gm)) {
      assert.match(m[1], /^\.\.\/(templates|lib)\/[\w-]+\.js$/, `import not allowed: ${m[1]}`);
    }
    assert.match(src, /from\s+['"]\.\.\/templates\/common\.js['"]/, 'use h() from ../templates/common.js');
  });
}
