#!/usr/bin/env node
// Deterministic orchestrator: decides the NEXT BATCH of subagents to launch.
// The model does not decide the graph: it only launches exactly the calls this script returns.
//
//   node next-wave.mjs [--project <dir>] [--plan <plan.json>] [--max <n>]
//
// On each call:
//   1. grades the tasks of the previous batch;
//   2. marks as "failed" the ones that used up their attempts;
//   3. picks the ready tasks (dependencies finished), up to the parallel maximum;
//   4. prints the previous batch's table and the CALLS block with the next batch.
// When there is nothing left to do, it prints STATE: DONE.
// The texts (table, warnings, subagent prompts) are in the kit language; the markers
// (STATE: ..., <<<CALLS, TASK:/AGENT:/ATTEMPT:) are English in both languages.
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { caminhos, garantirPastas, lerPlano, todosEstados, gravarEstado, lerJson, escreverJson, evento, fotografia, resolverNoProjeto } from './lib/state.mjs';
import { avaliarVarias } from './grade.mjs';
import { tabelaMarkdown, linhaResumo, usd, tempo } from './lib/table.mjs';
import { isMain } from './lib/is-main.mjs';
import { opt } from './lib/args.mjs';
import { lingua, textos } from '../hooks/lib/language.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const TERMINAL_OK = new Set(['verde', 'falhou']);

const TEXTOS = {
  pt: {
    falhou: (n) => `A tentativa ${n} falhou. Excerto do teste:`,
    corrige: 'Corrige a causa e volta a verificar.',
    ultima: 'Esta é a última tentativa: confirma que o teste passa antes de terminares.',
    resultado: '## Resultado do lote anterior',
    progresso: 'Progresso:',
    lote: (n, ondas, k) => `STATE: BATCH ${n} · onda ${ondas} · ${k} agente(s)`,
    cabecalho: ['| agente | tarefa | tipo |', '|---|---|---|'],
    lanca: 'Lança AGORA estas chamadas, todas na MESMA mensagem, cada uma com a ferramenta Agent e os campos exatamente como estão (subagent_type, description, prompt e, se existir, isolation):',
    bloqueado: 'STATE: BLOCKED — há tarefas por terminar mas nenhuma está pronta (dependências falhadas?).',
    fim: (v, f, dur, custo) => `STATE: DONE · ${v} verdes, ${f} falhadas · duração ${dur} · custo ${custo}`,
  },
  en: {
    falhou: (n) => `Attempt ${n} failed. Test excerpt:`,
    corrige: 'Fix the cause and check again.',
    ultima: 'This is the last attempt: make sure the test passes before you finish.',
    resultado: '## Previous batch result',
    progresso: 'Progress:',
    lote: (n, ondas, k) => `STATE: BATCH ${n} · wave ${ondas} · ${k} agent(s)`,
    cabecalho: ['| agent | task | type |', '|---|---|---|'],
    lanca: 'Launch these calls NOW, all in the SAME message, each one with the Agent tool and the fields exactly as they are (subagent_type, description, prompt and, if present, isolation):',
    bloqueado: 'STATE: BLOCKED — some tasks are not finished but none is ready (failed dependencies?).',
    fim: (v, f, dur, custo) => `STATE: DONE · ${v} green, ${f} failed · duration ${dur} · cost ${custo}`,
  },
};

function args(argv) {
  const o = { projeto: opt(argv, '--project', process.cwd()), plano: opt(argv, '--plan'), max: opt(argv, '--max') };
  o.max = o.max === null ? null : Number(o.max);
  o.plano ||= resolverNoProjeto(o.projeto, 'plan.json');
  return o;
}

function maxParalelo(plano, pedido) {
  const env = Number(process.env.ARENA_MAX_PARALLEL || process.env.WS_MAX_PARALLEL || process.env.ARENA_MAX_PARALELO || process.env.WS_MAX_PARALELO || 0);
  const v = pedido || env || plano.config?.max_paralelo || 8;
  return Math.max(1, Math.min(16, v));
}

function prompt(t, st, agente, tentativa, plano, l) {
  const T = textos(TEXTOS, l);
  const linhas = [`TASK: ${t.id}`, `AGENT: ${agente}`, `ATTEMPT: ${tentativa}`, '', t.instrucoes.trim()];
  if (tentativa > 1 && st.teste?.excerto) {
    linhas.push('', T.falhou(tentativa - 1), '```', st.teste.excerto.slice(0, 1200), '```', T.corrige);
  }
  if (tentativa >= (plano.config?.max_tentativas ?? 3)) linhas.push('', T.ultima);
  return linhas.join('\n');
}

