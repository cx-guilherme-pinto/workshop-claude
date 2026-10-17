#!/usr/bin/env node
// Cost estimate BEFORE running: number of agents per type x token profile x model price.
//   node estimate.mjs [--plan plan.json]   (prints a table; --json for JSON)
// The texts (table and the names of the extra rows) are in the kit language; `l` is optional (tests).
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadPricing, requestCost, modelName } from '../hooks/lib/cost.mjs';
import { lerPlano, normalizarPlano, resolverNoProjeto } from './lib/state.mjs';
import { usd, nomeModo } from './lib/table.mjs';
import { isMain } from './lib/is-main.mjs';
import { opt, flag } from './lib/args.mjs';
import { lingua, textos } from '../hooks/lib/language.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));

// Token profiles per agent type (orchestrator/profiles.json, calibrated by the benchmark).
const PERFIS = JSON.parse(readFileSync(join(AQUI, 'profiles.json'), 'utf8'));
// Agent types whose profile changed name.
const PERFIL_ANTIGO = { 'memoria-extrator': 'memory-extractor' };

const TEXTOS = {
  pt: {
    principal: 'sessão principal',
    margem: (p) => `margem de segurança (${p}%)`,
    colunas: ['| tipo | modelo | agentes | custo por agente | subtotal |', '|---|---|---|---|---|'],
    repeticoes: (n) => ` (+${n} repetições)`,
    total: (v) => `| **total estimado** | | | | **${v}** |`,
    alvo: (a, t) => `Alvo: ${a} · teto: ${t}.`,
    dentro: 'Dentro do alvo.',
    acimaAlvo: 'Acima do alvo, abaixo do teto.',
    acimaTeto: 'Acima do teto: rever o plano.',
    nunca: 'A execução nunca é interrompida por custo.',
  },
  en: {
    principal: 'main session',
    margem: (p) => `safety margin (${p}%)`,
    colunas: ['| type | model | agents | cost per agent | subtotal |', '|---|---|---|---|---|'],
    repeticoes: (n) => ` (+${n} ${n === 1 ? 'retry' : 'retries'})`,
    total: (v) => `| **estimated total** | | | | **${v}** |`,
    alvo: (a, t) => `Target: ${a} · cap: ${t}.`,
    dentro: 'Within the target.',
    acimaAlvo: 'Above the target, below the cap.',
    acimaTeto: 'Above the cap: review the plan.',
    nunca: 'The run is never stopped because of cost.',
  },
};

export function estimar(plano, { pricing = loadPricing(), perfis = PERFIS.profiles, margem = PERFIS.margin ?? 0, modeloPrincipal, l = lingua() } = {}) {
  const T = textos(TEXTOS, l);
  plano = normalizarPlano(plano);
  const perfil = (tipo) => perfis[tipo] || perfis[PERFIL_ANTIGO[tipo]] || perfis.worker;
  const porTipo = new Map();
  for (const t of plano.tarefas) porTipo.set(t.agente, (porTipo.get(t.agente) || 0) + 1);
  // Margin for retries: 10% of the card tasks are retried once.
  const linhas = [];
  let total = 0;
  const custoPerfil = (perfil, modelo) => {
    // Spreads the tokens over the requests, to respect the long-prompt tier.
    const n = Math.max(1, perfil.requests ?? perfil.pedidos);
    const porPedido = {
      input: perfil.input / n,
      output: perfil.output / n,
      cache_write_5m: perfil.cache_write_5m / n,
      cache_write_1h: perfil.cache_write_1h / n,
      cache_read: perfil.cache_read / n,
    };
    const c = requestCost(porPedido, modelo, pricing).usd;
    return c === null ? null : c * n;
  };
  for (const [tipo, n] of porTipo) {
    const modelo = plano.agentes?.[tipo]?.modelo;
    const unit = custoPerfil(perfil(tipo), modelo);
    const repet = plano.tarefas.some((t) => t.agente === tipo && t.grupo_tipo === 'cartao') ? Math.ceil(n * 0.1) : 0;
    const sub = unit === null ? null : unit * (n + repet);
    if (sub !== null) total += sub;
    linhas.push({ tipo, modelo, nome: modelName(modelo, pricing), agentes: n, repeticoes: repet, custo_unit: unit, custo: sub });
  }
  // Support agents that run outside the plan (e.g. the planner in /demo-plan, the memory extractor in /demo-cost).
  for (const tipo of plano.apoio_estimativa || []) {
    const modelo = plano.agentes?.[tipo]?.modelo || 'claude-haiku-5-5';
    const unit = custoPerfil(perfil(tipo), modelo);
    if (unit !== null) total += unit;
    linhas.push({ tipo, modelo, nome: modelName(modelo, pricing), agentes: 1, repeticoes: 0, custo_unit: unit, custo: unit });
  }
  // Main session (the orchestrator): one block per batch, plus the turns of the other skills.
  // There is one profile per mode (the context grows with the number of results), calibrated by the benchmark.
  const maxPar = plano.config?.max_paralelo || 8;
  const lotes = Math.ceil(plano.tarefas.length / maxPar) + 5;
  const mp = modeloPrincipal || plano.modelo_principal || 'claude-sonnet-5-5';
  const unitOrq = custoPerfil(perfis[`orchestrator_${nomeModo(plano.modo, 'en')}`] || perfis.orchestrator, mp);
  const orq = unitOrq * lotes;
  total += orq;
  linhas.push({ tipo: T.principal, modelo: mp, nome: modelName(mp, pricing), agentes: 1, repeticoes: 0, custo_unit: unitOrq, custo: orq, lotes });
  if (margem > 0) {
    const extra = total * margem;
    linhas.push({ tipo: T.margem(Math.round(margem * 100)), modelo: null, nome: '—', agentes: '—', repeticoes: 0, custo_unit: null, custo: extra });
    total += extra;
  }
  const alvo = pricing.budget?.target_usd ?? 5;
  const teto = pricing.budget?.cap_usd ?? 10;
  return { linhas, total, alvo, teto, lotes };
}

export function tabelaEstimativa(e, l = lingua()) {
  const T = textos(TEXTOS, l);
  const u = (v) => usd(v, l);
  const L = [...T.colunas];
  for (const x of e.linhas) L.push(`| ${x.tipo} | ${x.nome} | ${x.agentes}${x.repeticoes ? T.repeticoes(x.repeticoes) : ''} | ${u(x.custo_unit)} | ${u(x.custo)} |`);
  L.push(T.total(u(e.total)));
  L.push('', `${T.alvo(u(e.alvo), u(e.teto))} ${e.total <= e.alvo ? T.dentro : e.total <= e.teto ? T.acimaAlvo : T.acimaTeto} ${T.nunca}`);
  return L.join('\n');
}

// English names.
export const estimate = estimar;
export const estimateTable = tabelaEstimativa;

if (isMain(import.meta.url)) {
  const a = process.argv.slice(2);
  const caminho = opt(a, '--plan') || resolverNoProjeto(process.cwd(), 'plan.json');
  const e = estimar(lerPlano(caminho));
  console.log(flag(a, '--json') ? JSON.stringify(e, null, 2) : tabelaEstimativa(e));
}
