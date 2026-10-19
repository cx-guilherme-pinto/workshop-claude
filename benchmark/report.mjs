#!/usr/bin/env node
// Gera benchmark/REPORT.md a partir de results.csv: minimo, media, maximo e desvio padrao por grupo
// (escopo · lingua · modo · versao do kit), com o dia completo (Projeto 1 + Projeto 2), a divisao P1/P2 e a
// comparacao com o alvo (US$ 5) e o teto (US$ 10) de pricing.json. As linhas antigas (sem escopo, so o
// Projeto 1, antes da v1.0.0-rc.4) ficam numa secao propria, como antes.
//   node report.mjs --csv results.csv --out REPORT.md
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isMain } from '../orchestrator/lib/is-main.mjs';
import { lerCsv } from './collect.mjs';

const KIT = join(dirname(fileURLToPath(import.meta.url)), '..');

export const est = (xs) => {
  xs = xs.filter((x) => Number.isFinite(x));
  const n = xs.length;
  if (!n) return null;
  const media = xs.reduce((s, x) => s + x, 0) / n;
  const dp = Math.sqrt(xs.reduce((s, x) => s + (x - media) ** 2, 0) / (n > 1 ? n - 1 : 1));
  return { n, min: Math.min(...xs), media, max: Math.max(...xs), dp };
};
const f2 = (v, d = 2) => (v === null || v === undefined || !Number.isFinite(v) ? '—' : v.toFixed(d).replace('.', ','));
const USD = (v) => (v === null || v === undefined || !Number.isFinite(v) ? '—' : `US$ ${f2(v, Math.abs(v) < 0.1 && v !== 0 ? 4 : 2)}`);
const MIN = (s) => (Number.isFinite(s) ? `${f2(s / 60, 1)} min` : '—');
const INT = (v) => (Number.isFinite(v) ? f2(v, Number.isInteger(v) ? 0 : 1) : '—');
const num = (v) => (v === '' || v === undefined || v === null ? NaN : Number(v));

const NOME_ESCOPO = { day: 'Dia completo (Projeto 1 + Projeto 2)', p1: 'Projeto 1 (Arena)', p2: 'Projeto 2 (projeto de treino)' };
const NOME_MODO = { participant: 'participante', participante: 'participante', presenter: 'apresentador', apresentador: 'apresentador' };

// As metricas de cada escopo: [rotulo, coluna, formato].
const METRICAS = {
  day: [
    ['custo do dia', 'custo_total', USD], ['custo do Projeto 1', 'p1_custo', USD], ['custo do Projeto 2', 'p2_custo', USD],
    ['custo Haiku', 'custo_haiku', USD], ['custo Sonnet', 'custo_sonnet', USD], ['custo Opus', 'custo_opus', USD],
    ['duração (P1 + P2)', 'duracao_s', MIN], ['duração do Projeto 1', 'p1_duracao_s', MIN], ['swarm do Projeto 1', 'p1_swarm_s', MIN], ['duração do Projeto 2', 'p2_duracao_s', MIN],
    ['agentes', 'agentes', INT], ['agentes do Projeto 1', 'p1_agentes', INT], ['agentes do Projeto 2', 'p2_agentes', INT],
    ['tentativas a mais (P1 + P2)', (r) => num(r.p1_repeticoes) + num(r.p2_repeticoes), INT], ['--retry dos cartões partidos', 'p1_retry_spec', INT],
    ['erros 429', 'erros_429', INT], ['custo segundo o Claude Code', 'claude_total_cost_usd', USD],
  ],
  p1: [
    ['custo', 'custo_total', USD], ['custo Haiku', 'custo_haiku', USD], ['custo Sonnet', 'custo_sonnet', USD], ['custo Opus', 'custo_opus', USD],
    ['duração', 'duracao_s', MIN], ['swarm', 'p1_swarm_s', MIN], ['agentes', 'agentes', INT], ['tentativas a mais', 'p1_repeticoes', INT],
    ['--retry dos cartões partidos', 'p1_retry_spec', INT], ['erros 429', 'erros_429', INT], ['custo segundo o Claude Code', 'claude_total_cost_usd', USD],
  ],
  p2: [
    ['custo', 'custo_total', USD], ['custo Haiku', 'custo_haiku', USD], ['custo Sonnet', 'custo_sonnet', USD], ['custo Opus', 'custo_opus', USD],
    ['duração', 'duracao_s', MIN], ['agentes', 'agentes', INT], ['tentativas a mais', 'p2_repeticoes', INT], ['erros 429', 'erros_429', INT],
    ['custo segundo o Claude Code', 'claude_total_cost_usd', USD],
  ],
};

