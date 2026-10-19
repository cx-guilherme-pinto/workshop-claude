#!/usr/bin/env node
// Calibra orchestrator/profiles.json (a estimativa que o /demo-plan mostra no slide do plano) com os tokens reais
// medidos no benchmark (benchmark/runs/*/arena/.workshop/usage.jsonl): media por tipo de agente e, para a sessao
// principal, o total da sessao dividido pelos mesmos "lotes" que orchestrator/estimate.mjs conta para esse plano
// (assim a estimativa da sessao principal reproduz a media medida, com as repeticoes e os --retry incluidos).
//
//   node benchmark/calibrar.mjs [--only <texto>] [--all] [--margin 0.15] [--dry-run]
//   --only: so as execucoes cujo nome contem o texto (ex.: --only day-pt, --only 20261020)
//   por defeito: so as execucoes da versao atual do kit (metricas.json com "versao" = WORKSHOP_VERSION do repos.conf);
//   --all: todas as que tem usage.jsonl (como antes)
//   --margin: muda a margem de seguranca (0.15 = 15%)
//   --dry-run: mostra os perfis novos e a estimativa contra o medido, sem escrever
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { estimar } from '../orchestrator/estimate.mjs';

const KIT = join(dirname(fileURLToPath(import.meta.url)), '..');
const a = process.argv.slice(2);
const opt = (k) => (a.includes(k) ? a[a.indexOf(k) + 1] : undefined);
const runs = opt('--runs-dir') || join(KIT, 'benchmark', 'runs');
const ONLY = opt('--only');
const ALL = a.includes('--all');
const DRY = a.includes('--dry-run');
const MARGEM = opt('--margin') !== undefined ? Number(opt('--margin')) : undefined;
const VERSAO = /^WORKSHOP_VERSION=(.*)$/m.exec(readFileSync(join(KIT, 'repos.conf'), 'utf8'))?.[1]?.trim();
const lerJson = (f, d = {}) => {
  try {
    return JSON.parse(readFileSync(f, 'utf8'));
  } catch {
    return d;
  }
};

