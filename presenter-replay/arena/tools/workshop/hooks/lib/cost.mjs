// Calculo de custo a partir do "usage" da API e do pricing.json.
// Sem dependencias. Usado pelos hooks, pela statusline e pelos relatorios.
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

// Procura o pricing.json: variavel WORKSHOP_PRICING, ao lado dos hooks, ou na raiz do kit.
export function loadPricing(explicitPath) {
  const candidates = [
    explicitPath,
    process.env.WORKSHOP_PRICING,
    join(HERE, '..', 'pricing.json'),
    join(HERE, '..', '..', 'pricing.json'),
  ].filter(Boolean);
  for (const p of candidates) {
    if (existsSync(p)) return JSON.parse(readFileSync(p, 'utf8'));
  }
  throw new Error('pricing.json nao encontrado');
}

// Normaliza um ID de modelo ("claude-haiku-5-5-20261001", "haiku", "claude-haiku-5-5[1m]")
// para a chave do pricing.json. Devolve null se for desconhecido.
export function resolveModel(model, pricing) {
  if (!model) return null;
  const m = String(model).toLowerCase().replace(/\[.*\]$/, '');
  if (pricing.aliases?.[m]) return pricing.aliases[m];
  const keys = Object.keys(pricing.modelos).sort((a, b) => b.length - a.length);
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

// Custo de UM pedido (o escalao de prompt longo do Haiku depende do tamanho do pedido).
export function requestCost(tokens, model, pricing) {
  const key = resolveModel(model, pricing);
  if (!key) return { usd: null, model: key };
  let p = pricing.modelos[key];
  const prompt = tokens.input + tokens.cache_write_5m + tokens.cache_write_1h + tokens.cache_read;
  if (p.prompt_longo && prompt > p.prompt_longo.acima_de_tokens) p = { ...p, ...p.prompt_longo };
  const usd =
    (tokens.input * p.input +
      tokens.output * p.output +
      tokens.cache_write_5m * p.cache_write_5m +
      tokens.cache_write_1h * p.cache_write_1h +
      tokens.cache_read * p.cache_read) /
    1e6;
  return { usd, model: key };
}

// Formata dolares no estilo portugues: "US$ 0,0123" para valores pequenos, "US$ 1,23" para os outros.
export function fmtUsd(v) {
  if (v === null || v === undefined || Number.isNaN(v)) return 'US$ ?';
  const digits = Math.abs(v) < 0.1 ? 4 : 2;
  return 'US$ ' + v.toFixed(digits).replace('.', ',');
}

export function modelName(model, pricing) {
  const key = resolveModel(model, pricing);
  return key ? pricing.modelos[key].nome : String(model || '?');
}
