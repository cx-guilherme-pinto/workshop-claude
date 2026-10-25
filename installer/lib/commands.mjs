// Short commands for the workshop (rc.4), in ~/.workshop-claude/bin, the folder both setups put on the PATH:
// instead of node "$HOME/.workshop-claude/kit/telemetry/ctl.mjs" register, the participant types workshop-register.
// macOS: small sh scripts; Windows: .cmd files (ASCII only: cmd reads them in the OEM code page, so the paths under
// the user's folder are written as %USERPROFILE%\…, never with the user name). install-user.mjs writes them and
// records them in the manifest; desinstalar removes them.
import { chmodSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, relative, isAbsolute } from 'node:path';

// name → what it runs. `cwd` (relative to the projects folder) makes the command work from any folder.
export const COMMANDS = {
  'workshop-register': { node: ['kit/telemetry/ctl.mjs', 'register'], what: 'registers you on the workshop panel' },
  'workshop-unregister': { node: ['kit/telemetry/ctl.mjs', 'unregister'], what: 'stops sending anything to the panel' },
  'workshop-status': { node: ['kit/telemetry/ctl.mjs', 'status'], what: 'your panel registration and the events waiting' },
  'workshop-dashboard': { node: ['kit/orchestrator/dashboard.mjs'], what: 'the swarm dashboard of the project in this folder' },
  'workshop-gen': { node: ['tools/gen.mjs'], cwd: ['canivete-project', 'demo-project'], what: 'generates the spec and the test of your tool' },
  'workshop-server': { node: ['server.js'], cwd: ['canivete-project', 'demo-project'], what: 'starts the Pocketknife page and /status (localhost:3000)' },
  'workshop-check': { setup: 'check', what: 'checks the installation (setup --check)' },
  'workshop-doctor': { setup: 'doctor', what: 'diagnosis with Claude (setup --doctor)' },
};

const ascii = (s) => /^[\x20-\x7e]*$/.test(s);
const shq = (s) => `'${String(s).replace(/'/g, `'\\''`)}'`;

// A path for a .cmd: under the user's folder as %USERPROFILE%\…; elsewhere as it is, if it is ASCII.
function winPath(p, home) {
  const r = relative(home, p);
  if (r && !r.startsWith('..') && !isAbsolute(r)) return `%USERPROFILE%\\${r.replace(/\//g, '\\')}`;
  return ascii(p) ? p.replace(/\//g, '\\') : null;
}

function shScript(name, c, { node, wsDir, projectsDir }) {
  const head = ['#!/bin/sh', `# ${name}: ${c.what}. Added by the workshop setup; removed by its --uninstall.`];
  if (c.setup) return [...head, `exec bash ${shq(join(wsDir, 'setup-mac.sh'))} --${c.setup} "$@"`].join('\n') + '\n';
  const lines = [...head];
  let script = join(wsDir, c.node[0]);
  if (c.cwd) {
    lines.push(`for d in ${c.cwd.map((x) => shq(join(projectsDir, x))).join(' ')}; do`, '  if [ -f "$d/' + c.node[0] + '" ]; then cd "$d" || exit 1; break; fi', 'done');
    script = c.node[0];
  }
  lines.push(`exec ${shq(node)} ${c.cwd ? script : shq(script)}${c.node.slice(1).map((a) => ' ' + a).join('')} "$@"`);
  return lines.join('\n') + '\n';
}

function cmdScript(name, c, { node, wsDir, projectsDir, home }) {
  const head = [`@rem ${name}: ${c.what}. Added by the workshop setup; removed by its -Uninstall.`];
  if (c.setup) {
    const f = winPath(join(wsDir, 'setup-windows.ps1'), home);
    const flag = c.setup === 'check' ? '-Check' : '-Doctor';
    return [...head, `@powershell -NoProfile -ExecutionPolicy Bypass -File "${f}" ${flag} %*`].join('\r\n') + '\r\n';
  }
  const n = winPath(node, home) || 'node';
  const lines = [...head, '@setlocal'];
  let script = winPath(join(wsDir, c.node[0]), home);
  if (c.cwd) {
    for (const x of c.cwd) {
      const d = winPath(join(projectsDir, x), home);
      if (d) lines.push(`@if exist "${d}\\${c.node[0].replace(/\//g, '\\')}" (cd /d "${d}" & goto run)`);
    }
    lines.push(':run');
    script = c.node[0].replace(/\//g, '\\');
  }
  lines.push(`@"${n}" "${script}"${c.node.slice(1).map((a) => ' ' + a).join('')} %*`);
  return lines.join('\r\n') + '\r\n';
}

// Writes every command into <wsDir>/bin. Returns the files written (for the manifest).
export function installCommands({ node, wsDir, projectsDir, home, platform = process.platform }) {
  const bin = join(wsDir, 'bin');
  mkdirSync(bin, { recursive: true });
  const ctx = { node, wsDir, projectsDir, home };
  const files = [];
  for (const [name, c] of Object.entries(COMMANDS)) {
    if (platform === 'win32') {
      const text = cmdScript(name, c, ctx);
      if (!ascii(text.replace(/\r\n/g, ''))) continue; // never a .cmd that cmd would read wrong
      const f = join(bin, `${name}.cmd`);
      writeFileSync(f, text, 'ascii');
      files.push(f);
    } else {
      const f = join(bin, name);
      writeFileSync(f, shScript(name, c, ctx));
      chmodSync(f, 0o755);
      files.push(f);
    }
  }
  return files;
}

export function removeCommands(files = []) {
  for (const f of files) if (existsSync(f)) rmSync(f, { force: true });
}
