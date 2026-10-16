#!/usr/bin/env node
// Prova que todos os testes pre-escritos da Arena sao satisfaziveis:
// copia o projeto demo para uma pasta temporaria, junta as solucoes de referencia
// (dev/solutions, que NAO entram no kit) e corre a suite completa.
import { cpSync, mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const KIT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const tmp = mkdtempSync(join(tmpdir(), 'arena-solucoes-'));
try {
  cpSync(join(KIT, 'demo-project'), tmp, { recursive: true, filter: (p) => !p.includes(`${'/'}.workshop`) });
  if (existsSync(join(KIT, 'dev/solutions'))) cpSync(join(KIT, 'dev/solutions'), tmp, { recursive: true });
  const r = spawnSync(process.execPath, ['--test', '--test-timeout=10000'], { cwd: tmp, stdio: 'inherit' });
  process.exitCode = r.status ?? 1;
} finally {
  if (!process.argv.includes('--keep')) rmSync(tmp, { recursive: true, force: true });
  else console.log('pasta mantida:', tmp);
}
