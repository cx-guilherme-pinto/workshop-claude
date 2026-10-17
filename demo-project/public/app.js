// The Security Arena gallery: home, category, card, score and "Run tests".
// Hash routes: #/  #/category/<id>  #/card/<id>  #/score  (the older #/categoria, #/cartao and #/pontuacao still work)
// The category and score pages (pages/*.js) are built by the swarm in wave 2:
// they are imported dynamically and, until they exist, a notice shows up.
import { el, replay, VALID_ID } from './dom.js';
import { TEMPLATE_NAME, decimal } from './formats.js';
import { readProgress, deleteProgress, pointsFor } from './progress.js';
import { loadCard, mountGame } from './play.js';
import { T } from '/lib/texts.js';

const A = T.app;
const TITLE = T.name;
const main = document.getElementById('content');

const state = {
  data: { mode: null, categories: [], cards: [], pages: {}, signature: null },
  loaded: false,
  error: null,
  route: null,
  step: 0, // changes on every draw, to ignore old import() answers
  view: 'progress', // color of the cards on the home page: 'progress' or 'tests'
  tests: new Map(), // id -> { status, passed, total, failures, ms }
  running: false,
  summary: null, // last summary of the tests
  testedSignature: null,
  run: 0,
  tiles: new Map(), // id -> <li> on the home page
};

// ---------- data ----------

async function fetchCards() {
  const r = await fetch('/api/cards', { cache: 'no-store' });
  if (!r.ok) throw new Error(A.apiFailed(r.status));
  const d = await r.json();
  return {
    mode: d.mode ?? null,
    categories: Array.isArray(d.categories) ? d.categories : [],
    cards: Array.isArray(d.cards) ? d.cards.filter((c) => VALID_ID.test(String(c.id))) : [],
    pages: d.pages || {},
    signature: d.signature ?? null,
  };
}

// With a plan, it shows the cards of the plan; with no plan, the participant mode ones. The ones that exist always show up.
function visible() {
  const { mode, cards } = state.data;
  return cards.filter((c) => c.exists || (mode ? c.in_plan : c.mode === 'participant'));
}

function group(list) {
  const cats = state.data.categories.map((c) => ({ id: c.id, name: c.name, cards: list.filter((x) => x.category === c.id) }));
  const known = new Set(cats.map((c) => c.id));
  const other = list.filter((x) => !known.has(x.category));
  if (other.length) cats.push({ id: 'other', name: A.other, cards: other, extra: true });
  return cats.filter((c) => c.cards.length);
}

function progressStatus(c, progress) {
  if (!c.exists) return 'not_built';
  const p = progress[c.id];
  if (!p) return 'not_played';
  return p.correct ? 'solved' : 'wrong';
}

const STATUS_TEXT = A.cardStatus;

// ---------- routes ----------

const ROUTE_ALIASES = { categoria: 'category', cartao: 'card', pontuacao: 'score' };

function currentRoute() {
  const h = location.hash;
  if (!h.startsWith('#/')) return { name: 'home' };
  const parts = h.slice(2).split('/').filter(Boolean).map((p, i) => (i === 0 ? ROUTE_ALIASES[p] ?? p : p));
  if (!parts.length) return { name: 'home' };
  if (parts.length === 1 && parts[0] === 'score') return { name: 'score' };
  if (parts.length === 2 && parts[0] === 'category' && VALID_ID.test(parts[1])) return { name: 'category', id: parts[1] };
  if (parts.length === 2 && parts[0] === 'card' && VALID_ID.test(parts[1])) return { name: 'card', id: parts[1] };
  return { name: 'not_found' };
}

function markNav(route) {
  const current = route.name === 'score' ? 'score' : 'home';
  for (const a of document.querySelectorAll('[data-nav]')) {
    if (a.dataset.nav === current) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }
}

function title(t) {
  document.title = t ? `${t} · ${TITLE}` : TITLE;
}

