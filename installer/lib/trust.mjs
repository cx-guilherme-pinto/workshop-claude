// The workshop projects the setup creates are marked as trusted in Claude Code's ~/.claude.json (D-34, the
// organizer's decision), as if the person had accepted the trust dialog. Without it, Claude Code 2.1.292 ignores the
// project's permissions.allow in a headless run (claude -p, the benchmark): "Ignoring 17 permissions.allow entries
// from .claude/settings.json: this workspace has not been trusted" (seen in the first real run of the Pocketknife).
//
// Only "hasTrustDialogAccepted" of each project is written; every other key of the file stays as it is. An invalid
// ~/.claude.json is never touched (the setup's step 3 already deals with it). What was there before is returned, so
// that "desinstalar" can put it back.
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fwd, writeAtomic } from './fsx.mjs';

export const claudeJson = (P, env = process.env) => join(env.CLAUDE_CONFIG_DIR || P.home, '.claude.json');

// The keys Claude Code uses for a folder: the real path with "/" (on Windows also the native form, to be safe).
export function projectKeys(dir, platform = process.platform) {
  let p = resolve(dir);
  try {
    p = realpathSync(p);
  } catch {
    // not created yet
  }
  const keys = [fwd(p)];
  if (platform === 'win32' && p.includes('\\')) keys.push(p);
  return keys;
}

function load(file) {
  if (!existsSync(file)) return {};
  const j = JSON.parse(readFileSync(file, 'utf8'));
  if (!j || typeof j !== 'object' || Array.isArray(j)) throw new Error('not a JSON object');
  return j;
}

// Marks the folders as trusted. Returns [{ key, before }] with only the keys that changed (before: true | false |
// null = the project had no such field). Throws { code: 'claude_json_invalid' } if the file cannot be read as JSON.
export function trustProjects(file, dirs, { platform = process.platform } = {}) {
  let j;
  try {
    j = load(file);
  } catch (e) {
    throw Object.assign(new Error(`~/.claude.json: ${e.message}`), { code: 'claude_json_invalid', exit: 3 });
  }
  const changed = [];
  j.projects = j.projects && typeof j.projects === 'object' && !Array.isArray(j.projects) ? j.projects : {};
  for (const d of dirs) {
    for (const key of projectKeys(d, platform)) {
      const p = j.projects[key] && typeof j.projects[key] === 'object' ? j.projects[key] : {};
      if (p.hasTrustDialogAccepted === true) continue;
      changed.push({ key, before: typeof p.hasTrustDialogAccepted === 'boolean' ? p.hasTrustDialogAccepted : null });
      j.projects[key] = { ...p, hasTrustDialogAccepted: true };
    }
  }
  if (changed.length) writeAtomic(file, JSON.stringify(j, null, 2) + '\n');
  return changed;
}

// Puts back what trustProjects changed (uninstall). A project the person trusted again by hand stays trusted only if
// it was trusted before the kit; missing or invalid file: nothing to do.
export function untrustProjects(file, changes) {
  let j;
  try {
    j = load(file);
  } catch {
    return 0;
  }
  let n = 0;
  for (const { key, before } of changes || []) {
    const p = j.projects?.[key];
    if (!p || typeof p !== 'object') continue;
    if (before === null) delete p.hasTrustDialogAccepted;
    else p.hasTrustDialogAccepted = before;
    n++;
  }
  if (n) writeAtomic(file, JSON.stringify(j, null, 2) + '\n');
  return n;
}
