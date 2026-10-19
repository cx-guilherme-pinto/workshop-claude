#!/usr/bin/env node
// The Pocketknife server (adapted from the Security Arena's). Only Node, no dependencies, only on 127.0.0.1.
//
//   node server.js [--port 3000]      (--porta still works)
//
// Serves only what is on a list, with strict headers (CSP with no inline code) on every response:
//   public/ at the root, templates/*.js, lib/*.js, pages/*.js, replays/<name>/*.json(l) and, from tools/, only
//   tools/<id>/tool.js and tools/<id>/tool.test.js (the shell loads the tool and runs its test in the browser).
// Never specs/ (not even specs/my-tool.json), plan.json, .workshop/, server.js, package.json or the rest of tools/.
// The API:
//   /api/tools            the catalogue (specs/tools.json + your tool from specs/my-tool.json), the categories and,
//                         for each tool, whether tools/<id>/tool.js exists and its swarm state
//   /api/status           the swarm snapshot (tools/workshop/orchestrator/lib/state.mjs)
//   /api/events           the same, by SSE, whenever .workshop/ or a tool changes (checked every 1 s)
//   /api/replay/<name>    replays/<name>/events.jsonl + snapshot.json for the replay mode of /status
import { createServer } from 'node:http';
import { createConnection } from 'node:net';
import { createReadStream, existsSync, readFileSync, readdirSync, realpathSync, statSync } from 'node:fs';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { T } from './lib/texts.js';
import { normalizeEvent, normalizeSnapshot } from './tools/snapshot.mjs';
import { TOOL_ID, enginePath, planMode, planTasks } from './tools/engine.mjs';
import { readMyTool } from './tools/my-tool.mjs';

const S = T.server;

export const ROOT = dirname(fileURLToPath(import.meta.url));

export const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "frame-ancestors 'none'",
  "require-trusted-types-for 'script'",
].join('; ');

export const HEADERS = Object.freeze({
  'Content-Security-Policy': CSP,
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'Cache-Control': 'no-store',
});

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jsonl': 'application/x-ndjson; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

// Folders served by name, and what each one may serve; everything else comes from public/.
const FOLDERS = {
  templates: (parts) => parts.length === 1 && /\.js$/.test(parts[0]),
  lib: (parts) => parts.length === 1 && /\.js$/.test(parts[0]),
  pages: (parts) => parts.length === 1 && /\.js$/.test(parts[0]),
  replays: (parts) => parts.length === 2 && /\.(json|jsonl)$/.test(parts[1]),
  tools: (parts) => parts.length === 2 && TOOL_ID.test(parts[0]) && (parts[1] === 'tool.js' || parts[1] === 'tool.test.js'),
};
const PAGES = new Map([
  ['/', 'index.html'],
  ['/status', 'status.html'],
  ['/status/', 'status.html'],
  ['/estado', 'status.html'],
  ['/estado/', 'status.html'],
]);
const ID = /^[a-z0-9][a-z0-9-]{0,63}$/;
const NAME = /^[a-z][a-z0-9_]{0,40}$/;

function readJson(f, fallback = null) {
  try {
    return JSON.parse(readFileSync(f, 'utf8'));
  } catch {
    return fallback;
  }
}

function readJsonl(f) {
  const out = [];
  let text = '';
  try {
    text = readFileSync(f, 'utf8');
  } catch {
    return out;
  }
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    try {
      const v = JSON.parse(line);
      if (v && typeof v === 'object' && !Array.isArray(v)) out.push(v);
    } catch {
      /* partial line: ignore */
    }
  }
  return out;
}

function list(dir) {
  try {
    return readdirSync(dir);
  } catch {
    return [];
  }
}

function version(f) {
  try {
    return Math.round(statSync(f).mtimeMs);
  } catch {
    return null;
  }
}

function stamp(f) {
  try {
    const s = statSync(f);
    return `${Math.round(s.mtimeMs)}:${s.size}`;
  } catch {
    return '-';
  }
}

function inside(base, target) {
  return target === base || target.startsWith(base + sep);
}

