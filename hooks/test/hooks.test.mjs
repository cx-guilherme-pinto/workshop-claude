// Testes do motor de medicao: precos, leitura de transcripts, totais e regras dos hooks.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { loadPricing, resolveModel, requestCost, tokensFromUsage } from '../lib/cost.mjs';
import { summarize, parseMarkers } from '../lib/transcript.mjs';
import { totals } from '../lib/totals.mjs';

const KIT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const pricing = loadPricing(join(KIT, 'pricing.json'));

test('resolve IDs e aliases de modelos', () => {
  assert.equal(resolveModel('claude-haiku-5-5', pricing), 'claude-haiku-5-5');
  assert.equal(resolveModel('claude-sonnet-5-5-20261001', pricing), 'claude-sonnet-5-5');
  assert.equal(resolveModel('opus', pricing), 'claude-opus-5-5');
  assert.equal(resolveModel('claude-opus-5-5[1m]', pricing), 'claude-opus-5-5');
  assert.equal(resolveModel('gpt-9', pricing), null);
});

test('preços: Sonnet com leitura de cache a 0,05x e escrita de 1 h', () => {
  // Valores reais do spike 2 (sessao principal): coincide com o calculo manual.
  const t = { input: 20, output: 1604, cache_write_5m: 0, cache_write_1h: 13757, cache_read: 222503 };
  const c = requestCost(t, 'claude-sonnet-5-5', pricing).usd;
  assert.ok(Math.abs(c - 0.09336) < 0.0001, `custo ${c}`);
});

test('preços: Haiku acima de 100K tokens de prompt usa o escalão alto', () => {
  const curto = requestCost({ input: 50000, output: 1000, cache_write_5m: 0, cache_write_1h: 0, cache_read: 0 }, 'claude-haiku-5-5', pricing).usd;
  const longo = requestCost({ input: 150000, output: 1000, cache_write_5m: 0, cache_write_1h: 0, cache_read: 0 }, 'claude-haiku-5-5', pricing).usd;
  assert.ok(Math.abs(curto - (50000 * 0.1 + 1000 * 0.5) / 1e6) < 1e-9);
  assert.ok(Math.abs(longo - (150000 * 0.5 + 1000 * 2.5) / 1e6) < 1e-9);
});

test('modelo desconhecido devolve null, nunca 0', () => {
  assert.equal(requestCost({ input: 1, output: 1, cache_write_5m: 0, cache_write_1h: 0, cache_read: 0 }, 'modelo-x', pricing).usd, null);
});

test('tokensFromUsage separa cache 5m e 1h', () => {
  const t = tokensFromUsage({ input_tokens: 5, output_tokens: 7, cache_read_input_tokens: 100, cache_creation_input_tokens: 30, cache_creation: { ephemeral_5m_input_tokens: 10, ephemeral_1h_input_tokens: 20 } });
  assert.deepEqual(t, { input: 5, output: 7, cache_write_5m: 10, cache_write_1h: 20, cache_read: 100 });
});

test('transcript: deduplica por message.id ficando com o maior output, ignora sidechain na principal', () => {
  const d = mkdtempSync(join(tmpdir(), 'ws-tr-'));
  const f = join(d, 't.jsonl');
  const u = (out) => ({ input_tokens: 10, output_tokens: out, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 });
  const linhas = [
    { type: 'user', timestamp: '2026-10-16T10:00:00Z', message: { role: 'user', content: 'TAREFA: pw-01\nAGENTE: worker-02\nTENTATIVA: 2\n\nfaz' } },
    { type: 'assistant', timestamp: '2026-10-16T10:00:05Z', message: { id: 'm1', model: 'claude-haiku-5-5', usage: u(3) } },
    { type: 'assistant', timestamp: '2026-10-16T10:00:06Z', message: { id: 'm1', model: 'claude-haiku-5-5', usage: u(300) } },
    { type: 'assistant', timestamp: '2026-10-16T10:00:09Z', message: { id: 'm2', model: 'claude-haiku-5-5', usage: u(100) } },
    { type: 'assistant', isSidechain: true, timestamp: '2026-10-16T10:00:10Z', message: { id: 'm3', model: 'claude-opus-5-5', usage: u(1000) } },
  ];
  writeFileSync(f, linhas.map((l) => JSON.stringify(l)).join('\n') + '\n{linha partida');
  const s = summarize(f, pricing);
  assert.equal(s.requests, 3);
  const p = summarize(f, pricing, { onlyMainThread: true });
  assert.equal(p.requests, 2);
  assert.equal(p.tokens.output, 400);
  assert.deepEqual(parseMarkers(s.firstUser), { tarefa: 'pw-01', agente: 'worker-02', tentativa: 2 });
});

