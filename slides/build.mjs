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
    porMedir: 'por medir', porGravar: 'por gravar', pesoOrq: 'a maior parte',
    ondas: [
      ['Wave 1', 'lib-hash e 15 tarefas'],
      ['Wave 2', 'categorias e pontuação'],
      ['Wave 3', 'integração e suite de testes'],
      ['Wave 4', 'revisão e veredito'],
    ],
    cripto: 'os 3 de criptografia\nesperam pelo lib-hash',
    estadosTitulo: 'Cada quadrado é uma tarefa:',
    estadosTarefa: 'Cada quadrado é uma tarefa:',
    estados: [['cinza', 'à espera'], ['amarelo', 'agente a trabalhar'], ['verde', 'teste passou'], ['vermelho', 'teste falhou']],
    agendaFim: '90′ e depois perguntas, sem limite',
    faca: (min) => `Faz agora · ${min} min`,
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
      ['Wave 1', 'lib-hash and 15 tasks'],
      ['Wave 2', 'categories and scoring'],
      ['Wave 3', 'integration and test suite'],
      ['Wave 4', 'review and verdict'],
    ],
    cripto: 'the 3 crypto tasks\nwait for lib-hash',
    estadosTitulo: 'Each square is a task:',
    estadosTarefa: 'Each square is a task:',
    estados: [['cinza', 'waiting'], ['amarelo', 'agent working'], ['verde', 'test passed'], ['vermelho', 'test failed']],
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
// Fundo lilas em todos os slides de conteudo; os blocos por cima sao brancos.
// As cores de estado (cinza, amarelo, verde, vermelho) sao as da grelha da Arena e so aparecem em QUADRADOS,
// sempre com legenda: um quadrado e uma tarefa. O que e so decoracao e um icone ou um numero num circulo roxo.
const COR = {
  bg: 'F4EFFE', surface: 'FFFFFF', surface2: 'EBDDFA', ink: '140920', muted: '4A405A',
  accent: '6B34FD', accentInk: 'FFFFFF', roxo2: '8F23D7', laranja: 'F25928', lilas: '93A7FF',
  escuro: '140920', escuroSurface: '231338', escuroInk: 'FCF9FE', escuroMuted: 'B9AEDB',
  cinza: 'C4C7C1', amarelo: 'F1C232', verde: '1E9E57', vermelho: 'D2463F',
};
// As mesmas cores no tema escuro do /estado (o ecra do projetor e do video do swarm).
const COR_ESCURO = { cinza: '3A423E', amarelo: 'F1C232', verde: '2FBF6C', vermelho: 'EF5B52' };
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
    const part = rows.filter((r) => (r.modo === 'participante' || r.modo === 'participant')).map((r) => Number(r.custo_total));
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

