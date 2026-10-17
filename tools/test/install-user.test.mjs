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
  readlinkSync,
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

// --- chaos G3-network: instalado no escritorio (com proxy), usado no local do workshop (sem proxy)
test('o proxy gravado no escritorio sai quando o setup corre noutra rede; o verificar deteta-o', () => {
  const base = mkdtempSync(join(tmpdir(), 'ws-iu-'));
  const home = join(base, 'Bea Office');
  const kit = fakeKit(base);
  const node = process.execPath;
  const settings = () => JSON.parse(readFileSync(join(home, '.claude', 'settings.json'), 'utf8'));
  const office = ['--https-proxy', 'http://127.0.0.1:18412', '--no-proxy', 'localhost,127.0.0.1,.corp.internal'];
  try {
    let r = run(home, ['instalar', '--node', node, '--kit-src', kit, ...office]);
    assert.equal(r.status, 0, r.stderr);
    assert.equal(settings().env.HTTPS_PROXY, 'http://127.0.0.1:18412');
    assert.equal(settings().env.NO_PROXY, 'localhost,127.0.0.1,.corp.internal', 'o NO_PROXY da sessao entra junto');
    r = run(home, ['verificar', '--node', node, '--kit-src', kit, ...office]);
    assert.equal(r.status, 0, r.stdout);
    r = run(home, ['verificar', '--node', node, '--kit-src', kit]);
    assert.equal(r.status, 1, 'no local do workshop, o proxy antigo conta como por fazer (o passo 8 nao fica "ja feito")');
    r = run(home, ['instalar', '--node', node, '--kit-src', kit]);
    assert.equal(r.status, 0, r.stderr);
    assert.equal('HTTPS_PROXY' in settings().env, false, 'o proxy do escritorio saiu');
    assert.equal('NO_PROXY' in settings().env, false);
    r = run(home, ['verificar', '--node', node, '--kit-src', kit]);
    assert.equal(r.status, 0, r.stdout);
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
    assert.deepEqual(r.get('erro_detalhe'), ['not valid JSON at line 1, column 9: a comma after the last item. JSON does not allow it']);
    assert.equal(readFileSync(join(home, '.claude', 'settings.json'), 'utf8'), '{ "a": 1, }');
    assert.ok(!existsSync(join(home, '.workshop-claude', 'kit')));
    // --check: o mesmo erro, com o mesmo detalhe (antes so dizia E-CFG-05)
    const v = run(home, ['verificar', '--node', process.execPath, '--kit-src', kit]);
    assert.deepEqual(v.get('erro_detalhe'), ['not valid JSON at line 1, column 9: a comma after the last item. JSON does not allow it']);
    // tipo errado ("hooks": []) tambem no --check
    writeFileSync(join(home, '.claude', 'settings.json'), '{ "hooks": [] }');
    const h = run(home, ['verificar', '--node', process.execPath, '--kit-src', kit]);
    assert.deepEqual(h.get('erro'), ['E-CFG-05']);
    assert.deepEqual(h.get('erro_detalhe'), ['"hooks" must be an object { "Stop": [ ... ] }, not a list or text']);
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

    // pt-PT -> pt-BR: os textos do kit sao os mesmos, mas a "language" do Claude (a nossa) muda (chaos G7-language).
    r = run(home, ['verificar', '--node', node, '--kit-src', kit, '--lingua-maquina', 'pt-BR']);
    assert.equal(r.status, 1, r.stdout);
    assert.deepEqual(r.get('falta'), ['language do Claude (European Portuguese -> Brazilian Portuguese)'], r.stdout);
    r = run(home, ['instalar', '--node', node, '--kit-src', kit, '--lingua-maquina', 'pt-BR']);
    assert.deepEqual(lingua(), { language: 'pt', machine: 'pt-BR' });
    assert.equal(settings().language, 'Brazilian Portuguese');
    r = run(home, ['verificar', '--node', node, '--kit-src', kit, '--lingua-maquina', 'pt-BR']);
    assert.equal(r.status, 0, r.stdout);
    r = run(home, ['instalar', '--node', node, '--kit-src', kit, '--lingua-maquina', 'pt-PT']);
    assert.equal(settings().language, 'European Portuguese');

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

// chaos G5 (fs-arena-rerun-keeps-work): a new release (or another language) reinstalls the kit's skills and agents.
// The person's changes to them are never lost: the edited copy goes to the backup and the setup says where.
test('chaos G5: reinstalar guarda no backup as skills e agentes do kit que a pessoa alterou', () => {
  const base = mkdtempSync(join(tmpdir(), 'ws-iu-editado-'));
  const home = join(base, 'Bea Teste');
  const kit = fakeKit(base);
  const claude = join(home, '.claude');
  const node = process.execPath;
  try {
    let r = run(home, ['instalar', '--node', node, '--kit-src', kit]);
    assert.equal(r.status, 0, r.stderr);
    writeFileSync(join(claude, 'skills', 'task-plan', 'SKILL.md'), readFileSync(join(claude, 'skills', 'task-plan', 'SKILL.md'), 'utf8') + '<!-- my tweak -->\n');
    writeFileSync(join(claude, 'skills', 'task-plan', 'my-notes.md'), 'mine\n');
    writeFileSync(join(claude, 'agents', 'ws-worker.md'), readFileSync(join(claude, 'agents', 'ws-worker.md'), 'utf8') + '<!-- my agent tweak -->\n');
    writeFileSync(join(kit, 'skills-prod', 'task-plan', 'SKILL.md'), '---\nname: task-plan\n---\nversao nova\n');
    r = run(home, ['instalar', '--node', node, '--kit-src', kit]);
    assert.equal(r.status, 0, r.stderr);
    const ed = r.get('editado');
    assert.equal(ed.length, 2, r.stdout);
    const skill = ed.find((p) => p.endsWith('/skills/task-plan'));
    const agente = ed.find((p) => p.endsWith('/agents/ws-worker.md'));
    assert.ok(skill && agente, ed.join(' '));
    assert.match(readFileSync(join(skill, 'SKILL.md'), 'utf8'), /my tweak/);
    assert.equal(readFileSync(join(skill, 'my-notes.md'), 'utf8'), 'mine\n');
    assert.match(readFileSync(agente, 'utf8'), /my agent tweak/);
    assert.match(readFileSync(join(claude, 'skills', 'task-plan', 'SKILL.md'), 'utf8'), /versao nova/, 'the kit version is back');
    // Unchanged items are replaced with no backup and no note; a reinstall with no edits says nothing.
    r = run(home, ['instalar', '--node', node, '--kit-src', kit]);
    assert.deepEqual(r.get('editado'), []);
    assert.deepEqual(r.get('anteriores'), []);
    // A manifest from an older kit (no sha): nothing is deleted, the previous copies go to one backup folder.
    const mf = join(home, '.workshop-claude', 'manifest.json');
    const m = JSON.parse(readFileSync(mf, 'utf8'));
    for (const x of [...m.skills, ...m.agentes]) delete x.sha;
    writeFileSync(mf, JSON.stringify(m));
    r = run(home, ['instalar', '--node', node, '--kit-src', kit]);
    const ant = r.get('anteriores');
    assert.equal(ant.length, 1, r.stdout);
    assert.ok(existsSync(join(ant[0], 'skills', 'task-plan', 'SKILL.md')));
    assert.ok(existsSync(join(ant[0], 'agents', 'ws-worker.md')));
    // Uninstall: an edited skill is kept in the backup too.
    writeFileSync(join(claude, 'skills', 'design', 'SKILL.md'), 'edited before uninstall\n');
    r = run(home, ['desinstalar']);
    assert.equal(r.status, 0, r.stderr);
    const des = r.get('editado').find((p) => p.endsWith('/skills/design'));
    assert.ok(des, r.stdout);
    assert.equal(readFileSync(join(des, 'SKILL.md'), 'utf8'), 'edited before uninstall\n');
    assert.ok(!existsSync(join(claude, 'skills', 'task-plan')), 'unchanged items are removed');
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

// chaos round 2 R2-cfg-auth: nomes do kit que a pessoa ja usa (pastas reais, links dos dotfiles e um link pendente)
const linkOf = (p) => {
  try {
    return lstatSync(p).isSymbolicLink() ? readlinkSync(p) : null;
  } catch {
    return undefined;
  }
};

test('chaos R2: itens da pessoa com o nome de um do kit (pasta, link dos dotfiles, link pendente) vao para o backup e voltam no desinstalar', { skip: process.platform === 'win32' }, () => {
  const base = mkdtempSync(join(tmpdir(), 'ws-iu-r2-'));
  const home = join(base, 'Inês Dotfiles');
  const kit = fakeKit(base);
  const claude = join(home, '.claude');
  const node = process.execPath;
  try {
    mkdirSync(join(claude, 'skills', 'design'), { recursive: true });
    writeFileSync(join(claude, 'skills', 'design', 'SKILL.md'), 'a minha skill design\n');
    writeFileSync(join(claude, 'skills', 'design', 'nota-1.md'), 'nota\n');
    symlinkSync(join(home, 'dotfiles', 'por-montar', 'task-plan'), join(claude, 'skills', 'task-plan'));
    mkdirSync(join(home, 'dotfiles', 'agents'), { recursive: true });
    writeFileSync(join(home, 'dotfiles', 'agents', 'ws-worker.md'), 'o meu agente\n');
    mkdirSync(join(claude, 'agents'), { recursive: true });
    symlinkSync(join(home, 'dotfiles', 'agents', 'ws-worker.md'), join(claude, 'agents', 'ws-worker.md'));
    let r = run(home, ['instalar', '--node', node, '--kit-src', kit]);
    assert.equal(r.status, 0, r.stderr + r.stdout);
    assert.equal(r.get('alheio').length, 3, r.stdout);
    assert.ok(!existsSync(join(home, 'dotfiles', 'por-montar')), 'nada escrito atraves do link pendente');
    assert.equal(readFileSync(join(home, 'dotfiles', 'agents', 'ws-worker.md'), 'utf8'), 'o meu agente\n', 'o ficheiro dos dotfiles fica igual');
    assert.match(readFileSync(join(claude, 'skills', 'task-plan', 'SKILL.md'), 'utf8'), /next-wave/);
    const bk = r.get('alheio').find((p) => p.endsWith('/skills/task-plan'));
    assert.equal(linkOf(bk), join(home, 'dotfiles', 'por-montar', 'task-plan'), 'o link pendente foi movido como link');
    r = run(home, ['desinstalar']);
    assert.equal(r.status, 0, r.stderr);
    assert.equal(linkOf(join(claude, 'skills', 'task-plan')), join(home, 'dotfiles', 'por-montar', 'task-plan'));
    assert.equal(linkOf(join(claude, 'agents', 'ws-worker.md')), join(home, 'dotfiles', 'agents', 'ws-worker.md'));
    assert.equal(readFileSync(join(claude, 'skills', 'design', 'nota-1.md'), 'utf8'), 'nota\n');
    assert.equal(readFileSync(join(claude, 'skills', 'design', 'SKILL.md'), 'utf8'), 'a minha skill design\n');
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('chaos R2: uma falha a meio (pasta dos agentes so de leitura) grava no manifest o que ja ficou no sitio, e o desinstalar repoe tudo', { skip: process.platform === 'win32' || process.getuid?.() === 0 }, () => {
  const base = mkdtempSync(join(tmpdir(), 'ws-iu-r2b-'));
  const home = join(base, 'home');
  const kit = fakeKit(base);
  const claude = join(home, '.claude');
  const node = process.execPath;
  const ag = join(claude, 'agents');
  try {
    mkdirSync(join(claude, 'skills', 'design'), { recursive: true });
    writeFileSync(join(claude, 'skills', 'design', 'SKILL.md'), 'a minha skill design\n');
    symlinkSync(join(home, 'dotfiles', 'nada'), join(claude, 'skills', 'task-plan'));
    mkdirSync(ag, { recursive: true });
    writeFileSync(join(ag, 'ws-worker.md'), 'o meu agente\n');
    chmodSync(ag, 0o555);
    let r = run(home, ['instalar', '--node', node, '--kit-src', kit]);
    assert.notEqual(r.status, 0, 'o agente nao sai da pasta so de leitura');
    assert.equal(readFileSync(join(ag, 'ws-worker.md'), 'utf8'), 'o meu agente\n', 'o agente da pessoa fica');
    const m = JSON.parse(readFileSync(join(home, '.workshop-claude', 'manifest.json'), 'utf8'));
    assert.deepEqual(m.skills.map((x) => x.nome), ['task-plan', 'design'], 'as skills ja colocadas ficaram no manifest');
    assert.ok(m.skills.every((x) => x.backup), 'com o backup dos itens da pessoa');
    chmodSync(ag, 0o755);
    r = run(home, ['desinstalar']);
    assert.equal(r.status, 0, r.stderr);
    assert.equal(linkOf(join(claude, 'skills', 'task-plan')), join(home, 'dotfiles', 'nada'), 'o desinstalar repoe o link da pessoa');
    assert.equal(readFileSync(join(claude, 'skills', 'design', 'SKILL.md'), 'utf8'), 'a minha skill design\n', 'e a skill da pessoa');
  } finally {
    chmodSync(ag, 0o755);
    rmSync(base, { recursive: true, force: true });
  }
});

test('chaos R2: "disableAllHooks": true no settings.json da o aviso E-CFG-11 (instalar e verificar)', () => {
  const base = mkdtempSync(join(tmpdir(), 'ws-iu-r2c-'));
  const home = join(base, 'home');
  const kit = fakeKit(base);
  const claude = join(home, '.claude');
  const node = process.execPath;
  try {
    mkdirSync(claude, { recursive: true });
    writeFileSync(join(claude, 'settings.json'), JSON.stringify({ disableAllHooks: true }));
    let r = run(home, ['instalar', '--node', node, '--kit-src', kit]);
    assert.equal(r.status, 0, r.stderr);
    assert.deepEqual(r.get('aviso'), ['E-CFG-11']);
    assert.equal(JSON.parse(readFileSync(join(claude, 'settings.json'), 'utf8')).disableAllHooks, true, 'a escolha da pessoa fica');
    r = run(home, ['verificar', '--node', node, '--kit-src', kit]);
    assert.equal(r.status, 0, r.stdout);
    assert.deepEqual(r.get('aviso'), ['E-CFG-11']);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});
