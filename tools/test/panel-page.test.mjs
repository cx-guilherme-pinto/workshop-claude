// The live panel page (panel/public/, docs/pt/WORKSHOP-V2-SPEC.md, sections 6.1 and 6.2) without a browser:
// strict CSP (no inline scripts or styles, no HTML from strings, no eval), relative imports only, the same text
// keys in pt and en, projector legibility in the CSS (text 24px or more, short animations, none with reduced
// motion or ?lite=1), the URL options, the leaderboard by person (D-34: the main element of every view, ranked by the
// aggregate's points, never by spend, hidden names as "—"), and the local server serving every file the page needs
// under its CSP.
// The screenshots (a real browser) are tools/record/panel-screenshots.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { MISSIONS, PHASES } from '../../panel/aggregate.mjs';
import { startServer } from '../../panel/server.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PUB = join(ROOT, 'panel', 'public');
const read = (f) => readFileSync(join(PUB, f), 'utf8');
const HTML = read('index.html');
const JS = read('panel.js');
const CSS = read('panel.css');
const page = await import(pathToFileURL(join(PUB, 'panel.js')).href);

test('the page files and the font (with its licence) are there', () => {
  for (const f of ['index.html', 'panel.js', 'panel.css', 'fonts/bricolage-grotesque-latin.woff2', 'fonts/bricolage-grotesque-latin-ext.woff2', 'fonts/OFL.txt']) assert.ok(existsSync(join(PUB, f)), f);
});

