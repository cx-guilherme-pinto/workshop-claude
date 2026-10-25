#!/usr/bin/env node
// The Pocketknife as an MCP server: every tools/<id>/tool.js becomes a tool Claude Code can call
// (mcp__canivete__<id>). No dependencies: newline-delimited JSON-RPC 2.0 on stdin/stdout, logs on stderr only.
//
//   node mcp-server.mjs [--root <project folder>]     (default: the folder this file is in)
//
// The tools are read again on every tools/list (and every tools/call), with a cache-buster on the import as
// public/tool-view.js does. Claude Code only asks for tools/list again when the server says the list changed, so
// after initialize the server looks at tools/ every 2 s (CANIVETE_MCP_POLL_MS) and sends
// notifications/tools/list_changed when a tool.js appears, changes or goes away: a tool the swarm builds after the
// session started shows up in that session, with no restart (M11).
// tools/CONTRACT.md: a tool is { id, title, inputs, run(values, { seed }) → { output } | { error } }.
import { existsSync, readdirSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = (() => {
  const i = process.argv.indexOf('--root');
  return i > 0 && process.argv[i + 1] ? resolve(process.argv[i + 1]) : HERE;
})();
const SERVER = { name: 'canivete', version: '1.0.0' };
const PROTOCOLS = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05'];
const ID = /^[A-Za-z0-9_-]{1,64}$/;

const log = (...a) => console.error('[canivete-mcp]', ...a);

// ---------- the tools ----------

function readJson(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

// The concept of each tool, from the catalogue (specs/tools.json) or from the person's own spec (my-01).
function concepts() {
  const map = new Map();
  for (const t of readJson(join(ROOT, 'specs', 'tools.json'))?.tools ?? []) if (t?.id && t.concept) map.set(t.id, t.concept);
  const mine = readJson(join(ROOT, 'specs', 'my-tool.json'));
  const myId = readJson(join(ROOT, 'workshop.project.json'))?.my_item?.id ?? 'my-01';
  if (mine?.concept) map.set(myId, mine.concept);
  return map;
}

async function loadTool(id) {
  const file = join(ROOT, 'tools', id, 'tool.js');
  const st = statSync(file);
  const mod = await import(`${pathToFileURL(file).href}?v=${st.mtimeMs}-${st.size}`);
  const tool = mod.default;
  if (!tool || typeof tool.run !== 'function' || !Array.isArray(tool.inputs)) throw new Error('not a tool (tools/CONTRACT.md)');
  return tool;
}

function ids() {
  const dir = join(ROOT, 'tools');
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && ID.test(d.name) && existsSync(join(dir, d.name, 'tool.js')))
    .map((d) => d.name)
    .sort();
}

// A tool.js that is not there yet, half written or red is skipped: the others still work.
async function scan() {
  const found = [];
  for (const id of ids()) {
    try {
      found.push({ id, tool: await loadTool(id) });
    } catch (e) {
      log(`${id}: skipped (${e.message})`);
    }
  }
  return found;
}

// ---------- the schema ----------

function property(def) {
  const note = [];
  if (def.default !== undefined && def.default !== '') note.push(`default: ${def.default}`);
  if (def.min !== undefined && def.max !== undefined) note.push(`${def.min} to ${def.max}`);
  else if (def.min !== undefined) note.push(`min ${def.min}`);
  else if (def.max !== undefined) note.push(`max ${def.max}`);
  const label = def.label || def.name;
  const description = note.length ? `${label} (${note.join(', ')})` : label;
  switch (def.type) {
    case 'number':
    case 'integer':
      return { type: def.type, description };
    case 'choice': {
      const values = (def.options || []).map((o) => o.value);
      const names = (def.options || []).filter((o) => o.label && o.label !== o.value).map((o) => `${o.value} = ${o.label}`);
      return { type: 'string', enum: values, description: names.length ? `${description}: ${names.join('; ')}` : description };
    }
    case 'list':
      return { type: 'array', items: { type: 'string' }, description };
    case 'date':
      return { type: 'string', description: `${description}, YYYY-MM-DD` };
    default:
      return { type: 'string', description };
  }
}

export function inputSchema(tool) {
  const properties = {};
  const required = [];
  for (const def of tool.inputs) {
    properties[def.name] = property(def);
    if (def.default === undefined && !def.optional) required.push(def.name);
  }
  if (tool.template === 'generate') properties.seed = { type: 'integer', description: 'Optional seed: the same seed gives the same result' };
  return { type: 'object', properties, ...(required.length ? { required } : {}), additionalProperties: false };
}

export function describe({ id, tool }, concept) {
  const title = tool.title || id;
  return { name: id, title, description: concept ? `${title}. ${concept}` : title, inputSchema: inputSchema(tool) };
}

// ---------- the calls ----------

// The tools read their inputs as the text typed in the fields (tools/CONTRACT.md).
function asText(v) {
  if (v === undefined || v === null) return '';
  if (Array.isArray(v)) return v.map(String).join('\n');
  return String(v);
}

async function call(name, args) {
  if (!ID.test(String(name)) || !ids().includes(name)) return null;
  const tool = await loadTool(name);
  const given = args && typeof args === 'object' && !Array.isArray(args) ? args : {};
  const values = {};
  for (const def of tool.inputs) values[def.name] = asText(given[def.name]);
  const seed = Number.isFinite(Number(given.seed)) && given.seed !== undefined && given.seed !== null ? Number(given.seed) : undefined;
  try {
    const r = await tool.run(values, seed === undefined ? {} : { seed });
    if (r && r.error !== undefined) return { content: [{ type: 'text', text: String(r.error) }], isError: true };
    return { content: [{ type: 'text', text: JSON.stringify(r?.output ?? null, null, 2) }] };
  } catch (e) {
    return { content: [{ type: 'text', text: `The tool ${name} failed: ${e?.message ?? e}` }], isError: true };
  }
}

// What tools/ holds now (each tool.js and when it last changed): a change means the list may have changed.
function signature() {
  return ids()
    .map((id) => {
      try {
        const st = statSync(join(ROOT, 'tools', id, 'tool.js'));
        return `${id}:${st.mtimeMs}:${st.size}`;
      } catch {
        return id;
      }
    })
    .join('|');
}

let watching = null;
function watchTools() {
  if (watching) return;
  let last = signature();
  const every = Math.max(200, Number(process.env.CANIVETE_MCP_POLL_MS) || 2000);
  watching = setInterval(() => {
    const now = signature();
    if (now === last) return;
    last = now;
    process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/tools/list_changed' })}\n`);
  }, every);
  watching.unref();
}

// ---------- JSON-RPC ----------

const reply = (id, result) => process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id, result })}\n`);
const fail = (id, code, message) => process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } })}\n`);

