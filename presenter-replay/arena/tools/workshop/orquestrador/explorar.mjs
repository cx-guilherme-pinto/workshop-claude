#!/usr/bin/env node
// Resumo barato do repositorio atual (sem LLM): linguagens, manifestos, comandos de teste provaveis,
// pastas principais e ficheiros de orientacao. Usado pelo /task-intake para nao gastar tokens a explorar.
//   node explorar.mjs [--projeto <dir>]
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, extname, basename } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { ehPrincipal } from './lib/principal.mjs';

export function explorar(dir) {
  const git = spawnSync('git', ['ls-files'], { cwd: dir, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const ficheiros = git.status === 0 ? git.stdout.split('\n').filter(Boolean) : [];
  const porExt = {};
  const pastas = {};
  for (const f of ficheiros) {
    const e = extname(f).toLowerCase() || basename(f);
    porExt[e] = (porExt[e] || 0) + 1;
    const top = f.includes('/') ? f.split('/')[0] + '/' : '(raiz)';
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
      /* package.json invalido */
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
    nome: basename(dir),
    branch,
    remoto,
    total_ficheiros: ficheiros.length,
    linguagens: Object.entries(porExt).sort((a, b) => b[1] - a[1]).slice(0, 8),
    pastas: Object.entries(pastas).sort((a, b) => b[1] - a[1]).slice(0, 12),
    manifestos,
    orientacao,
    testes_provaveis: testes,
    readme: (ler('README.md', 1500) || '').trim(),
    tamanho_mb: Math.round(ficheiros.reduce((s, f) => {
      try {
        return s + statSync(join(dir, f)).size;
      } catch {
        return s;
      }
    }, 0) / 1e5) / 10,
  };
}

export function explorarMd(r) {
  return [
    `# Repositório ${r.nome}`,
    '',
    `- Branch: ${r.branch || '?'} · remoto: ${r.remoto || 'nenhum'} · ${r.total_ficheiros} ficheiros (${r.tamanho_mb} MB)`,
    `- Linguagens (por n.º de ficheiros): ${r.linguagens.map(([e, n]) => `${e} ${n}`).join(', ') || '—'}`,
    `- Pastas principais: ${r.pastas.map(([p, n]) => `${p} (${n})`).join(', ') || '—'}`,
    `- Manifestos: ${r.manifestos.join(', ') || 'nenhum'}`,
    `- Guias para agentes: ${r.orientacao.join(', ') || 'nenhum'}`,
    `- Comandos de teste prováveis: ${r.testes_provaveis.map((t) => '`' + t.join(' ') + '`').join(', ') || 'nenhum encontrado'}`,
    '',
    r.readme ? '## Início do README\n\n' + r.readme.split('\n').slice(0, 25).join('\n') : '',
  ].join('\n');
}

if (ehPrincipal(import.meta.url)) {
  const a = process.argv.slice(2);
  const dir = a.includes('--projeto') ? a[a.indexOf('--projeto') + 1] : process.cwd();
  const r = explorar(dir);
  console.log(a.includes('--json') ? JSON.stringify(r, null, 2) : explorarMd(r));
}