test('index.html: no inline script, no inline style, no event handler attributes, only relative URLs', () => {
  const scripts = [...HTML.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
  assert.ok(scripts.length >= 1);
  for (const [, attrs, body] of scripts) {
    assert.match(attrs, /\bsrc="[^"]+"/, 'every script has a src');
    assert.equal(body.trim(), '', 'no inline script');
  }
  assert.doesNotMatch(HTML, /<style\b/i);
  assert.doesNotMatch(HTML, /\sstyle\s*=/i);
  assert.doesNotMatch(HTML, /\son[a-z]+\s*=/i);
  assert.doesNotMatch(HTML, /javascript:/i);
  for (const [, url] of HTML.matchAll(/\b(?:src|href)="([^"]+)"/g)) assert.doesNotMatch(url, /^(?:[a-z]+:|\/\/|\/)/i, `${url} is relative`);
});

test('panel.js: no HTML from strings, no eval, no inline styles', () => {
  for (const bad of [/\.innerHTML\b/, /\.outerHTML\b/, /insertAdjacentHTML/, /document\.write/, /\beval\s*\(/, /new\s+Function\b/, /setAttribute\(\s*['"]style['"]/, /\.style\.cssText/, /setTimeout\(\s*['"`]/, /setInterval\(\s*['"`]/, /javascript:/i, /\.style\s*=/]) {
    assert.doesNotMatch(JS, bad, String(bad));
  }
  // styles only through CSSOM custom properties
  for (const m of JS.matchAll(/\.style\.(\w+)/g)) assert.equal(m[1], 'setProperty', m[0]);
});

test('panel.js: every import is relative and no URL points outside the origin (except the API from config.json)', () => {
  const specs = [...JS.matchAll(/\bimport\s*(?:[\w{}\s,*]+from\s*)?['"]([^'"]+)['"]/g), ...JS.matchAll(/\bimport\(\s*['"`]([^'"`]+)['"`]\s*\)/g)].map((m) => m[1]);
  assert.ok(specs.includes('./aggregate.mjs'), 'the replay imports the aggregate');
  for (const s of specs) assert.match(s, /^\.\.?\//, `${s} is relative`);
  const urls = [...JS.matchAll(/['"`](https?:\/\/[^'"`]*)['"`]/g)].map((m) => m[1]);
  assert.deepEqual(urls, ['http://www.w3.org/2000/svg']);
  for (const m of JS.matchAll(/fetch\(\s*([^,)]+)/g)) assert.match(m[1].trim(), /^(?:'(?:config|allowlist)\.json'|`replays\/|`\$\{S\.api\})/, `fetch(${m[1]})`);
});

test('panel.js: the admin token comes only from the fragment and goes to sessionStorage', () => {
  assert.match(JS, /location\.hash/);
  assert.match(JS, /sessionStorage\.setItem/);
  assert.match(JS, /history\.replaceState/);
  assert.doesNotMatch(JS, /get\(\s*['"]admin['"]\s*\)/, 'never from the query string');
  assert.doesNotMatch(JS, /localStorage/);
  assert.match(JS, /'X-Admin-Token': admin/);
});

function keys(o, p = '') {
  return Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' ? keys(v, `${p}${k}.`) : [`${p}${k}`]));
}
const at = (o, path) => path.split('.').reduce((x, k) => x[k], o);

test('the texts: the same keys in pt and en, no empty text, the same {placeholders}', () => {
  const { TEXT } = page;
  assert.deepEqual(Object.keys(TEXT).sort(), ['en', 'pt']);
  const kp = keys(TEXT.pt).sort();
  assert.deepEqual(kp, keys(TEXT.en).sort());
  const marks = (s) => [...new Set(s.match(/\{\w+\}/g) || [])].sort().join();
  for (const k of kp) {
    for (const l of ['pt', 'en']) assert.ok(typeof at(TEXT[l], k) === 'string' && at(TEXT[l], k).trim(), `${l}.${k}`);
    assert.equal(marks(at(TEXT.pt, k)), marks(at(TEXT.en, k)), k);
  }
  // every view and every mission in the grid has a name; the views are the aggregate's phases
  assert.deepEqual(page.VIEWS, PHASES);
  for (const l of ['pt', 'en']) {
    assert.deepEqual(Object.keys(TEXT[l].views), PHASES);
    for (const m of MISSIONS) assert.ok(TEXT[l].missionNames[m], `${l} ${m}`);
  }
  // every t('key') used in panel.js exists
  for (const m of JS.matchAll(/\bt\(\s*'([\w.]+)'/g)) assert.ok(kp.includes(m[1]), m[1]);
  // the leaderboard's texts (D-34), and a name for every stage it can show
  for (const k of ['boardHead', 'boardNote', 'boardEmpty', 'boardPeople', 'namesHead', 'namesEmpty', 'registeredHead', 'readyHead', 'noStage', 'noName']) assert.ok(kp.includes(k), k);
  for (const l of ['pt', 'en']) {
    for (const s of page.P1_STAGES) assert.ok(TEXT[l].p1Stages[s], `${l} p1 ${s}`);
    for (const s of page.P2_STAGES) assert.ok(TEXT[l].p2Stages[s], `${l} p2 ${s}`);
  }
  // the leaderboard is by points, never by spend: no text puts cost or money next to it
  for (const k of kp.filter((x) => /^board/.test(x))) for (const l of ['pt', 'en']) assert.doesNotMatch(at(TEXT[l], k), /cust|cost|US\$/i, k);
});

// The source of one top-level function of panel.js.
function source(name) {
  const i = JS.indexOf(`function ${name}(`);
  assert.ok(i >= 0, name);
  return JS.slice(i, JS.indexOf('\n}\n', i));
}

test('panel.js: the leaderboard (D-34) is the main element of every view, ranked by the aggregate, never by spend', () => {
  // every view builds the leaderboard (or, at the Opening, the list of registered names) as its .main element
  for (const v of ['missions', 'p1', 'p2', 'closing']) {
    const body = JS.slice(JS.indexOf(`view.${v} = `), JS.indexOf('\n};\n', JS.indexOf(`view.${v} = `)));
    assert.match(body, /boardBlock\(root, ctx, \{ mode: '(missions|p1|p2|points)'/, v);
  }
  assert.match(JS.slice(JS.indexOf('view.opening = ')), /section\(root, null, 'main names'\)/);
  assert.match(source('boardBlock'), /`main board/);
  // the rows come from state.board as the aggregate sorted them: the page neither sorts them nor reads any cost
  const board = source('boardBlock');
  assert.match(board, /state\.board\?\.\[ctx\.focus \|\| 'all'\]/);
  assert.doesNotMatch(board, /\.sort\(|cost/);
  // ?room filters; there is no room-vs-room comparison any more
  assert.doesNotMatch(JS, /roomRows|ctx\.other/);
  // names: "name" (not the old "nickname"), "—" when hidden, H + click posts {name} to /admin/hide
  assert.doesNotMatch(JS, /nickname/);
  assert.match(source('nameEl'), /'—'/);
  assert.match(JS, /post\('\/admin\/hide', \{ name, on: true \}\)/);
  // ranks 1 to 3 are highlighted through a class (tokens in the CSS), never a medal or an emoji
  assert.match(board, /podium/);
  assert.match(CSS, /\.brow\.podium\s*\{[^}]*var\(--accent\)/);
  assert.doesNotMatch(JS + CSS, /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
});

test('the stages of the leaderboard are the ones the aggregate writes', async () => {
  const { Aggregate } = await import('../../panel/aggregate.mjs');
  const { simulate } = await import('../../panel/simulate.mjs');
  const events = simulate({ people: 60, start: Date.parse('2026-11-20T09:00:00Z'), registrations: true });
  const agg = new Aggregate();
  const seen = { p1: new Set(), p2: new Set() };
  for (const [i, e] of events.entries()) {
    agg.apply(e);
    if (i % 200) continue;
    for (const r of agg.state(Date.parse(e.t)).board.all.top) {
      seen.p1.add(r.p1);
      seen.p2.add(r.p2);
    }
  }
  for (const s of seen.p1) assert.ok(s === null || page.P1_STAGES.includes(s), `p1 ${s}`);
  for (const s of seen.p2) assert.ok(s === null || page.P2_STAGES.includes(s), `p2 ${s}`);
  assert.ok(seen.p1.has('approved') && seen.p2.has('approved'));
  assert.equal(page.stageStep(page.P1_STAGES, null), 0);
  assert.equal(page.stageStep(page.P1_STAGES, 'approved'), page.P1_STAGES.length);
  assert.equal(page.stageStep(page.P2_STAGES, 'intake'), 1);
});

test('the Opening\'s names: the first state keeps the leaderboard order, a later name goes on top, hidden ones never', () => {
  const row = (name, room = 'A') => ({ rank: 1, name, room, points: 0, missions: [], p1: null, p2: null });
  const seen = new Map();
  let n = page.trackNames(seen, { board: { all: { top: [row('Ana'), row('Rui', 'B'), row(null)] }, A: { top: [row('Ana')] }, B: { top: [row('Rui', 'B')] } } }, 0);
  const order = () => [...seen].sort((a, b) => b[1].seq - a[1].seq).map(([k]) => k);
  assert.deepEqual(order(), ['Ana', 'Rui']);
  n = page.trackNames(seen, { board: { all: { top: [row('Ana'), row('Rui', 'B'), row('Zé', 'B')] } } }, n);
  assert.deepEqual(order(), ['Zé', 'Ana', 'Rui']);
  assert.equal(seen.get('Zé').room, 'B');
  assert.equal(page.trackNames(seen, null, n), n, 'a broken state changes nothing');
});

test('the URL options: language, room (with the pt aliases), lite, replay, speed and start minute', () => {
  const o = page.readOptions;
  assert.equal(o('', 'pt-BR').lang, 'pt');
  assert.equal(o('', 'pt').lang, 'pt');
  assert.equal(o('', 'en-US').lang, 'en');
  assert.equal(o('', 'fr-FR').lang, 'en');
  assert.equal(o('?lang=en', 'pt-PT').lang, 'en');
  assert.equal(o('?lang=pt', 'en').lang, 'pt');
  assert.equal(o('?room=A', 'en').room, 'A');
  assert.equal(o('?room=b', 'en').room, 'B');
  assert.equal(o('?sala=A', 'en').room, 'A');
  assert.equal(o('?room=all', 'en').room, null);
  assert.equal(o('?sala=todas', 'en').room, null);
  assert.equal(o('', 'en').room, null);
  assert.equal(o('?lite=1', 'en').lite, true);
  assert.equal(o('', 'en').replay, null);
  assert.deepEqual([o('?replay=simulated&x=10&at=40', 'en').replay, o('?replay=simulated&x=10', 'en').x, o('?replay=simulated&at=40', 'en').at], ['simulated', 10, 40]);
  assert.equal(o('?replay=simulated', 'en').x, 1);
  assert.equal(o('?replay=../../etc/passwd', 'en').replay, '', 'a bad name never reaches fetch');
  assert.equal(o('?replay=a&x=-3', 'en').x, 1);
});

function declarations(css, prop) {
  return [...css.matchAll(new RegExp(`(?:^|[;{\\s])${prop}\\s*:\\s*([^;}]+)`, 'g'))].map((m) => m[1].trim());
}
const vars = Object.fromEntries([...CSS.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
const px = (v) => {
  const r = /^var\((--[\w-]+)\)$/.exec(v);
  if (r) return px(vars[r[1]]);
  const m = /^([\d.]+)(px|rem)$/.exec(v);
  return m ? Number(m[1]) * (m[2] === 'rem' ? 16 : 1) : null;
};
const ms = (v) => {
  const r = /^var\((--[\w-]+)\)$/.exec(v);
  if (r) return ms(vars[r[1]]);
  const m = /^([\d.]+)(ms|s)$/.exec(v);
  return m ? Number(m[1]) * (m[2] === 's' ? 1000 : 1) : null;
};

test('panel.css: text 24px or more, main numbers 64px or more, the /status dark theme, the local font', () => {
  const sizes = declarations(CSS, 'font-size');
  assert.ok(sizes.length > 5);
  for (const s of sizes) {
    if (s === 'inherit') continue;
    const v = px(s);
    assert.ok(v !== null && v >= 24, `font-size: ${s}`);
  }
  assert.ok(px('var(--t-num)') >= 64);
  assert.ok(px('var(--t-huge)') >= 64);
  assert.match(CSS, /\.num\s*\{[^}]*font-size:\s*var\(--t-num\)/);
  const statusCss = readFileSync(join(ROOT, 'demo-project', 'public', 'styles.css'), 'utf8');
  const dark = /:root\[data-theme='dark'\]\s*\{([^}]*)\}/.exec(statusCss)[1];
  for (const k of ['--bg', '--surface', '--surface-2', '--ink', '--muted', '--accent', '--status-gray', '--status-yellow', '--status-green', '--status-red']) {
    assert.equal(vars[k], new RegExp(`${k}:\\s*([^;]+);`).exec(dark)[1].trim(), k);
  }
  assert.match(CSS, /font-family:\s*'Bricolage Grotesque'/);
  for (const [, u] of CSS.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)) {
    assert.doesNotMatch(u, /^(?:[a-z]+:|\/)/i, `${u} is relative`);
    assert.ok(existsSync(join(PUB, u)), u);
  }
  assert.doesNotMatch(CSS, /@import/);
});

test('panel.css: animations of 400 ms at most, only transform and opacity, none with reduced motion or ?lite=1', () => {
  const trans = declarations(CSS, 'transition').filter((v) => v !== 'none !important');
  assert.ok(trans.length >= 1);
  for (const tr of trans) {
    for (const part of tr.split(',')) {
      const [prop, dur] = part.trim().split(/\s+/);
      assert.ok(['transform', 'opacity'].includes(prop), `transition of ${prop}`);
      assert.ok(ms(dur) !== null && ms(dur) <= 400, `transition ${part}`);
    }
  }
  assert.doesNotMatch(CSS, /@keyframes/);
  assert.match(CSS, /@media \(prefers-reduced-motion: reduce\)\s*\{[^}]*transition: none !important/);
  assert.match(CSS, /\.lite \*[^{]*\{[^}]*transition: none !important/);
});

test('the local server serves the page, its modules and the replay under the strict CSP', async () => {
  const data = mkdtempSync(join(tmpdir(), 'ws-panel-page-'));
  const s = await startServer({ port: 0, data, ws: 'test', adminToken: '' });
  try {
    for (const [path, type] of [
      ['/', 'text/html'],
      ['/panel.js', 'text/javascript'],
      ['/panel.css', 'text/css'],
      ['/fonts/bricolage-grotesque-latin.woff2', 'font/woff2'],
      ['/aggregate.mjs', 'text/javascript'],
      ['/schema.mjs', 'text/javascript'],
      ['/allowlist.json', 'application/json'],
      ['/replays/simulated.jsonl', 'application/x-ndjson'],
    ]) {
      const r = await fetch(`${s.url}${path}`);
      assert.equal(r.status, 200, path);
      assert.ok(r.headers.get('content-type').startsWith(type), `${path}: ${r.headers.get('content-type')}`);
      const csp = r.headers.get('content-security-policy');
      assert.match(csp, /script-src 'self'/, path);
      assert.match(csp, /style-src 'self'/, path);
      assert.doesNotMatch(csp, /unsafe-inline|unsafe-eval/, path);
      await r.arrayBuffer();
    }
    // config.json is optional: absent means the API on the same origin
    assert.equal((await fetch(`${s.url}/config.json`)).status, 404);
    const st = await (await fetch(`${s.url}/state`)).json();
    assert.equal(st.v, 1);
    assert.deepEqual(st.missions, MISSIONS);
  } finally {
    await s.close();
    rmSync(data, { recursive: true, force: true });
  }
});
