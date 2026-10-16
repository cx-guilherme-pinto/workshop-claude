#!/usr/bin/env node
// Prova que todos os testes pre-escritos da Arena sao satisfaziveis:
// copia o projeto demo para uma pasta temporaria, junta as solucoes de referencia
// (dev/solutions, que NAO entram no kit) e corre a suite completa.
//
//   node tools/dev/check-solutions.mjs [--lingua en] [--keep]
//
// Com --lingua en monta a Arena em ingles como o instalador (installer/assemble-demo.mjs: demo-project/
// sem i18n/, com i18n/en/ por cima e os cartoes gerados de novo), junta dev/solutions e, por cima,
// dev/solutions/i18n/en/ (as solucoes que mudam em ingles: respostas livres e paginas).
import { cpSync, mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { copiarArena } from '../../installer/assemble-demo.mjs';

const KIT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const argv = process.argv.slice(2);
const i = argv.indexOf('--lingua');
const lingua = i >= 0 ? argv[i + 1] : 'pt';
if (!['pt', 'en'].includes(lingua)) {
  console.error('--lingua tem de ser pt ou en');
  process.exit(2);
}

const SOLUCOES = join(KIT, 'dev/solutions');
const tmp = mkdtempSync(join(tmpdir(), 'arena-solucoes-'));
try {
  if (lingua === 'pt') {
    cpSync(join(KIT, 'demo-project'), tmp, { recursive: true, filter: (p) => !p.includes(`${'/'}.workshop`) && resolve(p) !== resolve(KIT, 'demo-project/i18n') });
  } else {
    copiarArena(tmp, lingua);
  }
  if (existsSync(SOLUCOES)) cpSync(SOLUCOES, tmp, { recursive: true, filter: (p) => resolve(p) !== resolve(SOLUCOES, 'i18n') });
  if (existsSync(join(SOLUCOES, 'i18n', lingua))) cpSync(join(SOLUCOES, 'i18n', lingua), tmp, { recursive: true });
  const r = spawnSync(process.execPath, ['--test', '--test-timeout=10000'], { cwd: tmp, stdio: 'inherit', env: { ...process.env, WORKSHOP_LANG: lingua } });
  process.exitCode = r.status ?? 1;
} finally {
  if (!argv.includes('--keep')) rmSync(tmp, { recursive: true, force: true });
  else console.log('pasta mantida:', tmp);
}
