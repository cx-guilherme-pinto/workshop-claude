#!/usr/bin/env node
// Estimativa de custo ANTES de executar: n.o de agentes por tipo x perfil de tokens x preco do modelo.
//   node estimate.mjs [--plano plan.json]   (imprime tabela; --json para JSON)
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadPricing, requestCost, modelName } from '../hooks/lib/cost.mjs';
import { lerPlano, resolverNoProjeto } from './lib/estado.mjs';
import { usd } from './lib/tabela.mjs';
import { ehPrincipal } from './lib/principal.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));

export function estimar(plano, { pricing = loadPricing(), perfis = JSON.parse(readFileSync(join(AQUI, 'perfis.json'), 'utf8')).perfis, modeloPrincipal } = {}) {
  const porTipo = new Map();
  for (const t of plano.tarefas) porTipo.set(t.agente, (porTipo.get(t.agente) || 0) + 1);
  // Margem para repeticoes: 10% das tarefas de cartao repetem uma vez.
  const linhas = [];
  let total = 0;
  const custoPerfil = (perfil, modelo) => {
    // Distribui os tokens pelos pedidos para respeitar o escalao de prompt longo.
    const n = Math.max(1, perfil.pedidos);
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
    const perfil = perfis[tipo] || perfis.worker;
    const unit = custoPerfil(perfil, modelo);
    const repet = plano.tarefas.some((t) => t.agente === tipo && t.grupo_tipo === 'cartao') ? Math.ceil(n * 0.1) : 0;
    const sub = unit === null ? null : unit * (n + repet);
    if (sub !== null) total += sub;
    linhas.push({ tipo, modelo, nome: modelName(modelo, pricing), agentes: n, repeticoes: repet, custo_unit: unit, custo: sub });
  }
  // Sessao principal (orquestrador): um bloco por lote.
  const maxPar = plano.config?.max_paralelo || 8;
  const lotes = Math.ceil(plano.tarefas.length / maxPar) + 3;
  const mp = modeloPrincipal || plano.modelo_principal || 'claude-sonnet-5-5';
  const unitOrq = custoPerfil(perfis.orquestrador, mp);
  const orq = unitOrq * lotes;
  total += orq;
  linhas.push({ tipo: 'sessão principal', modelo: mp, nome: modelName(mp, pricing), agentes: 1, repeticoes: 0, custo_unit: unitOrq, custo: orq, lotes });
  const alvo = pricing.orcamento?.alvo_usd ?? 5;
  const teto = pricing.orcamento?.teto_usd ?? 10;
  return { linhas, total, alvo, teto, lotes };
}

export function tabelaEstimativa(e) {
  const L = ['| tipo | modelo | agentes | custo por agente | subtotal |', '|---|---|---|---|---|'];
  for (const l of e.linhas) L.push(`| ${l.tipo} | ${l.nome} | ${l.agentes}${l.repeticoes ? ` (+${l.repeticoes} repetições)` : ''} | ${usd(l.custo_unit)} | ${usd(l.custo)} |`);
  L.push(`| **total estimado** | | | | **${usd(e.total)}** |`);
  L.push('', `Alvo: ${usd(e.alvo)} · teto: ${usd(e.teto)}. ${e.total <= e.alvo ? 'Dentro do alvo.' : e.total <= e.teto ? 'Acima do alvo, abaixo do teto.' : 'Acima do teto: rever o plano.'} A execução nunca é interrompida por custo.`);
  return L.join('\n');
}

if (ehPrincipal(import.meta.url)) {
  const i = process.argv.indexOf('--plano');
  const caminho = i > 0 ? process.argv[i + 1] : resolverNoProjeto(process.cwd(), 'plan.json');
  const e = estimar(lerPlano(caminho));
  console.log(process.argv.includes('--json') ? JSON.stringify(e, null, 2) : tabelaEstimativa(e));
}
