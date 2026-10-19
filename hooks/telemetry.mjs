#!/usr/bin/env node
// Telemetry hook of the workshop (docs/pt/WORKSHOP-V2-SPEC.md, section 6.4; what each event carries is in
// docs/OBSERVABILITY.md). Registered by the installer, "async": true, on SessionStart, UserPromptSubmit,
// UserPromptExpansion, SubagentStart, PostToolUse (Skill|CronCreate|mcp__agent-memory__memory_add),
// PostModelSwitch and ConfigChange.
//
// From the input it keeps only the name of a Claude Code feature that was used (plan_mode, loop…) and drops the
// rest without writing it anywhere: prompts, paths, cwd, transcript_path, tool_input and tool_response never
// leave this process. It acts only in the workshop projects (the projects folder the setup wrote in config.json,
// or a project with .workshop/), records each feature once per session, never does network, prints nothing and
// always exits with 0 within 1 s. When it records something new, it starts the mission check in the background.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { isMain } from '../orchestrator/lib/is-main.mjs';
import { active, family, paths, readConfig, readJson, record, scope, writeJson } from '../telemetry/lib.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const LIMIT_MS = 1000;
const SEEN_MAX = 200;

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

function startCheck(env = process.env) {
  if (env.WORKSHOP_TELEMETRY_NO_CHECK === '1') return;
  const m = join(HERE, '..', 'missions', 'missions.mjs');
  if (!existsSync(m)) return;
  const c = spawn(process.execPath, [m, 'check', '--quiet'], { detached: true, stdio: 'ignore', windowsHide: true, env });
  c.unref();
}

// One hook call. Returns the features recorded (for the tests).
export function handle(input, { env = process.env, P = paths(), now = new Date() } = {}) {
  const cfg = readConfig(P);
  if (!active(cfg, now)) return [];
  const sc = scope(env.CLAUDE_PROJECT_DIR || input?.cwd, cfg);
  if (!sc) return [];
  const novos = fresh(P, input.session_id, signals(input, env, sc.proj));
  for (const s of novos) record('feature', { name: s.name }, { local: { ...(s.family ? { family: s.family } : {}), project: sc.project }, P, now });
  return novos;
}

async function main() {
  setTimeout(() => process.exit(0), LIMIT_MS).unref();
  try {
    const chunks = [];
    for await (const c of process.stdin) chunks.push(c);
    const input = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
    if (handle(input).length) startCheck();
  } catch {
    /* never block, never complain */
  }
  process.exit(0);
}

if (isMain(import.meta.url)) main();
