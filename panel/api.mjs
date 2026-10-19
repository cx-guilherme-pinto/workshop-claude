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
//   POST /admin/phase    {phase}, header X-Admin-Token: the view both rooms see
//   POST /admin/hide     {nickname, on}: hide a nickname from the feed (key H on the page)
//   POST /admin/reset    clears the workshop's events
//   POST /admin/register {name, room, p?}: registers a person without GitHub (the simulator, a rehearsal, someone the
//                        organizer lets in by hand); answers {p, name, credential}
//   POST /register       {token, room}: registers a person (D-34). The token is the participant's gh token, sent once by
//                        telemetry/ctl.mjs; it is used for two reads of the GitHub API (/user, /user/emails) and
//                        dropped — never stored, never logged. The account needs a verified email of the allowed
//                        domain (checkmarx.com). Answers {p, name, credential}; 403 {reason: "domain"}; 400
//                        {reason: "scope"} when the token cannot read the emails (gh auth refresh -s user:email).
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

const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
async function hmac(secret, text) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(text)));
}
const sha256 = async (text) => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));

// The two reads of the GitHub API for a registration. Returns { id, name, emails } or { error }.
export async function githubIdentity(token, { fetchImpl = fetch, api = 'https://api.github.com' } = {}) {
  const h = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'workshop-panel', 'X-GitHub-Api-Version': '2022-11-28' };
  const u = await fetchImpl(`${api}/user`, { headers: h });
  if (u.status === 401) return { error: 'token' };
  if (!u.ok) return { error: 'github' };
  const user = await u.json();
  const e = await fetchImpl(`${api}/user/emails`, { headers: h });
  if (e.status === 403 || e.status === 404) return { error: 'scope' };
  if (!e.ok) return { error: 'github' };
  return { id: user.id, name: user.name || user.login, emails: await e.json() };
}

export async function createApi({ allow, wsCode, adminToken, store, now = () => Date.now(), allowedOrigins = [], throttleMs = 500, emailDomain = '', github = githubIdentity }) {
  if (!wsCode) throw new Error('createApi: wsCode is required');
  let agg = Aggregate.fromJSON(JSON.parse((await store.getMeta('snapshot')) || 'null'));
  agg.ws = wsCode;
  let lastSeq = Number((await store.getMeta('snapshot_seq')) || 0);
  for (const { seq, e } of await store.since(lastSeq)) {
    agg.apply(e);
    lastSeq = Math.max(lastSeq, seq);
  }
  // The signing secret of the credentials: created once and kept in the store (never leaves the server).
  let secret = await store.getMeta('secret');
  if (!secret) {
    secret = hex(crypto.getRandomValues(new Uint8Array(32)));
    await store.setMeta('secret', secret);
  }
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
    if (registrations.length >= 120) return json(req, 429, { error: 'too many registrations' });
    registrations.push(t);
    const { body, error } = await readBody(req);
    if (error) return json(req, error, { error: 'body' });
    const room = body?.room;
    if (!['A', 'B'].includes(room) || typeof body?.token !== 'string' || body.token.length < 10 || body.token.length > 400) return json(req, 400, { error: 'token and room' });
    let who;
    try {
      who = await github(body.token);
    } catch {
      who = { error: 'github' };
    }
    if (who.error) return json(req, who.error === 'scope' ? 400 : who.error === 'token' ? 401 : 502, { reason: who.error });
    const domain = String(emailDomain || '').toLowerCase();
    const ok = (who.emails || []).some((m) => m?.verified === true && typeof m.email === 'string' && (domain === '*' || m.email.toLowerCase().endsWith('@' + domain)));
    if (!domain || !ok) return json(req, 403, { reason: 'domain' });
    // the same GitHub account gets the same participant id (a second laptop, a re-run of the setup)
    const gh = await sha256(`${wsCode}:${who.id}`);
    const known = JSON.parse((await store.getMeta('participants')) || '{}');
    const p = known[gh] || hex(crypto.getRandomValues(new Uint8Array(16)));
    known[gh] = p;
    await store.setMeta('participants', JSON.stringify(known));
    return json(req, 200, await enrol(p, who.name, room, t));
  }

  // Records a registration (an internal "register" event: the name reaches the leaderboard and the replays).
  async function enrol(p, rawName, room, t = now()) {
    const name = String(rawName || '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, 60) || 'GitHub';
    const e = { v: 1, ws: wsCode, room, p, ev: 'register', t: new Date(t).toISOString(), kit: 'panel', name };
    const seq = await store.append(e, `register:${p}:${room}:${name}`);
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
      if (!['A', 'B'].includes(body?.room) || typeof body?.name !== 'string' || !body.name.trim()) return json(req, 400, { error: 'name and room' });
      return json(req, 200, await enrol(p, body.name, body.room));
    }
    if (what === 'phase') {
      if (!PHASES.includes(body?.phase)) return json(req, 400, { error: `phase: ${PHASES.join('|')}` });
      agg.setPhase(body.phase);
    } else if (what === 'hide') {
      if (!agg.hide(body?.name ?? body?.nickname, body?.on !== false)) return json(req, 400, { error: 'name' });
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
        if (req.method === 'POST' && path === '/register') return await register(req);
        if (req.method === 'GET' && path === '/state') return json(req, 200, agg.state(now()));
        if (req.method === 'GET' && path === '/stream') return stream(req);
        if (req.method === 'GET' && path === '/health') return json(req, 200, { ok: true });
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
