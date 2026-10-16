#!/usr/bin/env node
// Gera benchmark/REPORT.md a partir de results.csv: minimo, media, maximo e desvio padrao por modo.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const a = process.argv.slice(2);
const csv = a[a.indexOf('--csv') + 1];
const out = a[a.indexOf('--out') + 1];
if (!existsSync(csv)) {
  console.error('sem results.csv');
  process.exit(1);
}
const [cab, ...linhas] = readFileSync(csv, 'utf8').trim().split('\n');
const k = cab.split(',');
const rows = linhas.map((l) => Object.fromEntries(l.split(',').map((v, i) => [k[i], v])));

const est = (xs) => {
  const n = xs.length;
  if (!n) return null;
  const media = xs.reduce((s, x) => s + x, 0) / n;
  const dp = Math.sqrt(xs.reduce((s, x) => s + (x - media) ** 2, 0) / (n > 1 ? n - 1 : 1));
  return { n, min: Math.min(...xs), media, max: Math.max(...xs), dp };
};
const f2 = (v, d = 2) => (v === null || v === undefined ? '—' : v.toFixed(d).replace('.', ','));
const USD = (v) => `US$ ${f2(v, v < 0.1 ? 4 : 2)}`;
const MIN = (s) => `${f2(s / 60, 1)} min`;

const L = ['# Benchmark de custo e tempo', '', `Gerado em ${new Date().toISOString().slice(0, 16).replace('T', ' ')} a partir de \`benchmark/results.csv\`. O custo é medido com os tokens reais e os preços de \`pricing.json\`. A coluna "Claude Code" é o \`total_cost_usd\` do CLI, que sobrestima nesta versão (ver DECISIONS D-13).`, ''];
for (const modo of [...new Set(rows.map((r) => r.modo))]) {
  const rs = rows.filter((r) => r.modo === modo);
  const c = est(rs.map((r) => Number(r.custo_total)));
  const d = est(rs.map((r) => Number(r.duracao_s)));
  const ok = rs.filter((r) => r.testes_ok === 'sim' && Number(r.erros) === 0).length;
  const limiteTempo = 20 * 60;
  const aceite = modo === 'participante' ? ok === rs.length && d.max <= limiteTempo && c.max <= 10 : c.max <= 10 * 3;
  L.push(`## Modo ${modo} (${rs.length} execuções)`, '');
  L.push('| métrica | mínimo | média | máximo | desvio padrão |', '|---|---|---|---|---|');
  L.push(`| custo total | ${USD(c.min)} | ${USD(c.media)} | ${USD(c.max)} | ${USD(c.dp)} |`);
  for (const m of ['haiku', 'sonnet', 'opus']) {
    const e = est(rs.map((r) => Number(r[`custo_${m}`])));
    L.push(`| custo ${m[0].toUpperCase() + m.slice(1)} | ${USD(e.min)} | ${USD(e.media)} | ${USD(e.max)} | ${USD(e.dp)} |`);
  }
  L.push(`| duração | ${MIN(d.min)} | ${MIN(d.media)} | ${MIN(d.max)} | ${MIN(d.dp)} |`);
  const ag = est(rs.map((r) => Number(r.agentes)));
  L.push(`| agentes | ${ag.min} | ${f2(ag.media, 1)} | ${ag.max} | ${f2(ag.dp, 1)} |`);
  const cc = est(rs.map((r) => Number(r.claude_total_cost_usd)));
  L.push(`| custo segundo o Claude Code | ${USD(cc.min)} | ${USD(cc.media)} | ${USD(cc.max)} | ${USD(cc.dp)} |`, '');
  L.push(`Execuções com sucesso (testes verdes e sem erros): **${ok}/${rs.length}**.`);
  if (modo === 'participante') {
    L.push(`Critério de aceitação (todas com sucesso, ≤ 20 min, custo máximo ≤ US$ 10, média idealmente ≤ US$ 5): **${aceite ? 'CUMPRIDO' : 'NÃO CUMPRIDO'}**.`);
  }
  L.push('', '| execução | duração | custo | Haiku | Sonnet | Opus | agentes | verdes | testes | veredito | gate | negações |', '|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const r of rs) L.push(`| ${r.id} | ${MIN(Number(r.duracao_s))} | ${USD(Number(r.custo_total))} | ${USD(Number(r.custo_haiku))} | ${USD(Number(r.custo_sonnet))} | ${USD(Number(r.custo_opus))} | ${r.agentes} | ${r.verdes} | ${r.testes_pass}/${Number(r.testes_pass) + Number(r.testes_fail)} | ${r.veredito} | ${r.gate} | ${r.negacoes} |`);
  L.push('');
}
writeFileSync(out, L.join('\n') + '\n');
console.log(L.join('\n'));
