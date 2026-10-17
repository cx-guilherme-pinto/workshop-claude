// Chaos round 2 (R4-arena): the participant's environment around the two servers (PORT exported, a busy
// port, a broken state file under the Arena's /status page).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const env = (extra) => {
  const e = { ...process.env, ...extra };
  delete e.NODE_TEST_CONTEXT;
  return e;
};
const ocupar = () => new Promise((ok) => {
  const s = createServer().listen(0, '127.0.0.1', () => ok(s));
});

for (const [dir, f, v, msgs] of [
  ['practice-project/i18n/en', 'src/server.js', 'PORT', [/^Invalid port in the PORT variable: "abc"\. Use a number from 1 to 65535/, /^Port (\d+) is already in use \(PORT is set in your environment\): try PORT=\d+ npm start/]],
  ['practice-project', 'src/servidor.js', 'PORTA', [/^Porta inválida na variável PORTA: "abc"\./, /^A porta (\d+) já está em uso \(PORTA está definida no teu ambiente\): experimenta PORTA=\d+ npm start/]],
]) {
  test(`chaos R4: ${dir}/${f} with ${v} invalid or busy: one clear line, no stack`, async () => {
    const run = (val) => spawnSync(process.execPath, [f], { cwd: join(ROOT, dir), encoding: 'utf8', timeout: 10000, env: env({ [v]: val }) });
    let r = run('abc');
    assert.equal(r.status, 2);
    assert.match(r.stderr, msgs[0]);
    const s = await ocupar();
    try {
      r = run(` ${s.address().port} `);
      assert.equal(r.status, 1);
      assert.match(r.stderr, msgs[1]);
      assert.ok(!/at |node:events/.test(r.stderr), r.stderr);
    } finally {
      s.close();
    }
  });
}

test('chaos R4: Arena server: a null state or usage line does not break /api/status; port 65535 busy gives a clear error', async () => {
  const base = mkdtempSync(join(tmpdir(), 'arena-srv-'));
  try {
    const dest = join(base, 'demo-project');
    const r = spawnSync(process.execPath, [join(ROOT, 'installer', 'assemble-demo.mjs'), '--dest', dest, '--language', 'en', '--no-git'], { encoding: 'utf8', env: env({ WS_HOME_OVERRIDE: join(base, 'home') }) });
    assert.equal(r.status, 0, r.stderr);
    assert.equal(spawnSync(process.execPath, ['tools/plan.mjs'], { cwd: dest, encoding: 'utf8', env: env({}) }).status, 0);
    mkdirSync(join(dest, '.workshop', 'status'), { recursive: true });
    const m = await import(pathToFileURL(join(dest, 'server.js')).href);
    writeFileSync(join(dest, '.workshop', 'usage.jsonl'), 'null\n');
    writeFileSync(join(dest, '.workshop', 'status', 'cr-05.json'), 'null');
    const f = await m.currentSnapshot(dest);
    assert.ok(f.tasks.length > 0, JSON.stringify(f).slice(0, 200));
    // The last port is busy: the error names it (no "Port should be >= 0 and < 65536").
    const s = await new Promise((ok, fail) => {
      const x = createServer().once('error', fail).listen(65535, '127.0.0.1', () => ok(x));
    }).catch(() => null);
    if (s) {
      try {
        await assert.rejects(m.start({ port: 65535, root: dest, attempts: 3 }), (e) => e.code === 'EADDRINUSE' && /65535/.test(e.message));
      } finally {
        s.close();
      }
    }
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});
