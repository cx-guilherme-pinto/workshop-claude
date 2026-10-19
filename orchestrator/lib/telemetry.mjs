// The orchestrator's bridge to the workshop telemetry (telemetry/lib.mjs; docs/pt/WORKSHOP-V2-SPEC.md, 6.4).
// The engine runs in two places: in the installed kit (~/.workshop-claude/kit/orchestrator/, with telemetry/ next to
// it) and copied into a Project 1 folder (<project>/tools/workshop/orchestrator/, without telemetry/). This module
// finds the telemetry library in either place and records an event; without it, it does nothing. It never throws,
// never prints and never does network itself.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

function candidates(env = process.env) {
  const home = env.WS_HOME_OVERRIDE || (process.platform === 'win32' ? env.USERPROFILE || homedir() : env.HOME || homedir());
  return [join(HERE, '..', '..', 'telemetry', 'lib.mjs'), join(home, '.workshop-claude', 'kit', 'telemetry', 'lib.mjs')];
}

let lib;
export async function telemetry(env = process.env) {
  if (lib !== undefined) return lib;
  lib = null;
  for (const f of candidates(env)) {
    if (!existsSync(f)) continue;
    try {
      lib = await import(pathToFileURL(f).href);
      break;
    } catch {
      /* try the next one */
    }
  }
  return lib;
}

// Records one event (fields outside the allowlist are dropped by the library). Returns true if it was recorded.
export async function emit(ev, fields = {}, opts = {}) {
  try {
    const t = await telemetry();
    return !!t?.record(ev, fields, opts).recorded;
  } catch {
    return false;
  }
}

// P1 ✓ / P2 ✓ in the statusline's mission book: the gate of that project approved (once approved, it stays).
export async function markGate(block, approved) {
  try {
    const t = await telemetry();
    if (!t || !approved || !['p1', 'p2'].includes(block)) return false;
    const P = t.paths();
    if (!t.active(t.readConfig(P))) return false;
    const book = t.readJson(P.missions, null) || { v: 1, done: {} };
    if (book[block]) return true;
    t.writeJson(P.missions, { ...book, [block]: new Date().toISOString() });
    return true;
  } catch {
    return false;
  }
}

// The block of a project folder for the panel: p1 for the Project 1 folders (a workshop.project.json with
// "block": "p1"), otherwise p2 (the practice project or the participant's own repository).
export function blockOf(projectDir) {
  try {
    const f = join(projectDir, 'workshop.project.json');
    if (existsSync(f)) {
      const j = JSON.parse(readFileSync(f, 'utf8'));
      if (j?.block === 'p1' || j?.block === 'p2') return j.block;
    }
  } catch {
    /* fall through */
  }
  return 'p2';
}
