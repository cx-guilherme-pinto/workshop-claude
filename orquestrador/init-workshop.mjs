#!/usr/bin/env node
// Prepara um projeto real para o enxame: cria .workshop/ (ativa os hooks de custo),
// acrescenta .workshop/ ao .git/info/exclude (sem mexer no .gitignore do projeto)
// e regista o commit de partida (base para o diff do gate).
//   node init-workshop.mjs [--projeto <dir>]
import { mkdirSync, existsSync, readFileSync, appendFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const a = process.argv.slice(2);
const dir = a.includes('--projeto') ? a[a.indexOf('--projeto') + 1] : process.cwd();
const git = (...x) => spawnSync('git', x, { cwd: dir, encoding: 'utf8' });

const top = git('rev-parse', '--show-toplevel');
if (top.status !== 0) {
  console.log('ERRO: esta pasta não é um repositório git. Abre o Claude Code na raiz do teu projeto.');
  process.exit(1);
}
const raiz = top.stdout.trim();
const ws = join(raiz, '.workshop');
mkdirSync(ws, { recursive: true });
const gitDir = git('rev-parse', '--git-dir').stdout.trim();
const exclude = join(raiz, gitDir, 'info', 'exclude');
mkdirSync(join(raiz, gitDir, 'info'), { recursive: true });
const atual = existsSync(exclude) ? readFileSync(exclude, 'utf8') : '';
if (!/^\.workshop\/?$/m.test(atual)) appendFileSync(exclude, `${atual.endsWith('\n') || !atual ? '' : '\n'}.workshop/\n`);
const base = git('rev-parse', 'HEAD').stdout.trim();
const branch = git('rev-parse', '--abbrev-ref', 'HEAD').stdout.trim();
const infoFile = join(ws, 'base.json');
if (!existsSync(infoFile)) writeFileSync(infoFile, JSON.stringify({ base, branch, criado_em: new Date().toISOString() }, null, 2) + '\n');
console.log(JSON.stringify({ projeto: raiz.split(/[\\/]/).pop(), raiz: raiz.replace(/\\/g, '/'), base, branch }));
