// The short workshop commands (installer/lib/commands.mjs): install-user.mjs writes them in ~/.workshop-claude/bin,
// they run the kit's scripts from any folder, the Windows .cmd files are ASCII only (also with an accented user
// name) and desinstalar removes them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { COMMANDS, installCommands } from '../../installer/lib/commands.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

test('install-user instalar writes the short commands, they run from any folder, desinstalar removes them', () => {
  const home = mkdtempSync(join(tmpdir(), 'ws-cmd-'));
  const env = { PATH: process.env.PATH, HOME: home, USERPROFILE: home, WS_HOME_OVERRIDE: home };
  const iu = (...a) => spawnSync(process.execPath, [join(ROOT, 'installer', 'install-user.mjs'), ...a], { env, encoding: 'utf8' });
  try {
    const projs = join(home, 'workshop-claude');
    // a Pocketknife with a gen.mjs that says where it runs
    mkdirSync(join(projs, 'canivete-project', 'tools'), { recursive: true });
    writeFileSync(join(projs, 'canivete-project', 'tools', 'gen.mjs'), 'console.log("gen in " + process.cwd() + " " + process.argv.slice(2).join(" "))\n');
    assert.equal(iu('instalar', '--node', process.execPath, '--kit-src', ROOT, '--projects-dir', projs).status, 0);
    const bin = join(home, '.workshop-claude', 'bin');
    if (process.platform !== 'win32') {
      assert.deepEqual(readdirSync(bin).sort(), Object.keys(COMMANDS).sort());
      for (const f of readdirSync(bin)) assert.ok(statSync(join(bin, f)).mode & 0o100, `${f} is executable`);
      const run = (c, ...a) => spawnSync(join(bin, c), a, { env, cwd: tmpdir(), encoding: 'utf8' });
      assert.match(run('workshop-status').stdout, /not registered on the panel yet|ainda não estás registado/i);
      assert.match(run('workshop-status').stdout, /workshop-register/, 'the message says the short command');
      const g = run('workshop-gen', '--check');
      assert.match(g.stdout, /gen in .*canivete-project --check/, 'workshop-gen runs in the Pocketknife, from any folder');
    }
    const man = JSON.parse(readFileSync(join(home, '.workshop-claude', 'manifest.json'), 'utf8'));
    assert.equal(man.comandos.length, Object.keys(COMMANDS).length);
    assert.equal(iu('desinstalar').status, 0);
    for (const f of man.comandos) assert.ok(!existsSync(f), `${f} removed`);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test('Windows: .cmd files, ASCII only, with %USERPROFILE% for the paths under the user folder (an accented name)', () => {
  const base = mkdtempSync(join(tmpdir(), 'ws-cmd-win-'));
  try {
    const home = join(base, 'João Gonçalves');
    const ws = join(home, '.workshop-claude');
    const files = installCommands({ node: join(ws, 'node', 'node.exe'), wsDir: ws, projectsDir: join(home, 'workshop-claude'), home, platform: 'win32' });
    assert.equal(files.length, Object.keys(COMMANDS).length);
    for (const f of files) {
      const t = readFileSync(f, 'latin1');
      assert.ok(/^[\x20-\x7e\r\n]*$/.test(t), `${f}: ASCII only`);
      assert.doesNotMatch(t, /Jo.o/, 'never the user name');
      assert.match(t, /\r\n/, 'CRLF');
    }
    const reg = readFileSync(join(ws, 'bin', 'workshop-register.cmd'), 'latin1');
    assert.match(reg, /@"%USERPROFILE%\\\.workshop-claude\\node\\node\.exe" "%USERPROFILE%\\\.workshop-claude\\kit\\telemetry\\ctl\.mjs" register %\*/);
    assert.match(readFileSync(join(ws, 'bin', 'workshop-check.cmd'), 'latin1'), /setup-windows\.ps1" -Check %\*/);
    assert.match(readFileSync(join(ws, 'bin', 'workshop-server.cmd'), 'latin1'), /cd \/d "%USERPROFILE%\\workshop-claude\\canivete-project"/);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});
