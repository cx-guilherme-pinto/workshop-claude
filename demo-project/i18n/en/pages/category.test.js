// Pre-written test for the category-page task (see specs/category-page.md).
// Runs in Node with the fake DOM from lib/fakedom.js: node --test pages/category.test.js
import { test, assert, readSource, newContainer } from '../lib/testkit.js';
import { securityProblems, stripStringsAndComments } from '../lib/security.js';

let mod = null;
let importError = null;
try {
  mod = await import('./category.js');
} catch (e) {
  importError = e;
}

test('pages/category.js exists and exports renderCategory', () => {
  assert.ok(mod, `pages/category.js does not exist or has an error: ${importError?.message ?? ''}`);
  assert.equal(typeof mod.renderCategory, 'function', 'missing export function renderCategory(container, data)');
});

function data(extra = {}) {
  const opened = [];
  return {
    opened,
    args: {
      category: { id: 'web', name: 'Web (XSS, SQLi, CSRF)' },
      cards: [
        { id: 'web-01', title: 'Find the SQL injection', difficulty: 1, template: 'spot-the-flaw', status: 'playable' },
        { id: 'web-02', title: 'Is this link safe?', difficulty: 2, template: 'choice', status: 'playable' },
        { id: 'web-03', title: 'Order the CSRF defense', difficulty: 2, template: 'order', status: 'playable' },
        { id: 'web-04', title: 'Escape the HTML', difficulty: 3, template: 'answer', status: 'not_built' },
      ],
      progress: { 'web-01': { correct: true }, 'web-02': { correct: false }, 'web-04': { correct: true }, 'other-99': { correct: true } },
      open: (id) => opened.push(id),
      ...extra,
    },
  };
}

function draw(extra) {
  const c = newContainer();
  const d = data(extra);
  mod.renderCategory(c, d.args);
  return { c, ...d };
}

const items = (c) => Array.from(c.querySelectorAll('li'));

if (typeof mod?.renderCategory === 'function') {
  test('shows the category name in an h1', () => {
    const { c } = draw();
    const h1 = c.querySelector('h1');
    assert.ok(h1, 'missing an <h1> with the category name');
    assert.equal(h1.textContent.trim(), 'Web (XSS, SQLi, CSRF)');
  });

  test('one <li data-card> per card, in the order received', () => {
    const { c } = draw();
    const ids = items(c).map((li) => li.getAttribute('data-card'));
    assert.deepEqual(ids, ['web-01', 'web-02', 'web-03', 'web-04']);
    assert.ok(c.querySelector('ul'), 'the cards go in a <ul> list');
  });

  test('each card shows the title, the level and the points', () => {
    const { c } = draw();
    const [a, b, , d] = items(c);
    assert.ok(a.textContent.includes('Find the SQL injection'), 'missing the title');
    assert.ok(a.textContent.includes('Level 1'), 'missing "Level 1"');
    assert.ok(a.textContent.includes('10 points'), 'missing "10 points"');
    assert.ok(b.textContent.includes('Level 2') && b.textContent.includes('20 points'));
    assert.ok(d.textContent.includes('Level 3') && d.textContent.includes('30 points'));
  });

  test('data-status: solved, wrong, not_played and not_built', () => {
    const { c } = draw();
    const states = items(c).map((li) => li.getAttribute('data-status'));
    assert.deepEqual(states, ['solved', 'wrong', 'not_played', 'not_built'], 'not_built always wins over progress');
  });

  test('the status text of each card', () => {
    const { c } = draw();
    const texts = items(c).map((li) => li.querySelector('.tile-status')?.textContent.trim());
    assert.deepEqual(texts, ['Solved', 'Wrong, try again', 'Not played', 'Not built yet']);
  });

  test('clicking a playable card calls open(id)', () => {
    const { c, opened } = draw();
    const b = items(c)[2].querySelector('button');
    assert.ok(b, 'each playable card is a <button>');
    assert.equal(b.getAttribute('type'), 'button');
    assert.equal(b.getAttribute('data-open'), 'web-03');
    b.click();
    assert.deepEqual(opened, ['web-03']);
  });

  test('a card not built yet is disabled and does not call open', () => {
    const { c, opened } = draw();
    const b = items(c)[3].querySelector('button');
    if (b) {
      assert.ok(b.hasAttribute('disabled') || b.disabled === true, 'the button of a card not built yet must have disabled');
      b.disabled = false; // even if the browser let the click through, it must not open
      b.click();
    }
    assert.deepEqual(opened, []);
  });

  test('summary: solved cards and points of the category', () => {
    const { c } = draw();
    const r = c.querySelector('[data-summary]');
    assert.ok(r, 'missing the element with data-summary');
    assert.ok(r.textContent.includes('1 of 4 solved'), `expected "1 of 4 solved" in ${JSON.stringify(r.textContent)}`);
    assert.ok(r.textContent.includes('10 points'), `expected "10 points" in ${JSON.stringify(r.textContent)}`);
  });

  test('only correct === true counts as solved', () => {
    const { c } = draw({ progress: { 'web-01': { correct: 'yes' }, 'web-02': {} } });
    const states = items(c).map((li) => li.getAttribute('data-status'));
    assert.deepEqual(states, ['wrong', 'wrong', 'not_played', 'not_built']);
    assert.ok(c.querySelector('[data-summary]').textContent.includes('0 of 4 solved'));
  });

  test('category with no cards: a message instead of the list', () => {
    const { c } = draw({ cards: [] });
    assert.equal(items(c).length, 0);
    assert.ok(c.textContent.includes('No cards in this category yet.'), 'missing the empty list message');
  });

  test('the text from the data never becomes HTML', () => {
    const bad = '<img src=x onerror=alert(1)>';
    const { c } = draw({
      category: { id: 'web', name: bad },
      cards: [{ id: 'web-09', title: bad, difficulty: 1, template: 'choice', status: 'playable' }],
    });
    assert.equal(c.querySelector('img'), null, 'created an <img> from the text');
    assert.equal(c.querySelector('h1').textContent.trim(), bad);
    assert.ok(items(c)[0].textContent.includes(bad));
  });

  test('drawing again replaces the previous content', () => {
    const c = newContainer();
    const d = data();
    mod.renderCategory(c, d.args);
    mod.renderCategory(c, d.args);
    assert.equal(items(c).length, 4, 'the cards were repeated');
    assert.equal(c.querySelectorAll('h1').length, 1);
  });

  test('marks the section with the category', () => {
    const { c } = draw();
    const s = c.querySelector('[data-category]');
    assert.ok(s, 'missing <section class="category" data-category="...">');
    assert.equal(s.getAttribute('data-category'), 'web');
    assert.ok(s.classList.contains('category'));
  });

  test('safe source', async () => {
    const src = await readSource('./category.js', import.meta.url);
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
