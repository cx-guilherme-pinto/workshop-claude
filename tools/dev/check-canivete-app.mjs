#!/usr/bin/env node
// Proves that the Pocketknife works end to end, on an assembled copy:
//   1. tools/dev/check-canivete.mjs --keep assembles the project (pt, or i18n/<lang>/ on top), generates the specs and
//      the tests, adds the reference tools (dev/solutions/canivete) and runs the tool tests;
//   2. adds the reference search page (dev/solutions/canivete/pages/catalog.js) and the kit engine in tools/workshop/
//      (hooks, orchestrator, statusline and pricing.json, without their tests and without hooks/telemetry.mjs, the
//      same as installer/assemble-demo.mjs does for the Arena);
//   3. runs node --test on the whole project and node tools/check-integration.mjs;
//   4. starts node server.js on a free port and checks /, /api/tools, /status, /api/replay/example and refused paths.
// With --screenshots, it then adds "your tool" (a convert template, to show the swap), removes tools/nm-01/tool.js
// (to show a tool still to build) and takes screenshots of the shell and of /status with Playwright
// (tools/record/node_modules; organizer only), failing on any console error or CSP violation.
//
//   node tools/dev/check-canivete-app.mjs [--lang pt|en] [--screenshots [<dir>]] [--keep]
//   (default screenshot folder: dev/canivete-screenshots, or dev/canivete-screenshots/en with --lang en)
import { cpSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';

const KIT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const argv = process.argv.slice(2);
const opt = (k, d) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : d);
const lang = opt('--lang', 'pt');
if (!['pt', 'en'].includes(lang)) {
  console.error('--lang must be pt or en');
  process.exit(2);
}
const SHOTS = argv.includes('--screenshots');
const shotsArg = opt('--screenshots', null);
const shotsDir = resolve(KIT, shotsArg && !shotsArg.startsWith('--') ? shotsArg : lang === 'pt' ? 'dev/canivete-screenshots' : 'dev/canivete-screenshots/en');
const SOL = join(KIT, 'dev', 'solutions', 'canivete');

let failures = 0;
const ok = (what) => console.log(`ok   ${what}`);
const bad = (what, detail = '') => {
  failures++;
  console.log(`FAIL ${what}${detail ? `\n     ${String(detail).split('\n').join('\n     ')}` : ''}`);
};
const check = (cond, what, detail) => (cond ? ok(what) : bad(what, detail));

// ---------- 1. assemble (check-canivete.mjs, kept) ----------

const assembled = spawnSync(process.execPath, [join(KIT, 'tools', 'dev', 'check-canivete.mjs'), '--lang', lang, '--keep'], { encoding: 'utf8' });
const tmp = /^kept: (.+)$/m.exec(assembled.stdout)?.[1]?.trim();
if (!tmp || !existsSync(tmp)) {
  process.stdout.write(assembled.stdout + assembled.stderr);
  console.error('check-canivete.mjs did not keep an assembled copy');
  process.exit(1);
}
check(assembled.status === 0, `check-canivete.mjs --lang ${lang}: the tool tests pass with the reference solutions`, assembled.stdout.trim().split('\n').slice(-3).join('\n'));