const minutos = (m) => String(m).replace('.', T.decimal); // 1.5 -> "1,5" em pt
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
    { image: { x: 0.517, y: 7.171, w: 0.821, h: 0.103, path: MOD('logo-branco.png'), altText: 'Logo', objectName: 'logo' } },
  ];
  const numero = { x: W - 3.5, y: 7.07, w: 3.0, h: 0.28, fontFace: FONTE_TEXTO, fontSize: 9, color: COR.escuroInk, align: 'right' };
  p.defineSlideMaster({
    title: 'TITLE',
    background: { path: MOD('fundo-titulo.png') },
    objects: [
      { image: { x: 0.673, y: 0.669, w: 2.31, h: 0.289, path: MOD('logo-branco.png'), altText: 'Logo', objectName: 'logo' } },
      ...rodape,
      { placeholder: { options: { name: 'title', type: 'title', x: 0.673, y: 1.45, w: 9.6, h: 2.2, fontFace: FONTE_TITULO, fontSize: 48, color: COR.escuroInk, valign: 'bottom', align: 'left', margin: 0 }, text: '' } },
      { placeholder: { options: { name: 'body', type: 'body', x: 0.673, y: 3.8, w: 9.6, h: 1.2, fontFace: FONTE_TITULO, fontSize: 26, color: COR.laranja, valign: 'top', align: 'left', margin: 0 }, text: '' } },
    ],
    slideNumber: numero,
  });
  p.defineSlideMaster({
    title: 'CLOSING',
    background: { path: MOD('fundo-fecho.png') },
    objects: [
      { image: { x: W / 2 - 1.25, y: 5.55, w: 2.5, h: 0.3125, path: MOD('logo-branco.png'), altText: 'Logo', objectName: 'logo' } },
      { placeholder: { options: { name: 'title', type: 'title', x: 1, y: 2.2, w: W - 2, h: 1.6, fontFace: FONTE_TITULO, fontSize: 60, color: COR.escuroInk, valign: 'bottom', align: 'center', margin: 0 }, text: '' } },
      { placeholder: { options: { name: 'body', type: 'body', x: 1, y: 3.9, w: W - 2, h: 0.9, fontFace: FONTE_TITULO, fontSize: 28, color: COR.laranja, valign: 'top', align: 'center', margin: 0 }, text: '' } },
    ],
  });
  p.defineSlideMaster({
    title: 'SECTION',
    background: { path: MOD('fundo-seccao.png') },
    objects: [
      { image: { x: 0.783, y: 0.669, w: 2.31, h: 0.289, path: MOD('logo-roxo.png'), altText: 'Logo', objectName: 'logo' } },
      { placeholder: { options: { name: 'title', type: 'title', x: 0.783, y: 1.15, w: 8.2, h: 1.7, fontFace: FONTE_TITULO, fontSize: 46, color: COR.ink, valign: 'top', align: 'left', margin: 0 }, text: '' } },
      { placeholder: { options: { name: 'body', type: 'body', x: 0.783, y: 2.95, w: 6.4, h: 1.2, fontFace: FONTE_TEXTO, fontSize: 20, color: COR.muted, valign: 'top', align: 'left', margin: 0 }, text: '' } },
    ],
  });
  p.defineSlideMaster({
    title: 'CONTENT',
    background: { color: COR.bg },
    objects: [
      ...rodape,
      { placeholder: { options: { name: 'title', type: 'title', x: 0.673, y: 0.45, w: W - 1.35, h: 0.95, fontFace: FONTE_TITULO, fontSize: 32, color: COR.ink, valign: 'top', align: 'left', margin: 0 }, text: '' } },
    ],
    slideNumber: numero,
  });
  p.defineSlideMaster({
    title: 'DO-IT-NOW',
    background: { color: COR.bg },
    objects: [
      ...rodape,
      { placeholder: { options: { name: 'title', type: 'title', x: M, y: 0.98, w: W - 2 * M, h: 0.95, fontFace: FONTE_TITULO, fontSize: 34, color: COR.ink, valign: 'top', align: 'left', margin: 0 }, text: '' } },
    ],
    slideNumber: numero,
  });
  return p;
}

// ---------- Icones (lucide-static, ISC): SVG -> PNG branco, preparados antes de construir ----------
const ICONES = new Map();
async function prepararIcones(slides) {
  const nomes = new Set(['check', 'brain', 'puzzle', 'feather']);
  const procurar = (o) => {
    if (Array.isArray(o)) o.forEach(procurar);
    else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) (k === 'icone' ? nomes.add(v) : procurar(v));
  };
  procurar(slides);
  const sharp = (await import('sharp')).default;
  for (const n of nomes) {
    if (ICONES.has(n)) continue;
    const f = join(AQUI, 'node_modules', 'lucide-static', 'icons', `${n}.svg`);
    if (!existsSync(f)) throw new Error(`icone desconhecido: ${n} (ver node_modules/lucide-static/icons)`);
    const svg = readFileSync(f, 'utf8').replace(/currentColor/g, '#FFFFFF').replace(/width="24"/, 'width="192"').replace(/height="24"/, 'height="192"');
    ICONES.set(n, 'image/png;base64,' + (await sharp(Buffer.from(svg)).png().toBuffer()).toString('base64'));
  }
}