// `l` ('pt'|'en') is optional: it defaults to the kit language.
export async function proximaOnda({ projeto, plano: caminhoPlano, max, l = lingua() }) {
  const c = caminhos(projeto);
  garantirPastas(c);
  const plano = lerPlano(caminhoPlano, l);
  const cfg = plano.config || {};
  const maxTent = cfg.max_tentativas ?? 3;
  const escalar = cfg.escalar_para || null;

  // Pointer, so the hooks know how to grade this project's tasks.
  escreverJson(c.ponteiro, { plan: caminhoPlano, grade: join(AQUI, 'grade.mjs'), node: process.execPath });
  const run = lerJson(c.run, {});
  if (!run.inicio) {
    run.inicio = new Date().toISOString();
    run.lote = 0;
    run.contador = {};
    evento(c, { tipo: 'inicio', modo: plano.modo, total: plano.tarefas.length });
  }

  // 1. Grade the previous batch (everything left "working").
  let estados = todosEstados(c, plano);
  const loteAnterior = plano.tarefas.filter((t) => estados.get(t.id).estado === 'em_curso');
  if (loteAnterior.length) await avaliarVarias(projeto, plano, loteAnterior);
  estados = todosEstados(c, plano);

  // 2. Pick the ready tasks.
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
  // Never two tasks with files in common in the same batch (avoids conflicts without worktrees).
  const lote = [];
  const limite = maxParalelo(plano, max);
  const sobrepoe = (a, b) => (a || []).some((x) => (b || []).some((y) => x === y || x.startsWith(y.endsWith('/') ? y : y + '/') || y.startsWith(x.endsWith('/') ? x : x + '/')));
  for (const t of prontas) {
    if (lote.length >= limite) break;
    if (!cfg.worktrees && lote.some((o) => sobrepoe(o.ficheiros, t.ficheiros))) continue;
    lote.push(t);
  }

  // 3. Prepare the calls and mark them "working".
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
    const chamada = { subagent_type: tipo, description: `${agente} · ${t.id}`, prompt: prompt(t, st, agente, tentativa, plano, l) };
    if (cfg.worktrees && !['integracao', 'revisao'].includes(t.grupo_tipo)) chamada.isolation = 'worktree';
    chamadas.push(chamada);
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

// Text the skill reads: the previous batch's table, the progress line and the STATE marker.
export function textoOnda({ f, loteAnterior, lote, chamadas, pendentes, run }, l = lingua()) {
  const T = textos(TEXTOS, l);
  const out = [];
  if (loteAnterior.length) {
    const ids = new Set(loteAnterior.map((t) => t.id));
    out.push(T.resultado, '', tabelaMarkdown(f, (t) => ids.has(t.id), l), '');
  }
  out.push(`${T.progresso} ${linhaResumo(f, l)}`, '');
  if (chamadas.length) {
    const ondas = [...new Set(lote.map((t) => t.onda))].join(', ');
    out.push(T.lote(run.lote, ondas, chamadas.length), '');
    out.push(...T.cabecalho, ...chamadas.map((ch) => `| ${ch.description.split(' · ')[0]} | ${ch.description.split(' · ')[1]} | ${ch.subagent_type} |`), '');
    out.push(T.lanca, '');
    out.push('<<<CALLS', JSON.stringify(chamadas, null, 2), 'CALLS>>>');
  } else if (pendentes > 0) {
    out.push(T.bloqueado);
  } else {
    const dur = run.inicio && run.fim ? (Date.parse(run.fim) - Date.parse(run.inicio)) / 1000 : null;
    out.push(T.fim(f.contagem.verde, f.contagem.falhou, tempo(dur), usd(f.custo.total, l)));
  }
  return out.join('\n');
}

// English names.
export const nextWave = proximaOnda;
export const waveText = textoOnda;

if (isMain(import.meta.url)) {
  try {
    console.log(textoOnda(await proximaOnda(args(process.argv.slice(2)))));
  } catch (e) {
    console.error(`ERROR: ${e.message}`);
    process.exit(1);
  }
}