async function draw({ live = false } = {}) {
  const route = currentRoute();
  const routeChanged = !live;
  state.route = route;
  const step = ++state.step;
  markNav(route);
  if (!state.loaded) {
    main.replaceChildren(noServerView());
    return;
  }
  const y = window.scrollY;
  if (route.name === 'home') homeView();
  else if (route.name === 'category') await categoryView(route.id, step);
  else if (route.name === 'card') await cardView(route.id, step);
  else if (route.name === 'score') await scoreView(step);
  else notFoundView();
  if (routeChanged) {
    window.scrollTo(0, 0);
    main.focus({ preventScroll: true });
  } else {
    window.scrollTo(0, y);
  }
}

const outdated = (step) => step !== state.step;

// ---------- home ----------

function scoreboardItem(label, value) {
  return el('div', { class: 'scoreboard-item' }, el('dt', { text: label }), el('dd', { class: 'number', text: String(value) }));
}

function homeView() {
  title(null);
  const list = visible();
  const progress = readProgress();
  const built = list.filter((c) => c.exists);
  const solved = built.filter((c) => progress[c.id]?.correct);
  const points = solved.reduce((s, c) => s + pointsFor(c.difficulty), 0);
  state.tiles.clear();

  const intro = el('section', { class: 'intro' },
    el('h1', { class: 'intro-title', text: TITLE }),
    el('p', { class: 'intro-text', text: A.intro }),
    el('dl', { class: 'scoreboard' },
      scoreboardItem(A.points, points),
      scoreboardItem(A.solved, A.xOfY(solved.length, built.length)),
      scoreboardItem(A.built, A.xOfY(built.length, list.length)),
    ),
    el('div', { class: 'intro-actions' },
      el('button', { class: 'button button-primary', type: 'button', id: 'run-tests', on: { click: () => runTests() } }, state.running ? runningButtonText() : A.runTests),
      el('a', { class: 'button', href: '#/score' }, A.seeScore),
    ),
    el('div', { class: 'tests-area', id: 'tests-area', attrs: { 'aria-live': 'polite' } }, testsBand()),
  );
  if (state.running) intro.querySelector('#run-tests').disabled = true;

  const groups = group(list);
  const blocks = groups.map((cat) => {
    const done = cat.cards.filter((c) => c.exists).length;
    const ok = cat.cards.filter((c) => progress[c.id]?.correct).length;
    return el('section', { class: 'category-block', attrs: { 'aria-labelledby': `cat-${cat.id}` } },
      el('header', { class: 'category-block-header' },
        el('h2', { class: 'section-title', id: `cat-${cat.id}`, text: cat.name }),
        el('p', { class: 'note', text: A.categoryNote(done, cat.cards.length, ok) }),
        cat.extra ? null : el('a', { class: 'link', href: `#/category/${cat.id}` }, A.openCategory),
      ),
      el('ul', { class: 'tiles', role: 'list' }, ...cat.cards.map((c) => tile(c, progress))),
    );
  });

  const body = groups.length
    ? el('div', { class: 'gallery', 'data-view': state.view }, ...blocks)
    : el('section', { class: 'empty' },
      el('h2', { class: 'section-title', text: A.noCards }),
      el('p', { text: A.noCardsText }));

  main.replaceChildren(intro, body);
}

function tileText(c, st, test) {
  if (state.view === 'tests' && test) {
    if (test.status === 'running') return A.runningTests;
    if (test.status === 'queued') return A.queued;
    return A.testsPass(test.passed, test.total);
  }
  return STATUS_TEXT[st];
}

function failureText(id, test) {
  const f = state.view === 'tests' ? test?.failures?.[0] : null;
  if (!f) return '';
  return missingCard(id) ? A.noCardJs : shortFailure(f, id);
}

