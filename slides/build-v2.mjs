#!/usr/bin/env node
// O deck v2 (docs/pt/WORKSHOP-V2-SPEC.md, seccao 8 e D-36): 32 slides em 1280 x 1080 (o terco direito do ecra e do painel),
// a partir de content-v2.mjs / content-v2.en.mjs + repos.conf:
//   pt: slides/workshop-v2.pptx    + slides/speaker-notes-v2.md
//   en: slides/workshop-v2.en.pptx + slides/speaker-notes-v2.en.md
//   e slides/palco.html: os slides a esquerda e o painel a direita; cada slide muda a vista do painel (fase).
//
//   cd slides && npm install && node build-v2.mjs [--lingua pt|en] [--png]
//
// --png exporta as imagens dos slides para slides/palco/<lingua>/ com o LibreOffice (local ou em Docker) e o
// pdftoppm. Sem as imagens, o palco desenha cada slide em HTML a partir do mesmo conteudo. Corpo minimo 24 pt e codigo minimo 20 pt: o build avisa abaixo disso. Ferramenta do organizador.
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import pptxgen from 'pptxgenjs';
import { loadConf, derived } from '../installer/lib/conf.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const KIT = join(AQUI, '..');
const BUILD = join(AQUI, 'build');

const TEXTOS = {
  pt: {
    conteudo: './content-v2.mjs', pptx: 'workshop-v2.pptx', notas: 'speaker-notes-v2.md',
    titulo: 'Orquestração de agentes com Claude',
    decimal: ',',
    tipo: { faca: 'Faz agora', missao: 'Missão', decide: 'Decide', painel: 'Painel', preve: 'Prevê', conceito: 'Conceito' },
    esperado: 'Resultado esperado: ',
    painelSeta: 'Olha para o painel',
    custoTitulo: 'O custo', painelVeTitulo: 'O que o painel vê',
    ideias: '3 ideias para levar',
    saltar: 'PODE SALTAR',
    estarAqui: (m) => `deves estar aqui aos ${m} min`,
    rot: { objetivo: 'Objetivo', dizer: 'O que dizer', painel: 'Olha para o painel', falhas: 'Falhas típicas e resposta', relogio: 'Relógio' },
    notasCab: (t) => [`# Notas do apresentador — ${t} (v2)`, '', 'Cada slide: objetivo, o que dizer, o que ler no painel, falhas típicas e o relógio. Os slides marcados **PODE SALTAR** saltam-se se houver atraso. As respostas das 3 specs ambíguas estão em docs/pt/PRESENTER-ANSWERS.md (fora do kit).', '', '| # | min | relógio | bloco | fase | tipo | slide |', '|---|---|---|---|---|---|---|'],
    total: (m) => `Total: ${m} min.`,
    porSlide: '## Notas por slide',
    aviso: (m) => `AVISO: o deck v2 soma ${m} min (devia ser 90).`,
  },
  en: {
    conteudo: './content-v2.en.mjs', pptx: 'workshop-v2.en.pptx', notas: 'speaker-notes-v2.en.md',
    titulo: 'Agent orchestration with Claude',
    decimal: '.',
    tipo: { faca: 'Do it now', missao: 'Mission', decide: 'Decide', painel: 'Panel', preve: 'Predict', conceito: 'Concept' },
    esperado: 'Expected result: ',
    painelSeta: 'Look at the panel',
    custoTitulo: 'The cost', painelVeTitulo: 'What the panel sees',
    ideias: '3 ideas to take home',
    saltar: 'CAN SKIP',
    estarAqui: (m) => `you should be here at ${m} min`,
    rot: { objetivo: 'Goal', dizer: 'What to say', painel: 'Look at the panel', falhas: 'Typical failures and the answer', relogio: 'Clock' },
    notasCab: (t) => [`# Speaker notes — ${t} (v2)`, '', 'Each slide: goal, what to say, what to read on the panel, typical failures and the clock. Slides marked **CAN SKIP** can be skipped if you are running late. The answers to the 3 ambiguous specs are in docs/PRESENTER-ANSWERS.md (not in the kit).', '', '| # | min | clock | block | phase | type | slide |', '|---|---|---|---|---|---|---|'],
    total: (m) => `Total: ${m} min.`,
    porSlide: '## Notes per slide',
    aviso: (m) => `WARNING: the v2 deck adds up to ${m} min (should be 90).`,
  },
};

