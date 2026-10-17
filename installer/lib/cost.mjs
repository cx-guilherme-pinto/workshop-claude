// Custo de uma chamada "claude -p --output-format json" calculado pelos tokens de modelUsage
// e pelo pricing.json do kit (nao pelo total_cost_usd: ver DECISIONS D-13).
// A mesma conta existe em bash/JXA (setup-mac.sh, WS_JS_CUSTO) e em PowerShell (Get-WsCusto);
// os tres sao testados com tools/test/cost-cases.json.
//
//   node installer/lib/cost.mjs <resultado.json> <pricing.json>   ->  linhas "chave<TAB>valor"
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isMain as ehPrincipal } from './is-main.mjs';
import { normalizePricing } from '../../hooks/lib/cost.mjs';

export function resolveModelo(id, pricing) {
  if (!id) return null;
  pricing = normalizePricing(pricing);
  const m = String(id).toLowerCase().replace(/\[.*\]$/, '');
  if (pricing.aliases && pricing.aliases[m]) return pricing.aliases[m];
  const keys = Object.keys(pricing.models).sort((a, b) => b.length - a.length);
  for (const k of keys) if (m === k || m.startsWith(k + '-') || m.startsWith(k + '@')) return k;
  return null;
}

// Devolve { usd (null se algum modelo for desconhecido), porModelo, desconhecidos[] }.
export function custoDeResultado(resultado, pricing) {
  pricing = normalizePricing(pricing);
  const mu = (resultado && resultado.modelUsage) || {};
  let total = 0;
  const porModelo = {};
  const desconhecidos = [];
  for (const id of Object.keys(mu)) {
    const u = mu[id] || {};
    const k = resolveModelo(id, pricing);
    if (!k) {
      desconhecidos.push(id);
      continue;
    }
    let p = pricing.models[k];
    const input = u.inputTokens || 0;
    const cacheRead = u.cacheReadInputTokens || 0;
    const cacheWrite = u.cacheCreationInputTokens || 0;
    const output = u.outputTokens || 0;
    if (p.long_prompt && input + cacheRead + cacheWrite > p.long_prompt.above_tokens) p = p.long_prompt;
    const usd = (input * p.input + output * p.output + cacheWrite * p.cache_write_5m + cacheRead * p.cache_read) / 1e6;
    porModelo[k] = (porModelo[k] || 0) + usd;
    total += usd;
  }
  return { usd: desconhecidos.length ? null : total, porModelo, desconhecidos };
}

// US$ 0.0012 (ponto decimal, como o setup em ingles: D-20; 4 casas abaixo de 1 centimo, 2 casas acima)
export function formatUsd(v) {
  if (v === null || v === undefined || Number.isNaN(v)) return 'US$ ?';
  const casas = v < 0.01 ? 4 : 2;
  return 'US$ ' + v.toFixed(casas);
}

const isMain = ehPrincipal(import.meta.url);
if (isMain) {
  try {
    const r = JSON.parse(readFileSync(process.argv[2], 'utf8'));
    const pricing = JSON.parse(readFileSync(process.argv[3], 'utf8'));
    const c = custoDeResultado(r, pricing);
    process.stdout.write(`usd\t${c.usd === null ? '' : c.usd}\n`);
    process.stdout.write(`usd_texto\t${formatUsd(c.usd)}\n`);
    for (const d of c.desconhecidos) process.stdout.write(`desconhecido\t${d}\n`);
  } catch (e) {
    process.stdout.write(`usd\t\nusd_texto\tUS$ ?\nerro\t${e.message}\n`);
  }
}
