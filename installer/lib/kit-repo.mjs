// The kit's own git repositories (the Arena and the practice project) and their folders.
//
// git: company laptops often have global git settings that break or block a plain "git commit" made by the kit:
//   - signed commits and tags (commit.gpgsign, tag.gpgsign): gpg missing ("gpg failed to sign the data"), or a
//     1Password / pinentry dialog that waits forever, and a signed tag opens core.editor for a message;
//   - company hooks (core.hooksPath, or hooks copied by init.templateDir): secret scanners, Jira-key commit-msg;
//   - a global gitignore (core.excludesFile, ~/.config/git/ignore, the template's info/exclude) with *.js, lib/,
//     .claude/ or CLAUDE.md: the kit's files are left out of the commit without any error, and later /demo-reset,
//     the Project 2 gate and the worktrees do not see them;
//   - core.autocrlf + core.safecrlf ("LF would be replaced by CRLF"), a global gitattributes with eol=crlf, and
//     core.fsmonitor (a daemon that keeps the folder busy).
// Every git command of the kit runs with the overrides below (-c), with no template (git init --template=),
// without the GIT_DIR family of variables and with no editor or terminal prompt. The same values are also written
// to the repository's own .git/config, so the workshop's own git commands (/demo-reset, the gate, worktrees, the
// agents' commits and merges) behave the same. The person's global git config is never changed.
//
// Folders: an assembler writes its marker with {"status":"incomplete"} before copying anything, so a Ctrl-C, a
// closed window or a crash during the copy leaves a folder the setup recognises as the kit's own (and rebuilds).
// A folder that is replaced (--force) is never deleted unless it is that incomplete copy: it is moved to
// ~/.workshop-claude/backup/<date>/<name> (the person's work stays).
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fwd, timestamp, userPaths } from './fsx.mjs';

// A relative path that never exists (also in a worktree, where .git is a file): no hook runs.
export const NO_HOOKS = '.git/no-hooks';

export const KIT_GIT_CONFIG = [
  ['commit.gpgsign', 'false'],
  ['tag.gpgsign', 'false'],
  ['core.hooksPath', NO_HOOKS],
  ['core.excludesFile', ''],
  ['core.attributesFile', ''],
  ['core.autocrlf', 'false'],
  ['core.safecrlf', 'false'],
  ['core.eol', 'lf'],
  ['core.fsmonitor', 'false'],
];

// A git command that hangs (a prompt nobody sees) fails after this instead.
export const GIT_TIMEOUT_MS = 120000;

const GIT_ENV_OUT = ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES', 'GIT_NAMESPACE', 'GIT_COMMON_DIR'];

// GIT_EDITOR=":" is git's own "no editor" (also on Windows): a command that needs a message fails at once.
export function gitEnv(env = process.env) {
  const e = { ...env, GIT_EDITOR: ':', GIT_SEQUENCE_EDITOR: ':', GIT_TERMINAL_PROMPT: '0' };
  for (const k of GIT_ENV_OUT) delete e[k];
  return e;
}

export const gitOverrides = () => KIT_GIT_CONFIG.flatMap(([k, v]) => ['-c', `${k}=${v}`]);

// git with the overrides; returns the spawnSync result (status null and error.code ETIMEDOUT on a timeout).
export function gitSync(cwd, args, { env = process.env, timeout = GIT_TIMEOUT_MS } = {}) {
  return spawnSync('git', [...gitOverrides(), ...args], {
    cwd,
    encoding: 'utf8',
    env: gitEnv(env),
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout,
    killSignal: 'SIGKILL',
    windowsHide: true,
  });
}

// git with the overrides; returns stdout, throws with git's own message (the setup shows its first line).
export function kitGit(cwd, args, opts = {}) {
  const r = gitSync(cwd, args, opts);
  const cmd = `git ${args.join(' ')}`;
  if (r.error?.code === 'ETIMEDOUT') throw new Error(`${cmd} did not finish in ${Math.round((opts.timeout ?? GIT_TIMEOUT_MS) / 1000)} s (is git waiting for a password, a signature or an editor?)`);
  if (r.error) throw new Error(`${cmd} failed: ${r.error.message}`);
  if (r.status !== 0) throw new Error(`${cmd} failed: ${`${r.stderr || ''}${r.stdout || ''}`.trim()}`);
  return r.stdout.trim();
}

// git init with no template, the overrides in .git/config and a local author (the person may have no global one,
// or user.useConfigOnly).
export function initKitRepo(dest, { name, email }) {
  kitGit(dest, ['init', '-q', '--template=', '-b', 'main']);
  for (const [k, v] of [...KIT_GIT_CONFIG, ['user.name', name], ['user.email', email]]) kitGit(dest, ['config', k, v]);
}

export function readMark(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return existsSync(file) ? {} : null;
  }
}

// The marker written before the copy: its status is "incomplete" until the real marker replaces it.
export function writeIncompleteMark(file, language) {
  writeFileSync(file, JSON.stringify({ status: 'incomplete', language }) + '\n');
}

// The kit's own interrupted copy: the incomplete marker and no git repository (git init comes after the real marker).
export function isIncomplete(dest, markFile) {
  return readMark(markFile)?.status === 'incomplete' && !existsSync(join(dest, '.git'));
}

// Empties the way for a new assembly. Returns the backup folder (forward slashes) or null.
//   - the kit's own incomplete copy: deleted, its marker last (an interruption during the delete leaves a copy that
//     is still "incomplete", or an empty folder, and never an unmarked folder that the setup would leave alone);
//   - anything else: moved to ~/.workshop-claude/backup/<date>/<name> (renamed; copied and then deleted only when
//     the backup is on another disk). If it cannot be moved (open in another program), nothing is deleted.
export function clearForAssembly(dest, markFile, env = process.env) {
  if (isIncomplete(dest, markFile)) {
    const mark = resolve(markFile);
    for (const e of readdirSync(dest)) {
      const p = join(dest, e);
      if (resolve(p) !== mark) rmSync(p, { recursive: true, force: true });
    }
    rmSync(dest, { recursive: true, force: true });
    return null;
  }
  const root = join(userPaths(env).backupDir, timestamp());
  let to = join(root, basename(dest));
  for (let i = 2; existsSync(to); i++) to = join(root, `${basename(dest)}-${i}`);
  mkdirSync(root, { recursive: true });
  try {
    renameSync(dest, to);
  } catch (e) {
    if (e.code !== 'EXDEV') throw new Error(`could not move ${dest} to ${to} (is it open in another program?): ${e.message}`);
    cpSync(dest, to, { recursive: true });
    rmSync(dest, { recursive: true, force: true });
  }
  return fwd(to);
}
