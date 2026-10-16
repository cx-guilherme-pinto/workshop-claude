#!/usr/bin/env node
// Gera a apresentacao em portugues e em ingles a partir de content.mjs / content.en.mjs + repos.conf + benchmark:
//   pt: slides/workshop.pptx    + slides/speaker-notes.md
//   en: slides/workshop.en.pptx + slides/speaker-notes.en.md
//   cd slides && npm install && node build.mjs [--lingua pt|en]    (sem --lingua: as duas)
// Ferramenta do organizador. Os comandos e URLs vem SEMPRE do repos.conf (installer/lib/conf.mjs).
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import pptxgen from 'pptxgenjs';
import { loadConf, derived } from '../installer/lib/conf.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const KIT = join(AQUI, '..');

// ---------- Textos fixos de cada lingua (o resto vem do content) ----------
const TEXTOS = {
  pt: {
    conteudo: './content.mjs', pptx: 'workshop.pptx', notas: 'speaker-notes.md',
    titulo: 'Orquestração de agentes com Claude',
    decimal: ',',
    porMedir: 'a medir', porGravar: 'a gravar', pesoOrq: 'a maior parte',
    ondas: [
      ['Onda 1', 'lib-hash e 15 cartões'],
      ['Onda 2', 'categorias e pontuação'],
      ['Onda 3', 'integração e suite'],
      ['Onda 4', 'revisão e veredito'],
    ],
    legendaDag: 'Cinzento: à espera. Os 3 de criptografia arrancam quando o lib-hash fica verde.',
    agendaFim: '90′ e depois perguntas, sem limite',
    faca: (min) => `Faça agora · ${min} min`,
    esperado: 'Resultado esperado: ',
    videoFalta: 'Vídeo por gravar: tools/record (modo apresentador)',
    imagemFalta: (m) => `Captura por gerar: ${m}`,
    saltar: 'PODE SALTAR',
    estarAqui: (m) => `deves estar aqui aos ${m} min`,
    notasCab: (t) => [`# Notas do apresentador — ${t}`, '', 'Relógio acumulado: "deves estar aqui aos X min". Os slides marcados com **PODE SALTAR** saltam-se se houver atraso.', '', '| # | min | relógio | secção | slide | saltar |', '|---|---|---|---|---|---|'],
    total: (m) => `Total: ${m} min.`,
    porSlide: '## Notas por slide',
    aviso: (m) => `AVISO: a apresentação soma ${m} min (devia ser 90).`,
  },
  en: {
    conteudo: './content.en.mjs', pptx: 'workshop.en.pptx', notas: 'speaker-notes.en.md',
    titulo: 'Agent orchestration with Claude',
    decimal: '.',
    porMedir: 'to be measured', porGravar: 'to be recorded', pesoOrq: 'most',
    ondas: [
      ['Wave 1', 'lib-hash and 15 cards'],
      ['Wave 2', 'categories and scoring'],
      ['Wave 3', 'integration and suite'],
      ['Wave 4', 'review and verdict'],
    ],
    legendaDag: 'Grey: waiting. The 3 cryptography cards start when lib-hash turns green.',
    agendaFim: '90′, then questions, no time limit',
    faca: (min) => `Do it now · ${min} min`,
    esperado: 'Expected result: ',
    videoFalta: 'Video not recorded yet: tools/record (presenter mode)',
    imagemFalta: (m) => `Screenshot not generated yet: ${m}`,
    saltar: 'CAN SKIP',
    estarAqui: (m) => `you should be here at ${m} min`,
    notasCab: (t) => [`# Speaker notes — ${t}`, '', 'Running clock: "you should be here at X min". Slides marked **CAN SKIP** can be skipped if you are running late.', '', '| # | min | clock | section | slide | skip |', '|---|---|---|---|---|---|'],
    total: (m) => `Total: ${m} min.`,
    porSlide: '## Notes per slide',
    aviso: (m) => `WARNING: the presentation adds up to ${m} min (should be 90).`,
  },
};

// ---------- Paleta e letras: o modelo de apresentacao da Checkmarx (slides/modelo/) ----------
// As cores de estado (cinza, amarelo, verde, vermelho) sao as da grelha da Arena e ficam como estao.
const COR = {
  bg: 'FCF9FE', surface: 'F4EFFE', surface2: 'EBDDFA', ink: '140920', muted: '4A405A',
  accent: '6B34FD', accentInk: 'FFFFFF', roxo2: '8F23D7', laranja: 'F25928', lilas: '93A7FF',
  escuro: '140920', escuroSurface: '231338', escuroInk: 'FCF9FE', escuroMuted: 'B9AEDB',
  cinza: 'C4C7C1', amarelo: 'F1C232', verde: '1E9E57', vermelho: 'D2463F',
};
const FONTE_TITULO = 'Founders Grotesk Medium';
const FONTE_TEXTO = 'Arial';
const FONTE_CODIGO = 'Courier New';
const W = 13.333;
const H = 7.5;
const M = 0.6;