// As colunas da tabela por execucao de cada escopo.
const P1_COLS = [['P1', (r) => USD(num(r.p1_custo))], ['P1 duração', (r) => MIN(num(r.p1_duracao_s))], ['P1 verdes', (r) => `${r.verdes}${num(r.falhadas) ? ` (${r.falhadas} falhadas)` : ''}`], ['--retry (verdes)', (r) => `${r.p1_retry_spec || 0} (${r.p1_retry_verdes || 0})`], ['testes', (r) => `${r.testes_pass}/${num(r.testes_pass) + num(r.testes_fail)}`], ['veredito P1', (r) => r.veredito], ['gate P1', (r) => r.gate]];
const P2_COLS = [['P2', (r) => USD(num(r.p2_custo))], ['P2 duração', (r) => MIN(num(r.p2_duracao_s))], ['P2 verdes', (r) => `${r.p2_verdes}${num(r.p2_falhadas) ? ` (${r.p2_falhadas} falhadas)` : ''}`], ['veredito P2', (r) => r.p2_veredito], ['gate P2', (r) => r.p2_gate]];
const LINHA_COLS = {
  day: [['custo do dia', (r) => USD(num(r.custo_total))], ['duração', (r) => MIN(num(r.duracao_s))], ...P1_COLS, ...P2_COLS, ['Haiku', (r) => USD(num(r.custo_haiku))], ['Sonnet', (r) => USD(num(r.custo_sonnet))], ['Opus', (r) => USD(num(r.custo_opus))], ['agentes', (r) => r.agentes], ['429', (r) => r.erros_429], ['negações', (r) => r.negacoes], ['resultado', (r) => r.resultado]],
  p1: [['custo', (r) => USD(num(r.custo_total))], ['Haiku', (r) => USD(num(r.custo_haiku))], ['Sonnet', (r) => USD(num(r.custo_sonnet))], ['Opus', (r) => USD(num(r.custo_opus))], ['agentes', (r) => r.agentes], ...P1_COLS, ['429', (r) => r.erros_429], ['negações', (r) => r.negacoes], ['resultado', (r) => r.resultado]],
  p2: [['custo', (r) => USD(num(r.custo_total))], ['Haiku', (r) => USD(num(r.custo_haiku))], ['Sonnet', (r) => USD(num(r.custo_sonnet))], ['Opus', (r) => USD(num(r.custo_opus))], ['agentes', (r) => r.agentes], ['issue', (r) => r.p2_issue], ...P2_COLS, ['429', (r) => r.erros_429], ['negações', (r) => r.negacoes], ['resultado', (r) => r.resultado]],
};

const valor = (r, col) => (typeof col === 'function' ? col(r) : num(r[col]));
const okRow = (r) => (r.resultado ? r.resultado === 'ok' : r.testes_ok === 'sim' && Number(r.erros) === 0);

// "dentro do alvo" / "acima do alvo" / "acima do teto", para uma media e um maximo.
export function face(media, max, alvo, teto) {
  const m = media <= alvo ? `média ${USD(media)}: dentro do alvo de ${USD(alvo)} (${Math.round((media / alvo) * 100)}%)` : `média ${USD(media)}: **acima do alvo** de ${USD(alvo)} (+${USD(media - alvo)})`;
  const x = max <= teto ? `máximo ${USD(max)}: abaixo do teto de ${USD(teto)}` : `máximo ${USD(max)}: **ACIMA DO TETO** de ${USD(teto)}`;
  return `${m}; ${x}`;
}

