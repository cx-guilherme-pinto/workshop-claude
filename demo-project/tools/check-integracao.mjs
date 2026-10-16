#!/usr/bin/env node
// Verificacao da tarefa "integracao": corre node --test em todos os testes do projeto,
// EXCETO os das tarefas de cartao (e de lib) que o orquestrador marcou como "falhou" em
// .workshop/status/<id>.json. Essas ja esgotaram as tentativas e o integrador nao as refaz.
// Sai com 0 so se tudo o resto passar.
//
//   node tools/check-integracao.mjs           corre a suite
//   node tools/check-integracao.mjs --lista   so mostra que ficheiros entram e quais ficam de fora
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

// Textos na lingua da Arena (tools/workshop/lingua.json); fora de uma Arena montada, em portugues.
const { textos } = await import('./workshop/hooks/lib/lingua.mjs').catch(() => ({ textos: (d) => d.pt }));
const T = textos({
  pt: {
    foraDoPlano: (n) => `(${n} cartões fora do plano deste modo não entram.)`,
    integracao: (n) => `Integração: ${n} ficheiro(s) de teste.`,
    ficamDeFora: (lista) => `Ficam de fora (falharam de vez no swarm): ${lista}`,
    semTestes: 'Não há testes para correr.',
    verde: '\nIntegração verde: todos os testes passam.',
    vermelha: '\nIntegração vermelha: há testes a falhar (vê acima).',
  },
  en: {
    foraDoPlano: (n) => `(${n} cards outside the plan for this mode are left out.)`,
    integracao: (n) => `Integration: ${n} test file(s).`,
    ficamDeFora: (lista) => `Left out (failed for good in the swarm): ${lista}`,
    semTestes: 'No tests to run.',
    verde: '\nIntegration green: all tests pass.',
    vermelha: '\nIntegration red: some tests fail (see above).',
  },
});

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SO_LISTA = process.argv.includes('--lista');

const lerJson = (f) => {
  try {
    return JSON.parse(readFileSync(f, 'utf8'));
  } catch {
    return null;
  }
};
const rel = (p) => relative(ROOT, p).split(sep).join('/');

// Os mesmos padroes que "node --test" usa sem argumentos.
const PADROES = [/\.test\.[cm]?js$/, /-test\.[cm]?js$/, /_test\.[cm]?js$/, /(^|\/)test-[^/]*\.[cm]?js$/, /(^|\/)test\.[cm]?js$/, /(^|\/)test\/.*\.[cm]?js$/];

function descobrir(dir, out = []) {
  let nomes = [];
  try {
    nomes = readdirSync(dir);
  } catch {
    return out;
  }
  for (const n of nomes.sort()) {
    if (n === 'node_modules' || n.startsWith('.')) continue;
    const p = join(dir, n);
    let st;
    try {
      st = statSync(p);
    } catch {
      continue;
    }
    if (st.isDirectory()) descobrir(p, out);
    else if (PADROES.some((re) => re.test(rel(p)))) out.push(rel(p));
  }
  return out;
}

// Tarefas que falharam de vez: o ficheiro de teste delas fica de fora.
function excluidos() {
  const dir = join(ROOT, '.workshop', 'status');
  const plano = lerJson(join(ROOT, 'plan.json'));
  const porId = new Map(Array.isArray(plano?.tarefas) ? plano.tarefas.map((t) => [t.id, t]) : []);
  const fora = new Map(); // ficheiro -> id
  let nomes = [];
  try {
    nomes = readdirSync(dir).filter((n) => n.endsWith('.json'));
  } catch {
    return fora;
  }
  for (const n of nomes) {
    const st = lerJson(join(dir, n));
    if (st?.estado !== 'falhou') continue;
    const id = String(st.tarefa || n.slice(0, -5));
    const t = porId.get(id);
    if (t && !['cartao', 'lib'].includes(t.grupo_tipo)) continue; // paginas e app: o integrador corrige
    const testes = Array.isArray(t?.teste) ? t.teste.filter((a) => /\.[cm]?js$/.test(a)) : [];
    if (!testes.length && /^[a-z0-9][a-z0-9-]*$/.test(id)) testes.push(`cards/${id}/card.test.js`);
    for (const f of testes) if (existsSync(join(ROOT, f))) fora.set(f.split(sep).join('/'), id);
  }
  return fora;
}

// Cartoes que nao fazem parte do plano atual (ex.: os 85 do modo apresentador quando o plano
// e de participante) tambem ficam de fora: ninguem os vai construir nesta execucao.
function foraDoPlano() {
  const plano = lerJson(join(ROOT, 'plan.json'));
  if (!Array.isArray(plano?.tarefas)) return new Set();
  const noPlano = new Set(plano.tarefas.filter((t) => t.grupo_tipo === 'cartao').map((t) => t.id));
  const out = new Set();
  let ids = [];
  try {
    ids = readdirSync(join(ROOT, 'cards')).filter((n) => /^[a-z0-9][a-z0-9-]*$/.test(n));
  } catch {
    return out;
  }
  for (const id of ids) if (!noPlano.has(id)) out.add(`cards/${id}/card.test.js`);
  return out;
}

const todos = descobrir(ROOT);
const fora = excluidos();
const naoPlaneados = foraDoPlano();
const correr = todos.filter((f) => !fora.has(f) && !naoPlaneados.has(f));
if (naoPlaneados.size) console.log(T.foraDoPlano(naoPlaneados.size));

console.log(T.integracao(correr.length));
if (fora.size) {
  console.log(T.ficamDeFora([...fora].map(([f, id]) => `${f} (${id})`).join(', ')));
}
if (SO_LISTA) {
  for (const f of correr) console.log(`  ${f}`);
  process.exit(0);
}
if (!correr.length) {
  console.log(T.semTestes);
  process.exit(0);
}

const r = spawnSync(process.execPath, ['--test', '--test-timeout=20000', ...correr], { cwd: ROOT, stdio: 'inherit' });
const codigo = r.status ?? 1;
console.log(codigo === 0 ? T.verde : T.vermelha);
process.exit(codigo);
