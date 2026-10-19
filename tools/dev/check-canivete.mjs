#!/usr/bin/env node
// Proves that every pre-written test of the Pocketknife can be satisfied: assembles the project in a temporary
// folder (canivete-project/ without i18n/, and i18n/<lang>/ on top in English), generates the specs and tests,
// adds the reference solutions (dev/solutions/canivete, NOT part of the kit; dev/solutions/canivete/i18n/<lang>/
// on top) and runs every tool test.
//
//   node tools/dev/check-canivete.mjs [--lang pt|en] [--no-gaps] [--keep] [--only <id,id>]
//
// --no-gaps generates the complete specs (the broken tools as a person fixes them); the solutions must pass both.
import { cpSync, existsSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { isMain } from '../../orchestrator/lib/is-main.mjs';

const KIT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const argv = process.argv.slice(2);
const opt = (k, d) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : d);
const lang = opt('--lang', 'pt');
if (!['pt', 'en'].includes(lang)) {
  console.error('--lang must be pt or en');
  process.exit(2);
}
const only = opt('--only', '').split(',').filter(Boolean);
const PROJ = join(KIT, 'canivete-project');
const SOL = join(KIT, 'dev', 'solutions', 'canivete');

export function assemble(dest, l) {
  cpSync(PROJ, dest, { recursive: true, filter: (p) => resolve(p) !== resolve(PROJ, 'i18n') && !/[\\/](\.workshop|node_modules)([\\/]|$)/.test(p) });
  if (l !== 'pt' && existsSync(join(PROJ, 'i18n', l))) cpSync(join(PROJ, 'i18n', l), dest, { recursive: true });
}

if (isMain(import.meta.url)) {
  const tmp = mkdtempSync(join(tmpdir(), 'canivete-solutions-'));
  let status = 0;
  try {
    assemble(tmp, lang);
    const gen = spawnSync(process.execPath, ['tools/gen.mjs', ...(argv.includes('--no-gaps') ? ['--no-gaps'] : [])], { cwd: tmp, encoding: 'utf8' });
    process.stdout.write(gen.stdout);
    if (gen.status !== 0) {
      process.stderr.write(gen.stderr);
      process.exit(1);
    }
    if (existsSync(SOL)) cpSync(SOL, tmp, { recursive: true, filter: (p) => resolve(p) !== resolve(SOL, 'i18n') });
    if (existsSync(join(SOL, 'i18n', lang))) cpSync(join(SOL, 'i18n', lang), tmp, { recursive: true });
    const ids = readdirSync(join(tmp, 'tools')).filter((d) => /^[a-z]{2}-\d{2}$/.test(d) && (!only.length || only.includes(d)));
    const files = ids.map((id) => `tools/${id}/tool.test.js`);
    const missing = ids.filter((id) => !existsSync(join(tmp, 'tools', id, 'tool.js')));
    if (missing.length) console.log(`without a solution: ${missing.join(', ')}`);
    const r = spawnSync(process.execPath, ['--test', '--test-reporter=dot', ...files], { cwd: tmp, encoding: 'utf8' });
    process.stdout.write(r.stdout.split('\n').filter((l) => !/^\.*$/.test(l)).join('\n') + '\n');
    if (r.status !== 0) process.stderr.write(r.stderr);
    status = r.status === 0 && !missing.length ? 0 : 1;
    console.log(status === 0 ? `canivete (${lang}${argv.includes('--no-gaps') ? ', --no-gaps' : ''}): ${ids.length} tools green` : `canivete (${lang}): FAILED`);
  } finally {
    if (argv.includes('--keep')) console.log(`kept: ${tmp}`);
    else rmSync(tmp, { recursive: true, force: true });
  }
  process.exit(status);
}
