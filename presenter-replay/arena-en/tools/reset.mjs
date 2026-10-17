#!/usr/bin/env node
// Puts the Arena back in its initial state (used by /demo-reset):
//   1. archives .workshop/* (except history/) and plan.json/PLAN.md in .workshop/history/<date>/;
//   2. git reset --hard arena-start;
//   3. git clean -fd (no -x: what is in .gitignore, such as .workshop/, stays).
//
//   node tools/reset.mjs              does the reset
//   node tools/reset.mjs --dry-run    only shows what it would do (--sim still works)
//
// Refuses to run outside an Arena assembled by the kit (.arena-kit.json at the root).
// Arenas assembled by an older kit have the tag arena-inicial and the folder .workshop/historico/: both work.
import { cpSync, existsSync, mkdirSync, readdirSync, realpathSync, renameSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { arenaTexts } from './engine.mjs';

// Texts in the Arena's language. Outside an assembled Arena (no tools/workshop/) they stay in
// Portuguese, so the refusal below still shows up.
const T = await arenaTexts({
  pt: {
    noArena: (root) => `Recusado: ${root} não é uma Arena montada pelo kit (falta .arena-kit.json). Não mexo em nada.`,
    noGit: 'Recusado: esta pasta não é um repositório git.',
    otherRepo: (top, root) => `Recusado: o repositório git começa em ${top}, não em ${root}.`,
    noTag: (tag) => `Recusado: não existe a tag ${tag}. Para teres uma Arena nova, muda o nome desta pasta e volta a correr o setup (o teu trabalho fica nela).`,
    dryRun: 'Simulação: nada vai mudar.\n',
    archive: (stamp) => `Arquivo em .workshop/history/${stamp}/:`,
    copy: '(cópia)',
    nothingToArchive: 'Nada para arquivar em .workshop/.',
    wouldRestore: (n) => `repunha ${n} ficheiro(s) alterado(s)`,
    nothingToRestore: 'nada para repor',
    failed: (cmd, out) => `${cmd} falhou:\n${out}`,
    deleted: (dry, n) => `${dry ? 'apagava' : 'apagou'} ${n} ficheiro(s) ou pasta(s) fora do git`,
    nothingToDelete: 'nada para apagar',
    andMore: (n) => `… e mais ${n}`,
    runWithout: '\nCorre sem --dry-run para fazer o reset.',
    done: '\nArena de volta ao estado inicial. O histórico ficou em .workshop/history/.',
  },
  en: {
    noArena: (root) => `Refused: ${root} is not an Arena assembled by the kit (no .arena-kit.json). Nothing was touched.`,
    noGit: 'Refused: this folder is not a git repository.',
    otherRepo: (top, root) => `Refused: the git repository starts at ${top}, not at ${root}.`,
    noTag: (tag) => `Refused: the tag ${tag} does not exist. To get a fresh Arena, rename this folder and run the setup again (your work stays in it).`,
    dryRun: 'Dry run: nothing will change.\n',
    archive: (stamp) => `Archive in .workshop/history/${stamp}/:`,
    copy: '(copy)',
    nothingToArchive: 'Nothing to archive in .workshop/.',
    wouldRestore: (n) => `would restore ${n} changed file(s)`,
    nothingToRestore: 'nothing to restore',
    failed: (cmd, out) => `${cmd} failed:\n${out}`,
    deleted: (dry, n) => `${dry ? 'would delete' : 'deleted'} ${n} file(s) or folder(s) outside git`,
    nothingToDelete: 'nothing to delete',
    andMore: (n) => `… and ${n} more`,
    runWithout: '\nRun without --dry-run to do the reset.',
    done: '\nArena back to its initial state. The history is in .workshop/history/.',
  },
});

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DRY = process.argv.includes('--dry-run') || process.argv.includes('--sim');
const WS = join(ROOT, '.workshop');
const TAGS = ['arena-start', 'arena-inicial'];
const HISTORY = ['history', 'historico'];

function exit(msg, code = 1) {
  console.error(msg);
  process.exit(code);
}

function git(...args) {
  const r = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8' });
  return { ok: r.status === 0, out: `${r.stdout || ''}${r.stderr || ''}`.trim() };
}

// ---------- checks ----------

if (!existsSync(join(ROOT, '.arena-kit.json'))) {
  exit(T.noArena(ROOT));
}
const top = git('rev-parse', '--show-toplevel');
if (!top.ok) exit(T.noGit);
// Only the Arena's own repository: never one above it (the kit's, for example).
if (realpathSync(top.out) !== realpathSync(ROOT)) exit(T.otherRepo(top.out, ROOT));
const TAG = TAGS.find((t) => git('rev-parse', '-q', '--verify', `refs/tags/${t}`).ok);
if (!TAG) exit(T.noTag(TAGS[0]));

// ---------- 1. archive ----------

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const target = join(WS, 'history', stamp);
const items = existsSync(WS) ? readdirSync(WS).filter((n) => !HISTORY.includes(n)) : [];
const generated = ['plan.json', 'PLAN.md', 'PLANO.md'].filter((f) => existsSync(join(ROOT, f)));

console.log(DRY ? T.dryRun : '');
if (items.length || generated.length) {
  console.log(T.archive(stamp));
  for (const n of items) console.log(`  .workshop/${n}`);
  for (const f of generated) console.log(`  ${f} ${T.copy}`);
  if (!DRY) {
    mkdirSync(target, { recursive: true });
    for (const n of items) {
      try {
        renameSync(join(WS, n), join(target, n));
      } catch {
        cpSync(join(WS, n), join(target, n), { recursive: true });
        rmSync(join(WS, n), { recursive: true, force: true });
      }
    }
    for (const f of generated) cpSync(join(ROOT, f), join(target, f));
  }
} else {
  console.log(T.nothingToArchive);
}

// ---------- 2. git reset --hard ----------

if (DRY) {
  const changed = git('status', '--porcelain', '--untracked-files=no');
  console.log(`\ngit reset --hard ${TAG}: ${changed.out ? T.wouldRestore(changed.out.split('\n').length) : T.nothingToRestore}`);
} else {
  const r = git('reset', '--hard', TAG);
  if (!r.ok) exit(T.failed(`git reset --hard ${TAG}`, r.out));
  console.log(`\ngit reset --hard ${TAG}: ${r.out}`);
}

// ---------- 3. git clean -fd (no -x) ----------

const clean = git('clean', DRY ? '-fdn' : '-fd');
if (!clean.ok) exit(T.failed('git clean', clean.out));
const lines = clean.out ? clean.out.split('\n') : [];
console.log(`git clean -fd: ${lines.length ? T.deleted(DRY, lines.length) : T.nothingToDelete}`);
for (const l of lines.slice(0, 40)) console.log(`  ${l.replace(/^Would remove |^Removing /, '')}`);
if (lines.length > 40) console.log(`  ${T.andMore(lines.length - 40)}`);

console.log(DRY ? T.runWithout : T.done);