async function handle(m) {
  const { id, method, params } = m;
  if (id === undefined || id === null) return; // notifications (initialized, cancelled…): nothing to answer
  switch (method) {
    case 'initialize':
      watchTools();
      return reply(id, {
        protocolVersion: PROTOCOLS.includes(params?.protocolVersion) ? params.protocolVersion : PROTOCOLS[0],
        capabilities: { tools: { listChanged: true } },
        serverInfo: SERVER,
      });
    case 'ping':
      return reply(id, {});
    case 'tools/list': {
      const map = concepts();
      return reply(id, { tools: (await scan()).map((t) => describe(t, map.get(t.id))) });
    }
    case 'tools/call': {
      const r = await call(params?.name, params?.arguments);
      return r ? reply(id, r) : fail(id, -32602, `Unknown tool: ${params?.name}`);
    }
    default:
      return fail(id, -32601, `Method not found: ${method}`);
  }
}

const isMain = () => {
  try {
    return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
};

if (isMain()) {
  let buf = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk) => {
    buf += chunk;
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (!line) continue;
      let m;
      try {
        m = JSON.parse(line);
      } catch {
        fail(null, -32700, 'Parse error');
        continue;
      }
      handle(m).catch((e) => {
        log(e?.stack || e);
        if (m?.id !== undefined && m?.id !== null) fail(m.id, -32603, 'Internal error');
      });
    }
  });
  process.stdin.on('end', () => process.exit(0));
}
