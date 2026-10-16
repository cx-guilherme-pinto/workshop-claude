#!/usr/bin/env node
// Relatorio final de custo e tempo: por agente, por modelo e por onda.
// Le o plano, o estado (.workshop/status) e os custos medidos pelos hooks (.workshop/usage.jsonl).
//
//   node report.mjs [--projeto <dir>] [--plano <plan.json>] [--json]
// Escreve tambem .workshop/relatorio.md e .workshop/memoria-resumo.md (entrada para a memoria).
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { caminhos, lerPlano, fotografia, lerJsonl, lerJson, resolverNoProjeto, usageUnico } from './lib/estado.mjs';
import { usd, tempo, nomeModelo, tabelaMarkdown } from './lib/tabela.mjs';
import { loadPricing } from '../hooks/lib/cost.mjs';
import { ehPrincipal } from './lib/principal.mjs';

export function relatorio(projeto, caminhoPlano) {
  const c = caminhos(projeto);
  const plano = lerPlano(caminhoPlano);
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
    `# Relatório do enxame — ${plano.projeto} (modo ${plano.modo})`,
    '',
    `- **Resultado:** ${f.contagem.verde}/${f.total} tarefas verdes${f.contagem.falhou ? `, ${f.contagem.falhou} falhadas` : ''}${tentativasExtra ? ` · ${tentativasExtra} repetições` : ''}`,
    `- **Duração:** ${tempo(duracao)}`,
    `- **Custo total:** ${usd(f.custo.total)} (sessão principal ${usd(f.custo.principal)} + subagentes ${usd(f.custo.subagentes)}) · alvo ${usd(alvo)} · teto ${usd(teto)}`,
    `- **Fonte do custo:** tokens reais dos transcripts × preços de \`pricing.json\` (${pricing.consultado_em}). A fatura oficial está na Console.`,
    '',
    '## Por modelo',
    '',
    '| modelo | agentes | custo | tempo somado |',
    '|---|---|---|---|',
    ...[...porModelo.entries()].sort((a, b) => b[1].custo - a[1].custo).map(([m, a]) => `| ${m} | ${a.agentes || '—'} | ${usd(a.custo)} | ${a.segundos ? tempo(a.segundos) : '—'} |`),
    '',
    '## Por onda',
    '',
    '| onda | tarefas | verdes | custo | agente mais lento |',
    '|---|---|---|---|---|',
    ...[...porOnda.entries()].sort((a, b) => a[0] - b[0]).map(([o, a]) => `| ${o} | ${a.tarefas} | ${a.verdes} | ${usd(a.custo)} | ${tempo(a.segundos)} |`),
    '',
    '## Por agente',
    '',
    tabelaMarkdown(f),
    '',
  ].join('\n');

  // Resumo compacto para a extracao de memorias (Haiku).
  const falhas = f.tarefas.filter((t) => t.estado === 'falhou' || t.tentativa > 1);
  const resumoMem = [
    `# Resumo para a memória`,
    `projeto: ${plano.projeto}`,
    `tarefa: ${plano.tarefa_id || plano.projeto + '-' + plano.modo}`,
    `data: ${new Date().toISOString().slice(0, 10)}`,
    `resultado: ${f.contagem.verde}/${f.total} verdes, ${f.contagem.falhou} falhadas, ${tentativasExtra} repetições`,
    `duracao: ${tempo(duracao)}`,
    `custo_usd: ${f.custo.total.toFixed(4)}`,
    `paralelismo: ${plano.config?.max_paralelo}`,
    `custo por modelo: ${[...porModelo.entries()].map(([m, a]) => `${m} ${usd(a.custo)}`).join(', ')}`,
    `ajustes do planner: ${plano.ajustes?.aplicados?.join('; ') || 'nenhum'}`,
    '',
    'Tarefas que precisaram de mais de uma tentativa ou falharam:',
    ...(falhas.length ? falhas.map((t) => `- ${t.id} (${t.estado}, tentativa ${t.tentativa}, ${nomeModelo(t.modelo)}): ${(t.teste?.excerto || '').split('\n').slice(0, 2).join(' / ').slice(0, 240)}`) : ['- nenhuma']),
    '',
    'Ficheiros tocados:',
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
