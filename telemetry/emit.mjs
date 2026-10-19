#!/usr/bin/env node
// Records one telemetry event from a script or a skill (docs/pt/WORKSHOP-V2-SPEC.md, section 6.4):
//
//   node ~/.workshop-claude/kit/telemetry/emit.mjs <event> [field=value ...]
//   node emit.mjs p2_plan n_agents=4
//   node emit.mjs p1_plan parallel=8 model=haiku forecast_min=null tasks=31
//
// Values are read as JSON when they parse (numbers, null, true), otherwise as text. Fields outside the allowlist
// are dropped. It never does network (send.mjs does, Phase 2), prints nothing and always exits with 0: a skill
// or a script must never fail because of the panel.
import { isMain } from '../orchestrator/lib/is-main.mjs';
import { record } from './lib.mjs';

export function parseFields(args) {
  const out = {};
  for (const a of args) {
    const i = a.indexOf('=');
    if (i <= 0) continue;
    const k = a.slice(0, i);
    const raw = a.slice(i + 1);
    try {
      out[k] = JSON.parse(raw);
    } catch {
      out[k] = raw;
    }
  }
  return out;
}

export function emit(ev, fields = {}, opts = {}) {
  try {
    return record(ev, fields, opts);
  } catch {
    return { recorded: false, queued: false };
  }
}

if (isMain(import.meta.url)) {
  const [ev, ...rest] = process.argv.slice(2);
  if (ev) emit(ev, parseFields(rest));
  process.exit(0);
}
