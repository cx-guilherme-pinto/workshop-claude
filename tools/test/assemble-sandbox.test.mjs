// Tests for installer/assemble-sandbox.mjs: assembles the Project 2 training project in pt and in en, in temporary
// folders with spaces and accents, and runs the test suite of each copy (as the participant would).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { montar } from '../../installer/assemble-sandbox.mjs';
import { gitOverrides, kitGit, KIT_GIT_CONFIG } from '../../installer/lib/kit-repo.mjs';
import { hostileGitHome } from './hostile-git.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const AS = join(ROOT, 'installer', 'assemble-sandbox.mjs');
const PROJ = join(ROOT, 'practice-project');

let base;
let env;
before(() => {
  base = mkdtempSync(join(tmpdir(), 'ws-sandbox-'));
  // git without the person's global config (signed commits, hooks); node --test without the parent's context.
  // The backups of --force go to a temporary HOME (WS_HOME_OVERRIDE), never to the real ~/.workshop-claude.
  writeFileSync(join(base, 'gitconfig'), '');
  env = { ...process.env, GIT_CONFIG_GLOBAL: join(base, 'gitconfig'), GIT_CONFIG_NOSYSTEM: '1', WS_HOME_OVERRIDE: join(base, 'home') };
  delete env.NODE_TEST_CONTEXT;
  delete env.WORKSHOP_LANG;
  Object.assign(process.env, { GIT_CONFIG_GLOBAL: env.GIT_CONFIG_GLOBAL, GIT_CONFIG_NOSYSTEM: '1', WS_HOME_OVERRIDE: env.WS_HOME_OVERRIDE });
});
after(() => rmSync(base, { recursive: true, force: true }));

function assemble(args, extraEnv = {}) {
  const r = spawnSync(process.execPath, [AS, ...args], { encoding: 'utf8', env: { ...env, ...extraEnv } });
  let out = null;
  try {
    out = JSON.parse(r.stdout.trim().split('\n').pop());
  } catch {
    /* no JSON: error */
  }
  return { ...r, out };
}

function files(dir, rel = '') {
  const out = [];
  for (const e of readdirSync(join(dir, rel), { withFileTypes: true })) {
    if (e.name === '.git') continue;
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) out.push(...files(dir, r));
    else out.push(r);
  }
  return out.sort();
}

const git = (cwd, ...a) => spawnSync('git', a, { cwd, encoding: 'utf8', env }).stdout.trim();

function runTests(cwd) {
  const r = spawnSync(process.execPath, ['--test', '--test-timeout=20000'], { cwd, encoding: 'utf8', env });
  const n = (k) => Number(new RegExp(`^\\S* ?${k} (\\d+)`, 'm').exec(r.stdout)?.[1] ?? -1);
  return { status: r.status, pass: n('pass'), fail: n('fail'), out: r.stdout + r.stderr };
}

const ESPERADO = {
  pt: { src: 'src/livros.js', commit: 'Biblioteca Municipal v0.3.0', ausente: 'src/books.js' },
  en: { src: 'src/books.js', commit: 'Municipal Library v0.3.0', ausente: 'src/livros.js' },
};

for (const l of ['pt', 'en']) {
  test(`assembles the ${l} project: no i18n/, git commit, test suite passes`, () => {
    const dest = join(base, `Projeto João ${l}`, 'practice-project');
    const r = assemble(['--dest', dest, '--language', l]);
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.out.status, 'assembled');
    assert.equal(r.out.language, l);
    assert.ok(!existsSync(join(dest, 'i18n')), 'i18n/ must not reach the participant');
    assert.ok(existsSync(join(dest, ESPERADO[l].src)));
    assert.ok(!existsSync(join(dest, ESPERADO[l].ausente)), 'no files from the other language');
    assert.equal(JSON.parse(readFileSync(join(dest, '.sandbox-kit.json'), 'utf8')).language, l);
    assert.equal(git(dest, 'log', '-1', '--format=%s'), ESPERADO[l].commit);
    assert.equal(git(dest, 'status', '--porcelain'), '', 'everything committed');
    const t = runTests(dest);
    assert.equal(t.status, 0, t.out);
    assert.ok(t.pass >= 6 && t.fail === 0, t.out);
  });
}

test('pt copy is the source project without i18n/', () => {
  const dest = join(base, 'pt-igual');
  assert.equal(assemble(['--dest', dest, '--lingua', 'pt']).status, 0);
  const fonte = files(PROJ).filter((f) => !f.startsWith('i18n/') && !/(^|\/)(\.DS_Store|node_modules)(\/|$)/.test(f));
  const copia = files(dest).filter((f) => !['.gitignore', '.sandbox-kit.json'].includes(f));
  assert.deepEqual(copia, fonte);
  for (const f of fonte) assert.equal(readFileSync(join(dest, f), 'utf8'), readFileSync(join(PROJ, f), 'utf8'), f);
});

