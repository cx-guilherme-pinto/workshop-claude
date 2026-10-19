#!/usr/bin/env node
// Recolhe as metricas de UMA execucao do benchmark e acrescenta uma linha a results.csv.
//   node collect.mjs --run <pasta> --id <id> --escopo day|p1|p2 --modo <m> --csv <f> [--lingua pt|en] [--versao <v>]
//                    [--claude <v>] [--crypto <m>] [--issue EX-1] [--isolado 0|1] [--p1-duracao s] [--p2-duracao s]
//                    [--dry-run]   (mostra a linha e nao escreve)
// A pasta da execucao (run-benchmark.sh): arena/ (Projeto 1), projeto/ (Projeto 2), p1-*.json e p2-*.json (a saida
// de cada claude -p), steps.tsv e config/ (o CLAUDE_CONFIG_DIR isolado, com os transcripts).
// Sai com 1 se a execucao falhou: permissoes negadas, um gate que nao ficou APPROVED, ou passos com erro.
import { readFileSync, existsSync, appendFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { homedir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { isMain } from '../orchestrator/lib/is-main.mjs';

const KIT = resolve(fileURLToPath(new URL('..', import.meta.url)));

// As colunas de results.csv. As primeiras sao as de sempre (as linhas antigas so tem essas): verdes, falhadas,
// testes, veredito e gate sao do Projeto 1; custo_*, agentes e duracao_s somam os dois projetos.
export const COLUNAS = [
  'id', 'modo', 'isolado', 'duracao_s', 'custo_total', 'custo_haiku', 'custo_sonnet', 'custo_opus', 'agentes', 'verdes', 'falhadas',
  'testes_pass', 'testes_fail', 'testes_ok', 'veredito', 'gate', 'claude_total_cost_usd', 'negacoes', 'erros',
  'escopo', 'lingua', 'versao', 'claude', 'crypto',
  'p1_custo', 'p1_duracao_s', 'p1_swarm_s', 'p1_agentes', 'p1_repeticoes', 'p1_retry_spec', 'p1_retry_verdes',
  'p2_issue', 'p2_custo', 'p2_duracao_s', 'p2_agentes', 'p2_repeticoes', 'p2_verdes', 'p2_falhadas', 'p2_testes_pass', 'p2_testes_fail', 'p2_veredito', 'p2_gate',
  'erros_429', 'resultado',
];

const lerJson = (f, d = {}) => {
  try {
    return JSON.parse(readFileSync(f, 'utf8'));
  } catch {
    return d;
  }
};
const lerJsonl = (f) =>
  existsSync(f)
    ? readFileSync(f, 'utf8').split('\n').filter(Boolean).flatMap((l) => {
        try {
          return [JSON.parse(l)];
        } catch {
          return [];
        }
      })
    : [];

// A saida JSON dos claude -p de um projeto (p1-*.json ou p2-*.json). Com --resume, o total_cost_usd e cumulativo da
// sessao: fica o maior.
export function passos(run, prefixo) {
  const out = { claudeTotal: 0, negacoes: 0, negadas: [], erros: 0, n: 0, resultados: {} };
  const fs = existsSync(run) ? readdirSync(run).filter((f) => f.startsWith(`${prefixo}-`) && f.endsWith('.json')).sort() : [];
  for (const f of fs) {
    out.n++;
    const passo = f.replace(/\.json$/, '');
    const j = lerJson(join(run, f), null);
    if (!j) {
      out.erros++;
      out.resultados[passo] = 'SEM RESULTADO';
      continue;
    }
    out.claudeTotal = Math.max(out.claudeTotal, j.total_cost_usd || 0);
    const d = j.permission_denials || [];
    out.negacoes += d.length;
    out.negadas.push(...d.map((x) => `${passo}:${x.tool_name || '?'}`));
    if (j.is_error) out.erros++;
    out.resultados[passo] = String(j.result || '').slice(-200);
  }
  return out;
}

// Custo, contagem e duracao do swarm pelo report.mjs (o da Arena, em tools/workshop/, ou o do kit).
function relatorio(projeto, motor) {
  if (!motor || !existsSync(motor)) return {};
  const r = spawnSync(process.execPath, [motor, '--project', projeto, '--projeto', projeto, '--json'], { cwd: projeto, encoding: 'utf8' });
  try {
    return JSON.parse(r.stdout);
  } catch {
    return {};
  }
}

// Os agentes (um por agent_id) e as tentativas a mais (tentativa > 1), a partir do usage.jsonl dos hooks.
function usoAgentes(projeto) {
  const subs = new Map();
  for (const r of lerJsonl(join(projeto, '.workshop', 'usage.jsonl'))) if (r.tipo === 'subagente') subs.set(r.agent_id || `${r.ts}-${r.tarefa}`, r);
  return { agentes: subs.size, repeticoes: [...subs.values()].filter((r) => (r.tentativa || 1) > 1).length };
}

export function porModelo(rel) {
  const pm = rel.by_model || rel.por_modelo || {};
  const custo = (n) => pm[n]?.cost ?? pm[n]?.custo ?? 0;
  return { haiku: custo('Haiku'), sonnet: custo('Sonnet'), opus: custo('Opus'), agentes: Object.values(pm).reduce((s, v) => s + (v.agents ?? v.agentes ?? 0), 0) };
}

function testes(cmd, args, cwd) {
  const t = spawnSync(cmd, args, { cwd, encoding: 'utf8' });
  const out = `${t.stdout || ''}\n${t.stderr || ''}`;
  const pass = Number((/ℹ pass (\d+)/.exec(out) || [])[1] || 0);
  const f = Number((/ℹ fail (\d+)/.exec(out) || [])[1] || 0);
  return { pass, fail: t.status === 0 ? f : Math.max(1, f) };
}

function veredito(projeto) {
  const f = ['verdict.json', 'veredito.json'].map((x) => join(projeto, '.workshop', x)).find((x) => existsSync(x));
  const j = f ? lerJson(f) : {};
  return j.verdict ?? j.veredito ?? '';
}
function gate(projeto) {
  const f = join(projeto, '.workshop', 'gate.json');
  if (!existsSync(f)) return '';
  const j = lerJson(f, null);
  if (!j) return '';
  return (j.bloqueado ?? j.blocked) ? 'rejected' : 'approved';
}

// Os pedidos que a API recusou por limite de taxa (429), nos transcripts das sessoes e dos subagentes e no stderr.
// Isolado: os transcripts estao em <run>/config/projects. Sem isolamento: na pasta do utilizador (so leitura), nas
// pastas com o nome das pastas desta execucao.
const PADRAO_429 = /"status"\s*:\s*429\b|rate_limit_error|API Error: 429|\b429 Too Many Requests/;
export function contar429(run, { configDir } = {}) {
  let n = 0;
  const ver = (f) => {
    for (const l of readFileSync(f, 'utf8').split('\n')) if (PADRAO_429.test(l)) n++;
  };
  const andar = (d, filtro = () => true) => {
    if (!existsSync(d)) return;
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) {
        if (filtro(e.name)) andar(p);
      } else if (e.name.endsWith('.jsonl')) ver(p);
    }
  };
  if (existsSync(join(run, 'config', 'projects'))) andar(join(run, 'config', 'projects'));
  else {
    const base = join(configDir || process.env.CLAUDE_CONFIG_DIR || join(homedir(), '.claude'), 'projects');
    const nomes = ['arena', 'projeto'].map((d) => join(run, d).replace(/[^a-zA-Z0-9]/g, '-'));
    // (Um caminho muito comprido fica cortado e com um sufixo: chega o principio.)
    andar(base, (nome) => nomes.some((x) => nome === x || (x.length > 150 && nome.startsWith(x.slice(0, 150)))));
  }
  for (const f of existsSync(run) ? readdirSync(run).filter((x) => x.endsWith('.err')) : []) ver(join(run, f));
  return n;
}

