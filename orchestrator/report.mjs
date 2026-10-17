#!/usr/bin/env node
// Final cost and time report: by agent, by model and by wave.
// Reads the plan, the state (.workshop/status) and the costs measured by the hooks (.workshop/usage.jsonl).
//
//   node report.mjs [--project <dir>] [--plan <plan.json>] [--json]
// Also writes .workshop/report.md and .workshop/memory-summary.md (the input for the memory app).
// The texts are in the kit language. In memory-summary.md, the keys the memory-extractor passes as they are
// to the memory app (project, task, epic, url, tags, cost_usd) are English in both languages.
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { caminhos, lerPlano, fotografia, lerJsonl, lerJson, lerJsonDe, lerPonteiro, resolverNoProjeto, usageUnico } from './lib/state.mjs';
import { usd, tempo, nomeModelo, nomeEstado, nomeModo, tabelaMarkdown } from './lib/table.mjs';
import { loadPricing } from '../hooks/lib/cost.mjs';
import { isMain } from './lib/is-main.mjs';
import { opt, flag } from './lib/args.mjs';
import { lingua, textos } from '../hooks/lib/language.mjs';

export const REPORT_FILE = 'report.md';
export const MEMORY_SUMMARY = 'memory-summary.md';

// The task read by /task-intake (.workshop/task.json; older installs wrote tarefa.json with Portuguese keys).
export function lerTarefaJson(ws) {
  const t = lerJsonDe([join(ws, 'task.json'), join(ws, 'tarefa.json')], {});
  return {
    ...t,
    source: t.source ?? t.fonte ?? null,
    epic: t.epic ?? t.epico ?? null,
    title: t.title ?? t.titulo ?? null,
    labels: t.labels ?? t.etiquetas ?? [],
    subtasks: t.subtasks ?? t.subtarefas ?? [],
  };
}

const TEXTOS = {
  pt: {
    titulo: (p, m) => `# Relatório do swarm — ${p} (modo ${m})`,
    resultado: (v, t, f, r) => `- **Resultado:** ${v}/${t} tarefas verdes${f ? `, ${f} falhadas` : ''}${r ? ` · ${r} repetições` : ''}`,
    duracao: (d) => `- **Duração:** ${d}`,
    custo: (t, p, s, a, x) => `- **Custo total:** ${t} (sessão principal ${p} + subagentes ${s}) · alvo ${a} · teto ${x}`,
    fonte: (d) => `- **Fonte do custo:** tokens reais dos transcripts × preços de \`pricing.json\` (${d}). A fatura oficial está na Console.`,
    porModelo: '## Por modelo',
    colModelo: ['| modelo | agentes | custo | tempo somado |', '|---|---|---|---|'],
    porOnda: '## Por onda',
    colOnda: ['| onda | tarefas | verdes | custo | agente mais lento |', '|---|---|---|---|---|'],
    porAgente: '## Por agente',
    mem: {
      titulo: '# Resumo para a memória',
      tituloTarefa: 'titulo da tarefa',
      data: 'data',
      resultado: (v, t, f, r) => `resultado: ${v}/${t} verdes, ${f} falhadas, ${r} repetições`,
      duracao: 'duracao',
      paralelismo: 'paralelismo',
      porModelo: 'custo por modelo',
      ajustes: 'ajustes do planner',
      nenhum: 'nenhum',
      falhas: 'Tarefas que precisaram de mais de uma tentativa ou falharam:',
      falha: (id, e, n, m) => `${id} (${e}, tentativa ${n}, ${m})`,
      nenhuma: '- nenhuma',
      ficheiros: 'Ficheiros tocados:',
    },
  },
  en: {
    titulo: (p, m) => `# Swarm report — ${p} (mode ${m})`,
    resultado: (v, t, f, r) => `- **Result:** ${v}/${t} tasks green${f ? `, ${f} failed` : ''}${r ? ` · ${r} ${r === 1 ? 'retry' : 'retries'}` : ''}`,
    duracao: (d) => `- **Duration:** ${d}`,
    custo: (t, p, s, a, x) => `- **Total cost:** ${t} (main session ${p} + subagents ${s}) · target ${a} · cap ${x}`,
    fonte: (d) => `- **Cost source:** real tokens from the transcripts × prices from \`pricing.json\` (${d}). The official invoice is in the Console.`,
    porModelo: '## By model',
    colModelo: ['| model | agents | cost | total time |', '|---|---|---|---|'],
    porOnda: '## By wave',
    colOnda: ['| wave | tasks | green | cost | slowest agent |', '|---|---|---|---|---|'],
    porAgente: '## By agent',
    mem: {
      titulo: '# Summary for memory',
      tituloTarefa: 'task title',
      data: 'date',
      resultado: (v, t, f, r) => `result: ${v}/${t} green, ${f} failed, ${r} ${r === 1 ? 'retry' : 'retries'}`,
      duracao: 'duration',
      paralelismo: 'parallelism',
      porModelo: 'cost by model',
      ajustes: 'planner adjustments',
      nenhum: 'none',
      falhas: 'Tasks that needed more than one attempt or failed:',
      falha: (id, e, n, m) => `${id} (${nomeEstado(e, 'en')}, attempt ${n}, ${m})`,
      nenhuma: '- none',
      ficheiros: 'Files touched:',
    },
  },
};

