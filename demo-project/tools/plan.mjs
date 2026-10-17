#!/usr/bin/env node
// Builds the Arena plan (DAG) for one mode and writes plan.json + PLAN.md.
//
//   node tools/plan.mjs [--mode participant|presenter] [--max N]
//   node tools/plan.mjs --apply .workshop/planner.json      applies the planner's adjustments
//
// (--modo participante|apresentador, --aplicar and --so-cartoes still work.)
// The graph is deterministic (it comes from the specs); the planner (Opus) can only adjust the
// parallelism and promote tasks to Sonnet, with a justification. The orchestrator (next-wave) follows plan.json.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ARENA as ROOT, loadEngine, legacyPlan, planTasks } from './engine.mjs';

const read = (p) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));
const argv = process.argv.slice(2);
const opt = (keys, d) => {
  for (const k of keys) {
    const i = argv.indexOf(k);
    if (i >= 0) return argv[i + 1];
  }
  return d;
};

const MODELS = {
  worker: 'claude-haiku-5-5',
  implementer: 'claude-sonnet-5-5',
  integrator: 'claude-sonnet-5-5',
  reviewer: 'claude-opus-5-5',
  planner: 'claude-opus-5-5',
  'memory-extractor': 'claude-haiku-5-5',
};

const MODE_ALIASES = { participant: 'participant', presenter: 'presenter', participante: 'participant', apresentador: 'presenter' };