// A identidade da Checkmarx (o modelo em slides/modelo/), como o deck atual.
const COR = {
  bg: 'F4EFFE', surface: 'FFFFFF', surface2: 'EBDDFA', ink: '140920', muted: '4A405A',
  accent: '6B34FD', accentInk: 'FFFFFF', laranja: 'F25928', lilas: '93A7FF',
  escuro: '140920', escuroInk: 'FCF9FE', escuroMuted: 'B9AEDB', verde: '1E9E57', vermelho: 'D2463F',
};
const FONTE_TITULO = 'Founders Grotesk Medium';
const FONTE_TEXTO = 'Arial';
const FONTE_CODIGO = 'Courier New';
// 1280 x 1080 px a 96 ppp: 13,333 x 11,25 polegadas (33,87 x 28,58 cm).
const W = 13.333;
const H = 11.25;
const M = 0.7;
const RODAPE_Y = H - 0.585;
const CORPO_MIN = 24;
const CODIGO_MIN = 20;

let T;
let V;
let pres;
let SLIDE_ATUAL = '';
const PEQUENOS = [];
const FALTAM = new Set();

function valores() {
  const d = derived(loadConf());
  return {
    CHECK_MAC: d.CHECK_MAC, CHECK_WIN: d.CHECK_WINDOWS, DOCTOR_MAC: d.DOCTOR_MAC, DOCTOR_WIN: d.DOCTOR_WINDOWS,
    WORKSHOP_REPO: d.WORKSHOP_REPO_URL.replace(/\.git$/, ''), WORKSHOP_VERSION: d.WORKSHOP_VERSION,
    PANEL_URL: d.PANEL_URL, PANEL_PAGE_URL: d.PANEL_PAGE_URL,
  };
}
const sub = (s) => (typeof s === 'string' ? s.replace(/\{\{(\w+)\}\}/g, (_, k) => V[k] ?? (FALTAM.add(k), `{{${k}}}`)) : s);
const minutos = (m) => String(m).replace('.', T.decimal);
const mmss = (m) => `${Math.floor(m)}:${String(Math.round((m % 1) * 60)).padStart(2, '0')}`;
const pequeno = (fs, min, o) => {
  if (fs < min) PEQUENOS.push(`${SLIDE_ATUAL}: ${o} a ${fs} pt`);
};

// ---------- Fundos do modelo cortados para 1280 x 1080 (a parte da direita, onde esta o motivo) ----------
async function fundos() {
  const sharp = (await import('sharp')).default;
  mkdirSync(BUILD, { recursive: true });
  const out = {};
  for (const n of ['fundo-titulo', 'fundo-fecho']) {
    const f = join(BUILD, `${n}-1280.png`);
    await sharp(join(AQUI, 'modelo', `${n}.png`)).extract({ left: 640, top: 0, width: 1280, height: 1080 }).png().toFile(f);
    out[n] = f;
  }
  return out;
}

const ICONES = new Map();
async function icones() {
  const sharp = (await import('sharp')).default;
  for (const [n, cor] of [['check', '#FFFFFF'], ['x', '#FFFFFF'], ['arrow-right', '#FFFFFF'], ['clock', '#FFFFFF'], ['lightbulb', '#FFFFFF'], ['eye', '#FFFFFF'], ['trash-2', '#FFFFFF']]) {
    const svg = readFileSync(join(AQUI, 'node_modules', 'lucide-static', 'icons', `${n}.svg`), 'utf8').replace(/currentColor/g, cor).replace(/width="24"/, 'width="192"').replace(/height="24"/, 'height="192"');
    ICONES.set(n, 'image/png;base64,' + (await sharp(Buffer.from(svg)).png().toBuffer()).toString('base64'));
  }
}