const f4 = (v) => (Number(v) || 0).toFixed(4);

// A linha de results.csv de uma execucao (sem escrever nada).
export function recolher(o) {
  const RUN = o.run;
  const escopo = o.escopo || 'p1';
  const linha = Object.fromEntries(COLUNAS.map((k) => [k, '']));
  Object.assign(linha, { id: o.id, modo: o.modo, isolado: o.isolado ?? '', escopo, lingua: o.lingua || '', versao: o.versao || '', claude: o.claude || '' });
  const motivos = [];
  let custo = 0;
  let h = 0;
  let s = 0;
  let op = 0;
  let agentes = 0;
  let claudeTotal = 0;
  let negacoes = 0;
  let erros = 0;
  const negadas = [];
  const resultados = {};
  const p1 = escopo !== 'p2';
  const p2 = escopo !== 'p1';

  if (p1) {
    const ARENA = join(RUN, 'arena');
    const st = passos(RUN, 'p1');
    // A Arena guarda o motor em tools/workshop/orchestrator/ (tools/workshop/orquestrador/ em Arenas antigas).
    const motor = ['orchestrator', 'orquestrador'].map((d) => join(ARENA, 'tools/workshop', d, 'report.mjs')).find((f) => existsSync(f));
    const rel = relatorio(ARENA, motor);
    const m = porModelo(rel);
    const u = usoAgentes(ARENA);
    const c = rel.count ? { verde: rel.count.green, falhou: rel.count.failed } : rel.contagem || {};
    const check = ['tools/check-integration.mjs', 'tools/check-integracao.mjs'].find((f) => existsSync(join(ARENA, f)));
    const t = check ? testes(process.execPath, [check], ARENA) : { pass: 0, fail: 0 };
    const p1custo = rel.cost?.total ?? rel.custo?.total ?? 0;
    const retries = st.n ? Object.keys(st.resultados).filter((k) => k.startsWith('p1-3-retry-')) : [];
    const retryVerdes = retries.filter((k) => {
      const sj = lerJson(join(ARENA, '.workshop', 'status', `${k.replace('p1-3-retry-', '')}.json`), {});
      return (sj.estado ?? sj.state) === 'verde' || sj.state === 'green';
    }).length;
    Object.assign(linha, {
      verdes: c.verde ?? '',
      falhadas: c.falhou ?? '',
      testes_pass: t.pass,
      testes_fail: t.fail,
      testes_ok: t.fail === 0 && t.pass > 0 ? 'sim' : 'nao',
      veredito: veredito(ARENA),
      gate: gate(ARENA),
      crypto: o.crypto || '',
      p1_custo: f4(p1custo),
      p1_duracao_s: o.p1Duracao ?? '',
      p1_swarm_s: rel.duration_s != null ? Math.round(rel.duration_s) : '',
      p1_agentes: u.agentes || m.agentes,
      p1_repeticoes: u.repeticoes,
      p1_retry_spec: retries.length,
      p1_retry_verdes: retryVerdes,
    });
    custo += p1custo;
    h += m.haiku;
    s += m.sonnet;
    op += m.opus;
    agentes += u.agentes || m.agentes;
    claudeTotal += st.claudeTotal;
    negacoes += st.negacoes;
    negadas.push(...st.negadas);
    erros += st.erros;
    Object.assign(resultados, st.resultados);
    if (linha.gate !== 'approved') motivos.push(`gate P1 ${linha.gate || 'em falta'}`);
  }

  if (p2) {
    const P = join(RUN, 'projeto');
    const st = passos(RUN, 'p2');
    const rel = relatorio(P, join(KIT, 'orchestrator', 'report.mjs'));
    const m = porModelo(rel);
    const u = usoAgentes(P);
    const c = rel.count || {};
    const t = existsSync(join(P, 'package.json')) ? testes(process.execPath, ['--test'], P) : { pass: 0, fail: 0 };
    const p2custo = rel.cost?.total ?? 0;
    Object.assign(linha, {
      p2_issue: o.issue || '',
      p2_custo: f4(p2custo),
      p2_duracao_s: o.p2Duracao ?? '',
      p2_agentes: u.agentes || m.agentes,
      p2_repeticoes: u.repeticoes,
      p2_verdes: c.green ?? '',
      p2_falhadas: c.failed ?? '',
      p2_testes_pass: t.pass,
      p2_testes_fail: t.fail,
      p2_veredito: veredito(P),
      p2_gate: gate(P),
    });
    custo += p2custo;
    h += m.haiku;
    s += m.sonnet;
    op += m.opus;
    agentes += u.agentes || m.agentes;
    claudeTotal += st.claudeTotal;
    negacoes += st.negacoes;
    negadas.push(...st.negadas);
    erros += st.erros;
    Object.assign(resultados, st.resultados);
    if (linha.p2_gate !== 'approved') motivos.push(`gate P2 ${linha.p2_gate || 'em falta'}`);
  }

  if (negacoes) motivos.push(`${negacoes} permissoes negadas`);
  if (erros) motivos.push(`${erros} passos com erro`);
  Object.assign(linha, {
    duracao_s: (Number(o.p1Duracao) || 0) + (Number(o.p2Duracao) || 0),
    custo_total: f4(custo),
    custo_haiku: f4(h),
    custo_sonnet: f4(s),
    custo_opus: f4(op),
    agentes,
    claude_total_cost_usd: f4(claudeTotal),
    negacoes,
    erros,
    erros_429: contar429(RUN),
    resultado: motivos.length ? `falhou: ${motivos.join('; ')}` : 'ok',
  });
  // Nunca uma virgula dentro de um campo do CSV.
  for (const k of Object.keys(linha)) linha[k] = String(linha[k]).replace(/[,\n\r]/g, ';');
  return { linha, resultados, negadas, ok: motivos.length === 0 };
}

