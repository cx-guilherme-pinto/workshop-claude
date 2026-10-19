// Local telemetry of the kit (docs/pt/WORKSHOP-V2-SPEC.md, sections 4.3, 6.4 and 6.6).
//
// Everything lives in ~/.workshop-claude/telemetry/ (WORKSHOP_TELEMETRY_DIR for tests):
//   config.json   written by the installer: room, workshop code, panel, expiry, projects folder; and, after
//                 ctl.mjs register (D-34), "participant": the id and credential the panel gave this GitHub account
//   id            16 random bytes (hex), the local id before the registration (never sent)
//   local.jsonl   every allowed event, also with participation off (the person's own mission book)
//   queue.jsonl   only once registered: what send.mjs will send, already in the envelope
//   seen.json     features already seen per session (hash of the session id), for "once per session"
//   missions.json the mission book, written by missions/missions.mjs
//   queue.sending.jsonl, sent.jsonl, cost-seen.json   used by send.mjs and the cost events
// Nothing here ever does network: record() only starts send.mjs (detached, at most once every 2 s) when it queued
// something and the config has a panel address. Past expires_at nothing is recorded.
import { appendFileSync, closeSync, existsSync, mkdirSync, openSync, readFileSync, readSync, renameSync, statSync, utimesSync, writeFileSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { createHash, randomBytes } from 'node:crypto';
import { envelope, sanitize } from './schema.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
export const QUEUE_MAX = 2000;

export function homeDir(env = process.env) {
  return env.WS_HOME_OVERRIDE || (process.platform === 'win32' ? env.USERPROFILE || homedir() : env.HOME || homedir());
}

export function telemetryDir(env = process.env) {
  return env.WORKSHOP_TELEMETRY_DIR || join(homeDir(env), '.workshop-claude', 'telemetry');
}

export function paths(dir = telemetryDir()) {
  return {
    dir,
    config: join(dir, 'config.json'),
    id: join(dir, 'id'),
    local: join(dir, 'local.jsonl'),
    queue: join(dir, 'queue.jsonl'),
    seen: join(dir, 'seen.json'),
    missions: join(dir, 'missions.json'),
    lock: join(dir, 'missions.lock'),
    sending: join(dir, 'queue.sending.jsonl'),
    sent: join(dir, 'sent.jsonl'),
    sendLock: join(dir, 'send.lock'),
    sendStamp: join(dir, 'send.stamp'),
    costSeen: join(dir, 'cost-seen.json'),
  };
}

let allowCache = null;
export function allowlist() {
  allowCache ??= JSON.parse(readFileSync(join(HERE, 'allowlist.json'), 'utf8'));
  return allowCache;
}

export function readJson(file, fallback = null) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

export function writeJson(file, obj) {
  mkdirSync(dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(obj, null, 2) + '\n', 'utf8');
  try {
    renameSync(tmp, file);
  } catch {
    writeFileSync(file, JSON.stringify(obj, null, 2) + '\n', 'utf8'); // Windows: rename over an open file
  }
}

export function readConfig(P = paths()) {
  const c = readJson(P.config);
  return c && c.v === 1 ? c : null;
}

// The config is in force: it exists and has not expired.
export function active(cfg, now = new Date()) {
  if (!cfg) return false;
  const exp = Date.parse(cfg.expires_at || '');
  return Number.isNaN(exp) || now.getTime() < exp;
}

export function readId(P = paths(), { create = false } = {}) {
  try {
    const id = readFileSync(P.id, 'utf8').trim();
    if (/^[0-9a-f]{32}$/.test(id)) return id;
  } catch {
    /* no id yet */
  }
  if (!create) return null;
  const id = randomBytes(16).toString('hex');
  mkdirSync(P.dir, { recursive: true });
  writeFileSync(P.id, id + '\n', 'utf8');
  return id;
}

// Appends one JSON line; if the file ends in a cut line (a crash), starts on a new line.
export function appendLine(file, obj) {
  mkdirSync(dirname(file), { recursive: true });
  let before = '';
  try {
    const s = statSync(file);
    if (s.size) {
      const fd = openSync(file, 'r');
      const b = Buffer.alloc(1);
      try {
        readSync(fd, b, 0, 1, s.size - 1);
      } finally {
        closeSync(fd);
      }
      if (b[0] !== 10) before = '\n';
    }
  } catch {
    /* new file */
  }
  appendFileSync(file, before + JSON.stringify(obj) + '\n', 'utf8');
}

export function readLines(file) {
  let text = '';
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    return [];
  }
  const out = [];
  for (const l of text.split('\n')) {
    if (!l.trim()) continue;
    try {
      out.push(JSON.parse(l));
    } catch {
      /* a cut line */
    }
  }
  return out;
}

// Keeps the queue at QUEUE_MAX events: the oldest go first (spec 6.4).
function capQueue(file) {
  try {
    if (statSync(file).size < QUEUE_MAX * 200) return;
    const lines = readFileSync(file, 'utf8').split('\n').filter((l) => l.trim());
    if (lines.length <= QUEUE_MAX) return;
    writeFileSync(file, lines.slice(-QUEUE_MAX).join('\n') + '\n', 'utf8');
  } catch {
    /* nothing to cap */
  }
}

