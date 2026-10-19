#!/usr/bin/env node
// The panel on a local Node server (no dependencies): the same API as the Cloudflare Worker (panel/api.mjs) plus
// the page (panel/public/) and the recorded replays (panel/replays/). For rehearsals, the tests and plan B when the
// Worker cannot be reached (spec 6.8).
//
//   PANEL_ADMIN_TOKEN=<t> node panel/server.mjs [--port 8787] [--host 127.0.0.1] [--data panel/data] [--ws <code>]
//
// --ws defaults to WORKSHOP_CODE (environment or repos.conf). The admin token only comes from the environment (never
// on the command line or in a file). Without an admin token the views change only on the page that pressed the key.
import { createServer } from 'node:http';
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, dirname, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isMain } from '../orchestrator/lib/is-main.mjs';
import { createApi } from './api.mjs';
import { fileStore } from './store-file.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ALLOW = JSON.parse(readFileSync(join(HERE, '..', 'telemetry', 'allowlist.json'), 'utf8'));
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.jsonl': 'application/x-ndjson', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8' };
const API = new Set(['/e', '/state', '/stream', '/health']);
const SECURITY = {
  'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'self'",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
};

function confCode() {
  try {
    const m = /^WORKSHOP_CODE=(.*)$/m.exec(readFileSync(join(HERE, '..', 'repos.conf'), 'utf8'));
    return m?.[1]?.trim() || 'dev';
  } catch {
    return 'dev';
  }
}

// A static file under one of the roots, or null (no path ever leaves the roots).
function staticFile(roots, pathname) {
  for (const [prefix, root] of roots) {
    if (!pathname.startsWith(prefix)) continue;
    let rel = decodeURIComponent(pathname.slice(prefix.length)) || 'index.html';
    if (rel.endsWith('/')) rel += 'index.html';
    const f = resolve(root, normalize(rel));
    if (!f.startsWith(resolve(root) + sep)) return null;
    if (existsSync(f) && statSync(f).isFile()) return f;
  }
  return null;
}

export async function startServer({ port = 8787, host = '127.0.0.1', data = join(HERE, 'data'), ws = process.env.WORKSHOP_CODE || confCode(), adminToken = process.env.PANEL_ADMIN_TOKEN || '', throttleMs = 500, now } = {}) {
  const store = fileStore(join(data, ws));
  const api = await createApi({ allow: ALLOW, wsCode: ws, adminToken, store, throttleMs, ...(now ? { now } : {}) });
  const roots = [
    ['/replays/', join(HERE, 'replays')],
    ['/', join(HERE, 'public')],
  ];
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      if (API.has(url.pathname) || url.pathname.startsWith('/admin/') || req.method === 'OPTIONS') {
        const headers = new Headers();
        for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v);
        const body = req.method === 'POST' ? req : undefined;
        const r = await api.fetch(new Request(url, { method: req.method, headers, body, duplex: 'half' }));
        res.writeHead(r.status, Object.fromEntries(r.headers));
        if (!r.body) return res.end();
        const reader = r.body.getReader();
        req.on('close', () => reader.cancel().catch(() => {}));
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
        return res.end();
      }
      const f = req.method === 'GET' ? staticFile(roots, url.pathname) : null;
      if (!f) {
        res.writeHead(404, { 'Content-Type': 'text/plain', ...SECURITY });
        return res.end('not found');
      }
      res.writeHead(200, { 'Content-Type': TYPES[extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-cache', ...SECURITY });
      createReadStream(f).pipe(res);
    } catch {
      if (!res.headersSent) res.writeHead(500);
      res.end();
    }
  });
  await new Promise((ok, fail) => {
    server.once('error', fail);
    server.listen(port, host, ok);
  });
  return {
    api,
    server,
    url: `http://${host}:${server.address().port}`,
    close: () =>
      new Promise((ok) => {
        api.close();
        server.closeAllConnections?.();
        server.close(() => ok());
      }),
  };
}

if (isMain(import.meta.url)) {
  const a = process.argv.slice(2);
  const opt = (k, d) => (a.includes(k) ? a[a.indexOf(k) + 1] : d);
  const s = await startServer({ port: Number(opt('--port', 8787)), host: opt('--host', '127.0.0.1'), data: resolve(opt('--data', join(HERE, 'data'))), ws: opt('--ws', undefined) });
  console.log(`panel: ${s.url}/?room=A  (workshop ${s.api.aggregate.ws})`);
}
