#!/usr/bin/env node
// SubagentStop hook: measures the real cost of each subagent from its transcript
// and records it in .workshop/usage.jsonl. It never blocks (it always exits with 0).
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { runHook, workshopDir, appendJsonl, readJsonSafe, projectDir } from './lib/workshop.mjs';
import { loadPricing } from './lib/cost.mjs';
import { summarize, parseMarkers } from './lib/transcript.mjs';
import { budgetMessage } from './budget.mjs';

runHook('subagent-stop', async (input) => {
  const ws = workshopDir(input);
  if (!ws) return null;
  const pricing = loadPricing();
  const s = summarize(input.agent_transcript_path, pricing);
  const mk = parseMarkers(s.firstUser);
  const agentId = String(input.agent_id || '');
  const durS = s.start && s.end ? (Date.parse(s.end) - Date.parse(s.start)) / 1000 : null;
  const rec = {
    v: 1,
    tipo: 'subagente',
    ts: new Date().toISOString(),
    sessao: input.session_id || null,
    agent_id: agentId,
    agent_type: input.agent_type || null,
    agente: mk.agente || `${input.agent_type || 'agente'}-${agentId.slice(0, 4)}`,
    tarefa: mk.tarefa,
    tentativa: mk.tentativa,
    modelo: s.model,
    inicio: s.start,
    fim: s.end,
    duracao_s: durS,
    pedidos: s.requests,
    tokens: s.tokens,
    custo_usd: s.usd,
  };
  appendJsonl(join(ws, 'usage.jsonl'), rec);
  appendJsonl(join(ws, 'events.jsonl'), {
    ts: rec.ts,
    tipo: 'custo',
    tarefa: rec.tarefa,
    tentativa: rec.tentativa,
    agente: rec.agente,
    modelo: rec.modelo,
    custo_usd: rec.custo_usd,
    duracao_s: durS,
  });
  // Immediate grading (only so the square changes colour right away): runs the grader in the background,
  // without waiting. The official result is confirmed again by next-wave at the end of the batch.
  const ponteiro = readJsonSafe(join(ws, 'orchestrator.json'), null) || readJsonSafe(join(ws, 'orquestrador.json'), null);
  const plano = ponteiro?.plan || ponteiro?.plano;
  if (ponteiro?.grade && plano && rec.tarefa && existsSync(ponteiro.grade)) {
    const child = spawn(ponteiro.node || process.execPath, [ponteiro.grade, '--project', projectDir(input), '--plan', plano, '--agent', rec.agente, rec.tarefa], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    });
    child.unref();
  }
  return budgetMessage(ws, pricing);
});