// Estado da lingua que esta a ser construida (as linguas constroem-se uma de cada vez).
let T; // textos fixos
let V; // valores {{...}}
let pres;

// ---------- Valores dinamicos ----------
function valores() {
  const d = derived(loadConf());
  const pricing = JSON.parse(readFileSync(join(KIT, 'pricing.json'), 'utf8'));
  // Separador decimal da lingua: "US$ 0,003" em pt, "US$ 0.003" em en.
  const dec = (s) => String(s).replace(/(\d)[.,](\d)/g, `$1${T.decimal}$2`);
  const v = {
    CHECK_MAC: d.CHECK_MAC,
    CHECK_WIN: d.CHECK_WINDOWS,
    DOCTOR_MAC: d.DOCTOR_MAC,
    DOCTOR_WIN: d.DOCTOR_WINDOWS,
    ONE_LINER_MAC: d.ONE_LINER_MAC,
    ONE_LINER_WIN: d.ONE_LINER_WINDOWS,
    WORKSHOP_REPO: d.WORKSHOP_REPO_URL.replace(/\.git$/, ''),
    WORKSHOP_VERSION: d.WORKSHOP_VERSION,
    PRICING_DATA: pricing.consultado_em,
    PRICING_URL: String(pricing.fonte || '').replace(/^https?:\/\//, ''),
    BENCH_N: '10', BENCH_MEDIA: T.porMedir, BENCH_MAX: T.porMedir,
    CUSTO_CARTAO: dec('US$ 0.003'), PESO_ORQ: T.pesoOrq, ESTIMATIVA: 'US$ 2',
    APRES_DURACAO: T.porGravar, APRES_CUSTO: T.porMedir, APRES_AGENTES: '100',
  };
  const usd = (x) => 'US$ ' + dec(Number(x).toFixed(2));
  const csv = join(KIT, 'benchmark', 'results.csv');
  if (existsSync(csv)) {
    const [cab, ...ls] = readFileSync(csv, 'utf8').trim().split('\n');
    const k = cab.split(',');
    const rows = ls.map((l) => Object.fromEntries(l.split(',').map((x, i) => [k[i], x])));
    const part = rows.filter((r) => r.modo === 'participante').map((r) => Number(r.custo_total));
    if (part.length) {
      v.BENCH_N = String(part.length);
      v.BENCH_MEDIA = usd(part.reduce((s, x) => s + x, 0) / part.length);
      v.BENCH_MAX = usd(Math.max(...part));
    }
  }
  const dados = join(AQUI, 'dados.json'); // escrito depois do benchmark/gravacao (numeros como em pt: "US$ 0,0017")
  if (existsSync(dados)) for (const [k, x] of Object.entries(JSON.parse(readFileSync(dados, 'utf8')))) v[k] = dec(x);
  return v;
}

const sub = (s) => (typeof s === 'string' ? s.replace(/\{\{(\w+)\}\}/g, (_, k) => V[k] ?? `{{${k}}}`) : s);

// ---------- Apresentacao e layouts ----------
function novaApresentacao() {
  const p = new pptxgen();
  p.layout = 'LAYOUT_WIDE';
  p.title = T.titulo;
  p.author = 'Workshop Claude';
  p.theme = { headFontFace: FONTE_TITULO, bodyFontFace: FONTE_TEXTO };

  const MOD = (n) => join(AQUI, 'modelo', n);
  // Rodape do modelo: barra escura com o logotipo branco e o numero do slide.
  const rodape = [
    { rect: { x: 0, y: 6.915, w: W, h: 0.585, fill: { color: COR.escuro }, line: { color: COR.escuro, width: 0 } } },
    { image: { x: 0.517, y: 7.171, w: 0.821, h: 0.103, path: MOD('logo-branco.png') } },
  ];
  const numero = { x: W - 3.5, y: 7.07, w: 3.0, h: 0.28, fontFace: FONTE_TEXTO, fontSize: 9, color: COR.escuroInk, align: 'right' };
  p.defineSlideMaster({
    title: 'TITULO',
    background: { path: MOD('fundo-titulo.png') },
    objects: [
      { image: { x: 0.673, y: 0.669, w: 2.31, h: 0.289, path: MOD('logo-branco.png') } },
      ...rodape,
      { placeholder: { options: { name: 'title', type: 'title', x: 0.673, y: 1.45, w: 9.6, h: 2.2, fontFace: FONTE_TITULO, fontSize: 48, color: COR.escuroInk, valign: 'bottom', align: 'left', margin: 0 }, text: '' } },
      { placeholder: { options: { name: 'body', type: 'body', x: 0.673, y: 3.8, w: 9.6, h: 1.2, fontFace: FONTE_TITULO, fontSize: 26, color: COR.laranja, valign: 'top', align: 'left', margin: 0 }, text: '' } },
    ],
    slideNumber: numero,
  });
  p.defineSlideMaster({
    title: 'FECHO',
    background: { path: MOD('fundo-fecho.png') },
    objects: [
      { image: { x: W / 2 - 1.25, y: 5.55, w: 2.5, h: 0.3125, path: MOD('logo-branco.png') } },
      { placeholder: { options: { name: 'title', type: 'title', x: 1, y: 2.2, w: W - 2, h: 1.6, fontFace: FONTE_TITULO, fontSize: 60, color: COR.escuroInk, valign: 'bottom', align: 'center', margin: 0 }, text: '' } },
      { placeholder: { options: { name: 'body', type: 'body', x: 1, y: 3.9, w: W - 2, h: 0.9, fontFace: FONTE_TITULO, fontSize: 28, color: COR.laranja, valign: 'top', align: 'center', margin: 0 }, text: '' } },
    ],
  });
  p.defineSlideMaster({
    title: 'SECCAO',
    background: { path: MOD('fundo-seccao.png') },
    objects: [
      { image: { x: 0.783, y: 0.669, w: 2.31, h: 0.289, path: MOD('logo-roxo.png') } },
      { placeholder: { options: { name: 'title', type: 'title', x: 0.783, y: 1.15, w: 8.2, h: 1.7, fontFace: FONTE_TITULO, fontSize: 46, color: COR.ink, valign: 'top', align: 'left', margin: 0 }, text: '' } },
      { placeholder: { options: { name: 'body', type: 'body', x: 0.783, y: 2.95, w: 6.4, h: 1.2, fontFace: FONTE_TEXTO, fontSize: 20, color: COR.muted, valign: 'top', align: 'left', margin: 0 }, text: '' } },
    ],
  });
  p.defineSlideMaster({
    title: 'CONTEUDO',
    background: { color: COR.bg },
    objects: [
      ...rodape,
      { placeholder: { options: { name: 'title', type: 'title', x: 0.673, y: 0.45, w: W - 1.35, h: 0.95, fontFace: FONTE_TITULO, fontSize: 32, color: COR.ink, valign: 'top', align: 'left', margin: 0 }, text: '' } },
    ],
    slideNumber: numero,
  });
  p.defineSlideMaster({
    title: 'FACA',
    background: { color: COR.surface },
    objects: [
      ...rodape,
      { placeholder: { options: { name: 'title', type: 'title', x: M, y: 0.98, w: W - 2 * M, h: 0.95, fontFace: FONTE_TITULO, fontSize: 34, color: COR.ink, valign: 'top', align: 'left', margin: 0 }, text: '' } },
    ],
    slideNumber: numero,
  });
  return p;
}

// ---------- Pecas ----------
const quadrado = (s, x, y, lado, cor, nome) => s.addShape(pres.shapes.RECTANGLE, { x, y, w: lado, h: lado, fill: { color: cor }, line: { color: cor, width: 0 }, objectName: nome || 'quadrado' });
const texto = (s, t, o) => s.addText(t, { isTextBox: true, margin: 0, fontFace: FONTE_TEXTO, color: COR.ink, valign: 'top', ...o });
const corDe = (n) => ({ verde: COR.verde, amarelo: COR.amarelo, vermelho: COR.vermelho, cinza: COR.cinza, accent: COR.accent, roxo2: COR.roxo2, laranja: COR.laranja })[n] || COR.ink;

// Motivo: grelha de quadrados de estado, como o /estado.
function grelhaEstado(s, x, y, cols, rows, lado, gap, padrao) {
  const cores = [COR.verde, COR.verde, COR.amarelo, COR.verde, COR.cinza, COR.verde, COR.vermelho, COR.verde, COR.amarelo, COR.cinza];
  let i = 0;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    quadrado(s, x + c * (lado + gap), y + r * (lado + gap), lado, padrao ? padrao[i % padrao.length] : cores[(r * 7 + c * 3) % cores.length], `estado-${r}-${c}`);
    i++;
  }
}

