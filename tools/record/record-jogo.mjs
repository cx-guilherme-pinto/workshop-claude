#!/usr/bin/env node
// Grava um video a jogar a Arena final (para o slide "O resultado: um jogo para jogar"). Ferramenta do organizador.
// Abre a galeria, joga um cartao de cada modelo com a resposta certa (clicar na linha insegura, escolher,
// ordenar e escrever) e acaba na pontuacao. As respostas vem de specs/cards.json da propria Arena (D-25: chaves, templates e rotas em ingles).
//
//   node record-jogo.mjs --arena <pasta da Arena com os cartoes feitos> --out <pasta> [--lingua pt|en]
//                        [--gerar-cartoes] [--porta 3610] [--cartoes sc-01,ph-01,ph-06,sc-03]
//
// --gerar-cartoes escreve cards/<id>/card.js a partir de specs/cards.json (para uma Arena em ingles com os
// textos em ingles). Usa uma copia da Arena: muda os card.js.
// Escreve <out>/arena-jogo[.en].mp4 e <out>/arena-jogo[.en].png (poster). Precisa de ffmpeg.
import { chromium } from 'playwright';
import { spawn, execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';

const a = process.argv.slice(2);
const opt = (k, d) => (a.includes(k) ? a[a.indexOf(k) + 1] : d);
const arena = resolve(opt('--arena', '.'));
const out = resolve(opt('--out', 'out'));
const lingua = opt('--lingua', 'pt');
const porta = Number(opt('--porta', 3610));
const ids = opt('--cartoes', 'sc-01,ph-01,ph-06,sc-03').split(',');
const sufixo = lingua === 'pt' ? '' : `.${lingua}`;
mkdirSync(out, { recursive: true });

const spec = JSON.parse(readFileSync(join(arena, 'specs', 'cards.json'), 'utf8'));
const porId = new Map(spec.cards.map((c) => [c.id, c]));

// ---------- card.js a partir da especificacao (D-25: templates e chaves em ingles) ----------
const FUNCAO = { 'spot-the-flaw': 'spotTheFlaw', choice: 'choice', order: 'order', answer: 'answer' };
function definicao(c) {
  const d = { id: c.id, title: c.title, category: c.category, difficulty: c.difficulty, concept: c.concept, prompt: c.prompt };
  if (c.scenario) d.scenario = c.scenario;
  if (c.template === 'spot-the-flaw') Object.assign(d, { language: c.language, segments: c.segments, answer: c.answer });
  if (c.template === 'choice') Object.assign(d, { options: c.options, answer: c.answer });
  if (c.template === 'order') Object.assign(d, { items: c.items, answer: c.answer });
  if (c.template === 'answer') Object.assign(d, { placeholder: c.placeholder, accept: c.accept });
  d.explanation = c.explanation;
  return d;
}
if (a.includes('--gerar-cartoes')) {
  for (const c of spec.cards) {
    if (!FUNCAO[c.template] || (c.template === 'answer' && !Array.isArray(c.accept))) continue;
    const f = FUNCAO[c.template];
    const src = `import { ${f} } from '../../templates/${c.template}.js';\n\nexport default ${f}(${JSON.stringify(definicao(c), null, 2)});\n`;
    writeFileSync(join(arena, 'cards', c.id, 'card.js'), src);
  }
}

// ---------- servidor da Arena ----------
const srv = spawn(process.execPath, ['server.js', '--porta', String(porta)], { cwd: arena, stdio: 'ignore' });
const base = `http://127.0.0.1:${porta}/`;
for (let i = 0; i < 50; i++) { try { const r = await fetch(base); if (r.ok) break; } catch { /* ainda a arrancar */ } await new Promise((r) => setTimeout(r, 200)); }

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1, bypassCSP: true, recordVideo: { dir: out, size: { width: 1280, height: 720 } } });
// Cursor visivel (o video do Playwright nao mostra o rato).
await context.addInitScript(() => {
  const criar = () => {
    if (document.getElementById('__cursor')) return;
    const c = document.createElement('div');
    c.id = '__cursor';
    Object.assign(c.style, { position: 'fixed', left: '-40px', top: '-40px', width: '22px', height: '22px', marginLeft: '-11px', marginTop: '-11px', borderRadius: '50%', background: 'rgba(26,75,224,0.28)', border: '2px solid #1a4be0', zIndex: '2147483647', pointerEvents: 'none', transition: 'transform 90ms ease-out' });
    document.documentElement.appendChild(c);
    addEventListener('mousemove', (e) => { c.style.left = `${e.clientX}px`; c.style.top = `${e.clientY}px`; }, true);
    addEventListener('mousedown', () => { c.style.transform = 'scale(0.7)'; }, true);
    addEventListener('mouseup', () => { c.style.transform = 'scale(1)'; }, true);
  };
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', criar); else criar();
});
const page = await context.newPage();
const espera = (ms) => page.waitForTimeout(ms);
let rato = { x: 640, y: 360 };
async function irPara(loc) {
  await loc.scrollIntoViewIfNeeded();
  await espera(250);
  const b = await loc.boundingBox();
  const x = b.x + b.width / 2;
  const y = b.y + Math.min(b.height / 2, 24);
  await page.mouse.move(x, y, { steps: Math.max(12, Math.round(Math.hypot(x - rato.x, y - rato.y) / 18)) });
  rato = { x, y };
}
async function clicar(loc, pausa = 350) {
  await irPara(loc);
  await espera(pausa);
  await page.mouse.down();
  await page.mouse.up();
  await espera(300);
}
async function confirmar() { await clicar(page.locator('.card .card-actions .button-primary').first(), 500); await espera(3200); }
async function inicio() { await clicar(page.locator('a[data-nav="home"]').first()); await espera(1200); }

