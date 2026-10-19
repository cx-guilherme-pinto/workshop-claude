#!/usr/bin/env node
// Screenshots of the live panel (docs/pt/WORKSHOP-V2-SPEC.md, phase 2: "the 6 views legible at 640 x 1080").
//
//   node tools/record/panel-screenshots.mjs [--out dev/panel-screenshots]
//
// Starts panel/server.mjs on a free port with a temporary --data folder and a random admin token (environment
// only), opens the replay "simulated" at the right minute of each block and saves into --out:
//   panel-strip.png (the top strip), panel-opening.png, panel-missions.png, panel-p1.png, panel-p2.png,
//   panel-closing.png (640 x 1080, pt), panel-wide-p1.png (1920 x 1080, room B), panel-en-p2.png (en) and
//   panel-live-p1.png (live mode: the simulator's events posted to the server, the view moved by key 3 with the
//   admin token, which POSTs /admin/phase).
// It fails on any console error, CSP violation, page overflow or visible text under 24 px.
// Organizer tool (needs `npm install` in tools/record and `npx playwright install chromium`).
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { simulate } from '../../panel/simulate.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const a = process.argv.slice(2);
const opt = (k, d) => (a.includes(k) ? a[a.indexOf(k) + 1] : d);
const out = resolve(ROOT, opt('--out', 'dev/panel-screenshots'));
mkdirSync(out, { recursive: true });

const data = mkdtempSync(join(tmpdir(), 'ws-panel-'));
const token = randomBytes(16).toString('hex');
const WS = 'shots';

function startServer() {
  const child = spawn(process.execPath, [join(ROOT, 'panel', 'server.mjs'), '--port', '0', '--data', data, '--ws', WS], { env: { ...process.env, PANEL_ADMIN_TOKEN: token }, stdio: ['ignore', 'pipe', 'inherit'] });
  return new Promise((ok, fail) => {
    let buf = '';
    child.stdout.on('data', (d) => {
      buf += d;
      const m = /panel: (http:\/\/[^/\s]+)/.exec(buf);
      if (m) ok({ child, url: m[1] });
    });
    child.once('exit', (c) => fail(new Error(`server exited (${c})`)));
  });
}

const problems = [];
const { child, url } = await startServer();
const browser = await chromium.launch();

async function open({ path, name = path, width = 640, height = 1080, lang = 'pt-PT' }) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, colorScheme: 'dark', locale: lang, reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.addInitScript(() => {
    window.__csp = [];
    document.addEventListener('securitypolicyviolation', (e) => window.__csp.push(`${e.violatedDirective} ${e.blockedURI}`));
  });
  // config.json is optional (absent = the API on the same origin): its 404 is expected.
  page.on('console', (m) => m.type() === 'error' && !m.location().url?.endsWith('/config.json') && problems.push(`${name}: console: ${m.text()}`));
  page.on('pageerror', (e) => problems.push(`${name}: ${e.message}`));
  await page.goto(`${url}${path}`);
  await page.evaluate(() => document.fonts.ready);
  return { context, page };
}

