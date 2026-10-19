#!/usr/bin/env node
// Writes the synthetic example replay of the Pocketknife's /status (canivete-project/replays/example/, and the
// English snapshot in canivete-project/i18n/en/replays/example/): the 30 tools of the catalogue (WORKSHOP-V2-SPEC.md,
// section 5.4) with 8 in parallel on Haiku, the 3 tools broken on purpose failing for good after 3 attempts, then the
// search page, the integration and the review. Deterministic (a fixed seed). Not a real recording.
//
//   node tools/dev/make-canivete-replay.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const KIT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PROJ = join(KIT, 'canivete-project');

// id, template, pt title, en title
const TOOLS = [
  ['tx-01', 'text', 'Contar palavras e tempo de leitura', 'Word count and reading time'],
  ['tx-02', 'text', 'Maiúsculas de título', 'Title case'],
  ['tx-03', 'text', 'Slug para URL', 'URL slug'],
  ['tx-04', 'text', 'Remover acentos', 'Remove accents'],
  ['tx-05', 'text', 'Contar ocorrências de uma palavra', 'Count a word'],
  ['nm-01', 'calc', 'X % de Y e Y é que % de X', 'X % of Y and Y is what % of X'],
  ['nm-02', 'calc', 'Regra de três simples', 'Rule of three'],
  ['nm-03', 'calc', 'Arredondar com casas decimais', 'Round to decimal places'],
  ['nm-04', 'calc', 'Média e mediana de uma lista', 'Mean and median of a list'],
  ['nm-05', 'convert', 'Numeração romana ↔ árabe', 'Roman ↔ Arabic numerals'],
  ['dt-01', 'calc', 'Dias entre duas datas', 'Days between two dates'],
  ['dt-02', 'calc', 'Idade numa data', 'Age on a date'],
  ['dt-03', 'calc', 'Dia da semana de uma data', 'Day of the week of a date'],
  ['dt-04', 'calc', 'Somar dias a uma data', 'Add days to a date'],
  ['dt-05', 'convert', 'Hora noutro fuso (offset fixo)', 'Time in another time zone (fixed offset)'],
  ['dn-01', 'calc', 'Gorjeta e divisão da conta', 'Tip and bill split'],
  ['dn-02', 'calc', 'IVA: com e sem (23 %, 13 %, 6 %)', 'VAT: with and without'],
  ['dn-03', 'calc', 'Juros compostos', 'Compound interest'],
  ['dn-04', 'calc', 'Prestação de um empréstimo', 'Loan payment'],
  ['dn-05', 'calc', 'Descontos em cascata', 'Stacked discounts'],
  ['dv-01', 'text', 'Formatar JSON', 'Format JSON'],
  ['dv-02', 'convert', 'Base64 codificar e descodificar', 'Base64 encode and decode'],
  ['dv-03', 'generate', 'Gerar UUID v4', 'Generate a UUID v4'],
  ['dv-04', 'convert', 'Cor HEX ↔ RGB', 'HEX ↔ RGB color'],
  ['dv-05', 'text', 'Validar um email (regras simples)', 'Check an email address (simple rules)'],
  ['dd-01', 'convert', 'Medidas de cozinha (chávena, colher, g)', 'Kitchen measures (cup, spoon, g)'],
  ['dd-02', 'calc', 'Consumo de combustível (l/100 km)', 'Fuel consumption (l/100 km)'],
  ['dd-03', 'generate', 'Gerador de password', 'Password generator'],
  ['dd-04', 'convert', 'Celsius ↔ Fahrenheit', 'Celsius ↔ Fahrenheit'],
  ['dd-05', 'generate', 'Sorteio de nomes', 'Name draw'],
];
const CATEGORY = { tx: 'text', nm: 'numbers', dt: 'dates', dn: 'money', dv: 'dev', dd: 'daily' };
const BROKEN = new Set(['tx-02', 'nm-03', 'dn-01']);
const SUPPORT = [
  { id: 'index-page', pt: 'Página de pesquisa e categorias', en: 'Search and categories page', group_type: 'page', wave: 2, agent: 'implementer-01', model: 'claude-sonnet-5-5', test: 'node --test pages/catalog.test.js', passed: 20, s: 74, cost: 0.0612 },
  { id: 'integration', pt: 'Integração e suite completa', en: 'Integration and full suite', group_type: 'integration', wave: 3, agent: 'integrator-01', model: 'claude-sonnet-5-5', test: 'node tools/check-integration.mjs', passed: 163, s: 52, cost: 0.0488 },
  { id: 'review', pt: 'Revisão de segurança e qualidade', en: 'Security and quality review', group_type: 'review', wave: 4, agent: 'reviewer-01', model: 'claude-opus-5-5', s: 96, cost: 0.2914 },
];
const GAP_EXCERPT = {
  pt: {
    'tx-02': 'para {"text":"a casa de papel"} a ferramenta devolveu "A Casa De Papel", mas não é esse o resultado que o teste espera.',
    'nm-03': 'para {"value":"1,005","places":"2"} a ferramenta devolveu 1, mas não é esse o resultado que o teste espera.',
    'dn-01': 'para {"total":"100","tip":"0","people":"3"} a ferramenta devolveu {"tip":0,"total":100,"per_person":33.33}, mas não é esse o resultado que o teste espera.',
  },
  en: {
    'tx-02': 'for {"text":"the lord of the rings"} the tool returned "The Lord Of The Rings", but that is not the result the test expects.',
    'nm-03': 'for {"value":"1.005","places":"2"} the tool returned 1, but that is not the result the test expects.',
    'dn-01': 'for {"total":"100","tip":"0","people":"3"} the tool returned {"tip":0,"total":100,"per_person":33.33}, but that is not the result the test expects.',
  },
};

