// The Pocketknife's MCP server (canivete-project/mcp-server.mjs): initialize, tools/list with the schema of each
// input, tools/call ok and error, a tool that appears after the server started, and the list_changed notification
// that makes Claude Code ask for the list again (a tool the swarm builds after the session started, M11).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', 'canivete-project');

const SUM = `import { calc } from '../../templates/calc.js';
export default calc({ id: 'ca-01', title: 'Add two numbers', inputs: [
  { name: 'a', type: 'number', label: 'First' },
  { name: 'b', type: 'integer', label: 'Second', default: '1', min: 0, max: 9 },
  { name: 'mode', type: 'choice', label: 'Mode', default: 'x', options: [{ value: 'x', label: 'Plain' }, { value: 'y', label: 'Double' }] },
  { name: 'tags', type: 'list', label: 'Tags', optional: true },
], run: ({ a, b, mode, tags }) => ({ sum: (a + b) * (mode === 'y' ? 2 : 1), tags }) });
`;
const DICE = `import { generate } from '../../templates/generate.js';
export default generate({ id: 'ge-01', title: 'Roll', inputs: [{ name: 'sides', type: 'integer', label: 'Sides', default: '6' }], run: ({ sides }, { randomInt }) => randomInt(sides) + 1 });
`;

function project() {
  const dir = mkdtempSync(join(tmpdir(), 'canivete-mcp-'));
  for (const d of ['templates', 'lib']) cpSync(join(SRC, d), join(dir, d), { recursive: true });
  cpSync(join(SRC, 'mcp-server.mjs'), join(dir, 'mcp-server.mjs'));
  mkdirSync(join(dir, 'specs'));
  writeFileSync(join(dir, 'specs', 'tools.json'), JSON.stringify({ tools: [{ id: 'ca-01', concept: 'Adds a and b.' }] }));
  const put = (id, src) => {
    mkdirSync(join(dir, 'tools', id), { recursive: true });
    writeFileSync(join(dir, 'tools', id, 'tool.js'), src);
  };
  put('ca-01', SUM);
  mkdirSync(join(dir, 'tools', 'broken'), { recursive: true });
  writeFileSync(join(dir, 'tools', 'broken', 'tool.js'), 'export default 3;');
  return { dir, put };
}

function client(dir, env = {}) {
  const child = spawn(process.execPath, [join(dir, 'mcp-server.mjs')], { stdio: ['pipe', 'pipe', 'pipe'], env: { ...process.env, ...env } });
  const notes = [];
  let buf = '';
  let id = 0;
  const waiting = new Map();
  child.stdout.on('data', (d) => {
    buf += d;
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const m = JSON.parse(buf.slice(0, i));
      buf = buf.slice(i + 1);
      if (m.id === undefined) notes.push(m.method);
      else waiting.get(m.id)?.(m);
    }
  });
  const rpc = (method, params) => new Promise((ok) => {
    const n = ++id;
    waiting.set(n, ok);
    child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id: n, method, params })}\n`);
  });
  return { rpc, notes, notify: (method) => child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method })}\n`), close: () => child.kill() };
}

test('mcp server: initialize, tools/list with the input schema, tools/call ok and error, a tool added later', async () => {
  const { dir, put } = project();
  const c = client(dir);
  try {
    const init = await c.rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 't', version: '1' } });
    assert.equal(init.result.protocolVersion, '2025-06-18');
    assert.deepEqual(init.result.capabilities, { tools: { listChanged: true } });
    c.notify('notifications/initialized');
    assert.deepEqual((await c.rpc('ping')).result, {});

    const list = (await c.rpc('tools/list')).result.tools;
    assert.deepEqual(list.map((t) => t.name), ['ca-01'], 'the file that is not a tool is skipped');
    assert.match(list[0].description, /^Add two numbers\. Adds a and b\.$/);
    const s = list[0].inputSchema;
    assert.deepEqual(s.required, ['a'], 'default and optional inputs are not required');
    assert.equal(s.properties.a.type, 'number');
    assert.equal(s.properties.b.type, 'integer');
    assert.match(s.properties.b.description, /default: 1, 0 to 9/);
    assert.deepEqual(s.properties.mode.enum, ['x', 'y']);
    assert.deepEqual(s.properties.tags, { type: 'array', items: { type: 'string' }, description: 'Tags' });
    assert.equal(s.properties.seed, undefined);

    const ok = (await c.rpc('tools/call', { name: 'ca-01', arguments: { a: 2, b: 3, mode: 'y', tags: ['p', 'q'] } })).result;
    assert.ok(!ok.isError);
    assert.deepEqual(JSON.parse(ok.content[0].text), { sum: 10, tags: ['p', 'q'] });
    assert.equal(JSON.parse((await c.rpc('tools/call', { name: 'ca-01', arguments: { a: '1,5' } })).result.content[0].text).sum, 2.5);

    const bad = (await c.rpc('tools/call', { name: 'ca-01', arguments: { a: 'x' } })).result;
    assert.equal(bad.isError, true);
    assert.equal(bad.content[0].type, 'text');
    assert.ok(bad.content[0].text.length > 0);
    assert.equal((await c.rpc('tools/call', { name: 'nope', arguments: {} })).error.code, -32602);
    assert.equal((await c.rpc('nothing/here')).error.code, -32601);

    put('ge-01', DICE);
    const later = (await c.rpc('tools/list')).result.tools;
    assert.deepEqual(later.map((t) => t.name), ['ca-01', 'ge-01']);
    assert.equal(later[1].inputSchema.properties.seed.type, 'integer');
    const roll = (seed) => c.rpc('tools/call', { name: 'ge-01', arguments: { seed } }).then((r) => r.result.content[0].text);
    assert.equal(await roll(7), await roll(7), 'the same seed gives the same result');

    put('ge-01', DICE.replace('Roll', 'Roll again'));
    assert.equal((await c.rpc('tools/list')).result.tools[1].title, 'Roll again', 'an edited tool.js is read again');
  } finally {
    c.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test('mcp server: tools/list_changed when a tool.js appears, changes or goes away after initialize (and not before)', async () => {
  const { dir, put } = project();
  const c = client(dir, { CANIVETE_MCP_POLL_MS: '200' });
  const until = async (n) => {
    for (let i = 0; i < 40 && c.notes.length < n; i++) await new Promise((ok) => setTimeout(ok, 100));
    return c.notes.length;
  };
  try {
    await c.rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 't', version: '1' } });
    c.notify('notifications/initialized');
    await new Promise((ok) => setTimeout(ok, 600));
    assert.deepEqual(c.notes, [], 'nothing changed: no notification');
    // the swarm makes a new tool green while the session is open
    put('ge-01', DICE);
    assert.equal(await until(1), 1);
    assert.deepEqual(c.notes, ['notifications/tools/list_changed']);
    assert.deepEqual((await c.rpc('tools/list')).result.tools.map((t) => t.name), ['ca-01', 'ge-01']);
    // a retry rewrites a tool
    await new Promise((ok) => setTimeout(ok, 50));
    put('ge-01', DICE.replace('Roll', 'Roll again'));
    assert.equal(await until(2), 2);
    // a tool goes away (demo-reset)
    rmSync(join(dir, 'tools', 'ge-01'), { recursive: true, force: true });
    assert.equal(await until(3), 3);
    await new Promise((ok) => setTimeout(ok, 600));
    assert.equal(c.notes.length, 3, 'one notification per change, not one per poll');
  } finally {
    c.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
