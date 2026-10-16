#!/usr/bin/env node
// SO PARA DESENVOLVIMENTO (spikes): grava o stdin de qualquer hook em .workshop/probe.jsonl,
// para confirmar os campos reais de cada evento. Nao faz parte do kit do participante.
import { appendFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const chunks = [];
for await (const c of process.stdin) chunks.push(c);
const raw = Buffer.concat(chunks).toString('utf8');
const dir = join(process.env.CLAUDE_PROJECT_DIR || process.cwd(), '.workshop');
if (existsSync(dir)) {
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = { raw };
  }
  // tool_response pode ser grande: guardar so as chaves e o usage.
  if (parsed.tool_response && typeof parsed.tool_response === 'object') {
    const tr = parsed.tool_response;
    parsed.tool_response = { keys: Object.keys(tr), usage: tr.usage, totalTokens: tr.totalTokens, agentId: tr.agentId };
  }
  appendFileSync(join(dir, 'probe.jsonl'), JSON.stringify({ ts: new Date().toISOString(), env_project: process.env.CLAUDE_PROJECT_DIR || null, ...parsed }) + '\n');
}
process.exit(0);
