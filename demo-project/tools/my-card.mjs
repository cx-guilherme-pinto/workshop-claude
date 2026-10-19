// "Your card": the card the participant writes in specs/my-card.json (a copy of specs/my-card.example.json).
// gen.mjs validates it and generates cards/my-01/ (spec.md and card.test.js, like the others), plan.mjs puts it
// in the plan and server.js shows it in the gallery. Without specs/my-card.json nothing changes.
//
//   readMyCard(root) -> { exists, card, errors }
//     exists  specs/my-card.json is there
//     card    the card in the same shape as an entry of specs/cards.json (null if there are errors)
//     errors  short messages in the Arena language: which field, what is wrong, an example
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const MY_CARD_ID = 'my-01';
export const MY_CARD_FILE = 'specs/my-card.json';
export const MY_CARD_EXAMPLE = 'specs/my-card.example.json';
export const DEFAULT_CATEGORY = 'secure-code';
export const TEMPLATES = ['spot-the-flaw', 'choice', 'order', 'answer'];

const COMMON = ['title', 'concept', 'prompt', 'template', 'category', 'difficulty', 'explanation'];
const OWN = {
  choice: ['options', 'answer', 'wrong', 'scenario'],
  'spot-the-flaw': ['segments', 'answer', 'language', 'wrong'],
  order: ['items', 'answer', 'wrong'],
  answer: ['accept', 'answer', 'placeholder', 'wrong', 'scenario'],
};
const SCENARIO_KINDS = ['email', 'url', 'text', 'chat'];

