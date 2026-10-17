#!/usr/bin/env node
// The Security Arena server. Only Node, no dependencies, only on 127.0.0.1.
//
//   node server.js [--port 3000]      (--porta still works)
//
// Serves only the folders on a list (public/ at the root, cards/, templates/, lib/, pages/, replays/),
// with strict headers (CSP with no inline code) on every response, and the API of /status:
//   /api/cards            the cards that exist + the metadata from specs/cards.json
//   /api/status           the swarm snapshot (tools/workshop/orchestrator/lib/state.mjs)
//   /api/events           the same, by SSE, whenever .workshop/ changes (checked every 1 s)
//   /api/replay/<name>    replays/<name>/events.jsonl + snapshot.json for the replay mode
// /estado and ?replay=gravacao (the older names) still work.
import { createServer } from 'node:http';
import { createReadStream, existsSync, readFileSync, readdirSync, realpathSync, statSync } from 'node:fs';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { T } from './lib/texts.js';
import { normalizeEvent, normalizeSnapshot } from './tools/snapshot.mjs';
import { enginePath, planMode, planTasks } from './tools/engine.mjs';

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

// Folders served by name; everything else comes from public/.
const FOLDERS = new Set(['cards', 'templates', 'lib', 'pages', 'replays']);
const PAGES = new Map([
  ['/', 'index.html'],
  ['/status', 'status.html'],
  ['/status/', 'status.html'],
  ['/estado', 'status.html'],
  ['/estado/', 'status.html'],
]);
const ID = /^[a-z0-9][a-z0-9-]{0,63}$/;
// Replays renamed in the English Arena; the old names still open them.
const REPLAY_ALIASES = { gravacao: 'recording', recording: 'gravacao', exemplo: 'example', example: 'exemplo' };
const REPLAY_ENGLISH = { gravacao: 'recording', exemplo: 'example' };

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

// Turns the requested path into a file inside an allowed folder, or returns null.
// Refuses: invalid encoding, NUL, backslashes, ':' and any segment that starts with '.'
// (this catches '..', '%2e%2e', '.workshop', '.claude', '.git' and dotfiles), extensions not on the list
// and symbolic links that point outside the folder.
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
  if (FOLDERS.has(parts[0])) folder = parts.shift();
  if (!parts.length) return null;
  const type = MIME[extname(parts[parts.length - 1]).toLowerCase()];
  if (!type) return null;
  if (folder === 'replays' && !/\.(json|jsonl)$/.test(parts[parts.length - 1])) return null;
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

// ---------- /api/cards ----------