const soma = {};
const add = (tipo, t, pedidos) => {
  const s = (soma[tipo] ||= { n: 0, pedidos: 0, input: 0, output: 0, cache_write_5m: 0, cache_write_1h: 0, cache_read: 0 });
  s.n++;
  s.pedidos += pedidos || 0;
  for (const k of ['input', 'output', 'cache_write_5m', 'cache_write_1h', 'cache_read']) s[k] += t?.[k] || 0;
};
const usadas = [];
const medidos = { participant: [], presenter: [] };
const planos = { participant: null, presenter: null };
for (const r of existsSync(runs) ? readdirSync(runs).sort() : []) {
  const f = join(runs, r, 'arena', '.workshop', 'usage.jsonl');
  if (!existsSync(f) || r.endsWith('-dry-run')) continue;
  if (ONLY && !r.includes(ONLY)) continue;
  const met = lerJson(join(runs, r, 'metricas.json'), {});
  if (!ALL && !ONLY && met.versao !== VERSAO) continue;
  const modo = /apresentador|presenter/.test(`${r} ${met.modo || ''}`) ? 'presenter' : 'participant';
  const linhas = readFileSync(f, 'utf8').split('\n').filter(Boolean).flatMap((l) => {
    try {
      return [JSON.parse(l)];
    } catch {
      return [];
    }
  });
  const plano = lerJson(join(runs, r, 'arena', 'plan.json'), null);
  // Os lotes que a estimativa conta para este plano (o mesmo calculo de estimate.mjs).
  let lotes;
  try {
    lotes = plano ? estimar(plano).lotes : undefined;
  } catch {
    lotes = undefined;
  }
  if (!lotes) lotes = (lerJson(join(runs, r, 'arena', '.workshop', 'run.json'), {}).lote || 1) + 5;
  usadas.push(r);
  if (plano) planos[modo] ||= plano;
  const p1 = Number(met.p1_custo || (met.escopo ? '' : met.custo_total));
  if (Number.isFinite(p1) && p1 > 0) medidos[modo].push(p1);
  const porAgente = new Map();
  const ultimaSessao = new Map();
  for (const x of linhas) {
    if (x.tipo === 'subagente') porAgente.set(x.agent_id, x);
    else if (x.tipo === 'principal') ultimaSessao.set(x.sessao, x);
  }
  for (const x of porAgente.values()) add(x.agent_type === 'memoria-extrator' ? 'memory-extractor' : x.agent_type, x.tokens, x.pedidos);
  // Uma sessao por execucao (--resume): os tokens da sessao inteira, divididos pelos lotes da estimativa.
  const sessao = {};
  let pedidos = 0;
  for (const x of ultimaSessao.values()) {
    for (const [k, v] of Object.entries(x.tokens || {})) sessao[k] = (sessao[k] || 0) + v;
    pedidos += x.pedidos || 0;
  }
  if (ultimaSessao.size) {
    const porLote = Object.fromEntries(Object.entries(sessao).map(([k, v]) => [k, v / lotes]));
    add(`orchestrator_${modo}`, porLote, pedidos / lotes);
    if (modo === 'participant') add('orchestrator', porLote, pedidos / lotes);
  }
}
if (!usadas.length) {
  console.error(`Sem execucoes para calibrar em ${runs}${ONLY ? ` com "${ONLY}"` : ALL ? '' : ` da versao ${VERSAO} (use --all ou --only)`}.`);
  process.exit(1);
}
const perfis = {};
for (const [tipo, s] of Object.entries(soma)) {
  perfis[tipo] = Object.fromEntries([['requests', 'pedidos'], ...['input', 'cache_write_5m', 'cache_write_1h', 'cache_read', 'output'].map((k) => [k, k])].map(([k, de]) => [k, Math.round(s[de] / s.n)]));
}
const p = join(KIT, 'orchestrator', 'profiles.json');
const atual = JSON.parse(readFileSync(p, 'utf8'));
const novo = {
  ...atual,
  calibrated_on: new Date().toISOString().slice(0, 10),
  calibration: `${usadas.length} benchmark runs (${[...new Set(usadas.map((r) => (/presenter|apresentador/.test(r) ? 'presenter' : 'participant')))].join(' and ')}${VERSAO && !ALL ? `, kit ${VERSAO}` : ''}): ${usadas[0]} to ${usadas[usadas.length - 1]}`,
  profiles: { ...atual.profiles, ...perfis },
  ...(MARGEM !== undefined && Number.isFinite(MARGEM) ? { margin: MARGEM } : {}),
};

// A estimativa antes (perfis atuais) e depois (perfis novos), contra o custo medido do Projeto 1.
const usd = (v) => (Number.isFinite(v) ? `US$ ${v.toFixed(2)}` : '—');
for (const modo of ['participant', 'presenter']) {
  if (!planos[modo]) continue;
  const antes = estimar(planos[modo], { perfis: atual.profiles, margem: atual.margin ?? 0, l: 'en' }).total;
  const depois = estimar(planos[modo], { perfis: novo.profiles, margem: novo.margin ?? 0, l: 'en' }).total;
  const m = medidos[modo];
  const media = m.length ? m.reduce((s, x) => s + x, 0) / m.length : NaN;
  console.error(`${modo}: estimate ${usd(antes)} -> ${usd(depois)} (margin ${Math.round((novo.margin ?? 0) * 100)}%) · measured Project 1 average ${usd(media)} over ${m.length} run(s)`);
}
console.error(`${usadas.length} run(s): ${usadas.join(', ')}`);
if (DRY) {
  console.log(JSON.stringify(perfis, null, 1));
  console.error('dry-run: orchestrator/profiles.json not written');
} else {
  writeFileSync(p, JSON.stringify(novo, null, 2) + '\n');
  console.log(JSON.stringify(novo.profiles, null, 1));
  console.error('orchestrator/profiles.json written. The plan slide reads the estimate from slides/dados.json (ESTIMATIVA, e.g. "US$ 3,98"): update it with the participant estimate above and rebuild the slides (node slides/build.mjs and --lingua en).');
}