export function gerar(rows, { alvo = 5, teto = 10, agora = new Date() } = {}) {
  const L = [
    '# Benchmark de custo e tempo',
    '',
    `Gerado em ${agora.toISOString().slice(0, 16).replace('T', ' ')} a partir de \`benchmark/results.csv\` (\`benchmark/run-benchmark.sh\`). O custo é medido com os tokens reais e os preços de \`pricing.json\`. A coluna "Claude Code" é o \`total_cost_usd\` do CLI, que sobrestima nesta versão (ver DECISIONS D-13). Alvo por participante: ${USD(alvo)}; teto: ${USD(teto)} (nunca se corta por custo, só há avisos).`,
    '',
  ];
  const novas = rows.filter((r) => r.escopo);
  const antigas = rows.filter((r) => !r.escopo);
  const chave = (r) => [r.escopo, r.lingua || '?', NOME_MODO[r.modo] || r.modo, r.versao || '?', r.crypto || 'sonnet'].join('|');
  const grupos = new Map();
  for (const r of novas) grupos.set(chave(r), [...(grupos.get(chave(r)) || []), r]);
  const ordem = ['day', 'p1', 'p2'];
  const gs = [...grupos.entries()].sort(([a], [b]) => ordem.indexOf(a.split('|')[0]) - ordem.indexOf(b.split('|')[0]) || a.localeCompare(b));

  if (gs.length) {
    L.push('## Resumo', '', '| escopo | língua | modo | kit | criptografia | execuções | sucesso | média | máximo | P1 · P2 (média) | face ao alvo e ao teto |', '|---|---|---|---|---|---|---|---|---|---|---|');
    for (const [k, rs] of gs) {
      const [escopo, lingua, modo, versao, crypto] = k.split('|');
      const c = est(rs.map((r) => num(r.custo_total)));
      const p1 = est(rs.map((r) => num(r.p1_custo)));
      const p2 = est(rs.map((r) => num(r.p2_custo)));
      const split = escopo === 'day' ? `${USD(p1?.media)} · ${USD(p2?.media)}` : escopo === 'p1' ? `${USD(p1?.media)} · —` : `— · ${USD(p2?.media)}`;
      // So o dia completo e o que um participante gasta; P1 ou P2 sozinhos comparam-se com o alvo so como referencia.
      L.push(`| ${NOME_ESCOPO[escopo] || escopo} | ${lingua} | ${modo} | ${versao} | ${crypto} | ${rs.length} | ${rs.filter(okRow).length}/${rs.length} | ${USD(c.media)} | ${USD(c.max)} | ${split} | ${face(c.media, c.max, alvo, teto)} |`);
    }
    L.push('');
  }

  for (const [k, rs] of gs) {
    const [escopo, lingua, modo, versao, crypto] = k.split('|');
    L.push(`## ${NOME_ESCOPO[escopo] || escopo} · ${lingua} · ${modo} · ${versao} · criptografia ${crypto} (${rs.length} ${rs.length === 1 ? 'execução' : 'execuções'})`, '');
    L.push('| métrica | mínimo | média | máximo | desvio padrão |', '|---|---|---|---|---|');
    for (const [rot, col, fmt] of METRICAS[escopo] || METRICAS.p1) {
      const e = est(rs.map((r) => valor(r, col)));
      L.push(`| ${rot} | ${fmt(e?.min)} | ${fmt(e?.media)} | ${fmt(e?.max)} | ${fmt(e?.dp)} |`);
    }
    const c = est(rs.map((r) => num(r.custo_total)));
    const ok = rs.filter(okRow).length;
    L.push('', `Execuções com sucesso (sem permissões negadas, gate APPROVED${escopo === 'day' ? ' nos dois projetos' : ''} e sem passos com erro): **${ok}/${rs.length}**.`);
    L.push(`Face ao alvo e ao teto: ${face(c.media, c.max, alvo, teto)}.`);
    if (escopo === 'day' && modo === 'participante') {
      const cumprido = ok === rs.length && c.max <= teto;
      L.push(`Critério de aceitação (todas com sucesso e custo máximo ≤ ${USD(teto)}; média idealmente ≤ ${USD(alvo)}): **${cumprido ? 'CUMPRIDO' : 'NÃO CUMPRIDO'}**${cumprido && c.media > alvo ? ' (mas a média passa o alvo)' : ''}.`);
    }
    const cols = LINHA_COLS[escopo] || LINHA_COLS.p1;
    L.push('', `| execução | ${cols.map(([n]) => n).join(' | ')} |`, `|---|${cols.map(() => '---').join('|')}|`);
    for (const r of rs) L.push(`| ${r.id} | ${cols.map(([, f]) => f(r)).join(' | ')} |`);
    L.push('');
  }

  if (antigas.length) {
    L.push('## Execuções anteriores (só o Projeto 1, antes da v1.0.0-rc.4; D-16)', '');
    for (const modo of [...new Set(antigas.map((r) => r.modo))]) {
      const rs = antigas.filter((r) => r.modo === modo);
      const c = est(rs.map((r) => num(r.custo_total)));
      const d = est(rs.map((r) => num(r.duracao_s)));
      const ok = rs.filter(okRow).length;
      L.push(`### Modo ${NOME_MODO[modo] || modo} (${rs.length} execuções)`, '');
      L.push('| métrica | mínimo | média | máximo | desvio padrão |', '|---|---|---|---|---|');
      L.push(`| custo total | ${USD(c.min)} | ${USD(c.media)} | ${USD(c.max)} | ${USD(c.dp)} |`);
      for (const m of ['haiku', 'sonnet', 'opus']) {
        const e = est(rs.map((r) => num(r[`custo_${m}`])));
        L.push(`| custo ${m[0].toUpperCase() + m.slice(1)} | ${USD(e.min)} | ${USD(e.media)} | ${USD(e.max)} | ${USD(e.dp)} |`);
      }
      L.push(`| duração | ${MIN(d.min)} | ${MIN(d.media)} | ${MIN(d.max)} | ${MIN(d.dp)} |`);
      const ag = est(rs.map((r) => num(r.agentes)));
      L.push(`| agentes | ${ag.min} | ${f2(ag.media, 1)} | ${ag.max} | ${f2(ag.dp, 1)} |`);
      const cc = est(rs.map((r) => num(r.claude_total_cost_usd)));
      L.push(`| custo segundo o Claude Code | ${USD(cc.min)} | ${USD(cc.media)} | ${USD(cc.max)} | ${USD(cc.dp)} |`, '');
      L.push(`Execuções com sucesso (testes verdes e sem erros): **${ok}/${rs.length}**.`, '');
      L.push('| execução | duração | custo | Haiku | Sonnet | Opus | agentes | verdes | testes | veredito | gate | negações |', '|---|---|---|---|---|---|---|---|---|---|---|---|');
      for (const r of rs) L.push(`| ${r.id} | ${MIN(num(r.duracao_s))} | ${USD(num(r.custo_total))} | ${USD(num(r.custo_haiku))} | ${USD(num(r.custo_sonnet))} | ${USD(num(r.custo_opus))} | ${r.agentes} | ${r.verdes} | ${r.testes_pass}/${num(r.testes_pass) + num(r.testes_fail)} | ${r.veredito} | ${r.gate} | ${r.negacoes} |`);
      L.push('');
    }
  }
  return L.join('\n') + '\n';
}

if (isMain(import.meta.url)) {
  const a = process.argv.slice(2);
  const csv = a[a.indexOf('--csv') + 1];
  const out = a[a.indexOf('--out') + 1];
  if (!existsSync(csv)) {
    console.error('sem results.csv');
    process.exit(1);
  }
  const budget = JSON.parse(readFileSync(join(KIT, 'pricing.json'), 'utf8')).budget || {};
  const md = gerar(lerCsv(csv).rows, { alvo: budget.target_usd ?? 5, teto: budget.cap_usd ?? 10 });
  writeFileSync(out, md);
  console.log(md);
}
