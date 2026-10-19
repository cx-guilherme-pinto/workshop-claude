#!/usr/bin/env node
// Builds the Pocketknife plan (DAG) and writes plan.json + PLAN.md (docs/pt/WORKSHOP-V2-SPEC.md, sections 5.1 and 5.2).
//
//   node tools/plan.mjs [--parallel 4|8|12] [--model haiku|sonnet] [--forecast <minutes>|none] [--mode participant|presenter]
//
// The participant's decisions: D2 the parallelism (default 8; 16 in presenter mode), D3 the model of the tools
// (default Haiku) and D4 the forecast of the swarm's minutes (optional, only for the panel). The graph is
// deterministic: wave 1 the 30 tools (+ your tool my-01), wave 2 the search page (Sonnet), wave 3 the integration
// (Sonnet), wave 4 the review (Opus). The orchestrator (next-wave) follows plan.json.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readMyTool, myToolReport, MY_TOOL_ID } from './my-tool.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));
const argv = process.argv.slice(2);
const opt = (k, d) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : d);

const MODELS = {
  worker: 'claude-haiku-5-5',
  implementer: 'claude-sonnet-5-5',
  integrator: 'claude-sonnet-5-5',
  reviewer: 'claude-opus-5-5',
  'memory-extractor': 'claude-haiku-5-5',
};
const AGENT_OF = { haiku: 'worker', sonnet: 'implementer' };
const PARALLEL = [4, 8, 12];

const specs = read('specs/tools.json');
const extra = read('specs/tasks.json');
const LANG = specs.lang === 'en' ? 'en' : 'pt';