// Overflow, text under 24 px and CSP violations, measured in the page.
async function check(page, name) {
  const r = await page.evaluate(() => {
    const doc = document.documentElement;
    const small = [];
    const clipped = [];
    for (const e of document.querySelectorAll('body *')) {
      const own = [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      const cs = getComputedStyle(e);
      if (cs.display === 'none' || cs.visibility === 'hidden' || e.closest('[hidden]')) continue;
      if (own && parseFloat(cs.fontSize) < 23.5) small.push(`${e.tagName.toLowerCase()}.${e.getAttribute('class') || ''} ${cs.fontSize} "${e.textContent.trim().slice(0, 30)}"`);
      if (own && e.scrollWidth > e.clientWidth + 1 && cs.overflow !== 'visible') clipped.push(`${e.tagName.toLowerCase()}.${e.getAttribute('class') || ''} "${e.textContent.trim().slice(0, 30)}"`);
    }
    return { h: doc.scrollHeight, vh: innerHeight, w: doc.scrollWidth, vw: innerWidth, small, clipped, csp: window.__csp };
  });
  if (r.h > r.vh + 1) problems.push(`${name}: the page is ${r.h}px tall (window ${r.vh}px)`);
  if (r.w > r.vw + 1) problems.push(`${name}: the page is ${r.w}px wide (window ${r.vw}px)`);
  for (const s of r.small) problems.push(`${name}: text under 24px: ${s}`);
  for (const s of r.clipped) problems.push(`${name}: text cut: ${s}`);
  for (const s of r.csp) problems.push(`${name}: CSP violation: ${s}`);
}

async function shot({ file, path, width, height, lang, clip }) {
  const { context, page } = await open({ path, width, height, lang });
  await page.waitForSelector('.view-head');
  await page.waitForTimeout(1200);
  await check(page, file);
  const target = clip ? page.locator(clip) : page;
  await target.screenshot({ path: join(out, file) });
  await context.close();
  console.log(`  ${file}`);
}

try {
  console.log(`panel on ${url}, screenshots in ${out}`);
  // The replay at the minute of each block (the agenda: opening 0, missions 8, p1 23, p2 47, closing 87).
  await shot({ file: 'panel-strip.png', path: '/?replay=simulated&room=A&lang=pt&at=40', clip: '#strip' });
  await shot({ file: 'panel-opening.png', path: '/?replay=simulated&room=A&lang=pt&at=4' });
  await shot({ file: 'panel-missions.png', path: '/?replay=simulated&room=A&lang=pt&at=21' });
  await shot({ file: 'panel-p1.png', path: '/?replay=simulated&room=A&lang=pt&at=42' });
  await shot({ file: 'panel-p2.png', path: '/?replay=simulated&room=A&lang=pt&at=70' });
  await shot({ file: 'panel-closing.png', path: '/?replay=simulated&room=all&lang=pt&at=89' });
  await shot({ file: 'panel-wide-p1.png', path: '/?replay=simulated&room=B&lang=pt&at=42', width: 1920, height: 1080 });
  await shot({ file: 'panel-en-p2.png', path: '/?replay=simulated&room=B&lang=en&at=66', lang: 'en-GB' });

  // Live: the simulator's first 42 minutes posted to the server, then key 3 with the admin token.
  const events = simulate({ people: 60, rooms: 2, ws: WS, start: Date.now() - 42 * 60000 }).filter((e) => Date.parse(e.t) <= Date.now());
  const byPerson = new Map();
  for (const e of events) byPerson.set(e.p, [...(byPerson.get(e.p) || []), e]);
  for (const list of byPerson.values()) {
    for (let k = 0; k < list.length; k += 50) {
      const r = await fetch(`${url}/e`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Workshop-Code': WS }, body: JSON.stringify(list.slice(k, k + 50)) });
      if (r.status !== 204) problems.push(`live: POST /e answered ${r.status}`);
    }
  }
  const { context, page } = await open({ path: `/?room=A&lang=pt#admin=${token}`, name: 'live' });
  await page.waitForSelector('.view-head');
  if ((await page.evaluate(() => location.hash)).includes('admin')) problems.push('live: the admin token stayed in the address bar');
  await page.keyboard.press('3');
  await page.waitForTimeout(1500);
  const phase = (await (await fetch(`${url}/state`)).json()).phase;
  if (phase !== 'p1') problems.push(`live: key 3 with the admin token left the phase at ${phase}`);
  if ((await page.getAttribute('#view', 'data-view')) !== 'p1') problems.push('live: the page did not follow the phase');
  await page.waitForFunction(() => !document.getElementById('toast').classList.contains('on'), null, { timeout: 5000 });
  await check(page, 'panel-live-p1.png');
  await page.screenshot({ path: join(out, 'panel-live-p1.png') });
  console.log('  panel-live-p1.png');
  await context.close();
} finally {
  await browser.close();
  child.kill();
  rmSync(data, { recursive: true, force: true });
}

if (problems.length) {
  for (const p of problems) console.error(`PROBLEM ${p}`);
  process.exitCode = 1;
} else console.log('OK: no console errors, CSP violations, overflow or text under 24 px.');
