// The local server's store for panel/api.mjs: an append-only log data/<ws>/events.jsonl (one {seq, e} per line,
// also the source of a replay) and meta.json (the snapshot and the phase). The Durable Object has the same
// interface on SQLite (panel/worker/index.mjs).
import { appendFileSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export function fileStore(dir) {
  mkdirSync(dir, { recursive: true });
  const log = join(dir, 'events.jsonl');
  const metaFile = join(dir, 'meta.json');
  let seq = 0;
  const keys = new Set();
  const rows = [];
  if (existsSync(log)) {
    for (const l of readFileSync(log, 'utf8').split('\n')) {
      if (!l.trim()) continue;
      try {
        const r = JSON.parse(l);
        rows.push(r);
        keys.add(JSON.stringify(r.e));
        seq = Math.max(seq, r.seq);
      } catch {
        /* a cut line */
      }
    }
  }
  let meta = {};
  try {
    meta = JSON.parse(readFileSync(metaFile, 'utf8'));
  } catch {
    /* new store */
  }
  const saveMeta = () => {
    writeFileSync(metaFile + '.tmp', JSON.stringify(meta));
    renameSync(metaFile + '.tmp', metaFile);
  };
  return {
    log,
    append(e, key) {
      if (keys.has(key)) return null;
      keys.add(key);
      const r = { seq: ++seq, e };
      rows.push(r);
      appendFileSync(log, JSON.stringify(r) + '\n');
      return r.seq;
    },
    since(n) {
      return rows.filter((r) => r.seq > n);
    },
    getMeta(k) {
      return meta[k] ?? null;
    },
    setMeta(k, v) {
      meta[k] = v;
      saveMeta();
    },
    reset() {
      rmSync(log, { force: true });
      rows.length = 0;
      keys.clear();
      seq = 0;
      meta = {};
      saveMeta();
    },
  };
}

// An in-memory store (tests and the simulator's dry runs).
export function memoryStore() {
  let seq = 0;
  const keys = new Set();
  const rows = [];
  const meta = {};
  return {
    rows,
    append(e, key) {
      if (keys.has(key)) return null;
      keys.add(key);
      rows.push({ seq: ++seq, e });
      return seq;
    },
    since: (n) => rows.filter((r) => r.seq > n),
    getMeta: (k) => meta[k] ?? null,
    setMeta: (k, v) => {
      meta[k] = v;
    },
    reset() {
      rows.length = 0;
      keys.clear();
      seq = 0;
      for (const k of Object.keys(meta)) delete meta[k];
    },
  };
}