// ---------- Pecas ----------
const quadrado = (s, x, y, lado, cor, nome) => s.addShape(pres.shapes.RECTANGLE, { x, y, w: lado, h: lado, fill: { color: cor }, line: { color: cor, width: 0 }, objectName: nome || 'square' });
const texto = (s, t, o) => s.addText(t, { isTextBox: true, margin: 0, fontFace: FONTE_TEXTO, color: COR.ink, valign: 'top', ...o });
const corDe = (n) => ({ verde: COR.verde, amarelo: COR.amarelo, vermelho: COR.vermelho, cinza: COR.cinza, accent: COR.accent, roxo2: COR.roxo2, laranja: COR.laranja })[n] || COR.ink;
const cartao = (s, x, y, w, h, nome, cor = COR.surface) => s.addShape(pres.shapes.RECTANGLE, { x, y, w, h, fill: { color: cor }, line: { color: cor, width: 0 }, objectName: nome });
// Icone branco num circulo roxo (decoracao: nao tem significado de estado).
function icone(s, nome, x, y, d, cor = COR.accent, obj = 'icon') {
  s.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color: cor }, line: { color: cor, width: 0 }, objectName: `${obj}-circle` });
  s.addImage({ data: ICONES.get(nome), x: x + d * 0.22, y: y + d * 0.22, w: d * 0.56, h: d * 0.56, objectName: obj, altText: nome });
}
// Numero num circulo roxo: passos de um fluxo, itens de uma lista.
const numero = (s, n, x, y, d, cor = COR.accent, obj = 'number') => s.addText(String(n), { shape: pres.shapes.OVAL, x, y, w: d, h: d, fill: { color: cor }, line: { color: cor, width: 0 }, margin: 0, align: 'center', valign: 'middle', fontFace: FONTE_TITULO, fontSize: Math.round(d * 34), bold: true, color: COR.accentInk, objectName: obj });
// Marca de um bloco: icone se o conteudo o der, quadrado de estado se der uma cor de estado, senao o numero.
function marca(s, item, i, x, y, d, obj) {
  if (item.icone) icone(s, item.icone, x, y, d, COR.accent, obj);
  else if (item.cor) quadrado(s, x, y, d, corDe(item.cor), obj);
  else numero(s, i + 1, x, y, d, COR.accent, obj);
}
// Legenda das cores de estado ("Cada quadrado e uma tarefa: ..."). Devolve a largura usada.
function legendaEstado(s, x, y, { titulo = true, tituloTexto = T.estadosTitulo, alinhar = 'esquerda', largura = W - 2 * M, fs = 13, escuro = false } = {}) {
  const cores = escuro ? COR_ESCURO : COR;
  const tinta = escuro ? COR.escuroInk : COR.ink;
  const cw = fs * 0.0068; // largura media de um caracter em Arial, em polegadas
  const itens = T.estados.map(([cor, rot]) => ({ cor, rot, w: 0.24 + 0.12 + rot.length * cw + 0.45 }));
  const wt = titulo ? tituloTexto.length * cw * 1.08 + 0.25 : 0; // o titulo vai a negrito
  const total = wt + itens.reduce((a, b) => a + b.w, 0) - 0.45;
  let xx = alinhar === 'direita' ? x + largura - total : x;
  if (titulo) { texto(s, tituloTexto, { x: xx, y, w: wt, h: 0.3, fontSize: fs, bold: true, color: tinta, valign: 'middle', objectName: 'status-legend-title' }); xx += wt; }
  itens.forEach((it, i) => {
    quadrado(s, xx, y + 0.03, 0.24, cores[it.cor], `status-legend-${i}`);
    texto(s, it.rot, { x: xx + 0.36, y, w: it.w - 0.36, h: 0.3, fontSize: fs, color: tinta, valign: 'middle', objectName: `status-legend-label-${i}` });
    xx += it.w;
  });
  return total;
}

