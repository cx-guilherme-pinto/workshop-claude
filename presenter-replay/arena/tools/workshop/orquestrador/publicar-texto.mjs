#!/usr/bin/env node
// Prepara (SEM publicar) os textos para o Jira/GitHub a partir do relatorio do enxame:
// um comentario por subtarefa, um resumo, o registo de horas e o corpo do PR.
// Escreve .workshop/publicar.json e .workshop/pr-body.md. Quem publica e a skill, depois de confirmar.
//   node publicar-texto.mjs [--projeto <dir>]
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { relatorio } from './report.mjs';
import { lerJson } from './lib/estado.mjs';
import { usd, tempo, nomeModelo } from './lib/tabela.mjs';

const a = process.argv.slice(2);
const dir = a.includes('--projeto') ? a[a.indexOf('--projeto') + 1] : process.cwd();
const ws = join(dir, '.workshop');
const ponteiro = lerJson(join(ws, 'orquestrador.json'), {});
const r = relatorio(dir, ponteiro.plano || join(ws, 'plan.json'));
const tarefa = lerJson(join(ws, 'tarefa.json'), {});
const alvo = tarefa.id || r.plano.tarefa_id || null;

const linha = (t) => `agente ${t.agente || '—'} · ${nomeModelo(t.modelo)} · ${tempo(t.tempo_s)} · ${usd(t.custo_usd)}`;
const ESTADO = { verde: 'concluída', falhou: 'falhou', vermelho: 'falhou', em_curso: 'em curso', por_fazer: 'por fazer' };
const porId = new Map(r.plano.tarefas.map((t) => [t.id, t]));

const comentarios = r.f.tarefas.map((t) => ({
  alvo: porId.get(t.id)?.jira || alvo,
  tarefa: t.id,
  texto: `Subtarefa "${t.titulo}" (${t.id}) — ${ESTADO[t.estado] || t.estado}.\n${linha(t)}${t.tentativa > 1 ? ` · ${t.tentativa} tentativas` : ''}`,
}));

const totalS = Math.max(60, Math.round(r.duracao || r.f.tarefas.reduce((s, t) => s + (t.tempo_s || 0), 0)));
const porModelo = Object.entries(r.porModelo).map(([m, v]) => `${m} ${usd(v.custo)}`).join(', ');
const resumo = [
  `Orquestração com Claude: ${r.f.contagem.verde}/${r.f.total} subtarefas concluídas por ${r.f.tarefas.filter((t) => t.agente).length} agentes.`,
  `Duração: ${tempo(r.duracao)} · custo total: ${usd(r.f.custo.total)} (${porModelo}).`,
  `Custo medido com os tokens reais e os preços de lista publicados; a fatura oficial está na Console.`,
].join('\n');

const tabela = ['| subtarefa | agente | modelo | tempo | custo | estado |', '|---|---|---|---|---|---|', ...r.f.tarefas.map((t) => `| ${t.titulo} | ${t.agente || '—'} | ${nomeModelo(t.modelo)} | ${tempo(t.tempo_s)} | ${usd(t.custo_usd)} | ${ESTADO[t.estado] || t.estado} |`)].join('\n');
const tarefaMd = existsSync(join(ws, 'tarefa.md')) ? readFileSync(join(ws, 'tarefa.md'), 'utf8') : '';
const criterios = (/## Critérios de aceitação\s*\n([\s\S]*?)(\n## |$)/.exec(tarefaMd) || [])[1]?.trim() || '';
const veredito = lerJson(join(ws, 'veredito.json'), null);
const prBody = `## ${tarefa.titulo || r.plano.projeto}

${tarefa.url ? `Origem: ${tarefa.url}\n` : ''}
${criterios ? `### Critérios de aceitação\n\n${criterios}\n` : ''}
### Como foi feito

${resumo}

${tabela}
${veredito ? `\n### Revisão de segurança\n\nVeredito: **${veredito.veredito}**. ${veredito.resumo || ''}\n` : ''}
---
Gerado com o kit "Orquestração de Agentes com Claude".
`;

const out = {
  alvo,
  fonte: tarefa.fonte || null,
  comentarios,
  resumo: `${resumo}\n\n${tabela}`,
  worklog: alvo ? { alvo, segundos: totalS, tempo_jira: `${Math.ceil(totalS / 60)}m`, comentario: `Orquestração com Claude (${r.f.total} subtarefas, ${usd(r.f.custo.total)}).` } : null,
  pr: { titulo: tarefa.titulo ? `${tarefa.id ? tarefa.id + ': ' : ''}${tarefa.titulo}` : r.plano.projeto, corpo_ficheiro: '.workshop/pr-body.md' },
};
writeFileSync(join(ws, 'publicar.json'), JSON.stringify(out, null, 2) + '\n');
writeFileSync(join(ws, 'pr-body.md'), prBody);
console.log(JSON.stringify({ alvo, fonte: out.fonte, comentarios: comentarios.length, worklog: out.worklog?.tempo_jira || null, pr: out.pr.titulo }, null, 2));