// Le results.csv como objetos (por nome de coluna).
export function lerCsv(f) {
  if (!existsSync(f)) return { cab: [], rows: [] };
  const [cab, ...linhas] = readFileSync(f, 'utf8').trim().split('\n');
  const k = cab.split(',');
  return { cab: k, rows: linhas.filter(Boolean).map((l) => Object.fromEntries(l.split(',').map((v, i) => [k[i], v]))) };
}

// Acrescenta a linha. Um results.csv com o cabecalho antigo e reescrito com as colunas novas (vazias nas linhas antigas).
export function gravarCsv(f, linha) {
  const { cab, rows } = lerCsv(f);
  const cols = [...COLUNAS, ...cab.filter((c) => !COLUNAS.includes(c))];
  const ser = (r) => cols.map((c) => r[c] ?? '').join(',');
  if (!cab.length || cab.join(',') !== cols.join(',')) writeFileSync(f, [cols.join(','), ...rows.map(ser)].join('\n') + '\n');
  appendFileSync(f, ser(linha) + '\n');
}

if (isMain(import.meta.url)) {
  const a = process.argv.slice(2);
  const opt = (k) => (a.includes(k) ? a[a.indexOf(k) + 1] : undefined);
  const o = {
    run: resolve(opt('--run')),
    id: opt('--id'),
    escopo: opt('--escopo') || 'p1',
    modo: opt('--modo'),
    lingua: opt('--lingua'),
    versao: opt('--versao'),
    claude: opt('--claude'),
    crypto: opt('--crypto'),
    issue: opt('--issue'),
    isolado: opt('--isolado'),
    p1Duracao: opt('--p1-duracao') ?? opt('--duracao'),
    p2Duracao: opt('--p2-duracao'),
  };
  const { linha, resultados, negadas, ok } = recolher(o);
  const resumo = `  ${linha.id}: ${linha.duracao_s}s · US$ ${linha.custo_total} (P1 ${linha.p1_custo || '-'} · P2 ${linha.p2_custo || '-'}; Claude Code diz ${linha.claude_total_cost_usd}) · ${linha.agentes} agentes · P1 ${linha.verdes || '-'} verdes, gate ${linha.gate || '-'} · P2 gate ${linha.p2_gate || '-'} · negações ${linha.negacoes} · 429 ${linha.erros_429} · ${linha.resultado}`;
  if (a.includes('--dry-run')) {
    console.log(JSON.stringify(linha, null, 1));
    console.log(resumo);
  } else {
    gravarCsv(opt('--csv'), linha);
    writeFileSync(join(o.run, 'metricas.json'), JSON.stringify({ ...linha, negadas, resultados }, null, 2));
    console.log(resumo);
    if (negadas.length) console.log(`  permissões negadas: ${negadas.join(' ')}`);
    if (!ok) process.exit(1);
  }
}