// Records one event: in local.jsonl always (while the config is in force), in queue.jsonl only with
// participation on. `local` holds the fields that never leave the machine. Returns what happened.
export function record(ev, fields = {}, { local = {}, P = paths(), now = new Date() } = {}) {
  const cfg = readConfig(P);
  if (!active(cfg, now)) return { recorded: false, queued: false };
  const allow = allowlist();
  const s = sanitize(allow, ev, fields, local);
  const t = now.toISOString();
  appendLine(P.local, { t, ev, ...s.fields, ...(Object.keys(s.local).length ? { local: s.local } : {}) });
  let queued = false;
  const part = cfg.participant;
  if (part?.p && !s.localOnly) {
    const p = part.p;
    const e = envelope(allow, { ws: cfg.workshop, room: cfg.room, p, kit: cfg.kit, ev, t }, s.fields);
    if (e) {
      appendLine(P.queue, e);
      capQueue(P.queue);
      queued = true;
    }
  }
  if (queued) kickSender(P, cfg);
  return { recorded: true, queued };
}

// Starts send.mjs in the background, at most once every 2 s (spec 6.4). With HTTPS_PROXY in the environment (the
// setup puts the company proxy in Claude Code's env, which the hooks inherit), Node's fetch uses it
// (NODE_USE_ENV_PROXY); the company certificate comes from NODE_EXTRA_CA_CERTS or ~/.workshop-claude/ca.pem.
export function kickSender(P = paths(), cfg = readConfig(P), env = process.env) {
  if (!cfg?.participant?.p || !cfg.panel_url || env.WORKSHOP_TELEMETRY_NO_SEND === '1') return false;
  try {
    if (Date.now() - statSync(P.sendStamp).mtimeMs < 2000) return false;
  } catch {
    /* first time */
  }
  try {
    writeFileSync(P.sendStamp, '');
    const t = new Date();
    utimesSync(P.sendStamp, t, t);
    const ca = join(dirname(P.dir), 'ca.pem');
    const childEnv = { ...env, WORKSHOP_TELEMETRY_DIR: P.dir, NODE_USE_ENV_PROXY: '1', ...(!env.NODE_EXTRA_CA_CERTS && existsSync(ca) ? { NODE_EXTRA_CA_CERTS: ca } : {}) };
    const c = spawn(process.execPath, [join(HERE, 'send.mjs')], { detached: true, stdio: 'ignore', windowsHide: true, env: childEnv });
    c.unref();
    return true;
  } catch {
    return false;
  }
}

const inside = (child, parent) => {
  const r = relative(resolve(parent), resolve(child));
  return r === '' || (!!r && !r.startsWith('..') && !isAbsolute(r));
};

// The project of a hook call: { proj, project: missions | p1 | p2 } inside the workshop projects folder (or a project
// with .workshop/, the participant's own repository in Project 2), otherwise null. The path never leaves the machine.
export function scope(proj, cfg) {
  if (!proj || typeof proj !== 'string') return null;
  const root = cfg?.projects_dir;
  if (root && inside(proj, root)) {
    const name = basename(relative(resolve(root), resolve(proj)).split(/[\\/]/)[0] || '');
    const project = name === 'missions-project' ? 'missions' : ['canivete-project', 'demo-project'].includes(name) ? 'p1' : 'p2';
    return { proj, project };
  }
  if (existsSync(join(proj, '.workshop'))) return { proj, project: 'p2' };
  return null;
}

export const family = (m) => {
  const s = String(m || '').toLowerCase();
  return s.includes('haiku') ? 'haiku' : s.includes('sonnet') ? 'sonnet' : s.includes('opus') ? 'opus' : 'other';
};

// Cost events from the kit's cost hooks: a subagent's cost once (SubagentStop), the main session's growth since the
// last Stop of the same session (Stop records the session's cumulative cost per model).
export function recordCosts({ proj, sessionId, sub = null, byModel = null, P = paths(), now = new Date() }) {
  const cfg = readConfig(P);
  if (!active(cfg, now)) return 0;
  const sc = scope(proj, cfg);
  if (!sc) return 0;
  const out = [];
  if (sub && typeof sub.usd === 'number' && sub.usd > 0) out.push({ usd: sub.usd, model: sub.model });
  if (byModel && typeof byModel === 'object') {
    const seen = readJson(P.costSeen, {}) || {};
    const key = createHash('sha256').update(String(sessionId || 'none')).digest('hex').slice(0, 16);
    const prev = seen[key]?.m || {};
    for (const [m, v] of Object.entries(byModel)) {
      const d = (typeof v === 'number' ? v : 0) - (prev[m] || 0);
      if (d > 0.000001) out.push({ usd: d, model: m });
    }
    seen[key] = { m: { ...prev, ...byModel }, t: Date.now() };
    const keys = Object.keys(seen);
    if (keys.length > 200) for (const k of keys.sort((a, b) => seen[a].t - seen[b].t).slice(0, keys.length - 200)) delete seen[k];
    writeJson(P.costSeen, seen);
  }
  for (const c of out) record('cost', { cost_usd: Math.min(c.usd, 1000), model: family(c.model), block: sc.project }, { P, now });
  return out.length;
}