function novaApresentacao(bg) {
  const p = new pptxgen();
  p.defineLayout({ name: 'WS_V2', width: W, height: H });
  p.layout = 'WS_V2';
  p.title = `${T.titulo} (v2)`;
  p.author = 'Workshop Claude';
  p.theme = { headFontFace: FONTE_TITULO, bodyFontFace: FONTE_TEXTO };
  const MOD = (n) => join(AQUI, 'modelo', n);
  const rodape = [
    { rect: { x: 0, y: RODAPE_Y, w: W, h: 0.585, fill: { color: COR.escuro }, line: { color: COR.escuro, width: 0 } } },
    { image: { x: M, y: RODAPE_Y + 0.24, w: 0.821, h: 0.103, path: MOD('logo-branco.png'), altText: 'Logo', objectName: 'logo' } },
  ];
  const numero = { x: W - 3.5, y: RODAPE_Y + 0.15, w: 3.0, h: 0.28, fontFace: FONTE_TEXTO, fontSize: 12, color: COR.escuroInk, align: 'right' };
  p.defineSlideMaster({
    title: 'V2-TITLE',
    background: { path: bg['fundo-titulo'] },
    objects: [
      { image: { x: M, y: 0.8, w: 2.6, h: 0.325, path: MOD('logo-branco.png'), altText: 'Logo', objectName: 'logo' } },
      { placeholder: { options: { name: 'title', type: 'title', x: M, y: 3.2, w: W - 2 * M, h: 3.0, fontFace: FONTE_TITULO, fontSize: 66, color: COR.escuroInk, valign: 'bottom', align: 'left', margin: 0 }, text: '' } },
      { placeholder: { options: { name: 'body', type: 'body', x: M, y: 6.45, w: W - 2 * M - 1.5, h: 1.6, fontFace: FONTE_TITULO, fontSize: 32, color: COR.laranja, valign: 'top', align: 'left', margin: 0 }, text: '' } },
    ],
  });
  p.defineSlideMaster({
    title: 'V2-CLOSING',
    background: { path: bg['fundo-fecho'] },
    objects: [
      { image: { x: W / 2 - 1.4, y: 8.4, w: 2.8, h: 0.35, path: MOD('logo-branco.png'), altText: 'Logo', objectName: 'logo' } },
      { placeholder: { options: { name: 'title', type: 'title', x: M, y: 3.4, w: W - 2 * M, h: 2.2, fontFace: FONTE_TITULO, fontSize: 80, color: COR.escuroInk, valign: 'bottom', align: 'center', margin: 0 }, text: '' } },
      { placeholder: { options: { name: 'body', type: 'body', x: M, y: 5.8, w: W - 2 * M, h: 1.0, fontFace: FONTE_TITULO, fontSize: 34, color: COR.laranja, valign: 'top', align: 'center', margin: 0 }, text: '' } },
    ],
  });
  p.defineSlideMaster({
    title: 'V2-CONTENT',
    background: { color: COR.bg },
    objects: [
      ...rodape,
      { placeholder: { options: { name: 'title', type: 'title', x: M, y: 1.15, w: W - 2 * M, h: 1.25, fontFace: FONTE_TITULO, fontSize: 44, color: COR.ink, valign: 'top', align: 'left', margin: 0 }, text: '' } },
    ],
    slideNumber: numero,
  });
  return p;
}

// ---------- Pecas ----------
const texto = (s, t, o) => {
  if (o.fontSize && !o.semMinimo) pequeno(o.fontSize, CORPO_MIN, 'texto');
  const { semMinimo, ...op } = o;
  s.addText(t, { isTextBox: true, margin: 0, fontFace: FONTE_TEXTO, color: COR.ink, valign: 'top', ...op });
};
const caixa = (s, x, y, w, h, cor, nome) => s.addShape(pres.shapes.RECTANGLE, { x, y, w, h, fill: { color: cor }, line: { color: cor, width: 0 }, objectName: nome });
function icone(s, n, x, y, d, cor = COR.accent, obj = 'icon') {
  s.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color: cor }, line: { color: cor, width: 0 }, objectName: `${obj}-circle` });
  s.addImage({ data: ICONES.get(n), x: x + d * 0.22, y: y + d * 0.22, w: d * 0.56, h: d * 0.56, objectName: obj, altText: n });
}
const numero = (s, n, x, y, d, obj) => s.addText(String(n), { shape: pres.shapes.OVAL, x, y, w: d, h: d, fill: { color: COR.accent }, line: { color: COR.accent, width: 0 }, margin: 0, align: 'center', valign: 'middle', fontFace: FONTE_TITULO, fontSize: 24, bold: true, color: COR.accentInk, objectName: obj });
// Linhas que um texto ocupa numa largura (Arial: ~0,0078" por caracter e por ponto; Courier: 0,0083").
const linhas = (t, w, fs, k = 0.0078) => String(t).split('\n').reduce((n, l) => n + Math.max(1, Math.ceil((l.length * fs * k) / w)), 0);
// No codigo uma linha longa parte nos espacos (a palavra que nao cabe desce inteira): simula-se a quebra por palavras.
const linhasCodigo = (t, w, fs) => {
  const max = Math.max(8, Math.floor(w / (fs * 0.0083)));
  return String(t).split('\n').reduce((n, l) => {
    let k = 1;
    let col = 0;
    for (const p of l.split(' ')) {
      const len = p.length + (col ? 1 : 0);
      if (col + len <= max) col += len;
      else if (p.length > max) { k += Math.ceil((col + len) / max) - 1; col = (col + len) % max; }
      else { k++; col = p.length; }
    }
    return n + k;
  }, 0);
};

// A etiqueta do topo: "Faz agora · 4 min", "Missão M3 · 2 min"… e o bloco a direita.
function etiqueta(s, d) {
  const tipo = d.tipo === 'missao' ? `${T.tipo.missao} ${d.id}` : d.faz ? T.tipo.faca : T.tipo[d.tipo] || '';
  const extra = d.preve ? ` + ${T.tipo.preve}` : '';
  const t = `${tipo}${extra} · ${minutos(d.min)} min`;
  const w = 0.6 + t.length * 0.19;
  caixa(s, M, 0.45, w, 0.55, d.tipo === 'painel' ? COR.laranja : d.tipo === 'conceito' && !d.faz ? COR.ink : COR.accent, 'tag');
  texto(s, t, { x: M + 0.2, y: 0.45, w: w - 0.3, h: 0.55, fontSize: 24, bold: true, color: COR.accentInk, valign: 'middle', wrap: false, objectName: 'tag-label' });
  if (d.saltar) {
    caixa(s, M + w + 0.2, 0.45, 2.6, 0.55, COR.ink, 'skip');
    texto(s, T.saltar, { x: M + w + 0.35, y: 0.45, w: 2.4, h: 0.55, fontSize: 20, semMinimo: true, bold: true, color: COR.escuroInk, valign: 'middle', objectName: 'skip-label' });
  }
  texto(s, d.bloco, { x: W - M - 4, y: 0.45, w: 4, h: 0.5, fontSize: 24, color: COR.muted, align: 'right', valign: 'middle', objectName: 'block' });
}

