// Local telemetry of the kit (docs/pt/WORKSHOP-V2-SPEC.md, sections 4.3, 6.4 and 6.6).
//
// Everything lives in ~/.workshop-claude/telemetry/ (WORKSHOP_TELEMETRY_DIR for tests):
//   config.json   written by the installer: participation, room, workshop code, panel, expiry, projects folder
//   id            16 random bytes (hex), not derived from the person or the machine
//   local.jsonl   every allowed event, also with participation off (the person's own mission book)
//   queue.jsonl   only with participation on: what send.mjs will send (Phase 2), already in the envelope
//   seen.json     features already seen per session (hash of the session id), for "once per session"
//   missions.json the mission book, written by missions/missions.mjs
// Nothing here ever does network. Past expires_at nothing is recorded.
import { appendFileSync, closeSync, existsSync, mkdirSync, openSync, readFileSync, readSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
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
  if (cfg.enabled === true && !s.localOnly) {
    const p = readId(P, { create: true });
    const e = envelope(allow, { ws: cfg.workshop, room: cfg.room, p, kit: cfg.kit, ev, t }, s.fields);
    if (e) {
      appendLine(P.queue, e);
      capQueue(P.queue);
      queued = true;
    }
  }
  return { recorded: true, queued };
}