function tile(c, progress) {
  const st = progressStatus(c, progress);
  const meta = [c.difficulty ? A.level(c.difficulty) : null, TEMPLATE_NAME[c.template] ?? null].filter(Boolean).join(' · ');
  const test = state.tests.get(c.id);
  const li = el('li', { class: 'tile-item', 'data-card': c.id, 'data-status': st, 'data-test': test?.status });
  const parts = [
    el('span', { class: 'tile-title', text: c.title }),
    el('span', { class: 'tile-meta', text: meta || c.id }),
    el('span', { class: 'tile-status', text: tileText(c, st, test) }),
    el('span', { class: 'tile-failure', text: failureText(c.id, test) }),
  ];
  li.append(c.exists ? el('a', { class: 'tile', href: `#/card/${c.id}` }, ...parts) : el('div', { class: 'tile' }, ...parts));
  state.tiles.set(c.id, { li, card: c, st });
  return li;
}

function paintTile(id) {
  const t = state.tiles.get(id);
  if (!t || !t.li.isConnected) return;
  const test = state.tests.get(id);
  const before = t.li.dataset.test;
  if (test) t.li.dataset.test = test.status;
  else delete t.li.dataset.test;
  if (state.view === 'tests' && before !== t.li.dataset.test) replay(t.li.querySelector('.tile'), 'changed');
  t.li.querySelector('.tile-status').textContent = tileText(t.card, t.st, test);
  t.li.querySelector('.tile-failure').textContent = failureText(id, test);
}

function setView(v) {
  if (state.view === v) return;
  state.view = v;
  const g = main.querySelector('.gallery');
  if (g) g.dataset.view = v;
  for (const id of state.tiles.keys()) paintTile(id);
  const area = document.getElementById('tests-area');
  if (area) area.replaceChildren(testsBand());
}

// ---------- running the tests in the browser ----------

// "pw-01: card.js exists and loads: cards/pw-01/card.js does not exist..." becomes "card.js exists and loads: ...".
function shortFailure(f, id) {
  const name = id && String(f.name).startsWith(`${id}: `) ? String(f.name).slice(id.length + 2) : String(f.name);
  const msg = String(f.error || '').replace(/\s+/g, ' ').trim();
  const short = msg.length > 140 ? `${msg.slice(0, 139)}…` : msg;
  return short ? `${name}: ${short}` : name;
}

// A card whose test failed because its card.js does not exist yet (the server says so in /api/cards).
const missingCard = (id) => !state.data.cards.find((c) => c.id === id)?.exists;

function failureList(failed) {
  const missing = failed.filter((x) => x.failures[0] && missingCard(x.id)).map((x) => x.id);
  const others = failed.filter((x) => !missing.includes(x.id));
  const lines = [];
  if (missing.length) {
    const ids = missing.slice(0, 8).join(', ') + (missing.length > 8 ? A.andMore(missing.length - 8) : '');
    lines.push(A.missingCardJs(missing.length, ids));
  }
  for (const x of others.slice(0, 5)) lines.push(`${x.id}: ${x.failures[0] ? shortFailure(x.failures[0], x.id) : A.failed}`);
  if (others.length > 5) lines.push(A.moreWithFailures(others.length - 5));
  return lines;
}

function durationText(ms) {
  return ms < 1000 ? `${Math.max(1, Math.round(ms))} ms` : `${decimal((ms / 1000).toFixed(1))} s`;
}

function runningButtonText() {
  const r = state.summary;
  return r ? A.runningN(r.done, r.total) : A.running;
}

function testsBand() {
  const r = state.summary;
  if (!r) return null;
  const running = r.status === 'running';
  const verdict = running
    ? A.verdictRunning(r.done, r.total)
    : r.total === 0
      ? A.noTests
      : A.cardsPassTests(r.passed, r.total);
  const detail = running
    ? A.detailRunning
    : A.detailDone(r.tests, durationText(r.ms));
  const failures = running ? [] : failureList(r.failed);
  const viewButtons = ['progress', 'tests'].map((v) =>
    el('button', { class: 'segmented-option', type: 'button', attrs: { 'aria-pressed': state.view === v ? 'true' : 'false' }, on: { click: () => setView(v) } },
      v === 'tests' ? A.viewTests : A.viewProgress));
  return el('div', { class: 'band', 'data-status': running ? 'running' : r.passed === r.total && r.total ? 'passed' : 'failed' },
    el('p', { class: 'band-verdict number', text: verdict }),
    el('div', { class: 'band-body' },
      el('p', { class: 'number', text: detail }),
      failures.length ? el('ul', { class: 'band-list', role: 'list' }, ...failures.map((line) => el('li', { text: line }))) : null,
      r.warning ? el('p', { class: 'note', text: r.warning }) : null,
      el('div', { class: 'segmented', role: 'group', attrs: { 'aria-label': A.cardColor } },
        el('span', { class: 'note', text: A.cardColorLabel }), ...viewButtons),
    ),
  );
}

