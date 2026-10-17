#!/usr/bin/env node
// Validates and completes a plan proposed by the planner (Project 2, /task-plan):
//   - schema, unique ids, existing dependencies, no cycles;
//   - known agents; models from the role;
//   - adds the integration and the review at the end, if they are missing;
//   - writes .workshop/plan.json and .workshop/PLAN.md (with Mermaid and the estimate).
//
//   node validate-plan.mjs <proposal.json> [--project <dir>] [--global-test '["npm","test"]']
// Errors, warnings, agent instructions and PLAN.md are in the kit language; "PLAN INVALID" is a marker.
// The proposal uses English keys (tasks, title, agent, depends_on, files, test, instructions...); the
// older Portuguese keys (tarefas, titulo, agente, depende, ficheiros, teste, instrucoes...) still work.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { estimar, tabelaEstimativa } from './estimate.mjs';
import { normalizarPlano } from './lib/state.mjs';
import { isMain } from './lib/is-main.mjs';
import { opt } from './lib/args.mjs';
import { lingua, textos } from '../hooks/lib/language.mjs';

export const PLAN_MD = 'PLAN.md';

export const PAPEIS = {
  'ws-worker': { modelo: 'claude-haiku-5-5', nome: 'Haiku' },
  'ws-implementer': { modelo: 'claude-sonnet-5-5', nome: 'Sonnet' },
  'ws-integrator': { modelo: 'claude-sonnet-5-5', nome: 'Sonnet' },
  'ws-reviewer': { modelo: 'claude-opus-5-5', nome: 'Opus' },
  'ws-planner': { modelo: 'claude-opus-5-5', nome: 'Opus' },
};

// "OK <id>" and "FAILED <id>" are markers: English in both languages (the terminal recording looks for FAILED).
const TEXTOS = {
  pt: {
    semTarefas: 'o plano não tem tarefas',
    idInvalido: (id) => `id inválido: ${id}`,
    idRepetido: (id) => `id repetido: ${id}`,
    agente: (id, a) => `${id}: agente desconhecido ${a} (usa ws-worker ou ws-implementer)`,
    instrucoes: (id) => `${id}: faltam instruções`,
    semFicheiros: (id) => `${id}: sem ficheiros declarados (o paralelismo fica menos seguro)`,
    testeLista: (id) => `${id}: o teste tem de ser uma lista, ex.: ["npm","test"]`,
    semTeste: (id) => `${id}: sem teste; fica verde quando o agente terminar`,
    depende: (id, d) => `${id}: depende de ${d}, que não existe`,
    ciclo: (id) => `ciclo de dependências em ${id}`,
    verifica: (cmd) => `\nVerifica: ${cmd}`,
    responde: (id) => `\nResponde com uma única linha: "OK ${id}" ou "FAILED ${id}: <motivo>".`,
    integracaoTitulo: 'Integração e suite completa',
    integracao: (ids, cmd) => `Integra o trabalho das tarefas ${ids}. Corre ${cmd || 'os testes do projeto'} e corrige só problemas de integração. Escreve um resumo curto em .workshop/integration.md.\nResponde com uma única linha: "OK integration" ou "FAILED integration: <motivo>".`,
    revisaoTitulo: 'Revisão de segurança e qualidade',
    revisao: 'Revê as alterações para produção. Lê primeiro .workshop/review-summary.md e depois só os ficheiros que ele lista. Escreve .workshop/verdict.json.\nResponde com uma única linha: "OK review: <verdict>".',
    invalido: 'PLAN INVALID — o plano tem erros:',
    titulo: 'Plano',
    resumo: (n, m) => `${n} tarefas · até ${m} agentes em paralelo`,
    worktrees: ' · cada agente no seu git worktree',
    colunas: ['| tarefa | onda | agente | ficheiros | teste |', '|---|---|---|---|---|'],
    veredito: 'veredito',
    porque: '## Porquê este número de agentes',
    riscos: 'Riscos:',
    estimativa: '## Estimativa de custo',
    avisos: '## Avisos',
  },
  en: {
    semTarefas: 'the plan has no tasks',
    idInvalido: (id) => `invalid id: ${id}`,
    idRepetido: (id) => `repeated id: ${id}`,
    agente: (id, a) => `${id}: unknown agent ${a} (use ws-worker or ws-implementer)`,
    instrucoes: (id) => `${id}: missing instructions`,
    semFicheiros: (id) => `${id}: no files declared (parallel work is less safe)`,
    testeLista: (id) => `${id}: test must be a list, e.g. ["npm","test"]`,
    semTeste: (id) => `${id}: no test; it turns green when the agent finishes`,
    depende: (id, d) => `${id}: depends on ${d}, which does not exist`,
    ciclo: (id) => `dependency cycle at ${id}`,
    verifica: (cmd) => `\nCheck: ${cmd}`,
    responde: (id) => `\nReply with a single line: "OK ${id}" or "FAILED ${id}: <reason>".`,
    integracaoTitulo: 'Integration and full suite',
    integracao: (ids, cmd) => `Integrate the work of tasks ${ids}. Run ${cmd || 'the project tests'} and fix only integration problems. Write a short summary in .workshop/integration.md.\nReply with a single line: "OK integration" or "FAILED integration: <reason>".`,
    revisaoTitulo: 'Security and quality review',
    revisao: 'Review the changes for production. First read .workshop/review-summary.md and then only the files it lists. Write .workshop/verdict.json.\nReply with a single line: "OK review: <verdict>".',
    invalido: 'PLAN INVALID — the plan has errors:',
    titulo: 'Plan',
    resumo: (n, m) => `${n} tasks · up to ${m} agents in parallel`,
    worktrees: ' · each agent in its own git worktree',
    colunas: ['| task | wave | agent | files | test |', '|---|---|---|---|---|'],
    veredito: 'verdict',
    porque: '## Why this number of agents',
    riscos: 'Risks:',
    estimativa: '## Cost estimate',
    avisos: '## Warnings',
  },
};