const DIC = {
  pt: {
    instructions: {
      card: (c) => `Constrói o cartão ${c.id} ("${c.title}").
1. Lê cards/${c.id}/spec.md e cards/CONTRACT.md.
2. Escreve só cards/${c.id}/card.js, com o modelo indicado na spec.
3. Verifica: node --test cards/${c.id}/card.test.js
Responde com uma única linha: "OK ${c.id}" ou "FAILED ${c.id}: <motivo em poucas palavras>".`,
      lib: (t) => `Implementa ${t.files.join(', ')} conforme ${t.spec}.
Verifica: ${t.test.join(' ')}
Responde com uma única linha: "OK ${t.id}" ou "FAILED ${t.id}: <motivo>".`,
      page: (t) => `Implementa ${t.files.join(', ')} conforme ${t.spec}. Segue DESIGN.md.
Verifica: ${t.test.join(' ')}
Responde com uma única linha: "OK ${t.id}" ou "FAILED ${t.id}: <motivo>".`,
      integration: (t) => `Integração final. Segue ${t.spec}.
Corre a suite completa: node --test
Responde com uma única linha: "OK ${t.id}" ou "FAILED ${t.id}: <motivo>".`,
      review: (t) => `Revisão de segurança e qualidade. Segue ${t.spec}.
Lê primeiro .workshop/review-summary.md (já gerado). Escreve o veredito em .workshop/verdict.json.
Responde com uma única linha: "OK ${t.id}: <verdict>".`,
    },
    mode: { participant: 'participante', presenter: 'apresentador' },
    sonnet: (id) => `${id} → Sonnet`,
    parallelism: (n) => `paralelismo: ${n}`,
    pages: 'onda 2 · Sonnet<br/>categorias + pontuação',
    integration: 'onda 3 · Sonnet<br/>integração + suite',
    review: 'onda 4 · Opus<br/>revisão',
    planMd: (mode, n, crypto, max) => `# Plano da Arena — modo ${mode}

| onda | modelo | o quê | em paralelo |
|---|---|---|---|
| 1 | Haiku | \`lib-hash\` + ${n} cartões (${crypto} esperam pelo \`lib-hash\`) | até ${max} |
| 2 | Sonnet | página de categoria + tabela de pontuação | 2 |
| 3 | Sonnet | integração e suite completa; cartões que falhem 2× são refeitos em Sonnet | 1+ |
| 4 | Opus | revisão de segurança e qualidade, veredito final | 1 |
`,
    estimate: '## Estimativa de custo',
    adjustments: '## Ajustes do planner',
    risks: 'Riscos:',
    summary: (mode, total, n, max) => `# Resumo do plano (modo ${mode})

Tarefas: ${total} (${n} cartões, lib-hash, 2 páginas, integração, revisão).
Modelos: cartões e lib-hash em Haiku; páginas e integração em Sonnet; revisão em Opus.
Paralelismo atual: ${max}. Tentativas por tarefa: 3 (a 3.ª em Sonnet).

Cartões:`,
    dependsOn: (ids) => ` · depende de ${ids}`,
    invalidMode: 'o modo tem de ser participant ou presenter',
    noEngine: 'Falta o motor do workshop em tools/workshop/ (monta a Arena com o instalador).',
  },
  en: {
    instructions: {
      card: (c) => `Build the card ${c.id} ("${c.title}").
1. Read cards/${c.id}/spec.md and cards/CONTRACT.md.
2. Write only cards/${c.id}/card.js, with the template given in the spec.
3. Check: node --test cards/${c.id}/card.test.js
Answer with one single line: "OK ${c.id}" or "FAILED ${c.id}: <reason in a few words>".`,
      lib: (t) => `Implement ${t.files.join(', ')} as described in ${t.spec}.
Check: ${t.test.join(' ')}
Answer with one single line: "OK ${t.id}" or "FAILED ${t.id}: <reason>".`,
      page: (t) => `Implement ${t.files.join(', ')} as described in ${t.spec}. Follow DESIGN.md.
Check: ${t.test.join(' ')}
Answer with one single line: "OK ${t.id}" or "FAILED ${t.id}: <reason>".`,
      integration: (t) => `Final integration. Follow ${t.spec}.
Run the full suite: node --test
Answer with one single line: "OK ${t.id}" or "FAILED ${t.id}: <reason>".`,
      review: (t) => `Security and quality review. Follow ${t.spec}.
Read .workshop/review-summary.md first (already generated). Write the verdict to .workshop/verdict.json.
Answer with one single line: "OK ${t.id}: <verdict>".`,
    },
    mode: { participant: 'participant', presenter: 'presenter' },
    sonnet: (id) => `${id} → Sonnet`,
    parallelism: (n) => `parallelism: ${n}`,
    pages: 'wave 2 · Sonnet<br/>categories + score',
    integration: 'wave 3 · Sonnet<br/>integration + suite',
    review: 'wave 4 · Opus<br/>review',
    planMd: (mode, n, crypto, max) => `# Arena plan — ${mode} mode

| wave | model | what | in parallel |
|---|---|---|---|
| 1 | Haiku | \`lib-hash\` + ${n} cards (${crypto} wait for \`lib-hash\`) | up to ${max} |
| 2 | Sonnet | category page + score table | 2 |
| 3 | Sonnet | integration and full suite; cards that fail twice are redone in Sonnet | 1+ |
| 4 | Opus | security and quality review, final verdict | 1 |
`,
    estimate: '## Cost estimate',
    adjustments: '## Planner adjustments',
    risks: 'Risks:',
    summary: (mode, total, n, max) => `# Plan summary (${mode} mode)

Tasks: ${total} (${n} cards, lib-hash, 2 pages, integration, review).
Models: cards and lib-hash on Haiku; pages and integration on Sonnet; review on Opus.
Current parallelism: ${max}. Attempts per task: 3 (the 3rd on Sonnet).

Cards:`,
    dependsOn: (ids) => ` · depends on ${ids}`,
    invalidMode: 'mode must be participant or presenter',
    noEngine: 'The workshop engine is missing in tools/workshop/ (assemble the Arena with the installer).',
  },
};

const engine = await loadEngine(ROOT);
const T = engine.texts ? engine.texts(DIC) : DIC.pt;
const I = T.instructions;

// ---------- the plan (English schema; see tools/engine.mjs) ----------

