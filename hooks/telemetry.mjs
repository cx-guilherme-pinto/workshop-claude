#!/usr/bin/env node
// Telemetry hook of the workshop (docs/pt/WORKSHOP-V2-SPEC.md, section 6.4; what each event carries is in
// docs/OBSERVABILITY.md). Registered by the installer, "async": true, on SessionStart, UserPromptSubmit,
// UserPromptExpansion, SubagentStart, PostToolUse (Skill|CronCreate|mcp__agent-memory__memory_add|mcp__canivete__.*),
// PostModelSwitch, ConfigChange and Stop.
//
// From the input it keeps only the name of a Claude Code feature that was used (plan_mode, loop…) and drops the
// rest without writing it anywhere: prompts, paths, cwd, transcript_path, tool_input and tool_response never
// leave this process. It acts only in the workshop projects (the projects folder the setup wrote in config.json,
// or a project with .workshop/), records each feature once per session, never does network, prints nothing and
// always exits with 0 within 1 s. When it records something new, at the end of each turn (Stop) and at the start of a
// session, it starts the mission check in the background (at most once every 10 s).
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { isMain } from '../orchestrator/lib/is-main.mjs';
import { active, family, kickSender, paths, pending, readConfig, readJson, record, scope, writeJson } from '../telemetry/lib.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const LIMIT_MS = 1000;
const SEEN_MAX = 200;
// the tests make it shorter (WORKSHOP_CHECK_EVERY_MS), so they do not wait 10 s
const CHECK_EVERY_MS = Number(process.env.WORKSHOP_CHECK_EVERY_MS) || 10000;

// Skills and agents of the kit: using them is not "your own skill" (M4) or "a subagent" (M3).
export const KIT_SKILLS = new Set([
  'memory', 'memoria', 'missions', 'design-taste-frontend',
  'task-intake', 'task-plan', 'task-swarm', 'task-gate', 'task-report',
  'demo-plan', 'demo-swarm', 'demo-review', 'demo-cost', 'demo-reset',
]);
export const KIT_AGENTS = new Set([
  'memory-extractor', 'memoria-extrator', 'planner', 'implementer', 'worker', 'reviewer', 'integrator',
  // started by Claude Code's own /statusline command (M8), not by the person
  'statusline-setup',
]);
const isKitAgent = (t) => KIT_AGENTS.has(t) || /^ws-/.test(t);
const USER_SKILL_SOURCES = new Set(['projectSettings', 'userSettings', 'localSettings']);

const ours = (cmd) => typeof cmd === 'string' && cmd.replace(/\\/g, '/').includes('/.workshop-claude/kit/');
const inside = (child, parent) => {
  const r = relative(resolve(parent), resolve(child));
  return r === '' || (!!r && !r.startsWith('..') && !isAbsolute(r));
};

// The person's own settings.local.json (the file of a ConfigChange): a PostToolUse hook and a statusLine that
// are not the kit's. Only booleans come out of here.
function localSettingsSignals(file, proj) {
  if (typeof file !== 'string' || !inside(file, proj) || !/settings\.local\.json$/.test(file)) return [];
  let s;
  try {
    s = JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return [];
  }
  const out = [];
  const groups = Array.isArray(s?.hooks?.PostToolUse) ? s.hooks.PostToolUse : [];
  if (groups.some((g) => Array.isArray(g?.hooks) && g.hooks.some((h) => h && typeof h.command === 'string' && !ours(h.command)))) out.push({ name: 'hook_user' });
  if (s?.statusLine && typeof s.statusLine.command === 'string' && !ours(s.statusLine.command)) out.push({ name: 'statusline_user' });
  return out;
}

// The features one hook input shows (docs/OBSERVABILITY.md). Each is { name, family? }.
export function signals(input, env = process.env, proj = null) {
  const ev = input?.hook_event_name;
  switch (ev) {
    case 'SessionStart':
      if (env.CLAUDE_CODE_ENTRYPOINT === 'sdk-cli') return [{ name: 'headless' }];
      // M2 fallback: an interactive session started with Haiku (claude --model haiku)
      return family(input.model) === 'haiku' ? [{ name: 'model_switch', family: 'haiku' }] : [];
    case 'UserPromptSubmit':
      return input.permission_mode === 'plan' ? [{ name: 'plan_mode' }] : [];
    case 'UserPromptExpansion': {
      if (input.expansion_type && input.expansion_type !== 'slash_command') return [];
      if (input.command_name === 'loop') return [{ name: 'loop' }];
      if (USER_SKILL_SOURCES.has(input.command_source) && typeof input.command_name === 'string' && !KIT_SKILLS.has(input.command_name)) return [{ name: 'skill_user' }];
      return [];
    }
    case 'SubagentStart':
      return typeof input.agent_type === 'string' && input.agent_type && !isKitAgent(input.agent_type) ? [{ name: 'subagent' }] : [];
    case 'PostToolUse': {
      const t = input.tool_name;
      if (t === 'Skill') {
        const sk = input.tool_input?.skill;
        return typeof sk === 'string' && !KIT_SKILLS.has(sk.replace(/^.*:/, '')) ? [{ name: 'skill_user' }] : [];
      }
      if (t === 'CronCreate') return [{ name: 'loop' }];
      if (t === 'mcp__agent-memory__memory_add') return [{ name: 'memory_write' }];
      // M11: Claude called one of the tools the swarm built (the Pocketknife's MCP server); only that it happened
      if (typeof t === 'string' && t.startsWith('mcp__canivete__')) return [{ name: 'pocketknife_tool' }];
      return [];
    }
    case 'PostModelSwitch':
      return input.to_model ? [{ name: 'model_switch', family: family(input.to_model) }] : [];
    case 'ConfigChange':
      return input.source === 'local_settings' && proj ? localSettingsSignals(input.file_path, proj) : [];
    default:
      return [];
  }
}

