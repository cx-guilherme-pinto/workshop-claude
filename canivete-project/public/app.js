// The Pocketknife shell: the grid of tools by category, the search, the panel of each tool and "Run tests".
// Hash routes: #/  and  #/tool/<id>. The tools (tools/<id>/tool.js) are written by the swarm in wave 1 and show up
// live; the search and the categories come from pages/catalog.js (wave 2), once its test passes (finder.js).
import { el, replay, TOOL_ID } from './dom.js';
import { TEMPLATE_NAME, decimal } from './formats.js';
import { loadFinder, SIMPLE } from './finder.js';
import { runTestFile } from './testrun.js';
import { loadTool, renderToolPage } from './tool-view.js';
import { T } from '/lib/texts.js';

const A = T.app;
const TITLE = T.name;
const main = document.getElementById('content');

const state = {
  data: { mode: null, categories: [], tools: [], pages: {}, my_tool: null, signature: null },
  loaded: false,
  error: null,
  route: null,
  step: 0, // changes on every draw, to ignore old import() answers
  query: '',
  finder: { impl: SIMPLE, source: 'simple', note: null, version: undefined },
  view: 'state', // color of the tiles: 'state' (built, being written…) or 'tests'
  tests: new Map(), // id -> { status, passed, total, failures, ms }
  running: false,
  summary: null, // last summary of the tests
  testedSignature: null,
  run: 0,
  tiles: new Map(), // id -> { li, tool }
  page: null, // the open tool: { id, version, handle }
};

// ---------- data ----------

async function fetchTools() {
  const r = await fetch('/api/tools', { cache: 'no-store' });
  if (!r.ok) throw new Error(A.apiFailed(r.status));
  const d = await r.json();
  return {
    mode: d.mode ?? null,
    categories: Array.isArray(d.categories) ? d.categories : [],
    tools: Array.isArray(d.tools) ? d.tools.filter((t) => TOOL_ID.test(String(t.id))) : [],
    pages: d.pages || {},
    my_tool: d.my_tool || null,
    signature: d.signature ?? null,
  };
}

// With a plan, the tools of the plan; with no plan, all of them. The ones that exist always show up.
function visible() {
  const { mode, tools } = state.data;
  return tools.filter((t) => t.built || !mode || t.in_plan);
}

const findTool = (id) => state.data.tools.find((t) => t.id === id) || null;

// The search source: pages/catalog.js once its test passes, the simple search before that.
async function refreshFinder() {
  const page = state.data.pages?.catalog;
  const version = page?.version ?? null;
  if (state.finder.version === version && state.finder.testVersion === page?.test) return false;
  const f = await loadFinder(page);
  state.finder = { ...f, version, testVersion: page?.test };
  return true;
}

// ---------- tile status ----------

// The color of a tile: built (usable), being written by an agent, its test failed, or still to build.
function tileStatus(t) {
  if (t.built) return t.state === 'red' || t.state === 'failed' ? 'ready-red' : 'ready';
  if (t.state === 'working') return 'working';
  if (t.state === 'red') return 'red';
  if (t.state === 'failed') return 'failed';
  return 'not_built';
}

const STATUS_TEXT = {
  ready: A.toolStatus.ready,
  'ready-red': A.toolStatus.readyRed,
  not_built: A.toolStatus.not_built,
  working: A.toolStatus.working,
  red: A.toolStatus.red,
  failed: A.toolStatus.failed,
};

// ---------- routes ----------

function currentRoute() {
  const h = location.hash;
  if (!h.startsWith('#/')) return { name: 'home' };
  const parts = h.slice(2).split('/').filter(Boolean);
  if (!parts.length) return { name: 'home' };
  if (parts.length === 2 && parts[0] === 'tool' && TOOL_ID.test(parts[1])) return { name: 'tool', id: parts[1] };
  return { name: 'not_found' };
}

function title(t) {
  document.title = t ? `${t} · ${TITLE}` : TITLE;
}

async function draw({ live = false } = {}) {
  const route = currentRoute();
  const routeChanged = !live;
  state.route = route;
  const step = ++state.step;
  if (!state.loaded) {
    main.replaceChildren(noServerView());
    return;
  }
  const y = window.scrollY;
  if (route.name === 'home') homeView();
  else if (route.name === 'tool') await toolView(route.id, step, { live });
  else notFoundView();
  if (routeChanged) {
    window.scrollTo(0, 0);
    if (route.name !== 'home') main.focus({ preventScroll: true });
  } else {
    window.scrollTo(0, y);
  }
}