function build(mode, maxParallel) {
  const specs = read('specs/cards.json');
  const extra = read('specs/tasks.json');
  const cards = specs.cards.filter((c) => mode === 'presenter' || c.mode === 'participant');
  const cat = Object.fromEntries(specs.categories.map((c) => [c.id, c.name]));
  const task = (t, group, type, instructions) => ({
    id: t.id,
    title: t.title,
    group,
    group_type: type,
    wave: t.wave,
    agent: t.agent,
    spec: t.spec,
    depends_on: t.depends || [],
    test: t.test,
    files: t.files,
    ...(t.prepare ? { prepare: t.prepare } : {}),
    instructions,
  });
  const tasks = [];
  for (const l of extra.lib) tasks.push(task(l, 'support', 'lib', I.lib(l)));
  for (const c of cards) {
    tasks.push({
      id: c.id,
      title: c.title,
      group: c.category,
      group_name: cat[c.category],
      group_type: 'card',
      wave: 1,
      agent: 'worker',
      depends_on: c.depends || [],
      test: ['node', '--test', `cards/${c.id}/card.test.js`],
      files: [`cards/${c.id}/card.js`],
      instructions: I.card(c),
    });
  }
  if (!argv.includes('--cards-only') && !argv.includes('--so-cartoes')) {
    for (const p of extra.pages) tasks.push(task(p, 'pages', 'page', I.page(p)));
    const integ = { ...extra.integration, depends: [...extra.integration.depends, '*cards'] };
    tasks.push(task(integ, 'integration', 'integration', I.integration(extra.integration)));
    tasks.push(task(extra.review, 'review', 'review', I.review(extra.review)));
  }
  return {
    v: 1,
    project: 'security-arena',
    mode,
    created_at: new Date().toISOString(),
    main_model: 'claude-sonnet-5-5',
    config: { max_parallel: maxParallel, max_attempts: 3, escalate_to: 'implementer' },
    agents: Object.fromEntries(Object.entries(MODELS).map(([k, v]) => [k, { model: v }])),
    adjustments: null,
    support_estimate: ['planner', 'memory-extractor'],
    tasks,
  };
}

// A plan.json written by an older Arena (Portuguese schema), turned into the English one.
function fromLegacy(p) {
  if (Array.isArray(p.tasks)) return p;
  const TYPE = { cartao: 'card', pagina: 'page', integracao: 'integration', revisao: 'review' };
  const MODE = { participante: 'participant', apresentador: 'presenter' };
  const DEP = { '*cartoes': '*cards', '*todas': '*all' };
  const test = (t) => (t && !Array.isArray(t) && t.ficheiro_json ? { json_file: t.ficheiro_json, field: t.campo } : t);
  return {
    v: p.v,
    project: p.projeto,
    mode: MODE[p.modo] ?? p.modo,
    created_at: p.criado_em,
    main_model: p.modelo_principal,
    config: { max_parallel: p.config?.max_paralelo, max_attempts: p.config?.max_tentativas, escalate_to: p.config?.escalar_para },
    agents: Object.fromEntries(Object.entries(p.agentes || {}).map(([k, v]) => [k === 'memoria-extrator' ? 'memory-extractor' : k, { model: v.modelo }])),
    adjustments: p.ajustes ? { justification: p.ajustes.justificacao, risks: p.ajustes.riscos, applied: p.ajustes.aplicados } : null,
    support_estimate: (p.apoio_estimativa || []).map((x) => (x === 'memoria-extrator' ? 'memory-extractor' : x)),
    tasks: planTasks(p).map((t) => ({
      id: t.id,
      title: t.titulo,
      group: t.grupo,
      ...(t.grupo_nome !== undefined ? { group_name: t.grupo_nome } : {}),
      group_type: TYPE[t.grupo_tipo] ?? t.grupo_tipo,
      wave: t.onda,
      agent: t.agente,
      ...(t.spec ? { spec: t.spec } : {}),
      depends_on: (t.depende || []).map((d) => DEP[d] ?? d),
      test: test(t.teste),
      files: t.ficheiros,
      ...(t.preparar ? { prepare: t.preparar } : {}),
      instructions: t.instrucoes,
    })),
  };
}

// The planner writes .workshop/planner.json (English keys; the older Portuguese ones are accepted).
function applyAdjustments(plan, adj) {
  const notes = [];
  const max = adj.max_parallel ?? adj.max_paralelo;
  if (Number.isInteger(max) && max >= 1 && max <= 16) {
    plan.config.max_parallel = max;
    notes.push(T.parallelism(max));
  }
  for (const id of adj.promote_to_sonnet || adj.promover_para_sonnet || []) {
    const t = plan.tasks.find((x) => x.id === id && x.agent === 'worker');
    if (t) {
      t.agent = 'implementer';
      notes.push(T.sonnet(id));
    }
  }
  const risks = adj.risks ?? adj.riscos ?? [];
  plan.adjustments = {
    justification: String(adj.justification ?? adj.justificacao ?? '').slice(0, 1500),
    risks: (Array.isArray(risks) ? risks : []).slice(0, 8).map(String),
    applied: notes,
  };
  return plan;
}

