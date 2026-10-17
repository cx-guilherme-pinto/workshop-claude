#!/usr/bin/env node
// Puts the Arena back in its initial state (used by /demo-reset):
//   0. saves the participant's own work first (changes to tracked files, files outside git, commits after
//      arena-start) in .workshop/history/<date>/ and, for commits, in a branch my-work-<date>;
//   1. archives .workshop/* (except history/) and plan.json/PLAN.md in .workshop/history/<date>/;
//   2. git reset --hard arena-start;
//   3. git clean -fd (no -x: what is in .gitignore, such as .workshop/, stays).
//
//   node tools/reset.mjs              does the reset
//   node tools/reset.mjs --dry-run    only shows what it would do (--sim still works)
//
// Refuses to run outside an Arena assembled by the kit (.arena-kit.json at the root).
// Arenas assembled by an older kit have the tag arena-inicial and the folder .workshop/historico/: both work.
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, renameSync, rmSync, writeFileSync } from 'node:fs';
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
    locked: 'Recusado: outro git está a usar a Arena (.git/index.lock). Fecha outras janelas do Claude, do VS Code ou do git; se nenhuma estiver aberta, apaga .git/index.lock e volta a correr. Não mexi em nada.',
    yourCommits: (n) => `${n} commit(s) depois de arena-start (guardados num branch e em commits.patch):`,
    yourChanges: 'ficheiros do git alterados (as alterações ficam em changes.patch):',
    yourFiles: 'ficheiros teus fora do git (copiados para untracked/):',
    saved: (stamp, what, br) => `\nO teu trabalho ficou guardado em .workshop/history/${stamp}/ (${what})${br ? ` e no branch ${br}` : ''}.`,
    saveFailed: (what, out) => `Não consegui guardar ${what}; não apaguei nada:\n${out}`,
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
    locked: 'Refused: another git is using the Arena (.git/index.lock). Close other Claude, VS Code or git windows; if none is open, delete .git/index.lock and run again. Nothing was touched.',
    yourCommits: (n) => `${n} commit(s) after arena-start (saved in a branch and in commits.patch):`,
    yourChanges: 'changed files in git (the changes are saved in changes.patch):',
    yourFiles: 'your own files outside git (copied to untracked/):',
    saved: (stamp, what, br) => `\nYour work is saved in .workshop/history/${stamp}/ (${what})${br ? ` and in the branch ${br}` : ''}.`,
    saveFailed: (what, out) => `Could not save ${what}; nothing was deleted:\n${out}`,
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

// ---------- 0. preflight and the participant's own work ----------
// Everything is checked and saved before the first change: a locked index or a failed save stops here,
// with the Arena untouched (before, .workshop/ was archived first and git then failed half way).

const lock = git('rev-parse', '--git-path', 'index.lock');
if (lock.ok && existsSync(resolve(ROOT, lock.out))) exit(T.locked);
const st = git('status', '--porcelain');
if (!st.ok) exit(T.failed('git status', st.out));
const list = (...a) => {
  const r = spawnSync('git', ['-c', 'core.quotepath=off', ...a, '-z'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) exit(T.failed(`git ${a.join(' ')}`, `${r.stdout || ''}${r.stderr || ''}`.trim()));
  return r.stdout.split('\0').filter(Boolean);
};
const log = git('log', '--format=%h %s', `${TAG}..HEAD`);
const commits = log.ok ? log.out.split('\n').filter(Boolean) : [];
const tracked = list('diff', '--name-only', '--no-ext-diff', 'HEAD');
const GEN = ['plan.json', 'PLAN.md', 'PLANO.md'];
const untracked = list('ls-files', '--others', '--exclude-standard').filter((p) => !GEN.includes(p));
// The swarm's own output (built cards and the files the plan names) is not "your own files".
let swarmFiles = new Set();
try {
  const plan = JSON.parse(readFileSync(join(ROOT, 'plan.json'), 'utf8'));
  swarmFiles = new Set((plan.tasks || plan.tarefas || []).flatMap((t) => t.files || t.ficheiros || []));
} catch {
  /* no plan */
}
const ownFiles = untracked.filter((p) => !swarmFiles.has(p) && !/^cards\/[^/]+\/card\.js$/.test(p));

// ---------- 1. archive ----------

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const target = join(WS, 'history', stamp);
const items = existsSync(WS) ? readdirSync(WS).filter((n) => !HISTORY.includes(n)) : [];
const generated = GEN.filter((f) => existsSync(join(ROOT, f)));
const branch = commits.length ? `my-work-${stamp}` : '';
const show = (title, xs) => {
  if (!xs.length) return;
  console.log(title);
  for (const x of xs.slice(0, 40)) console.log(`  ${x}`);
  if (xs.length > 40) console.log(`  ${T.andMore(xs.length - 40)}`);
};

console.log(DRY ? T.dryRun : '');
show(T.yourCommits(commits.length), commits);
show(T.yourChanges, tracked);
show(T.yourFiles, ownFiles);
const saving = !DRY && (commits.length || tracked.length || untracked.length);
if (saving) {
  try {
    mkdirSync(target, { recursive: true });
  } catch (e) {
    exit(T.saveFailed(target, e.message));
  }
  if (tracked.length) {
    const d = spawnSync('git', ['diff', '--binary', '--no-ext-diff', '--no-textconv', '--no-color', 'HEAD'], { cwd: ROOT, maxBuffer: 256 * 1024 * 1024 });
    if (d.status !== 0) exit(T.saveFailed('changes.patch', String(d.stderr || d.error || '')));
    writeFileSync(join(target, 'changes.patch'), d.stdout);
  }
  // Every file git clean will delete (built cards included), so nothing is lost.
  for (const p of untracked) {
    try {
      const dst = join(target, 'untracked', p);
      mkdirSync(dirname(dst), { recursive: true });
      cpSync(join(ROOT, p), dst, { recursive: true });
    } catch (e) {
      exit(T.saveFailed(p, e.message));
    }
  }
  if (commits.length) {
    const b = git('branch', branch, 'HEAD'); // a branch survives reset --hard and clean
    if (!b.ok) exit(T.saveFailed(`branch ${branch}`, b.out));
    const fp = spawnSync('git', ['format-patch', '--stdout', '--no-color', `${TAG}..HEAD`], { cwd: ROOT, maxBuffer: 256 * 1024 * 1024 });
    if (fp.status === 0) writeFileSync(join(target, 'commits.patch'), fp.stdout);
  }
}
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

if (saving && (commits.length || tracked.length || ownFiles.length)) console.log(T.saved(stamp, [tracked.length && 'changes.patch', commits.length && 'commits.patch', untracked.length && 'untracked/'].filter(Boolean).join(', '), branch));
console.log(DRY ? T.runWithout : T.done);