function updateBand() {
  const area = document.getElementById('tests-area');
  if (area) area.replaceChildren(testsBand());
  const b = document.getElementById('run-tests');
  if (b) {
    b.disabled = state.running;
    b.textContent = state.running ? runningButtonText() : A.runTests;
  }
}

function withTimeout(p, ms, msg) {
  let t;
  return Promise.race([p, new Promise((_, rej) => (t = setTimeout(() => rej(new Error(msg)), ms)))]).finally(() => clearTimeout(t));
}

// Runs one card.test.js: the browser testkit (lib/testkit-browser.js) collects the results in
// globalThis.__arenaResults and the promises in __arenaPending. They are emptied in place
// (the testkit keeps the reference) before each file.
async function runFile(c) {
  const results = (globalThis.__arenaResults ||= []);
  const pending = (globalThis.__arenaPending ||= []);
  results.length = 0;
  pending.length = 0;
  const before = new Set(document.body.children);
  const start = performance.now();
  try {
    await withTimeout(import(`/cards/${c.id}/card.test.js?run=${++state.run}`), 15000, A.slowToLoad);
    let n = -1;
    while (n !== pending.length) {
      n = pending.length;
      await withTimeout(Promise.allSettled([...pending]), 15000, A.slow);
    }
  } catch (e) {
    results.push({ name: A.loadTest, ok: false, error: String(e?.message || e) });
  } finally {
    for (const child of [...document.body.children]) if (!before.has(child)) child.remove();
  }
  const list = results.slice();
  const failures = list.filter((x) => !x.ok);
  return {
    status: list.length && !failures.length ? 'passed' : 'failed',
    passed: list.length - failures.length,
    total: list.length,
    failures,
    ms: performance.now() - start,
  };
}

function canReloadToTest() {
  try {
    sessionStorage.setItem('arena:run-tests', '1');
    return true;
  } catch {
    return false;
  }
}

async function runTests() {
  if (state.running) return;
  if (state.route?.name !== 'home') location.hash = '#/';
  state.running = true;
  try {
    state.data = await fetchCards();
  } catch {
    /* keep the list there was */
  }
  // The browser keeps the modules it already imported: if a card changed since the last test run,
  // only a fresh page tests the new version.
  if (state.testedSignature && state.testedSignature !== state.data.signature && canReloadToTest()) {
    location.reload();
    return;
  }
  const changed = state.testedSignature && state.testedSignature !== state.data.signature;
  state.testedSignature ??= state.data.signature;
  const target = visible().filter((c) => c.test);
  state.tests = new Map(target.map((c) => [c.id, { status: 'queued', passed: 0, total: 0, failures: [] }]));
  state.summary = { status: 'running', done: 0, total: target.length, passed: 0, tests: 0, ms: 0, failed: [], warning: changed ? A.newCards : null };
  state.view = 'tests';
  draw({ live: true });
  const start = performance.now();
  for (const c of target) {
    state.tests.set(c.id, { status: 'running', passed: 0, total: 0, failures: [] });
    paintTile(c.id);
    const r = await runFile(c);
    state.tests.set(c.id, r);
    state.summary.done++;
    state.summary.tests += r.total;
    if (r.status === 'passed') state.summary.passed++;
    else state.summary.failed.push({ id: c.id, failures: r.failures });
    state.summary.ms = performance.now() - start;
    paintTile(c.id);
    updateBand();
  }
  state.summary.status = 'done';
  state.running = false;
  updateBand();
}