// A proposed task, from English or Portuguese keys.
const campo = (o, en, pt) => (o?.[en] !== undefined ? o[en] : o?.[pt]);
function tarefaProposta(t) {
  return {
    id: t.id,
    titulo: campo(t, 'title', 'titulo'),
    grupo: campo(t, 'group', 'grupo'),
    agente: campo(t, 'agent', 'agente'),
    depende: campo(t, 'depends_on', 'depende') ?? t.depends,
    ficheiros: campo(t, 'files', 'ficheiros'),
    teste: campo(t, 'test', 'teste'),
    instrucoes: campo(t, 'instructions', 'instrucoes'),
    jira: t.jira,
  };
}

// `l` ('pt'|'en') is optional: it defaults to the kit language.
// Returns { erros, avisos, plano }, where plano is the plan to write to plan.json (English keys).
export function validar(proposta, { teste_global = null, global_test = teste_global, l = lingua() } = {}) {
  const T = textos(TEXTOS, l);
  const erros = [];
  const avisos = [];
  const bruto = campo(proposta, 'tasks', 'tarefas');
  const tarefas = Array.isArray(bruto) ? bruto.map(tarefaProposta) : [];
  if (!tarefas.length) erros.push(T.semTarefas);
  const ids = new Set();
  for (const t of tarefas) {
    if (!t.id || !/^[a-z0-9][a-z0-9-]{0,40}$/.test(t.id)) erros.push(T.idInvalido(JSON.stringify(t.id)));
    if (ids.has(t.id)) erros.push(T.idRepetido(t.id));
    ids.add(t.id);
    if (!PAPEIS[t.agente]) erros.push(T.agente(t.id, t.agente));
    if (!t.instrucoes || String(t.instrucoes).length < 20) erros.push(T.instrucoes(t.id));
    if (!Array.isArray(t.ficheiros) || !t.ficheiros.length) avisos.push(T.semFicheiros(t.id));
    if (t.teste && !Array.isArray(t.teste)) erros.push(T.testeLista(t.id));
    if (!t.teste) avisos.push(T.semTeste(t.id));
  }
  for (const t of tarefas) for (const d of t.depende || []) if (!ids.has(d)) erros.push(T.depende(t.id, d));
  // Cycles (DFS).
  const visit = new Map();
  const temCiclo = (id) => {
    if (visit.get(id) === 1) return true;
    if (visit.get(id) === 2) return false;
    visit.set(id, 1);
    const t = tarefas.find((x) => x.id === id);
    for (const d of t?.depende || []) if (temCiclo(d)) return true;
    visit.set(id, 2);
    return false;
  };
  for (const t of tarefas) if (temCiclo(t.id)) {
    erros.push(T.ciclo(t.id));
    break;
  }
  if (erros.length) return { erros, avisos };

  // Waves = depth in the DAG.
  const onda = new Map();
  const prof = (id) => {
    if (onda.has(id)) return onda.get(id);
    const t = tarefas.find((x) => x.id === id);
    const v = 1 + Math.max(0, ...(t.depende || []).map(prof));
    onda.set(id, v);
    return v;
  };
  const norm = tarefas.map((t) => ({
    id: t.id,
    title: String(t.titulo || t.id),
    group: t.grupo || 'task',
    group_type: 'task',
    wave: prof(t.id),
    agent: t.agente,
    depends_on: t.depende || [],
    files: t.ficheiros || [],
    test: t.teste || null,
    ...(t.jira ? { jira: t.jira } : {}),
    instructions: String(t.instrucoes).trim() + (t.teste ? T.verifica(t.teste.join(' ')) : '') + T.responde(t.id),
  }));
  const ultima = Math.max(...norm.map((t) => t.wave));
  const todas = norm.map((t) => t.id);
  if (!norm.some((t) => t.agent === 'ws-integrator')) {
    norm.push({
      id: 'integration', title: T.integracaoTitulo, group: 'integration', group_type: 'integration', wave: ultima + 1, agent: 'ws-integrator',
      depends_on: todas, files: [], test: global_test,
      instructions: T.integracao(todas.join(', '), global_test ? '`' + global_test.join(' ') + '`' : null),
    });
  }
  if (!norm.some((t) => t.agent === 'ws-reviewer')) {
    norm.push({
      id: 'review', title: T.revisaoTitulo, group: 'review', group_type: 'review', wave: ultima + 2, agent: 'ws-reviewer',
      depends_on: norm.some((t) => t.id === 'integration') ? ['integration'] : todas, files: ['.workshop/verdict.json'], prepare: ['node', '__DIGEST__'],
      test: { json_file: '.workshop/verdict.json', field: 'verdict' },
      instructions: T.revisao,
    });
  }
  const n = tarefas.length;
  const pedido = campo(proposta, 'max_parallel', 'max_paralelo');
  const maxPar = Math.min(16, Math.max(1, pedido || Math.min(n, n <= 3 ? n : 6)));
  return {
    erros: [],
    avisos,
    plano: {
      v: 1,
      project: campo(proposta, 'project', 'projeto') || 'project',
      task_id: campo(proposta, 'task_id', 'tarefa_id') || null,
      mode: 'production',
      created_at: new Date().toISOString(),
      main_model: 'claude-sonnet-5-5',
      config: { max_parallel: maxPar, max_attempts: 3, escalate_to: 'ws-implementer', worktrees: !!proposta.worktrees, global_test },
      agents: Object.fromEntries(Object.entries(PAPEIS).map(([k, v]) => [k, { model: v.modelo }])),
      adjustments: {
        justification: String(campo(proposta, 'justification', 'justificacao') || '').slice(0, 2000),
        risks: (campo(proposta, 'risks', 'riscos') || []).map(String).slice(0, 8),
        applied: [],
      },
      tasks: norm,
    },
  };
}

