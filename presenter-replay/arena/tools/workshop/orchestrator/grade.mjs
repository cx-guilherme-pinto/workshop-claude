#!/usr/bin/env node
// The swarm's single grader: runs each task's test and saves the official result
// (green/red) in .workshop/status/<id>.json.
//
//   node grade.mjs [--project <dir>] [--plan <plan.json>] <id> [<id> ...]
//   node grade.mjs --all            grades every task
//   node grade.mjs --summary        only shows the summary, without grading
// (--projeto, --plano, --todos and --resumo still work.)
import { spawn, spawnSync } from 'node:child_process';
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
    nenhumTeste: (f) => `${f} não correu nenhum dos testes da tarefa (ficheiro de teste esvaziado ou trocado, ou o código chamou process.exit): repõe-no com node tools/gen.mjs e não uses process.exit`,
    uso: 'Indica os ids das tarefas, --all ou --summary.',
  },
  en: {
    esgotado: (s) => `[timed out: ${s}s]`,
    falta: (f, campo) => `missing ${f} with the field "${campo}"`,
    semTeste: 'no test defined',
    nenhumTeste: (f) => `${f} ran none of the task's tests (test file emptied or replaced, or the code called process.exit): restore it with node tools/gen.mjs and do not call process.exit`,
    uso: 'Give the task ids, --all or --summary.',
  },
};

// The test runs in its own process group (Windows: its own tree), so a timeout or the end of grade kills
// everything it started: `node --test` runs each file in a child process, and killing only the runner left
// that child alive (a card that loops forever kept a CPU at 100% after grade had finished).
const WIN = process.platform === 'win32';
const vivos = new Set();
function matarArvore(p) {
  if (!p.pid) return;
  if (WIN) {
    try {
      spawnSync('taskkill', ['/T', '/F', '/PID', String(p.pid)], { stdio: 'ignore', windowsHide: true, timeout: 10000 });
    } catch {
      /* already gone */
    }
  } else {
    try {
      process.kill(-p.pid, 'SIGKILL');
    } catch {
      /* already gone */
    }
  }
}
let limpezaInstalada = false;
function limparAoSair() {
  if (limpezaInstalada) return;
  limpezaInstalada = true;
  process.on('exit', () => vivos.forEach(matarArvore));
  for (const s of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
    process.once(s, () => {
      vivos.forEach(matarArvore);
      process.kill(process.pid, s);
    });
  }
}

function correr(cmd, { cwd, timeoutS, env }) {
  return new Promise((done) => {
    let argv = [...cmd];
    let opts = { cwd, env: { ...process.env, ...env, FORCE_COLOR: '0', NO_COLOR: '1' }, detached: !WIN, windowsHide: true };
    // Run from inside another `node --test` (the kit's own tests), the child runner would report to that
    // parent instead of printing its results.
    delete opts.env.NODE_TEST_CONTEXT;
    if (argv[0] === 'node') {
      argv[0] = process.execPath;
      const i = argv.indexOf('--test');
      if (i >= 0 && !argv.some((a) => a.startsWith('--test-timeout'))) argv.splice(i + 1, 0, '--test-timeout=5000');
      // A test file that leaves a timer or a socket open would otherwise never end.
      if (i >= 0 && !argv.includes('--test-force-exit')) argv.splice(i + 1, 0, '--test-force-exit');
    } else {
      opts.shell = true;
    }
    limparAoSair();
    // With a shell, the arguments were always joined as they are; passing the joined line avoids Node's
    // DEP0190 warning (shown to the participant) without changing what runs.
    let p;
    try {
      p = opts.shell ? spawn(argv.join(' '), opts) : spawn(argv[0], argv.slice(1), opts);
    } catch (e) {
      done({ code: 1, out: String(e), esgotado: false });
      return;
    }
    vivos.add(p);
    let out = '';
    let esgotado = false;
    const add = (b) => {
      out += b.toString();
      if (out.length > 200000) out = out.slice(-200000);
    };
    p.stdout.on('data', add);
    p.stderr.on('data', add);
    const timer = setTimeout(() => {
      esgotado = true;
      matarArvore(p);
    }, timeoutS * 1000);
    p.on('close', (code) => {
      clearTimeout(timer);
      matarArvore(p); // whatever the test left running in its group
      vivos.delete(p);
      done({ code: code ?? 1, out, esgotado });
    });
    p.on('error', (e) => {
      clearTimeout(timer);
      vivos.delete(p);
      done({ code: 1, out: String(e), esgotado });
    });
  });
}

