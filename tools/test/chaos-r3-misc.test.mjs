// Chaos round 2 (R3-misc): o desinstalar com um settings.json so de leitura (Nix/home-manager) e a montagem
// interrompida a meio de apagar a copia incompleta do kit.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { clearForAssembly, writeIncompleteMark } from '../../installer/lib/kit-repo.mjs';
import { writeAtomic } from '../../installer/lib/fsx.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const IU = join(ROOT, 'installer', 'install-user.mjs');
const posix = process.platform !== 'win32';

function fakeKit(base) {
  const k = join(base, 'kit src');
  for (const d of ['hooks/lib', 'orchestrator/lib', 'statusline', 'skills-prod/task-plan', 'agents/prod', 'setup']) mkdirSync(join(k, d), { recursive: true });
  writeFileSync(join(k, 'hooks/subagent-stop.mjs'), '// hook\n');
  writeFileSync(join(k, 'hooks/stop.mjs'), '// hook\n');
  writeFileSync(join(k, 'hooks/lib/cost.mjs'), 'export {};\n');
  writeFileSync(join(k, 'orchestrator/next-wave.mjs'), 'import "../hooks/lib/cost.mjs";\n');
  writeFileSync(join(k, 'statusline/statusline.mjs'), '// sl\n');
  writeFileSync(join(k, 'pricing.json'), '{"modelos":{}}\n');
  writeFileSync(join(k, 'repos.conf'), 'WORKSHOP_VERSION=v9.9.9-teste\n');
  writeFileSync(join(k, 'skills-prod/task-plan/SKILL.md'), '---\nname: task-plan\n---\nKit em {{KIT_DIR}}.\n');
  writeFileSync(join(k, 'agents/prod/ws-worker.md'), '---\nname: ws-worker\n---\nKit em {{KIT_DIR}}.\n');
  return k;
}

function run(home, args) {
  const r = spawnSync(process.execPath, [IU, ...args], {
    encoding: 'utf8',
    env: { PATH: process.env.PATH, HOME: home, USERPROFILE: home, CLAUDE_CONFIG_DIR: join(home, '.claude') },
  });
  const kv = r.stdout.split('\n').filter(Boolean).map((l) => l.split('\t'));
  return { ...r, kv, get: (k) => kv.filter((x) => x[0] === k).map((x) => x[1]) };
}

test('R3-misc: um settings.json 444 (Nix) desinstala por inteiro; sem o poder repor, nao apaga mais nada (saida 5)', { skip: !posix }, () => {
  const base = mkdtempSync(join(tmpdir(), 'ws-r3-'));
  try {
    const home = join(base, 'Bea Teste');
    const claude = join(home, '.claude');
    mkdirSync(claude, { recursive: true });
    const settings = join(claude, 'settings.json');
    writeFileSync(settings, '{"model":"opus"}\n');
    chmodSync(settings, 0o444);
    const kit = fakeKit(base);
    let r = run(home, ['instalar', '--node', process.execPath, '--kit-src', kit]);
    assert.equal(r.status, 0, r.stderr);
    assert.ok(statSync(settings).mode & 0o200, 'a copia por cima de um 444 fica com escrita para o dono');
    // de volta a 444 (o home-manager volta a pô-lo assim) e desinstalar: troca-se por rename, tudo sai
    chmodSync(settings, 0o444);
    r = run(home, ['desinstalar']);
    assert.equal(r.status, 0, r.stderr + r.stdout);
    assert.deepEqual(r.get('settings'), ['reposto']);
    assert.equal(JSON.parse(readFileSync(settings, 'utf8')).model, 'opus');
    assert.ok(!existsSync(join(home, '.workshop-claude', 'manifest.json')));
    assert.ok(!existsSync(join(claude, 'skills', 'task-plan')));

    // Sem escrita na pasta do settings.json: erro, saida 5, e o kit, as skills e o manifest ficam para repetir.
    // (outro HOME: os backups tem a hora ao segundo no nome)
    rmSync(home, { recursive: true, force: true });
    mkdirSync(claude, { recursive: true });
    writeFileSync(settings, '{"model":"opus"}\n');
    r = run(home, ['instalar', '--node', process.execPath, '--kit-src', kit]);
    assert.equal(r.status, 0, r.stderr);
    chmodSync(settings, 0o444);
    chmodSync(claude, 0o555);
    try {
      r = run(home, ['desinstalar']);
    } finally {
      chmodSync(claude, 0o755);
    }
    assert.equal(r.status, 5, r.stdout);
    assert.match(r.get('erro')[0] || '', /^settings: /);
    assert.ok(existsSync(join(home, '.workshop-claude', 'manifest.json')), 'o manifest fica para repetir');
    assert.ok(existsSync(join(home, '.workshop-claude', 'kit')), 'o kit fica (os hooks apontam para ele)');
    assert.ok(existsSync(join(claude, 'skills', 'task-plan')));
    // depois de corrigir, o mesmo comando acaba o trabalho
    r = run(home, ['desinstalar']);
    assert.equal(r.status, 0, r.stderr + r.stdout);
    assert.ok(!existsSync(join(home, '.workshop-claude', 'manifest.json')));
  } finally {
    try { chmodSync(join(base, 'Bea Teste', '.claude'), 0o755); } catch { /* ja apagado */ }
    rmSync(base, { recursive: true, force: true });
  }
});

test('R3-misc: writeAtomic mantem as permissoes (600) e da escrita ao dono de um 444', { skip: !posix }, () => {
  const base = mkdtempSync(join(tmpdir(), 'ws-r3-'));
  try {
    const a = join(base, 'a.json');
    writeFileSync(a, '1');
    chmodSync(a, 0o600);
    writeAtomic(a, '2');
    assert.equal(statSync(a).mode & 0o777, 0o600);
    chmodSync(a, 0o444);
    writeAtomic(a, '3');
    assert.equal(statSync(a).mode & 0o777, 0o644);
    assert.equal(readFileSync(a, 'utf8'), '3');
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('R3-misc: clearForAssembly apaga a marca da copia incompleta por ultimo (nunca fica uma pasta sem marca)', { skip: !posix }, () => {
  const base = mkdtempSync(join(tmpdir(), 'ws-r3-'));
  const dest = join(base, 'demo-project');
  const locked = join(dest, 'aaa-locked');
  try {
    // Uma entrada que nao se consegue apagar faz o rmSync parar a meio, como um Ctrl-C: a marca tem de ficar.
    mkdirSync(join(dest, 'cards'), { recursive: true });
    writeFileSync(join(dest, 'cards', 'c1.md'), 'x');
    mkdirSync(locked);
    writeFileSync(join(locked, 'f'), 'x');
    writeFileSync(join(dest, 'server.js'), 'x');
    const mark = join(dest, '.arena-kit.json');
    writeIncompleteMark(mark, 'en');
    chmodSync(locked, 0o555);
    assert.throws(() => clearForAssembly(dest, mark));
    assert.ok(existsSync(mark), 'a marca "incomplete" ficou: o setup volta a reconhecer a copia do kit');
    assert.match(readFileSync(mark, 'utf8'), /"incomplete"/);
    chmodSync(locked, 0o755);
    assert.equal(clearForAssembly(dest, mark), null);
    assert.ok(!existsSync(dest));
  } finally {
    try { chmodSync(locked, 0o755); } catch { /* ja apagado */ }
    rmSync(base, { recursive: true, force: true });
  }
});