test('the en version has the same shape as pt (same issues and fields, same number of files)', () => {
  const EN = join(PROJ, 'i18n', 'en');
  const pt = files(PROJ).filter((f) => !f.startsWith('i18n/'));
  const en = files(EN);
  const top = (lista) => lista.filter((f) => !f.includes('/'));
  const em = (lista, d) => lista.filter((f) => f.startsWith(`${d}/`));
  assert.deepEqual(top(en), top(pt));
  assert.deepEqual(em(en, 'issues'), em(pt, 'issues'));
  for (const d of ['src', 'test']) assert.equal(em(en, d).length, em(pt, d).length, `${d}/ has a file without a translation`);
  assert.deepEqual(en.filter((f) => !/^(src|test|issues)\//.test(f) && f.includes('/')), [], 'unexpected folders in i18n/en/');
  for (const f of em(pt, 'issues')) {
    const a = JSON.parse(readFileSync(join(PROJ, f), 'utf8'));
    const b = JSON.parse(readFileSync(join(EN, f), 'utf8'));
    assert.deepEqual(Object.keys(b), Object.keys(a), `${f}: same field names (the /task-intake skill reads them)`);
    assert.deepEqual(Object.keys(a), ['id', 'source', 'url', 'title', 'description', 'criteria', 'epic', 'labels'], `${f}: English field names in both languages`);
    for (const k of ['id', 'source', 'url', 'epic']) assert.equal(b[k], a[k], `${f}: ${k}`);
    assert.equal(b.criteria.length, a.criteria.length, `${f}: criteria`);
    assert.equal(b.labels.length, a.labels.length, `${f}: labels`);
  }
});

test('default language comes from WORKSHOP_LANG; existing project is kept unless --force', () => {
  const dest = join(base, 'por-defeito');
  let r = assemble(['--dest', dest], { WORKSHOP_LANG: 'en-US' });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.out.language, 'en');
  r = assemble(['--dest', dest], { WORKSHOP_LANG: 'pt-PT' });
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(r.out, { status: 'already_there', language: 'en' });
  assert.ok(existsSync(join(dest, 'src', 'books.js')));
  r = assemble(['--dest', dest, '--force'], { WORKSHOP_LANG: 'pt-PT' });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.out.language, 'pt');
  assert.ok(existsSync(join(dest, 'src', 'livros.js')) && !existsSync(join(dest, 'src', 'books.js')));
  // --force never deletes: the previous project went to the backup, with its git history.
  assert.ok(r.out.backup && r.out.backup.startsWith(env.WS_HOME_OVERRIDE.replace(/\\/g, '/')), JSON.stringify(r.out));
  assert.ok(existsSync(join(r.out.backup, 'src', 'books.js')));
  assert.equal(git(r.out.backup, 'log', '-1', '--format=%s'), ESPERADO.en.commit);
});

// ---------- chaos G5: interrupted copies, the person's work and a hostile global git config ----------

const MARCA_SB = '.sandbox-kit.json';

test('chaos G5: a hostile global git config does not break or shrink the practice project', () => {
  const h = hostileGitHome(join(base, 'hostil'));
  const dest = join(base, 'hostil', 'practice-project');
  const r = assemble(['--dest', dest, '--language', 'en'], h.env);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.out.status, 'assembled');
  const g = (...a) => spawnSync('git', a, { cwd: dest, encoding: 'utf8', env: { ...env, ...h.env } });
  // Every copied file is in the commit, even with the person's gitignore (the same view as the gate and worktrees).
  assert.deepEqual(g('ls-files').stdout.trim().split('\n').sort(), files(dest));
  assert.equal(g('rev-parse', '--abbrev-ref', 'HEAD').stdout.trim(), 'main');
  assert.equal(g('log', '-1', '--format=%G?').stdout.trim(), 'N', 'not signed');
  assert.ok(!existsSync(h.ran), 'no hook of the person ran');
  // Later git commands of the workshop (plain git, with the person's config) see the same: the repo's own config.
  writeFileSync(join(dest, 'src', 'new.js'), 'export const x = 1;\n');
  assert.match(g('status', '--porcelain', '--untracked-files=all').stdout, /src\/new\.js/);
  assert.equal(g('worktree', 'add', '-q', join(base, 'hostil', 'wt'), 'HEAD').status, 0);
  assert.equal((g('-C', join(base, 'hostil', 'wt'), 'ls-files', '--eol').stdout.match(/w\/crlf/g) || []).length, 0, 'no CRLF in worktrees');
  assert.ok(existsSync(join(base, 'hostil', 'wt', 'CLAUDE.md')));
  assert.equal(g('checkout', '-q', '-b', 'feat').status, 0);
  assert.equal(g('add', 'src/new.js').status, 0);
  assert.equal(g('commit', '-q', '-m', 'no Jira key').status, 0);
  assert.equal(g('checkout', '-q', 'main').status, 0);
  const m = g('merge', '--no-ff', '--no-edit', 'feat');
  assert.equal(m.status, 0, m.stderr);
  assert.ok(!existsSync(h.ran), 'no hook of the person ran in later commits');
});

