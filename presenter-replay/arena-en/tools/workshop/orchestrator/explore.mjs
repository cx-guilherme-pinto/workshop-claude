#!/usr/bin/env node
// Cheap summary of the current repository (no LLM): languages, manifests, likely test commands,
// main folders and guide files. Used by /task-intake so it does not spend tokens exploring.
//   node explore.mjs [--project <dir>] [--json]     (--projeto still works)
// The summary is in the kit language; `l` is optional (tests).
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, extname, basename } from 'node:path';
import { spawnSync } from 'node:child_process';
import { isMain } from './lib/is-main.mjs';
import { opt, flag } from './lib/args.mjs';
import { lingua, textos } from '../hooks/lib/language.mjs';

const TEXTOS = {
  pt: {
    raiz: '(raiz)',
    titulo: (n) => `# Repositório ${n}`,
    branch: (b, r, n, mb) => `- Branch: ${b} · remoto: ${r} · ${n} ficheiros (${mb} MB)`,
    linguagens: 'Linguagens (por n.º de ficheiros)',
    pastas: 'Pastas principais',
    manifestos: 'Manifestos',
    guias: 'Guias para agentes',
    testes: 'Comandos de teste prováveis',
    nenhum: 'nenhum',
    nenhumEncontrado: 'nenhum encontrado',
    readme: '## Início do README',
  },
  en: {
    raiz: '(root)',
    titulo: (n) => `# Repository ${n}`,
    branch: (b, r, n, mb) => `- Branch: ${b} · remote: ${r} · ${n} files (${mb} MB)`,
    linguagens: 'Languages (by number of files)',
    pastas: 'Main folders',
    manifestos: 'Manifests',
    guias: 'Guides for agents',
    testes: 'Likely test commands',
    nenhum: 'none',
    nenhumEncontrado: 'none found',
    readme: '## Start of the README',
  },
};

export function explorar(dir, l = lingua()) {
  const git = spawnSync('git', ['ls-files'], { cwd: dir, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const ficheiros = git.status === 0 ? git.stdout.split('\n').filter(Boolean) : [];
  const porExt = {};
  const pastas = {};
  for (const f of ficheiros) {
    const e = extname(f).toLowerCase() || basename(f);
    porExt[e] = (porExt[e] || 0) + 1;
    const top = f.includes('/') ? f.split('/')[0] + '/' : textos(TEXTOS, l).raiz;
    pastas[top] = (pastas[top] || 0) + 1;
  }
  const existe = (p) => existsSync(join(dir, p));
  const ler = (p, n = 4000) => (existe(p) ? readFileSync(join(dir, p), 'utf8').slice(0, n) : null);
  const testes = [];
  const pkg = ler('package.json', 200000);
  if (pkg) {
    try {
      const j = JSON.parse(pkg);
      if (j.scripts?.test) testes.push(['npm', 'test']);
      if (j.scripts?.lint) testes.push(['npm', 'run', 'lint']);
    } catch {
      /* invalid package.json */
    }
  }
  if (existe('pyproject.toml') || existe('pytest.ini') || existe('setup.cfg')) testes.push(['python', '-m', 'pytest', '-q']);
  if (existe('go.mod')) testes.push(['go', 'test', './...']);
  if (existe('Cargo.toml')) testes.push(['cargo', 'test']);
  if (existe('pom.xml')) testes.push(['mvn', '-q', 'test']);
  if (existe('build.gradle') || existe('build.gradle.kts')) testes.push(['./gradlew', 'test']);
  if (existe('Makefile') && /^test:/m.test(ler('Makefile') || '')) testes.push(['make', 'test']);
  const manifestos = ['package.json', 'pyproject.toml', 'requirements.txt', 'go.mod', 'Cargo.toml', 'pom.xml', 'build.gradle', 'Gemfile', 'composer.json'].filter(existe);
  const orientacao = ['CLAUDE.md', 'AGENTS.md', 'README.md', 'CONTRIBUTING.md'].filter(existe);
  const branch = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: dir, encoding: 'utf8' }).stdout.trim();
  const remoto = spawnSync('git', ['remote', 'get-url', 'origin'], { cwd: dir, encoding: 'utf8' }).stdout.trim().replace(/\/\/[^@/]+@/, '//');
  return {
    name: basename(dir),
    branch,
    remote: remoto,
    total_files: ficheiros.length,
    languages: Object.entries(porExt).sort((a, b) => b[1] - a[1]).slice(0, 8),
    folders: Object.entries(pastas).sort((a, b) => b[1] - a[1]).slice(0, 12),
    manifests: manifestos,
    guides: orientacao,
    likely_tests: testes,
    readme: (ler('README.md', 1500) || '').trim(),
    size_mb: Math.round(ficheiros.reduce((s, f) => {
      try {
        return s + statSync(join(dir, f)).size;
      } catch {
        return s;
      }
    }, 0) / 1e5) / 10,
  };
}

export function explorarMd(r, l = lingua()) {
  const T = textos(TEXTOS, l);
  return [
    T.titulo(r.name),
    '',
    T.branch(r.branch || '?', r.remote || T.nenhum, r.total_files, r.size_mb),
    `- ${T.linguagens}: ${r.languages.map(([e, n]) => `${e} ${n}`).join(', ') || '—'}`,
    `- ${T.pastas}: ${r.folders.map(([p, n]) => `${p} (${n})`).join(', ') || '—'}`,
    `- ${T.manifestos}: ${r.manifests.join(', ') || T.nenhum}`,
    `- ${T.guias}: ${r.guides.join(', ') || T.nenhum}`,
    `- ${T.testes}: ${r.likely_tests.map((t) => '`' + t.join(' ') + '`').join(', ') || T.nenhumEncontrado}`,
    '',
    r.readme ? T.readme + '\n\n' + r.readme.split('\n').slice(0, 25).join('\n') : '',
  ].join('\n');
}

// English names.
export const explore = explorar;
export const exploreMarkdown = explorarMd;

if (isMain(import.meta.url)) {
  const a = process.argv.slice(2);
  const dir = opt(a, '--project') || process.cwd();
  const r = explorar(dir);
  console.log(flag(a, '--json') ? JSON.stringify(r, null, 2) : explorarMd(r));
}