function blocoCodigo(s, x, y, w, h, cmd, rotulo) {
  caixa(s, x, y, w, h, COR.ink, 'code-background');
  let yy = y + 0.2;
  if (rotulo) {
    texto(s, rotulo, { x: x + 0.3, y: yy, w: w - 0.6, h: 0.4, fontSize: 20, semMinimo: true, bold: true, color: COR.lilas, objectName: 'code-label' });
    yy += 0.5;
  }
  const disp = h - (yy - y) - 0.15;
  let fs = 26;
  while (fs > 14 && linhasCodigo(cmd, w - 0.6, fs) * fs * 0.0195 > disp) fs--;
  pequeno(fs, CODIGO_MIN, 'codigo');
  texto(s, cmd, { x: x + 0.3, y: yy, w: w - 0.6, h: disp, fontFace: FONTE_CODIGO, fontSize: fs, semMinimo: true, color: COR.escuroInk, objectName: 'code', paraSpaceAfter: 0 });
}
const alturaCodigo = (cmd, w, rotulo, fs = 22) => 0.35 + (rotulo ? 0.5 : 0) + linhasCodigo(cmd, w - 0.6, fs) * fs * 0.0195;

// O pe dos slides de fazer: a frase do painel (opcional) e o "Resultado esperado".
function pe(s, d, y) {
  if (d.painel) {
    caixa(s, M, y, W - 2 * M, 0.7, COR.laranja, 'panel-cue');
    icone(s, 'arrow-right', W - M - 0.62, y + 0.1, 0.5, COR.ink, 'panel-cue-arrow');
    texto(s, sub(d.painel), { x: M + 0.25, y, w: W - 2 * M - 1.1, h: 0.7, fontSize: 24, bold: true, color: COR.accentInk, valign: 'middle', objectName: 'panel-cue-text' });
    y += 0.95;
  }
  if (d.esperado) {
    icone(s, 'check', M, y + 0.05, 0.55, COR.verde, 'expected-mark');
    texto(s, [{ text: T.esperado, options: { bold: true } }, { text: sub(d.esperado) }], { x: M + 0.8, y, w: W - 2 * M - 0.8, h: RODAPE_Y - y - 0.15, fontSize: 24, objectName: 'expected' });
  }
}

// Faz agora e Missao: passos numerados, os comandos, a previsao (opcional) e o pe.
function fazer(s, d, y0) {
  const passos = d.passos.map(sub);
  passos.forEach((p, i) => {
    numero(s, i + 1, M, y0 + i * 0.72, 0.52, `step-number-${i}`);
    texto(s, p, { x: M + 0.75, y: y0 + i * 0.72, w: W - 2 * M - 0.75, h: 0.55, fontSize: 26, valign: 'middle', objectName: `step-${i}` });
  });
  let y = y0 + passos.length * 0.72 + 0.25;
  const pes = (d.painel ? 0.95 : 0) + (d.esperado ? 0.95 : 0) + (d.preve ? 1.55 : 0);
  const fim = RODAPE_Y - 0.25 - pes;
  const cmds = d.comandos.map((c) => ({ ...c, cmd: sub(c.cmd) }));
  // lado a lado quando ha 2 comandos curtos (Mac e Windows), senao um por baixo do outro
  const lado = cmds.length === 2 && cmds.every((c) => Math.max(...c.cmd.split('\n').map((l) => l.length)) <= 46);
  if (lado) {
    const w = (W - 2 * M - 0.3) / 2;
    const h = Math.min(fim - y, Math.max(...cmds.map((c) => alturaCodigo(c.cmd, w, c.rotulo))));
    cmds.forEach((c, i) => blocoCodigo(s, M + i * (w + 0.3), y, w, h, c.cmd, c.rotulo));
    y += h + 0.25;
  } else {
    const altos = cmds.map((c) => alturaCodigo(c.cmd, W - 2 * M, c.rotulo));
    const k = Math.min(1, (fim - y - 0.2 * (cmds.length - 1)) / altos.reduce((a, b) => a + b, 0));
    cmds.forEach((c, i) => {
      const h = altos[i] * k;
      blocoCodigo(s, M, y, W - 2 * M, h, c.cmd, c.rotulo);
      y += h + 0.2;
    });
    y += 0.05;
  }
  if (d.preve) {
    caixa(s, M, y, W - 2 * M, 1.3, COR.surface, 'predict');
    icone(s, 'clock', M + 0.25, y + 0.3, 0.7, COR.laranja, 'predict-icon');
    texto(s, sub(d.preve.pergunta), { x: M + 1.2, y: y + 0.15, w: W - 2 * M - 1.4, h: 0.6, fontFace: FONTE_TITULO, fontSize: 30, bold: true, objectName: 'predict-question' });
    texto(s, sub(d.preve.onde), { x: M + 1.2, y: y + 0.75, w: W - 2 * M - 1.4, h: 0.45, fontSize: 24, color: COR.muted, objectName: 'predict-where' });
    y += 1.55;
  }
  pe(s, d, Math.max(y, fim));
}