// ---------- wave 2 pages ----------

const PAGE = {
  category: { name: A.categoryPage, file: 'pages/category.js', spec: 'specs/category-page.md' },
  score: { name: A.scorePage, file: 'pages/score.js', spec: 'specs/score-table.md' },
};

async function importPage(name) {
  const v = state.data.pages?.[name];
  if (!v) return null;
  try {
    return await import(`/pages/${name}.js?v=${encodeURIComponent(v)}`);
  } catch (e) {
    return { importError: e };
  }
}

function notBuilt(container, name, error) {
  const p = PAGE[name];
  document.title = `${A.notBuiltDoc} · ${TITLE}`;
  container.replaceChildren(
    el('div', { class: 'not-built' },
      el('h1', { class: 'not-built-title', text: A.notBuiltTitle }),
      el('p', { class: 'not-built-wave', text: A.wave2 }),
      el('p', { class: 'not-built-text', text: A.notBuiltText(p.name, p.file, p.spec) }),
      error ? el('p', { class: 'note', text: A.fileWithError(String(error?.message || error).slice(0, 300)) }) : null,
      el('a', { class: 'button', href: '#/' }, A.back),
    ),
  );
}

async function categoryView(id, step) {
  const groups = group(visible());
  const cat = groups.find((c) => c.id === id) || state.data.categories.find((c) => c.id === id);
  if (!cat) return notFoundView();
  title(cat.name);
  const container = el('section', { class: 'page' });
  main.replaceChildren(container);
  const mod = await importPage('category');
  if (outdated(step)) return;
  if (typeof mod?.renderCategory !== 'function') return notBuilt(container, 'category', mod?.importError);
  const cards = (cat.cards || []).map((c) => ({
    id: c.id,
    title: c.title,
    difficulty: c.difficulty,
    template: c.template,
    status: c.exists ? 'playable' : 'not_built',
  }));
  try {
    mod.renderCategory(container, {
      category: { id: cat.id, name: cat.name },
      cards,
      progress: readProgress(),
      open: (cid) => {
        if (VALID_ID.test(String(cid))) location.hash = `#/card/${cid}`;
      },
    });
  } catch (e) {
    notBuilt(container, 'category', e);
  }
}

async function scoreView(step) {
  title(A.score);
  const list = visible();
  const container = el('section', { class: 'page' });
  main.replaceChildren(container);
  const mod = await importPage('score');
  if (outdated(step)) return;
  if (typeof mod?.renderScore !== 'function') return notBuilt(container, 'score', mod?.importError);
  try {
    mod.renderScore(container, {
      categories: group(list).map((c) => ({ id: c.id, name: c.name })),
      cards: list.filter((c) => c.exists).map((c) => ({ id: c.id, category: c.category ?? 'other', difficulty: c.difficulty })),
      progress: readProgress(),
    });
  } catch (e) {
    notBuilt(container, 'score', e);
  }
}

// ---------- playing a card ----------

function nextUnsolved(id) {
  const list = visible().filter((c) => c.exists);
  const prog = readProgress();
  const i = list.findIndex((c) => c.id === id);
  const after = [...list.slice(i + 1), ...list.slice(0, Math.max(i, 0))];
  return after.find((c) => !prog[c.id]?.correct) || null;
}

function notice(titleText, text) {
  return el('div', { class: 'notice' },
    el('h1', { class: 'section-title', text: titleText }),
    text ? el('p', { text }) : null,
    el('a', { class: 'button', href: '#/' }, A.back));
}

