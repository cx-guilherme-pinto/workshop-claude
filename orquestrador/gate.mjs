#!/usr/bin/env node
// Gate final: so passa codigo pronto para producao.
//   node gate.mjs [--projeto <dir>] [--base <ref git>] [--teste "<comando>"] [--ignorar <prefixo>]... [--json]
// --ignorar (ou o ficheiro .workshop/gate-ignorar, um prefixo por linha) tira caminhos da procura
// de segredos e de codigo perigoso: por exemplo, conteudo didatico com codigo inseguro de proposito.
// Verificacoes: testes, segredos nos ficheiros alterados, padroes de codigo perigoso,
// dependencias alteradas (para rever) e veredito do revisor (.workshop/veredito.json).
// Sai com 0 se nada bloqueia; 1 se ha falhas bloqueantes.
// Os textos saem na lingua do kit; "GATE: APROVADO" e "GATE: REPROVADO" sao marcadores e nao mudam.
import { existsSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { SEGREDOS, CODIGO_PERIGOSO, procurar } from './lib/padroes.mjs';
import { resumirSaida } from './grade.mjs';
import { ehPrincipal } from './lib/principal.mjs';
import { lingua, textos } from '../hooks/lib/lingua.mjs';

const TEXTOS = {
  pt: {
    testes: 'Testes',
    passou: (cmd, n) => `\`${cmd}\` passou${n ? ` (${n} testes)` : ''}`,
    falhou: (cmd, ex) => `\`${cmd}\` falhou: ${ex}`,
    semTeste: 'sem comando de teste definido: indica-o com --teste',
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
    semVeredito: 'ainda não há veredito (.workshop/veredito.json)',
    colunas: ['| verificação | estado | detalhe |', '|---|---|---|'],
    ok: '✅ ok',
    bloqueia: '❌ bloqueia',
    atencao: '⚠️ atenção',
    reprovado: 'GATE: REPROVADO — corrige os pontos ❌ antes de avançar.',
    aprovado: 'GATE: APROVADO — pronto para produção (revê os ⚠️, se houver).',
  },
  en: {
    testes: 'Tests',
    passou: (cmd, n) => `\`${cmd}\` passed${n ? ` (${n} tests)` : ''}`,
    falhou: (cmd, ex) => `\`${cmd}\` failed: ${ex}`,
    semTeste: 'no test command defined: give it with --teste',
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
    semVeredito: 'no verdict yet (.workshop/veredito.json)',
    colunas: ['| check | status | detail |', '|---|---|---|'],
    ok: '✅ ok',
    bloqueia: '❌ blocks',
    atencao: '⚠️ warning',
    reprovado: 'GATE: REPROVADO — fix the ❌ items before moving on.',
    aprovado: 'GATE: APROVADO — ready for production (check the ⚠️, if any).',
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
  const f = join(dir, '.workshop', 'gate-ignorar');
  const doFicheiro = existsSync(f) ? readFileSync(f, 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#')) : [];
  return [...extra, ...doFicheiro].map((p) => p.replace(/\\/g, '/'));
}

// `l` ('pt'|'en') e opcional: por omissao, a lingua do kit.
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
  // 5. Veredito do revisor.
  const vf = join(dir, '.workshop', 'veredito.json');
  if (existsSync(vf)) {
    let v = {};
    try {
      v = JSON.parse(readFileSync(vf, 'utf8'));
    } catch {
      /* invalido */
    }
    const altas = (v.problemas || []).filter((p) => p.gravidade === 'alta').length;
    checks.push({ nome: T.revisao, ok: v.veredito !== 'reprovado' && altas === 0, bloqueia: true, detalhe: `${v.veredito || '?'}${v.problemas?.length ? T.problemas(v.problemas.length, altas) : ''}${v.resumo ? ' · ' + v.resumo : ''}` });
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

if (ehPrincipal(import.meta.url)) {
  const a = process.argv.slice(2);
  const opt = (k) => (a.includes(k) ? a[a.indexOf(k) + 1] : null);
  const dir = opt('--projeto') || process.cwd();
  const ign = a.flatMap((x, i) => (x === '--ignorar' ? [a[i + 1]] : []));
  const r = gate(dir, { base: opt('--base'), teste: opt('--teste'), ignorar: ign });
  if (existsSync(join(dir, '.workshop'))) writeFileSync(join(dir, '.workshop', 'gate.json'), JSON.stringify(r, null, 2));
  console.log(a.includes('--json') ? JSON.stringify(r, null, 2) : gateMd(r));
  process.exit(r.bloqueado ? 1 : 0);
}
