#!/usr/bin/env node
// Prepares a real project for the swarm: creates .workshop/ (turns the cost hooks on),
// adds .workshop/ to .git/info/exclude (without touching the project's .gitignore)
// and records the starting commit (the base for the gate's diff).
//   node init-workshop.mjs [--project <dir>]     (--projeto still works)
import { mkdirSync, existsSync, readFileSync, appendFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { opt } from './lib/args.mjs';
import { textos } from '../hooks/lib/language.mjs';
import { blockOf, emit } from './lib/telemetry.mjs';

const a = process.argv.slice(2);
const dir = opt(a, '--project') || process.cwd();
const git = (...x) => spawnSync('git', x, { cwd: dir, encoding: 'utf8' });

const top = git('rev-parse', '--show-toplevel');
if (top.status !== 0) {
  console.log(textos({
    pt: 'ERROR: esta pasta não é um repositório git. Abre o Claude Code na raiz do teu projeto.',
    en: 'ERROR: this folder is not a git repository. Open Claude Code at the root of your project.',
  }));
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
if (!existsSync(infoFile)) writeFileSync(infoFile, JSON.stringify({ base, branch, created_at: new Date().toISOString() }, null, 2) + '\n');
console.log(JSON.stringify({ project: raiz.split(/[\\/]/).pop(), root: raiz.replace(/\\/g, '/'), base, branch }));
// /task-intake starts here: the first step of the panel's Project 2 funnel (the practice project, or your own)
if (blockOf(raiz) === 'p2') await emit('p2_intake', { origin: existsSync(join(raiz, 'issues', 'EX-1.json')) ? 'practice' : 'own' });
