#!/usr/bin/env node
// Gera, fotograma a fotograma, a pagina /estado?replay=<nome> (a grelha a mudar de cor, reconstruida a
// partir de events.jsonl), a uma velocidade fixa. Ferramenta do organizador, usada pelo montar-preview.sh.
// Nao grava em tempo real: com o recordVideo do Playwright a pagina fica lenta e o relogio da repeticao
// atrasa. Aqui a repeticao e parada e avancada a passos certos, com uma captura por passo.
//
//   node record-replay.mjs --url http://127.0.0.1:3620/estado?replay=gravacao --out <pasta> [--velocidade 5] [--fps 12]
//
// Escreve <out>/replay-frames/f00000.jpg ... e <out>/replay.json { fps, velocidade, duracao_s, fotogramas }.
// Para ligar a pagina a este script, o estado.js servido so a este browser expoe a repeticao (page.route);
// os ficheiros da Arena nao mudam.
import { chromium } from 'playwright';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const a = process.argv.slice(2);
const opt = (k, d) => (a.includes(k) ? a[a.indexOf(k) + 1] : d);
const url = opt('--url', 'http://127.0.0.1:3620/estado?replay=gravacao');
const out = opt('--out', 'out');
const velocidade = Number(opt('--velocidade', 5));
const fps = Number(opt('--fps', 12));
const pasta = join(out, 'replay-frames');
rmSync(pasta, { recursive: true, force: true });
mkdirSync(pasta, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, colorScheme: 'dark' });
await page.route('**/estado.js', async (route) => {
  const r = await route.fetch();
  let js = await r.text();
  const ancora = 'estado.repeticao = rep;';
  if (!js.includes(ancora)) throw new Error('estado.js mudou: nao encontro "estado.repeticao = rep;"');
  js = js.replace(ancora, `${ancora} globalThis.__rep = rep; globalThis.__desenhar = () => desenhar(rep.fotografia());`);
  // A repeticao fica parada (avanca-se aqui): o subtitulo mostra a velocidade do video e nao "em pausa".
  js = js.replace("'em pausa'", `'a ${velocidade}×'`);
  await route.fulfill({ response: r, body: js });
});
await page.goto(url);
await page.waitForFunction(() => globalThis.__rep && globalThis.__desenhar, null, { timeout: 30000 });
// Sem os botoes de velocidade e pausa no video (style do elemento: a CSP da Arena nao deixa <style> inline).
const duracao = await page.evaluate(() => { const c = document.getElementById('repeticao'); if (c) c.style.display = 'none'; const r = globalThis.__rep; r.aTocar = false; r.reiniciar(); r.avancar(0); globalThis.__desenhar(); return r.dados.duracao; });
const passo = velocidade / fps; // segundos de execucao real por fotograma
const total = Math.ceil(duracao / passo) + 1;
for (let k = 0; k < total; k++) {
  if (k > 0) await page.evaluate((s) => { globalThis.__rep.avancar(s); globalThis.__desenhar(); }, passo);
  await page.screenshot({ path: join(pasta, `f${String(k).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 90 });
  if (k % 100 === 0) process.stdout.write(`  ${k}/${total}\r`);
}
await browser.close();
writeFileSync(join(out, 'replay.json'), JSON.stringify({ fps, velocidade, duracao_s: duracao, fotogramas: total }, null, 2) + '\n');
console.log(`repeticao: ${total} fotogramas (${(total / fps).toFixed(1)} s a ${velocidade}x)`);
