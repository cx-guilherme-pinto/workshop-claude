#!/usr/bin/env node
// Calibra orquestrador/perfis.json com os tokens reais medidos no benchmark (benchmark/runs/*/arena/.workshop/usage.jsonl).
// Media por tipo de agente; para a sessao principal, media por lote do orquestrador.
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const KIT = join(dirname(fileURLToPath(import.meta.url)), '..');
const runs = join(KIT, 'benchmark', 'runs');
const soma = {};
const add = (tipo, t, pedidos) => {
  const s = (soma[tipo] ||= { n: 0, pedidos: 0, input: 0, output: 0, cache_write_5m: 0, cache_write_1h: 0, cache_read: 0 });
  s.n++;
  s.pedidos += pedidos || 0;
  for (const k of ['input', 'output', 'cache_write_5m', 'cache_write_1h', 'cache_read']) s[k] += t?.[k] || 0;
};
let nRuns = 0;
for (const r of existsSync(runs) ? readdirSync(runs) : []) {
  const f = join(runs, r, 'arena', '.workshop', 'usage.jsonl');
  const run = join(runs, r, 'arena', '.workshop', 'run.json');
  if (!existsSync(f)) continue;
  const modo = r.includes('apresentador') ? 'apresentador' : 'participante';
  nRuns++;
  const linhas = readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const porAgente = new Map();
  const ultimaSessao = new Map();
  for (const x of linhas) {
    if (x.tipo === 'subagente') porAgente.set(x.agent_id, x);
    else if (x.tipo === 'principal') ultimaSessao.set(x.sessao, x);
  }
  for (const x of porAgente.values()) add(x.agent_type, x.tokens, x.pedidos);
  const lotes = existsSync(run) ? JSON.parse(readFileSync(run, 'utf8')).lote || 1 : 1;
  for (const x of ultimaSessao.values()) {
    const porLote = Object.fromEntries(Object.entries(x.tokens).map(([k, v]) => [k, v / (lotes + 5)]));
    add(`orquestrador_${modo}`, porLote, x.pedidos / (lotes + 5));
    if (modo === 'participante') add('orquestrador', porLote, x.pedidos / (lotes + 5));
  }
}
const perfis = {};
for (const [tipo, s] of Object.entries(soma)) {
  perfis[tipo] = Object.fromEntries(['pedidos', 'input', 'cache_write_5m', 'cache_write_1h', 'cache_read', 'output'].map((k) => [k, Math.round(s[k] / s.n)]));
}
const p = join(KIT, 'orquestrador', 'perfis.json');
const atual = JSON.parse(readFileSync(p, 'utf8'));
const novo = { ...atual, calibrado_em: new Date().toISOString().slice(0, 10), calibracao: `${nRuns} execuções do benchmark (participante e apresentador)`, perfis: { ...atual.perfis, ...perfis } };
writeFileSync(p, JSON.stringify(novo, null, 2) + '\n');
console.log(JSON.stringify(novo.perfis, null, 1));
