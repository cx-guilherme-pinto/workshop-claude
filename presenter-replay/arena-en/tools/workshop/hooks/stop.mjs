#!/usr/bin/env node
// Stop hook: at the end of each answer of the main session, records that session's cumulative cost
// (only the main conversation; the subagents are measured in SubagentStop).
import { join } from 'node:path';
import { runHook, workshopDir, appendJsonl } from './lib/workshop.mjs';
import { loadPricing, tokensFromUsage, requestCost } from './lib/cost.mjs';
import { summarize, readJsonl } from './lib/transcript.mjs';
import { budgetMessage } from './budget.mjs';

function costByModel(path, pricing) {
  const seen = new Map();
  for (const r of readJsonl(path)) {
    if (r.isSidechain || r.type !== 'assistant' || !r.message?.usage) continue;
    const id = r.message.id || r.uuid;
    const prev = seen.get(id);
    if (!prev || (r.message.usage.output_tokens || 0) >= (prev.usage.output_tokens || 0)) seen.set(id, r.message);
  }
  const out = {};
  for (const m of seen.values()) {
    if (m.model === '<synthetic>') continue;
    const c = requestCost(tokensFromUsage(m.usage), m.model, pricing);
    const k = c.model || m.model || '?';
    out[k] = (out[k] || 0) + (c.usd || 0);
  }
  return out;
}

runHook('stop', async (input) => {
  const ws = workshopDir(input);
  if (!ws) return null;
  const pricing = loadPricing();
  const s = summarize(input.transcript_path, pricing, { onlyMainThread: true });
  appendJsonl(join(ws, 'usage.jsonl'), {
    v: 1,
    tipo: 'principal',
    ts: new Date().toISOString(),
    sessao: input.session_id || null,
    modelo: s.model,
    por_modelo: costByModel(input.transcript_path, pricing),
    inicio: s.start,
    fim: s.end,
    pedidos: s.requests,
    tokens: s.tokens,
    custo_usd: s.usd,
  });
  return budgetMessage(ws, pricing);
});
