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
const r = spawnSync(process.execPath, [join(ARENA, 'tools/workshop/orquestrador/report.mjs'), '--projeto', ARENA, '--json'], { encoding: 'utf8' });
try {
  rel = JSON.parse(r.stdout);
} catch {
  rel = {};
}
const porModelo = rel.por_modelo || {};
const custoModelo = (n) => (porModelo[n]?.custo || 0).toFixed(4);
const agentes = Object.values(porModelo).reduce((s, v) => s + (v.agentes || 0), 0);

// Suite completa no fim (testes a passar sim/nao).
// Suite do plano (a mesma verificacao da integracao: so os cartoes deste modo).
const t = spawnSync(process.execPath, ['tools/check-integracao.mjs'], { cwd: ARENA, encoding: 'utf8' });
const pass = Number((/ℹ pass (\d+)/.exec(t.stdout) || [])[1] || 0);
const fail = t.status === 0 ? Number((/ℹ fail (\d+)/.exec(t.stdout) || [])[1] || 0) : Math.max(1, Number((/ℹ fail (\d+)/.exec(t.stdout) || [])[1] || 0));
const veredito = existsSync(join(ARENA, '.workshop/veredito.json')) ? JSON.parse(readFileSync(join(ARENA, '.workshop/veredito.json'), 'utf8')).veredito : '';
const gate = existsSync(join(ARENA, '.workshop/gate.json')) ? (JSON.parse(readFileSync(join(ARENA, '.workshop/gate.json'), 'utf8')).bloqueado ? 'reprovado' : 'aprovado') : '';

const linha = {
  id: opt('--id'),
  modo: opt('--modo'),
  isolado: opt('--isolado'),
  duracao_s: opt('--duracao'),
  custo_total: (rel.custo?.total || 0).toFixed(4),
  custo_haiku: custoModelo('Haiku'),
  custo_sonnet: custoModelo('Sonnet'),
  custo_opus: custoModelo('Opus'),
  agentes,
  verdes: rel.contagem?.verde ?? '',
  falhadas: rel.contagem?.falhou ?? '',
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
