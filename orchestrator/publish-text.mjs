#!/usr/bin/env node
// Prepares (WITHOUT publishing) the texts for Jira/GitHub from the swarm report:
// one comment per subtask, a summary, the work log and the PR body.
// Writes .workshop/publish.json, .workshop/pr-body.md and, for the Atlassian CLI (the fallback for the Jira MCP),
// each comment as plain text in .workshop/publish/ (acli ... --body-file). The skill publishes, after confirming.
//   node publish-text.mjs [--project <dir>]     (--projeto still works)
// The texts are in the kit language (pt or en); the JSON keys are English.
import { writeFileSync, readFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { relatorio, lerTarefaJson } from './report.mjs';
import { caminhos, lerPonteiro, primeiroQueExiste } from './lib/state.mjs';
import { lerVeredito } from './gate.mjs';
import { usd, tempo, nomeModelo } from './lib/table.mjs';
import { opt } from './lib/args.mjs';
import { blockOf, emit } from './lib/telemetry.mjs';
import { lingua, textos } from '../hooks/lib/language.mjs';

const L = lingua();
const T = textos({
  pt: {
    agente: 'agente',
    estado: { verde: 'concluída', falhou: 'falhou', vermelho: 'falhou', em_curso: 'em curso', por_fazer: 'por fazer' },
    subtarefa: (titulo, id, estado) => `Subtarefa "${titulo}" (${id}) — ${estado}.`,
    tentativas: (n) => ` · ${n} tentativas`,
    orquestracao: (v, t, n) => `Orquestração com Claude: ${v}/${t} subtarefas concluídas por ${n} agentes.`,
    duracao: (d, c, m) => `Duração: ${d} · custo total: ${c} (${m}).`,
    fonte: 'Custo medido com os tokens reais e os preços de lista publicados; a fatura oficial está na Console.',
    colunas: ['| subtarefa | agente | modelo | tempo | custo | estado |', '|---|---|---|---|---|---|'],
    origem: 'Origem',
    criterios: '### Critérios de aceitação',
    como: '### Como foi feito',
    revisao: '### Revisão de segurança',
    veredito: 'Veredito',
    gerado: 'Gerado com o kit "Orquestração de Agentes com Claude".',
    worklog: (n, c) => `Orquestração com Claude (${n} subtarefas, ${c}).`,
  },
  en: {
    agente: 'agent',
    estado: { verde: 'done', falhou: 'failed', vermelho: 'failed', em_curso: 'in progress', por_fazer: 'to do' },
    subtarefa: (titulo, id, estado) => `Subtask "${titulo}" (${id}) — ${estado}.`,
    tentativas: (n) => ` · ${n} attempts`,
    orquestracao: (v, t, n) => `Orchestration with Claude: ${v}/${t} subtasks done by ${n} agents.`,
    duracao: (d, c, m) => `Duration: ${d} · total cost: ${c} (${m}).`,
    fonte: 'Cost measured from the real tokens and the published list prices; the official invoice is in the Console.',
    colunas: ['| subtask | agent | model | time | cost | status |', '|---|---|---|---|---|---|'],
    origem: 'Source',
    criterios: '### Acceptance criteria',
    como: '### How it was done',
    revisao: '### Security review',
    veredito: 'Verdict',
    gerado: 'Generated with the "Agent Orchestration with Claude" kit.',
    worklog: (n, c) => `Orchestration with Claude (${n} subtasks, ${c}).`,
  },
}, L);
const u = (v) => usd(v, L);

const a = process.argv.slice(2);
const dir = opt(a, '--project') || process.cwd();
const ws = join(dir, '.workshop');
const ponteiro = lerPonteiro(caminhos(dir));
const r = relatorio(dir, ponteiro.plan || ponteiro.plano || join(ws, 'plan.json'), L);
const tarefa = lerTarefaJson(ws);
const alvo = tarefa.id || r.plano.tarefa_id || null;

const linha = (t) => `${T.agente} ${t.agente || '—'} · ${nomeModelo(t.modelo)} · ${tempo(t.tempo_s)} · ${u(t.custo_usd)}`;
const ESTADO = T.estado;
const porId = new Map(r.plano.tarefas.map((t) => [t.id, t]));

const comentarios = r.f.tarefas.map((t) => ({
  target: porId.get(t.id)?.jira || alvo,
  task: t.id,
  text: `${T.subtarefa(t.titulo, t.id, ESTADO[t.estado] || t.estado)}\n${linha(t)}${t.tentativa > 1 ? T.tentativas(t.tentativa) : ''}`,
}));

const totalS = Math.max(60, Math.round(r.duracao || r.f.tarefas.reduce((s, t) => s + (t.tempo_s || 0), 0)));
const porModelo = Object.entries(r.porModelo).map(([m, v]) => `${m} ${u(v.custo)}`).join(', ');
const resumo = [
  T.orquestracao(r.f.contagem.verde, r.f.total, r.f.tarefas.filter((t) => t.agente).length),
  T.duracao(tempo(r.duracao), u(r.f.custo.total), porModelo),
  T.fonte,
].join('\n');

const tabela = [...T.colunas, ...r.f.tarefas.map((t) => `| ${t.titulo} | ${t.agente || '—'} | ${nomeModelo(t.modelo)} | ${tempo(t.tempo_s)} | ${u(t.custo_usd)} | ${ESTADO[t.estado] || t.estado} |`)].join('\n');
const fTarefa = primeiroQueExiste(join(ws, 'task.md'), join(ws, 'tarefa.md'));
const tarefaMd = existsSync(fTarefa) ? readFileSync(fTarefa, 'utf8') : '';
// /task-intake writes the section as "## Acceptance criteria"; older versions wrote it in Portuguese.
const criterios = (/## (?:Acceptance criteria|Critérios de aceitação)\s*\n([\s\S]*?)(\n## |$)/i.exec(tarefaMd) || [])[1]?.trim() || '';
// An unreadable verdict file is left out of the PR text (the gate already blocks on it).
const lido = lerVeredito(dir);
const veredito = lido && !lido.invalido && lido.veredito ? lido : null;
const prBody = `## ${tarefa.title || r.plano.projeto}

${tarefa.url ? `${T.origem}: ${tarefa.url}\n` : ''}
${criterios ? `${T.criterios}\n\n${criterios}\n` : ''}
${T.como}

${resumo}

${tabela}
${veredito ? `\n${T.revisao}\n\n${T.veredito}: **${veredito.veredito}**. ${veredito.resumo || ''}\n` : ''}
---
${T.gerado}
`;

// Plain text for acli (Jira shows the Markdown as it is): one line per subtask instead of the table.
const pasta = join(ws, 'publish');
rmSync(pasta, { recursive: true, force: true });
mkdirSync(pasta, { recursive: true });
const nomeFicheiro = (i, a) => `${String(i).padStart(2, '0')}-${String(a || 'task').replace(/[^A-Za-z0-9_-]+/g, '_')}.txt`;
comentarios.forEach((c, i) => {
  c.file = `.workshop/publish/${nomeFicheiro(i + 1, c.target)}`;
  writeFileSync(join(dir, c.file), c.text + '\n');
});
const linhasTexto = r.f.tarefas.map((t) => `- ${t.titulo}: ${linha(t)} · ${ESTADO[t.estado] || t.estado}`).join('\n');
const resumoFicheiro = '.workshop/publish/summary.txt';
writeFileSync(join(dir, resumoFicheiro), `${resumo}\n\n${linhasTexto}\n`);

const out = {
  target: alvo,
  source: tarefa.source || null,
  comments: comentarios,
  summary: `${resumo}\n\n${tabela}`,
  summary_file: resumoFicheiro,
  worklog: alvo ? { target: alvo, seconds: totalS, jira_time: `${Math.ceil(totalS / 60)}m`, comment: T.worklog(r.f.total, u(r.f.custo.total)) } : null,
  pr: { title: tarefa.title ? `${tarefa.id ? tarefa.id + ': ' : ''}${tarefa.title}` : r.plano.projeto, body_file: '.workshop/pr-body.md' },
};
writeFileSync(join(ws, 'publish.json'), JSON.stringify(out, null, 2) + '\n');
writeFileSync(join(ws, 'pr-body.md'), prBody);
// A local task (the practice project's issues/EX-*.json) has no Jira or GitHub to publish to: the report is a file,
// .workshop/report.md (the same text as the PR body). The panel's Project 2 funnel gets its last step either way.
const destination = out.source === 'jira' ? 'jira' : out.source === 'github' ? 'github' : 'file';
if (destination === 'file') writeFileSync(join(ws, 'report.md'), prBody);
if (blockOf(dir) === 'p2') await emit('p2_report', { destination });
console.log(JSON.stringify({ target: alvo, source: out.source, comments: comentarios.length, worklog: out.worklog?.jira_time || null, pr: out.pr.title }, null, 2));