function linhasCodigo(codigo) {
  return codigo.split('\n').length;
}
function fonteCodigo(codigo, w) {
  const longo = Math.max(...codigo.split('\n').map((l) => l.length));
  // ~0.0083" por caracter a 1pt em Courier New; deixa partir linhas muito longas (soft wrap).
  return Math.max(14, Math.min(20, Math.floor((w - 0.5) / (Math.min(longo, 70) * 0.0083))));
}
// Linhas que um texto ocupa com porLinha caracteres: as linhas longas partem nos espacos, o que gasta mais uma.
const partidas = (codigo, porLinha) => codigo.split('\n').reduce((n, l) => n + (l.length <= porLinha ? 1 : Math.ceil(l.length / porLinha) + 1), 0);
function alturaCodigo(codigo, w, rotulo) {
  const fs = fonteCodigo(codigo, w);
  const porLinha = Math.floor((w - 0.5) / (fs * 0.0083));
  return 0.4 + (rotulo ? 0.38 : 0) + partidas(codigo, porLinha) * fs * 0.0185;
}
function blocoCodigo(s, x, y, w, h, codigo, rotulo) {
  s.addShape(pres.shapes.RECTANGLE, { x, y, w, h, fill: { color: COR.ink }, line: { color: COR.ink, width: 0 }, objectName: 'codigo-fundo' });
  let yy = y + 0.2;
  if (rotulo) {
    texto(s, rotulo, { x: x + 0.25, y: yy, w: w - 0.5, h: 0.3, fontSize: 13, bold: true, color: COR.lilas, objectName: 'codigo-rotulo' });
    yy += 0.38;
  }
  const disponivel = Math.max(0.3, h - (yy - y) - 0.15);
  // Maior letra (ate 20) em que as linhas, ja partidas pela largura, cabem na altura.
  const cabe = (fs) => partidas(codigo, Math.floor((w - 0.5) / (fs * 0.0083))) * fs * 0.0185 <= disponivel;
  let fs = Math.min(20, fonteCodigo(codigo, w));
  while (fs > 10 && !cabe(fs)) fs--;
  texto(s, codigo, { x: x + 0.25, y: yy, w: w - 0.5, h: disponivel, fontFace: FONTE_CODIGO, fontSize: fs, color: COR.escuroInk, objectName: 'codigo', paraSpaceAfter: 0 });
}

