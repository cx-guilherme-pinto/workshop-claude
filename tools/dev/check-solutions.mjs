#!/usr/bin/env node
// Proves that every pre-written test of the Arena can be satisfied:
// copies the demo project to a temporary folder, adds the reference solutions
// (dev/solutions, which are NOT part of the kit) and runs the full suite.
//
//   node tools/dev/check-solutions.mjs [--lang en] [--keep]      (--lingua still works)
//
// With --lang en it assembles the English Arena like the installer (installer/assemble-demo.mjs: demo-project/
// without i18n/, with i18n/en/ on top and the cards generated again), adds dev/solutions and, on top,
// dev/solutions/i18n/en/ (the solutions that change in English: free answers and pages).
// The cards broken on purpose get their complete spec.md (tools/gen.mjs --no-gaps), as a person would fix them.
import { cpSync, mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import * as installer from '../../installer/assemble-demo.mjs';

const KIT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const argv = process.argv.slice(2);
const i = argv.findIndex((a) => a === '--lang' || a === '--lingua');
const lang = i >= 0 ? argv[i + 1] : 'pt';
if (!['pt', 'en'].includes(lang)) {
  console.error('--lang must be pt or en');
  process.exit(2);
}
// The installer's function that copies the Arena (it had a Portuguese name before).
const copyArena = installer.copyArena ?? installer.copiarArena;

const SOLUTIONS = join(KIT, 'dev/solutions');
const tmp = mkdtempSync(join(tmpdir(), 'arena-solutions-'));
try {
  if (lang === 'pt') {
    cpSync(join(KIT, 'demo-project'), tmp, { recursive: true, filter: (p) => !p.includes(`${'/'}.workshop`) && resolve(p) !== resolve(KIT, 'demo-project/i18n') });
  } else {
    copyArena(tmp, lang);
  }
  if (existsSync(SOLUTIONS)) cpSync(SOLUTIONS, tmp, { recursive: true, filter: (p) => resolve(p) !== resolve(SOLUTIONS, 'i18n') });
  if (existsSync(join(SOLUTIONS, 'i18n', lang))) cpSync(join(SOLUTIONS, 'i18n', lang), tmp, { recursive: true });
  // The cards broken on purpose ("spec_gaps" in specs/cards.json) are solved by a person completing their spec.md:
  // the complete specs are part of the solution.
  const gen = spawnSync(process.execPath, [join('tools', 'gen.mjs'), '--no-gaps'], { cwd: tmp, encoding: 'utf8' });
  if (gen.status !== 0) throw new Error(`tools/gen.mjs --no-gaps failed: ${gen.stderr || gen.stdout}`);
  const r = spawnSync(process.execPath, ['--test', '--test-timeout=10000'], { cwd: tmp, stdio: 'inherit', env: { ...process.env, WORKSHOP_LANG: lang } });
  process.exitCode = r.status ?? 1;
} finally {
  if (!argv.includes('--keep')) rmSync(tmp, { recursive: true, force: true });
  else console.log('folder kept:', tmp);
}