const outdated = (step) => step !== state.step;

// ---------- home ----------

function scoreboardItem(label, value) {
  return el('div', { class: 'scoreboard-item' }, el('dt', { text: label }), el('dd', { class: 'number', text: String(value) }));
}

let searchInput = null;
let gallery = null;
let resultsNote = null;
let scoreboard = null;

function homeView() {
  title(null);
  state.page = null;
  const f = state.finder.impl;
  const list = visible();
  const s = f.summary(list);

  searchInput = el('input', {
    class: 'search-input', id: 'search', type: 'search', name: 'q', autocomplete: 'off', spellcheck: 'false',
    placeholder: A.searchPlaceholder, 'aria-describedby': 'search-note',
    on: { input: () => setQuery(searchInput.value), keydown: (ev) => { if (ev.key === 'Escape' && searchInput.value) { ev.preventDefault(); searchInput.value = ''; setQuery(''); } } },
  });
  searchInput.value = state.query;
  resultsNote = el('p', { class: 'note search-note', id: 'search-note', attrs: { 'aria-live': 'polite' } });
  scoreboard = el('dl', { class: 'scoreboard' },
    scoreboardItem(A.ready, A.xOfY(s.built, s.total)),
    scoreboardItem(A.toBuild, String(s.to_build)));

  const intro = el('section', { class: 'intro' },
    el('h1', { class: 'intro-title', text: TITLE }),
    el('p', { class: 'intro-text', text: A.intro }),
    scoreboard,
    el('div', { class: 'intro-actions' },
      el('button', { class: 'button button-primary', type: 'button', id: 'run-tests', disabled: state.running, on: { click: () => runTests() } }, state.running ? runningButtonText() : A.runTests)),
    el('div', { class: 'tests-area', id: 'tests-area', attrs: { 'aria-live': 'polite' } }, testsBand()),
  );

  const search = el('section', { class: 'search', attrs: { 'aria-label': A.searchLabel } },
    el('label', { class: 'search-label', for: 'search', text: A.searchLabel }),
    searchInput,
    resultsNote,
    state.finder.note ? el('p', { class: 'note search-source', 'data-source': state.finder.source, text: state.finder.note }) : null,
    state.data.my_tool?.file && !state.data.my_tool.ok ? el('p', { class: 'notice-error', text: A.myToolProblems }) : null,
  );

  gallery = el('div', { class: 'gallery', 'data-view': state.view });
  main.replaceChildren(intro, search, gallery);
  drawGallery();
}

function setQuery(q) {
  state.query = q;
  drawGallery();
}

function drawGallery() {
  if (!gallery) return;
  const f = state.finder.impl;
  const list = visible();
  const found = f.search(list, state.query);
  const groups = f.byCategory(found, state.data.categories);
  state.tiles.clear();
  gallery.dataset.view = state.view;
  const q = state.query.trim();
  resultsNote.textContent = q ? (found.length ? A.searchCount(found.length, list.length) : A.searchNone(q)) : '';
  if (!list.length) {
    gallery.replaceChildren(el('section', { class: 'empty' }, el('h2', { class: 'section-title', text: A.noTools }), el('p', { text: A.noToolsText })));
    return;
  }
  gallery.replaceChildren(...groups.map((g) => el('section', { class: 'category-block', attrs: { 'aria-labelledby': `cat-${g.id}` } },
    el('header', { class: 'category-block-header' },
      el('h2', { class: 'section-title', id: `cat-${g.id}`, text: g.name }),
      el('p', { class: 'note', text: A.categoryNote(g.built, g.tools.length) })),
    el('ul', { class: 'tiles', role: 'list' }, ...g.tools.map(tile)))));
}

function tileText(t, test) {
  if (state.view === 'tests' && test) {
    if (test.status === 'running') return A.runningTests;
    if (test.status === 'queued') return A.queued;
    return A.testsPass(test.passed, test.total);
  }
  return STATUS_TEXT[tileStatus(t)];
}

function failureText(t, test) {
  const f = state.view === 'tests' ? test?.failures?.[0] : null;
  if (!f) return '';
  return !t.built ? A.noToolJs : shortFailure(f, t.id);
}