let server = null;
try {
  // ---------- 2. the search page and the engine ----------

  cpSync(join(SOL, 'pages'), join(tmp, 'pages'), { recursive: true });
  if (existsSync(join(SOL, 'i18n', lang, 'pages'))) cpSync(join(SOL, 'i18n', lang, 'pages'), join(tmp, 'pages'), { recursive: true });
  const engine = join(tmp, 'tools', 'workshop');
  const skip = (d) => [resolve(KIT, d, 'test'), resolve(KIT, 'hooks', 'telemetry.mjs')];
  for (const d of ['hooks', 'orchestrator', 'statusline']) {
    cpSync(join(KIT, d), join(engine, d), { recursive: true, filter: (p) => !skip(d).includes(resolve(p)) && !/[\\/](node_modules|\.DS_Store)([\\/]|$)/.test(p) });
  }
  cpSync(join(KIT, 'pricing.json'), join(engine, 'pricing.json'));
  writeFileSync(join(engine, 'language.json'), JSON.stringify({ language: lang }) + '\n');

  // ---------- 3. the whole suite and the integration check ----------

  const suite = spawnSync(process.execPath, ['--test', '--test-reporter=dot'], { cwd: tmp, encoding: 'utf8' });
  check(suite.status === 0, 'node --test on the whole project', suite.stdout + suite.stderr);
  const integration = spawnSync(process.execPath, ['tools/check-integration.mjs'], { cwd: tmp, encoding: 'utf8' });
  check(integration.status === 0, 'node tools/check-integration.mjs', integration.stdout.split('\n').filter((l) => /Integra|ℹ (pass|fail)/.test(l)).join('\n') || integration.stderr);

  // For the screenshots: your tool (a convert, for the swap) and a tool still to build. The search page is set aside
  // and comes back while the page is open (the shell switches from the simple search to it, live).
  if (SHOTS) {
    writeFileSync(join(tmp, 'specs', 'my-tool.json'), JSON.stringify(myToolSpec(lang), null, 2));
    const gen = spawnSync(process.execPath, ['tools/gen.mjs'], { cwd: tmp, encoding: 'utf8' });
    check(gen.status === 0, 'your tool (specs/my-tool.json, a convert) generates', gen.stderr);
    writeFileSync(join(tmp, 'tools', 'my-01', 'tool.js'), myToolJs(myToolSpec(lang)));
    const mine = spawnSync(process.execPath, ['--test', 'tools/my-01/tool.test.js'], { cwd: tmp, encoding: 'utf8' });
    check(mine.status === 0, 'your tool passes its generated test', mine.stdout);
    rmSync(join(tmp, 'tools', 'nm-01', 'tool.js'));
    renameSync(join(tmp, 'pages', 'catalog.js'), join(tmp, 'pages', 'catalog.js.aside'));
  }

  // ---------- 4. the server ----------

  server = await startServer(tmp);
  const base = server.url;
  ok(`node server.js answers at ${base}`);
  const get = async (p) => {
    const r = await fetch(base + p, { redirect: 'manual' });
    return { status: r.status, type: r.headers.get('content-type'), csp: r.headers.get('content-security-policy'), body: await r.text() };
  };
  const home = await get('/');
  check(home.status === 200 && /src="\/app\.js"/.test(home.body) && /script-src 'self'/.test(home.csp || ''), 'GET / is the shell, with the strict CSP');
  const status = await get('/status');
  check(status.status === 200 && /src="\/status\.js"/.test(status.body), 'GET /status is the swarm page');
  const api = await get('/api/tools');
  let tools = null;
  try {
    tools = JSON.parse(api.body);
  } catch {
    /* checked below */
  }
  const specs = JSON.parse(readFileSync(join(tmp, 'specs', 'tools.json'), 'utf8'));
  check(api.status === 200 && tools && specs.tools.every((t) => tools.tools.some((x) => x.id === t.id)), `GET /api/tools has the ${specs.tools.length} tools of the catalogue`);
  check(tools?.lang === lang && tools.categories.length === specs.categories.length, `GET /api/tools: language ${lang} and the ${specs.categories.length} categories`);
  if (!SHOTS) check(tools?.tools.filter((t) => !t.mine).every((t) => t.built && t.test), 'GET /api/tools: every tool is built (tools/<id>/tool.js) and has its test');
  const replay = await get('/api/replay/example');
  check(replay.status === 200 && JSON.parse(replay.body).events.length > 10, 'GET /api/replay/example');
  for (const p of ['/specs/tools.json', '/specs/my-tool.json', '/tools/gen.mjs', '/tools/workshop/pricing.json', '/plan.json', '/server.js', '/package.json', '/../package.json', '/%2e%2e/server.js', '/.workshop/usage.jsonl', '/tools/dn-01/spec.md']) {
    const r = await get(p);
    check(r.status === 404 && /script-src 'self'/.test(r.csp || ''), `GET ${p} is refused (404, with the CSP)`, `status ${r.status}`);
  }
  for (const p of ['/tools/dn-01/tool.js', '/tools/dn-01/tool.test.js', '/pages/catalog.test.js', '/templates/convert.js', '/lib/testkit.js']) {
    check((await get(p)).status === 200, `GET ${p} is served`);
  }

  if (SHOTS) await screenshots(base, tmp);
} catch (e) {
  bad('unexpected error', e?.stack || e);
} finally {
  if (server) server.child.kill();
  if (argv.includes('--keep')) console.log(`kept: ${tmp}`);
  else rmSync(tmp, { recursive: true, force: true });
}