try {
  await page.goto(base + '#/');
  await espera(1800);
  await page.mouse.move(rato.x, rato.y);
  for (const id of ids) {
    const c = porId.get(id);
    if (!c) throw new Error(`cartao ${id} nao existe em specs/cards.json`);
    await clicar(page.locator(`a.tile[href="#/card/${id}"]`));
    await page.locator('.card').first().waitFor();
    await espera(2200); // tempo para ler o enunciado
    if (c.template === 'spot-the-flaw') {
      for (const i of c.answer) await clicar(page.locator(`.segment[data-index="${i}"]`), 600);
    } else if (c.template === 'choice') {
      await irPara(page.locator('.option').first()); await espera(500);
      await clicar(page.locator(`.option[data-option="${c.answer}"]`), 700);
    } else if (c.template === 'order') {
      const alvo = c.answer;
      for (let pos = 0; pos < alvo.length; pos++) {
        for (;;) {
          const ordem = await page.locator('.order-item').evaluateAll((els) => els.map((e) => e.dataset.item));
          const j = ordem.indexOf(alvo[pos]);
          if (j <= pos) break;
          await clicar(page.locator(`.order-item[data-item="${alvo[pos]}"] [data-move="up"]`), 200);
        }
      }
    } else if (c.template === 'answer') {
      await clicar(page.locator('.answer-field'));
      await page.keyboard.type(String(c.answer ?? c.accept[0]), { delay: 120 });
      await espera(400);
    }
    await confirmar();
    await inicio();
  }
  await clicar(page.locator('a[data-nav="score"]').first());
  await espera(3000);
} finally {
  await context.close();
  await browser.close();
  srv.kill();
}

const webm = readdirSync(out).filter((f) => f.endsWith('.webm')).map((f) => join(out, f)).sort().pop();
const mp4 = join(out, `arena-jogo${sufixo}.mp4`);
const png = join(out, `arena-jogo${sufixo}.png`);
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', webm, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-r', '30', '-movflags', 'faststart', mp4]);
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', '2', '-i', mp4, '-frames:v', '1', png]);
rmSync(webm);
console.log(`gravado: ${mp4} e ${png}`);