function mermaid(plano) {
  const id = (s) => s.replace(/[^a-zA-Z0-9]/g, '_');
  const L = ['flowchart LR'];
  for (const t of plano.tarefas) L.push(`  ${id(t.id)}["${t.id}<br/>${PAPEIS[t.agente]?.nome || t.agente}"]`);
  for (const t of plano.tarefas) for (const d of t.depende || []) L.push(`  ${id(d)} --> ${id(t.id)}`);
  return L.join('\n');
}

// Text of .workshop/PLAN.md (diagram, tasks, justification and estimate). Takes the plan in either schema.
export function planoMd(plano, avisos, est, l = lingua()) {
  const T = textos(TEXTOS, l);
  plano = normalizarPlano(plano);
  const aj = plano.ajustes || { justificacao: '', riscos: [] };
  return `# ${T.titulo} — ${plano.projeto}${plano.tarefa_id ? ` (${plano.tarefa_id})` : ''}

${T.resumo(plano.tarefas.length, plano.config.max_paralelo)}${plano.config.worktrees ? T.worktrees : ''}.

\`\`\`mermaid
${mermaid(plano)}
\`\`\`

${T.colunas.join('\n')}
${plano.tarefas.map((t) => `| ${t.id} | ${t.onda} | ${t.agente} (${PAPEIS[t.agente]?.nome}) | ${(t.ficheiros || []).join(', ') || '—'} | ${Array.isArray(t.teste) ? '`' + t.teste.join(' ') + '`' : t.teste ? T.veredito : '—'} |`).join('\n')}

${T.porque}

${aj.justificacao || '—'}
${aj.riscos?.length ? `\n${T.riscos}\n` + aj.riscos.map((x) => `- ${x}`).join('\n') : ''}

${T.estimativa}

${tabelaEstimativa(est, l)}
${avisos.length ? `\n${T.avisos}\n\n` + avisos.map((x) => `- ${x}`).join('\n') : ''}
`;
}

// English names.
export const ROLES = PAPEIS;
export const validate = validar;
export const planMarkdown = planoMd;

if (isMain(import.meta.url)) {
  const a = process.argv.slice(2);
  const projeto = opt(a, '--project') || process.cwd();
  const proposta = JSON.parse(readFileSync(a[0], 'utf8'));
  const tgArg = opt(a, '--global-test');
  const tg = tgArg ? JSON.parse(tgArg) : campo(proposta, 'global_test', 'teste_global') || null;
  const r = validar(proposta, { global_test: tg });
  if (r.erros.length) {
    console.log(textos(TEXTOS).invalido + '\n- ' + r.erros.join('\n- '));
    process.exit(1);
  }
  const ws = join(projeto, '.workshop');
  mkdirSync(ws, { recursive: true });
  for (const t of r.plano.tasks) if (t.prepare?.[1] === '__DIGEST__') t.prepare = ['node', fileURLToPath(new URL('./digest.mjs', import.meta.url))];
  writeFileSync(join(ws, 'plan.json'), JSON.stringify(r.plano, null, 2) + '\n');
  const md = planoMd(r.plano, r.avisos, estimar(r.plano));
  writeFileSync(join(ws, PLAN_MD), md);
  console.log(md);
}