async function cardView(id, step) {
  const meta = state.data.cards.find((c) => c.id === id);
  if (!meta) return notFoundView();
  const cat = state.data.categories.find((c) => c.id === meta.category);
  title(meta.title);
  const info = [cat?.name, meta.difficulty ? A.level(meta.difficulty) : null, meta.difficulty ? A.nPoints(pointsFor(meta.difficulty)) : null].filter(Boolean).join(' · ');
  const area = el('div', { class: 'play-area' });
  main.replaceChildren(
    el('section', { class: 'play' },
      area,
      el('div', { class: 'play-footer' }, el('p', { class: 'note', text: info }), el('a', { class: 'link', href: '#/' }, A.all))),
  );
  if (!meta.exists) {
    area.replaceChildren(notice(A.cardNotBuilt, A.cardNotBuiltText));
    return;
  }
  let card;
  try {
    card = await loadCard(id, meta.version);
  } catch (e) {
    if (!outdated(step)) area.replaceChildren(notice(A.cardDidNotLoad, String(e?.message || e)));
    return;
  }
  if (outdated(step)) return;
  title(card.title);
  mountGame(area, card, {
    actions: ({ correct, retry }) => {
      const next = nextUnsolved(id);
      const goNext = (primary) => (next
        ? el('a', { class: primary ? 'button button-primary' : 'button', href: `#/card/${next.id}` }, A.next)
        : el('a', { class: primary ? 'button button-primary' : 'button', href: '#/score' }, A.seeScore));
      if (correct) return [goNext(true), el('a', { class: 'button', href: '#/' }, A.all)];
      return [el('button', { class: 'button button-primary', type: 'button', on: { click: () => retry() } }, A.tryAgain), goNext(false)];
    },
  });
}

// ---------- other views ----------

function notFoundView() {
  title(A.notFound);
  main.replaceChildren(notice(A.notFoundTitle, A.notFoundText));
}

function noServerView() {
  title(null);
  return el('section', { class: 'notice' },
    el('h1', { class: 'section-title', text: A.noServer }),
    el('p', { text: A.noServerText }),
    state.error ? el('p', { class: 'note', text: String(state.error.message || state.error) }) : null);
}

// ---------- footer ----------

function wireFooter() {
  const b = document.getElementById('delete-progress');
  if (!b) return;
  let armed = null;
  b.addEventListener('click', () => {
    if (!armed) {
      b.textContent = A.confirmDelete;
      armed = setTimeout(() => {
        armed = null;
        b.textContent = A.deleteProgress;
      }, 4000);
      return;
    }
    clearTimeout(armed);
    armed = null;
    deleteProgress();
    b.textContent = A.progressDeleted;
    setTimeout(() => (b.textContent = A.deleteProgress), 2500);
    if (state.route?.name !== 'card') draw({ live: true });
  });
}

// ---------- live: the gallery fills up while the swarm works ----------

function visibleSignature(d) {
  return JSON.stringify([d.mode, d.pages, d.cards.map((c) => [c.id, c.exists, c.version, c.in_plan])]);
}

let scheduled = null;
async function refresh() {
  try {
    const fresh = await fetchCards();
    const before = visibleSignature(state.data);
    state.data = fresh;
    const r = state.route?.name;
    if (visibleSignature(fresh) !== before && !state.running && (r === 'home' || r === 'category' || r === 'score')) draw({ live: true });
  } catch {
    /* server down: try again on the next notice */
  }
}
function scheduleRefresh() {
  clearTimeout(scheduled);
  scheduled = setTimeout(refresh, 400);
}

function goLive() {
  if ('EventSource' in window) {
    const es = new EventSource('/api/events');
    es.addEventListener('snapshot', scheduleRefresh);
  }
  setInterval(refresh, 15000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') scheduleRefresh();
  });
}

// ---------- start ----------

async function boot() {
  let runOnOpen = false;
  try {
    runOnOpen = sessionStorage.getItem('arena:run-tests') === '1';
    sessionStorage.removeItem('arena:run-tests');
  } catch {
    runOnOpen = false;
  }
  window.addEventListener('hashchange', () => {
    if (!location.hash || location.hash.startsWith('#/')) draw();
  });
  wireFooter();
  try {
    state.data = await fetchCards();
    state.loaded = true;
  } catch (e) {
    state.error = e;
  }
  await draw({ live: true });
  if (!state.loaded) return;
  goLive();
  if (runOnOpen && state.route?.name === 'home') runTests();
}

boot();
