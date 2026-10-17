#!/usr/bin/env node
// Final gate: only code that is ready for production passes.
//   node gate.mjs [--project <dir>] [--base <ref>] [--test "<command>"] [--ignore <prefix>]... [--json]
// --ignore (or the file .workshop/gate-ignore, one prefix per line) takes paths out of the search
// for secrets and dangerous code: for example, teaching content with insecure code on purpose.
// Checks: tests, secrets in the changed files, dangerous code patterns, changed dependencies
// (to review) and the reviewer's verdict (.workshop/verdict.json).
// Exits with 0 if nothing blocks; 1 if there are blocking failures.
// The texts are in the kit language; "GATE: APPROVED" and "GATE: REJECTED" are markers and do not change.
// (--projeto, --teste, --ignorar, .workshop/gate-ignorar and .workshop/veredito.json still work.)
import { existsSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { SEGREDOS, CODIGO_PERIGOSO, procurar } from './lib/patterns.mjs';
import { resumirSaida } from './grade.mjs';
import { isMain } from './lib/is-main.mjs';
import { opt, opts, flag } from './lib/args.mjs';
import { lingua, textos } from '../hooks/lib/language.mjs';

const TEXTOS = {
  pt: {
    testes: 'Testes',
    passou: (cmd, n) => `\`${cmd}\` passou${n ? ` (${n} testes)` : ''}`,
    falhou: (cmd, ex) => `\`${cmd}\` falhou: ${ex}`,
    semTeste: 'sem comando de teste definido: indica-o com --test',
    segredos: 'Segredos',
    nenhumSegredo: (n) => `nenhum em ${n} ficheiros alterados`,
    fora: (lista) => ` (fora da procura: ${lista})`,
    perigoso: 'Código perigoso',
    intencional: ' — confirma que é intencional',
    nenhumPadrao: 'nenhum padrão encontrado',
    deps: 'Dependências',
    depsAlteradas: (lista) => `alteradas: ${lista} — revê versões e licenças (ex.: npm audit)`,
    semAlteracoes: 'sem alterações',
    revisao: 'Revisão (Opus)',
    problemas: (n, altas) => ` · ${n} problemas (${altas} graves)`,
    semVeredito: 'ainda não há veredito (.workshop/verdict.json)',
    colunas: ['| verificação | estado | detalhe |', '|---|---|---|'],
    ok: '✅ ok',
    bloqueia: '❌ bloqueia',
    atencao: '⚠️ atenção',
    reprovado: 'GATE: REJECTED — corrige os pontos ❌ antes de avançar.',
    aprovado: 'GATE: APPROVED — pronto para produção (revê os ⚠️, se houver).',
  },
  en: {
    testes: 'Tests',
    passou: (cmd, n) => `\`${cmd}\` passed${n ? ` (${n} tests)` : ''}`,
    falhou: (cmd, ex) => `\`${cmd}\` failed: ${ex}`,
    semTeste: 'no test command defined: give it with --test',
    segredos: 'Secrets',
    nenhumSegredo: (n) => `none in ${n} changed files`,
    fora: (lista) => ` (not scanned: ${lista})`,
    perigoso: 'Dangerous code',
    intencional: ' — confirm it is intentional',
    nenhumPadrao: 'no pattern found',
    deps: 'Dependencies',
    depsAlteradas: (lista) => `changed: ${lista} — check versions and licences (e.g. npm audit)`,
    semAlteracoes: 'no changes',
    revisao: 'Review (Opus)',
    problemas: (n, altas) => ` · ${n} ${n === 1 ? 'issue' : 'issues'} (${altas} high)`,
    semVeredito: 'no verdict yet (.workshop/verdict.json)',
    colunas: ['| check | status | detail |', '|---|---|---|'],
    ok: '✅ ok',
    bloqueia: '❌ blocks',
    atencao: '⚠️ warning',
    reprovado: 'GATE: REJECTED — fix the ❌ items before moving on.',
    aprovado: 'GATE: APPROVED — ready for production (check the ⚠️, if any).',
  },
};

const CODIGO = new Set(['.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.py', '.go', '.rb', '.php', '.java', '.kt', '.cs', '.rs']);
const MANIFESTOS = /(^|\/)(package\.json|package-lock\.json|pnpm-lock\.yaml|yarn\.lock|requirements[^/]*\.txt|pyproject\.toml|poetry\.lock|go\.(mod|sum)|Cargo\.(toml|lock)|pom\.xml|build\.gradle(\.kts)?|Gemfile(\.lock)?|composer\.(json|lock))$/;

function git(dir, ...a) {
  const r = spawnSync('git', a, { cwd: dir, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return r.status === 0 ? r.stdout : '';
}

export function ficheirosAlterados(dir, base) {
  const mudados = base ? git(dir, 'diff', '--name-only', `${base}...HEAD`) + git(dir, 'diff', '--name-only') : git(dir, 'diff', '--name-only', 'HEAD');
  const novos = git(dir, 'ls-files', '--others', '--exclude-standard');
  return [...new Set((mudados + '\n' + novos).split('\n').map((s) => s.trim()).filter(Boolean))].filter((f) => existsSync(join(dir, f)) && statSync(join(dir, f)).isFile());
}

function ignorados(dir, extra = []) {
  const doFicheiro = [];
  for (const n of ['gate-ignore', 'gate-ignorar']) {
    const f = join(dir, '.workshop', n);
    if (existsSync(f)) doFicheiro.push(...readFileSync(f, 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#')));
  }
  return [...extra, ...doFicheiro].map((p) => p.replace(/\\/g, '/'));
}

// The reviewer's verdict, in the English format ({verdict, summary, issues: [{severity, ...}]}) or the older
// Portuguese one ({veredito, resumo, problemas: [{gravidade, ...}]}), from verdict.json or veredito.json.
export function lerVeredito(dir) {
  for (const n of ['verdict.json', 'veredito.json']) {
    const f = join(dir, '.workshop', n);
    if (!existsSync(f)) continue;
    let v = {};
    try {
      v = JSON.parse(readFileSync(f, 'utf8'));
    } catch {
      /* invalid */
    }
    const problemas = v.issues ?? v.problems ?? v.problemas ?? [];
    return {
      ficheiro: `.workshop/${n}`,
      veredito: v.verdict ?? v.veredito ?? null,
      resumo: v.summary ?? v.resumo ?? '',
      problemas: (Array.isArray(problemas) ? problemas : []).map((p) => ({ ...p, gravidade: p?.severity ?? p?.gravidade ?? null })),
    };
  }
  return null;
}
const REPROVADO = new Set(['rejected', 'reprovado']);
const GRAVE = new Set(['high', 'alta']);

// `l` ('pt'|'en') is optional: it defaults to the kit language.
export function gate(dir, { base = null, teste = null, ignorar = [], l = lingua() } = {}) {
  const T = textos(TEXTOS, l);
  const checks = [];
  // 1. Testes.
  if (teste) {
    const argv = typeof teste === 'string' ? teste : teste.join(' ');
    const r = spawnSync(argv, { cwd: dir, shell: true, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 900000, env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' } });
    const s = resumirSaida((r.stdout || '') + (r.stderr || ''));
    checks.push({ nome: T.testes, ok: r.status === 0, bloqueia: true, detalhe: r.status === 0 ? T.passou(argv, s.passados) : T.falhou(argv, (s.excerto || '').split('\n').slice(0, 4).join(' / ')) });
  } else {
    checks.push({ nome: T.testes, ok: false, bloqueia: false, detalhe: T.semTeste });
  }
  // 2. Segredos e 3. codigo perigoso nos ficheiros alterados.
  const fora = ignorados(dir, ignorar);
  const alterados = ficheirosAlterados(dir, base).filter((f) => !f.startsWith('.workshop/'));
  const analisados = alterados.filter((f) => !fora.some((p) => f === p || f.startsWith(p.endsWith('/') ? p : p + '/')));
  const segredos = [];
  const perigos = [];
  for (const f of analisados) {
    let txt;
    try {
      txt = readFileSync(join(dir, f), 'utf8');
    } catch {
      continue;
    }
    if (txt.length > 2_000_000 || txt.includes('\u0000')) continue;
    for (const h of procurar(txt, SEGREDOS, l)) segredos.push(`${f}:${h.linha} (${h.tipo})`);
    if (CODIGO.has(extname(f)) && !/\.test\.|\/test\/|\/tests\//.test(f)) for (const h of procurar(txt, CODIGO_PERIGOSO, l)) perigos.push(`${f}:${h.linha} (${h.tipo})`);
  }
  checks.push({ nome: T.segredos, ok: segredos.length === 0, bloqueia: true, detalhe: (segredos.length ? segredos.slice(0, 10).join(', ') : T.nenhumSegredo(analisados.length)) + (fora.length ? T.fora(fora.join(', ')) : '') });
  checks.push({ nome: T.perigoso, ok: perigos.length === 0, bloqueia: false, detalhe: perigos.length ? perigos.slice(0, 10).join(', ') + T.intencional : T.nenhumPadrao });
  const deps = alterados.filter((f) => MANIFESTOS.test(f));
  checks.push({ nome: T.deps, ok: deps.length === 0, bloqueia: false, detalhe: deps.length ? T.depsAlteradas(deps.join(', ')) : T.semAlteracoes });
  // 5. The reviewer's verdict.
  const v = lerVeredito(dir);
  if (v) {
    const altas = v.problemas.filter((p) => GRAVE.has(p.gravidade)).length;
    checks.push({ nome: T.revisao, ok: !REPROVADO.has(v.veredito) && altas === 0, bloqueia: true, detalhe: `${v.veredito || '?'}${v.problemas.length ? T.problemas(v.problemas.length, altas) : ''}${v.resumo ? ' · ' + v.resumo : ''}` });
  } else {
    checks.push({ nome: T.revisao, ok: false, bloqueia: false, detalhe: T.semVeredito });
  }
  const bloqueado = checks.some((c) => c.bloqueia && !c.ok);
  return { checks, bloqueado, alterados };
}

export function gateMd(r, l = lingua()) {
  const T = textos(TEXTOS, l);
  return [
    ...T.colunas,
    ...r.checks.map((c) => `| ${c.nome} | ${c.ok ? T.ok : c.bloqueia ? T.bloqueia : T.atencao} | ${c.detalhe} |`),
    '',
    r.bloqueado ? T.reprovado : T.aprovado,
  ].join('\n');
}

// English names.
export const changedFiles = ficheirosAlterados;
export const readVerdict = lerVeredito;
export const gateMarkdown = gateMd;

if (isMain(import.meta.url)) {
  const a = process.argv.slice(2);
  const dir = opt(a, '--project') || process.cwd();
  const r = gate(dir, { base: opt(a, '--base'), teste: opt(a, '--test'), ignorar: opts(a, '--ignore') });
  if (existsSync(join(dir, '.workshop'))) writeFileSync(join(dir, '.workshop', 'gate.json'), JSON.stringify(r, null, 2));
  console.log(flag(a, '--json') ? JSON.stringify(r, null, 2) : gateMd(r));
  process.exit(r.bloqueado ? 1 : 0);
}