// Signature of the code the browser tests load (it changes when an agent writes a file).
function codeSignature(root) {
  const parts = [];
  for (const d of ['lib', 'templates', 'pages']) {
    for (const n of list(join(root, d)).sort()) if (n.endsWith('.js')) parts.push(`${d}/${n}:${version(join(root, d, n))}`);
  }
  for (const n of list(join(root, 'cards')).sort()) {
    if (ID.test(n)) parts.push(`cards/${n}:${version(join(root, 'cards', n, 'card.js'))}`);
  }
  let h = 5381;
  const s = parts.join('|');
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

export function listCards(root = ROOT) {
  const specs = readJson(join(root, 'specs', 'cards.json'), {}) || {};
  const plan = readJson(join(root, 'plan.json'));
  const inPlan = new Set(planTasks(plan).map((t) => t.id));
  const categories = (Array.isArray(specs.categories) ? specs.categories : [])
    .filter((c) => c && ID.test(String(c.id)))
    .map((c) => ({ id: String(c.id), name: String(c.name ?? c.id) }));
  const files = (id) => {
    const v = version(join(root, 'cards', id, 'card.js'));
    return { exists: v !== null, version: v, test: existsSync(join(root, 'cards', id, 'card.test.js')) };
  };
  const seen = new Set();
  const cards = [];
  for (const c of Array.isArray(specs.cards) ? specs.cards : []) {
    if (!c || !ID.test(String(c.id)) || seen.has(c.id)) continue;
    seen.add(c.id);
    cards.push({
      id: c.id,
      title: String(c.title ?? c.id),
      category: c.category ?? null,
      difficulty: Number.isInteger(c.difficulty) ? c.difficulty : null,
      mode: c.mode ?? null,
      template: c.template ?? null,
      in_plan: inPlan.has(c.id),
      spec: true,
      ...files(c.id),
    });
  }
  // Cards on disk that are not in the specs (rare): they show up with no metadata.
  for (const n of list(join(root, 'cards')).sort()) {
    if (!ID.test(n) || seen.has(n)) continue;
    const f = files(n);
    if (!f.exists) continue;
    cards.push({ id: n, title: n, category: null, difficulty: null, mode: null, template: null, in_plan: inPlan.has(n), spec: false, ...f });
  }
  return {
    mode: plan ? planMode(plan) : null,
    categories,
    cards,
    pages: {
      category: version(join(root, 'pages', 'category.js')),
      score: version(join(root, 'pages', 'score.js')),
    },
    signature: codeSignature(root),
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
  const f = normalizeSnapshot(m.snapshot(c, plan));
  for (const t of f.tasks) {
    const st = m.readState ? m.readState(c, t.id) || {} : {};
    t.start = st.start ?? st.inicio ?? null;
    t.end = st.end ?? st.fim ?? null;
    if (t.group_type === 'card') t.exists = existsSync(join(root, 'cards', t.id, 'card.js'));
  }
  f.budget = budget(root);
  return f;
}

// Changes whenever the swarm state changes (state files, costs, plan, cards written).
function stateSignature(root) {
  const ws = join(root, '.workshop');
  const parts = [stamp(join(root, 'plan.json')), stamp(join(ws, 'usage.jsonl')), stamp(join(ws, 'run.json'))];
  for (const n of list(join(ws, 'status')).sort()) if (n.endsWith('.json')) parts.push(n + stamp(join(ws, 'status', n)));
  for (const n of list(join(root, 'cards')).sort()) if (ID.test(n)) parts.push(n + stamp(join(root, 'cards', n, 'card.js')));
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
  for (const n of [name, REPLAY_ALIASES[name]].filter(Boolean)) {
    try {
      const real = realpathSync(join(base, n));
      if (inside(realpathSync(base), real) && statSync(real).isDirectory()) return { dir: real, name: n };
    } catch {
      /* try the alias */
    }
  }
  return null;
}

function listReplays(root) {
  const out = [];
  for (const n of list(join(root, 'replays')).sort()) {
    const r = replayFolder(root, n);
    if (!r || r.name !== n || !existsSync(join(r.dir, 'events.jsonl'))) continue;
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
    name: REPLAY_ENGLISH[rest[0]] ?? rest[0],
    snapshot: snap ? normalizeSnapshot(snap) : null,
    events: readJsonl(join(r.dir, 'events.jsonl')).map(normalizeEvent).filter(Boolean),
  });
}

// ---------- server ----------

export function createArenaServer({ root = ROOT } = {}) {
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
      if (path === '/api/cards') return sendJson(res, 200, listCards(root));
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

// Binds only to 127.0.0.1. If the port is busy, it tries the next ones.
export function start({ port = 3000, root = ROOT, attempts = 20 } = {}) {
  return new Promise((ok, fail) => {
    const srv = createArenaServer({ root });
    let current = port;
    let n = 0;
    const onError = (e) => {
      if (e.code === 'EADDRINUSE' && port !== 0 && n < attempts) {
        n++;
        current++;
        srv.listen(current, '127.0.0.1');
      } else {
        srv.off('error', onError);
        fail(e);
      }
    };
    srv.on('error', onError);
    srv.once('listening', () => {
      srv.off('error', onError);
      ok(srv);
    });
    srv.listen(current, '127.0.0.1');
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

// The replay to suggest at start: the example that ships with the Arena.
function exampleReplay(root) {
  return ['example', 'exemplo'].find((n) => existsSync(join(root, 'replays', n, 'events.jsonl'))) || 'example';
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const asked = askedPort(process.argv.slice(2));
  try {
    const srv = await start({ port: asked });
    const { port } = srv.address();
    if (asked && port !== asked) console.log(S.portBusy(asked, port));
    console.log(S.arena(`http://localhost:${port}/`));
    console.log(S.status(`http://localhost:${port}/status`));
    console.log(S.replay(`http://localhost:${port}/status?replay=${exampleReplay(ROOT)}`));
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