const TEXTS = {
  pt: {
    problems: `${MY_CARD_FILE} tem problemas:`,
    fixAndRun: 'Corrige e volta a correr: node tools/gen.mjs',
    notJson: (line, col) => `não é JSON válido: há um erro na linha ${line}, coluna ${col}. Cada texto vai entre aspas "…" e não há vírgula depois do último campo (por exemplo { "title": "…", "template": "choice" }). Compara com ${MY_CARD_EXAMPLE}.`,
    notObject: `tem de ser um objeto { … }, como em ${MY_CARD_EXAMPLE}.`,
    missing: (f, ex) => `falta o campo "${f}" (por exemplo "${f}": ${ex}).`,
    text: (f, min, max, ex) => `o campo "${f}" tem de ser um texto com ${min} a ${max} caracteres (por exemplo "${f}": ${ex}).`,
    template: `o campo "template" tem de ser um destes: ${TEMPLATES.join(', ')} (por exemplo "template": "choice").`,
    category: (list) => `o campo "category" tem de ser um destes: ${list} (por exemplo "category": "${DEFAULT_CATEGORY}").`,
    difficulty: 'o campo "difficulty" tem de ser 1, 2 ou 3 (por exemplo "difficulty": 1).',
    unknown: (k, list) => `campo desconhecido "${k}": corrige o nome ou apaga-o (com este template os campos são: ${list}).`,
    typo: (k, f, ex) => `campo desconhecido "${k}": querias dizer "${f}"? (por exemplo "${f}": ${ex}).`,
    list: (f, min, max, what, ex) => `o campo "${f}" tem de ser uma lista de ${min} a ${max} ${what} (por exemplo "${f}": ${ex}).`,
    options: 'opções { "id", "text" }',
    items: 'itens { "id", "text" }',
    segments: 'textos, um por linha ou bocado',
    answers: 'respostas aceites',
    entryId: (f, i) => `o elemento ${i + 1} de "${f}" precisa de um "id" curto, só com letras minúsculas ou números e diferente dos outros (por exemplo "id": "a").`,
    entryText: (f, i) => `o elemento ${i + 1} de "${f}" precisa de um "text" com 1 a 200 caracteres (por exemplo "text": "Revogo o token").`,
    segmentText: (i) => `o elemento ${i + 1} de "segments" tem de ser um texto com 1 a 200 caracteres (por exemplo "eval(input);").`,
    acceptText: (i) => `o elemento ${i + 1} de "accept" tem de ser um texto com 1 a 80 caracteres (por exemplo "MFA").`,
    choiceAnswer: (ids) => `o campo "answer" tem de ser o id de uma das options: ${ids} (por exemplo "answer": "b").`,
    spotAnswer: (n) => `o campo "answer" tem de ser uma lista com os índices dos bocados inseguros, de 0 a ${n - 1}, sem repetidos e sem os marcar todos (por exemplo "answer": [1]).`,
    orderAnswer: 'o campo "answer" tem de ter todos os ids de "items", cada um uma vez, pela ordem certa (por exemplo "answer": ["c", "a", "b"]).',
    orderShuffled: 'os "items" já estão pela ordem certa: baralha-os e deixa a ordem certa em "answer" (por exemplo "items" b, c, a com "answer": ["a", "b", "c"]).',
    acceptAnswer: 'o campo "answer" (opcional) tem de ser uma das respostas de "accept" (por exemplo "answer": "MFA").',
    wrong: 'o campo "wrong" (opcional) tem de ser uma lista de respostas erradas, nenhuma igual à certa (por exemplo "wrong": ["a", "c"]).',
    language: 'o campo "language" (opcional) tem de ser um texto curto, como "js", "python" ou "text" (por exemplo "language": "js").',
    placeholder: 'o campo "placeholder" (opcional) tem de ser um texto com até 60 caracteres (por exemplo "placeholder": "Uma sigla").',
    scenario: `o campo "scenario" (opcional) tem de ser { "kind": ${SCENARIO_KINDS.map((k) => `"${k}"`).join(', ')}, "lines": ["…"] } (por exemplo "scenario": { "kind": "text", "lines": ["O token ficou no ecrã."] }).`,
    dontKnow: 'não sei',
    ex: {
      title: '"O token no ecrã partilhado"',
      concept: '"Um segredo que apareceu num ecrã partilhado já não é segredo."',
      prompt: '"O que fazes primeiro?"',
      explanation: '"Só revogar o token o torna inútil para quem o viu."',
      template: '"choice"',
      options: '[{ "id": "a", "text": "…" }, { "id": "b", "text": "…" }]',
      items: '[{ "id": "a", "text": "…" }, { "id": "b", "text": "…" }, { "id": "c", "text": "…" }]',
      segments: '["const a = 1;", "eval(input);"]',
      accept: '["MFA", "2FA"]',
      answer: { choice: '"b"', 'spot-the-flaw': '[1]', order: '["c", "a", "b"]', answer: '"MFA"' },
    },
  },
  en: {
    problems: `${MY_CARD_FILE} has problems:`,
    fixAndRun: 'Fix them and run again: node tools/gen.mjs',
    notJson: (line, col) => `is not valid JSON: there is an error at line ${line}, column ${col}. Every text goes between quotes "…" and there is no comma after the last field (for example { "title": "…", "template": "choice" }). Compare it with ${MY_CARD_EXAMPLE}.`,
    notObject: `must be an object { … }, like in ${MY_CARD_EXAMPLE}.`,
    missing: (f, ex) => `the field "${f}" is missing (for example "${f}": ${ex}).`,
    text: (f, min, max, ex) => `the field "${f}" must be a text with ${min} to ${max} characters (for example "${f}": ${ex}).`,
    template: `the field "template" must be one of: ${TEMPLATES.join(', ')} (for example "template": "choice").`,
    category: (list) => `the field "category" must be one of: ${list} (for example "category": "${DEFAULT_CATEGORY}").`,
    difficulty: 'the field "difficulty" must be 1, 2 or 3 (for example "difficulty": 1).',
    unknown: (k, list) => `unknown field "${k}": fix its name or delete it (with this template the fields are: ${list}).`,
    typo: (k, f, ex) => `unknown field "${k}": did you mean "${f}"? (for example "${f}": ${ex}).`,
    list: (f, min, max, what, ex) => `the field "${f}" must be a list of ${min} to ${max} ${what} (for example "${f}": ${ex}).`,
    options: 'options { "id", "text" }',
    items: 'items { "id", "text" }',
    segments: 'texts, one per line or piece',
    answers: 'accepted answers',
    entryId: (f, i) => `element ${i + 1} of "${f}" needs a short "id", with only lowercase letters or numbers and different from the others (for example "id": "a").`,
    entryText: (f, i) => `element ${i + 1} of "${f}" needs a "text" with 1 to 200 characters (for example "text": "I revoke the token").`,
    segmentText: (i) => `element ${i + 1} of "segments" must be a text with 1 to 200 characters (for example "eval(input);").`,
    acceptText: (i) => `element ${i + 1} of "accept" must be a text with 1 to 80 characters (for example "MFA").`,
    choiceAnswer: (ids) => `the field "answer" must be the id of one of the options: ${ids} (for example "answer": "b").`,
    spotAnswer: (n) => `the field "answer" must be a list with the indexes of the unsafe pieces, from 0 to ${n - 1}, with no repeats and not all of them (for example "answer": [1]).`,
    orderAnswer: 'the field "answer" must have every id of "items", each one once, in the right order (for example "answer": ["c", "a", "b"]).',
    orderShuffled: 'the "items" are already in the right order: shuffle them and keep the right order in "answer" (for example "items" b, c, a with "answer": ["a", "b", "c"]).',
    acceptAnswer: 'the field "answer" (optional) must be one of the answers in "accept" (for example "answer": "MFA").',
    wrong: 'the field "wrong" (optional) must be a list of wrong answers, none equal to the right one (for example "wrong": ["a", "c"]).',
    language: 'the field "language" (optional) must be a short text, such as "js", "python" or "text" (for example "language": "js").',
    placeholder: 'the field "placeholder" (optional) must be a text with up to 60 characters (for example "placeholder": "An acronym").',
    scenario: `the field "scenario" (optional) must be { "kind": ${SCENARIO_KINDS.map((k) => `"${k}"`).join(', ')}, "lines": ["…"] } (for example "scenario": { "kind": "text", "lines": ["The token was on screen."] }).`,
    dontKnow: "I don't know",
    ex: {
      title: '"The token on the shared screen"',
      concept: '"A secret that showed up on a shared screen is no longer a secret."',
      prompt: '"What do you do first?"',
      explanation: '"Only revoking the token makes it useless to whoever saw it."',
      template: '"choice"',
      options: '[{ "id": "a", "text": "…" }, { "id": "b", "text": "…" }]',
      items: '[{ "id": "a", "text": "…" }, { "id": "b", "text": "…" }, { "id": "c", "text": "…" }]',
      segments: '["const a = 1;", "eval(input);"]',
      accept: '["MFA", "2FA"]',
      answer: { choice: '"b"', 'spot-the-flaw': '[1]', order: '["c", "a", "b"]', answer: '"MFA"' },
    },
  },
};

