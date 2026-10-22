// The live panel page (panel/public/, docs/pt/WORKSHOP-V2-SPEC.md, sections 6.1 and 6.2) without a browser:
// strict CSP (no inline scripts or styles, no HTML from strings, no eval), relative imports only, the same text
// keys in pt and en, projector legibility in the CSS (text 24px or more, short animations, none with reduced
// motion or ?lite=1), the URL options, the leaderboard by person (D-34: the main element of every view, ranked by the
// aggregate's points, never by spend, hidden names as "—"; one board for everybody, no rooms), and the local server serving every file the page needs
// under its CSP.
// The screenshots (a real browser) are tools/record/panel-screenshots.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
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
  // 'auto' is a stored phase the server resolves into one of the views, never a view of its own
  const shown = PHASES.filter((p) => p !== 'auto');
  assert.deepEqual(page.VIEWS, shown);
  for (const l of ['pt', 'en']) {
    assert.deepEqual(Object.keys(TEXT[l].views), shown);
    for (const m of MISSIONS) assert.ok(TEXT[l].missionNames[m], `${l} ${m}`);
  }
  // every t('key') used in panel.js exists
  for (const m of JS.matchAll(/\bt\(\s*'([\w.]+)'/g)) assert.ok(kp.includes(m[1]), m[1]);
  // the leaderboard's texts (D-34), and a name for every stage it can show
  for (const k of ['viewAuto', 'viewAutoLocal', 'boardHead', 'boardNote', 'boardEmpty', 'boardPeople', 'namesHead', 'namesEmpty', 'registeredHead', 'readyHead', 'noStage', 'noName']) assert.ok(kp.includes(k), k);
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
  assert.match(board, /state\.board \|\| \{\}/);
  assert.doesNotMatch(board, /\.sort\(|cost/);
  // one board for everybody (D-34): no rooms at all, no filter, no room-vs-room comparison
  assert.doesNotMatch(JS, /roomRows|ctx\.other|ctx\.focus|feed_rooms|state\.rooms|room-tag|roomName|ROOMS|get\('(?:room|sala)'\)/);
  assert.doesNotMatch(CSS, /room-tag/);
  assert.match(JS, /s\.v !== 1 \|\| !s\.summary\) return/);
  for (const l of ['pt', 'en']) for (const k of keys(page.TEXT[l])) assert.doesNotMatch(at(page.TEXT[l], k), /\bsalas?\b|\brooms?\b/i, `${l}.${k}`);
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
    for (const r of agg.state(Date.parse(e.t)).board.top) {
      seen.p1.add(r.p1);
      seen.p2.add(r.p2);
    }
  }
  for (const s of seen.p1) assert.ok(s === null || page.P1_STAGES.includes(s), `p1 ${s}`);
  for (const s of seen.p2) assert.ok(s === null || page.P2_STAGES.includes(s), `p2 ${s}`);
  assert.ok(seen.p1.has('approved') && seen.p2.has('approved'));
  // the shape the page reads (one board, one summary, one feed, one list of registrations; no rooms)
  const st = agg.state(Date.parse(events.at(-1).t));
  assert.ok(st.summary && st.board && Array.isArray(st.board.top) && Array.isArray(st.feed) && st.registrations && Array.isArray(st.registrations.recent));
  assert.ok(!('rooms' in st) && !('feed_rooms' in st));
  assert.equal(page.stageStep(page.P1_STAGES, null), 0);
  assert.equal(page.stageStep(page.P1_STAGES, 'approved'), page.P1_STAGES.length);
  assert.equal(page.stageStep(page.P2_STAGES, 'intake'), 1);
});

test('the Opening\'s names: the first state keeps the leaderboard order, a later name goes on top, hidden ones never', () => {
  const row = (name) => ({ rank: 1, name, points: 0, missions: [], p1: null, p2: null });
  const seen = new Map();
  let n = page.trackNames(seen, { board: { people: 3, top: [row('Ana'), row('Rui'), row(null)] } }, 0);
  const order = () => [...seen].sort((a, b) => b[1].seq - a[1].seq).map(([k]) => k);
  assert.deepEqual(order(), ['Ana', 'Rui']);
  n = page.trackNames(seen, { board: { people: 3, top: [row('Ana'), row('Rui'), row('Zé')] } }, n);
  assert.deepEqual(order(), ['Zé', 'Ana', 'Rui']);
  assert.equal(page.trackNames(seen, null, n), n, 'a broken state changes nothing');
  assert.equal(page.trackNames(seen, { board: { all: { top: [row('Old')] } } }, n), n, 'the old per-room shape changes nothing');
});

