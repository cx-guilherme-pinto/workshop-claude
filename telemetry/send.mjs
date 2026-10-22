#!/usr/bin/env node
// Sends the panel queue (docs/pt/WORKSHOP-V2-SPEC.md, section 6.4). Started detached by telemetry/lib.mjs (record →
// kickSender) at most once every 2 s; never by a hook directly, never blocking anything.
//
// - Only once registered (config.json participant, ctl.mjs register), with a panel address and the config in force.
// - One sender at a time (send.lock). It takes queue.jsonl atomically (rename to queue.sending.jsonl, so the hooks
//   keep appending to a fresh queue) and sends it in batches of at most 50 events: POST <panel>/e with the header
//   X-Workshop-Code, a 2 s timeout each.
// - It deletes only what the server confirmed: 204 = the whole batch; 429 {processed: n} = the first n; a timeout or
//   no network = nothing (the queue waits, at most 2000 events). A batch the server refuses as malformed (400, 413)
//   is dropped: it would never be accepted. A wrong workshop code (403) keeps the events.
// - The last 20 events sent go to sent.jsonl, for `ctl.mjs show`. The server ignores a duplicate (a retry after a
//   timeout), so nothing is counted twice.
// - 401 (the panel was wiped at midnight and no longer knows the credential): needs_register in config.json; the
//   telemetry hook then runs ctl.mjs register in the background (hooks/telemetry.mjs), never silently giving up.
import { closeSync, existsSync, openSync, renameSync, rmSync, statSync, writeFileSync, writeSync } from 'node:fs';
import { isMain } from '../orchestrator/lib/is-main.mjs';
import { QUEUE_MAX, active, paths, readConfig, readLines, writeJson } from './lib.mjs';

const BATCH = 50;
const TIMEOUT_MS = 2000;
const LOCK_STALE_MS = 60000;
const SENT_KEEP = 20;

function lock(P) {
  try {
    const fd = openSync(P.sendLock, 'wx');
    writeSync(fd, String(process.pid));
    closeSync(fd);
    return true;
  } catch {
    try {
      if (Date.now() - statSync(P.sendLock).mtimeMs > LOCK_STALE_MS) {
        rmSync(P.sendLock, { force: true });
        return lock(P);
      }
    } catch {
      /* gone meanwhile */
    }
    return false;
  }
}

const writeLines = (file, list) => (list.length ? writeFileSync(file, list.map((e) => JSON.stringify(e)).join('\n') + '\n', 'utf8') : rmSync(file, { force: true }));

function remember(P, list) {
  const kept = [...readLines(P.sent), ...list].slice(-SENT_KEEP);
  writeLines(P.sent, kept);
}

async function post(url, ws, part, events, fetchImpl) {
  try {
    const r = await fetchImpl(`${url.replace(/\/+$/, '')}/e`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Workshop-Code': ws, 'X-Participant': `${part.p}.${part.credential}` },
      body: JSON.stringify(events),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (r.status === 204) return { done: events.length };
    if (r.status === 429) {
      const j = await r.json().catch(() => ({}));
      return { done: Math.max(0, Math.min(events.length, Number(j.processed) || 0)), stop: true };
    }
    if (r.status === 400 || r.status === 413) return { done: events.length, dropped: true };
    // the panel no longer knows this credential (it deletes everything at the end of each day, D-34): the registration
    // is gone, and the waiting events carry the old id. The next hook registers again by itself (needs_register) and
    // the registration puts today's local book back in the queue (backfill)
    if (r.status === 401) return { done: 0, stop: true, unregistered: true };
    return { done: 0, stop: true };
  } catch {
    return { done: 0, stop: true };
  }
}

// One run: sends what is queued now. Returns { sent, left }.
export async function sendQueue({ P = paths(), fetchImpl = fetch, now = new Date() } = {}) {
  const cfg = readConfig(P);
  if (!active(cfg, now) || !cfg.participant?.p || !cfg.panel_url) return { sent: 0, left: readLines(P.queue).length + readLines(P.sending).length };
  if (!lock(P)) return { sent: 0, left: -1 };
  let sent = 0;
  try {
    for (let round = 0; round < 100; round++) {
      if (!existsSync(P.sending)) {
        if (!existsSync(P.queue)) break;
        renameSync(P.queue, P.sending);
      }
      let list = readLines(P.sending).slice(-QUEUE_MAX);
      if (!list.length) {
        rmSync(P.sending, { force: true });
        continue;
      }
      let stop = false;
      while (list.length && !stop) {
        const batch = list.slice(0, BATCH);
        const r = await post(cfg.panel_url, cfg.workshop, cfg.participant, batch, fetchImpl);
        if (r.done) {
          if (!r.dropped) {
            remember(P, batch.slice(0, r.done));
            sent += r.done;
          }
          list = list.slice(r.done);
          writeLines(P.sending, list);
        }
        stop = !!r.stop;
        if (r.unregistered) {
          writeJson(P.config, { ...readConfig(P), participant: null, needs_register: now.toISOString() });
          rmSync(P.sending, { force: true });
          rmSync(P.queue, { force: true });
        }
      }
      if (stop) break;
    }
  } finally {
    rmSync(P.sendLock, { force: true });
  }
  return { sent, left: readLines(P.queue).length + readLines(P.sending).length };
}

if (isMain(import.meta.url)) {
  try {
    await sendQueue();
    // What a hook queued while this run was sending (its kick fell inside the 2 s window) goes in a second run.
    await new Promise((ok) => setTimeout(ok, 2500));
    await sendQueue();
  } catch {
    /* the queue waits for the next run */
  }
  process.exit(0);
}
