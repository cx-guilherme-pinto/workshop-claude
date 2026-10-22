#!/usr/bin/env node
// Statusline do workshop: modelo · custo da sessao · custo do projeto/enxame · duracao · progresso · missoes.
// O custo e calculado com o pricing.json do kit a partir do transcript (precos de lista publicados),
// e nao com o total_cost_usd do Claude Code, que pode estar desatualizado para modelos recentes.
// Sem dependencias; igual em Mac e Windows. As palavras saem na lingua do kit (pt ou en).
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { homedir, tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { loadPricing } from '../hooks/lib/cost.mjs';
import { summarize, readJsonl } from '../hooks/lib/transcript.mjs';
import { lingua, textos } from '../hooks/lib/language.mjs';

const L = lingua();
const T = textos({
  pt: { sessao: 'sessão', projeto: 'projeto', de: 'de', teto: 'acima do teto', alvo: 'acima do alvo', enxame: 'swarm', missoes: 'missões', fora: 'fora do workshop' },
  en: { sessao: 'session', projeto: 'project', de: 'of', teto: 'over the cap', alvo: 'over the target', enxame: 'swarm', missoes: 'missions', fora: 'outside the workshop' },
}, L);

const chunks = [];
for await (const c of process.stdin) chunks.push(c);
let s = {};
try {
  s = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
} catch {
  /* sem dados */
}

const usd = (v) => (v === null || v === undefined ? 'US$ ?' : 'US$ ' + (L === 'pt' ? v.toFixed(2).replace('.', ',') : v.toFixed(2)));
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
const partes = [modelo, `${T.sessao} ${usd(sessao)}`];

const proj = s.workspace?.project_dir || s.cwd || process.cwd();
const ws = join(proj, '.workshop');
if (existsSync(ws)) {
  let projeto = null;
  try {
    const last = new Map();
    const porAgente = new Map();
    for (const r of readJsonl(join(ws, 'usage.jsonl'))) {
      if (r.tipo === 'principal') last.set(r.sessao, r.custo_usd || 0);
      else if (r.tipo === 'subagente') porAgente.set(r.agent_id || r.ts, r.custo_usd || 0);
    }
    const subs = [...porAgente.values()].reduce((a, b) => a + b, 0);
    if (s.session_id && typeof sessao === 'number') last.set(s.session_id, sessao);
    projeto = [...last.values()].reduce((a, b) => a + b, 0) + subs;
  } catch {
    /* sem usage */
  }
  if (projeto !== null) {
    const alvo = pricing?.budget?.target_usd ?? 5;
    const teto = pricing?.budget?.cap_usd ?? 10;
    const aviso = projeto >= teto ? ` ⚠ ${T.teto}` : projeto >= alvo ? ` ⚠ ${T.alvo}` : '';
    partes.push(`${T.projeto} ${usd(projeto)} ${T.de} ${usd(alvo)}${aviso}`);
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
        partes.push(`${T.enxame} ${n(['verde'])}✓ ${n(['em_curso'])}… ${n(['vermelho', 'falhou'])}✗`);
      }
    }
  } catch {
    /* ignorar */
  }
}
partes.push(dur(s.cost?.total_duration_ms));

// The mission book (workshop v2, spec 6.7): "missões 6/9", and P1 ✓ / P2 ✓ when each gate approves. Only in the
// workshop projects and while the telemetry config is in force; read straight from the files (the Arena copy of
// this statusline has no telemetry/ folder next to it).
function caderneta() {
  const home = process.env.WS_HOME_OVERRIDE || (process.platform === 'win32' ? process.env.USERPROFILE || homedir() : process.env.HOME || homedir());
  const dir = process.env.WORKSHOP_TELEMETRY_DIR || join(home, '.workshop-claude', 'telemetry');
  const cfg = JSON.parse(readFileSync(join(dir, 'config.json'), 'utf8'));
  const exp = Date.parse(cfg.expires_at || '');
  if (cfg.v !== 1 || (!Number.isNaN(exp) && Date.now() >= exp)) return null;
  const r = cfg.projects_dir ? relative(resolve(cfg.projects_dir), resolve(proj)) : '..';
  // outside the workshop folder nothing counts: say so, so nobody works a whole block in the wrong folder
  if ((r.startsWith('..') || isAbsolute(r)) && !existsSync(ws)) return T.fora;
  let book = {};
  try {
    book = JSON.parse(readFileSync(join(dir, 'missions.json'), 'utf8'));
  } catch {
    /* nothing done yet */
  }
  // rules.json next to this statusline (the kit) or, for a project copy (the Arena), in the installed kit
  const here = fileURLToPath(new URL('../missions/rules.json', import.meta.url));
  const file = [here, join(home, '.workshop-claude', 'kit', 'missions', 'rules.json')].find((f) => existsSync(f));
  const rules = JSON.parse(readFileSync(file, 'utf8'));
  const valid = rules.missions.filter((m) => m.validated !== false).map((m) => m.id);
  const n = valid.filter((id) => book.done?.[id]).length;
  return [`${T.missoes} ${n}/${valid.length}`, book.p1 ? 'P1 ✓' : '', book.p2 ? 'P2 ✓' : ''].filter(Boolean).join(' ');
}
try {
  const c = caderneta();
  if (c) partes.push(c);
} catch {
  /* no mission book */
}
process.stdout.write(partes.join(' · '));