// Dimensoes reais de uma imagem PNG ou de um video (ffprobe), para encaixar sem esticar.
function dimensoes(p) {
  try {
    if (/\.png$/i.test(p)) { const b = readFileSync(p); return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }; }
    const o = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', p], { encoding: 'utf8' }).trim();
    const [w, h] = o.split(',').map(Number);
    if (w > 0 && h > 0) return { w, h };
  } catch { /* sem ffprobe: 16:9 */ }
  return { w: 16, h: 9 };
}
// Maior retangulo com a proporcao do ficheiro que cabe na caixa, centrado.
function encaixar(box, d) {
  const r = d.w / d.h;
  let w = box.w;
  let h = w / r;
  if (h > box.h) { h = box.h; w = h * r; }
  return { x: box.x + (box.w - w) / 2, y: box.y + (box.h - h) / 2, w, h };
}

// ---------- Renderizadores por tipo ----------
const R = {
  titulo(s, d) {
    s.addText(d.titulo, { placeholder: 'title' });
    if (d.subtitulo) s.addText(d.subtitulo, { placeholder: 'body' });
  },
  seccao(s, d) {
    s.addText(d.titulo, { placeholder: 'title' });
    if (d.subtitulo) s.addText(d.subtitulo, { placeholder: 'body' });
  },
  colunas(s, d) {
    s.addText(d.titulo, { placeholder: 'title' });
    const n = d.colunas.length;
    const gap = 0.35;
    const w = (W - 2 * M - gap * (n - 1)) / n;
    d.colunas.forEach((c, i) => {
      const x = M + i * (w + gap);
      s.addShape(pres.shapes.RECTANGLE, { x, y: 1.85, w, h: 3.9, fill: { color: COR.surface }, line: { color: COR.surface, width: 0 }, objectName: `coluna-${i}` });
      quadrado(s, x + 0.35, 2.2, 0.42, corDe(c.cor || ['accent', 'roxo2', 'laranja'][i % 3]), `marca-${i}`);
      texto(s, sub(c.titulo), { x: x + 0.35, y: 2.95, w: w - 0.7, h: 1.0, fontFace: FONTE_TITULO, fontSize: 26, bold: true, objectName: `coluna-titulo-${i}` });
      texto(s, sub(c.texto), { x: x + 0.35, y: 4.0, w: w - 0.7, h: 1.6, fontSize: 20, color: COR.ink, objectName: `coluna-texto-${i}` });
    });
  },
  stats(s, d) {
    s.addText(d.titulo, { placeholder: 'title' });
    const n = d.stats.length;
    const gap = 0.35;
    const w = (W - 2 * M - gap * (n - 1)) / n;
    d.stats.forEach((st, i) => {
      const x = M + i * (w + gap);
      s.addShape(pres.shapes.RECTANGLE, { x, y: 1.9, w, h: 3.6, fill: { color: i === 0 ? COR.ink : COR.surface }, line: { color: i === 0 ? COR.ink : COR.surface, width: 0 }, objectName: `stat-${i}` });
      const val = sub(st.valor);
      texto(s, val, { x: x + 0.35, y: 2.25, w: w - 0.7, h: 1.4, fontFace: FONTE_TITULO, fontSize: val.length > 10 ? 34 : val.length > 6 ? 44 : 60, bold: true, color: i === 0 ? COR.escuroInk : COR.ink, objectName: `stat-valor-${i}`, fit: 'shrink' });
      texto(s, sub(st.rotulo), { x: x + 0.35, y: 3.8, w: w - 0.7, h: 1.5, fontSize: 18, color: i === 0 ? COR.escuroMuted : COR.muted, objectName: `stat-rotulo-${i}` });
    });
    if (d.rodape) texto(s, sub(d.rodape), { x: M, y: 5.85, w: W - 2 * M, h: 0.7, fontSize: 16, color: COR.ink, objectName: 'rodape' });
  },
  codigo(s, d) {
    s.addText(d.titulo, { placeholder: 'title' });
    texto(s, sub(d.intro), { x: M, y: 1.6, w: W - 2 * M, h: 0.6, fontSize: 20, objectName: 'intro' });
    const cod = sub(d.codigo);
    blocoCodigo(s, M, 2.35, W - 2 * M, Math.min(3.8, alturaCodigo(cod, W - 2 * M)), cod);
    if (d.depois) texto(s, sub(d.depois), { x: M, y: 6.3, w: W - 2 * M, h: 0.55, fontSize: 15, color: COR.muted, objectName: 'depois' });
  },
  modelos(s, d) {
    s.addText(d.titulo, { placeholder: 'title' });
    const n = d.modelos.length;
    const gap = 0.35;
    const w = (W - 2 * M - gap * (n - 1)) / n;
    d.modelos.forEach((m, i) => {
      const x = M + i * (w + gap);
      s.addShape(pres.shapes.RECTANGLE, { x, y: 1.85, w, h: 4.1, fill: { color: COR.surface }, line: { color: COR.surface, width: 0 }, objectName: `modelo-${i}` });
      quadrado(s, x + 0.35, 2.2, 0.42, corDe(m.cor), `modelo-marca-${i}`);
      texto(s, m.nome, { x: x + 0.35, y: 2.85, w: w - 0.7, h: 1.1, fontFace: FONTE_TITULO, fontSize: 48, bold: true, objectName: `modelo-nome-${i}` });
      texto(s, m.papel, { x: x + 0.35, y: 4.05, w: w - 0.7, h: 0.9, fontSize: 20, objectName: `modelo-papel-${i}` });
      texto(s, m.preco, { x: x + 0.35, y: 5.1, w: w - 0.7, h: 0.5, fontSize: 18, bold: true, color: COR.muted, objectName: `modelo-preco-${i}` });
    });
    if (d.rodape) texto(s, sub(d.rodape), { x: M, y: 6.2, w: W - 2 * M, h: 0.5, fontSize: 14, color: COR.muted, objectName: 'rodape' });
  },
  dag(s, d) {
    s.addText(d.titulo, { placeholder: 'title' });
    const ondas = [
      { modelo: 'Haiku', n: 16, cor: COR.amarelo },
      { modelo: 'Sonnet', n: 2, cor: COR.verde },
      { modelo: 'Sonnet', n: 1, cor: COR.verde },
      { modelo: 'Opus', n: 1, cor: COR.accent },
    ].map((o, i) => ({ ...o, nome: T.ondas[i][0], sub: T.ondas[i][1] }));
    const ws = [4.5, 2.4, 2.4, 2.4];
    const gap = (W - 2 * M - ws.reduce((x, y) => x + y, 0)) / 3;
    let x = M;
    ondas.forEach((o, i) => {
      const w = ws[i];
      s.addShape(pres.shapes.RECTANGLE, { x, y: 1.85, w, h: 4.4, fill: { color: COR.surface }, line: { color: COR.surface, width: 0 }, objectName: `onda-${i}` });
      texto(s, o.nome, { x: x + 0.3, y: 2.1, w: w - 0.6, h: 0.5, fontFace: FONTE_TITULO, fontSize: 24, bold: true, objectName: `onda-nome-${i}` });
      quadrado(s, x + 0.3, 2.72, 0.22, o.cor, `onda-cor-${i}`);
      texto(s, o.modelo, { x: x + 0.62, y: 2.66, w: w - 0.9, h: 0.35, fontSize: 16, bold: true, objectName: `onda-modelo-${i}` });
      texto(s, o.sub, { x: x + 0.3, y: 3.1, w: w - 0.6, h: 0.6, fontSize: 15, color: COR.muted, objectName: `onda-sub-${i}` });
      if (i === 0) {
        quadrado(s, x + 0.3, 3.8, 0.45, COR.accent, 'hash');
        texto(s, 'lib-hash', { x: x + 0.85, y: 3.88, w: 1.6, h: 0.35, fontSize: 14, bold: true, objectName: 'hash-rotulo' });
        const cores = [COR.verde, COR.verde, COR.verde, COR.amarelo, COR.verde];
        for (let k = 0; k < 15; k++) {
          const c = k % 5;
          const r = Math.floor(k / 5);
          quadrado(s, x + 0.3 + c * 0.66, 4.45 + r * 0.5, 0.42, k >= 12 ? COR.cinza : cores[(k * 3) % 5], `cartao-${k}`);
        }
      } else {
        for (let k = 0; k < o.n; k++) quadrado(s, x + 0.3 + k * 0.7, 3.8, 0.55, COR.cinza, `onda${i}-${k}`);
      }
      if (i < ondas.length - 1) s.addShape(pres.shapes.LINE, { x: x + w + 0.06, y: 4.05, w: gap - 0.12, h: 0, line: { color: COR.ink, width: 2.5, endArrowType: 'triangle' }, objectName: `seta-${i}` });
      x += w + gap;
    });
    texto(s, T.legendaDag, { x: M, y: 6.4, w: W - 2 * M, h: 0.4, fontSize: 15, color: COR.muted, objectName: 'legenda-dag' });
  },
  fluxo(s, d) {
    s.addText(d.titulo, { placeholder: 'title' });
    const n = d.passos.length;
    const gap = 0.45;
    const w = (W - 2 * M - gap * (n - 1)) / n;
    d.passos.forEach((p, i) => {
      const x = M + i * (w + gap);
      const escuro = i === n - 1;
      s.addShape(pres.shapes.RECTANGLE, { x, y: 2.6, w, h: 2.0, fill: { color: escuro ? COR.ink : COR.surface }, line: { color: escuro ? COR.ink : COR.surface, width: 0 }, objectName: `passo-${i}` });
      quadrado(s, x + 0.25, 2.85, 0.3, [COR.accent, COR.roxo2, COR.laranja, COR.accent, COR.roxo2][i % 5], `passo-marca-${i}`);
      texto(s, p, { x: x + 0.25, y: 3.35, w: w - 0.5, h: 1.1, fontFace: FONTE_TITULO, fontSize: n > 4 ? 16 : 20, bold: true, color: escuro ? COR.escuroInk : COR.ink, objectName: `passo-texto-${i}` });
      if (i < n - 1) s.addShape(pres.shapes.LINE, { x: x + w + 0.05, y: 3.6, w: gap - 0.1, h: 0, line: { color: COR.ink, width: 2.5, endArrowType: 'triangle' }, objectName: `fluxo-seta-${i}` });
    });
  },
  agenda(s, d) {
    s.addText(d.titulo, { placeholder: 'title' });
    const blocos = d.blocos.map(([m, nome], i) => ({ ini: Number(m), fim: Number(d.blocos[i + 1]?.[0] ?? 90), nome }));
    const escala = (W - 2 * M) / 90;
    const cores = [COR.surface2, COR.amarelo, COR.surface2, COR.ink, COR.verde, COR.surface2, COR.accent, COR.surface2];
    blocos.forEach((b, i) => {
      const x = M + b.ini * escala;
      const w = (b.fim - b.ini) * escala - 0.05;
      const cor = cores[i % cores.length];
      s.addShape(pres.shapes.RECTANGLE, { x, y: 2.2, w, h: 1.6, fill: { color: cor }, line: { color: cor, width: 0 }, objectName: `bloco-${i}` });
      // Rotulos por baixo da barra, em duas filas alternadas para os blocos estreitos.
      const yy = 4.0 + (i % 2) * 0.95;
      texto(s, `${b.ini}′`, { x, y: yy, w: 1.6, h: 0.32, fontSize: 14, color: COR.muted, objectName: `bloco-min-${i}` });
      texto(s, b.nome, { x, y: yy + 0.3, w: 2.2, h: 0.45, fontFace: FONTE_TITULO, fontSize: 18, bold: true, objectName: `bloco-nome-${i}` });
    });
    texto(s, T.agendaFim, { x: W - M - 4.5, y: 6.2, w: 4.5, h: 0.4, fontSize: 14, color: COR.muted, align: 'right', objectName: 'agenda-fim' });
  },
  faca(s, d) {
    s.addShape(pres.shapes.RECTANGLE, { x: M, y: 0.42, w: 3.1, h: 0.42, fill: { color: COR.accent }, line: { color: COR.accent, width: 0 }, objectName: 'faca-etiqueta' });
    texto(s, T.faca(d.min), { x: M + 0.15, y: 0.42, w: 2.8, h: 0.42, fontFace: FONTE_TITULO, fontSize: 16, color: COR.accentInk, valign: 'middle', objectName: 'faca-rotulo' });
    s.addText(d.titulo, { placeholder: 'title' });
    texto(s, d.passos.map((p, i) => ({ text: p, options: { bullet: { type: 'number' }, breakLine: i < d.passos.length - 1 } })), { x: M, y: 2.1, w: 4.4, h: 3.6, fontSize: 20, paraSpaceAfter: 12, objectName: 'faca-passos' });
    const xc = M + 4.8;
    const wc = W - M - xc;
    let yc = 2.1;
    for (const c of d.comandos) {
      const cmd = sub(c.cmd);
      const h = Math.min(3.6, alturaCodigo(cmd, wc, c.rotulo));
      blocoCodigo(s, xc, yc, wc, h, cmd, c.rotulo);
      yc += h + 0.25;
    }
    quadrado(s, M, 6.18, 0.32, COR.accent, 'esperado-marca');
    texto(s, [{ text: T.esperado, options: { bold: true } }, { text: sub(d.esperado) }], { x: M + 0.5, y: 6.12, w: W - 2 * M - 1.4, h: 0.6, fontSize: 18, objectName: 'faca-esperado' });
  },
  video(s, d) {
    s.addText(d.titulo, { placeholder: 'title' });
    const p = join(AQUI, d.media);
    const box = { x: M, y: 1.6, w: W - 2 * M, h: 4.75 };
    if (existsSync(p)) {
      const poster = d.poster && existsSync(join(AQUI, d.poster)) ? 'data:image/png;base64,' + readFileSync(join(AQUI, d.poster)).toString('base64') : undefined;
      s.addMedia({ type: 'video', path: p, ...encaixar(box, dimensoes(p)), ...(poster ? { cover: poster } : {}), objectName: d.objeto || 'video' });
    } else {
      s.addShape(pres.shapes.RECTANGLE, { ...box, fill: { color: COR.escuro }, line: { color: COR.escuro, width: 0 }, objectName: 'video-falta' });
      grelhaEstado(s, M + 0.5, 2.1, 20, 5, 0.42, 0.12);
      texto(s, T.videoFalta, { x: M + 0.5, y: 5.5, w: 10, h: 0.5, fontSize: 16, color: COR.escuroMuted, objectName: 'video-aviso' });
    }
    texto(s, sub(d.legenda), { x: M, y: 6.5, w: W - 2 * M, h: 0.4, fontSize: 15, color: COR.muted, objectName: 'legenda' });
  },
  imagem(s, d) {
    s.addText(d.titulo, { placeholder: 'title' });
    const p = join(AQUI, d.media);
    const box = { x: M, y: 1.6, w: W - 2 * M, h: 4.75 };
    if (existsSync(p)) s.addImage({ path: p, ...encaixar(box, dimensoes(p)), objectName: 'imagem', altText: d.legenda });
    else {
      s.addShape(pres.shapes.RECTANGLE, { ...box, fill: { color: COR.surface }, line: { color: COR.surface, width: 0 }, objectName: 'imagem-falta' });
      texto(s, T.imagemFalta(d.media), { x: M + 0.4, y: 3.7, w: 10, h: 0.5, fontSize: 16, color: COR.muted, objectName: 'imagem-aviso' });
    }
    texto(s, sub(d.legenda), { x: M, y: 6.5, w: W - 2 * M, h: 0.4, fontSize: 15, color: COR.muted, objectName: 'legenda' });
  },
  // "O que esta la dentro": um resumo do ficheiro a esquerda e 2 ou 3 pontos simples a direita.
  anatomia(s, d) {
    s.addText(d.titulo, { placeholder: 'title' });
    const wc = 6.3;
    const cod = sub(d.codigo);
    const hc = Math.min(4.75, Math.max(2.4, alturaCodigo(cod, wc, d.rotulo)));
    blocoCodigo(s, M, 1.65, wc, hc, cod, d.rotulo);
    const xp = M + wc + 0.5;
    const wp = W - M - xp;
    const n = d.pontos.length;
    const alto = 4.75 / n;
    d.pontos.forEach((p, i) => {
      const y = 1.65 + i * alto;
      quadrado(s, xp, y + 0.07, 0.3, corDe(p.cor || ['accent', 'roxo2', 'laranja'][i % 3]), `anatomia-marca-${i}`);
      texto(s, sub(p.titulo), { x: xp + 0.5, y, w: wp - 0.5, h: 0.45, fontFace: FONTE_TITULO, fontSize: 20, bold: true, objectName: `anatomia-titulo-${i}` });
      texto(s, sub(p.texto), { x: xp + 0.5, y: y + 0.45, w: wp - 0.5, h: alto - 0.55, fontSize: 15, color: COR.ink, objectName: `anatomia-texto-${i}`, fit: 'shrink' });
    });
    if (d.rodape) texto(s, sub(d.rodape), { x: M, y: 6.45, w: W - 2 * M, h: 0.4, fontSize: 14, color: COR.muted, objectName: 'rodape' });
  },
  lista(s, d) {
    s.addText(d.titulo, { placeholder: 'title' });
    d.itens.forEach((it, i) => {
      const y = 1.85 + i * 0.92;
      quadrado(s, M, y + 0.1, 0.34, COR.accent, `lista-marca-${i}`);
      texto(s, sub(it), { x: M + 0.6, y, w: W - 2 * M - 0.6, h: 0.8, fontFace: FONTE_TITULO, fontSize: 26, bold: true, objectName: `lista-item-${i}` });
    });
  },
};