function tile(t) {
  const test = state.tests.get(t.id);
  const meta = [TEMPLATE_NAME[t.template] ?? t.template, t.id].filter(Boolean).join(' · ');
  const li = el('li', { class: 'tile-item', 'data-tool': t.id, 'data-status': tileStatus(t), 'data-test': test?.status });
  li.append(el('a', { class: 'tile', href: `#/tool/${t.id}` },
    el('span', { class: 'tile-title', text: t.title }),
    el('span', { class: 'tile-meta', text: t.mine ? `${A.mine} · ${meta}` : meta }),
    el('span', { class: 'tile-status', text: tileText(t, test) }),
    el('span', { class: 'tile-failure', text: failureText(t, test) })));
  state.tiles.set(t.id, { li, tool: t });
  return li;
}

function paintTile(id) {
  const x = state.tiles.get(id);
  if (!x || !x.li.isConnected) return;
  const test = state.tests.get(id);
  const before = x.li.dataset.test;
  if (test) x.li.dataset.test = test.status;
  else delete x.li.dataset.test;
  if (state.view === 'tests' && before !== x.li.dataset.test) replay(x.li.querySelector('.tile'), 'changed');
  x.li.querySelector('.tile-status').textContent = tileText(x.tool, test);
  x.li.querySelector('.tile-failure').textContent = failureText(x.tool, test);
}

function setView(v) {
  if (state.view === v) return;
  state.view = v;
  if (gallery) gallery.dataset.view = v;
  for (const id of state.tiles.keys()) paintTile(id);
  updateBand();
}

// ---------- running the tests in the browser ----------

// "nm-01: example 2: expected ..." becomes "example 2: expected ...".
function shortFailure(f, id) {
  const name = id && String(f.name).startsWith(`${id}: `) ? String(f.name).slice(id.length + 2) : String(f.name);
  const msg = String(f.error || '').replace(/\s+/g, ' ').trim();
  const short = msg.length > 140 ? `${msg.slice(0, 139)}…` : msg;
  return short ? `${name}: ${short}` : name;
}

