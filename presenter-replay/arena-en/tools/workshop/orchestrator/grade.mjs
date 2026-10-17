#!/usr/bin/env node
// The swarm's single grader: runs each task's test and saves the official result
// (green/red) in .workshop/status/<id>.json.
//
//   node grade.mjs [--project <dir>] [--plan <plan.json>] <id> [<id> ...]
//   node grade.mjs --all            grades every task
//   node grade.mjs --summary        only shows the summary, without grading
// (--projeto, --plano, --todos and --resumo still work.)
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { caminhos, garantirPastas, lerPlano, lerEstado, gravarEstado, lerJson, lerPonteiro, resolverNoProjeto, fotografia } from './lib/state.mjs';
import { tabelaTexto } from './lib/table.mjs';
import { isMain } from './lib/is-main.mjs';
import { opt, flag, canonical, ALIASES } from './lib/args.mjs';
import { lingua, textos } from '../hooks/lib/language.mjs';

const LIMITE_SAIDA = 1500;

// Texts that go into the task state (the excerpt goes back to the subagent on the next attempt).
const TEXTOS = {
  pt: {
    esgotado: (s) => `[tempo esgotado: ${s}s]`,
    falta: (f, campo) => `falta ${f} com o campo "${campo}"`,
    semTeste: 'sem teste definido',
    uso: 'Indica os ids das tarefas, --all ou --summary.',
  },
  en: {
    esgotado: (s) => `[timed out: ${s}s]`,
    falta: (f, campo) => `missing ${f} with the field "${campo}"`,
    semTeste: 'no test defined',
    uso: 'Give the task ids, --all or --summary.',
  },
};

function correr(cmd, { cwd, timeoutS, env, l = lingua() }) {
  return new Promise((done) => {
    let argv = [...cmd];
    let opts = { cwd, env: { ...process.env, ...env, FORCE_COLOR: '0', NO_COLOR: '1' } };
    if (argv[0] === 'node') {
      argv[0] = process.execPath;
      const i = argv.indexOf('--test');
      if (i >= 0 && !argv.some((a) => a.startsWith('--test-timeout'))) argv.splice(i + 1, 0, '--test-timeout=5000');
    } else {
      opts.shell = true;
    }
    // With a shell, the arguments were always joined as they are; passing the joined line avoids Node's
    // DEP0190 warning (shown to the participant) without changing what runs.
    const p = opts.shell ? spawn(argv.join(' '), opts) : spawn(argv[0], argv.slice(1), opts);
    let out = '';
    const add = (b) => {
      out += b.toString();
      if (out.length > 200000) out = out.slice(-200000);
    };
    p.stdout.on('data', add);
    p.stderr.on('data', add);
    const timer = setTimeout(() => {
      out += `\n${textos(TEXTOS, l).esgotado(timeoutS)}`;
      p.kill('SIGKILL');
    }, timeoutS * 1000);
    p.on('close', (code) => {
      clearTimeout(timer);
      done({ code: code ?? 1, out });
    });
    p.on('error', (e) => {
      clearTimeout(timer);
      done({ code: 1, out: String(e) });
    });
  });
}

// Extracts the counts and the relevant lines from the node --test output.
export function resumirSaida(out) {
  const n = (k) => Number((new RegExp(`(?:ℹ|#)\\s*${k}\\s+(\\d+)`).exec(out) || [])[1] || 0);
  const linhas = out.split('\n');
  const falhas = [];
  for (let i = 0; i < linhas.length; i++) {
    const l = linhas[i];
    if (/✖|not ok|Error|error:|expected|esperado|nao |não /i.test(l) && !/failing tests:|ℹ/.test(l)) falhas.push(l.trim());
  }
  let excerto = [...new Set(falhas)].join('\n');
  if (excerto.length > LIMITE_SAIDA) excerto = excerto.slice(0, LIMITE_SAIDA) + '\n…';
  return { passados: n('pass'), falhados: n('fail'), excerto };
}