test('the URL options: language, lite, replay, speed and start minute (an old ?room= is ignored)', () => {
  const o = page.readOptions;
  assert.equal(o('', 'pt-BR').lang, 'pt');
  assert.equal(o('', 'pt').lang, 'pt');
  assert.equal(o('', 'en-US').lang, 'en');
  assert.equal(o('', 'fr-FR').lang, 'en');
  assert.equal(o('?lang=en', 'pt-PT').lang, 'en');
  assert.equal(o('?lang=pt', 'en').lang, 'pt');
  for (const q of ['?room=A', '?sala=B', '?room=all']) {
    assert.ok(!('room' in o(q, 'en')), q);
    assert.deepEqual(o(`${q}&lang=pt&x=2`, 'en'), o('?lang=pt&x=2', 'en'), q);
  }
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

// WCAG contrast of two #rrggbb colours (an rgba() or color-mix() is not a token and is checked by eye in the screenshots).
const lum = (hex) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const contrast = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};

test('panel.css: text 24px or more, main numbers 64px or more, the Checkmarx light tokens, the local font', () => {
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
  // the palette of slides/build-v2.mjs (COR), a darker yellow for the light background
  const COR = { '--bg': '#f4effe', '--surface': '#ffffff', '--surface-2': '#ebdafa', '--ink': '#140920', '--muted': '#4a405a', '--accent': '#6b34fd', '--status-green': '#1e9e57', '--status-red': '#d2463f' };
  for (const [k, v] of Object.entries(COR)) assert.equal(vars[k], v, k);
  const slides = readFileSync(join(ROOT, 'slides', 'build-v2.mjs'), 'utf8');
  for (const [k, n] of [['--bg', 'bg'], ['--surface', 'surface'], ['--ink', 'ink'], ['--muted', 'muted'], ['--accent', 'accent'], ['--status-green', 'verde'], ['--status-red', 'vermelho']]) {
    assert.match(slides, new RegExp(`${n}:\\s*'${vars[k].slice(1)}'`, 'i'), `${k} is the slides' ${n}`);
  }
  assert.match(CSS, /color-scheme:\s*light/);
  assert.match(CSS, /font-family:\s*'Bricolage Grotesque'/);
  for (const [, u] of CSS.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)) {
    assert.doesNotMatch(u, /^(?:[a-z]+:|\/)/i, `${u} is relative`);
    assert.ok(existsSync(join(PUB, u)), u);
  }
  assert.doesNotMatch(CSS, /@import/);
  assert.ok(existsSync(join(PUB, 'logo.png')) && existsSync(join(PUB, 'wave.png')));
  assert.ok(statSync(join(PUB, 'wave.png')).size < 60_000, 'the wave strip stays a few tens of KB');
});

test('panel.css: contrast AA, text 4.5:1 and UI elements 3:1, computed from the tokens', () => {
  const on = (bgs, fg, min, what) => {
    for (const bg of bgs) assert.ok(contrast(vars[fg], vars[bg]) >= min, `${what}: ${fg} on ${bg} is ${contrast(vars[fg], vars[bg]).toFixed(2)}`);
  };
  // text
  on(['--bg', '--surface', '--surface-2'], '--ink', 4.5, 'ink');
  on(['--bg', '--surface', '--surface-2'], '--muted', 4.5, 'muted');
  on(['--bg', '--surface'], '--status-yellow', 4.5, 'yellow text');
  on(['--bg', '--surface'], '--attention', 3, 'attention (large text only)');
  on(['--accent'], '--accent-ink', 4.5, 'text on the podium');
  on(['--ink'], '--accent-ink', 4.5, 'toast');
  on(['--bg', '--surface'], '--accent', 4.5, 'violet text');
  // UI elements: the dots of the scatter, the fills, the squares of the podium
  for (const k of ['--par-4', '--par-8', '--par-12', '--status-green', '--status-red', '--accent', '--attention']) on(['--bg', '--surface'], k, 3, 'UI');
  assert.ok(contrast(vars['--ink'], '#d2ecdc') >= 4.5, 'text on the green fill');
  // the three scatter colours differ from each other and from the status colours
  const par = ['--par-4', '--par-8', '--par-12'].map((k) => vars[k]);
  assert.equal(new Set(par).size, 3);
  for (const k of ['--status-green', '--status-yellow', '--status-red']) assert.ok(!par.includes(vars[k]), k);
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
      ['/logo.png', 'image/png'],
      ['/wave.png', 'image/png'],
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