function failureList(failed) {
  const missing = failed.filter((x) => x.failures[0] && !findTool(x.id)?.built).map((x) => x.id);
  const others = failed.filter((x) => !missing.includes(x.id));
  const lines = [];
  if (missing.length) {
    const ids = missing.slice(0, 8).join(', ') + (missing.length > 8 ? A.andMore(missing.length - 8) : '');
    lines.push(A.missingToolJs(missing.length, ids));
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
  const verdict = running ? A.verdictRunning(r.done, r.total) : r.total === 0 ? A.noTests : A.toolsPassTests(r.passed, r.total);
  const detail = running ? A.detailRunning : A.detailDone(r.tests, durationText(r.ms));
  const failures = running ? [] : failureList(r.failed);
  const viewButtons = ['state', 'tests'].map((v) =>
    el('button', { class: 'segmented-option', type: 'button', attrs: { 'aria-pressed': state.view === v ? 'true' : 'false' }, on: { click: () => setView(v) } },
      v === 'tests' ? A.viewTests : A.viewState));
  return el('div', { class: 'band', 'data-status': running ? 'running' : r.passed === r.total && r.total ? 'passed' : 'failed' },
    el('p', { class: 'band-verdict number', text: verdict }),
    el('div', { class: 'band-body' },
      el('p', { class: 'number', text: detail }),
      failures.length ? el('ul', { class: 'band-list', role: 'list' }, ...failures.map((line) => el('li', { text: line }))) : null,
      r.warning ? el('p', { class: 'note', text: r.warning }) : null,
      el('div', { class: 'segmented', role: 'group', attrs: { 'aria-label': A.tileColor } },
        el('span', { class: 'note', text: A.tileColorLabel }), ...viewButtons)));
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

function canReloadToTest() {
  try {
    sessionStorage.setItem('canivete:run-tests', '1');
    return true;
  } catch {
    return false;
  }
}

async function runTests() {
  if (state.running) return;
  state.running = true;
  try {
    state.data = await fetchTools();
  } catch {
    /* keep the list there was */
  }
  // The browser keeps the modules it already imported (the tests import ./tool.js): if a tool changed since the
  // last run, only a fresh page tests the new version.
  if (state.testedSignature && state.testedSignature !== state.data.signature && canReloadToTest()) {
    location.reload();
    return;
  }
  const changed = state.testedSignature && state.testedSignature !== state.data.signature;
  state.testedSignature ??= state.data.signature;
  const target = visible().filter((t) => t.test);
  state.tests = new Map(target.map((t) => [t.id, { status: 'queued', passed: 0, total: 0, failures: [] }]));
  state.summary = { status: 'running', done: 0, total: target.length, passed: 0, tests: 0, ms: 0, failed: [], warning: changed ? A.newTools : null };
  state.view = 'tests';
  if (state.route?.name !== 'home') location.hash = '#/';
  else homeView();
  const start = performance.now();
  for (const t of target) {
    state.tests.set(t.id, { status: 'running', passed: 0, total: 0, failures: [] });
    paintTile(t.id);
    const r = await runTestFile(`/tools/${t.id}/tool.test.js?run=${++state.run}`);
    state.tests.set(t.id, r);
    state.summary.done++;
    state.summary.tests += r.total;
    if (r.status === 'passed') state.summary.passed++;
    else state.summary.failed.push({ id: t.id, failures: r.failures });
    state.summary.ms = performance.now() - start;
    paintTile(t.id);
    updateBand();
  }
  state.summary.status = 'done';
  state.running = false;
  updateBand();
}

// ---------- a tool ----------

async function toolView(id, step, { live }) {
  const meta = findTool(id);
  if (!meta) return notFoundView();
  title(meta.title);
  const same = state.page && state.page.id === id;
  if (live && same && state.page.version === meta.version && state.page.built === meta.built && state.page.state === meta.state) return;
  const keep = same ? state.page.handle?.values() : null;
  const wasBuilt = same && state.page.built;
  let tool = null;
  let loadError = null;
  if (meta.built) {
    try {
      tool = await loadTool(meta);
    } catch (e) {
      loadError = e;
    }
  }
  if (outdated(step)) return;
  const container = main;
  const handle = renderToolPage(container, meta, { tool, loadError, keep, notice: live && wasBuilt && meta.built ? T.tool.reloaded : null });
  state.page = { id, version: meta.version, built: meta.built, state: meta.state, handle };
}

// ---------- other views ----------

function notice(titleText, text) {
  return el('div', { class: 'notice' },
    el('h1', { class: 'section-title', text: titleText }),
    text ? el('p', { text }) : null,
    el('a', { class: 'button', href: '#/' }, A.back));
}

function notFoundView() {
  title(A.notFound);
  state.page = null;
  main.replaceChildren(notice(A.notFoundTitle, A.notFoundText));
}

function noServerView() {
  title(null);
  return el('section', { class: 'notice' },
    el('h1', { class: 'section-title', text: A.noServer }),
    el('p', { text: A.noServerText }),
    state.error ? el('p', { class: 'note', text: String(state.error.message || state.error) }) : null);
}

// ---------- live: the grid fills up while the swarm works ----------

function visibleSignature(d) {
  return JSON.stringify([d.mode, d.my_tool, d.tools.map((t) => [t.id, t.title, t.built, t.version, t.in_plan, t.state])]);
}

let scheduled = null;
async function refresh() {
  try {
    const fresh = await fetchTools();
    const before = visibleSignature(state.data);
    state.data = fresh;
    const finderChanged = await refreshFinder();
    if (state.running) return;
    const r = state.route?.name;
    if (r === 'home' && (finderChanged || visibleSignature(fresh) !== before)) {
      // Keep the focus and the caret in the search box while the grid changes under it.
      const typing = document.activeElement === searchInput;
      const caret = typing ? searchInput.selectionStart : null;
      homeView();
      if (typing) {
        searchInput.focus({ preventScroll: true });
        searchInput.setSelectionRange(caret, caret);
      }
    } else if (r === 'tool' && visibleSignature(fresh) !== before) {
      draw({ live: true });
    }
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

// "/" goes to the search box (like on many sites), unless the person is typing somewhere.
function wireKeys() {
  document.addEventListener('keydown', (ev) => {
    if (ev.key !== '/' || ev.metaKey || ev.ctrlKey || ev.altKey) return;
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (state.route?.name !== 'home' || !searchInput) return;
    ev.preventDefault();
    searchInput.focus();
  });
}

// ---------- start ----------

async function boot() {
  let runOnOpen = false;
  try {
    runOnOpen = sessionStorage.getItem('canivete:run-tests') === '1';
    sessionStorage.removeItem('canivete:run-tests');
  } catch {
    runOnOpen = false;
  }
  window.addEventListener('hashchange', () => {
    if (!location.hash || location.hash.startsWith('#/')) draw();
  });
  wireKeys();
  try {
    state.data = await fetchTools();
    state.loaded = true;
    await refreshFinder();
  } catch (e) {
    state.error = e;
  }
  await draw({ live: true });
  if (!state.loaded) return;
  goLive();
  if (runOnOpen && state.route?.name === 'home') runTests();
}

boot();
