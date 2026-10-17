// Testes do installer/assemble-demo.mjs: lingua da Arena (pt/en), copia sem i18n/, sobreposicao inglesa,
// ficheiros gerados e coerencia entre as traducoes do codigo (demo-project/i18n/en/) e o original.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, dirname, relative, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { args, linguaArena, montar } from '../../installer/assemble-demo.mjs';
import { hostileGitHome } from './hostile-git.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DEMO = join(ROOT, 'demo-project');
const EN = join(DEMO, 'i18n', 'en');
const temEn = existsSync(join(EN, 'specs', 'cards.json'));

const ler = (p) => readFileSync(p, 'utf8');
// Arena files that got English names in v1.0.0-rc.2 (the Arena area renames them): the first one that exists.
const NOMES = {
  textos: ['lib/texts.js', 'lib/textos.js'],
  estadoHtml: ['public/status.html', 'public/estado.html'],
  paginaCategoria: ['pages/category.test.js', 'pages/categoria.test.js'],
  paginaPontuacao: ['pages/score.test.js', 'pages/pontuacao.test.js'],
};
const nome = (k) => NOMES[k].find((f) => existsSync(join(DEMO, f))) ?? NOMES[k][0];
const lerJson = (p) => JSON.parse(ler(p));
const semLingua = () => Object.fromEntries(Object.entries(process.env).filter(([k]) => k !== 'WORKSHOP_LANG'));

function ficheiros(dir, out = []) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) ficheiros(p, out);
    else out.push(relative(EN, p).split(sep).join('/'));
  }
  return out;
}

function montarEm(l) {
  const dest = join(mkdtempSync(join(tmpdir(), `arena-${l}-`)), 'arena');
  const r = montar({ dest, node: process.execPath, git: false, probe: false, lingua: l });
  return { dest, r, limpar: () => rmSync(dirname(dest), { recursive: true, force: true }) };
}

function correr(cwd, script, ...a) {
  return spawnSync(process.execPath, [script, ...a], { cwd, encoding: 'utf8', env: semLingua() });
}

test('linguaArena: WORKSHOP_LANG, then the kit language.json, then the locale', () => {
  const vazio = mkdtempSync(join(tmpdir(), 'arena-kit-'));
  try {
    assert.equal(linguaArena({ env: { WORKSHOP_LANG: 'en', LANG: 'pt_PT.UTF-8' }, raiz: vazio }), 'en');
    assert.equal(linguaArena({ env: { WORKSHOP_LANG: 'pt_BR.UTF-8' }, raiz: vazio }), 'pt');
    assert.equal(linguaArena({ env: { LANG: 'pt_PT.UTF-8' }, raiz: vazio }), 'pt');
    assert.equal(linguaArena({ env: { LC_ALL: 'he_IL.UTF-8', LANG: 'pt_PT.UTF-8' }, raiz: vazio }), 'en');
    writeFileSync(join(vazio, 'language.json'), '{"language":"pt"}');
    assert.equal(linguaArena({ env: { LANG: 'en_US.UTF-8' }, raiz: vazio }), 'pt');
    assert.equal(linguaArena({ env: { WORKSHOP_LANG: 'en' }, raiz: vazio }), 'en');
  } finally {
    rmSync(vazio, { recursive: true, force: true });
  }
});

test('args: --language takes pt, en and locale tags; empty is an error; --lingua still works', () => {
  assert.equal(args(['--dest', 'x', '--language', 'en']).lingua, 'en');
  assert.equal(args(['--dest', 'x', '--language', 'pt-PT']).lingua, 'pt');
  assert.equal(args(['--dest', 'x', '--lingua', 'en']).lingua, 'en');
  assert.equal(args(['--dest', 'x']).lingua, null);
  assert.throws(() => args(['--dest', 'x', '--language']), /--language/);
  assert.throws(() => args(['--dest', 'x', '--language', 'C']), /--language/);
  assert.equal(args(['--dest', 'x', '--no-git']).git, false);
});