// The value of `campo` in a JSON file of the project. The review verdict changed names
// (.workshop/veredito.json {"veredito"} -> .workshop/verdict.json {"verdict"}): both are accepted,
// whichever the plan names and whichever the reviewer wrote.
const NOMES_JSON = { 'veredito.json': 'verdict.json', 'verdict.json': 'veredito.json' };
const NOMES_CAMPO = { veredito: 'verdict', verdict: 'veredito' };
export function lerCampoJson(projeto, ficheiro, campo) {
  const principal = resolverNoProjeto(projeto, ficheiro);
  const outro = NOMES_JSON[basename(principal)] ? join(dirname(principal), NOMES_JSON[basename(principal)]) : null;
  for (const f of [principal, outro].filter(Boolean)) {
    if (!existsSync(f)) continue;
    const j = lerJson(f);
    const valor = j?.[campo] ?? (NOMES_CAMPO[campo] ? j?.[NOMES_CAMPO[campo]] : undefined);
    if (valor !== undefined && valor !== null && valor !== '') return { ficheiro: f === principal ? ficheiro : `${dirname(ficheiro)}/${basename(f)}`, valor };
  }
  return { ficheiro, valor: null };
}

export async function avaliar(projeto, plano, tarefa, { soAgente = null, l = lingua() } = {}) {
  const T = textos(TEXTOS, l);
  const c = caminhos(projeto);
  garantirPastas(c);
  const st = lerEstado(c, tarefa.id);
  // Called by the hook: only grades if the task is still "working" with this same agent
  // (so a new attempt already launched by next-wave is not overwritten).
  if (soAgente && (st.estado !== 'em_curso' || st.agente !== soAgente)) return st;
  const inicioTeste = Date.now();
  let ok = false;
  let teste = {};
  if (Array.isArray(tarefa.teste)) {
    const r = await correr(tarefa.teste, { cwd: projeto, timeoutS: tarefa.timeout_s || (tarefa.teste.length <= 2 ? 600 : 120), l });
    const s = resumirSaida(r.out);
    ok = r.code === 0 && s.falhados === 0;
    teste = { comando: tarefa.teste.join(' '), codigo: r.code, ...s };
  } else if (tarefa.teste && tarefa.teste.ficheiro_json) {
    const { ficheiro, valor } = lerCampoJson(projeto, tarefa.teste.ficheiro_json, tarefa.teste.campo);
    ok = valor !== undefined && valor !== null && valor !== '';
    teste = { ficheiro, valor: valor ?? null, excerto: ok ? '' : T.falta(tarefa.teste.ficheiro_json, tarefa.teste.campo) };
  } else {
    ok = true;
    teste = { excerto: T.semTeste };
  }
  teste.ms = Date.now() - inicioTeste;
  const max = plano.config?.max_tentativas ?? 3;
  st.estado = ok ? 'verde' : (st.tentativa || 0) >= max ? 'falhou' : 'vermelho';
  st.fim = new Date().toISOString();
  st.teste = teste;
  gravarEstado(c, st);
  return st;
}

export async function avaliarVarias(projeto, plano, tarefas, paralelo = 4) {
  const fila = [...tarefas];
  const res = [];
  const workers = Array.from({ length: Math.min(paralelo, fila.length) }, async () => {
    while (fila.length) res.push(await avaliar(projeto, plano, fila.shift()));
  });
  await Promise.all(workers);
  return res;
}

const COM_VALOR = new Set(['--project', '--plan', '--agent']);

function args(argv) {
  const o = { projeto: opt(argv, '--project', process.cwd()), plano: opt(argv, '--plan'), ids: [], todos: flag(argv, '--all'), resumo: flag(argv, '--summary'), agente: opt(argv, '--agent') };
  for (let i = 0; i < argv.length; i++) {
    const a = canonical(argv[i]);
    if (COM_VALOR.has(a)) i++;
    else if (!(a in ALIASES)) o.ids.push(argv[i]);
  }
  const ponteiro = lerPonteiro(caminhos(o.projeto));
  o.plano ||= ponteiro.plan || ponteiro.plano || resolverNoProjeto(o.projeto, 'plan.json');
  return o;
}

// English names.
export const summarizeOutput = resumirSaida;
export const grade = avaliar;
export const gradeMany = avaliarVarias;

if (isMain(import.meta.url)) {
  const o = args(process.argv.slice(2));
  const plano = lerPlano(o.plano);
  const c = caminhos(o.projeto);
  if (!o.resumo) {
    const alvo = o.todos ? plano.tarefas : plano.tarefas.filter((t) => o.ids.includes(t.id));
    if (!alvo.length) {
      console.error(textos(TEXTOS).uso);
      process.exit(2);
    }
    if (o.agente) {
      for (const t of alvo) await avaliar(o.projeto, plano, t, { soAgente: o.agente });
      process.exit(0);
    }
    await avaliarVarias(o.projeto, plano, alvo);
  }
  const f = fotografia(c, plano);
  console.log(tabelaTexto(f));
}
