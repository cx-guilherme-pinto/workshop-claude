// The panel API (docs/pt/WORKSHOP-V2-SPEC.md, section 6.5), written against the web Request/Response so that the
// same code runs in the Cloudflare Durable Object (panel/worker/) and in the local Node server (panel/server.mjs):
//
//   POST /e              a batch of events, header X-Workshop-Code. Each event is checked against the allowlist
//                        (telemetry/schema.mjs); duplicates (a sender retry) are ignored; 120 events/min per
//                        participant. 204 when the whole batch was processed; 429 {processed: n} when the rate limit
//                        stopped it at event n (the sender keeps the rest). Nothing about the request (IP, headers)
//                        is stored.
//   GET  /state          the aggregate state (panel/aggregate.mjs)
//   GET  /stream         the same state as Server-Sent Events, at most 2 per second (?lite=1: 1 per second)
//   POST /admin/phase    {phase}, header X-Admin-Token: the view both rooms see
//   POST /admin/hide     {nickname, on}: hide a nickname from the feed (key H on the page)
//   POST /admin/reset    clears the workshop's events
//   GET  /health
//
// store: { append(event, key) → seq | null (duplicate), since(seq) → [{seq, e}], getMeta(k), setMeta(k, v), reset() }
// (sync or async). The aggregate is rebuilt from the last snapshot plus the events after it.
import { checkIncoming } from '../telemetry/schema.mjs';
import { Aggregate, PHASES } from './aggregate.mjs';

export const BATCH_MAX = 50;
export const BODY_MAX = 64 * 1024;
export const RATE_PER_MIN = 120;
const SNAPSHOT_MS = 2000;
const KEEPALIVE_MS = 15000;

const enc = new TextEncoder();