test('Arena em pt: igual a demo-project/ (sem i18n/), com a lingua gravada', () => {
  const { dest, r, limpar } = montarEm('pt');
  try {
    assert.equal(r.language, 'pt');
    assert.equal(lerJson(join(dest, '.arena-kit.json')).language, 'pt');
    assert.deepEqual(lerJson(join(dest, 'tools', 'workshop', 'language.json')), { language: 'pt' });
    assert.ok(existsSync(join(dest, 'tools', 'workshop', 'orchestrator', 'next-wave.mjs')));
    assert.ok(!existsSync(join(dest, 'tools', 'workshop', 'orquestrador')));
    // The kit's own tests stay out ("node --test" in the Arena runs only the Arena's tests).
    for (const d of ['hooks', 'orchestrator']) assert.ok(!existsSync(join(dest, 'tools', 'workshop', d, 'test')), `tools/workshop/${d}/test`);
    assert.ok(existsSync(join(dest, 'tools', 'workshop', 'hooks', 'lib', 'cost.mjs')));
    assert.ok(!existsSync(join(dest, 'i18n')), 'i18n/ nao entra na Arena');
    for (const f of ['TASKS.md', 'README.md', 'specs/cards.json', 'cards/pw-01/spec.md', 'cards/pw-01/card.test.js', nome('textos'), 'public/index.html', nome('paginaCategoria')]) {
      assert.equal(ler(join(dest, f)), ler(join(DEMO, f)), `${f} mudou na Arena em pt`);
    }
    const p = correr(dest, 'tools/reset.mjs', '--sim');
    assert.match(p.stderr, /^Recusado: esta pasta não é um repositório git\./);
  } finally {
    limpar();
  }
});

