#!/usr/bin/env node
// Prepara (SEM publicar) os textos para o Jira/GitHub a partir do relatorio do enxame:
// um comentario por subtarefa, um resumo, o registo de horas e o corpo do PR.
// Escreve .workshop/publicar.json, .workshop/pr-body.md e, para o Atlassian CLI (reserva do MCP do Jira),
// cada comentario em texto simples em .workshop/publicar/ (acli ... --body-file). Quem publica e a skill, depois de confirmar.
//   node publicar-texto.mjs [--projeto <dir>]
// Os textos saem na lingua do kit (pt ou en).
import { writeFileSync, readFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { relatorio } from './report.mjs';
import { lerJson } from './lib/estado.mjs';
import { usd, tempo, nomeModelo } from './lib/tabela.mjs';
import { lingua, textos } from '../hooks/lib/lingua.mjs';

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
const dir = a.includes('--projeto') ? a[a.indexOf('--projeto') + 1] : process.cwd();
const ws = join(dir, '.workshop');
const ponteiro = lerJson(join(ws, 'orquestrador.json'), {});
const r = relatorio(dir, ponteiro.plano || join(ws, 'plan.json'), L);
const tarefa = lerJson(join(ws, 'tarefa.json'), {});
const alvo = tarefa.id || r.plano.tarefa_id || null;

const linha = (t) => `${T.agente} ${t.agente || '—'} · ${nomeModelo(t.modelo)} · ${tempo(t.tempo_s)} · ${u(t.custo_usd)}`;
const ESTADO = T.estado;
const porId = new Map(r.plano.tarefas.map((t) => [t.id, t]));

const comentarios = r.f.tarefas.map((t) => ({
  alvo: porId.get(t.id)?.jira || alvo,
  tarefa: t.id,
  texto: `${T.subtarefa(t.titulo, t.id, ESTADO[t.estado] || t.estado)}\n${linha(t)}${t.tentativa > 1 ? T.tentativas(t.tentativa) : ''}`,
}));

const totalS = Math.max(60, Math.round(r.duracao || r.f.tarefas.reduce((s, t) => s + (t.tempo_s || 0), 0)));
const porModelo = Object.entries(r.porModelo).map(([m, v]) => `${m} ${u(v.custo)}`).join(', ');
const resumo = [
  T.orquestracao(r.f.contagem.verde, r.f.total, r.f.tarefas.filter((t) => t.agente).length),
  T.duracao(tempo(r.duracao), u(r.f.custo.total), porModelo),
  T.fonte,
].join('\n');

const tabela = [...T.colunas, ...r.f.tarefas.map((t) => `| ${t.titulo} | ${t.agente || '—'} | ${nomeModelo(t.modelo)} | ${tempo(t.tempo_s)} | ${u(t.custo_usd)} | ${ESTADO[t.estado] || t.estado} |`)].join('\n');
const tarefaMd = existsSync(join(ws, 'tarefa.md')) ? readFileSync(join(ws, 'tarefa.md'), 'utf8') : '';
// O /task-intake escreve a secao em portugues ou em ingles: aceitar as duas.
const criterios = (/## (?:Critérios de aceitação|Acceptance criteria)\s*\n([\s\S]*?)(\n## |$)/i.exec(tarefaMd) || [])[1]?.trim() || '';
const veredito = lerJson(join(ws, 'veredito.json'), null);
const prBody = `## ${tarefa.titulo || r.plano.projeto}

${tarefa.url ? `${T.origem}: ${tarefa.url}\n` : ''}
${criterios ? `${T.criterios}\n\n${criterios}\n` : ''}
${T.como}

${resumo}

${tabela}
${veredito ? `\n${T.revisao}\n\n${T.veredito}: **${veredito.veredito}**. ${veredito.resumo || ''}\n` : ''}
---
${T.gerado}
`;

// Texto simples para o acli (o Jira mostra o Markdown tal como esta): uma linha por subtarefa em vez da tabela.
const pasta = join(ws, 'publicar');
rmSync(pasta, { recursive: true, force: true });
mkdirSync(pasta, { recursive: true });
const nomeFicheiro = (i, a) => `${String(i).padStart(2, '0')}-${String(a || 'tarefa').replace(/[^A-Za-z0-9_-]+/g, '_')}.txt`;
comentarios.forEach((c, i) => {
  c.ficheiro = `.workshop/publicar/${nomeFicheiro(i + 1, c.alvo)}`;
  writeFileSync(join(dir, c.ficheiro), c.texto + '\n');
});
const linhasTexto = r.f.tarefas.map((t) => `- ${t.titulo}: ${linha(t)} · ${ESTADO[t.estado] || t.estado}`).join('\n');
const resumoFicheiro = '.workshop/publicar/resumo.txt';
writeFileSync(join(dir, resumoFicheiro), `${resumo}\n\n${linhasTexto}\n`);

const out = {
  alvo,
  fonte: tarefa.fonte || null,
  comentarios,
  resumo: `${resumo}\n\n${tabela}`,
  resumo_ficheiro: resumoFicheiro,
  worklog: alvo ? { alvo, segundos: totalS, tempo_jira: `${Math.ceil(totalS / 60)}m`, comentario: T.worklog(r.f.total, u(r.f.custo.total)) } : null,
  pr: { titulo: tarefa.titulo ? `${tarefa.id ? tarefa.id + ': ' : ''}${tarefa.titulo}` : r.plano.projeto, corpo_ficheiro: '.workshop/pr-body.md' },
};
writeFileSync(join(ws, 'publicar.json'), JSON.stringify(out, null, 2) + '\n');
writeFileSync(join(ws, 'pr-body.md'), prBody);
console.log(JSON.stringify({ alvo, fonte: out.fonte, comentarios: comentarios.length, worklog: out.worklog?.tempo_jira || null, pr: out.pr.titulo }, null, 2));
