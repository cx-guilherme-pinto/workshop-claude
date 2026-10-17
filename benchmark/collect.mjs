#!/usr/bin/env node
// Recolhe as metricas de UMA execucao do benchmark e acrescenta uma linha a results.csv.
import { readFileSync, existsSync, appendFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const a = process.argv.slice(2);
const opt = (k) => a[a.indexOf(k) + 1];
const RUN = opt('--run');
const ARENA = join(RUN, 'arena');
const csv = opt('--csv');

const passos = ['1-plan', '2-swarm', '3-review', '4-cost'];
let claudeTotal = 0;
let negacoes = 0;
let erros = 0;
const resultados = {};
for (const p of passos) {
  const f = join(RUN, `${p}.json`);
  try {
    const j = JSON.parse(readFileSync(f, 'utf8'));
    // Com --resume, o total_cost_usd e cumulativo da sessao: fica o maior.
    claudeTotal = Math.max(claudeTotal, j.total_cost_usd || 0);
    negacoes += (j.permission_denials || []).length;
    if (j.is_error) erros++;
    resultados[p] = (j.result || '').slice(-200);
  } catch {
    erros++;
    resultados[p] = 'SEM RESULTADO';
  }
}

// Custo pelos nossos precos (hooks) e estado final.
let rel = {};
// O motor da Arena em tools/workshop/orchestrator/ (tools/workshop/orquestrador/ em Arenas antigas).
const motor = ['orchestrator', 'orquestrador'].map((d) => join(ARENA, 'tools/workshop', d, 'report.mjs')).find((f) => existsSync(f));
const r = spawnSync(process.execPath, [motor, '--project', ARENA, '--projeto', ARENA, '--json'], { encoding: 'utf8' });
try {
  rel = JSON.parse(r.stdout);
} catch {
  rel = {};
}
// --json: chaves em ingles desde a v1.0.0-rc.2 (cost/count/by_model); antes em portugues.
const porModelo = rel.by_model || rel.por_modelo || {};
const custoModelo = (n) => (porModelo[n]?.cost ?? porModelo[n]?.custo ?? 0).toFixed(4);
const agentes = Object.values(porModelo).reduce((s, v) => s + (v.agents ?? v.agentes ?? 0), 0);
const contagem = rel.count ? { verde: rel.count.green, falhou: rel.count.failed } : rel.contagem || {};
const custoTotal = rel.cost?.total ?? rel.custo?.total ?? 0;

// Suite completa no fim (testes a passar sim/nao).
// Suite do plano (a mesma verificacao da integracao: so os cartoes deste modo).
const check = ['tools/check-integration.mjs', 'tools/check-integracao.mjs'].find((f) => existsSync(join(ARENA, f)));
const t = spawnSync(process.execPath, [check], { cwd: ARENA, encoding: 'utf8' });
const pass = Number((/ℹ pass (\d+)/.exec(t.stdout) || [])[1] || 0);
const fail = t.status === 0 ? Number((/ℹ fail (\d+)/.exec(t.stdout) || [])[1] || 0) : Math.max(1, Number((/ℹ fail (\d+)/.exec(t.stdout) || [])[1] || 0));
const fVeredito = ['.workshop/verdict.json', '.workshop/veredito.json'].map((f) => join(ARENA, f)).find((f) => existsSync(f));
const jVeredito = fVeredito ? JSON.parse(readFileSync(fVeredito, 'utf8')) : {};
const veredito = jVeredito.verdict ?? jVeredito.veredito ?? '';
const gate = existsSync(join(ARENA, '.workshop/gate.json')) ? (JSON.parse(readFileSync(join(ARENA, '.workshop/gate.json'), 'utf8')).bloqueado ? 'rejected' : 'approved') : '';

const linha = {
  id: opt('--id'),
  modo: opt('--modo'),
  isolado: opt('--isolado'),
  duracao_s: opt('--duracao'),
  custo_total: (custoTotal || 0).toFixed(4),
  custo_haiku: custoModelo('Haiku'),
  custo_sonnet: custoModelo('Sonnet'),
  custo_opus: custoModelo('Opus'),
  agentes,
  verdes: contagem.verde ?? '',
  falhadas: contagem.falhou ?? '',
  testes_pass: pass,
  testes_fail: fail,
  testes_ok: fail === 0 && pass > 0 ? 'sim' : 'nao',
  veredito,
  gate,
  claude_total_cost_usd: claudeTotal.toFixed(4),
  negacoes,
  erros,
};
if (!existsSync(csv)) appendFileSync(csv, Object.keys(linha).join(',') + '\n');
appendFileSync(csv, Object.values(linha).join(',') + '\n');
writeFileSync(join(RUN, 'metricas.json'), JSON.stringify({ ...linha, resultados }, null, 2));
console.log(`  ${linha.id}: ${linha.duracao_s}s · US$ ${linha.custo_total} (Claude Code diz ${linha.claude_total_cost_usd}) · ${linha.verdes} verdes · testes ${linha.testes_ok} · negações ${negacoes} · erros ${erros}`);
