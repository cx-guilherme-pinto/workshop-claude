#!/usr/bin/env node
// Relatorio final de custo e tempo: por agente, por modelo e por onda.
// Le o plano, o estado (.workshop/status) e os custos medidos pelos hooks (.workshop/usage.jsonl).
//
//   node report.mjs [--projeto <dir>] [--plano <plan.json>] [--json]
// Escreve tambem .workshop/relatorio.md e .workshop/memoria-resumo.md (entrada para a memoria).
// Os textos saem na lingua do kit. No memoria-resumo.md, as chaves que o memoria-extrator passa
// tal e qual a app de memoria (projeto, tarefa, epico, url, etiquetas, custo_usd) ficam iguais.
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { caminhos, lerPlano, fotografia, lerJsonl, lerJson, resolverNoProjeto, usageUnico } from './lib/estado.mjs';
import { usd, tempo, nomeModelo, nomeEstado, tabelaMarkdown } from './lib/tabela.mjs';
import { loadPricing } from '../hooks/lib/cost.mjs';
import { ehPrincipal } from './lib/principal.mjs';
import { lingua, textos } from '../hooks/lib/lingua.mjs';

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

// `l` ('pt'|'en') e opcional: por omissao, a lingua do kit.
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

  // Por modelo: subagentes + sessoes principais (ultima fotografia de cada sessao).
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

  // Por onda.
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
  const alvo = pricing.orcamento?.alvo_usd ?? 5;
  const teto = pricing.orcamento?.teto_usd ?? 10;
  const tentativasExtra = usage.filter((r) => r.tipo === 'subagente' && (r.tentativa || 1) > 1).length;

  const md = [
    T.titulo(plano.projeto, plano.modo),
    '',
    T.resultado(f.contagem.verde, f.total, f.contagem.falhou, tentativasExtra),
    T.duracao(tempo(duracao)),
    T.custo(u(f.custo.total), u(f.custo.principal), u(f.custo.subagentes), u(alvo), u(teto)),
    T.fonte(pricing.consultado_em),
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

  // Resumo compacto para a extracao de memorias (Haiku).
  const falhas = f.tarefas.filter((t) => t.estado === 'falhou' || t.tentativa > 1);
  const tarefaInfo = lerJson(join(c.ws, 'tarefa.json'), {});
  const resumoMem = [
    M.titulo,
    `projeto: ${plano.projeto}`,
    `tarefa: ${tarefaInfo.id || plano.tarefa_id || plano.projeto + '-' + plano.modo}`,
    ...(tarefaInfo.epico ? [`epico: ${tarefaInfo.epico}`] : []),
    ...(tarefaInfo.url ? [`url: ${tarefaInfo.url}`] : []),
    ...(tarefaInfo.etiquetas?.length ? [`etiquetas: ${tarefaInfo.etiquetas.join(', ')}`] : []),
    ...(tarefaInfo.titulo ? [`${M.tituloTarefa}: ${tarefaInfo.titulo}`] : []),
    `${M.data}: ${new Date().toISOString().slice(0, 10)}`,
    M.resultado(f.contagem.verde, f.total, f.contagem.falhou, tentativasExtra),
    `${M.duracao}: ${tempo(duracao)}`,
    `custo_usd: ${f.custo.total.toFixed(4)}`,
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

  writeFileSync(join(c.ws, 'relatorio.md'), md);
  writeFileSync(join(c.ws, 'memoria-resumo.md'), resumoMem + '\n');
  return { md, f, porModelo: Object.fromEntries(porModelo), duracao, plano };
}

if (ehPrincipal(import.meta.url)) {
  const a = process.argv.slice(2);
  const projeto = a.includes('--projeto') ? a[a.indexOf('--projeto') + 1] : process.cwd();
  const ponteiro = lerJson(join(projeto, '.workshop', 'orquestrador.json'), {});
  const plano = a.includes('--plano') ? a[a.indexOf('--plano') + 1] : ponteiro.plano || resolverNoProjeto(projeto, 'plan.json');
  try {
    const r = relatorio(projeto, plano);
    console.log(a.includes('--json') ? JSON.stringify({ custo: r.f.custo, contagem: r.f.contagem, duracao_s: r.duracao, por_modelo: r.porModelo }, null, 2) : r.md);
  } catch (e) {
    console.error(`ERRO: ${e.message}`);
    process.exit(1);
  }
}
