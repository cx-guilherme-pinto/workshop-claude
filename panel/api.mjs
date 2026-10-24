// The panel API (docs/pt/WORKSHOP-V2-SPEC.md, section 6.5), written against the web Request/Response so that the
// same code runs in the Cloudflare Durable Object (panel/worker/) and in the local Node server (panel/server.mjs):
//
//   POST /e              a batch of events, headers X-Workshop-Code and X-Participant (<p>.<credential> from
//                        /register; events of another participant are dropped). Each event is checked against the allowlist
//                        (telemetry/schema.mjs); duplicates (a sender retry) are ignored; 120 events/min per
//                        participant. 204 when the whole batch was processed; 429 {processed: n} when the rate limit
//                        stopped it at event n (the sender keeps the rest). Nothing about the request (IP, headers)
//                        is stored.
//   GET  /state          the aggregate state (panel/aggregate.mjs)
//   GET  /stream         the same state as Server-Sent Events, at most 2 per second (?lite=1: 1 per second)
//   POST /admin/phase    {phase}, header X-Admin-Token: the view every screen shows; 'auto' (the default) follows the room
//   POST /admin/hide     {nickname, on}: hide a nickname from the feed (key H on the page)
//   POST /admin/reset    deletes everything: events, registrations and the signing secret (the old credentials stop working)
//   GET  /admin/presenter header X-Admin-Token: for each mission, how many people are at it and who (key P on the page;
//                        never in the public /state)
//   POST /admin/register {name, p?}: registers a person without GitHub (the simulator, a rehearsal, someone the
//                        organizer lets in by hand); answers {p, name, credential}
//   POST /register       {name, account}: registers a person (D-34). No token and no email ever reach the
//                        server: telemetry/ctl.mjs checks on the laptop, with gh, that the GitHub account has a verified
//                        email of the company domain, and sends only the name and "account", a SHA-256 of the
//                        workshop code and the GitHub account id (the same account keeps its participant id). Answers
//                        {p, name, credential}: the credential (an HMAC) is all that goes with the events afterwards.
//   GET  /health        {ok, build}: the commit of the code that answers
//
// Every day is wiped (D-34, the organizer's decision): when the day changes in dayTz (the Worker's DAY_TZ, from
// repos.conf PANEL_TIMEZONE), the first request — or the Durable Object's alarm at midnight, panel/worker/ — deletes
// all of it, as /admin/reset does. Nothing of one day's workshop is left for the next.
//
// store: { append(event, key) → seq | null (duplicate), since(seq) → [{seq, e}], getMeta(k), setMeta(k, v), reset() }
// (sync or async). The aggregate is rebuilt from the last snapshot plus the events after it.
import { checkIncoming } from '../telemetry/schema.mjs';
import { AUTO, Aggregate, PHASES } from './aggregate.mjs';

export const BATCH_MAX = 50;
export const BODY_MAX = 64 * 1024;
export const RATE_PER_MIN = 120;
const SNAPSHOT_MS = 2000;
const KEEPALIVE_MS = 15000;

const enc = new TextEncoder();

// The calendar day (YYYY-MM-DD) of an instant in a time zone; an unknown zone falls back to UTC.
export function dayOf(t, tz = 'UTC') {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(t));
  } catch {
    return new Date(t).toISOString().slice(0, 10);
  }
}

// The next midnight in the time zone after t (the first millisecond whose day differs), for the Durable Object's alarm.
export function nextMidnight(t, tz = 'UTC') {
  const today = dayOf(t, tz);
  let lo = t;
  let hi = t + 26 * 3600 * 1000;
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    if (dayOf(mid, tz) === today) lo = mid;
    else hi = mid;
  }
  return hi;
}

const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
async function hmac(secret, text) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(text)));
}