// Turns the requested path into a file the server may send, or returns null.
// Refuses: invalid encoding, NUL, backslashes, ':' and any segment that starts with '.'
// (this catches '..', '%2e%2e', '.workshop', '.claude', '.git' and dotfiles), extensions not on the list,
// paths a folder's rule does not allow (tools/ only gives tools/<id>/tool.js and tool.test.js) and symbolic links
// that point outside the folder.
export function resolveSafe(root, rawPath) {
  if (typeof rawPath !== 'string' || !rawPath.startsWith('/')) return null;
  let text;
  try {
    text = decodeURIComponent(rawPath);
  } catch {
    return null;
  }
  if (text.includes('\0') || text.includes('\\')) return null;
  const parts = text.split('/').filter((p) => p !== '');
  if (!parts.length) return null;
  for (const p of parts) if (p.startsWith('.') || p.includes(':')) return null;
  let folder = 'public';
  if (Object.hasOwn(FOLDERS, parts[0])) {
    folder = parts.shift();
    if (!FOLDERS[folder](parts)) return null;
  }
  if (!parts.length) return null;
  const type = MIME[extname(parts[parts.length - 1]).toLowerCase()];
  if (!type) return null;
  const base = resolve(root, folder);
  const target = resolve(base, ...parts);
  if (!inside(base, target) || target === base) return null;
  let real;
  let baseReal;
  try {
    real = realpathSync(target);
    baseReal = realpathSync(base);
  } catch {
    return null;
  }
  if (!inside(baseReal, real) || real === baseReal) return null;
  let st;
  try {
    st = statSync(real);
  } catch {
    return null;
  }
  if (!st.isFile()) return null;
  return { path: real, size: st.size, type };
}

function headers(extra = {}) {
  return { ...HEADERS, ...extra };
}

function sendText(res, status, text, extra = {}) {
  const body = Buffer.from(text, 'utf8');
  res.writeHead(status, headers({ 'Content-Type': 'text/plain; charset=utf-8', 'Content-Length': body.length, ...extra }));
  res.end(res.req.method === 'HEAD' ? undefined : body);
}