const T = {
  pt: {
    tool: (t) => `Constrói a ferramenta ${t.id} ("${t.title}").
1. Lê tools/${t.id}/spec.md e tools/CONTRACT.md.
2. Escreve só tools/${t.id}/tool.js, com o modelo indicado na spec.
3. Verifica: node --test tools/${t.id}/tool.test.js
Responde com uma única linha: "OK ${t.id}" ou "FAILED ${t.id}: <motivo em poucas palavras>".`,
    page: (t) => `Implementa ${t.files.join(', ')} conforme ${t.spec}. Segue DESIGN.md.
Verifica: ${t.test.join(' ')}
Responde com uma única linha: "OK ${t.id}" ou "FAILED ${t.id}: <motivo>".`,
    integration: (t) => `Integração final. Segue ${t.spec}.
Corre a verificação: ${t.test.join(' ')}
Responde com uma única linha: "OK ${t.id}" ou "FAILED ${t.id}: <motivo>".`,
    review: (t) => `Revisão de segurança e qualidade. Segue ${t.spec}.
Lê primeiro .workshop/review-summary.md (já gerado). Escreve o veredito em .workshop/verdict.json.
Responde com uma única linha: "OK ${t.id}: <verdict>".`,
    planMd: (n, par, model, forecast) => `# Plano do Canivete

| onda | modelo | o quê | em paralelo |
|---|---|---|---|
| 1 | ${model} | ${n} ferramentas | até ${par} |
| 2 | Sonnet | página de pesquisa e categorias | 1 |
| 3 | Sonnet | integração e suite completa; ferramentas que falhem 2× são refeitas em Sonnet | 1 |
| 4 | Opus | revisão de segurança e qualidade, veredito final | 1 |

As tuas decisões: **${par} agentes em paralelo**, ferramentas em **${model}**${forecast === null ? '' : `, previsão **${forecast} min**`}. Para mudar: \`/demo-plan --parallel 4|8|12 --model haiku|sonnet\`.
`,
    estimate: '## Estimativa de custo',
    noEngine: 'Falta o motor do workshop em tools/workshop/ (monta o projeto com o instalador).',
    invalidParallel: '--parallel tem de ser 4, 8 ou 12 (por exemplo: node tools/plan.mjs --parallel 8)',
    invalidModel: '--model tem de ser haiku ou sonnet (por exemplo: node tools/plan.mjs --model haiku)',
    invalidForecast: '--forecast tem de ser um número de minutos entre 1 e 120, ou none',
    myToolNotGenerated: `Falta gerar a tua ferramenta (${MY_TOOL_ID}): corre node tools/gen.mjs e depois volta a planear.`,
    notGenerated: 'Faltam as specs e os testes: corre node tools/gen.mjs.',
    summary: (n, par, model) => `# Resumo do plano\n\nTarefas: ${n + 3} (${n} ferramentas, página de pesquisa, integração, revisão).\nFerramentas em ${model}, até ${par} em paralelo. Tentativas por tarefa: 3 (a 3.ª em Sonnet).\n`,
    mermaid: { tools: (cat, n, m) => `${cat} ×${n}<br/>${m}`, index: 'onda 2 · Sonnet<br/>pesquisa', integration: 'onda 3 · Sonnet<br/>integração', review: 'onda 4 · Opus<br/>revisão' },
  },
  en: {
    tool: (t) => `Build the tool ${t.id} ("${t.title}").
1. Read tools/${t.id}/spec.md and tools/CONTRACT.md.
2. Write only tools/${t.id}/tool.js, with the template given in the spec.
3. Check: node --test tools/${t.id}/tool.test.js
Answer with one single line: "OK ${t.id}" or "FAILED ${t.id}: <reason in a few words>".`,
    page: (t) => `Implement ${t.files.join(', ')} as described in ${t.spec}. Follow DESIGN.md.
Check: ${t.test.join(' ')}
Answer with one single line: "OK ${t.id}" or "FAILED ${t.id}: <reason>".`,
    integration: (t) => `Final integration. Follow ${t.spec}.
Run the check: ${t.test.join(' ')}
Answer with one single line: "OK ${t.id}" or "FAILED ${t.id}: <reason>".`,
    review: (t) => `Security and quality review. Follow ${t.spec}.
Read .workshop/review-summary.md first (already generated). Write the verdict to .workshop/verdict.json.
Answer with one single line: "OK ${t.id}: <verdict>".`,
    planMd: (n, par, model, forecast) => `# Pocketknife plan

| wave | model | what | in parallel |
|---|---|---|---|
| 1 | ${model} | ${n} tools | up to ${par} |
| 2 | Sonnet | search and categories page | 1 |
| 3 | Sonnet | integration and full suite; tools that fail twice are redone in Sonnet | 1 |
| 4 | Opus | security and quality review, final verdict | 1 |

Your decisions: **${par} agents in parallel**, tools on **${model}**${forecast === null ? '' : `, forecast **${forecast} min**`}. To change them: \`/demo-plan --parallel 4|8|12 --model haiku|sonnet\`.
`,
    estimate: '## Cost estimate',
    noEngine: 'The workshop engine is missing in tools/workshop/ (assemble the project with the installer).',
    invalidParallel: '--parallel must be 4, 8 or 12 (for example: node tools/plan.mjs --parallel 8)',
    invalidModel: '--model must be haiku or sonnet (for example: node tools/plan.mjs --model haiku)',
    invalidForecast: '--forecast must be a number of minutes between 1 and 120, or none',
    myToolNotGenerated: `Your tool (${MY_TOOL_ID}) is not generated yet: run node tools/gen.mjs, then plan again.`,
    notGenerated: 'The specs and tests are missing: run node tools/gen.mjs.',
    summary: (n, par, model) => `# Plan summary\n\nTasks: ${n + 3} (${n} tools, search page, integration, review).\nTools on ${model}, up to ${par} in parallel. Attempts per task: 3 (the 3rd on Sonnet).\n`,
    mermaid: { tools: (cat, n, m) => `${cat} ×${n}<br/>${m}`, index: 'wave 2 · Sonnet<br/>search', integration: 'wave 3 · Sonnet<br/>integration', review: 'wave 4 · Opus<br/>review' },
  },
}[LANG];

function fail(msg, code = 1) {
  console.error(msg);
  process.exit(code);
}

// ---------- the participant's decisions ----------

const mode = { participant: 'participant', participante: 'participant', presenter: 'presenter', apresentador: 'presenter' }[opt('--mode', 'participant')] ?? fail('--mode: participant | presenter', 2);
const parallel = Number(opt('--parallel', mode === 'presenter' ? 16 : 8));
if (mode !== 'presenter' && !PARALLEL.includes(parallel)) fail(T.invalidParallel, 2);
const model = String(opt('--model', 'haiku')).toLowerCase();
if (!AGENT_OF[model]) fail(T.invalidModel, 2);
const f = opt('--forecast', 'none');
const forecast = f === 'none' || f === '' ? null : Number(f);
if (forecast !== null && !(Number.isInteger(forecast) && forecast >= 1 && forecast <= 120)) fail(T.invalidForecast, 2);

