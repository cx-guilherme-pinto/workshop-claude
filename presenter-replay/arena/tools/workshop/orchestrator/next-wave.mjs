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
import { openSync, writeSync, closeSync, readFileSync, unlinkSync, statSync, existsSync, mkdirSync, renameSync } from 'node:fs';
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
    semTarefas: 'O plano não tem tarefas: volta a planear (/demo-plan ou /task-plan).',
    ocupado: (pid) => `outro next-wave já está a correr neste projeto (pid ${pid}): espera que termine e volta a correr este comando. Se nenhum estiver a correr, apaga .workshop/next-wave.lock.`,
    corrupto: (fs) => `ficheiro(s) de estado ilegível(is): ${fs}. Apaga-o(s) para refazer essa(s) tarefa(s), ou recomeça (/demo-reset na Arena).`,
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
    semTarefas: 'The plan has no tasks: plan again (/demo-plan or /task-plan).',
    ocupado: (pid) => `another next-wave is already running in this project (pid ${pid}): wait for it to finish, then run this command again. If none is running, delete .workshop/next-wave.lock.`,
    corrupto: (fs) => `unreadable state file(s): ${fs}. Delete it to redo that task, or start over (/demo-reset in the Arena).`,
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

// One next-wave per project at a time (the swarm started from two terminals, or a re-run while one is still
// grading): both would read the same state and launch the same batch twice. The second one stops at once
// (waiting would make it grade the tasks the first one has just launched, before their subagents ran).
// A lock whose process is gone, or older than LOCK_MAX_H (a reboot, a reused pid), is stale and is replaced.
const LOCK_MAX_H = 3;
function trancar(c, l) {
  const lock = join(c.ws, 'next-wave.lock');
  for (let i = 0; i < 2; i++) {
    try {
      const fd = openSync(lock, 'wx');
      writeSync(fd, JSON.stringify({ pid: process.pid, started: new Date().toISOString() }));
      closeSync(fd);
      return () => {
        try {
          unlinkSync(lock);
        } catch {
          /* already gone */
        }
      };
    } catch (e) {
      if (e.code !== 'EEXIST') throw e;
      let pid = 0;
      let idadeS = 0;
      try {
        pid = Number(JSON.parse(readFileSync(lock, 'utf8')).pid) || 0;
      } catch {
        /* being written, or broken */
      }
      try {
        idadeS = (Date.now() - statSync(lock).mtimeMs) / 1000;
      } catch {
        /* gone meanwhile */
      }
      let vivo = !pid && idadeS < 10; // just created, the pid is not written yet
      if (pid) {
        try {
          process.kill(pid, 0);
          vivo = true;
        } catch (k) {
          vivo = k.code === 'EPERM';
        }
      }
      if (vivo && idadeS < LOCK_MAX_H * 3600) throw new Error(textos(TEXTOS, l).ocupado(pid || '?'));
      try {
        unlinkSync(lock);
      } catch {
        /* someone else removed it */
      }
    }
  }
  throw new Error(textos(TEXTOS, l).ocupado('?'));
}

// A plan newer than the current run (planned again, e.g. to change mode) starts a new run: the old states,
// run.json, events and verdict go to .workshop/history/<date>/ (usage.jsonl stays, so the spend still counts).
// Without this, the old greens of 3 days ago showed up as done in the new plan.
function arquivarExecucao(c) {
  const destino = join(c.ws, 'history', new Date().toISOString().replace(/[:.]/g, '-'));
  mkdirSync(destino, { recursive: true });
  for (const n of ['status', 'run.json', 'events.jsonl', 'verdict.json', 'veredito.json', 'gate.json']) {
    const f = join(c.ws, n);
    if (existsSync(f)) renameSync(f, join(destino, n));
  }
  garantirPastas(c);
}

// `l` ('pt'|'en') is optional: it defaults to the kit language.
export async function proximaOnda(o) {
  const l = o.l ?? lingua();
  const c = caminhos(o.projeto);
  garantirPastas(c);
  const soltar = trancar(c, l);
  try {
    return await proximaOndaSemLock({ ...o, l });
  } finally {
    soltar();
  }
}

async function proximaOndaSemLock({ projeto, plano: caminhoPlano, max, l }) {
  const c = caminhos(projeto);
  const T = textos(TEXTOS, l);
  const plano = lerPlano(caminhoPlano, l);
  const cfg = plano.config || {};
  const maxTent = cfg.max_tentativas ?? 3;
  const escalar = cfg.escalar_para || null;

  // Pointer, so the hooks know how to grade this project's tasks.
  escreverJson(c.ponteiro, { plan: caminhoPlano, grade: join(AQUI, 'grade.mjs'), node: process.execPath });
  let run = lerJson(c.run, {});
  if (!run || typeof run !== 'object' || Array.isArray(run)) run = {};
  const planoNovo = run.inicio && plano.criado_em && Date.parse(plano.criado_em) > Date.parse(run.inicio);
  if (planoNovo) {
    arquivarExecucao(c);
    run = {};
  }
  if (!run.inicio) {
    run.inicio = new Date().toISOString();
    run.fim = null;
    run.lote = 0;
    run.contador = {};
    evento(c, { tipo: 'inicio', modo: plano.modo, total: plano.tarefas.length });
  }
  run.contador ||= {};

  // 1. Grade the previous batch (everything left "working").
  let estados = todosEstados(c, plano);
  // A status file that cannot be read: stop and name it, instead of relaunching that task as attempt 1.
  const maus = [...estados.values()].filter((s) => s.corrupto).map((s) => s.corrupto);
  if (maus.length) throw new Error(T.corrupto(maus.join(', ')));
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
    if (f.total === 0) out.push(T.semTarefas, '');
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