export async function createApi({ allow, wsCode, adminToken, store, now = () => Date.now(), allowedOrigins = [], throttleMs = 500, dayTz = 'UTC', build = 'dev' }) {
  if (!wsCode) throw new Error('createApi: wsCode is required');
  // a store from another day is wiped before anything is read from it; so is one without a day at all (made before
  // the daily wipe existed: nobody can tell which day its data is from)
  if ((await store.getMeta('day')) !== dayOf(now(), dayTz)) {
    await store.reset();
    await store.setMeta('day', dayOf(now(), dayTz));
  }
  let agg = Aggregate.fromJSON(JSON.parse((await store.getMeta('snapshot')) || 'null'));
  agg.ws = wsCode;
  // an old snapshot (agg.stale): rebuilt from the first event
  let lastSeq = agg.stale ? 0 : Number((await store.getMeta('snapshot_seq')) || 0);
  for (const { seq, e } of await store.since(lastSeq)) {
    agg.apply(e);
    lastSeq = Math.max(lastSeq, seq);
  }
  // The signing secret of the credentials: created once and kept in the store (never leaves the server).
  let secret = await store.getMeta('secret');
  const newSecret = async () => {
    secret = hex(crypto.getRandomValues(new Uint8Array(32)));
    await store.setMeta('secret', secret);
  };
  if (!secret) await newSecret();
  const credential = (p) => hmac(secret, `${wsCode}:${p}`);
  const rate = new Map();
  const subs = new Set();
  let registrations = [];
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
      'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Token, X-Workshop-Code, X-Participant',
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

  // Deletes everything (the daily wipe and /admin/reset): events, snapshot, registrations, and a new signing secret.
  async function wipe() {
    if (snapTimer) clearTimeout(snapTimer);
    snapTimer = null;
    await store.reset();
    await store.setMeta('day', dayOf(now(), dayTz));
    await newSecret();
    agg = new Aggregate({ ws: wsCode });
    lastSeq = 0;
    rate.clear();
    registrations = [];
    await snapshot();
    changed();
  }
  // true when the day changed and everything was deleted
  async function rollover() {
    if ((await store.getMeta('day')) === dayOf(now(), dayTz)) return false;
    await wipe();
    return true;
  }

  async function postEvents(req) {
    if (req.headers.get('X-Workshop-Code') !== wsCode) return json(req, 403, { error: 'workshop code' });
    const [who, sig] = String(req.headers.get('X-Participant') || '').split('.');
    if (!/^[0-9a-f]{32}$/.test(who || '') || !sig || sig !== (await credential(who))) return json(req, 401, { error: 'participant' });
    const { body, error } = await readBody(req);
    if (error) return json(req, error, { error: 'body' });
    const list = Array.isArray(body) ? body : body?.events;
    if (!Array.isArray(list) || list.length > BATCH_MAX) return json(req, 413, { error: `at most ${BATCH_MAX} events` });
    const t = now();
    let processed = 0;
    let any = false;
    for (const raw of list) {
      const e = checkIncoming(allow, raw, wsCode);
      if (e && e.p === who) {
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

  async function register(req) {
    if (req.headers.get('X-Workshop-Code') !== wsCode) return json(req, 403, { error: 'workshop code' });
    const t = now();
    registrations = registrations.filter((x) => t - x < 60000);
    if (registrations.length >= 400) return json(req, 429, { error: 'too many registrations' });
    registrations.push(t);
    const { body, error } = await readBody(req);
    if (error) return json(req, error, { error: 'body' });
    // only these two fields are read (an old kit still sends a room: ignored)
    const account = String(body?.account || '');
    if (!/^[0-9a-f]{64}$/.test(account) || typeof body?.name !== 'string' || !body.name.trim() || body.name.length > 100) {
      return json(req, 400, { error: 'name and account' });
    }
    // the same GitHub account (the same hash) keeps its participant id: a second laptop, a re-run of the setup
    const known = JSON.parse((await store.getMeta('participants')) || '{}');
    const p = known[account] || hex(crypto.getRandomValues(new Uint8Array(16)));
    known[account] = p;
    await store.setMeta('participants', JSON.stringify(known));
    return json(req, 200, await enrol(p, body.name, t));
  }

  // Records a registration (an internal "register" event: the name reaches the leaderboard and the replays).
  async function enrol(p, rawName, t = now()) {
    const name = String(rawName || '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, 60) || 'GitHub';
    const e = { v: 1, ws: wsCode, p, ev: 'register', t: new Date(t).toISOString(), kit: 'panel', name };
    const seq = await store.append(e, `register:${p}:${name}`);
    if (seq !== null && seq !== undefined) lastSeq = Math.max(lastSeq, seq);
    agg.apply(e);
    changed();
    later();
    return { p, name, credential: await credential(p) };
  }

  async function admin(req, what) {
    if (!adminToken || req.headers.get('X-Admin-Token') !== adminToken) return json(req, 403, { error: 'admin token' });
    const { body, error } = what === 'reset' ? { body: {} } : await readBody(req);
    if (error) return json(req, error, { error: 'body' });
    if (what === 'register') {
      const p = /^[0-9a-f]{32}$/.test(body?.p || '') ? body.p : hex(crypto.getRandomValues(new Uint8Array(16)));
      if (typeof body?.name !== 'string' || !body.name.trim()) return json(req, 400, { error: 'name' });
      return json(req, 200, await enrol(p, body.name));
    }
    if (what === 'phase') {
      if (!PHASES.includes(body?.phase) && body?.phase !== AUTO) return json(req, 400, { error: `phase: ${[AUTO, ...PHASES].join('|')}` });
      agg.setPhase(body.phase);
    } else if (what === 'hide') {
      if (!agg.hide(body?.name ?? body?.nickname, body?.on !== false)) return json(req, 400, { error: 'name' });
    } else if (what === 'reset') {
      await wipe();
    }
    await snapshot();
    changed();
    return json(req, 200, { ok: true, phase: agg.shown(now()), mode: agg.phase === AUTO ? 'auto' : 'forced' });
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
    rollover,
    nextWipe: () => nextMidnight(now(), dayTz),
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
        await rollover();
        if (req.method === 'POST' && path === '/e') return await postEvents(req);
        if (req.method === 'POST' && path === '/register') return await register(req);
        if (req.method === 'GET' && path === '/state') return json(req, 200, agg.state(now()));
        if (req.method === 'GET' && path === '/stream') return stream(req);
        // build: the commit the running code came from (deploy-panel.sh --var BUILD). Answered by the Durable Object,
        // so after a deploy it tells whether the old object is still the one running (it is while panel tabs stay open)
        if (req.method === 'GET' && path === '/health') return json(req, 200, { ok: true, build });
        if (req.method === 'GET' && path === '/admin/presenter') {
          if (!adminToken || req.headers.get('X-Admin-Token') !== adminToken) return json(req, 403, { error: 'admin token' });
          return json(req, 200, agg.presenter(now()));
        }
        if (req.method === 'POST' && path.startsWith('/admin/')) {
          const what = path.slice(7);
          if (['phase', 'hide', 'reset', 'register'].includes(what)) return await admin(req, what);
        }
        return json(req, 404, { error: 'not found' });
      } catch {
        return json(req, 500, { error: 'server' });
      }
    },
  };
}
