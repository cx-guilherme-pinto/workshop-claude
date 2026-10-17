// Teste de integracao do installer/install-user.mjs num HOME temporario com espaco e acentos.
// Corre o instalador como processo (igual ao que os scripts de setup fazem).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  chmodSync,
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const IU = join(ROOT, 'installer', 'install-user.mjs');

function fakeKit(base) {
  // Kit minimo e controlado: 1 skill prod, 1 skill partilhada, 1 agente, motor e pricing.
  const k = join(base, 'kit src');
  for (const d of ['hooks/lib', 'orchestrator/lib', 'statusline', 'skills-prod/task-plan', 'skills-shared/design', 'agents/prod', 'setup']) mkdirSync(join(k, d), { recursive: true });
  writeFileSync(join(k, 'hooks/subagent-stop.mjs'), '// hook\n');
  writeFileSync(join(k, 'hooks/stop.mjs'), '// hook\n');
  writeFileSync(join(k, 'hooks/lib/cost.mjs'), 'export {};\n');
  writeFileSync(join(k, 'orchestrator/next-wave.mjs'), 'import "../hooks/lib/cost.mjs";\n');
  writeFileSync(join(k, 'statusline/statusline.mjs'), '// sl\n');
  writeFileSync(join(k, 'pricing.json'), '{"modelos":{}}\n');
  writeFileSync(join(k, 'repos.conf'), 'WORKSHOP_VERSION=v9.9.9-teste\n');
  writeFileSync(join(k, 'skills-prod/task-plan/SKILL.md'), '---\nname: task-plan\n---\nCorre `node "{{KIT_DIR}}/orchestrator/next-wave.mjs"`.\n');
  writeFileSync(join(k, 'skills-shared/design/SKILL.md'), '---\nname: design\n---\nSem marcadores.\n');
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

const ORIGINAL = JSON.stringify(
  { model: 'claude-sonnet-5-5', statusLine: { type: 'command', command: 'echo minha' }, hooks: { Stop: [{ hooks: [{ type: 'command', command: 'echo meu' }] }] }, env: { MEU: '1' } },
  null,
  4,
);

test('instalar, verificar, repetir e desinstalar num HOME com espaco e acentos', () => {
  const base = mkdtempSync(join(tmpdir(), 'ws-iu-'));
  const home = join(base, 'João Silva');
  const kit = fakeKit(base);
  const claude = join(home, '.claude');
  mkdirSync(join(claude, 'skills', 'design'), { recursive: true });
  writeFileSync(join(claude, 'skills', 'design', 'SKILL.md'), 'skill da pessoa com o mesmo nome\n');
  writeFileSync(join(claude, 'settings.json'), ORIGINAL);
  const node = process.execPath;
  try {
    let r = run(home, ['verificar', '--node', node, '--kit-src', kit]);
    assert.equal(r.status, 1, 'antes de instalar: em falta');

    r = run(home, ['instalar', '--node', node, '--kit-src', kit, '--https-proxy', 'http://proxy.empresa:8080']);
    assert.equal(r.status, 0, r.stderr);
    assert.deepEqual(r.get('skills'), ['2']);
    assert.deepEqual(r.get('agentes'), ['1']);
    assert.deepEqual(r.get('aviso'), ['E-CFG-06'], 'statusline alheia mantida com aviso');

    const kitDir = join(home, '.workshop-claude', 'kit');
    assert.ok(existsSync(join(kitDir, 'orchestrator', 'next-wave.mjs')));
    assert.ok(existsSync(join(kitDir, 'hooks', 'lib', 'cost.mjs')), 'mesma estrutura relativa (../hooks/lib)');
    const skill = readFileSync(join(claude, 'skills', 'task-plan', 'SKILL.md'), 'utf8');
    assert.ok(skill.includes(`node "${kitDir.replace(/\\/g, '/')}/orchestrator/next-wave.mjs"`), skill);
    assert.ok(!skill.includes('{{KIT_DIR}}'));
    assert.ok(readFileSync(join(claude, 'agents', 'ws-worker.md'), 'utf8').includes(kitDir.replace(/\\/g, '/')));
    assert.equal(readFileSync(join(claude, 'skills', 'design', 'SKILL.md'), 'utf8'), '---\nname: design\n---\nSem marcadores.\n');

    const s = JSON.parse(readFileSync(join(claude, 'settings.json'), 'utf8'));
    assert.equal(s.model, 'claude-sonnet-5-5');
    assert.equal(s.statusLine.command, 'echo minha');
    assert.equal(s.hooks.Stop.length, 2);
    assert.equal(s.env.MEU, '1');
    assert.equal(s.env.DISABLE_AUTOUPDATER, '1');
    assert.equal(s.env.HTTPS_PROXY, 'http://proxy.empresa:8080');
    assert.equal(s.env.NO_PROXY, 'localhost,127.0.0.1');
    assert.ok(s.hooks.SubagentStop[0].hooks[0].command.includes('João Silva/.workshop-claude/kit/hooks/subagent-stop.mjs'));
    const backups = readdirSync(join(home, '.workshop-claude', 'backup'));
    assert.ok(backups.some((f) => f.startsWith('settings-original-')), 'backup antes de escrever');

    const texto1 = readFileSync(join(claude, 'settings.json'), 'utf8');
    r = run(home, ['verificar', '--node', node, '--kit-src', kit, '--https-proxy', 'http://proxy.empresa:8080']);
    assert.equal(r.status, 0, r.stdout);
    r = run(home, ['instalar', '--node', node, '--kit-src', kit, '--https-proxy', 'http://proxy.empresa:8080']);
    assert.equal(r.status, 0);
    assert.equal(readFileSync(join(claude, 'settings.json'), 'utf8'), texto1, 'segunda instalacao nao muda nada');

    run(home, ['registar', '--tipo', 'mcp', '--nome', 'atlassian']);
    run(home, ['registar', '--tipo', 'mcp', '--nome', 'atlassian']);
    r = run(home, ['extras']);
    assert.equal(r.stdout.trim().split('\n').length, 1, 'registos sem duplicados');

    r = run(home, ['desinstalar']);
    assert.equal(r.status, 0, r.stderr);
    assert.deepEqual(r.get('settings'), ['reposto']);
    assert.equal(readFileSync(join(claude, 'settings.json'), 'utf8'), ORIGINAL, 'settings.json reposto byte a byte');
    assert.equal(readFileSync(join(claude, 'skills', 'design', 'SKILL.md'), 'utf8'), 'skill da pessoa com o mesmo nome\n', 'skill da pessoa reposta');
    assert.ok(!existsSync(join(claude, 'skills', 'task-plan')));
    assert.ok(!existsSync(join(claude, 'agents', 'ws-worker.md')));
    assert.ok(!existsSync(kitDir));
    assert.ok(!existsSync(join(home, '.workshop-claude', 'manifest.json')));
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('desinstalar depois de a pessoa mudar o settings.json remove so o que e do workshop', () => {
  const base = mkdtempSync(join(tmpdir(), 'ws-iu-'));
  const home = join(base, 'Ana Conceição');
  const kit = fakeKit(base);
  try {
    let r = run(home, ['instalar', '--node', process.execPath, '--kit-src', kit]);
    assert.equal(r.status, 0, r.stderr);
    const f = join(home, '.claude', 'settings.json');
    const s = JSON.parse(readFileSync(f, 'utf8'));
    s.theme = 'dark';
    writeFileSync(f, JSON.stringify(s, null, 2));
    r = run(home, ['desinstalar']);
    assert.deepEqual(r.get('settings'), ['limpo']);
    assert.deepEqual(JSON.parse(readFileSync(f, 'utf8')), { theme: 'dark' });
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('settings.json ligado aos dotfiles (stow): instalar, repetir, mudar e desinstalar mantem a ligacao', { skip: process.platform === 'win32' }, () => {
  const base = mkdtempSync(join(tmpdir(), 'ws-iu-'));
  const home = join(base, 'João Simões');
  const kit = fakeKit(base);
  const dot = join(home, 'dotfiles', 'claude', 'settings.json');
  const link = join(home, '.claude', 'settings.json');
  mkdirSync(dirname(dot), { recursive: true });
  mkdirSync(dirname(link), { recursive: true });
  writeFileSync(dot, ORIGINAL);
  chmodSync(dot, 0o600);
  symlinkSync('../dotfiles/claude/settings.json', link);
  try {
    let r = run(home, ['instalar', '--node', process.execPath, '--kit-src', kit]);
    assert.equal(r.status, 0, r.stderr);
    assert.ok(lstatSync(link).isSymbolicLink(), 'a ligacao fica');
    assert.match(readFileSync(dot, 'utf8'), /stop\.mjs/, 'os hooks vao para o ficheiro dos dotfiles');
    assert.equal(statSync(dot).mode & 0o777, 0o600, '600 continua 600');
    assert.deepEqual(readdirSync(dirname(dot)), ['settings.json'], 'sem ficheiros temporarios');
    r = run(home, ['instalar', '--node', process.execPath, '--kit-src', kit]);
    assert.equal(r.status, 0, r.stderr);
    assert.ok(lstatSync(link).isSymbolicLink());
    r = run(home, ['desinstalar']);
    assert.equal(r.status, 0, r.stderr);
    assert.ok(lstatSync(link).isSymbolicLink(), 'o desinstalar tambem mantem a ligacao');
    assert.equal(readFileSync(dot, 'utf8'), ORIGINAL);

    // mudado pela pessoa depois da instalacao: o desinstalar "limpo" tambem escreve atraves da ligacao
    r = run(home, ['instalar', '--node', process.execPath, '--kit-src', kit]);
    const s = JSON.parse(readFileSync(link, 'utf8'));
    writeFileSync(link, JSON.stringify({ ...s, theme: 'dark' }, null, 2));
    r = run(home, ['desinstalar']);
    assert.deepEqual(r.get('settings'), ['limpo']);
    assert.ok(lstatSync(link).isSymbolicLink());
    assert.equal(JSON.parse(readFileSync(dot, 'utf8')).theme, 'dark');
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('settings.json ligado a um ficheiro numa pasta so de leitura (Nix): a instalacao nao falha', { skip: process.platform === 'win32' || process.getuid?.() === 0 }, () => {
  const base = mkdtempSync(join(tmpdir(), 'ws-iu-'));
  const home = join(base, 'casa');
  const kit = fakeKit(base);
  const store = join(base, 'store');
  const link = join(home, '.claude', 'settings.json');
  mkdirSync(store, { recursive: true });
  mkdirSync(dirname(link), { recursive: true });
  writeFileSync(join(store, 'settings.json'), ORIGINAL);
  chmodSync(join(store, 'settings.json'), 0o444);
  chmodSync(store, 0o555);
  symlinkSync(join(store, 'settings.json'), link);
  try {
    const r = run(home, ['instalar', '--node', process.execPath, '--kit-src', kit]);
    assert.equal(r.status, 0, r.stderr);
    assert.match(readFileSync(link, 'utf8'), /stop\.mjs/);
    assert.equal(readFileSync(join(store, 'settings.json'), 'utf8'), ORIGINAL, 'o ficheiro so de leitura nao muda');
  } finally {
    chmodSync(store, 0o755);
    rmSync(base, { recursive: true, force: true });
  }
});

test('settings.json invalido: sai com 3 e nao toca em nada', () => {
  const base = mkdtempSync(join(tmpdir(), 'ws-iu-'));
  const home = join(base, 'casa');
  const kit = fakeKit(base);
  try {
    mkdirSync(join(home, '.claude'), { recursive: true });
    writeFileSync(join(home, '.claude', 'settings.json'), '{ "a": 1, }');
    const r = run(home, ['instalar', '--node', process.execPath, '--kit-src', kit]);
    assert.equal(r.status, 3);
    assert.deepEqual(r.get('erro'), ['E-CFG-05']);
    assert.equal(readFileSync(join(home, '.claude', 'settings.json'), 'utf8'), '{ "a": 1, }');
    assert.ok(!existsSync(join(home, '.workshop-claude', 'kit')));
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('o kit real instala as skills e os agentes de producao com {{KIT_DIR}} trocado', () => {
  const base = mkdtempSync(join(tmpdir(), 'ws-iu-'));
  const home = join(base, 'Zé Ninguém');
  try {
    const r = run(home, ['instalar', '--node', process.execPath, '--kit-src', ROOT]);
    assert.equal(r.status, 0, r.stderr);
    const claude = join(home, '.claude');
    for (const d of readdirSync(join(claude, 'skills'))) {
      const t = readFileSync(join(claude, 'skills', d, 'SKILL.md'), 'utf8');
      assert.ok(!t.includes('{{KIT_DIR}}'), `${d} ainda tem {{KIT_DIR}}`);
    }
    for (const a of readdirSync(join(claude, 'agents'))) assert.ok(!readFileSync(join(claude, 'agents', a), 'utf8').includes('{{KIT_DIR}}'));
    const kitDir = join(home, '.workshop-claude', 'kit');
    for (const f of ['hooks/subagent-stop.mjs', 'hooks/stop.mjs', 'statusline/statusline.mjs', 'pricing.json', 'orchestrator/next-wave.mjs']) {
      assert.ok(existsSync(join(kitDir, f)), f);
    }
    const n = spawnSync(process.execPath, ['-e', `import(${JSON.stringify('file://' + join(kitDir, 'orchestrator', 'next-wave.mjs'))}).catch(e=>{if(/Cannot find module|ERR_MODULE_NOT_FOUND/.test(String(e)))process.exit(9)})`], { encoding: 'utf8', input: '' });
    assert.notEqual(n.status, 9, 'the orchestrator relative imports resolve inside the kit');
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('--lingua-maquina grava language.json do kit e a language do Claude Code (so se nao houver) e o desinstalar tira-a', () => {
  const base = mkdtempSync(join(tmpdir(), 'ws-iu-lingua-'));
  const home = join(base, 'Dana Levi');
  const kit = fakeKit(base);
  const claude = join(home, '.claude');
  const node = process.execPath;
  mkdirSync(claude, { recursive: true });
  writeFileSync(join(claude, 'settings.json'), '{"model":"claude-sonnet-5-5"}\n');
  const lingua = () => JSON.parse(readFileSync(join(home, '.workshop-claude', 'kit', 'language.json'), 'utf8'));
  const settings = () => JSON.parse(readFileSync(join(claude, 'settings.json'), 'utf8'));
  try {
    let r = run(home, ['instalar', '--node', node, '--kit-src', kit, '--lingua-maquina', 'he-IL']);
    assert.equal(r.status, 0, r.stderr);
    assert.deepEqual(lingua(), { language: 'en', machine: 'he-IL' });
    assert.equal(settings().language, 'Hebrew');
    assert.deepEqual([r.get('lingua'), r.get('lingua_kit'), r.get('language'), r.get('language_nossa')], [['he-IL'], ['en'], ['Hebrew'], ['1']]);

    r = run(home, ['verificar', '--node', node, '--kit-src', kit, '--lingua-maquina', 'he-IL']);
    assert.equal(r.status, 0, r.stdout);
    r = run(home, ['verificar', '--node', node, '--kit-src', kit, '--lingua-maquina', 'pt-PT']);
    assert.equal(r.status, 1, 'a maquina passou a portugues: o kit tem de ser reinstalado');
    assert.ok(r.get('falta').some((f) => f.startsWith('lingua do kit')), r.stdout);

    r = run(home, ['instalar', '--node', node, '--kit-src', kit, '--lingua-maquina', 'pt_PT.UTF-8']);
    assert.deepEqual(lingua(), { language: 'pt', machine: 'pt-PT' });
    assert.equal(settings().language, 'European Portuguese', 'a nossa acompanha a maquina');

    writeFileSync(join(claude, 'settings.json'), JSON.stringify({ ...settings(), language: 'japanese' }));
    r = run(home, ['instalar', '--node', node, '--kit-src', kit, '--lingua-maquina', 'en-US']);
    assert.equal(settings().language, 'japanese', 'a da pessoa nao se toca');
    assert.deepEqual(r.get('language_nossa'), ['0']);

    writeFileSync(join(claude, 'settings.json'), JSON.stringify({ ...settings(), language: 'English' }));
    r = run(home, ['desinstalar']);
    assert.equal(r.status, 0, r.stderr);
    assert.equal(settings().language, 'English', 'mudada pela pessoa depois da instalacao: o desinstalar nao lhe toca');
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});