const R = {
  titulo(s, d) {
    s.addText(d.titulo, { placeholder: 'title' });
    if (d.subtitulo) s.addText(sub(d.subtitulo), { placeholder: 'body' });
  },
  perguntas(s, d) {
    s.addText(d.titulo, { placeholder: 'title' });
    if (d.subtitulo) s.addText(sub(d.subtitulo), { placeholder: 'body' });
    if (d.rodape) texto(s, sub(d.rodape), { x: M, y: 7.1, w: W - 2 * M, h: 0.5, fontSize: 24, color: COR.escuroMuted, align: 'center', objectName: 'footer' });
  },
  regras(s, d) {
    s.addText(d.titulo, { placeholder: 'title' });
    texto(s, T.custoTitulo, { x: M, y: 2.95, w: 6, h: 0.5, fontFace: FONTE_TITULO, fontSize: 28, bold: true, objectName: 'cost-head' });
    const n = d.custo.length;
    const w = (W - 2 * M - 0.3 * (n - 1)) / n;
    d.custo.forEach((c, i) => {
      const x = M + i * (w + 0.3);
      caixa(s, x, 3.6, w, 2.6, i === 0 ? COR.ink : COR.surface, `cost-${i}`);
      texto(s, c.valor, { x: x + 0.3, y: 3.8, w: w - 0.6, h: 1.1, fontFace: FONTE_TITULO, fontSize: 50, bold: true, wrap: false, color: i === 0 ? COR.escuroInk : COR.ink, objectName: `cost-value-${i}` });
      texto(s, sub(c.rotulo), { x: x + 0.3, y: 5.0, w: w - 0.6, h: 1.1, fontSize: 24, color: i === 0 ? COR.escuroMuted : COR.muted, objectName: `cost-label-${i}` });
    });
    texto(s, T.painelVeTitulo, { x: M, y: 6.6, w: 8, h: 0.5, fontFace: FONTE_TITULO, fontSize: 28, bold: true, objectName: 'sees-head' });
    d.painelVe.forEach((t, i) => {
      const y = 7.3 + i * 0.8;
      const nao = i === 2;
      const apaga = i === d.painelVe.length - 1;
      icone(s, nao ? 'x' : apaga ? 'trash-2' : 'eye', M, y, 0.55, nao ? COR.vermelho : apaga ? COR.ink : COR.accent, `sees-mark-${i}`);
      texto(s, sub(t), { x: M + 0.8, y, w: W - 2 * M - 0.8, h: 0.55, fontSize: 26, valign: 'middle', objectName: `sees-${i}` });
    });
  },
  faca(s, d) {
    etiqueta(s, d);
    s.addText(d.titulo, { placeholder: 'title' });
    let y = 2.55;
    if (d.intro) {
      texto(s, sub(d.intro), { x: M, y, w: W - 2 * M, h: 0.6, fontSize: 24, color: COR.muted, objectName: 'intro' });
      y += 0.75;
    }
    fazer(s, d, y);
  },
  missao(s, d) {
    etiqueta(s, d);
    s.addText(d.titulo, { placeholder: 'title' });
    const c = sub(d.conceito);
    const h = 0.3 + linhas(c, W - 2 * M - 1.6, 28) * 0.47;
    caixa(s, M, 2.5, W - 2 * M, h, COR.ink, 'concept');
    icone(s, 'lightbulb', M + 0.3, 2.5 + (h - 0.7) / 2, 0.7, COR.accent, 'concept-icon');
    texto(s, c, { x: M + 1.25, y: 2.5, w: W - 2 * M - 1.5, h, fontFace: FONTE_TITULO, fontSize: 28, color: COR.escuroInk, valign: 'middle', objectName: 'concept-text' });
    fazer(s, d, 2.5 + h + 0.4);
  },
  decide(s, d) {
    etiqueta(s, d);
    s.addText(d.titulo, { placeholder: 'title' });
    texto(s, sub(d.pergunta), { x: M, y: 2.55, w: W - 2 * M, h: 0.6, fontSize: 28, bold: true, objectName: 'question' });
    const n = d.opcoes.length;
    const w = (W - 2 * M - 0.35 * (n - 1)) / n;
    const y = 3.45;
    const h = 5.0;
    // a descricao das opcoes comeca a mesma altura em todas (a do titulo mais alto)
    const ht = Math.max(...d.opcoes.map((o) => linhas(sub(o.titulo), w - 0.6, 30, 0.0105))) * 0.5 + 0.1;
    d.opcoes.forEach((o, i) => {
      const x = M + i * (w + 0.35);
      caixa(s, x, y, w, h, COR.surface, `option-${i}`);
      numero(s, i + 1, x + 0.3, y + 0.3, 0.6, `option-number-${i}`);
      texto(s, sub(o.titulo), { x: x + 0.3, y: y + 1.1, w: w - 0.6, h: ht, fontFace: FONTE_TITULO, fontSize: 30, bold: true, objectName: `option-title-${i}` });
      texto(s, sub(o.efeito), { x: x + 0.3, y: y + 1.2 + ht, w: w - 0.6, h: h - 2.4 - ht, fontSize: 24, color: COR.muted, objectName: `option-effect-${i}` });
      blocoCodigo(s, x + 0.2, y + h - 1.0, w - 0.4, 0.8, sub(o.cmd));
    });
    let yy = y + h + 0.35;
    if (d.rodape) {
      const r = sub(d.rodape);
      const hr = linhas(r, W - 2 * M, 24) * 0.42 + 0.1;
      texto(s, r, { x: M, y: yy, w: W - 2 * M, h: hr, fontSize: 24, objectName: 'footer' });
      yy += hr + 0.3;
    }
    pe(s, d, Math.max(yy, RODAPE_Y - 1.2));
  },
  // Conceito: a ideia num paragrafo e 2 a 5 blocos numerados; com faz, tambem o comando e o resultado esperado.
  conceito(s, d) {
    etiqueta(s, d);
    s.addText(d.titulo, { placeholder: 'title' });
    let y = 2.55;
    if (d.intro) {
      const t = sub(d.intro);
      const h = linhas(t, W - 2 * M, 28) * 0.47 + 0.1;
      texto(s, t, { x: M, y, w: W - 2 * M, h, fontSize: 28, color: COR.muted, objectName: 'intro' });
      y += h + 0.3;
    }
    const pes = (d.esperado ? 0.95 : 0) + (d.rodape ? 1.2 : 0);
    const cmds = (d.comandos || []).map((c) => ({ ...c, cmd: sub(c.cmd) }));
    const hc = cmds.reduce((a, c) => a + alturaCodigo(c.cmd, W - 2 * M, c.rotulo) + 0.2, 0);
    const livre = RODAPE_Y - 0.3 - pes - hc - y;
    const alto = Math.min(1.75, livre / d.blocos.length);
    d.blocos.forEach((b, i) => {
      const yy = y + i * alto;
      caixa(s, M, yy, W - 2 * M, alto - 0.18, COR.surface, `block-${i}`);
      numero(s, i + 1, M + 0.25, yy + (alto - 0.18 - 0.6) / 2, 0.6, `block-number-${i}`);
      texto(s, [{ text: `${sub(b.titulo)}  `, options: { bold: true, fontFace: FONTE_TITULO } }, { text: sub(b.texto) }], { x: M + 1.1, y: yy, w: W - 2 * M - 1.35, h: alto - 0.18, fontSize: 26, valign: 'middle', objectName: `block-text-${i}` });
    });
    y += d.blocos.length * alto + 0.15;
    for (const c of cmds) {
      const h = alturaCodigo(c.cmd, W - 2 * M, c.rotulo);
      blocoCodigo(s, M, y, W - 2 * M, h, c.cmd, c.rotulo);
      y += h + 0.2;
    }
    if (d.rodape) {
      caixa(s, M, y, W - 2 * M, 1.0, COR.ink, 'takeaway');
      texto(s, sub(d.rodape), { x: M + 0.3, y, w: W - 2 * M - 0.6, h: 1.0, fontFace: FONTE_TITULO, fontSize: 26, color: COR.escuroInk, valign: 'middle', objectName: 'takeaway-text' });
      y += 1.2;
    }
    pe(s, d, Math.max(y, RODAPE_Y - 0.95));
  },
  painel(s, d) {
    etiqueta(s, d);
    s.addText(d.titulo, { placeholder: 'title' });
    const p = sub(d.pergunta);
    const hp = linhas(p, W - 2 * M - 2.2, 48, 0.0105) * 0.8 + 0.2;
    // um titulo de duas linhas empurra a pergunta para baixo
    const y0 = linhas(d.titulo, W - 2 * M, 44, 0.0072) > 1 ? 3.1 : 2.55;
    texto(s, p, { x: M, y: y0, w: W - 2 * M - 2.2, h: hp, fontFace: FONTE_TITULO, fontSize: 48, bold: true, objectName: 'question' });
    // a seta grande para o painel, a direita
    icone(s, 'arrow-right', W - M - 1.4, y0 + 0.05, 1.4, COR.laranja, 'panel-arrow');
    texto(s, T.painelSeta, { x: W - M - 2.2, y: y0 + 1.55, w: 2.2, h: 0.9, fontSize: 24, bold: true, color: COR.laranja, align: 'center', objectName: 'panel-arrow-label' });
    let y = y0 + hp + 0.2;
    if (d.apoio) {
      const a = sub(d.apoio);
      const ha = linhas(a, W - 2 * M - 2.2, 28, 0.0085) * 0.47 + 0.1;
      texto(s, a, { x: M, y, w: W - 2 * M - 2.2, h: ha, fontSize: 28, color: COR.muted, objectName: 'support' });
      y += ha + 0.25;
    }
    if (d.ideias) {
      texto(s, T.ideias, { x: M, y, w: 8, h: 0.55, fontFace: FONTE_TITULO, fontSize: 30, bold: true, objectName: 'ideas-head' });
      y += 0.8;
      d.ideias.forEach((t, i) => {
        numero(s, i + 1, M, y, 0.6, `idea-number-${i}`);
        texto(s, sub(t), { x: M + 0.85, y, w: W - 2 * M - 0.85, h: 0.6, fontSize: 30, bold: true, valign: 'middle', objectName: `idea-${i}` });
        y += 0.95;
      });
    }
    for (const c of d.comandos || []) {
      const cmd = sub(c.cmd);
      const h = Math.min(RODAPE_Y - 0.3 - y, alturaCodigo(cmd, W - 2 * M, c.rotulo));
      blocoCodigo(s, M, y, W - 2 * M, h, cmd, c.rotulo);
      y += h + 0.25;
    }
  },
};
const MASTER = { titulo: 'V2-TITLE', perguntas: 'V2-CLOSING' };

