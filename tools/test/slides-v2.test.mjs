// The v2 deck's content (docs/pt/WORKSHOP-V2-SPEC.md, section 8): slides/content-v2.mjs (pt) and content-v2.en.mjs
// have the same shape, 32 slides (D-36: 2 overview slides and the memory app at the start) and 90 minutes, a panel phase on every slide, at most 3 slides without an action
// (section 2.2), the notes in the order of section 8.4, and missions M1 to M6 as in missions/rules.json.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PHASES } from '../../panel/aggregate.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const pt = (await import('../../slides/content-v2.mjs')).SLIDES;
const en = (await import('../../slides/content-v2.en.mjs')).SLIDES;
const RULES = JSON.parse(readFileSync(join(ROOT, 'missions', 'rules.json'), 'utf8'));
const TIPOS = new Set(['titulo', 'regras', 'perguntas', 'faca', 'missao', 'decide', 'painel', 'conceito']);
const EXCECOES = new Set(['titulo', 'regras', 'perguntas']);

const shape = (s) => ({
  min: s.min, fase: s.fase, tipo: s.tipo, id: s.id ?? null, saltar: !!s.saltar,
  passos: s.passos?.length ?? 0, comandos: s.comandos?.length ?? 0, opcoes: s.opcoes?.length ?? 0, ideias: s.ideias?.length ?? 0, blocos: s.blocos?.length ?? 0, faz: !!s.faz,
  preve: !!s.preve, painel: !!s.painel, esperado: !!s.esperado,
  notas: [s.notas.dizer.length, s.notas.painel.length, s.notas.falhas.length],
});

test('v2 deck: 32 slides, 90 minutes, the same shape in pt and en', () => {
  assert.equal(pt.length, 32);
  assert.equal(en.length, 32);
  for (const d of [pt, en]) assert.equal(d.reduce((a, s) => a + s.min, 0), 90);
  assert.deepEqual(en.map(shape), pt.map(shape));
});

test('v2 deck: every slide has a panel phase and a type; at most 3 without an action; blocks in agenda order', () => {
  for (const s of pt) {
    assert.ok(PHASES.includes(s.fase), `${s.titulo}: phase ${s.fase}`);
    assert.ok(TIPOS.has(s.tipo), `${s.titulo}: type ${s.tipo}`);
  }
  assert.ok(pt.filter((s) => EXCECOES.has(s.tipo)).length <= 3);
  const order = pt.map((s) => PHASES.indexOf(s.fase));
  assert.deepEqual(order, [...order].sort((a, b) => a - b), 'the phases never go back');
  // the agenda of section 3, with D-36 (3 minutes more at the opening, from EX-3): opening 11, missions 15,
  // project 1 24, project 2 37, closing 3
  const per = Object.fromEntries(PHASES.map((p) => [p, pt.filter((s) => s.fase === p).reduce((a, s) => a + s.min, 0)]));
  assert.deepEqual(per, { opening: 11, missions: 15, p1: 24, p2: 37, closing: 3 });
});

test('v2 deck: the action slides have steps, commands and an expected result; the notes follow section 8.4', () => {
  for (const d of [pt, en]) {
    for (const s of d) {
      if (['faca', 'missao'].includes(s.tipo)) assert.ok(s.passos.length && s.comandos.length && s.esperado, s.titulo);
      if (s.tipo === 'decide') assert.ok(s.opcoes.length >= 2 && s.opcoes.length <= 3, s.titulo);
      if (s.tipo === 'painel') assert.ok(s.pergunta, s.titulo);
      if (s.tipo === 'conceito') assert.ok(s.blocos.length >= 2 && s.blocos.length <= 5 && s.blocos.every((b) => b.titulo && b.texto), s.titulo);
      assert.ok(s.notas.objetivo, `${s.titulo}: goal`);
      assert.ok(s.notas.dizer.length <= 3, `${s.titulo}: at most 3 sentences to say`);
      assert.ok(s.notas.falhas.length <= 3, `${s.titulo}: at most 3 typical failures`);
    }
  }
});

test('v2 deck: missions M1 to M6 in order, with the titles of missions/rules.json', () => {
  const guided = RULES.missions.filter((m) => m.guided).map((m) => m.id);
  for (const [d, lang] of [[pt, 'pt'], [en, 'en']]) {
    const ms = d.filter((s) => s.tipo === 'missao');
    assert.deepEqual(ms.map((s) => s.id), guided);
    for (const s of ms) assert.equal(s.titulo, RULES.missions.find((m) => m.id === s.id).title[lang], `${lang} ${s.id}`);
    assert.ok(ms.every((s) => s.conceito), 'each mission has its flash concept');
  }
});

test('v2 deck: no rooms (D-34) and no secrets in the content', () => {
  const text = readFileSync(join(ROOT, 'slides', 'content-v2.mjs'), 'utf8') + readFileSync(join(ROOT, 'slides', 'content-v2.en.mjs'), 'utf8');
  assert.doesNotMatch(text, /duas salas|two rooms|\?room=/i);
  assert.doesNotMatch(text, /\b(sala|[Rr]oom) [AB]\b/);
  assert.doesNotMatch(text, /sk-ant-|ADMIN_TOKEN=|ghp_/);
});

test('v2 deck: palco.html carries both decks, with the phase and the notes of every slide', () => {
  const html = readFileSync(join(ROOT, 'slides', 'palco.html'), 'utf8');
  const m = html.match(/const DADOS = (\{.*?\});\n/s);
  assert.ok(m, 'the stage data was injected by build-v2.mjs');
  const dados = JSON.parse(m[1]);
  for (const [lang, deck] of [['pt', pt], ['en', en]]) {
    assert.equal(dados.decks[lang].length, deck.length, lang);
    assert.deepEqual(dados.decks[lang].map((s) => s.fase), deck.map((s) => s.fase));
    assert.ok(dados.decks[lang].every((s) => s.notas.length > 40), `${lang}: notes`);
    assert.doesNotMatch(JSON.stringify(dados.decks[lang]), /\{\{\w+\}\}/, `${lang}: no {{...}} left`);
  }
  assert.match(dados.panelPage, /^https:\/\//);
});

test('v2 deck: the memory app is introduced at the opening, with the command to open it', () => {
  for (const d of [pt, en]) {
    const i = d.findIndex((s) => s.comandos?.some((c) => c.cmd === 'agent-memory-gui'));
    assert.ok(i >= 0 && d[i].fase === 'opening' && d[i].faz, 'a do-it-now slide in the opening');
    assert.ok(d.slice(0, i).filter((s) => s.tipo === 'conceito').length === 2, 'after the 2 overview slides');
  }
});