const LAYOUT = { titulo: 'TITULO', seccao: 'SECCAO', faca: 'FACA' };
const mmss = (m) => `${Math.floor(m)}:${String(Math.round((m % 1) * 60)).padStart(2, '0')}`;

// ---------- Construir uma lingua ----------
async function construir(lingua) {
  T = TEXTOS[lingua];
  V = valores();
  pres = novaApresentacao();
  const { SLIDES } = await import(T.conteudo);

  let relogio = 0;
  let seccaoAtual = null;
  const notasMd = T.notasCab(T.titulo);
  const detalhe = [];

  SLIDES.forEach((d, i) => {
    if (d.seccao !== seccaoAtual) {
      pres.addSection({ title: d.seccao });
      seccaoAtual = d.seccao;
    }
    const s = pres.addSlide({ masterName: d.fecho ? 'FECHO' : LAYOUT[d.tipo] || 'CONTEUDO', sectionTitle: d.seccao });
    (R[d.tipo] || R.lista)(s, d);
    if (d.aviso) {
      // Etiqueta amarela no canto superior direito (ex.: "os comandos estao no Teams").
      const wa = Math.min(6.8, 0.45 + sub(d.aviso).length * 0.125); // largura pelo texto (o ingles e mais comprido)
      s.addShape(pres.shapes.RECTANGLE, { x: W - M - wa, y: 0.42, w: wa, h: 0.5, fill: { color: COR.laranja }, line: { color: COR.laranja, width: 0 }, objectName: 'aviso-fundo' });
      texto(s, sub(d.aviso), { x: W - M - wa + 0.18, y: 0.42, w: wa - 0.36, h: 0.5, fontSize: 15, bold: true, color: COR.accentInk, valign: 'middle', objectName: 'aviso' });
    }
    const ini = relogio;
    relogio += d.min;
    const cab = `[${mmss(ini)} → ${mmss(relogio)}] ${d.min} min${d.saltar ? ` · ${T.saltar}` : ''} · ${T.estarAqui(Math.round(ini))}`;
    s.addNotes(`${cab}\n\n${sub(d.notas)}`);
    notasMd.push(`| ${i + 1} | ${d.min} | ${mmss(ini)} | ${d.seccao} | ${d.titulo} | ${d.saltar ? T.saltar : ''} |`);
    detalhe.push(`### ${i + 1}. ${d.titulo}`, '', `${cab}`, '', sub(d.notas), '');
  });
  if (Math.abs(relogio - 90) > 0.01) console.warn(T.aviso(relogio));
  notasMd.push('', T.total(relogio), '', T.porSlide, '', ...detalhe);

  await pres.writeFile({ fileName: join(AQUI, T.pptx) });
  writeFileSync(join(AQUI, T.notas), notasMd.join('\n') + '\n');
  console.log(`${T.pptx}: ${SLIDES.length} slides, ${relogio} min · ${T.notas}`);
}

// node build.mjs [--lingua pt|en]  (ou --lingua=en); sem --lingua constroi as duas.
const args = process.argv.slice(2);
const k = args.findIndex((a) => a === '--lingua' || a.startsWith('--lingua='));
const pedida = k < 0 ? null : args[k].includes('=') ? args[k].split('=')[1] : args[k + 1];
if (k >= 0 && !TEXTOS[pedida]) {
  console.error('Uso / usage: node build.mjs [--lingua pt|en]');
  process.exit(2);
}
for (const l of pedida ? [pedida] : Object.keys(TEXTOS)) await construir(l);