// `l` ('pt'|'en') is optional: it defaults to the kit language.
export function relatorio(projeto, caminhoPlano, l = lingua()) {
  const T = textos(TEXTOS, l);
  const M = T.mem;
  const u = (v) => usd(v, l);
  const c = caminhos(projeto);
  const plano = lerPlano(caminhoPlano, l);
  const f = fotografia(c, plano);
  const usage = usageUnico(lerJsonl(c.usage));
  const pricing = loadPricing();
  const run = lerJson(c.run, {});

  // By model: subagents + main sessions (the last snapshot of each session).
  const porModelo = new Map();
  const add = (m, usdV, s = 0, n = 0) => {
    const k = nomeModelo(m);
    const a = porModelo.get(k) || { custo: 0, segundos: 0, agentes: 0 };
    a.custo += usdV || 0;
    a.segundos += s || 0;
    a.agentes += n;
    porModelo.set(k, a);
  };
  const ultimaSessao = new Map();
  for (const r of usage) {
    if (r.tipo === 'subagente') add(r.modelo, r.custo_usd, r.duracao_s, 1);
    else if (r.tipo === 'principal') ultimaSessao.set(r.sessao, r);
  }
  for (const r of ultimaSessao.values()) {
    if (r.por_modelo) for (const [m, v] of Object.entries(r.por_modelo)) add(m, v);
    else add(r.modelo, r.custo_usd);
  }

  // By wave.
  const porOnda = new Map();
  for (const t of f.tarefas) {
    const a = porOnda.get(t.onda) || { tarefas: 0, verdes: 0, custo: 0, segundos: 0 };
    a.tarefas++;
    if (t.estado === 'verde') a.verdes++;
    a.custo += t.custo_usd || 0;
    a.segundos = Math.max(a.segundos, t.tempo_s || 0);
    porOnda.set(t.onda, a);
  }

  const duracao = run.inicio ? ((run.fim ? Date.parse(run.fim) : Date.now()) - Date.parse(run.inicio)) / 1000 : null;
  const alvo = pricing.budget?.target_usd ?? 5;
  const teto = pricing.budget?.cap_usd ?? 10;
  const tentativasExtra = usage.filter((r) => r.tipo === 'subagente' && (r.tentativa || 1) > 1).length;

  const md = [
    T.titulo(plano.projeto, nomeModo(plano.modo, l)),
    '',
    T.resultado(f.contagem.verde, f.total, f.contagem.falhou, tentativasExtra),
    T.duracao(tempo(duracao)),
    T.custo(u(f.custo.total), u(f.custo.principal), u(f.custo.subagentes), u(alvo), u(teto)),
    T.fonte(pricing.checked_on),
    '',
    T.porModelo,
    '',
    ...T.colModelo,
    ...[...porModelo.entries()].sort((a, b) => b[1].custo - a[1].custo).map(([m, a]) => `| ${m} | ${a.agentes || '—'} | ${u(a.custo)} | ${a.segundos ? tempo(a.segundos) : '—'} |`),
    '',
    T.porOnda,
    '',
    ...T.colOnda,
    ...[...porOnda.entries()].sort((a, b) => a[0] - b[0]).map(([o, a]) => `| ${o} | ${a.tarefas} | ${a.verdes} | ${u(a.custo)} | ${tempo(a.segundos)} |`),
    '',
    T.porAgente,
    '',
    tabelaMarkdown(f, undefined, l),
    '',
  ].join('\n');

  // Compact summary for the memory extraction (Haiku). The "key: value" lines with English keys
  // (project, task, epic, url, tags, cost_usd) go as they are to the memory app.
  const falhas = f.tarefas.filter((t) => t.estado === 'falhou' || t.tentativa > 1);
  const tarefaInfo = lerTarefaJson(c.ws);
  const modoEn = nomeModo(plano.modo, 'en');
  const resumoMem = [
    M.titulo,
    `project: ${plano.projeto}`,
    `task: ${tarefaInfo.id || plano.tarefa_id || plano.projeto + '-' + modoEn}`,
    ...(tarefaInfo.epic ? [`epic: ${tarefaInfo.epic}`] : []),
    ...(tarefaInfo.url ? [`url: ${tarefaInfo.url}`] : []),
    ...(tarefaInfo.labels?.length ? [`tags: ${tarefaInfo.labels.join(', ')}`] : []),
    ...(tarefaInfo.title ? [`${M.tituloTarefa}: ${tarefaInfo.title}`] : []),
    `${M.data}: ${new Date().toISOString().slice(0, 10)}`,
    M.resultado(f.contagem.verde, f.total, f.contagem.falhou, tentativasExtra),
    `${M.duracao}: ${tempo(duracao)}`,
    `cost_usd: ${f.custo.total.toFixed(4)}`,
    `${M.paralelismo}: ${plano.config?.max_paralelo}`,
    `${M.porModelo}: ${[...porModelo.entries()].map(([m, a]) => `${m} ${u(a.custo)}`).join(', ')}`,
    `${M.ajustes}: ${plano.ajustes?.aplicados?.join('; ') || M.nenhum}`,
    '',
    M.falhas,
    ...(falhas.length ? falhas.map((t) => `- ${M.falha(t.id, t.estado, t.tentativa, nomeModelo(t.modelo))}: ${(t.teste?.excerto || '').split('\n').slice(0, 2).join(' / ').slice(0, 240)}`) : [M.nenhuma]),
    '',
    M.ficheiros,
    ...plano.tarefas.flatMap((t) => t.ficheiros || []).slice(0, 40).map((p) => `- ${p}`),
  ].join('\n');

  writeFileSync(join(c.ws, REPORT_FILE), md);
  writeFileSync(join(c.ws, MEMORY_SUMMARY), resumoMem + '\n');
  return { md, f, porModelo: Object.fromEntries(porModelo), duracao, plano };
}

// English name.
export const report = relatorio;
export const readTaskJson = lerTarefaJson;

if (isMain(import.meta.url)) {
  const a = process.argv.slice(2);
  const projeto = opt(a, '--project') || process.cwd();
  const ponteiro = lerPonteiro(caminhos(projeto));
  const plano = opt(a, '--plan') || ponteiro.plan || ponteiro.plano || resolverNoProjeto(projeto, 'plan.json');
  try {
    const r = relatorio(projeto, plano);
    // --json: the same numbers as before, with English keys (the benchmark reads them).
    const c = r.f.contagem;
    const json = {
      cost: { total: r.f.custo.total, main: r.f.custo.principal, subagents: r.f.custo.subagentes },
      count: { todo: c.por_fazer, working: c.em_curso, green: c.verde, red: c.vermelho, failed: c.falhou },
      duration_s: r.duracao,
      by_model: Object.fromEntries(Object.entries(r.porModelo).map(([m, v]) => [m, { cost: v.custo, seconds: v.segundos, agents: v.agentes }])),
    };
    console.log(flag(a, '--json') ? JSON.stringify(json, null, 2) : r.md);
  } catch (e) {
    console.error(`ERROR: ${e.message}`);
    process.exit(1);
  }
}