function sendJson(res, status, obj) {
  const body = Buffer.from(JSON.stringify(obj), 'utf8');
  res.writeHead(status, headers({ 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': body.length }));
  res.end(res.req.method === 'HEAD' ? undefined : body);
}

function sendFile(res, f) {
  res.writeHead(200, headers({ 'Content-Type': f.type, 'Content-Length': f.size }));
  if (res.req.method === 'HEAD') return res.end();
  const s = createReadStream(f.path);
  s.on('error', () => res.destroy());
  s.pipe(res);
}

const notFound = (res) => sendText(res, 404, S.notFound);

// ---------- the catalogue (/api/tools) ----------

const str = (v, max = 400) => (typeof v === 'string' ? v.slice(0, max) : v === undefined || v === null ? null : String(v).slice(0, max));
const scalar = (v) => (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' ? v : undefined);

// Only the fields the shell needs, with the types it expects: an entry of specs/tools.json comes from a person
// (specs/my-tool.json) and is never sent as it is.
function cleanInput(d) {
  if (!d || !NAME.test(String(d.name))) return null;
  const out = { name: d.name, type: str(d.type, 20), label: str(d.label, 80) ?? d.name };
  for (const k of ['default', 'min', 'max']) if (scalar(d[k]) !== undefined) out[k] = scalar(d[k]);
  if (d.optional === true) out.optional = true;
  if (Array.isArray(d.options)) out.options = d.options.filter((o) => o && typeof o.value === 'string').slice(0, 40).map((o) => ({ value: o.value.slice(0, 80), label: str(o.label, 80) ?? o.value }));
  return out;
}

function cleanOutput(o) {
  if (!o || typeof o !== 'object') return null;
  const out = { type: str(o.type, 20), label: str(o.label, 80) };
  if (Array.isArray(o.fields)) out.fields = o.fields.filter((f) => f && NAME.test(String(f.name))).slice(0, 20).map((f) => ({ name: f.name, label: str(f.label, 80) ?? f.name }));
  return out;
}

// The first example's inputs: the shell fills the form with them, so a tool shows a result when it opens.
function cleanExample(t) {
  const ex = Array.isArray(t.examples) ? t.examples[0] : null;
  if (!ex || !ex.in || typeof ex.in !== 'object') return null;
  const out = {};
  for (const [k, v] of Object.entries(ex.in)) if (NAME.test(k) && typeof v === 'string') out[k] = v.slice(0, 2000);
  return out;
}

// Signature of the code the browser loads (it changes when an agent writes a file): the shell reloads before
// running the tests again, because the browser keeps the modules it already imported.
function codeSignature(root, ids) {
  const parts = [];
  for (const d of ['lib', 'templates', 'pages']) {
    for (const n of list(join(root, d)).sort()) if (n.endsWith('.js')) parts.push(`${d}/${n}:${version(join(root, d, n))}`);
  }
  for (const id of [...ids].sort()) parts.push(`tools/${id}:${version(join(root, 'tools', id, 'tool.js'))}:${version(join(root, 'tools', id, 'tool.test.js'))}`);
  let h = 5381;
  const s = parts.join('|');
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

// The swarm state of each task, from the snapshot (empty with no plan or no engine).
function statesOf(snapshot) {
  return new Map((snapshot?.tasks || []).map((t) => [t.id, { state: t.state ?? null, attempt: t.attempt ?? 0 }]));
}

export async function listTools(root = ROOT) {
  const specs = readJson(join(root, 'specs', 'tools.json'), {}) || {};
  const plan = readJson(join(root, 'plan.json'));
  const inPlan = new Set(planTasks(plan).map((t) => t.id));
  const states = statesOf(plan ? await currentSnapshot(root) : null);
  const categories = (Array.isArray(specs.categories) ? specs.categories : [])
    .filter((c) => c && ID.test(String(c.id)))
    .map((c) => ({ id: String(c.id), name: String(c.name ?? c.id) }));
  const catName = new Map(categories.map((c) => [c.id, c.name]));
  const mine = readMyTool(root, specs);
  const seen = new Set();
  const tools = [];
  // Your tool (specs/my-tool.json) comes after the others, like in TASKS.md and in the plan.
  for (const t of [...(Array.isArray(specs.tools) ? specs.tools : []), ...(mine.tool ? [mine.tool] : [])]) {
    if (!t || !TOOL_ID.test(String(t.id)) || seen.has(t.id)) continue;
    seen.add(t.id);
    const v = version(join(root, 'tools', t.id, 'tool.js'));
    const s = states.get(t.id);
    tools.push({
      id: t.id,
      title: str(t.title, 120) ?? t.id,
      concept: str(t.concept, 400) ?? '',
      category: ID.test(String(t.category)) ? t.category : null,
      category_name: catName.get(t.category) ?? null,
      template: str(t.template, 20),
      inputs: (Array.isArray(t.inputs) ? t.inputs : []).map(cleanInput).filter(Boolean),
      output: cleanOutput(t.output),
      example: cleanExample(t),
      mine: t.mine === true,
      built: v !== null,
      version: v,
      test: existsSync(join(root, 'tools', t.id, 'tool.test.js')),
      in_plan: inPlan.has(t.id),
      state: s?.state ?? null,
      attempt: s?.attempt ?? 0,
    });
  }
  return {
    lang: specs.lang === 'en' ? 'en' : 'pt',
    mode: plan ? planMode(plan) : null,
    categories,
    tools,
    // specs/my-tool.json with problems: the shell says to run node tools/gen.mjs (never what the file has).
    my_tool: { file: mine.exists, ok: mine.exists && !mine.errors.length },
    pages: {
      catalog: {
        version: version(join(root, 'pages', 'catalog.js')),
        test: version(join(root, 'pages', 'catalog.test.js')),
        state: states.get('index-page')?.state ?? null,
      },
    },
    signature: codeSignature(root, seen),
  };
}

// ---------- /api/status ----------

function budget(root) {
  const p = readJson(join(root, 'tools', 'workshop', 'pricing.json'));
  return {
    target_usd: p?.budget?.target_usd ?? p?.orcamento?.alvo_usd ?? 5,
    cap_usd: p?.budget?.cap_usd ?? p?.orcamento?.teto_usd ?? 10,
  };
}

function emptySnapshot(root, reason) {
  return {
    generated_at: new Date().toISOString(),
    empty: true,
    reason,
    mode: null,
    start: null,
    end: null,
    total: 0,
    counts: { todo: 0, working: 0, green: 0, red: 0, failed: 0 },
    cost: { total: 0, main: 0, subagents: 0 },
    tasks: [],
    budget: budget(root),
  };
}

const engines = new Map();
async function engine(root) {
  const f = enginePath(root, 'state');
  if (!f) return null;
  if (!engines.has(f)) {
    engines.set(f, import(pathToFileURL(f).href).then((m) => ({
      paths: m.paths ?? m.caminhos,
      readPlan: m.readPlan ?? m.lerPlano,
      readState: m.readState ?? m.lerEstado,
      snapshot: m.snapshot ?? m.fotografia,
    })).catch(() => null));
  }
  return engines.get(f);
}

export async function currentSnapshot(root = ROOT) {
  const m = await engine(root);
  if (!m || !m.paths || !m.readPlan || !m.snapshot) return emptySnapshot(root, 'no_engine');
  const planFile = join(root, 'plan.json');
  if (!existsSync(planFile)) return emptySnapshot(root, 'no_plan');
  let plan;
  try {
    plan = m.readPlan(planFile);
  } catch {
    return emptySnapshot(root, 'invalid_plan');
  }
  const c = m.paths(root);
  // A broken state file (a `null`, a cut line) must not freeze the page: it shows an empty board instead.
  let f;
  try {
    f = normalizeSnapshot(m.snapshot(c, plan));
    for (const t of f.tasks) {
      const st = m.readState ? m.readState(c, t.id) || {} : {};
      t.start = st.start ?? st.inicio ?? null;
      t.end = st.end ?? st.fim ?? null;
      if (TOOL_ID.test(String(t.id))) t.exists = existsSync(join(root, 'tools', t.id, 'tool.js'));
    }
  } catch {
    return emptySnapshot(root, 'unreadable_state');
  }
  f.budget = budget(root);
  return f;
}

// Changes whenever the swarm state changes (state files, costs, plan, tools written, your tool, the catalog page).
function stateSignature(root) {
  const ws = join(root, '.workshop');
  const parts = [stamp(join(root, 'plan.json')), stamp(join(ws, 'usage.jsonl')), stamp(join(ws, 'run.json')), stamp(join(root, 'specs', 'my-tool.json')), stamp(join(root, 'pages', 'catalog.js'))];
  for (const n of list(join(ws, 'status')).sort()) if (n.endsWith('.json')) parts.push(n + stamp(join(ws, 'status', n)));
  for (const n of list(join(root, 'tools')).sort()) if (TOOL_ID.test(n)) parts.push(n + stamp(join(root, 'tools', n, 'tool.js')));
  return parts.join('|');
}

// ---------- /api/events (SSE) ----------

function createBroadcaster(root) {
  const clients = new Set();
  let clock = null;
  let signature = null;
  let lastPing = 0;
  let busy = false;

  const send = (res, event, data) => {
    if (!res.writableEnded && !res.destroyed) res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  async function tick() {
    if (busy) return;
    busy = true;
    try {
      const s = stateSignature(root);
      if (s !== signature) {
        signature = s;
        const f = await currentSnapshot(root);
        for (const res of clients) send(res, 'snapshot', f);
      } else if (Date.now() - lastPing > 10000) {
        lastPing = Date.now();
        for (const res of clients) send(res, 'ping', { t: lastPing });
      }
    } catch {
      /* try again on the next tick */
    } finally {
      busy = false;
    }
  }

  return {
    async connect(req, res) {
      res.writeHead(200, headers({ 'Content-Type': 'text/event-stream; charset=utf-8', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' }));
      res.write('retry: 2000\n\n');
      clients.add(res);
      req.on('close', () => {
        clients.delete(res);
        if (!clients.size && clock) {
          clearInterval(clock);
          clock = null;
        }
      });
      try {
        send(res, 'snapshot', await currentSnapshot(root));
      } catch {
        /* the next tick sends it */
      }
      if (!clock) {
        signature = stateSignature(root);
        clock = setInterval(tick, 1000);
        clock.unref?.();
      }
    },
    close() {
      if (clock) clearInterval(clock);
      clock = null;
      for (const res of clients) res.end();
      clients.clear();
    },
  };
}

// ---------- /api/replay ----------

function replayFolder(root, name) {
  if (!ID.test(name)) return null;
  const base = resolve(root, 'replays');
  try {
    const real = realpathSync(join(base, name));
    if (inside(realpathSync(base), real) && real !== realpathSync(base) && statSync(real).isDirectory()) return { dir: real, name };
  } catch {
    /* no such replay */
  }
  return null;
}

function listReplays(root) {
  const out = [];
  for (const n of list(join(root, 'replays')).sort()) {
    const r = replayFolder(root, n);
    if (!r || !existsSync(join(r.dir, 'events.jsonl'))) continue;
    const s = normalizeSnapshot(readJson(join(r.dir, 'snapshot.json'), {})) || {};
    out.push({ name: n, description: typeof s.description === 'string' ? s.description : null, total: s.total ?? null, synthetic: !!s.synthetic });
  }
  return out;
}

function answerReplay(root, res, rest) {
  if (!rest.length) return sendJson(res, 200, { replays: listReplays(root) });
  const r = replayFolder(root, rest[0]);
  if (!r || rest.length > 2) return notFound(res);
  if (rest.length === 2) {
    if (rest[1] !== 'events.jsonl' && rest[1] !== 'snapshot.json') return notFound(res);
    const f = resolveSafe(root, `/replays/${r.name}/${rest[1]}`);
    return f ? sendFile(res, f) : notFound(res);
  }
  if (!existsSync(join(r.dir, 'events.jsonl'))) return notFound(res);
  const snap = readJson(join(r.dir, 'snapshot.json'), null);
  return sendJson(res, 200, {
    name: r.name,
    snapshot: snap ? normalizeSnapshot(snap) : null,
    events: readJsonl(join(r.dir, 'events.jsonl')).map(normalizeEvent).filter(Boolean),
  });
}

// ---------- server ----------

export function createCaniveteServer({ root = ROOT } = {}) {
  const broadcaster = createBroadcaster(root);
  const srv = createServer(async (req, res) => {
    try {
      if (req.method !== 'GET' && req.method !== 'HEAD') return sendText(res, 405, S.method, { Allow: 'GET, HEAD' });
      const raw = String(req.url || '');
      const path = raw.split('?')[0].split('#')[0];
      if (!path.startsWith('/')) return sendText(res, 400, S.badRequest);

      if (PAGES.has(path)) {
        const f = resolveSafe(root, `/${PAGES.get(path)}`);
        return f ? sendFile(res, f) : notFound(res);
      }
      if (path === '/api/tools') return sendJson(res, 200, await listTools(root));
      if (path === '/api/status') return sendJson(res, 200, await currentSnapshot(root));
      if (path === '/api/events') return broadcaster.connect(req, res);
      if (path === '/api/replay' || path.startsWith('/api/replay/')) {
        const rest = path.slice('/api/replay'.length).split('/').filter(Boolean);
        return answerReplay(root, res, rest);
      }
      if (path.startsWith('/api/')) return notFound(res);

      const f = resolveSafe(root, path);
      return f ? sendFile(res, f) : notFound(res);
    } catch {
      if (!res.headersSent) sendText(res, 500, S.internalError);
      else res.destroy();
    }
  });
  srv.on('close', () => broadcaster.close());
  srv.closeAll = () => {
    broadcaster.close();
    srv.closeAllConnections?.();
  };
  return srv;
}

// Does a program answer on host:port? A connection, not a test bind: on macOS another dev server on [::]
// (Next.js, Express) or on ::1 (Vite) does not make a bind on 127.0.0.1 (or on ::1) fail, and the browser, which
// tries ::1 first for "localhost", would open that other app at the address this server prints.
function answers(port, host, ms = 300) {
  return new Promise((ok) => {
    const c = createConnection({ port, host });
    const end = (v) => {
      c.destroy();
      ok(v);
    };
    c.setTimeout(ms, () => end(false));
    c.once('connect', () => end(true));
    c.once('error', () => end(false));
  });
}

export async function portTaken(port) {
  const r = await Promise.all([answers(port, '127.0.0.1'), answers(port, '::1')]);
  return r.some(Boolean);
}

// Binds only to 127.0.0.1. If the port is busy (bound, or another program answers on 127.0.0.1 or ::1),
// it tries the next ones.
export function start({ port = 3000, root = ROOT, attempts = 20 } = {}) {
  return new Promise((ok, fail) => {
    const srv = createCaniveteServer({ root });
    let current = port;
    let n = 0;
    const listen = async () => {
      while (port !== 0 && n < attempts && current < 65535 && (await portTaken(current))) {
        n++;
        current++;
      }
      srv.listen(current, '127.0.0.1');
    };
    const onError = (e) => {
      if (e.code === 'EADDRINUSE' && port !== 0 && n < attempts && current < 65535) {
        n++;
        current++;
        listen().catch(stop);
      } else stop(e);
    };
    const stop = (e) => {
      srv.off('error', onError);
      fail(e);
    };
    srv.on('error', onError);
    srv.once('listening', () => {
      srv.off('error', onError);
      ok(srv);
    });
    listen().catch(stop);
  });
}

function askedPort(argv) {
  const i = argv.findIndex((a) => a === '--port' || a === '--porta');
  const v = i >= 0 ? argv[i + 1] : process.env.PORT || '3000';
  const n = Number(v);
  if (!Number.isInteger(n) || n < 0 || n > 65535) {
    console.error(S.invalidPort(v));
    process.exit(2);
  }
  return n;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const asked = askedPort(process.argv.slice(2));
  try {
    const srv = await start({ port: asked });
    const { port } = srv.address();
    if (asked && port !== asked) console.log(S.portBusy(asked, port));
    console.log(S.app(`http://localhost:${port}/`));
    console.log(S.status(`http://localhost:${port}/status`));
    if (existsSync(join(ROOT, 'replays', 'example', 'events.jsonl'))) console.log(S.replay(`http://localhost:${port}/status?replay=example`));
    console.log(S.localOnly);
    const stop = () => {
      srv.closeAll();
      srv.close(() => process.exit(0));
      setTimeout(() => process.exit(0), 500).unref();
    };
    process.on('SIGINT', stop);
    process.on('SIGTERM', stop);
  } catch (e) {
    console.error(S.didNotStart(e.message));
    process.exit(1);
  }
}
