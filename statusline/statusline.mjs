#!/usr/bin/env node
// Statusline do workshop: modelo · custo da sessao · custo do projeto/enxame · duracao · progresso.
// O custo e calculado com o pricing.json do kit a partir do transcript (precos de lista publicados),
// e nao com o total_cost_usd do Claude Code, que pode estar desatualizado para modelos recentes.
// Sem dependencias; igual em Mac e Windows.
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { loadPricing } from '../hooks/lib/cost.mjs';
import { summarize, readJsonl } from '../hooks/lib/transcript.mjs';

const chunks = [];
for await (const c of process.stdin) chunks.push(c);
let s = {};
try {
  s = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
} catch {
  /* sem dados */
}

const usd = (v) => (v === null || v === undefined ? 'US$ ?' : 'US$ ' + v.toFixed(2).replace('.', ','));
const dur = (ms) => {
  const m = Math.floor((ms || 0) / 60000);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`;
};

let pricing = null;
try {
  pricing = loadPricing();
} catch {
  /* sem pricing: mostra so o que houver */
}

// Custo da sessao atual (so a conversa principal), com cache por tamanho do ficheiro.
function custoSessao(tp) {
  if (!pricing || !tp || !existsSync(tp)) return null;
  const size = statSync(tp).size;
  const key = createHash('sha1').update(tp).digest('hex').slice(0, 16);
  const cacheFile = join(tmpdir(), `ws-statusline-${key}.json`);
  try {
    const c = JSON.parse(readFileSync(cacheFile, 'utf8'));
    if (c.size === size) return c.usd;
  } catch {
    /* sem cache */
  }
  const r = summarize(tp, pricing, { onlyMainThread: true }).usd;
  try {
    writeFileSync(cacheFile, JSON.stringify({ size, usd: r }));
  } catch {
    /* ignorar */
  }
  return r;
}

const modelo = s.model?.display_name || s.model?.id || '?';
const sessao = custoSessao(s.transcript_path);
const partes = [modelo, `sessão ${usd(sessao)}`];

const proj = s.workspace?.project_dir || s.cwd || process.cwd();
const ws = join(proj, '.workshop');
if (existsSync(ws)) {
  let projeto = null;
  try {
    const last = new Map();
    let subs = 0;
    for (const r of readJsonl(join(ws, 'usage.jsonl'))) {
      if (r.tipo === 'principal') last.set(r.sessao, r.custo_usd || 0);
      else if (r.tipo === 'subagente') subs += r.custo_usd || 0;
    }
    if (s.session_id && typeof sessao === 'number') last.set(s.session_id, sessao);
    projeto = [...last.values()].reduce((a, b) => a + b, 0) + subs;
  } catch {
    /* sem usage */
  }
  if (projeto !== null) {
    const alvo = pricing?.orcamento?.alvo_usd ?? 5;
    const teto = pricing?.orcamento?.teto_usd ?? 10;
    const aviso = projeto >= teto ? ' ⚠ acima do teto' : projeto >= alvo ? ' ⚠ acima do alvo' : '';
    partes.push(`projeto ${usd(projeto)} de ${usd(alvo)}${aviso}`);
  }
  try {
    const dir = join(ws, 'status');
    if (existsSync(dir)) {
      const est = readdirSync(dir)
        .filter((f) => f.endsWith('.json'))
        .map((f) => {
          try {
            return JSON.parse(readFileSync(join(dir, f), 'utf8')).estado;
          } catch {
            return null;
          }
        });
      if (est.length) {
        const n = (e) => est.filter((x) => e.includes(x)).length;
        partes.push(`enxame ${n(['verde'])}✓ ${n(['em_curso'])}… ${n(['vermelho', 'falhou'])}✗`);
      }
    }
  } catch {
    /* ignorar */
  }
}
partes.push(dur(s.cost?.total_duration_ms));
process.stdout.write(partes.join(' · '));