test('totais: última fotografia por sessão e um registo por agent_id', () => {
  const t = totals([
    { tipo: 'principal', sessao: 'a', custo_usd: 0.1, modelo: 'claude-sonnet-5-5' },
    { tipo: 'principal', sessao: 'a', custo_usd: 0.3, modelo: 'claude-sonnet-5-5' },
    { tipo: 'subagente', agent_id: 'x', custo_usd: 0.01, modelo: 'claude-haiku-5-5' },
    { tipo: 'subagente', agent_id: 'x', custo_usd: 0.01, modelo: 'claude-haiku-5-5' },
    { tipo: 'subagente', agent_id: 'y', custo_usd: 0.02, modelo: 'claude-haiku-5-5' },
  ]);
  assert.ok(Math.abs(t.total - 0.33) < 1e-9);
  assert.equal(t.nSubagentes, 2);
});

test('hook de utilizador não atua num projeto com hooks próprios (sem contar a dobrar)', () => {
  const proj = mkdtempSync(join(tmpdir(), 'ws-proj-'));
  mkdirSync(join(proj, '.workshop'));
  mkdirSync(join(proj, 'tools', 'workshop', 'hooks'), { recursive: true });
  const tr = join(proj, 'tr.jsonl');
  writeFileSync(tr, JSON.stringify({ type: 'assistant', message: { id: 'm', model: 'claude-sonnet-5-5', usage: { input_tokens: 1, output_tokens: 1 } } }) + '\n');
  const input = JSON.stringify({ session_id: 's', transcript_path: tr, cwd: proj });
  // Copia "de utilizador" (fora do projeto): nao escreve nada.
  spawnSync(process.execPath, [join(KIT, 'hooks', 'stop.mjs')], { input, env: { ...process.env, CLAUDE_PROJECT_DIR: proj } });
  let usage = '';
  try {
    usage = readFileSync(join(proj, '.workshop', 'usage.jsonl'), 'utf8');
  } catch {
    /* nao existe: bom */
  }
  assert.equal(usage, '');
  // Copia do proprio projeto: escreve.
  cpSync(join(KIT, 'hooks'), join(proj, 'tools', 'workshop', 'hooks'), { recursive: true });
  cpSync(join(KIT, 'pricing.json'), join(proj, 'tools', 'workshop', 'pricing.json'));
  const r = spawnSync(process.execPath, [join(proj, 'tools', 'workshop', 'hooks', 'stop.mjs')], { input, env: { ...process.env, CLAUDE_PROJECT_DIR: proj } });
  assert.equal(r.status, 0);
  assert.match(readFileSync(join(proj, '.workshop', 'usage.jsonl'), 'utf8'), /"tipo":"principal"/);
});

test('hooks saem sempre com 0, mesmo com stdin inválido', () => {
  for (const h of ['stop.mjs', 'subagent-stop.mjs']) {
    const r = spawnSync(process.execPath, [join(KIT, 'hooks', h)], { input: 'isto não é json' });
    assert.equal(r.status, 0, h);
  }
});