// mulberry32, so every run writes the same files.
let a = 20261019;
const random = () => {
  a = (a + 0x6d2b79f5) >>> 0;
  let t = a;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const between = (lo, hi) => lo + Math.round(random() * (hi - lo));

const START = Date.parse('2026-10-19T10:00:00.000Z');
const iso = (s) => new Date(START + s * 1000).toISOString();
const events = [];
const ev = (s, e) => events.push({ s, e: { ts: iso(s), ...e } });
const final = new Map();

ev(0, { type: 'start', mode: 'participant', total: TOOLS.length + SUPPORT.length });

// Wave 1: 8 slots; each slot takes the next attempt that is waiting (a red tool goes back to the end of the queue).
// A retry is ready only after its previous attempt was graded.
const queue = TOOLS.map(([id]) => ({ id, attempt: 1, ready: 0 }));
const slots = Array.from({ length: 8 }, (_, i) => ({ free: 20 + i, n: i + 1 }));
let mainCost = 0;
while (queue.length) {
  queue.sort((x, y) => x.ready - y.ready);
  const job = queue.shift();
  const slot = slots.reduce((x, y) => (y.free < x.free ? y : x));
  const t0 = Math.max(slot.free, job.ready);
  const dur = between(18, 55) + (job.attempt > 1 ? 10 : 0);
  const agent = `worker-${String(slot.n).padStart(2, '0')}`;
  const model = 'claude-haiku-5-5';
  const cost = Number((0.0018 + random() * 0.0035).toFixed(4));
  const red = BROKEN.has(job.id);
  ev(t0, { type: 'state', task: job.id, state: 'working', attempt: job.attempt, agent, model });
  ev(t0 + dur, { type: 'cost', task: job.id, attempt: job.attempt, agent, model, cost_usd: cost, duration_s: dur });
  const state = red ? (job.attempt < 3 ? 'red' : 'failed') : 'green';
  ev(t0 + dur + 2, { type: 'state', task: job.id, state, attempt: job.attempt, agent, model });
  const prev = final.get(job.id);
  final.set(job.id, { state, attempt: job.attempt, agent, model, seconds: dur, cost_usd: Number(((prev?.cost_usd || 0) + cost).toFixed(4)) });
  if (red && job.attempt < 3) queue.push({ id: job.id, attempt: job.attempt + 1, ready: t0 + dur + 3 });
  slot.free = t0 + dur + 3;
  mainCost += 0.0011;
  if (events.length % 9 === 0) ev(t0 + dur + 2, { type: 'cost', task: null, attempt: null, agent: 'main', model: 'claude-sonnet-5-5', cost_usd: 0.0123, duration_s: null });
}
let t = Math.max(...slots.map((s) => s.free)) + 6;
for (const x of SUPPORT) {
  ev(t, { type: 'state', task: x.id, state: 'working', attempt: 1, agent: x.agent, model: x.model });
  ev(t + x.s, { type: 'cost', task: x.id, attempt: 1, agent: x.agent, model: x.model, cost_usd: x.cost, duration_s: x.s });
  ev(t + x.s + 1, { type: 'state', task: x.id, state: 'green', attempt: 1, agent: x.agent, model: x.model });
  final.set(x.id, { state: 'green', attempt: 1, agent: x.agent, model: x.model, seconds: x.s, cost_usd: x.cost });
  t += x.s + 6;
}
ev(t, { type: 'cost', task: null, attempt: null, agent: 'main', model: 'claude-sonnet-5-5', cost_usd: Number((0.0912 + mainCost).toFixed(4)), duration_s: null });
ev(t + 4, { type: 'end' });

events.sort((x, y) => x.s - y.s);
const subagents = [...final.values()].reduce((s, x) => s + x.cost_usd, 0);
const main = events.filter((x) => x.e.type === 'cost' && x.e.task === null).reduce((s, x) => s + x.e.cost_usd, 0);

function snapshot(lang) {
  const tasks = [
    ...TOOLS.map(([id, template, pt, en]) => {
      const f = final.get(id);
      return {
        id, title: lang === 'en' ? en : pt, group: CATEGORY[id.slice(0, 2)], group_type: 'tool', wave: 1, ...f,
        test: {
          command: `node --test tools/${id}/tool.test.js`,
          code: f.state === 'green' ? 0 : 1,
          passed: f.state === 'green' ? between(6, 9) : 7,
          failed: f.state === 'green' ? 0 : 1,
          excerpt: f.state === 'green' ? '' : GAP_EXCERPT[lang][id],
          ms: between(60, 140),
        },
        template,
      };
    }),
    ...SUPPORT.map((x) => ({
      id: x.id, title: x[lang], group: x.group_type, group_type: x.group_type, wave: x.wave, ...final.get(x.id),
      test: x.id === 'review' ? { file: '.workshop/verdict.json', value: 'approved_with_reservations', excerpt: '', ms: 9 } : { command: x.test, code: 0, passed: x.passed, failed: 0, excerpt: '', ms: between(400, 2400) },
    })),
  ].map(({ template, ...rest }) => rest);
  const counts = { todo: 0, working: 0, green: 0, red: 0, failed: 0 };
  for (const x of tasks) counts[x.state]++;
  return {
    description: lang === 'en'
      ? 'Synthetic run of the 30 tools with 8 in parallel on Haiku, to rehearse /status. Not a real recording.'
      : 'Execução sintética das 30 ferramentas com 8 em paralelo em Haiku, para ensaiar o /status. Não é uma gravação real.',
    synthetic: true,
    generated_at: iso(t + 6),
    mode: 'participant',
    start: iso(0),
    end: iso(t + 4),
    total: tasks.length,
    counts,
    cost: { total: Number((subagents + main).toFixed(4)), main: Number(main.toFixed(4)), subagents: Number(subagents.toFixed(4)) },
    budget: { target_usd: 5, cap_usd: 10 },
    tasks,
  };
}

const write = (rel, text) => {
  mkdirSync(dirname(join(PROJ, rel)), { recursive: true });
  writeFileSync(join(PROJ, rel), text);
};
write('replays/example/events.jsonl', events.map((x) => JSON.stringify(x.e)).join('\n') + '\n');
write('replays/example/snapshot.json', JSON.stringify(snapshot('pt'), null, 2) + '\n');
write('i18n/en/replays/example/snapshot.json', JSON.stringify(snapshot('en'), null, 2) + '\n');
console.log(`replay: ${events.length} events, ${TOOLS.length + SUPPORT.length} tasks, ${Math.round((t + 4) / 60)} min, US$ ${(subagents + main).toFixed(2)}`);
