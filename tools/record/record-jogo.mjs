#!/usr/bin/env node
// Grava um video a jogar a Arena final (para o slide "O resultado: um jogo para jogar"). Ferramenta do organizador.
// Abre a galeria, joga um cartao de cada modelo com a resposta certa (clicar na linha insegura, escolher,
// ordenar e escrever) e acaba na pontuacao. As respostas vem de specs/cards.json da propria Arena.
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
const porId = new Map(spec.cartoes.map((c) => [c.id, c]));
const UI = {
  pt: { inicio: 'Desafios', pontuacao: 'Pontuação' },
  en: { inicio: 'Challenges', pontuacao: 'Score' },
}[lingua];

// ---------- card.js a partir da especificacao ----------
const FUNCAO = { 'clica-erro': 'clicaErro', escolha: 'escolha', ordenar: 'ordenar', resposta: 'resposta' };
function definicao(c) {
  const d = { id: c.id, title: c.titulo, category: c.categoria, difficulty: c.dificuldade, concept: c.conceito, prompt: c.enunciado };
  if (c.cenario) d.scenario = c.cenario;
  if (c.modelo === 'clica-erro') Object.assign(d, { language: c.linguagem, segments: c.segmentos, answer: c.certa });
  if (c.modelo === 'escolha') Object.assign(d, { options: c.opcoes.map((o) => ({ id: o.id, text: o.texto, ...(o.detalhe ? { detail: o.detalhe } : {}) })), answer: c.certa });
  if (c.modelo === 'ordenar') Object.assign(d, { items: c.itens.map((o) => ({ id: o.id, text: o.texto })), answer: c.certa });
  if (c.modelo === 'resposta') Object.assign(d, { placeholder: c.placeholder, accept: c.aceites });
  d.explanation = c.explicacao;
  return d;
}
if (a.includes('--gerar-cartoes')) {
  for (const c of spec.cartoes) {
    if (!FUNCAO[c.modelo] || (c.modelo === 'resposta' && !Array.isArray(c.aceites))) continue;
    const f = FUNCAO[c.modelo];
    const src = `import { ${f} } from '../../templates/${c.modelo}.js';\n\nexport default ${f}(${JSON.stringify(definicao(c), null, 2)});\n`;
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
async function confirmar() { await clicar(page.locator('.cartao .botao-principal').first(), 500); await espera(3200); }
async function inicio() { await clicar(page.locator('a[data-nav="inicio"]').first()); await espera(1200); }

try {
  await page.goto(base + '#/');
  await espera(1800);
  await page.mouse.move(rato.x, rato.y);
  for (const id of ids) {
    const c = porId.get(id);
    if (!c) throw new Error(`cartao ${id} nao existe em specs/cards.json`);
    await clicar(page.locator(`a.tile[href="#/cartao/${id}"]`));
    await page.locator('.cartao').first().waitFor();
    await espera(2200); // tempo para ler o enunciado
    if (c.modelo === 'clica-erro') {
      for (const i of c.certa) await clicar(page.locator(`.segmento[data-indice="${i}"]`), 600);
    } else if (c.modelo === 'escolha') {
      await irPara(page.locator('.opcao').first()); await espera(500);
      await clicar(page.locator(`.opcao[data-opcao="${c.certa}"]`), 700);
    } else if (c.modelo === 'ordenar') {
      const alvo = c.certa;
      for (let pos = 0; pos < alvo.length; pos++) {
        for (;;) {
          const ordem = await page.locator('.ordenar-item').evaluateAll((els) => els.map((e) => e.dataset.item));
          const j = ordem.indexOf(alvo[pos]);
          if (j <= pos) break;
          await clicar(page.locator(`.ordenar-item[data-item="${alvo[pos]}"] [data-mover="cima"]`), 200);
        }
      }
    } else if (c.modelo === 'resposta') {
      await clicar(page.locator('.resposta-campo'));
      await page.keyboard.type(String(c.certa ?? c.aceites[0]), { delay: 120 });
      await espera(400);
    }
    await confirmar();
    await inicio();
  }
  await clicar(page.locator('a[data-nav="pontuacao"]').first());
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