// The names of the tests that node --test reported (spec reporter: "✔ name (1ms)"; TAP, the default
// of Node 22 without a terminal: "ok 1 - name").
const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function testesCorridos(out) {
  const nomes = [];
  for (const linha of out.split('\n')) {
    const m = /^\s*(?:[✔✖﹣]\s+|(?:not )?ok \d+ - )(.+?)(?:\s+\(\d[\d.]*m?s\))?\s*(?:#.*)?$/.exec(linha);
    if (m) nomes.push(m[1].trim().replace(/\\/g, '/'));
  }
  return nomes;
}
// A node --test command that ran none of the task's own tests: the test file was emptied or replaced, or the
// code called process.exit() before the tests were registered (node then reports the file itself as one
// passing test). Returns the file to name in the message, or null.
export function semTestesProprios(tarefa, out, s) {
  const cmd = tarefa.teste;
  if (!Array.isArray(cmd) || cmd[0] !== 'node' || !cmd.includes('--test')) return null;
  const ficheiros = cmd.filter((a) => /\.[cm]?[jt]s$/.test(a)).map((f) => f.replace(/\\/g, '/'));
  const nomes = testesCorridos(out);
  const primeiro = ficheiros[0] || cmd.join(' ');
  const ficheiroComoTeste = ficheiros.find((f) => nomes.some((n) => n === f || n.endsWith(`/${f}`) || new RegExp(`(^|/)${esc(f.replace(/^\.\//, ''))}$`).test(n)));
  if (ficheiroComoTeste) return ficheiroComoTeste;
  if (s.passados + s.falhados === 0) return primeiro;
  if (tarefa.grupo_tipo === 'cartao' && !nomes.some((n) => n.startsWith(`${tarefa.id}: `))) return primeiro;
  return null;
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
  // A card broken on purpose (the plan flags it: "spec_gap", from specs/cards.json "spec_gaps"): its spec does not
  // decide the answer and agents do not change specs, so another attempt would only guess again. Its first failed
  // attempt fails for good (motivo "spec"); a person decides the answer in the spec and runs --retry, whose attempt
  // is graded the same way. Plans without the flag fall back to the test message (SPEC_GAP).
  let specGap = false;
  if (Array.isArray(tarefa.teste)) {
    // A card's test takes well under a second: 30 s is plenty and keeps a card that never ends from
    // holding the whole wave for 2 minutes.
    const timeoutS = tarefa.timeout_s || (tarefa.grupo_tipo === 'cartao' ? 30 : tarefa.teste.length <= 2 ? 600 : 120);
    const r = await correr(tarefa.teste, { cwd: projeto, timeoutS });
    const s = resumirSaida(r.out);
    const vazio = r.code === 0 && !r.esgotado ? semTestesProprios(tarefa, r.out, s) : null;
    ok = r.code === 0 && !r.esgotado && s.falhados === 0 && !vazio;
    if (vazio) s.excerto = [T.nenhumTeste(vazio), s.excerto].filter(Boolean).join('\n');
    if (r.esgotado) s.excerto = [T.esgotado(timeoutS), s.excerto].filter(Boolean).join('\n');
    teste = { comando: tarefa.teste.join(' '), codigo: r.code, ...(r.esgotado ? { esgotado: true } : {}), ...s };
    specGap = !ok && (tarefa.spec_gap === true || SPEC_GAP.test(r.out || ''));
  } else if (tarefa.teste && tarefa.teste.ficheiro_json) {
    const { ficheiro, valor } = lerCampoJson(projeto, tarefa.teste.ficheiro_json, tarefa.teste.campo);
    ok = valor !== undefined && valor !== null && valor !== '';
    teste = { ficheiro, valor: valor ?? null, excerto: ok ? '' : T.falta(tarefa.teste.ficheiro_json, tarefa.teste.campo) };
  } else {
    ok = true;
    teste = { excerto: T.semTeste };
  }
  teste.ms = Date.now() - inicioTeste;
  // Someone else (next-wave, the SubagentStop hook, another grade) changed this task during the test:
  // keep their state instead of overwriting a newer attempt with this stale result.
  const atual = lerEstado(c, tarefa.id);
  if (atual.estado !== st.estado || atual.agente !== st.agente || atual.tentativa !== st.tentativa || atual.lote !== st.lote) return atual;
  const max = plano.config?.max_tentativas ?? 3;
  st.estado = ok ? 'verde' : specGap || (st.tentativa || 0) >= max ? 'falhou' : 'vermelho';
  if (specGap) st.motivo = 'spec';
  else delete st.motivo;
  st.fim = new Date().toISOString();
  st.teste = teste;
  gravarEstado(c, st);
  return st;
}

// The messages of a broken card's test (tools/gen.mjs, pt and en; the older ones too), for plans without the flag.
const SPEC_GAP = /spec\.md does not say |spec\.md não diz |is missing a detail the test checks|um detalhe que o teste verifica/;

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
  try {
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
  } catch (e) {
    console.error(`ERROR: ${e.message}`);
    process.exit(1);
  }
}