console.log(failures ? `\ncanivete app (${lang}): ${failures} check(s) FAILED` : `\ncanivete app (${lang}): everything green`);
process.exit(failures ? 1 : 0);

// ---------- helpers ----------

function startServer(root) {
  const child = spawn(process.execPath, ['server.js', '--port', '0'], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
  return new Promise((done, fail) => {
    let buf = '';
    const t = setTimeout(() => fail(new Error(`server.js did not start in 5 s:\n${buf}`)), 5000);
    child.stdout.on('data', (d) => {
      buf += d;
      const m = /(http:\/\/localhost:\d+)\//.exec(buf);
      if (m) {
        clearTimeout(t);
        done({ child, url: m[1] });
      }
    });
    child.stderr.on('data', (d) => (buf += d));
    child.on('exit', (code) => fail(new Error(`server.js exited with ${code}:\n${buf}`)));
  });
}

// "Your tool" for the screenshots: a convert, so the shell shows the swap control. (A function declaration: the
// main code above runs before the module's constants below are initialised.)
function myToolSpec(l) {
  const specs = {
    pt: {
      title: 'Quilómetros e milhas',
      concept: 'Converte distâncias entre quilómetros e milhas, para corridas e viagens.',
      template: 'convert',
      category: 'daily',
      inputs: [
        { name: 'value', type: 'number', label: 'Distância', min: 0 },
        { name: 'direction', type: 'choice', label: 'Sentido', default: 'km-mi', options: [{ value: 'km-mi', label: 'Quilómetros → milhas' }, { value: 'mi-km', label: 'Milhas → quilómetros' }] },
      ],
      output: { type: 'number', label: 'Distância convertida' },
      rules: ['Uma milha são 1,609344 km.', 'O resultado arredonda a 3 casas decimais.'],
      examples: [{ in: { value: '10', direction: 'km-mi' }, out: 6.214 }, { in: { value: '26,2', direction: 'mi-km' }, out: 42.165 }],
      errors: [{ in: { value: '-1', direction: 'km-mi' }, error: 'Distância: o mínimo é 0.' }],
    },
    en: {
      title: 'Kilometres and miles',
      concept: 'Converts distances between kilometres and miles, for runs and trips.',
      template: 'convert',
      category: 'daily',
      inputs: [
        { name: 'value', type: 'number', label: 'Distance', min: 0 },
        { name: 'direction', type: 'choice', label: 'Direction', default: 'km-mi', options: [{ value: 'km-mi', label: 'Kilometres → miles' }, { value: 'mi-km', label: 'Miles → kilometres' }] },
      ],
      output: { type: 'number', label: 'Converted distance' },
      rules: ['A mile is 1.609344 km.', 'The result rounds to 3 decimal places.'],
      examples: [{ in: { value: '10', direction: 'km-mi' }, out: 6.214 }, { in: { value: '26.2', direction: 'mi-km' }, out: 42.165 }],
      errors: [{ in: { value: '-1', direction: 'km-mi' }, error: 'Distance: the minimum is 0.' }],
    },
  };
  return specs[l];
}

function myToolJs(t) {
  return `import { convert } from '../../templates/convert.js';

const MILE = 1.609344;

export default convert({
  id: 'my-01',
  title: ${JSON.stringify(t.title)},
  inputs: ${JSON.stringify(t.inputs)},
  run({ value, direction }) {
    const r = direction === 'km-mi' ? value / MILE : value * MILE;
    return Math.round(r * 1000) / 1000;
  },
});
`;
}

async function screenshots(base, root) {
  let chromium;
  try {
    const require = createRequire(join(KIT, 'tools', 'record', 'package.json'));
    ({ chromium } = require('playwright'));
  } catch {
    bad('Playwright', 'not found in tools/record/node_modules (run npm install in tools/record and npx playwright install chromium)');
    return;
  }
  mkdirSync(shotsDir, { recursive: true });
  const browser = await chromium.launch();
  const problems = [];
  // The only 404 expected: the test of nm-01 (removed above) importing its tool.js during "Run tests".
  const EXPECTED_404 = /\/tools\/nm-01\/tool\.js(\?|$)/;
  const watch = (page) => {
    page.on('console', (m) => {
      if (/Failed to load resource/.test(m.text())) return; // checked by URL below
      if (m.type() === 'error' || /Content Security Policy|Refused to/i.test(m.text())) problems.push(m.text());
    });
    page.on('response', (r) => {
      if (r.status() >= 400 && !EXPECTED_404.test(r.url())) problems.push(`${r.status()} ${r.url()}`);
    });
    page.on('pageerror', (e) => problems.push(String(e)));
  };
  const shot = async (page, name, opts = {}) => {
    await page.waitForTimeout(250);
    await page.screenshot({ path: join(shotsDir, name), ...opts });
    ok(`screenshot ${name}`);
  };
  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    watch(page);

    // The grid with the simple search (pages/catalog.js not there yet), then the switch to pages/catalog.js, live.
    await page.goto(base + '/');
    await page.waitForSelector('.tile');
    await page.waitForSelector('.search-source[data-source="simple"]');
    await shot(page, 'grid-simple-search.png');
    renameSync(join(root, 'pages', 'catalog.js.aside'), join(root, 'pages', 'catalog.js'));
    await page.waitForSelector('.search-source', { state: 'detached', timeout: 10000 });
    ok('the shell switches to pages/catalog.js once its test passes, without a reload');
    await shot(page, 'grid.png', { fullPage: true });
    check(await page.locator('[data-tool="nm-01"][data-status="not_built"]').count() === 1, 'nm-01 (no tool.js) shows as to build in the grid');
    check(await page.locator('[data-tool="my-01"]').count() === 1, 'your tool (my-01) shows in the grid');

    // The search: accents and case do not count (pages/catalog.js).
    await page.fill('#search', lang === 'pt' ? 'NUMEROS' : 'NUMBERS');
    await page.waitForTimeout(150);
    const found = await page.locator('.tile-item').evaluateAll((els) => els.map((e) => e.dataset.tool));
    check(found.length > 0 && found.every((id) => id.startsWith('nm-')), `search "${lang === 'pt' ? 'NUMEROS' : 'NUMBERS'}" finds the Numbers tools`, found.join(', '));
    await shot(page, 'search.png');
    await page.fill('#search', 'xyzzy');
    await page.waitForTimeout(150);
    check(await page.locator('.tile-item').count() === 0, 'a search with no match shows no tools');
    await page.fill('#search', '');

    // A tool with a result: dn-01 opens with its first example and shows the fields as rows.
    await page.goto(base + '/#/tool/dn-01');
    await page.waitForSelector('.result-body[data-state="ok"] .result-fields');
    const rows = await page.locator('.result-fields dt').count();
    check(rows === 3, 'dn-01: the result has 3 labelled rows', `rows: ${rows}`);
    await page.fill('#in-total', '84,50');
    await page.fill('#in-people', '3');
    await page.waitForTimeout(100);
    await shot(page, 'tool-result.png');

    // An error inline: nm-03 with a value that is not a number.
    await page.goto(base + '/#/tool/nm-03');
    await page.waitForSelector('.result-body[data-state="ok"]');
    await page.fill('#in-value', 'abc');
    await page.waitForSelector('.result-body[data-state="error"]');
    const err = await page.locator('.result-error').textContent();
    check(/abc|n[uú]mero|number/i.test(err || ''), 'nm-03: "abc" shows the input error inline', err);
    await shot(page, 'error.png');

    // The convert swap: your tool, 10 km → miles, then swap (the result moves to the value field).
    await page.goto(base + '/#/tool/my-01');
    await page.waitForSelector('.swap-button');
    const before = (await page.locator('.result-number').textContent())?.trim();
    await page.click('.swap-button');
    await page.waitForTimeout(100);
    const value = await page.inputValue('#in-value');
    const after = (await page.locator('.result-number').textContent())?.trim();
    check(before === (lang === 'pt' ? '6,214' : '6.214') && value === before && after === '10', 'convert: the swap moves the result to the value field and converts back', `${before} → [${value}] → ${after}`);
    await shot(page, 'convert-swap.png');

    // Generate: dv-03 with 5 UUIDs, and "Generate again" gives new ones.
    await page.goto(base + '/#/tool/dv-03');
    await page.waitForSelector('.result-list');
    await page.fill('#in-count', '5');
    await page.waitForTimeout(100);
    const first = await page.locator('.result-list').textContent();
    await page.click('.result-actions .button-primary');
    await page.waitForTimeout(100);
    const second = await page.locator('.result-list').textContent();
    check(first !== second && (await page.locator('.result-list li').count()) === 5, 'generate: "Generate again" passes a new seed (5 new UUIDs)');
    await shot(page, 'generate.png');

    // A tool still to build.
    await page.goto(base + '/#/tool/nm-01');
    await page.waitForSelector('.not-built');
    await shot(page, 'to-build.png');

    // "Run tests": every tool test in the browser (nm-01 has no tool.js, so it fails).
    await page.goto(base + '/');
    await page.waitForSelector('#run-tests');
    await page.click('#run-tests');
    await page.waitForSelector('.band:not([data-status="running"])', { timeout: 60000 });
    const verdict = await page.locator('.band-verdict').textContent();
    check(/\d/.test(verdict || ''), `"Run tests" runs the tool tests in the browser: ${verdict?.trim()}`);
    const failedTiles = await page.locator('[data-test="failed"]').evaluateAll((els) => els.map((e) => e.dataset.tool));
    check(failedTiles.length === 1 && failedTiles[0] === 'nm-01', 'in the browser only nm-01 (no tool.js) fails', failedTiles.join(', '));
    await shot(page, 'tests.png');

    // Phone width.
    const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
    const p2 = await phone.newPage();
    watch(p2);
    await p2.goto(base + '/#/tool/dn-01');
    await p2.waitForSelector('.result-fields');
    const overflow = await p2.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    check(!overflow, 'phone: no horizontal scroll on a tool page');
    await shot(p2, 'phone-tool.png', { fullPage: true });
    await p2.goto(base + '/');
    await p2.waitForSelector('.tile');
    await shot(p2, 'phone-grid.png');
    await phone.close();

    // /status: the synthetic replay, paused in the middle of wave 1, and the panel of a red square.
    const dark = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    const p3 = await dark.newPage();
    watch(p3);
    await p3.goto(base + '/status?replay=example');
    await p3.waitForFunction(() => globalThis.__arenaReplay);
    await p3.evaluate(() => {
      const r = globalThis.__arenaReplay;
      r.player.playing = false;
      r.player.reset();
      r.player.advance(150);
      r.draw();
    });
    await shot(p3, 'status.png');
    await p3.evaluate(() => {
      const r = globalThis.__arenaReplay;
      r.player.advance(1000);
      r.draw();
    });
    await p3.click('[data-task="tx-02"] .square');
    await p3.waitForSelector('.panel[open] .panel-excerpt');
    await shot(p3, 'status-panel.png');
    await p3.keyboard.press('Escape');
    await p3.click('[data-task="dn-01"] .square');
    await p3.waitForSelector('.panel[open]');
    check(await p3.locator('.panel a[href="/#/tool/dn-01"]').count() === 1, '/status: the panel of a tool opens it in the shell');
    await dark.close();
    await ctx.close();
  } finally {
    await browser.close();
  }
  check(!problems.length, 'no console errors or CSP violations in the pages', problems.join('\n'));
}
