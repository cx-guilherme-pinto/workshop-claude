// Leitura de transcripts JSONL do Claude Code (sessao principal ou subagente).
// O formato em disco nao e documentado oficialmente; este leitor e tolerante:
// ignora linhas invalidas e campos desconhecidos.
import { readFileSync, existsSync } from 'node:fs';
import { tokensFromUsage, requestCost, addTokens, emptyTokens } from './cost.mjs';

export function readJsonl(path) {
  if (!path || !existsSync(path)) return [];
  const out = [];
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try {
      out.push(JSON.parse(line));
    } catch {
      /* linha parcial ou invalida: ignorar */
    }
  }
  return out;
}

function textOf(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .filter((b) => b && b.type === 'text')
      .map((b) => b.text)
      .join('\n');
  }
  return '';
}

// Resume um transcript: pedidos unicos (por message.id), tokens, custo, tempos e 1.a mensagem.
// onlyMainThread: ignora entradas isSidechain (para a sessao principal).
export function summarize(path, pricing, { onlyMainThread = false } = {}) {
  const rows = readJsonl(path);
  const byId = new Map();
  let firstUser = null;
  let start = null;
  let end = null;
  for (const r of rows) {
    if (onlyMainThread && r.isSidechain) continue;
    if (r.timestamp) {
      if (!start || r.timestamp < start) start = r.timestamp;
      if (!end || r.timestamp > end) end = r.timestamp;
    }
    const m = r.message;
    if (r.type === 'user' && firstUser === null && m) {
      const t = textOf(m.content);
      if (t) firstUser = t;
    }
    if (r.type === 'assistant' && m && m.usage) {
      const id = m.id || r.requestId || r.uuid;
      const prev = byId.get(id);
      // O streaming repete a mesma mensagem com output_tokens parciais: ficar com o maior.
      if (!prev || (m.usage.output_tokens || 0) >= (prev.usage.output_tokens || 0)) {
        byId.set(id, { model: m.model, usage: m.usage });
      }
    }
  }
  let tokens = emptyTokens();
  let usd = 0;
  let unknown = false;
  const models = {};
  for (const { model, usage } of byId.values()) {
    if (model === '<synthetic>') continue;
    const t = tokensFromUsage(usage);
    tokens = addTokens(tokens, t);
    const c = requestCost(t, model, pricing);
    if (c.usd === null) unknown = true;
    else usd += c.usd;
    const k = c.model || model || '?';
    models[k] = (models[k] || 0) + 1;
  }
  const mainModel = Object.entries(models).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  return {
    requests: byId.size,
    tokens,
    usd: unknown && usd === 0 ? null : usd,
    unknownModel: unknown,
    model: mainModel,
    models,
    start,
    end,
    firstUser: firstUser || '',
  };
}

// Markers the orchestrator puts in each subagent's prompt (TASK:, AGENT:, ATTEMPT:;
// older versions wrote TAREFA:, AGENTE:, TENTATIVA:, which are still read).
export function parseMarkers(text) {
  const get = (...ks) => {
    for (const k of ks) {
      const m = new RegExp('^\\s*' + k + ':\\s*([^\\s]+)', 'mi').exec(text || '');
      if (m) return m[1];
    }
    return null;
  };
  return {
    tarefa: get('TASK', 'TAREFA'),
    agente: get('AGENT', 'AGENTE'),
    tentativa: Number(get('ATTEMPT', 'TENTATIVA') || 1) || 1,
  };
}
