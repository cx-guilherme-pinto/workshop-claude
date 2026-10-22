// The live panel on Cloudflare (D-30): this Worker sends every API request (panel/api.mjs) to one Durable Object per
// workshop code, which keeps the events in its SQLite storage and serves the state and the SSE stream. The page is
// on Cloudflare Pages (panel/public/, deployed by tools/deploy-panel.sh).
//
// Privacy (spec 6.6): nothing about the request is stored (no IP, no headers, no cf data); Workers logs are off in
// wrangler.toml; the events are the allowlisted ones only (telemetry/schema.mjs, checked again in api.mjs).
//
// Environment (wrangler.toml and secrets): WORKSHOP_CODE (var, from repos.conf), ALLOWED_ORIGINS (var: the Pages
// address, comma separated), BUILD (var: the commit, from deploy-panel.sh), DAY_TZ (var: the time zone of the daily wipe, repos.conf PANEL_TIMEZONE), ADMIN_TOKEN
// (secret: `wrangler secret put ADMIN_TOKEN`, typed by the organizer).
//
// The daily wipe (D-34): an alarm at each midnight of DAY_TZ deletes every event, registration and the signing secret,
// even if nobody calls the panel that night (api.mjs also checks the day on every request).
import allow from '../../telemetry/allowlist.json' with { type: 'json' };
import { createApi } from '../api.mjs';

// The store of panel/api.mjs on the Durable Object's SQLite (ctx.storage.sql).
export function sqlStore(sql) {
  sql.exec('CREATE TABLE IF NOT EXISTS events (seq INTEGER PRIMARY KEY AUTOINCREMENT, k TEXT UNIQUE NOT NULL, e TEXT NOT NULL)');
  sql.exec('CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT)');
  return {
    append(e, key) {
      const rows = sql.exec('INSERT OR IGNORE INTO events (k, e) VALUES (?, ?) RETURNING seq', key, JSON.stringify(e)).toArray();
      return rows.length ? rows[0].seq : null;
    },
    since(n) {
      return sql.exec('SELECT seq, e FROM events WHERE seq > ? ORDER BY seq', n).toArray().map((r) => ({ seq: r.seq, e: JSON.parse(r.e) }));
    },
    getMeta(k) {
      const r = sql.exec('SELECT v FROM meta WHERE k = ?', k).toArray();
      return r.length ? r[0].v : null;
    },
    setMeta(k, v) {
      sql.exec('INSERT INTO meta (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v', k, v);
    },
    reset() {
      sql.exec('DELETE FROM events');
      sql.exec('DELETE FROM meta');
    },
  };
}

const origins = (env) =>
  String(env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

export class PanelRoom {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
    this.api = null;
  }

  async ready() {
    if (!this.api) {
      this.api = await createApi({
        allow,
        wsCode: this.env.WORKSHOP_CODE,
        adminToken: this.env.ADMIN_TOKEN || '',
        store: sqlStore(this.ctx.storage.sql),
        allowedOrigins: origins(this.env),
        dayTz: this.env.DAY_TZ || 'UTC',
        build: this.env.BUILD || 'dev',
      });
    }
    if (!(await this.ctx.storage.getAlarm())) await this.ctx.storage.setAlarm(this.api.nextWipe() + 5000);
    return this.api;
  }

  async fetch(request) {
    return (await this.ready()).fetch(request);
  }

  async alarm() {
    const api = await this.ready();
    await api.rollover();
    await this.ctx.storage.setAlarm(api.nextWipe() + 5000);
  }
}

const API = new Set(['/e', '/register', '/state', '/stream', '/health']);

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    const path = pathname.replace(/\/+$/, '') || '/';
    if (!env.WORKSHOP_CODE) return new Response('panel not configured', { status: 503 });
    if (API.has(path) || path.startsWith('/admin/') || request.method === 'OPTIONS') {
      const stub = env.PANEL.get(env.PANEL.idFromName(env.WORKSHOP_CODE));
      // only what the API needs goes on: method, path, the two workshop headers, Origin and the body
      const headers = new Headers();
      for (const h of ['Content-Type', 'Content-Length', 'X-Workshop-Code', 'X-Participant', 'X-Admin-Token', 'Origin', 'Access-Control-Request-Method', 'Access-Control-Request-Headers']) {
        const v = request.headers.get(h);
        if (v) headers.set(h, v);
      }
      const body = request.method === 'POST' ? await request.arrayBuffer() : undefined;
      return stub.fetch(new Request(new URL(path + new URL(request.url).search, 'https://panel.internal'), { method: request.method, headers, body }));
    }
    return new Response('Workshop panel API. The page is on Cloudflare Pages.', { status: 404, headers: { 'Content-Type': 'text/plain' } });
  },
};
