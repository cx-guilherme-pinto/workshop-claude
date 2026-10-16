#!/usr/bin/env node
// Valida e completa um plano proposto pelo planner (Projeto 2, /task-plan):
//   - esquema, ids unicos, dependencias existentes, sem ciclos;
//   - agentes conhecidos; modelos a partir do papel;
//   - acrescenta a integracao e a revisao no fim, se faltarem;
//   - escreve .workshop/plan.json e .workshop/PLANO.md (com Mermaid e estimativa).
//
//   node validate-plan.mjs <proposta.json> [--projeto <dir>]
// Erros, avisos, instrucoes dos agentes e PLANO.md saem na lingua do kit; "PLANO INVALIDO" e um marcador.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { estimar, tabelaEstimativa } from './estimate.mjs';
import { ehPrincipal } from './lib/principal.mjs';
import { lingua, textos } from '../hooks/lib/lingua.mjs';

export const PAPEIS = {
  'ws-worker': { modelo: 'claude-haiku-5-5', nome: 'Haiku' },
  'ws-implementer': { modelo: 'claude-sonnet-5-5', nome: 'Sonnet' },
  'ws-integrator': { modelo: 'claude-sonnet-5-5', nome: 'Sonnet' },
  'ws-reviewer': { modelo: 'claude-opus-5-5', nome: 'Opus' },
  'ws-planner': { modelo: 'claude-opus-5-5', nome: 'Opus' },
};

// "OK <id>" e "FALHOU <id>" ficam iguais nas duas linguas (a gravacao do terminal procura FALHOU).
const TEXTOS = {
  pt: {
    semTarefas: 'o plano nao tem tarefas',
    idInvalido: (id) => `id invalido: ${id}`,
    idRepetido: (id) => `id repetido: ${id}`,
    agente: (id, a) => `${id}: agente desconhecido ${a} (usa ws-worker ou ws-implementer)`,
    instrucoes: (id) => `${id}: faltam instrucoes`,
    semFicheiros: (id) => `${id}: sem ficheiros declarados (o paralelismo fica menos seguro)`,
    testeLista: (id) => `${id}: teste tem de ser uma lista, ex.: ["npm","test"]`,
    semTeste: (id) => `${id}: sem teste; fica verde quando o agente terminar`,
    depende: (id, d) => `${id}: depende de ${d}, que nao existe`,
    ciclo: (id) => `ciclo de dependencias em ${id}`,
    verifica: (cmd) => `\nVerifica: ${cmd}`,
    responde: (id) => `\nResponde com uma única linha: "OK ${id}" ou "FALHOU ${id}: <motivo>".`,
    integracaoTitulo: 'Integração e suite completa',
    integracao: (ids, cmd) => `Integra o trabalho das tarefas ${ids}. Corre ${cmd || 'os testes do projeto'} e corrige só problemas de integração. Escreve um resumo curto em .workshop/integracao.md.\nResponde com uma única linha: "OK integracao" ou "FALHOU integracao: <motivo>".`,
    revisaoTitulo: 'Revisão de segurança e qualidade',
    revisao: 'Revê as alterações para produção. Lê primeiro .workshop/revisao-resumo.md e depois só os ficheiros que ele lista. Escreve .workshop/veredito.json.\nResponde com uma única linha: "OK revisao: <veredito>".',
    invalido: 'PLANO INVALIDO:',
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
    responde: (id) => `\nReply with a single line: "OK ${id}" or "FALHOU ${id}: <reason>".`,
    integracaoTitulo: 'Integration and full suite',
    integracao: (ids, cmd) => `Integrate the work of tasks ${ids}. Run ${cmd || 'the project tests'} and fix only integration problems. Write a short summary in .workshop/integracao.md.\nReply with a single line: "OK integracao" or "FALHOU integracao: <reason>".`,
    revisaoTitulo: 'Security and quality review',
    revisao: 'Review the changes for production. First read .workshop/revisao-resumo.md and then only the files it lists. Write .workshop/veredito.json.\nReply with a single line: "OK revisao: <verdict>".',
    invalido: 'PLANO INVALIDO — the plan has errors:',
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

// `l` ('pt'|'en') e opcional: por omissao, a lingua do kit.
export function validar(proposta, { teste_global = null, l = lingua() } = {}) {
  const T = textos(TEXTOS, l);
  const erros = [];
  const avisos = [];
  const tarefas = Array.isArray(proposta.tarefas) ? proposta.tarefas : [];
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
  // Ciclos (DFS).
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

  // Ondas = profundidade no DAG.
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
    titulo: String(t.titulo || t.id),
    grupo: t.grupo || 'tarefa',
    grupo_tipo: 'tarefa',
    onda: prof(t.id),
    agente: t.agente,
    depende: t.depende || [],
    ficheiros: t.ficheiros || [],
    teste: t.teste || null,
    instrucoes: String(t.instrucoes).trim() + (t.teste ? T.verifica(t.teste.join(' ')) : '') + T.responde(t.id),
  }));
  const ultima = Math.max(...norm.map((t) => t.onda));
  const todas = norm.map((t) => t.id);
  if (!norm.some((t) => t.agente === 'ws-integrator')) {
    norm.push({
      id: 'integracao', titulo: T.integracaoTitulo, grupo: 'integracao', grupo_tipo: 'integracao', onda: ultima + 1, agente: 'ws-integrator',
      depende: todas, ficheiros: [], teste: teste_global,
      instrucoes: T.integracao(todas.join(', '), teste_global ? '`' + teste_global.join(' ') + '`' : null),
    });
  }
  if (!norm.some((t) => t.agente === 'ws-reviewer')) {
    norm.push({
      id: 'revisao', titulo: T.revisaoTitulo, grupo: 'revisao', grupo_tipo: 'revisao', onda: ultima + 2, agente: 'ws-reviewer',
      depende: ['integracao'], ficheiros: ['.workshop/veredito.json'], preparar: ['node', '__DIGEST__'],
      teste: { ficheiro_json: '.workshop/veredito.json', campo: 'veredito' },
      instrucoes: T.revisao,
    });
  }
  const n = tarefas.length;
  const maxPar = Math.min(16, Math.max(1, proposta.max_paralelo || Math.min(n, n <= 3 ? n : 6)));
  return {
    erros: [],
    avisos,
    plano: {
      v: 1,
      projeto: proposta.projeto || 'projeto',
      tarefa_id: proposta.tarefa_id || null,
      modo: 'producao',
      criado_em: new Date().toISOString(),
      modelo_principal: 'claude-sonnet-5-5',
      config: { max_paralelo: maxPar, max_tentativas: 3, escalar_para: 'ws-implementer', worktrees: !!proposta.worktrees, teste_global },
      agentes: Object.fromEntries(Object.entries(PAPEIS).map(([k, v]) => [k, { modelo: v.modelo }])),
      ajustes: { justificacao: String(proposta.justificacao || '').slice(0, 2000), riscos: (proposta.riscos || []).map(String).slice(0, 8), aplicados: [] },
      tarefas: norm,
    },
  };
}

