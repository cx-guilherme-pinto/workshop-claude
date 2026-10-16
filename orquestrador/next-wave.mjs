#!/usr/bin/env node
// Orquestrador deterministico: decide o PROXIMO LOTE de subagentes a lancar.
// O modelo nao decide o grafo: limita-se a lancar exatamente as chamadas que este script devolve.
//
//   node next-wave.mjs [--projeto <dir>] [--plano <plan.json>] [--max <n>]
//
// Em cada chamada:
//   1. avalia (grade) as tarefas do lote anterior;
//   2. marca como "falhou" as que esgotaram as tentativas;
//   3. escolhe as tarefas prontas (dependencias terminadas), ate ao maximo em paralelo;
//   4. imprime a tabela do lote anterior e o bloco CHAMADAS com o proximo lote.
// Quando nao ha mais nada para fazer, imprime ESTADO: FIM.
import { pathToFileURL, fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { caminhos, garantirPastas, lerPlano, todosEstados, gravarEstado, lerJson, escreverJson, evento, fotografia, resolverNoProjeto } from './lib/estado.mjs';
import { avaliarVarias } from './grade.mjs';
import { tabelaMarkdown, linhaResumo, usd, tempo } from './lib/tabela.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const TERMINAL_OK = new Set(['verde', 'falhou']);

function args(argv) {
  const o = { projeto: process.cwd(), plano: null, max: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--projeto') o.projeto = argv[++i];
    else if (argv[i] === '--plano') o.plano = argv[++i];
    else if (argv[i] === '--max') o.max = Number(argv[++i]);
  }
  o.plano ||= resolverNoProjeto(o.projeto, 'plan.json');
  return o;
}

function maxParalelo(plano, pedido) {
  const env = Number(process.env.ARENA_MAX_PARALELO || process.env.WS_MAX_PARALELO || 0);
  const v = pedido || env || plano.config?.max_paralelo || 8;
  return Math.max(1, Math.min(16, v));
}

function prompt(t, st, agente, tentativa, plano) {
  const linhas = [`TAREFA: ${t.id}`, `AGENTE: ${agente}`, `TENTATIVA: ${tentativa}`, '', t.instrucoes.trim()];
  if (tentativa > 1 && st.teste?.excerto) {
    linhas.push('', `A tentativa ${tentativa - 1} falhou. Excerto do teste:`, '```', st.teste.excerto.slice(0, 1200), '```', 'Corrige a causa e volta a verificar.');
  }
  if (tentativa >= (plano.config?.max_tentativas ?? 3)) linhas.push('', 'Esta é a última tentativa: confirma que o teste passa antes de terminares.');
  return linhas.join('\n');
}

export async function proximaOnda({ projeto, plano: caminhoPlano, max }) {
  const c = caminhos(projeto);
  garantirPastas(c);
  const plano = lerPlano(caminhoPlano);
  const cfg = plano.config || {};
  const maxTent = cfg.max_tentativas ?? 3;
  const escalar = cfg.escalar_para || null;

  // Ponteiro para os hooks saberem como avaliar tarefas deste projeto.
  escreverJson(c.ponteiro, { plano: caminhoPlano, grade: join(AQUI, 'grade.mjs'), node: process.execPath });
  const run = lerJson(c.run, {});
  if (!run.inicio) {
    run.inicio = new Date().toISOString();
    run.lote = 0;
    run.contador = {};
    evento(c, { tipo: 'inicio', modo: plano.modo, total: plano.tarefas.length });
  }

  // 1. Avaliar o lote anterior (tudo o que ficou "em curso").
  let estados = todosEstados(c, plano);
  const loteAnterior = plano.tarefas.filter((t) => estados.get(t.id).estado === 'em_curso');
  if (loteAnterior.length) await avaliarVarias(projeto, plano, loteAnterior);
  estados = todosEstados(c, plano);

  // 2. Escolher as tarefas prontas.
  const prontas = plano.tarefas.filter((t) => {
    const st = estados.get(t.id);
    const podeTentar = st.estado === 'por_fazer' || (st.estado === 'vermelho' && (st.tentativa || 0) < maxTent);
    return podeTentar && (t.depende || []).every((d) => TERMINAL_OK.has(estados.get(d)?.estado));
  });
  const ondaDe = (t) => {
    const st = estados.get(t.id);
    const prox = (st.tentativa || 0) + 1;
    return prox >= maxTent && escalar && t.grupo_tipo === 'cartao' ? Math.max(t.onda, 3) : t.onda;
  };
  prontas.sort((a, b) => ondaDe(a) - ondaDe(b) || a.id.localeCompare(b.id));
  const lote = prontas.slice(0, maxParalelo(plano, max));

  // 3. Preparar chamadas e marcar "em curso".
  const chamadas = [];
  if (lote.length) run.lote = (run.lote || 0) + 1;
  for (const t of lote) {
    const st = estados.get(t.id);
    const tentativa = (st.tentativa || 0) + 1;
    const tipo = tentativa >= maxTent && escalar && t.grupo_tipo === 'cartao' ? escalar : t.agente;
    run.contador[tipo] = (run.contador[tipo] || 0) + 1;
    const agente = `${tipo}-${String(run.contador[tipo]).padStart(2, '0')}`;
    if (t.preparar) spawnSync(t.preparar[0] === 'node' ? process.execPath : t.preparar[0], t.preparar.slice(1), { cwd: projeto, stdio: 'ignore', shell: t.preparar[0] !== 'node' });
    const modelo = plano.agentes?.[tipo]?.modelo || null;
    gravarEstado(c, { ...st, tarefa: t.id, estado: 'em_curso', tentativa, agente, agent_type: tipo, modelo, onda: ondaDe(t), lote: run.lote, inicio: new Date().toISOString(), fim: null });
    chamadas.push({ subagent_type: tipo, description: `${agente} · ${t.id}`, prompt: prompt(t, st, agente, tentativa, plano) });
  }

  const f = fotografia(c, plano);
  const pendentes = f.tarefas.filter((t) => !TERMINAL_OK.has(t.estado)).length;
  if (!lote.length && pendentes === 0 && !run.fim) {
    run.fim = new Date().toISOString();
    evento(c, { tipo: 'fim', contagem: f.contagem, custo: f.custo });
  }
  escreverJson(c.run, run);
  return { plano, f, loteAnterior, lote, chamadas, pendentes, run };
}

function imprimir({ f, loteAnterior, lote, chamadas, pendentes, run }) {
  const out = [];
  if (loteAnterior.length) {
    const ids = new Set(loteAnterior.map((t) => t.id));
    out.push('## Resultado do lote anterior', '', tabelaMarkdown(f, (t) => ids.has(t.id)), '');
  }
  out.push(`Progresso: ${linhaResumo(f)}`, '');
  if (chamadas.length) {
    const ondas = [...new Set(lote.map((t) => t.onda))].join(', ');
    out.push(`ESTADO: LOTE ${run.lote} · onda ${ondas} · ${chamadas.length} agente(s)`, '');
    out.push('| agente | tarefa | tipo |', '|---|---|---|', ...chamadas.map((ch) => `| ${ch.description.split(' · ')[0]} | ${ch.description.split(' · ')[1]} | ${ch.subagent_type} |`), '');
    out.push('Lança AGORA estas chamadas, todas na MESMA mensagem, cada uma com a ferramenta Agent e os campos exatamente como estão:', '');
    out.push('<<<CHAMADAS', JSON.stringify(chamadas, null, 2), 'CHAMADAS>>>');
  } else if (pendentes > 0) {
    out.push('ESTADO: BLOQUEADO — há tarefas por terminar mas nenhuma está pronta (dependências falhadas?).');
  } else {
    const dur = run.inicio && run.fim ? (Date.parse(run.fim) - Date.parse(run.inicio)) / 1000 : null;
    out.push(`ESTADO: FIM · ${f.contagem.verde} verdes, ${f.contagem.falhou} falhadas · duração ${tempo(dur)} · custo ${usd(f.custo.total)}`);
  }
  console.log(out.join('\n'));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    imprimir(await proximaOnda(args(process.argv.slice(2))));
  } catch (e) {
    console.error(`ERRO: ${e.message}`);
    process.exit(1);
  }
}
