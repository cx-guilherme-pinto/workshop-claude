#!/usr/bin/env node
// Avaliador unico do enxame: corre o teste de cada tarefa e grava o resultado oficial
// (verde/vermelho) em .workshop/status/<id>.json.
//
//   node grade.mjs [--projeto <dir>] [--plano <plan.json>] <id> [<id> ...]
//   node grade.mjs --todos          avalia todas as tarefas
//   node grade.mjs --resumo         so mostra o resumo, sem avaliar
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { caminhos, garantirPastas, lerPlano, lerEstado, gravarEstado, lerJson, resolverNoProjeto, fotografia } from './lib/estado.mjs';
import { tabelaTexto } from './lib/tabela.mjs';

const LIMITE_SAIDA = 1500;

function correr(cmd, { cwd, timeoutS, env }) {
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
    const p = spawn(argv[0], argv.slice(1), opts);
    let out = '';
    const add = (b) => {
      out += b.toString();
      if (out.length > 200000) out = out.slice(-200000);
    };
    p.stdout.on('data', add);
    p.stderr.on('data', add);
    const timer = setTimeout(() => {
      out += `\n[tempo esgotado: ${timeoutS}s]`;
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

// Extrai contagens e as linhas relevantes da saida do node --test.
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

export async function avaliar(projeto, plano, tarefa, { soAgente = null } = {}) {
  const c = caminhos(projeto);
  garantirPastas(c);
  const st = lerEstado(c, tarefa.id);
  // Chamado pelo hook: so avalia se a tarefa ainda estiver "em curso" com este mesmo agente
  // (evita sobrepor uma nova tentativa ja lancada pelo next-wave).
  if (soAgente && (st.estado !== 'em_curso' || st.agente !== soAgente)) return st;
  const inicioTeste = Date.now();
  let ok = false;
  let teste = {};
  if (Array.isArray(tarefa.teste)) {
    const r = await correr(tarefa.teste, { cwd: projeto, timeoutS: tarefa.timeout_s || (tarefa.teste.length <= 2 ? 600 : 120) });
    const s = resumirSaida(r.out);
    ok = r.code === 0 && s.falhados === 0;
    teste = { comando: tarefa.teste.join(' '), codigo: r.code, ...s };
  } else if (tarefa.teste && tarefa.teste.ficheiro_json) {
    const f = resolverNoProjeto(projeto, tarefa.teste.ficheiro_json);
    const j = existsSync(f) ? lerJson(f) : null;
    const valor = j?.[tarefa.teste.campo];
    ok = valor !== undefined && valor !== null && valor !== '';
    teste = { ficheiro: tarefa.teste.ficheiro_json, valor: valor ?? null, excerto: ok ? '' : `falta ${tarefa.teste.ficheiro_json} com o campo "${tarefa.teste.campo}"` };
  } else {
    ok = true;
    teste = { excerto: 'sem teste definido' };
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

function args(argv) {
  const o = { projeto: process.cwd(), plano: null, ids: [], todos: false, resumo: false, agente: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--projeto') o.projeto = argv[++i];
    else if (a === '--plano') o.plano = argv[++i];
    else if (a === '--agente') o.agente = argv[++i];
    else if (a === '--todos') o.todos = true;
    else if (a === '--resumo') o.resumo = true;
    else o.ids.push(a);
  }
  const ponteiro = lerJson(caminhos(o.projeto).ponteiro, {});
  o.plano ||= ponteiro.plano || resolverNoProjeto(o.projeto, 'plan.json');
  return o;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const o = args(process.argv.slice(2));
  const plano = lerPlano(o.plano);
  const c = caminhos(o.projeto);
  if (!o.resumo) {
    const alvo = o.todos ? plano.tarefas : plano.tarefas.filter((t) => o.ids.includes(t.id));
    if (!alvo.length) {
      console.error('Indica os ids das tarefas, --todos ou --resumo.');
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