function mermaid(plano) {
  const id = (s) => s.replace(/[^a-zA-Z0-9]/g, '_');
  const L = ['flowchart LR'];
  for (const t of plano.tarefas) L.push(`  ${id(t.id)}["${t.id}<br/>${PAPEIS[t.agente]?.nome || t.agente}"]`);
  for (const t of plano.tarefas) for (const d of t.depende) L.push(`  ${id(d)} --> ${id(t.id)}`);
  return L.join('\n');
}

// Texto de .workshop/PLANO.md (diagrama, tarefas, justificacao e estimativa).
export function planoMd(plano, avisos, est, l = lingua()) {
  const T = textos(TEXTOS, l);
  return `# ${T.titulo} — ${plano.projeto}${plano.tarefa_id ? ` (${plano.tarefa_id})` : ''}

${T.resumo(plano.tarefas.length, plano.config.max_paralelo)}${plano.config.worktrees ? T.worktrees : ''}.

\`\`\`mermaid
${mermaid(plano)}
\`\`\`

${T.colunas.join('\n')}
${plano.tarefas.map((t) => `| ${t.id} | ${t.onda} | ${t.agente} (${PAPEIS[t.agente]?.nome}) | ${t.ficheiros.join(', ') || '—'} | ${Array.isArray(t.teste) ? '`' + t.teste.join(' ') + '`' : t.teste ? T.veredito : '—'} |`).join('\n')}

${T.porque}

${plano.ajustes.justificacao || '—'}
${plano.ajustes.riscos.length ? `\n${T.riscos}\n` + plano.ajustes.riscos.map((x) => `- ${x}`).join('\n') : ''}

${T.estimativa}

${tabelaEstimativa(est, l)}
${avisos.length ? `\n${T.avisos}\n\n` + avisos.map((x) => `- ${x}`).join('\n') : ''}
`;
}

if (ehPrincipal(import.meta.url)) {
  const a = process.argv.slice(2);
  const projeto = a.includes('--projeto') ? a[a.indexOf('--projeto') + 1] : process.cwd();
  const proposta = JSON.parse(readFileSync(a[0], 'utf8'));
  const tg = a.includes('--teste-global') ? JSON.parse(a[a.indexOf('--teste-global') + 1]) : proposta.teste_global || null;
  const r = validar(proposta, { teste_global: tg });
  if (r.erros.length) {
    console.log(textos(TEXTOS).invalido + '\n- ' + r.erros.join('\n- '));
    process.exit(1);
  }
  const ws = join(projeto, '.workshop');
  mkdirSync(ws, { recursive: true });
  for (const t of r.plano.tarefas) if (t.preparar?.[1] === '__DIGEST__') t.preparar = ['node', fileURLToPath(new URL('./digest.mjs', import.meta.url))];
  writeFileSync(join(ws, 'plan.json'), JSON.stringify(r.plano, null, 2) + '\n');
  const md = planoMd(r.plano, r.avisos, estimar(r.plano));
  writeFileSync(join(ws, 'PLANO.md'), md);
  console.log(md);
}