export async function createApi({ allow, wsCode, adminToken, store, now = () => Date.now(), allowedOrigins = [], throttleMs = 500 }) {
  if (!wsCode) throw new Error('createApi: wsCode is required');
  let agg = Aggregate.fromJSON(JSON.parse((await store.getMeta('snapshot')) || 'null'));
  agg.ws = wsCode;
  let lastSeq = Number((await store.getMeta('snapshot_seq')) || 0);
  for (const { seq, e } of await store.since(lastSeq)) {
    agg.apply(e);
    lastSeq = Math.max(lastSeq, seq);
  }
  const rate = new Map();
  const subs = new Set();
  let timer = null;
  let snapTimer = null;

  const snapshot = async () => {
    snapTimer = null;
    await store.setMeta('snapshot', JSON.stringify(agg));
    await store.setMeta('snapshot_seq', String(lastSeq));
  };
  const later = () => {
    if (!snapTimer) snapTimer = setTimeout(() => snapshot().catch(() => {}), SNAPSHOT_MS);
  };

  const send = (s, text) => {
    try {
      s.controller.enqueue(enc.encode(text));
    } catch {
      subs.delete(s);
    }
  };
  let version = 0;
  const message = () => `data: ${JSON.stringify(agg.state(now()))}\n\n`;
  const broadcast = () => {
    timer = null;
    const full = [...subs].filter((s) => !s.lite);
    if (!full.length) return;
    const msg = message();
    for (const s of full) {
      s.version = version;
      send(s, msg);
    }
  };
  const changed = () => {
    version++;
    if (!timer) timer = setTimeout(broadcast, throttleMs);
  };

  const cors = (req, extra = {}) => {
    const origin = req.headers.get('Origin');
    const ok = origin && (allowedOrigins.includes('*') || allowedOrigins.includes(origin));
    return {
      'Access-Control-Allow-Origin': ok ? origin : '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Token, X-Workshop-Code',
      'Access-Control-Max-Age': '600',
      Vary: 'Origin',
      ...extra,
    };
  };
  const json = (req, status, obj, h = {}) => new Response(obj === null ? null : JSON.stringify(obj), { status, headers: cors(req, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...h }) });

  // 120 events per minute per participant (a sliding minute).
  const allowRate = (p, t) => {
    const w = (rate.get(p) || []).filter((x) => t - x < 60000);
    if (w.length >= RATE_PER_MIN) {
      rate.set(p, w);
      return false;
    }
    w.push(t);
    rate.set(p, w);
    return true;
  };

  async function readBody(req) {
    const len = Number(req.headers.get('Content-Length') || 0);
    if (len > BODY_MAX) return { error: 413 };
    const text = await req.text();
    if (text.length > BODY_MAX) return { error: 413 };
    try {
      return { body: JSON.parse(text) };
    } catch {
      return { error: 400 };
    }
  }

  async function postEvents(req) {
    if (req.headers.get('X-Workshop-Code') !== wsCode) return json(req, 403, { error: 'workshop code' });
    const { body, error } = await readBody(req);
    if (error) return json(req, error, { error: 'body' });
    const list = Array.isArray(body) ? body : body?.events;
    if (!Array.isArray(list) || list.length > BATCH_MAX) return json(req, 413, { error: `at most ${BATCH_MAX} events` });
    const t = now();
    let processed = 0;
    let any = false;
    for (const raw of list) {
      const e = checkIncoming(allow, raw, wsCode);
      if (e) {
        if (!allowRate(e.p, t)) return finish(json(req, 429, { processed }, { 'Retry-After': '30' }));
        const seq = await store.append(e, JSON.stringify(e));
        if (seq !== null && seq !== undefined) {
          lastSeq = Math.max(lastSeq, seq);
          any = agg.apply(e) || any;
        }
      }
      processed++;
    }
    return finish(new Response(null, { status: 204, headers: cors(req) }));
    function finish(r) {
      if (any) {
        changed();
        later();
      }
      return r;
    }
  }

  async function admin(req, what) {
    if (!adminToken || req.headers.get('X-Admin-Token') !== adminToken) return json(req, 403, { error: 'admin token' });
    const { body, error } = what === 'reset' ? { body: {} } : await readBody(req);
    if (error) return json(req, error, { error: 'body' });
    if (what === 'phase') {
      if (!PHASES.includes(body?.phase)) return json(req, 400, { error: `phase: ${PHASES.join('|')}` });
      agg.setPhase(body.phase);
    } else if (what === 'hide') {
      if (!agg.hide(body?.nickname, body?.on !== false)) return json(req, 400, { error: 'nickname' });
    } else if (what === 'reset') {
      await store.reset();
      agg = new Aggregate({ ws: wsCode });
      lastSeq = 0;
      rate.clear();
    }
    await snapshot();
    changed();
    return json(req, 200, { ok: true, phase: agg.phase });
  }

  function stream(req) {
    const lite = new URL(req.url).searchParams.get('lite') === '1';
    let sub;
    let ka;
    let tick;
    const body = new ReadableStream({
      start(controller) {
        sub = { controller, lite, version, stop: () => (clearInterval(ka), clearInterval(tick)) };
        subs.add(sub);
        send(sub, `retry: 2000\n${message()}`);
        ka = setInterval(() => send(sub, ': keepalive\n\n'), KEEPALIVE_MS);
        // ?lite=1 (a slow projector): at most one update per second
        if (lite)
          tick = setInterval(() => {
            if (sub.version === version) return;
            sub.version = version;
            send(sub, message());
          }, 1000);
      },
      cancel() {
        clearInterval(ka);
        clearInterval(tick);
        subs.delete(sub);
      },
    });
    return new Response(body, { status: 200, headers: cors(req, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' }) });
  }

  return {
    get aggregate() {
      return agg;
    },
    subscribers: () => subs.size,
    flush: async () => {
      if (timer) {
        clearTimeout(timer);
        broadcast();
      }
      if (snapTimer) {
        clearTimeout(snapTimer);
        await snapshot();
      }
    },
    close: () => {
      clearTimeout(timer);
      clearTimeout(snapTimer);
      for (const s of subs) {
        s.stop?.();
        try {
          s.controller.close();
        } catch {
          /* already closed */
        }
      }
      subs.clear();
    },
    async fetch(req) {
      const url = new URL(req.url);
      const path = url.pathname.replace(/\/+$/, '') || '/';
      try {
        if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(req) });
        if (req.method === 'POST' && path === '/e') return await postEvents(req);
        if (req.method === 'GET' && path === '/state') return json(req, 200, agg.state(now()));
        if (req.method === 'GET' && path === '/stream') return stream(req);
        if (req.method === 'GET' && path === '/health') return json(req, 200, { ok: true });
        if (req.method === 'POST' && path.startsWith('/admin/')) {
          const what = path.slice(7);
          if (['phase', 'hide', 'reset'].includes(what)) return await admin(req, what);
        }
        return json(req, 404, { error: 'not found' });
      } catch {
        return json(req, 500, { error: 'server' });
      }
    },
  };
}
