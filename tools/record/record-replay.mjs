#!/usr/bin/env node
// Gera, fotograma a fotograma, a pagina /status?replay=<nome> (a grelha a mudar de cor, reconstruida a
// partir de events.jsonl), a uma velocidade fixa. Ferramenta do organizador, usada pelo montar-preview.sh.
// Nao grava em tempo real: com o recordVideo do Playwright a pagina fica lenta e o relogio da repeticao
// atrasa. Aqui a repeticao e parada e avancada a passos certos, com uma captura por passo.
//
//   node record-replay.mjs --url http://127.0.0.1:3620/status?replay=recording --out <pasta> [--velocidade 5] [--fps 12]
//
// Escreve <out>/replay-frames/f00000.jpg ... e <out>/replay.json { fps, velocidade, duracao_s, fotogramas }.
// A pagina /status expoe a repeticao (globalThis.__arenaReplay); os ficheiros da Arena nao mudam.
import { chromium } from 'playwright';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const a = process.argv.slice(2);
const opt = (k, d) => (a.includes(k) ? a[a.indexOf(k) + 1] : d);
const url = opt('--url', 'http://127.0.0.1:3620/status?replay=recording');
const out = opt('--out', 'out');
const velocidade = Number(opt('--velocidade', 5));
const fps = Number(opt('--fps', 12));
const pasta = join(out, 'replay-frames');
rmSync(pasta, { recursive: true, force: true });
mkdirSync(pasta, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, colorScheme: 'dark' });
await page.goto(url);
// A pagina /status expoe a repeticao a este gravador (globalThis.__arenaReplay = { player, draw }).
await page.waitForFunction(() => globalThis.__arenaReplay, null, { timeout: 30000 });
// A repeticao avanca so aqui, a passos certos: o setInterval da pagina passa a nao fazer nada, e o
// subtitulo mostra a velocidade do video ("at 5x"), porque o player continua "a tocar" a essa velocidade.
// Sem os botoes de velocidade e pausa no video (style do elemento: a CSP da Arena nao deixa <style> inline).
const duracao = await page.evaluate((v) => {
  const c = document.getElementById('replay'); if (c) c.style.display = 'none';
  const { player, draw } = globalThis.__arenaReplay;
  const avancar = player.advance.bind(player);
  player.advance = () => {};
  globalThis.__avancar = (s) => { avancar(s); draw(); };
  player.speed = v; player.playing = true; player.reset(); avancar(0); draw();
  return player.data.duration;
}, velocidade);
const passo = velocidade / fps; // segundos de execucao real por fotograma
const total = Math.ceil(duracao / passo) + 1;
for (let k = 0; k < total; k++) {
  if (k > 0) await page.evaluate((s) => globalThis.__avancar(s), passo);
  await page.screenshot({ path: join(pasta, `f${String(k).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 90 });
  if (k % 100 === 0) process.stdout.write(`  ${k}/${total}\r`);
}
await browser.close();
writeFileSync(join(out, 'replay.json'), JSON.stringify({ fps, velocidade, duracao_s: duracao, fotogramas: total }, null, 2) + '\n');
console.log(`repeticao: ${total} fotogramas (${(total / fps).toFixed(1)} s a ${velocidade}x)`);