// The same normalization as templates/answer.js (lowercase, no accents, no extra spaces or punctuation at the ends).
export function normalize(s) {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[\s"'.,;:!?()[\]{}]+|[\s"'.,;:!?()[\]{}]+$/g, '');
}

// Edit distance between two short names (to suggest the field the participant meant).
function distance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  }
  return d[a.length][b.length];
}

const isText = (v, min, max) => typeof v === 'string' && v.trim().length >= min && v.trim().length <= max;
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const uniq = (list) => list.filter((x, i) => list.findIndex((y) => same(x, y)) === i);

export const myCardTexts = (lang) => TEXTS[lang === 'en' ? 'en' : 'pt'];

// Validates the parsed JSON of specs/my-card.json. Returns { card, errors }.
export function validateMyCard(raw, { lang = 'pt', categories = [] } = {}) {
  const T = myCardTexts(lang);
  const E = [];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { card: null, errors: [T.notObject] };
  const text = (f, min, max, required = true) => {
    const v = raw[f];
    if (v === undefined || v === null || v === '') {
      if (required) E.push(T.missing(f, T.ex[f]));
      return undefined;
    }
    if (!isText(v, min, max)) {
      E.push(T.text(f, min, max, T.ex[f]));
      return undefined;
    }
    return v.trim();
  };

  const title = text('title', 4, 80);
  const concept = text('concept', 10, 300);
  const prompt = text('prompt', 5, 400);
  const explanation = text('explanation', 10, 500, false);
  const template = raw.template;
  if (template === undefined) E.push(T.missing('template', T.ex.template));
  else if (!TEMPLATES.includes(template)) E.push(T.template);

  const catIds = categories.map((c) => c.id);
  const category = raw.category ?? DEFAULT_CATEGORY;
  if (!catIds.includes(category)) E.push(T.category(catIds.join(', ')));
  const difficulty = raw.difficulty ?? 1;
  if (![1, 2, 3].includes(difficulty)) E.push(T.difficulty);

  if (TEMPLATES.includes(template)) {
    const known = [...COMMON, ...OWN[template]];
    for (const k of Object.keys(raw)) {
      if (k.startsWith('_') || k === 'id' || known.includes(k)) continue;
      const near = known.map((f) => [f, distance(k.toLowerCase(), f)]).sort((a, b) => a[1] - b[1])[0];
      const ex = (f) => (f === 'answer' ? T.ex.answer[template] : typeof T.ex[f] === 'string' ? T.ex[f] : { difficulty: '1', category: `"${DEFAULT_CATEGORY}"`, language: '"js"' }[f] ?? '"…"');
      E.push(near[1] <= 2 ? T.typo(k, near[0], ex(near[0])) : T.unknown(k, known.join(', ')));
    }
  }

  const card = { id: MY_CARD_ID, mode: 'participant', category, difficulty, template, title, concept, prompt };

  // A list of { id, text }: options (choice) or items (order).
  const entries = (f, min, max, what) => {
    const v = raw[f];
    if (v === undefined) {
      E.push(T.missing(f, T.ex[f]));
      return null;
    }
    if (!Array.isArray(v) || v.length < min || v.length > max) {
      E.push(T.list(f, min, max, what, T.ex[f]));
      return null;
    }
    const seen = new Set();
    let ok = true;
    v.forEach((o, i) => {
      if (!o || typeof o !== 'object' || typeof o.id !== 'string' || !/^[a-z0-9]{1,12}$/.test(o.id) || seen.has(o.id)) {
        E.push(T.entryId(f, i));
        ok = false;
      } else seen.add(o.id);
      if (!o || !isText(o.text, 1, 200)) {
        E.push(T.entryText(f, i));
        ok = false;
      }
    });
    return ok ? v.map((o) => ({ id: o.id, text: o.text.trim() })) : null;
  };
  const scenario = () => {
    const s = raw.scenario;
    if (s === undefined) return;
    const ok = s && typeof s === 'object' && SCENARIO_KINDS.includes(s.kind) && Array.isArray(s.lines) && s.lines.length >= 1 && s.lines.length <= 12 && s.lines.every((l) => isText(l, 1, 200)) && (s.label === undefined || isText(s.label, 1, 60));
    if (!ok) E.push(T.scenario);
    else card.scenario = { kind: s.kind, ...(s.label ? { label: s.label } : {}), lines: s.lines };
  };
  const wrongGiven = (isRight) => {
    const w = raw.wrong;
    if (w === undefined) return [];
    if (!Array.isArray(w) || w.some(isRight)) {
      E.push(T.wrong);
      return [];
    }
    return w;
  };

  if (template === 'choice') {
    const options = entries('options', 2, 6, T.options);
    scenario();
    if (options) {
      card.options = options;
      const ids = options.map((o) => o.id);
      if (raw.answer === undefined) E.push(T.missing('answer', T.ex.answer.choice));
      else if (!ids.includes(raw.answer)) E.push(T.choiceAnswer(ids.join(', ')));
      else {
        card.answer = raw.answer;
        const given = wrongGiven((x) => x === raw.answer);
        card.wrong = uniq([...given, ...ids.filter((x) => x !== raw.answer)]);
      }
    }
  } else if (template === 'spot-the-flaw') {
    const seg = raw.segments;
    let segments = null;
    if (seg === undefined) E.push(T.missing('segments', T.ex.segments));
    else if (!Array.isArray(seg) || seg.length < 2 || seg.length > 12) E.push(T.list('segments', 2, 12, T.segments, T.ex.segments));
    else {
      const bad = seg.findIndex((s) => typeof s !== 'string' || s.length < 1 || s.length > 200 || !s.trim());
      if (bad >= 0) E.push(T.segmentText(bad));
      else segments = seg;
    }
    if (raw.language !== undefined && !(typeof raw.language === 'string' && /^[a-z0-9+#-]{1,20}$/i.test(raw.language))) E.push(T.language);
    if (segments) {
      card.language = raw.language ?? 'text';
      card.segments = segments;
      const a = raw.answer;
      const n = segments.length;
      const valid = Array.isArray(a) && a.length >= 1 && a.length < n && a.every((i) => Number.isInteger(i) && i >= 0 && i < n) && new Set(a).size === a.length;
      if (a === undefined) E.push(T.missing('answer', T.ex.answer['spot-the-flaw']));
      else if (!valid) E.push(T.spotAnswer(n));
      else {
        const right = [...a].sort((x, y) => x - y);
        card.answer = right;
        const safe = [...Array(n).keys()].filter((i) => !right.includes(i));
        const candidates = [[safe[0]], [...right, safe[0]].sort((x, y) => x - y)];
        if (right.length > 1) candidates.push(right.slice(0, -1));
        const norm = (x) => (Array.isArray(x) ? [...new Set(x)].sort((p, q) => p - q) : x);
        const given = wrongGiven((x) => same(norm(x), right));
        card.wrong = uniq([...given, ...candidates]).filter((x) => !same(norm(x), right));
      }
    }
  } else if (template === 'order') {
    const items = entries('items', 3, 8, T.items);
    if (items) {
      card.items = items;
      const ids = items.map((o) => o.id);
      const a = raw.answer;
      if (a === undefined) E.push(T.missing('answer', T.ex.answer.order));
      else if (!Array.isArray(a) || a.length !== ids.length || [...a].sort().join('\n') !== [...ids].sort().join('\n')) E.push(T.orderAnswer);
      else if (same(a, ids)) E.push(T.orderShuffled);
      else {
        card.answer = a;
        const swapped = [a[1], a[0], ...a.slice(2)];
        const given = wrongGiven((x) => same(x, a));
        card.wrong = uniq([...given, ids, [...a].reverse(), swapped]).filter((x) => !same(x, a));
      }
    }
  } else if (template === 'answer') {
    const acc = raw.accept;
    let accept = null;
    if (acc === undefined) E.push(T.missing('accept', T.ex.accept));
    else if (!Array.isArray(acc) || acc.length < 1 || acc.length > 10) E.push(T.list('accept', 1, 10, T.answers, T.ex.accept));
    else {
      const bad = acc.findIndex((s) => !isText(s, 1, 80) || !normalize(s));
      if (bad >= 0) E.push(T.acceptText(bad));
      else accept = acc.map((s) => s.trim());
    }
    if (raw.placeholder !== undefined && !isText(raw.placeholder, 1, 60)) E.push(T.placeholder);
    scenario();
    if (accept) {
      const accepted = new Set(accept.map(normalize));
      const isRight = (x) => typeof x === 'string' && accepted.has(normalize(x));
      if (raw.placeholder !== undefined) card.placeholder = raw.placeholder.trim();
      card.accept = accept;
      if (raw.answer !== undefined && !isRight(raw.answer)) E.push(T.acceptAnswer);
      else {
        card.answer = raw.answer ?? accept[0];
        const given = wrongGiven(isRight);
        card.wrong = uniq([...given, T.dontKnow, '']).filter((x) => !isRight(x));
      }
    }
  }
  card.explanation = explanation ?? concept;
  card.depends = [];
  return E.length ? { card: null, errors: E } : { card, errors: [] };
}

// Reads and validates specs/my-card.json in an Arena. The language and the categories come from specs/cards.json.
export function readMyCard(root, specs = null) {
  const file = join(root, MY_CARD_FILE);
  if (!existsSync(file)) return { exists: false, card: null, errors: [] };
  let s = specs;
  if (!s) {
    try {
      s = JSON.parse(readFileSync(join(root, 'specs', 'cards.json'), 'utf8'));
    } catch {
      s = {};
    }
  }
  const lang = s.lang === 'en' ? 'en' : 'pt';
  const T = myCardTexts(lang);
  let raw;
  const src = readFileSync(file, 'utf8').replace(/^﻿/, '');
  try {
    raw = JSON.parse(src);
  } catch (e) {
    // Where the error is, in the Arena language (Node's own message is in English and changes between versions).
    const pos = Number(/position (\d+)/.exec(e.message)?.[1] ?? src.length);
    const before = src.slice(0, pos).split('\n');
    return { exists: true, card: null, errors: [T.notJson(before.length, before[before.length - 1].length + 1)] };
  }
  const r = validateMyCard(raw, { lang, categories: Array.isArray(s.categories) ? s.categories : [] });
  return { exists: true, ...r };
}

// The problems as one block of text, for the terminal.
export function myCardReport(errors, lang) {
  const T = myCardTexts(lang);
  return `${T.problems}\n- ${errors.join('\n- ')}\n${T.fixAndRun}`;
}