// Motivo: grelha de quadrados de estado, como o /estado.
function grelhaEstado(s, x, y, cols, rows, lado, gap, padrao) {
  const cores = [COR.verde, COR.verde, COR.amarelo, COR.verde, COR.cinza, COR.verde, COR.vermelho, COR.verde, COR.amarelo, COR.cinza];
  let i = 0;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    quadrado(s, x + c * (lado + gap), y + r * (lado + gap), lado, padrao ? padrao[i % padrao.length] : cores[(r * 7 + c * 3) % cores.length], `status-${r}-${c}`);
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
  s.addShape(pres.shapes.RECTANGLE, { x, y, w, h, fill: { color: COR.ink }, line: { color: COR.ink, width: 0 }, objectName: 'code-background' });
  let yy = y + 0.2;
  if (rotulo) {
    texto(s, rotulo, { x: x + 0.25, y: yy, w: w - 0.5, h: 0.3, fontSize: 13, bold: true, color: COR.lilas, objectName: 'code-label' });
    yy += 0.38;
  }
  const disponivel = Math.max(0.3, h - (yy - y) - 0.15);
  // Maior letra (ate 20) em que as linhas, ja partidas pela largura, cabem na altura.
  const cabe = (fs) => partidas(codigo, Math.floor((w - 0.5) / (fs * 0.0083))) * fs * 0.0185 <= disponivel;
  let fs = Math.min(20, fonteCodigo(codigo, w));
  while (fs > 10 && !cabe(fs)) fs--;
  texto(s, codigo, { x: x + 0.25, y: yy, w: w - 0.5, h: disponivel, fontFace: FONTE_CODIGO, fontSize: fs, color: COR.escuroInk, objectName: 'code', paraSpaceAfter: 0 });
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
    if (d.rodape) texto(s, sub(d.rodape), { x: 1, y: 4.8, w: W - 2, h: 0.4, fontSize: 16, color: COR.escuroMuted, align: 'center', objectName: 'footer' });
  },
  seccao(s, d) {
    s.addText(d.titulo, { placeholder: 'title' });
    if (d.subtitulo) s.addText(sub(d.subtitulo), { placeholder: 'body' });
  },
  colunas(s, d) {
    s.addText(d.titulo, { placeholder: 'title' });
    const n = d.colunas.length;
    const gap = 0.35;
    const w = (W - 2 * M - gap * (n - 1)) / n;
    d.colunas.forEach((c, i) => {
      const x = M + i * (w + gap);
      cartao(s, x, 1.85, w, 3.9, `column-${i}`);
      marca(s, c, i, x + 0.35, 2.2, 0.6, `mark-${i}`);
      texto(s, sub(c.titulo), { x: x + 0.35, y: 3.05, w: w - 0.7, h: 0.95, fontFace: FONTE_TITULO, fontSize: 26, bold: true, objectName: `column-title-${i}` });
      texto(s, sub(c.texto), { x: x + 0.35, y: 4.05, w: w - 0.7, h: 1.6, fontSize: 19, color: COR.ink, objectName: `column-text-${i}` });
    });
  },
  stats(s, d) {
    s.addText(d.titulo, { placeholder: 'title' });
    const n = d.stats.length;
    const gap = 0.35;
    const w = (W - 2 * M - gap * (n - 1)) / n;
    d.stats.forEach((st, i) => {
      const x = M + i * (w + gap);
      cartao(s, x, 1.9, w, 3.6, `stat-${i}`, i === 0 ? COR.ink : COR.surface);
      const val = sub(st.valor);
      texto(s, val, { x: x + 0.35, y: 2.25, w: w - 0.7, h: 1.4, fontFace: FONTE_TITULO, fontSize: val.length > 10 ? 34 : val.length > 6 ? 44 : 60, bold: true, color: i === 0 ? COR.escuroInk : COR.ink, objectName: `stat-value-${i}`, fit: 'shrink' });
      texto(s, sub(st.rotulo), { x: x + 0.35, y: 3.8, w: w - 0.7, h: 1.5, fontSize: 18, color: i === 0 ? COR.escuroMuted : COR.muted, objectName: `stat-label-${i}` });
    });
    if (d.rodape) texto(s, sub(d.rodape), { x: M, y: 5.85, w: W - 2 * M, h: 0.7, fontSize: 16, color: COR.ink, objectName: 'footer' });
  },
  codigo(s, d) {
    s.addText(d.titulo, { placeholder: 'title' });
    texto(s, sub(d.intro), { x: M, y: 1.6, w: W - 2 * M, h: 0.6, fontSize: 20, objectName: 'intro' });
    const cod = sub(d.codigo);
    blocoCodigo(s, M, 2.35, W - 2 * M, Math.min(3.8, alturaCodigo(cod, W - 2 * M)), cod);
    if (d.depois) texto(s, sub(d.depois), { x: M, y: 6.3, w: W - 2 * M, h: 0.55, fontSize: 15, color: COR.muted, objectName: 'after' });
  },
  modelos(s, d) {
    s.addText(d.titulo, { placeholder: 'title' });
    const n = d.modelos.length;
    const gap = 0.35;
    const w = (W - 2 * M - gap * (n - 1)) / n;
    d.modelos.forEach((m, i) => {
      const x = M + i * (w + gap);
      cartao(s, x, 1.85, w, 4.1, `model-${i}`);
      icone(s, m.icone, x + 0.35, 2.2, 0.6, COR.accent, `model-icon-${i}`);
      texto(s, m.nome, { x: x + 0.35, y: 2.95, w: w - 0.7, h: 1.0, fontFace: FONTE_TITULO, fontSize: 48, bold: true, objectName: `model-name-${i}` });
      texto(s, m.papel, { x: x + 0.35, y: 4.05, w: w - 0.7, h: 0.9, fontSize: 20, objectName: `model-role-${i}` });
      texto(s, m.preco, { x: x + 0.35, y: 5.1, w: w - 0.7, h: 0.5, fontSize: 18, bold: true, color: COR.muted, objectName: `model-price-${i}` });
    });
    if (d.rodape) texto(s, sub(d.rodape), { x: M, y: 6.2, w: W - 2 * M, h: 0.5, fontSize: 14, color: COR.muted, objectName: 'footer' });
  },
  // As 4 ondas do plano. Os quadrados sao tarefas (cor = estado, com legenda); o icone ao lado do nome e o modelo.
  dag(s, d) {
    s.addText(d.titulo, { placeholder: 'title' });
    const ondas = [
      { modelo: 'Haiku', icone: 'feather', n: 16 },
      { modelo: 'Sonnet', icone: 'puzzle', n: 2 },
      { modelo: 'Sonnet', icone: 'puzzle', n: 1 },
      { modelo: 'Opus', icone: 'brain', n: 1 },
    ].map((o, i) => ({ ...o, nome: T.ondas[i][0], sub: T.ondas[i][1] }));
    const ws = [4.4, 2.3, 2.3, 2.3];
    const gap = (W - 2 * M - ws.reduce((x, y) => x + y, 0)) / 3;
    let x = M;
    ondas.forEach((o, i) => {
      const w = ws[i];
      cartao(s, x, 1.75, w, 4.45, `wave-${i}`);
      texto(s, o.nome, { x: x + 0.3, y: 1.95, w: w - 0.6, h: 0.5, fontFace: FONTE_TITULO, fontSize: 24, bold: true, objectName: `wave-name-${i}` });
      icone(s, o.icone, x + 0.3, 2.52, 0.34, COR.accent, `wave-model-icon-${i}`);
      texto(s, o.modelo, { x: x + 0.74, y: 2.52, w: w - 1.0, h: 0.34, fontSize: 16, bold: true, valign: 'middle', objectName: `wave-model-${i}` });
      texto(s, o.sub, { x: x + 0.3, y: 2.98, w: w - 0.6, h: 0.6, fontSize: 15, color: COR.muted, objectName: `wave-sub-${i}` });
      if (i === 0) {
        // lib-hash a trabalhar; 12 tarefas a meio; os 3 de criptografia a espera do lib-hash.
        quadrado(s, x + 0.3, 3.7, 0.42, COR.amarelo, 'hash');
        texto(s, 'lib-hash', { x: x + 0.85, y: 3.7, w: 1.6, h: 0.42, fontSize: 14, bold: true, valign: 'middle', objectName: 'hash-label' });
        const cores = [COR.verde, COR.amarelo, COR.verde, COR.verde, COR.amarelo, COR.verde];
        for (let k = 0; k < 12; k++) quadrado(s, x + 0.3 + (k % 6) * 0.62, 4.3 + Math.floor(k / 6) * 0.55, 0.42, cores[(k * 5) % 6], `task-${k}`);
        for (let k = 0; k < 3; k++) quadrado(s, x + 0.3 + k * 0.62, 5.5, 0.42, COR.cinza, `crypto-${k}`);
        texto(s, T.cripto, { x: x + 0.3 + 3 * 0.62, y: 5.42, w: w - 0.3 - 3 * 0.62 - 0.15, h: 0.6, fontSize: 12, color: COR.muted, valign: 'middle', objectName: 'crypto-label' });
      } else {
        for (let k = 0; k < o.n; k++) quadrado(s, x + 0.3 + k * 0.62, 3.7, 0.42, COR.cinza, `wave${i}-${k}`);
      }
      if (i < ondas.length - 1) s.addShape(pres.shapes.LINE, { x: x + w + 0.06, y: 3.91, w: gap - 0.12, h: 0, line: { color: COR.ink, width: 2.5, endArrowType: 'triangle' }, objectName: `arrow-${i}` });
      x += w + gap;
    });
    legendaEstado(s, M, 6.38, { tituloTexto: T.estadosTarefa });
  },
  // Passos em sequencia: numero, nome e (opcional) uma frase do que acontece.
  fluxo(s, d) {
    s.addText(d.titulo, { placeholder: 'title' });
    const passos = d.passos.map((p) => (typeof p === 'string' ? { titulo: p } : p));
    const n = passos.length;
    const gap = 0.32;
    const w = (W - 2 * M - gap * (n - 1)) / n;
    const comTexto = passos.some((p) => p.texto);
    const y0 = comTexto ? 2.0 : 2.6;
    const h = comTexto ? 3.5 : 2.0;
    // A palavra mais comprida de um titulo tem de caber numa linha (sem partir "SubagentStop" a meio).
    const maior = Math.max(...passos.flatMap((p) => sub(p.titulo).split(/\s+/)).map((x) => x.length));
    const fsTitulo = Math.min(n > 4 ? 17 : 20, Math.floor((w - 0.4) / (maior * 0.0098)));
    passos.forEach((p, i) => {
      const x = M + i * (w + gap);
      const escuro = i === n - 1;
      cartao(s, x, y0, w, h, `step-${i}`, escuro ? COR.ink : COR.surface);
      numero(s, i + 1, x + 0.25, y0 + 0.25, 0.48, COR.accent, `step-number-${i}`);
      texto(s, sub(p.titulo), { x: x + 0.22, y: y0 + 0.95, w: w - 0.4, h: 1.0, fontFace: FONTE_TITULO, fontSize: fsTitulo, bold: true, color: escuro ? COR.escuroInk : COR.ink, objectName: `step-title-${i}` });
      if (p.texto) texto(s, sub(p.texto), { x: x + 0.22, y: y0 + 2.05, w: w - 0.4, h: h - 2.2, fontSize: 16, color: escuro ? COR.escuroMuted : COR.muted, objectName: `step-text-${i}` });
      if (i < n - 1) s.addShape(pres.shapes.LINE, { x: x + w + 0.05, y: y0 + 0.49, w: gap - 0.1, h: 0, line: { color: COR.ink, width: 2.5, endArrowType: 'triangle' }, objectName: `flow-arrow-${i}` });
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
      s.addShape(pres.shapes.RECTANGLE, { x, y: 2.2, w, h: 1.6, fill: { color: cor }, line: { color: cor, width: 0 }, objectName: `block-${i}` });
      // Rotulos por baixo da barra, em duas filas alternadas para os blocos estreitos.
      const yy = 4.0 + (i % 2) * 0.95;
      texto(s, `${b.ini}′`, { x, y: yy, w: 1.6, h: 0.32, fontSize: 14, color: COR.muted, objectName: `block-min-${i}` });
      texto(s, b.nome, { x, y: yy + 0.3, w: 2.2, h: 0.45, fontFace: FONTE_TITULO, fontSize: 18, bold: true, objectName: `block-name-${i}` });
    });
    texto(s, T.agendaFim, { x: W - M - 4.5, y: 6.2, w: 4.5, h: 0.4, fontSize: 14, color: COR.muted, align: 'right', objectName: 'agenda-end' });
  },
  faca(s, d) {
    s.addShape(pres.shapes.RECTANGLE, { x: M, y: 0.42, w: 3.1, h: 0.42, fill: { color: COR.accent }, line: { color: COR.accent, width: 0 }, objectName: 'do-it-tag' });
    texto(s, T.faca(minutos(d.min)), { x: M + 0.15, y: 0.42, w: 2.8, h: 0.42, fontFace: FONTE_TITULO, fontSize: 16, color: COR.accentInk, valign: 'middle', objectName: 'do-it-label' });
    s.addText(d.titulo, { placeholder: 'title' });
    texto(s, d.passos.map((p, i) => ({ text: sub(p), options: { bullet: { type: 'number' }, breakLine: i < d.passos.length - 1 } })), { x: M, y: 2.1, w: 4.4, h: 3.6, fontSize: 20, paraSpaceAfter: 12, objectName: 'do-it-steps' });
    const xc = M + 4.8;
    const wc = W - M - xc;
    // Os blocos de comandos cabem entre o titulo e o "Resultado esperado": se forem altos demais, encolhem.
    const cmds = d.comandos.map((c) => ({ ...c, cmd: sub(c.cmd) }));
    const altos = cmds.map((c) => Math.min(3.6, alturaCodigo(c.cmd, wc, c.rotulo)));
    const livre = 5.85 - 2.1 - 0.25 * (cmds.length - 1);
    const escala = Math.min(1, livre / altos.reduce((a, b) => a + b, 0));
    let yc = 2.1;
    cmds.forEach((c, i) => {
      const h = altos[i] * escala;
      blocoCodigo(s, xc, yc, wc, h, c.cmd, c.rotulo);
      yc += h + 0.25;
    });
    icone(s, 'check', M, 6.12, 0.4, COR.accent, 'expected-mark');
    texto(s, [{ text: T.esperado, options: { bold: true } }, { text: sub(d.esperado) }], { x: M + 0.55, y: 6.12, w: W - 2 * M - 1.4, h: 0.6, fontSize: 18, objectName: 'do-it-expected' });
  },
  video(s, d) {
    s.addText(d.titulo, { placeholder: 'title' });
    const p = join(AQUI, d.media);
    const box = { x: M, y: 1.5, w: W - 2 * M, h: d.estados ? 4.4 : 4.8 };
    let yl = 6.48;
    if (existsSync(p)) {
      const poster = d.poster && existsSync(join(AQUI, d.poster)) ? 'data:image/png;base64,' + readFileSync(join(AQUI, d.poster)).toString('base64') : undefined;
      const r = encaixar(box, dimensoes(p));
      s.addMedia({ type: 'video', path: p, ...r, ...(poster ? { cover: poster } : {}), objectName: d.objeto || 'video' });
      yl = Math.min(6.48, r.y + r.h + (d.estados ? 0.62 : 0.15));
      if (d.estados) {
        // Barra escura colada ao video, com as cores do /estado (tema escuro).
        cartao(s, r.x, r.y + r.h, r.w, 0.46, 'status-legend-background', COR.escuro);
        legendaEstado(s, r.x + 0.25, r.y + r.h + 0.08, { escuro: true, fs: 12 });
      }
    } else {
      s.addShape(pres.shapes.RECTANGLE, { ...box, fill: { color: COR.escuro }, line: { color: COR.escuro, width: 0 }, objectName: 'video-missing' });
      grelhaEstado(s, M + 0.5, 2.1, 20, 5, 0.42, 0.12);
      texto(s, T.videoFalta, { x: M + 0.5, y: 5.5, w: 10, h: 0.5, fontSize: 16, color: COR.escuroMuted, objectName: 'video-notice' });
    }
    texto(s, sub(d.legenda), { x: M, y: yl, w: W - 2 * M, h: 0.3, fontSize: 14, color: COR.muted, valign: 'middle', objectName: 'caption' });
  },
  imagem(s, d) {
    s.addText(d.titulo, { placeholder: 'title' });
    const p = join(AQUI, d.media);
    const box = { x: M, y: 1.6, w: W - 2 * M, h: 4.7 };
    if (existsSync(p)) {
      const r = encaixar(box, dimensoes(p));
      cartao(s, r.x - 0.08, r.y - 0.08, r.w + 0.16, r.h + 0.16, 'frame');
      s.addImage({ path: p, ...r, objectName: 'image', altText: d.legenda });
    } else {
      cartao(s, box.x, box.y, box.w, box.h, 'image-missing');
      texto(s, T.imagemFalta(d.media), { x: M + 0.4, y: 3.7, w: 10, h: 0.5, fontSize: 16, color: COR.muted, objectName: 'image-notice' });
    }
    texto(s, sub(d.legenda), { x: M, y: 6.5, w: W - 2 * M, h: 0.4, fontSize: 15, color: COR.muted, objectName: 'caption' });
  },
  // Apresentar uma coisa nova: uma imagem a esquerda, 3 pontos com icone a direita e, opcional, a legenda das cores.
  apresenta(s, d) {
    s.addText(d.titulo, { placeholder: 'title' });
    const p = join(AQUI, d.media);
    const box = { x: M + 0.08, y: 1.68, w: 5.9, h: d.estados ? 3.95 : 4.4 };
    if (existsSync(p)) {
      const r = { ...encaixar(box, dimensoes(p)), x: box.x };
      cartao(s, r.x - 0.08, r.y - 0.08, r.w + 0.16, r.h + 0.16, 'frame');
      s.addImage({ path: p, ...r, objectName: 'image', altText: d.legendaImagem || d.titulo });
      if (d.legendaImagem) texto(s, sub(d.legendaImagem), { x: M, y: r.y + r.h + 0.18, w: r.w + 0.16, h: 0.35, fontSize: 13, color: COR.muted, objectName: 'image-caption' });
    } else {
      cartao(s, box.x, box.y, box.w, box.h, 'image-missing');
      texto(s, T.imagemFalta(d.media), { x: box.x + 0.3, y: box.y + box.h / 2 - 0.25, w: box.w - 0.6, h: 0.5, fontSize: 14, color: COR.muted, objectName: 'image-notice' });
    }
    const xp = M + 6.5;
    const wp = W - M - xp;
    const alto = (d.estados ? 4.4 : 4.75) / d.pontos.length;
    d.pontos.forEach((pt, i) => {
      const y = 1.6 + i * alto;
      const t = sub(pt.titulo);
      const ht = t.length * 19 * 0.0085 > wp - 0.8 ? 0.62 : 0.34; // uma ou duas linhas
      marca(s, pt, i, xp, y, 0.55, `intro-mark-${i}`);
      texto(s, t, { x: xp + 0.8, y: y + 0.04, w: wp - 0.8, h: ht, fontFace: FONTE_TITULO, fontSize: 19, bold: true, objectName: `intro-title-${i}` });
      texto(s, sub(pt.texto), { x: xp + 0.8, y: y + ht + 0.12, w: wp - 0.8, h: alto - ht - 0.2, fontSize: 15, color: COR.ink, objectName: `intro-text-${i}`, fit: 'shrink' });
    });
    if (d.estados) {
      cartao(s, M, 6.2, W - 2 * M, 0.55, 'legend-background');
      legendaEstado(s, M + 0.25, 6.32, { largura: W - 2 * M - 0.5 });
    }
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
      marca(s, p, i, xp, y, 0.45, `anatomy-mark-${i}`);
      texto(s, sub(p.titulo), { x: xp + 0.65, y: y + 0.02, w: wp - 0.65, h: 0.42, fontFace: FONTE_TITULO, fontSize: 20, bold: true, objectName: `anatomy-title-${i}` });
      texto(s, sub(p.texto), { x: xp + 0.65, y: y + 0.47, w: wp - 0.65, h: alto - 0.55, fontSize: 15, color: COR.ink, objectName: `anatomy-text-${i}`, fit: 'shrink' });
    });
    if (d.rodape) texto(s, sub(d.rodape), { x: M, y: 6.45, w: W - 2 * M, h: 0.4, fontSize: 14, color: COR.muted, objectName: 'footer' });
  },
  // Lista numerada; a altura de cada item segue o numero de linhas que o texto ocupa.
  lista(s, d) {
    s.addText(d.titulo, { placeholder: 'title' });
    const wt = W - 2 * M - 0.8;
    const porLinha = Math.floor(wt / (24 * 0.0078));
    let y = 1.8;
    d.itens.forEach((it, i) => {
      const t = sub(it);
      const linhas = Math.ceil(t.length / porLinha);
      const h = linhas * 0.42 + 0.08;
      numero(s, i + 1, M, y + 0.02, 0.48, COR.accent, `list-number-${i}`);
      texto(s, t, { x: M + 0.8, y, w: wt, h: Math.max(0.52, h), fontFace: FONTE_TITULO, fontSize: 24, bold: true, valign: 'middle', objectName: `list-item-${i}` });
      y += Math.max(0.52, h) + 0.38;
    });
  },
};

