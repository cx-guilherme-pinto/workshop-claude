#!/usr/bin/env node
// Valida e completa um plano proposto pelo planner (Projeto 2, /task-plan):
//   - esquema, ids unicos, dependencias existentes, sem ciclos;
//   - agentes conhecidos; modelos a partir do papel;
//   - acrescenta a integracao e a revisao no fim, se faltarem;
//   - escreve .workshop/plan.json e .workshop/PLANO.md (com Mermaid e estimativa).
//
//   node validate-plan.mjs <proposta.json> [--projeto <dir>]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { estimar, tabelaEstimativa } from './estimate.mjs';
import { ehPrincipal } from './lib/principal.mjs';

export const PAPEIS = {
  'ws-worker': { modelo: 'claude-haiku-5-5', nome: 'Haiku' },
  'ws-implementer': { modelo: 'claude-sonnet-5-5', nome: 'Sonnet' },
  'ws-integrator': { modelo: 'claude-sonnet-5-5', nome: 'Sonnet' },
  'ws-reviewer': { modelo: 'claude-opus-5-5', nome: 'Opus' },
  'ws-planner': { modelo: 'claude-opus-5-5', nome: 'Opus' },
};

export function validar(proposta, { teste_global = null } = {}) {
  const erros = [];
  const avisos = [];
  const tarefas = Array.isArray(proposta.tarefas) ? proposta.tarefas : [];
  if (!tarefas.length) erros.push('o plano nao tem tarefas');
  const ids = new Set();
  for (const t of tarefas) {
    if (!t.id || !/^[a-z0-9][a-z0-9-]{0,40}$/.test(t.id)) erros.push(`id invalido: ${JSON.stringify(t.id)}`);
    if (ids.has(t.id)) erros.push(`id repetido: ${t.id}`);
    ids.add(t.id);
    if (!PAPEIS[t.agente]) erros.push(`${t.id}: agente desconhecido ${t.agente} (usa ws-worker ou ws-implementer)`);
    if (!t.instrucoes || String(t.instrucoes).length < 20) erros.push(`${t.id}: faltam instrucoes`);
    if (!Array.isArray(t.ficheiros) || !t.ficheiros.length) avisos.push(`${t.id}: sem ficheiros declarados (o paralelismo fica menos seguro)`);
    if (t.teste && !Array.isArray(t.teste)) erros.push(`${t.id}: teste tem de ser uma lista, ex.: ["npm","test"]`);
    if (!t.teste) avisos.push(`${t.id}: sem teste; fica verde quando o agente terminar`);
  }
  for (const t of tarefas) for (const d of t.depende || []) if (!ids.has(d)) erros.push(`${t.id}: depende de ${d}, que nao existe`);
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
    erros.push(`ciclo de dependencias em ${t.id}`);
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
    instrucoes: String(t.instrucoes).trim() + (t.teste ? `\nVerifica: ${t.teste.join(' ')}` : '') + `\nResponde com uma única linha: "OK ${t.id}" ou "FALHOU ${t.id}: <motivo>".`,
  }));
  const ultima = Math.max(...norm.map((t) => t.onda));
  const todas = norm.map((t) => t.id);
  if (!norm.some((t) => t.agente === 'ws-integrator')) {
    norm.push({
      id: 'integracao', titulo: 'Integração e suite completa', grupo: 'integracao', grupo_tipo: 'integracao', onda: ultima + 1, agente: 'ws-integrator',
      depende: todas, ficheiros: [], teste: teste_global,
      instrucoes: `Integra o trabalho das tarefas ${todas.join(', ')}. Corre ${teste_global ? '`' + teste_global.join(' ') + '`' : 'os testes do projeto'} e corrige só problemas de integração. Escreve um resumo curto em .workshop/integracao.md.\nResponde com uma única linha: "OK integracao" ou "FALHOU integracao: <motivo>".`,
    });
  }
  if (!norm.some((t) => t.agente === 'ws-reviewer')) {
    norm.push({
      id: 'revisao', titulo: 'Revisão de segurança e qualidade', grupo: 'revisao', grupo_tipo: 'revisao', onda: ultima + 2, agente: 'ws-reviewer',
      depende: ['integracao'], ficheiros: ['.workshop/veredito.json'], preparar: ['node', '__DIGEST__'],
      teste: { ficheiro_json: '.workshop/veredito.json', campo: 'veredito' },
      instrucoes: 'Revê as alterações para produção. Lê primeiro .workshop/revisao-resumo.md e depois só os ficheiros que ele lista. Escreve .workshop/veredito.json.\nResponde com uma única linha: "OK revisao: <veredito>".',
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

if (ehPrincipal(import.meta.url)) {
  const a = process.argv.slice(2);
  const projeto = a.includes('--projeto') ? a[a.indexOf('--projeto') + 1] : process.cwd();
  const proposta = JSON.parse(readFileSync(a[0], 'utf8'));
  const tg = a.includes('--teste-global') ? JSON.parse(a[a.indexOf('--teste-global') + 1]) : proposta.teste_global || null;
  const r = validar(proposta, { teste_global: tg });
  if (r.erros.length) {
    console.log('PLANO INVALIDO:\n- ' + r.erros.join('\n- '));
    process.exit(1);
  }
  const ws = join(projeto, '.workshop');
  mkdirSync(ws, { recursive: true });
  for (const t of r.plano.tarefas) if (t.preparar?.[1] === '__DIGEST__') t.preparar = ['node', fileURLToPath(new URL('./digest.mjs', import.meta.url))];
  writeFileSync(join(ws, 'plan.json'), JSON.stringify(r.plano, null, 2) + '\n');
  const est = estimar(r.plano);
  const md = `# Plano — ${r.plano.projeto}${r.plano.tarefa_id ? ` (${r.plano.tarefa_id})` : ''}

${r.plano.tarefas.length} tarefas · até ${r.plano.config.max_paralelo} agentes em paralelo${r.plano.config.worktrees ? ' · cada agente no seu git worktree' : ''}.

\`\`\`mermaid
${mermaid(r.plano)}
\`\`\`

| tarefa | onda | agente | ficheiros | teste |
|---|---|---|---|---|
${r.plano.tarefas.map((t) => `| ${t.id} | ${t.onda} | ${t.agente} (${PAPEIS[t.agente]?.nome}) | ${t.ficheiros.join(', ') || '—'} | ${Array.isArray(t.teste) ? '`' + t.teste.join(' ') + '`' : t.teste ? 'veredito' : '—'} |`).join('\n')}

## Porquê este número de agentes

${r.plano.ajustes.justificacao || '—'}
${r.plano.ajustes.riscos.length ? '\nRiscos:\n' + r.plano.ajustes.riscos.map((x) => `- ${x}`).join('\n') : ''}

## Estimativa de custo

${tabelaEstimativa(est)}
${r.avisos.length ? '\n## Avisos\n\n' + r.avisos.map((x) => `- ${x}`).join('\n') : ''}
`;
  writeFileSync(join(ws, 'PLANO.md'), md);
  console.log(md);
}