// As notas pela ordem da seccao 8.4: objetivo, o que dizer, olha para o painel, falhas e relogio.
function notas(d, cab, relogioIni) {
  const n = d.notas || {};
  const L = T.rot;
  const out = [cab, '', `${L.objetivo}: ${sub(n.objetivo || '')}`];
  if (n.dizer?.length) out.push('', `${L.dizer}:`, ...n.dizer.map((x) => `- ${sub(x)}`));
  if (n.painel?.length) out.push('', `${L.painel}:`, ...n.painel.map((x) => `- ${sub(x)}`));
  if (n.falhas?.length) out.push('', `${L.falhas}:`, ...n.falhas.map((f) => `- ${sub(f.falha)} → ${sub(f.resposta)}`));
  out.push('', `${L.relogio}: ${T.estarAqui(Math.round(relogioIni))}.`);
  return out.join('\n');
}

// A forma de um slide para o palco (o desenho em HTML quando nao ha imagens, e as notas).
function paraPalco(d, i, cab, nota) {
  const c = (x) => (Array.isArray(x) ? x.map(c) : x && typeof x === 'object' ? Object.fromEntries(Object.entries(x).map(([k, v]) => [k, c(v)])) : sub(x));
  const { notas: _n, ...resto } = d;
  return { ...c(resto), n: i + 1, cab, notas: nota, rotulo: d.tipo === 'missao' ? `${T.tipo.missao} ${d.id}` : d.faz ? T.tipo.faca : T.tipo[d.tipo] || '' };
}

