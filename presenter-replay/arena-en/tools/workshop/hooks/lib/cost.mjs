// Cost from the API "usage" and pricing.json.
// No dependencies. Used by the hooks, the statusline and the reports.
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { lingua } from './language.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

// pricing.json has English keys (models, name, long_prompt.above_tokens, budget.target_usd/cap_usd,
// checked_on). Older copies used Portuguese keys (modelos, nome, prompt_longo.acima_de_tokens,
// orcamento.alvo_usd/teto_usd, consultado_em): they are turned into the English shape here.
export function normalizePricing(p) {
  if (!p || typeof p !== 'object') return p;
  if (p.models && !p.modelos) return p;
  const lp = (m) => {
    const l = m.long_prompt ?? m.prompt_longo;
    if (!l) return undefined;
    const { acima_de_tokens, ...rest } = l;
    return { ...rest, above_tokens: l.above_tokens ?? acima_de_tokens };
  };
  const models = Object.fromEntries(
    Object.entries(p.models ?? p.modelos ?? {}).map(([k, m]) => {
      const { nome, prompt_longo, ...rest } = m;
      const out = { ...rest, name: m.name ?? nome };
      const l = lp(m);
      if (l) out.long_prompt = l;
      return [k, out];
    }),
  );
  const b = p.budget ?? p.orcamento ?? {};
  return {
    source: p.source ?? p.fonte,
    checked_on: p.checked_on ?? p.consultado_em,
    currency: p.currency ?? p.moeda,
    unit: p.unit ?? p.unidade,
    note: p.note ?? p.nota,
    models,
    aliases: p.aliases ?? {},
    budget: { target_usd: b.target_usd ?? b.alvo_usd, cap_usd: b.cap_usd ?? b.teto_usd },
  };
}

// Finds pricing.json: the WORKSHOP_PRICING variable, next to the hooks, or at the root of the kit.
export function loadPricing(explicitPath) {
  const candidates = [
    explicitPath,
    process.env.WORKSHOP_PRICING,
    join(HERE, '..', 'pricing.json'),
    join(HERE, '..', '..', 'pricing.json'),
  ].filter(Boolean);
  for (const p of candidates) {
    if (existsSync(p)) return normalizePricing(JSON.parse(readFileSync(p, 'utf8')));
  }
  throw new Error(lingua() === 'pt' ? 'pricing.json não encontrado' : 'pricing.json not found');
}

// Normalises a model ID ("claude-haiku-5-5-20261001", "haiku", "claude-haiku-5-5[1m]")
// to the pricing.json key. Returns null if it is unknown.
export function resolveModel(model, pricing) {
  if (!model) return null;
  pricing = normalizePricing(pricing);
  const m = String(model).toLowerCase().replace(/\[.*\]$/, '');
  if (pricing.aliases?.[m]) return pricing.aliases[m];
  const keys = Object.keys(pricing.models).sort((a, b) => b.length - a.length);
  return keys.find((k) => m === k || m.startsWith(k + '-') || m.startsWith(k + '@')) ?? null;
}

export function emptyTokens() {
  return { input: 0, output: 0, cache_write_5m: 0, cache_write_1h: 0, cache_read: 0 };
}

// Converte um objeto "usage" da API para os nossos 5 contadores.
export function tokensFromUsage(u = {}) {
  const cc = u.cache_creation || {};
  const w5 = cc.ephemeral_5m_input_tokens;
  const w1 = cc.ephemeral_1h_input_tokens;
  const totalWrite = u.cache_creation_input_tokens || 0;
  // Se nao houver detalhe 5m/1h, assume 5m (o mais comum).
  const write5m = typeof w5 === 'number' ? w5 : Math.max(0, totalWrite - (w1 || 0));
  return {
    input: u.input_tokens || 0,
    output: u.output_tokens || 0,
    cache_write_5m: write5m,
    cache_write_1h: w1 || 0,
    cache_read: u.cache_read_input_tokens || 0,
  };
}

export function addTokens(a, b) {
  const r = { ...a };
  for (const k of Object.keys(emptyTokens())) r[k] = (a[k] || 0) + (b[k] || 0);
  return r;
}

// Cost of ONE request (Haiku's long-prompt tier depends on the size of the request).
export function requestCost(tokens, model, pricing) {
  pricing = normalizePricing(pricing);
  const key = resolveModel(model, pricing);
  if (!key) return { usd: null, model: key };
  let p = pricing.models[key];
  const prompt = tokens.input + tokens.cache_write_5m + tokens.cache_write_1h + tokens.cache_read;
  if (p.long_prompt && prompt > p.long_prompt.above_tokens) p = { ...p, ...p.long_prompt };
  const usd =
    (tokens.input * p.input +
      tokens.output * p.output +
      tokens.cache_write_5m * p.cache_write_5m +
      tokens.cache_write_1h * p.cache_write_1h +
      tokens.cache_read * p.cache_read) /
    1e6;
  return { usd, model: key };
}

// Formats dollars in the kit language: "US$ 0,0123" / "US$ 1,23" in Portuguese, "US$ 0.0123" / "US$ 1.23" in English.
// 4 decimals for small values, 2 for the others. `l` ('pt'|'en') is optional (tests).
export function fmtUsd(v, l = lingua()) {
  if (v === null || v === undefined || Number.isNaN(v)) return 'US$ ?';
  const s = v.toFixed(Math.abs(v) < 0.1 ? 4 : 2);
  return 'US$ ' + (l === 'pt' ? s.replace('.', ',') : s);
}

export function modelName(model, pricing) {
  pricing = normalizePricing(pricing);
  const key = resolveModel(model, pricing);
  return key ? pricing.models[key].name : String(model || '?');
}
