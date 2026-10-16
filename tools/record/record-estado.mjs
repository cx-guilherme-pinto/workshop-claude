#!/usr/bin/env node
// Grava a pagina /estado da Arena (Playwright) enquanto o enxame corre, ate o run terminar.
//   node record-estado.mjs --url http://127.0.0.1:3000/estado --projeto <arena> --out <pasta> [--max-min 40]
// Escreve <out>/estado.webm e <out>/estado-final.png e, no fim, a galeria em <out>/arena.png.
// Ferramenta do organizador (precisa de `npm install` nesta pasta e `npx playwright install chromium`).
import { chromium } from 'playwright';
import { existsSync, readFileSync, renameSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const a = process.argv.slice(2);
const opt = (k, d) => (a.includes(k) ? a[a.indexOf(k) + 1] : d);
const url = opt('--url', 'http://127.0.0.1:3000/estado');
const projeto = opt('--projeto');
const out = opt('--out', 'out');
const maxMs = Number(opt('--max-min', 40)) * 60000;
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, colorScheme: 'dark', recordVideo: { dir: out, size: { width: 1920, height: 1080 } } });
const page = await context.newPage();
await page.goto(url);
const t0 = Date.now();
const terminou = () => {
  const f = join(projeto, '.workshop', 'run.json');
  if (!existsSync(f)) return false;
  try {
    return !!JSON.parse(readFileSync(f, 'utf8')).fim;
  } catch {
    return false;
  }
};
while (Date.now() - t0 < maxMs && !terminou()) await page.waitForTimeout(2000);
await page.waitForTimeout(4000);
await page.screenshot({ path: join(out, 'estado-final.png') });
const base = url.replace(/\/estado.*$/, '/');
await page.goto(base);
await page.waitForTimeout(2500);
await page.screenshot({ path: join(out, 'arena.png') });
await context.close();
await browser.close();
const webm = readdirSync(out).find((f) => f.endsWith('.webm') && f !== 'estado.webm');
if (webm) renameSync(join(out, webm), join(out, 'estado.webm'));
console.log(`gravado em ${out} (${Math.round((Date.now() - t0) / 1000)} s)`);