async function construir(lingua, bg) {
  T = TEXTOS[lingua];
  V = valores();
  pres = novaApresentacao(bg);
  const { SLIDES } = await import(T.conteudo);
  let relogio = 0;
  let bloco = null;
  const md = T.notasCab(T.titulo);
  const detalhe = [];
  const palco = [];
  SLIDES.forEach((d, i) => {
    SLIDE_ATUAL = `${lingua} ${i + 1}. ${d.titulo}`;
    if (d.bloco !== bloco) {
      pres.addSection({ title: d.bloco });
      bloco = d.bloco;
    }
    const s = pres.addSlide({ masterName: MASTER[d.tipo] || 'V2-CONTENT', sectionTitle: d.bloco });
    (R[d.tipo] || R.faca)(s, d);
    const ini = relogio;
    relogio += d.min;
    const cab = `[${mmss(ini)} → ${mmss(relogio)}] ${minutos(d.min)} min · ${d.fase}${d.saltar ? ` · ${T.saltar}` : ''}`;
    const nota = notas(d, cab, ini);
    s.addNotes(nota);
    md.push(`| ${i + 1} | ${minutos(d.min)} | ${mmss(ini)} | ${d.bloco} | ${d.fase} | ${d.tipo === 'missao' ? d.id : T.tipo[d.tipo] || '—'} | ${d.titulo} |`);
    detalhe.push(`### ${i + 1}. ${d.titulo}`, '', nota, '');
    palco.push(paraPalco(d, i, cab, nota));
  });
  if (Math.abs(relogio - 90) > 0.01) console.warn(T.aviso(relogio));
  if (FALTAM.size) console.warn(`AVISO: {{...}} sem valor: ${[...FALTAM].join(', ')}`);
  for (const p of PEQUENOS.splice(0)) console.warn(`AVISO: letra pequena: ${p}`);
  FALTAM.clear();
  md.push('', T.total(relogio), '', T.porSlide, '', ...detalhe);
  await pres.writeFile({ fileName: join(AQUI, T.pptx) });
  writeFileSync(join(AQUI, T.notas), md.join('\n') + '\n');
  console.log(`${T.pptx}: ${SLIDES.length} slides, ${relogio} min · ${T.notas}`);
  return palco;
}