function mermaid(plan) {
  const L = ['flowchart LR'];
  const cards = plan.tasks.filter((t) => t.group_type === 'card');
  const nodeId = (id) => id.replace(/[^a-zA-Z0-9]/g, '_');
  L.push('  hash["lib-hash<br/>Haiku"]');
  if (plan.mode === 'presenter') {
    const groups = new Map();
    for (const c of cards) groups.set(c.group, [...(groups.get(c.group) || []), c]);
    for (const [g, cs] of groups) {
      L.push(`  ${nodeId('g-' + g)}["${cs[0].group_name} ×${cs.length}<br/>Haiku"]`);
      if (cs.some((c) => c.depends_on.includes('lib-hash'))) L.push(`  hash --> ${nodeId('g-' + g)}`);
      L.push(`  ${nodeId('g-' + g)} --> pages`);
    }
  } else {
    for (const c of cards) {
      L.push(`  ${nodeId(c.id)}["${c.id}<br/>${c.agent === 'worker' ? 'Haiku' : 'Sonnet'}"]`);
      if (c.depends_on.includes('lib-hash')) L.push(`  hash --> ${nodeId(c.id)}`);
      L.push(`  ${nodeId(c.id)} --> pages`);
    }
  }
  L.push('  hash --> pages');
  L.push(`  pages["${T.pages}"] --> integration["${T.integration}"]`);
  L.push(`  integration --> review["${T.review}"]`);
  return L.join('\n');
}

function planMd(plan, est) {
  const n = plan.tasks.filter((t) => t.group_type === 'card').length;
  const crypto = plan.tasks.filter((t) => t.depends_on.includes('lib-hash')).map((t) => t.id);
  const a = plan.adjustments;
  return `${T.planMd(T.mode[plan.mode] ?? plan.mode, n, crypto.join(', '), plan.config.max_parallel)}
\`\`\`mermaid
${mermaid(plan)}
\`\`\`

${T.estimate}

${est.table}
${a ? `\n${T.adjustments}\n\n${a.justification}\n\n${a.applied.map((x) => `- ${x}`).join('\n')}\n${a.risks.length ? `\n${T.risks}\n` + a.risks.map((r) => `- ${r}`).join('\n') : ''}` : ''}
`;
}

function plannerSummary(plan) {
  const cards = plan.tasks.filter((t) => t.group_type === 'card');
  const lines = cards.map((t) => `- ${t.id} · ${t.group} · ${t.title}${t.depends_on.length ? T.dependsOn(t.depends_on.join(', ')) : ''}`);
  return `${T.summary(T.mode[plan.mode] ?? plan.mode, plan.tasks.length, cards.length, plan.config.max_parallel)}
${lines.join('\n')}
`;
}

if (!engine.estimate?.estimate || !engine.estimate?.estimateTable) {
  console.error(T.noEngine);
  process.exit(1);
}

const applyFile = opt(['--apply', '--aplicar']);
let plan;
if (applyFile) {
  plan = fromLegacy(JSON.parse(readFileSync(join(ROOT, 'plan.json'), 'utf8')));
  if (existsSync(join(ROOT, applyFile))) plan = applyAdjustments(plan, JSON.parse(readFileSync(join(ROOT, applyFile), 'utf8')));
} else {
  const asked = opt(['--mode', '--modo'], 'participant');
  const mode = MODE_ALIASES[asked];
  if (!mode) {
    console.error(T.invalidMode);
    process.exit(2);
  }
  plan = build(mode, Number(opt(['--max'], process.env.ARENA_MAX_PARALLEL || process.env.ARENA_MAX_PARALELO || (mode === 'presenter' ? 16 : 8))));
}

// A newer engine reads the English plan; an older one only the Portuguese schema.
const written = engine.state?.normalizePlan ? plan : legacyPlan(plan);
const result = engine.estimate.estimate(written);
const est = { table: engine.estimate.estimateTable(result) };
writeFileSync(join(ROOT, 'plan.json'), JSON.stringify(written, null, 2) + '\n');
const md = planMd(plan, est);
writeFileSync(join(ROOT, 'PLAN.md'), md);
mkdirSync(join(ROOT, '.workshop'), { recursive: true });
writeFileSync(join(ROOT, '.workshop/plan-summary.md'), plannerSummary(plan));
console.log(md);