const LAYOUT = { titulo: 'TITLE', seccao: 'SECTION', faca: 'DO-IT-NOW' };
const mmss = (m) => `${Math.floor(m)}:${String(Math.round((m % 1) * 60)).padStart(2, '0')}`;

// ---------- Construir uma lingua ----------
async function construir(lingua) {
  T = TEXTOS[lingua];
  V = valores();
  pres = novaApresentacao();
  const { SLIDES } = await import(T.conteudo);
  await prepararIcones(SLIDES);

  let relogio = 0;
  let seccaoAtual = null;
  const notasMd = T.notasCab(T.titulo);
  const detalhe = [];

  SLIDES.forEach((d, i) => {
    if (d.seccao !== seccaoAtual) {
      pres.addSection({ title: d.seccao });
      seccaoAtual = d.seccao;
    }
    const s = pres.addSlide({ masterName: d.fecho ? 'CLOSING' : LAYOUT[d.tipo] || 'CONTENT', sectionTitle: d.seccao });
    (R[d.tipo] || R.lista)(s, d);
    if (d.aviso) {
      // Etiqueta laranja no canto superior direito (ex.: "os comandos estao no Teams").
      const wa = Math.min(6.8, 0.45 + sub(d.aviso).length * 0.125); // largura pelo texto (o ingles e mais comprido)
      s.addShape(pres.shapes.RECTANGLE, { x: W - M - wa, y: 0.42, w: wa, h: 0.5, fill: { color: COR.laranja }, line: { color: COR.laranja, width: 0 }, objectName: 'notice-background' });
      texto(s, sub(d.aviso), { x: W - M - wa + 0.18, y: 0.42, w: wa - 0.36, h: 0.5, fontSize: 15, bold: true, color: COR.accentInk, valign: 'middle', objectName: 'notice' });
    }
    const ini = relogio;
    relogio += d.min;
    const cab = `[${mmss(ini)} → ${mmss(relogio)}] ${minutos(d.min)} min${d.saltar ? ` · ${T.saltar}` : ''} · ${T.estarAqui(Math.round(ini))}`;
    s.addNotes(`${cab}\n\n${sub(d.notas)}`);
    notasMd.push(`| ${i + 1} | ${minutos(d.min)} | ${mmss(ini)} | ${d.seccao} | ${d.titulo} | ${d.saltar ? T.saltar : ''} |`);
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