// ---------- the plan ----------

const mine = readMyTool(ROOT, specs);
if (mine.errors.length) fail(myToolReport(mine.errors, LANG));
if (mine.tool && !existsSync(join(ROOT, 'tools', MY_TOOL_ID, 'tool.test.js'))) fail(T.myToolNotGenerated);
const tools = mine.tool ? [...specs.tools, mine.tool] : specs.tools;
if (tools.some((t) => !existsSync(join(ROOT, 'tools', t.id, 'tool.test.js')))) fail(T.notGenerated);
const cat = Object.fromEntries(specs.categories.map((c) => [c.id, c.name]));
const support = (t, group, type, instructions) => ({
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
const tasks = tools.map((t) => ({
  id: t.id,
  title: t.title,
  group: t.category,
  group_name: cat[t.category],
  // "card": the orchestrator's unit of wave 1 (escalated to Sonnet on the last attempt), here a tool
  group_type: 'card',
  wave: 1,
  agent: AGENT_OF[model],
  depends_on: [],
  test: ['node', '--test', `tools/${t.id}/tool.test.js`],
  files: [`tools/${t.id}/tool.js`],
  // a tool broken on purpose: the orchestrator fails it on its first failed attempt; a person fixes its spec.md
  ...(t.spec_gaps?.length ? { spec_gap: true } : {}),
  instructions: T.tool(t),
}));
for (const p of extra.pages) tasks.push(support({ ...p, depends: (p.depends || []).map((d) => (d === '*tools' ? '*cards' : d)) }, 'pages', 'page', T.page(p)));
tasks.push(support({ ...extra.integration, depends: [...extra.integration.depends, '*cards'] }, 'integration', 'integration', T.integration(extra.integration)));
tasks.push(support(extra.review, 'review', 'review', T.review(extra.review)));

const plan = {
  v: 1,
  project: 'canivete',
  mode,
  created_at: new Date().toISOString(),
  main_model: 'claude-sonnet-5-5',
  config: { max_parallel: parallel, max_attempts: 3, escalate_to: 'implementer', model, forecast_min: forecast },
  agents: Object.fromEntries(Object.entries(MODELS).map(([k, v]) => [k, { model: v }])),
  adjustments: null,
  support_estimate: ['memory-extractor'],
  tasks,
};

// ---------- PLAN.md, the estimate and the files ----------

const { loadEngine } = await import('./engine.mjs');
const engine = await loadEngine(ROOT);
if (!engine.estimate?.estimate || !engine.estimate?.estimateTable) fail(T.noEngine);
const est = engine.estimate.estimateTable(engine.estimate.estimate(plan));
const modelName = model === 'haiku' ? 'Haiku' : 'Sonnet';
const groups = new Map();
for (const t of tasks.filter((x) => x.group_type === 'card')) groups.set(t.group, [...(groups.get(t.group) || []), t]);
const node = (id) => id.replace(/[^a-zA-Z0-9]/g, '_');
const mermaid = ['flowchart LR', ...[...groups].map(([g, ts]) => `  ${node('g-' + g)}["${T.mermaid.tools(ts[0].group_name, ts.length, modelName)}"] --> index`), `  index["${T.mermaid.index}"] --> integration["${T.mermaid.integration}"]`, `  integration --> review["${T.mermaid.review}"]`].join('\n');
const n = tools.length;
const md = `${T.planMd(n, parallel, modelName, forecast)}
\`\`\`mermaid
${mermaid}
\`\`\`

${T.estimate}

${est}
`;
writeFileSync(join(ROOT, 'plan.json'), JSON.stringify(plan, null, 2) + '\n');
writeFileSync(join(ROOT, 'PLAN.md'), md);
mkdirSync(join(ROOT, '.workshop'), { recursive: true });
writeFileSync(join(ROOT, '.workshop/plan-summary.md'), T.summary(n, parallel, modelName));

// The workshop panel (spec 6.4): the decisions D2, D3 and D4, never anything else.
try {
  const { emit } = await import('./workshop/orchestrator/lib/telemetry.mjs');
  await emit('p1_plan', { parallel: mode === 'presenter' ? undefined : parallel, model, forecast_min: forecast, tasks: tasks.length });
} catch {
  /* no telemetry */
}
console.log(md);