// --png: as imagens dos slides para slides/palco/<lingua>/NN.png (1280 x 1080). O LibreOffice converte o .pptx em PDF
// (o soffice local, ou a imagem Docker ws-libreoffice: docker build --platform linux/amd64 -t ws-libreoffice
// slides/libreoffice) e o
// pdftoppm (poppler) faz uma imagem por pagina.
function exportarPng(lingua) {
  const pptx = TEXTOS[lingua].pptx;
  const tmp = join(BUILD, `png-${lingua}`);
  rmSync(tmp, { recursive: true, force: true });
  mkdirSync(tmp, { recursive: true });
  const local = ['soffice', '/Applications/LibreOffice.app/Contents/MacOS/soffice'].find((b) => {
    try {
      execFileSync(b, ['--version'], { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  });
  if (local) execFileSync(local, ['--headless', '--convert-to', 'pdf', '--outdir', tmp, join(AQUI, pptx)], { stdio: 'inherit', timeout: 600000 });
  // no Docker converte-se uma copia dentro do container: o lock do LibreOffice na pasta montada do Mac fica parado
  else execFileSync('docker', ['run', '--rm', '--platform', 'linux/amd64', '-e', 'HOME=/tmp', '-v', `${AQUI}:/w`, process.env.SLIDES_LO_IMAGE || 'ws-libreoffice', 'sh', '-c', `cp /w/${pptx} /tmp/ && cd /tmp && soffice --headless --norestore --convert-to pdf --outdir /tmp/out /tmp/${pptx} && cp /tmp/out/*.pdf /w/build/png-${lingua}/`], { stdio: 'inherit', timeout: 900000 });
  const pdf = join(tmp, pptx.replace(/\.pptx$/, '.pdf'));
  execFileSync('pdftoppm', ['-png', '-r', '96', pdf, join(tmp, 's')], { stdio: 'inherit' });
  const pngs = readdirSync(tmp).filter((f) => /^s-\d+\.png$/.test(f)).sort((a, b) => Number(a.match(/(\d+)/)[1]) - Number(b.match(/(\d+)/)[1]));
  const dest = join(AQUI, 'palco', lingua);
  rmSync(dest, { recursive: true, force: true });
  mkdirSync(dest, { recursive: true });
  pngs.forEach((f, i) => renameSync(join(tmp, f), join(dest, `${String(i + 1).padStart(2, '0')}.png`)));
  console.log(`palco/${lingua}: ${pngs.length} imagens`);
}

function palcoHtml(decks) {
  const imagens = Object.fromEntries(Object.keys(decks).map((l) => [l, existsSync(join(AQUI, 'palco', l)) ? readdirSync(join(AQUI, 'palco', l)).filter((f) => f.endsWith('.png')).length : 0]));
  const dados = { decks, imagens, panelPage: V.PANEL_PAGE_URL || '', panelApi: V.PANEL_URL || '' };
  const tpl = readFileSync(join(AQUI, 'palco.template.html'), 'utf8');
  writeFileSync(join(AQUI, 'palco.html'), tpl.replace('/*DADOS*/null', JSON.stringify(dados).replace(/</g, '\\u003c')));
  console.log(`palco.html: ${Object.entries(imagens).map(([l, n]) => `${l} ${n ? `${n} imagens` : 'em HTML'}`).join(', ')}`);
}

const args = process.argv.slice(2);
const k = args.findIndex((a) => a === '--lingua' || a.startsWith('--lingua='));
const pedida = k < 0 ? null : args[k].includes('=') ? args[k].split('=')[1] : args[k + 1];
if (k >= 0 && !TEXTOS[pedida]) {
  console.error('Uso / usage: node build-v2.mjs [--lingua pt|en] [--png]');
  process.exit(2);
}
await icones();
const bg = await fundos();
const decks = {};
for (const l of pedida ? [pedida] : Object.keys(TEXTOS)) {
  decks[l] = await construir(l, bg);
  if (args.includes('--png')) exportarPng(l);
}
palcoHtml(decks);
