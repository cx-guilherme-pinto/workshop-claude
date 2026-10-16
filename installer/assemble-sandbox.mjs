#!/usr/bin/env node
// Instala o projeto de treino do Projeto 2 (exemplo-projeto-real) numa pasta, com git init e commit inicial.
//   node installer/assemble-sandbox.mjs --dest <pasta> [--force]
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const KIT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const a = process.argv.slice(2);
const dest = a.includes('--dest') ? resolve(a[a.indexOf('--dest') + 1]) : null;
const force = a.includes('--force');
if (!dest) {
  console.error('ERRO: falta --dest <pasta>');
  process.exit(1);
}
const marca = join(dest, '.sandbox-kit.json');
if (existsSync(dest) && readdirSync(dest).length) {
  if (existsSync(marca) && !force) {
    console.log(JSON.stringify({ estado: 'ja_existia' }));
    process.exit(0);
  }
  if (!force) {
    console.error(`ERRO: a pasta ${dest} ja existe (usa --force para substituir)`);
    process.exit(1);
  }
  rmSync(dest, { recursive: true, force: true });
}
mkdirSync(dest, { recursive: true });
cpSync(join(KIT, 'exemplo-projeto-real'), dest, { recursive: true, filter: (p) => !/(\.DS_Store|node_modules|\.workshop)/.test(p) });
writeFileSync(join(dest, '.gitignore'), 'node_modules/\n.DS_Store\n');
writeFileSync(marca, JSON.stringify({ criado_em: new Date().toISOString() }) + '\n');
const git = (...x) => {
  const r = spawnSync('git', x, { cwd: dest, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`git ${x.join(' ')}: ${r.stderr}`);
};
git('init', '-q', '-b', 'main');
git('config', 'user.name', 'Participante do Workshop');
git('config', 'user.email', 'participante@workshop.invalid');
git('add', '-A');
git('commit', '-q', '-m', 'Biblioteca Municipal v0.3.0');
console.log(JSON.stringify({ estado: 'montado', dest: dest.replace(/\\/g, '/') }));