test('chaos G5: an interrupted copy (incomplete marker) is rebuilt without --force and without a backup', () => {
  const dest = join(base, 'interrompido', 'practice-project');
  mkdirSync(join(dest, 'src'), { recursive: true });
  writeFileSync(join(dest, MARCA_SB), JSON.stringify({ status: 'incomplete', language: 'en' }) + '\n');
  writeFileSync(join(dest, 'package.json'), '{}\n');
  const r = assemble(['--dest', dest, '--language', 'en']);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.out.status, 'assembled');
  assert.equal(r.out.backup, undefined, 'the kit\'s own half copy is not kept');
  assert.notEqual(JSON.parse(readFileSync(join(dest, MARCA_SB), 'utf8')).status, 'incomplete');
  assert.equal(git(dest, 'status', '--porcelain'), '');
});

test('chaos G5: a git command that waits for a prompt (signer, editor) fails after the timeout, with no hang', { skip: process.platform === 'win32' && 'fake git is a shell script' }, () => {
  const fake = join(base, 'fake-git');
  mkdirSync(fake, { recursive: true });
  writeFileSync(join(fake, 'git'), '#!/bin/sh\nsleep 30\n', { mode: 0o755 });
  const t0 = Date.now();
  assert.throws(() => kitGit(base, ['commit', '-q', '-m', 'x'], { env: { ...env, PATH: `${fake}:${process.env.PATH}` }, timeout: 500 }), /did not finish in 1 s/);
  assert.ok(Date.now() - t0 < 10000, 'returned well before the fake git ends');
  assert.deepEqual(gitOverrides().filter((x, i) => i % 2), KIT_GIT_CONFIG.map(([k, v]) => `${k}=${v}`));
});

test('chaos G5: --force keeps the person\'s work in the backup (no .git: the setup forces a rebuild)', () => {
  const dest = join(base, 'trabalho', 'practice-project');
  assert.equal(assemble(['--dest', dest, '--language', 'en']).status, 0);
  writeFileSync(join(dest, 'MY-NOTES.md'), 'mine\n');
  rmSync(join(dest, '.git'), { recursive: true, force: true });
  const r = assemble(['--dest', dest, '--language', 'en', '--force']);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(readFileSync(join(r.out.backup, 'MY-NOTES.md'), 'utf8'), 'mine\n');
  assert.ok(!existsSync(join(dest, 'MY-NOTES.md')));
});

test('errors: missing --dest, empty --language, non-empty folder that is not a sandbox', () => {
  let r = assemble([]);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /^ERROR: /);
  r = assemble(['--dest', join(base, 'x'), '--language']);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /^ERROR: /);
  r = assemble(['--dest', join(base, 'x2'), '--lingua']);
  assert.match(r.stderr, /^ERROR: --language/, 'the older --lingua still works');
  const outra = join(base, 'outra');
  mkdirSync(outra);
  writeFileSync(join(outra, 'meu.txt'), 'meu\n');
  r = assemble(['--dest', outra, '--lingua', 'pt']);
  assert.equal(r.status, 1);
  assert.equal(readFileSync(join(outra, 'meu.txt'), 'utf8'), 'meu\n', 'the person\'s files are not touched');
});

test('kit installed under ~/.workshop-claude/... still copies the project (filter uses relative paths)', () => {
  const kit = join(base, '.workshop-claude', 'kit-src', 'v9.9.9');
  cpSync(PROJ, join(kit, 'practice-project'), { recursive: true });
  for (const l of ['pt', 'en']) {
    const dest = join(base, `instalado-${l}`);
    const r = montar({ dest, lingua: l, kit });
    assert.equal(r.status, 'assembled');
    assert.ok(existsSync(join(dest, ESPERADO[l].src)), `${l}: ${relative(base, dest)} has the project files`);
    assert.ok(!existsSync(join(dest, 'i18n')));
  }
});