// Once per session: seen.json keeps a hash of the session id (never the id) and the features already recorded.
function fresh(P, sessionId, list) {
  const key = createHash('sha256').update(String(sessionId || 'none')).digest('hex').slice(0, 16);
  const seen = readJson(P.seen, {}) || {};
  const had = new Set(seen[key]?.f || []);
  const novos = list.filter((s) => !had.has(`${s.name}:${s.family || ''}`));
  if (!novos.length) return [];
  for (const s of novos) had.add(`${s.name}:${s.family || ''}`);
  seen[key] = { f: [...had], t: Date.now() };
  const keys = Object.keys(seen);
  if (keys.length > SEEN_MAX) for (const k of keys.sort((a, b) => (seen[a].t || 0) - (seen[b].t || 0)).slice(0, keys.length - SEEN_MAX)) delete seen[k];
  writeJson(P.seen, seen);
  return novos;
}

// After the panel's midnight wipe (send.mjs got a 401 and wrote needs_register): register again in the background,
// with gh, never asking anything; at most once every 10 minutes. Never after an unregister (the person said no).
const REREGISTER_EVERY_MS = 10 * 60 * 1000;
export function reRegister(P, cfg, env = process.env, now = Date.now()) {
  if (!cfg?.needs_register || cfg.unregistered_at || cfg.participant?.p || !cfg.panel_url) return false;
  if (env.WORKSHOP_TELEMETRY_NO_SEND === '1' && env.WORKSHOP_TELEMETRY_REREGISTER !== '1') return false;
  if (age(P.registerStamp, now) < REREGISTER_EVERY_MS) return false;
  touch(P.registerStamp);
  const ctl = join(HERE, '..', 'telemetry', 'ctl.mjs');
  if (!existsSync(ctl)) return false;
  const c = spawn(process.execPath, [ctl, 'register'], { detached: true, stdio: 'ignore', windowsHide: true, env: { ...env, WORKSHOP_TELEMETRY_DIR: P.dir } });
  c.unref();
  return true;
}

function startCheck(env = process.env, delay = 0) {
  if (env.WORKSHOP_TELEMETRY_NO_CHECK === '1') return;
  const m = join(HERE, '..', 'missions', 'missions.mjs');
  if (!existsSync(m)) return;
  const c = spawn(process.execPath, [m, 'check', '--quiet', ...(delay ? ['--delay', String(delay)] : [])], { detached: true, stdio: 'ignore', windowsHide: true, env });
  c.unref();
}

const age = (f, now) => {
  try {
    return now - statSync(f).mtimeMs;
  } catch {
    return Infinity;
  }
};
const touch = (f) => {
  try {
    writeFileSync(f, '');
  } catch {
    /* best effort */
  }
};

// When to check the missions: always after a new feature; and at the end of each turn (Stop) and at the start of a
// session, because the file missions (M4, M5, M8, M9) become true while Claude works, not when a feature shows up.
// At most once every CHECK_EVERY_MS: inside that window one delayed check is asked for instead, so the last
// turn before the person closes Claude is never left unchecked. Returns 0 (none), 'now' or the delay in ms.
export function whenToCheck(input, novos, P, now = Date.now()) {
  const ev = input?.hook_event_name;
  if (!novos.length && ev !== 'Stop' && ev !== 'SessionStart') return 0;
  const a = age(P.checkStamp, now);
  if (a >= CHECK_EVERY_MS) return 'now';
  if (age(P.checkDelayed, now) < CHECK_EVERY_MS + 5000) return 0;
  return Math.max(Math.ceil(CHECK_EVERY_MS - a), 1);
}

// One hook call. Returns the features recorded (for the tests); with { decide: true }, also when to check.
export function handle(input, { env = process.env, P = paths(), now = new Date(), decide = false } = {}) {
  const none = decide ? { novos: [], check: 0 } : [];
  const cfg = readConfig(P);
  if (!active(cfg, now)) return none;
  // the queue never waits for a new event: whatever is there leaves at the next hook (at most once every 2 s)
  if (pending(P)) kickSender(P, cfg, env);
  const sc = scope(env.CLAUDE_PROJECT_DIR || input?.cwd, cfg);
  if (!sc) return none;
  reRegister(P, cfg, env, now.getTime());
  const novos = fresh(P, input.session_id, signals(input, env, sc.proj));
  for (const s of novos) record('feature', { name: s.name }, { local: { ...(s.family ? { family: s.family } : {}), project: sc.project }, P, now });
  if (!decide) return novos;
  const check = whenToCheck(input, novos, P, now.getTime());
  if (check === 'now') touch(P.checkStamp);
  else if (check) touch(P.checkDelayed);
  return { novos, check };
}

async function main() {
  setTimeout(() => process.exit(0), LIMIT_MS).unref();
  try {
    const chunks = [];
    for await (const c of process.stdin) chunks.push(c);
    const input = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
    const { check } = handle(input, { decide: true });
    if (check) startCheck(process.env, check === 'now' ? 0 : check);
  } catch {
    /* never block, never complain */
  }
  process.exit(0);
}

if (isMain(import.meta.url)) main();
