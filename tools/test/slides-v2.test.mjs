// The v2 deck's content (docs/pt/WORKSHOP-V2-SPEC.md, section 8): slides/content-v2.mjs (pt) and content-v2.en.mjs
// have the same shape, 33 slides (D-36: 2 overview slides and the memory app at the start) and 90 minutes, a panel phase on every slide, at most 3 slides without an action
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

test('v2 deck: 33 slides, 90 minutes, the same shape in pt and en', () => {
  assert.equal(pt.length, 33);
  assert.equal(en.length, 33);
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
  // project 1 24, project 2 37, closing 3 (the "Tool or skill?" concept slide takes 1 minute from "what the room is missing")
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

test('v2 deck: missions M1 to M6 (missions phase) and M11 (p1 phase), with the titles of missions/rules.json', () => {
  const inRules = (id) => RULES.missions.find((m) => m.id === id);
  // M11 is added to missions/rules.json by another session: until it is there, only the ids present are compared
  const guided = RULES.missions.filter((m) => m.guided).map((m) => m.id);
  const expected = inRules('M11') ? guided : [...guided, 'M11'];
  for (const [d, lang] of [[pt, 'pt'], [en, 'en']]) {
    const ms = d.filter((s) => s.tipo === 'missao');
    assert.deepEqual(ms.map((s) => s.id), expected);
    for (const s of ms) if (inRules(s.id)) assert.equal(s.titulo, inRules(s.id).title[lang], `${lang} ${s.id}`);
    assert.ok(ms.every((s) => s.conceito), 'each mission has its flash concept');
    const m11 = ms.find((s) => s.id === 'M11');
    assert.equal(m11.fase, 'p1');
    assert.ok(!m11.saltar && m11.min === 2);
    assert.ok(ms.filter((s) => s.id !== 'M11').every((s) => s.fase === 'missions'));
  }
});

test('v2 deck: the "Tool or skill?" concept slide sits right before M4', () => {
  for (const d of [pt, en]) {
    const i = d.findIndex((s) => s.id === 'M4');
    assert.equal(d[i - 1].tipo, 'conceito');
    assert.equal(d[i - 1].min, 1);
    assert.equal(d[i - 1].fase, 'missions');
    assert.deepEqual(d[i - 1].blocos.length, 3);
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

test('v2 deck: commands-v2.txt (pt) and commands-v2.en.txt, the commands to paste into Teams, match the deck', async () => {
  const { commandsText } = await import('../../slides/commands-text.mjs');
  for (const [deck, lang, file] of [[pt, 'pt', 'commands-v2.txt'], [en, 'en', 'commands-v2.en.txt']]) {
    const txt = readFileSync(join(ROOT, 'slides', file), 'utf8');
    assert.doesNotMatch(txt, /\{\{\w+\}\}/, `${lang}: every {{...}} filled in`);
    // every command line of the deck is there, on a line of its own (ready to paste)
    const lines = new Set(txt.split('\n'));
    for (const s of deck) for (const c of s.comandos || []) for (const l of c.cmd.split('\n')) {
      const cmd = l.trim().replace(/^M\d+\s+/, '').replace(/\s{2,}\(.*\)$/, '');
      if (!cmd || /^(Shift\+Tab|Esc)/.test(cmd) || /\{\{/.test(cmd)) continue;
      assert.ok(lines.has(cmd), `${lang}: "${cmd}" alone on a line`);
    }
    assert.ok(lines.has('/task-plan') && lines.has('/exit') && lines.has('claude -c'), `${lang}: /task-plan and the M11 plan B`);
    assert.ok(!lines.has('--parallel 8'), `${lang}: a bare flag is not a command to paste`);
    // the generator puts the same slides in the same order (the {{...}} values aside)
    const heads = (t) => t.split('\n').filter((l) => /^# \[\d+:\d\d\] /.test(l));
    assert.deepEqual(heads(txt), heads(commandsText(deck, lang)));
  }
});