test('Arena em en: sobreposicao de i18n/en/, cartoes e TASKS.md gerados em ingles', { skip: !temEn && 'sem demo-project/i18n/en/specs/cards.json' }, () => {
  const { dest, r, limpar } = montarEm('en');
  try {
    assert.equal(r.language, 'en');
    assert.equal(lerJson(join(dest, '.arena-kit.json')).language, 'en');
    assert.deepEqual(lerJson(join(dest, 'tools', 'workshop', 'language.json')), { language: 'en' });
    assert.ok(!existsSync(join(dest, 'i18n')), 'i18n/ nao entra na Arena');
    for (const f of ficheiros(EN)) assert.equal(ler(join(dest, f)), ler(join(EN, f)), `${f} devia vir de i18n/en/`);
    assert.ok(ler(join(dest, 'TASKS.md')).startsWith('# TASKS — Security Arena\n'));
    assert.ok(ler(join(dest, 'cards', 'pw-01', 'spec.md')).startsWith('# Card pw-01 — '));
    assert.match(ler(join(dest, 'cards', 'pw-01', 'card.test.js')), /test\('pw-01: card\.js exists and loads'/);
    assert.equal(correr(dest, 'tools/gen.mjs', '--check').status, 0, 'os ficheiros gerados estao atualizados');
    // The tools read tools/workshop/language.json.
    const p = correr(dest, 'tools/reset.mjs', '--sim');
    assert.match(p.stderr, /^Refused: this folder is not a git repository\./);
    const plano = correr(dest, 'tools/plan.mjs');
    assert.equal(plano.status, 0, plano.stderr);
    // PLAN.md (PLANO.md before the rename) and the plan keys in either schema (the orchestrator reads both).
    const planMd = existsSync(join(dest, 'PLAN.md')) ? 'PLAN.md' : 'PLANO.md';
    assert.ok(ler(join(dest, planMd)).startsWith('# Arena plan — participant mode\n'));
    assert.match(ler(join(dest, 'plan.json')), /"(instructions|instrucoes)": "Build the card pw-01/);
    // A app em ingles passa os proprios testes (servidor, CSP, HTML sem inline).
    const app = spawnSync(process.execPath, ['--test', 'test/app.test.js'], { cwd: dest, encoding: 'utf8', env: semLingua() });
    assert.equal(app.status, 0, app.stdout.slice(-2000));
  } finally {
    limpar();
  }
});

// ---------- coerencia das traducoes do codigo ----------

function forma(v) {
  if (typeof v === 'function') return `fn/${v.length}`;
  if (v && typeof v === 'object') return Object.fromEntries(Object.keys(v).sort().map((k) => [k, forma(v[k])]));
  return typeof v;
}

test('i18n/en: cada ficheiro substitui um ficheiro que existe em demo-project/', () => {
  for (const f of ficheiros(EN)) assert.ok(existsSync(join(DEMO, f)), `i18n/en/${f} nao tem original em demo-project/${f}`);
});

test('lib/texts.js: a versao inglesa tem as mesmas chaves (e os mesmos argumentos)', async () => {
  const pt = await import(pathToFileURL(join(DEMO, nome('textos'))).href);
  const en = await import(pathToFileURL(join(EN, nome('textos'))).href);
  assert.equal(pt.LANG ?? pt.LINGUA, 'pt');
  assert.equal(en.LANG ?? en.LINGUA, 'en');
  assert.deepEqual(forma(en.T), forma(pt.T));
});

test('HTML ingles: a mesma estrutura (ids, data-*, scripts e estilos) e lang="en"', () => {
  const estrutura = (src) => [...src.matchAll(/\s(id|data-[a-z-]+|src|href|rel|class)="([^"]*)"/g)].map((m) => `${m[1]}=${m[2]}`);
  for (const f of ['public/index.html', nome('estadoHtml')]) {
    const pt = ler(join(DEMO, f));
    const en = ler(join(EN, f));
    assert.match(pt, /<html lang="pt-PT"/);
    assert.match(en, /<html lang="en"/);
    assert.deepEqual(estrutura(en), estrutura(pt), `${f}: a estrutura mudou numa das versoes`);
  }
});

test('testes ingleses: os mesmos testes que os portugueses', () => {
  const conta = (src) => (src.match(/^\s*test\(/gm) || []).length;
  for (const f of [nome('paginaCategoria'), nome('paginaPontuacao'), 'lib/hash.test.js']) {
    assert.equal(conta(ler(join(EN, f))), conta(ler(join(DEMO, f))), `${f}: numero de testes diferente`);
  }
});

// ---------- chaos G5: interrupted copies, the person's work and a hostile global git config ----------

const AD = join(ROOT, 'installer', 'assemble-demo.mjs');

// The assembler as the setup runs it (a process), with a temporary HOME for the backups and no system gitconfig.
function montarProc(base, args, extraEnv = {}) {
  if (!existsSync(join(base, 'empty-gitconfig'))) writeFileSync(join(base, 'empty-gitconfig'), '');
  const env = { ...semLingua(), GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: join(base, 'empty-gitconfig'), WS_HOME_OVERRIDE: join(base, 'home'), ...extraEnv };
  delete env.NODE_TEST_CONTEXT;
  const r = spawnSync(process.execPath, [AD, ...args], { encoding: 'utf8', env });
  let out = null;
  try {
    out = JSON.parse(r.stdout.trim().split('\n').pop());
  } catch {
    /* no JSON: error */
  }
  const git = (...a) => spawnSync('git', a, { cwd: args[args.indexOf('--dest') + 1], encoding: 'utf8', env });
  return { ...r, out, env, git };
}

function ficheirosEm(dir, rel = '', out = []) {
  for (const e of readdirSync(join(dir, rel), { withFileTypes: true })) {
    if (e.name === '.git') continue;
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) ficheirosEm(dir, r, out);
    else out.push(r);
  }
  return out;
}

test('chaos G5: a hostile global git config does not break, sign or shrink the Arena', () => {
  const base = mkdtempSync(join(tmpdir(), 'arena-hostil-'));
  try {
    const h = hostileGitHome(join(base, 'git'));
    const dest = join(base, 'demo-project');
    const r = montarProc(base, ['--dest', dest, '--language', 'pt'], h.env);
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.out.status, 'assembled');
    // Everything on disk is in the commit (.workshop/ is empty and ignored by the Arena's own .gitignore).
    assert.deepEqual(r.git('ls-files').stdout.trim().split('\n').sort(), ficheirosEm(dest).sort());
    assert.equal(r.git('cat-file', '-t', 'arena-start').stdout.trim(), 'commit', 'lightweight tag, not a signed one');
    assert.equal(r.git('rev-parse', '--abbrev-ref', 'HEAD').stdout.trim(), 'main');
    assert.ok(!existsSync(h.ran), 'no hook of the person ran');
    // /demo-reset with the person's config: restores a changed file and deletes a new .js file.
    writeFileSync(join(dest, 'lib', 'hash.js'), '// changed\n');
    writeFileSync(join(dest, 'lib', 'extra.js'), '// new\n');
    const reset = spawnSync(process.execPath, ['tools/reset.mjs'], { cwd: dest, encoding: 'utf8', env: r.env });
    assert.equal(reset.status, 0, reset.stderr);
    assert.equal(r.git('status', '--porcelain', '--untracked-files=all').stdout, '');
    assert.ok(!existsSync(join(dest, 'lib', 'extra.js')));
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('chaos G5: an interrupted copy (incomplete marker) is rebuilt; --force keeps an Arena with work in the backup', () => {
  const base = mkdtempSync(join(tmpdir(), 'arena-rerun-'));
  try {
    const dest = join(base, 'demo-project');
    mkdirSync(join(dest, 'cards'), { recursive: true });
    writeFileSync(join(dest, '.arena-kit.json'), JSON.stringify({ status: 'incomplete', language: 'pt' }) + '\n');
    writeFileSync(join(dest, 'README.md'), 'half\n');
    let r = montarProc(base, ['--dest', dest, '--language', 'pt']);
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.out.status, 'assembled');
    assert.equal(r.out.backup, undefined, 'the kit\'s own half copy is not kept');
    assert.equal(r.git('rev-parse', '-q', '--verify', 'refs/tags/arena-start').status, 0);
    assert.notEqual(lerJson(join(dest, '.arena-kit.json')).status, 'incomplete');
    // The person's own history (a commit, no tag) and an untracked note: --force moves it all to the backup.
    writeFileSync(join(dest, 'MY-NOTES.md'), 'mine\n');
    r.git('tag', '-d', 'arena-start');
    r.git('commit', '-q', '--allow-empty', '-m', 'my own history');
    r = montarProc(base, ['--dest', dest, '--language', 'pt', '--force']);
    assert.equal(r.status, 0, r.stderr);
    assert.ok(r.out.backup && r.out.backup.startsWith(join(base, 'home').replace(/\\/g, '/')), JSON.stringify(r.out));
    assert.equal(readFileSync(join(r.out.backup, 'MY-NOTES.md'), 'utf8'), 'mine\n');
    assert.equal(spawnSync('git', ['log', '-1', '--format=%s'], { cwd: r.out.backup, encoding: 'utf8', env: r.env }).stdout.trim(), 'my own history');
    assert.ok(!existsSync(join(dest, 'MY-NOTES.md')));
    assert.equal(r.git('rev-parse', '-q', '--verify', 'refs/tags/arena-start').status, 0);
    // Without --force, a finished Arena stays as it is.
    r = montarProc(base, ['--dest', dest, '--language', 'en']);
    assert.equal(r.out.status, 'already_there');
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

// ---------- chaos round 2 (R4-arena): /demo-reset after the participant's own work; tools/routine.mjs ----------

test("chaos R4: reset.mjs saves the participant's commits, edits and files first, and a locked index changes nothing", () => {
  const base = mkdtempSync(join(tmpdir(), "arena-reset-Zé d'Ávila-"));
  try {
    const dest = join(base, 'demo-project');
    const r = montarProc(base, ['--dest', dest, '--language', 'en']);
    assert.equal(r.status, 0, r.stderr);
    const g = (...a) => r.git('-c', 'user.name=T', '-c', 'user.email=t@t.invalid', ...a);
    writeFileSync(join(dest, 'README.md'), ler(join(dest, 'README.md')) + '\nmy tweak\n');
    g('commit', '-qam', 'my tweak');
    writeFileSync(join(dest, 'server.js'), ler(join(dest, 'server.js')) + '// my edit\n');
    writeFileSync(join(dest, 'NOTES.md'), 'my notes\n');
    mkdirSync(join(dest, 'my experiments'));
    writeFileSync(join(dest, 'my experiments', 'x é.js'), 'x\n');
    mkdirSync(join(dest, '.workshop', 'status'), { recursive: true });
    writeFileSync(join(dest, '.workshop', 'run.json'), '{}');
    const reset = (...a) => spawnSync(process.execPath, ['tools/reset.mjs', ...a], { cwd: dest, encoding: 'utf8', env: r.env });
    // The dry run names them.
    let p = reset('--dry-run');
    assert.equal(p.status, 0, p.stderr);
    assert.match(p.stdout, /1 commit\(s\) after arena-start[^\n]*\n {2}\w+ my tweak\n/);
    assert.match(p.stdout, /changed files in git[^\n]*\n {2}server\.js\n/);
    assert.match(p.stdout, /your own files outside git[^\n]*\n {2}NOTES\.md\n {2}my experiments\/x é\.js\n/);
    // A stale .git/index.lock: refused, and nothing moved.
    writeFileSync(join(dest, '.git', 'index.lock'), '');
    p = reset();
    assert.equal(p.status, 1);
    assert.match(p.stderr, /^Refused: another git is using the Arena \(\.git\/index\.lock\)/);
    assert.ok(existsSync(join(dest, '.workshop', 'run.json')));
    assert.ok(!existsSync(join(dest, '.workshop', 'history')));
    rmSync(join(dest, '.git', 'index.lock'));
    // The reset: the work is saved, then the Arena is clean.
    p = reset();
    assert.equal(p.status, 0, p.stderr);
    const [stamp] = readdirSync(join(dest, '.workshop', 'history'));
    const h = join(dest, '.workshop', 'history', stamp);
    assert.match(ler(join(h, 'changes.patch')), /\+\/\/ my edit/);
    assert.match(ler(join(h, 'commits.patch')), /my tweak/);
    assert.equal(ler(join(h, 'untracked', 'NOTES.md')), 'my notes\n');
    assert.equal(ler(join(h, 'untracked', 'my experiments', 'x é.js')), 'x\n');
    assert.ok(existsSync(join(h, 'run.json')));
    assert.equal(g('rev-parse', '-q', '--verify', `refs/heads/my-work-${stamp}`).status, 0);
    assert.match(p.stdout, new RegExp(`Your work is saved in \\.workshop/history/${stamp}/ \\(changes\\.patch, commits\\.patch, untracked/\\) and in the branch my-work-${stamp}\\.`));
    assert.equal(g('status', '--porcelain', '--untracked-files=all').stdout, '');
    assert.ok(!existsSync(join(dest, 'NOTES.md')));
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('chaos R4: routine.mjs: --sim is a dry run (never "yes"), the time is checked, and the plist quotes the path', { skip: process.platform !== 'darwin' && 'launchd only' }, () => {
  const base = mkdtempSync(join(tmpdir(), "arena-routine-Zé d'Ávila-"));
  try {
    const dest = join(base, 'demo-project');
    const r = montarProc(base, ['--dest', dest, '--language', 'en', '--no-git']);
    assert.equal(r.status, 0, r.stderr);
    const bin = join(base, 'bin');
    mkdirSync(bin);
    writeFileSync(join(bin, 'launchctl'), `#!/bin/sh\necho "$*" >> "${join(base, 'launchctl.log')}"\n`, { mode: 0o755 });
    const home = join(base, 'home');
    const env = { ...r.env, HOME: home, PATH: `${bin}:${process.env.PATH}` };
    const routine = (...a) => spawnSync(process.execPath, ['tools/routine.mjs', ...a], { cwd: dest, encoding: 'utf8', env });
    const plist = join(home, 'Library', 'LaunchAgents', 'workshop.arena-review.plist');
    for (const a of [['--install', '--sim'], ['--instalar', '--sim'], ['--install', '--sim', '--yes']]) {
      const p = routine(...a);
      assert.equal(p.status, 0, p.stderr);
      assert.match(p.stdout, /Nothing was changed\. Add --yes to install\./, a.join(' '));
      assert.ok(!existsSync(plist), a.join(' '));
    }
    for (const t of ['25:99', '23:60', '24:00']) {
      const p = routine('--install', '--time', t, '--yes');
      assert.equal(p.status, 2, t);
      assert.match(p.stderr, /invalid time \(use HH:MM, from 00:00 to 23:59\)/);
      assert.ok(!existsSync(plist), t);
    }
    assert.match(routine('--remove').stdout, /Nothing was changed\. Add --yes to remove\./);
    assert.match(routine('--remove', '--yes').stdout, /Not installed: nothing to remove\./);
    const p = routine('--install', '--time', '07:05', '--yes');
    assert.equal(p.status, 0, p.stderr);
    const xml = ler(plist);
    assert.match(xml, /<key>Hour<\/key><integer>7<\/integer><key>Minute<\/key><integer>5<\/integer>/);
    // (the path may come back through /private on the Mac)
    assert.match(xml, /<string>cd '[^<]*Zé d'\\''Ávila-[^/<]*\/demo-project' &amp;&amp; mkdir/);
    assert.match(routine('--remove', '--yes').stdout, /Removed\./);
    assert.ok(!existsSync(plist));
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});
