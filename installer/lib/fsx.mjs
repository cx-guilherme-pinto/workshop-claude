// Utilitarios de ficheiros do instalador: escrita atomica, copia com substituicao de marcadores,
// hash de arvores e caminhos do utilizador. Sem dependencias.
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, extname, join } from 'node:path';
import { homedir } from 'node:os';

export const fwd = (p) => String(p).replace(/\\/g, '/');

export function userPaths(env = process.env) {
  const home = env.WS_HOME_OVERRIDE || (process.platform === 'win32' ? env.USERPROFILE || homedir() : env.HOME || homedir());
  const claudeDir = env.CLAUDE_CONFIG_DIR || join(home, '.claude');
  const wsDir = join(home, '.workshop-claude');
  return {
    home,
    claudeDir,
    wsDir,
    kitDir: join(wsDir, 'kit'),
    backupDir: join(wsDir, 'backup'),
    manifest: join(wsDir, 'manifest.json'),
    settings: join(claudeDir, 'settings.json'),
    skillsDir: join(claudeDir, 'skills'),
    agentsDir: join(claudeDir, 'agents'),
  };
}

export function writeAtomic(file, data) {
  mkdirSync(dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  writeFileSync(tmp, data);
  try {
    renameSync(tmp, file);
  } catch {
    // Windows: o rename pode falhar se o ficheiro estiver aberto (EPERM).
    writeFileSync(file, data);
    rmSync(tmp, { force: true });
  }
}

export const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

export function sha256File(file) {
  return existsSync(file) ? sha256(readFileSync(file)) : null;
}

const IGNORAR = /(^|[\\/])(\.DS_Store|node_modules|\.workshop|__pycache__)([\\/]|$)/;
const TEXTO = new Set(['.md', '.mjs', '.js', '.json', '.txt', '.sh', '.ps1', '.yml', '.yaml', '.css', '.html', '']);

export function listFiles(dir, base = dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir).sort()) {
    const p = join(dir, name);
    if (IGNORAR.test(p)) continue;
    const st = statSync(p);
    if (st.isDirectory()) listFiles(p, base, out);
    else if (st.isFile()) out.push(p.slice(base.length + 1));
  }
  return out;
}

// Copia uma arvore; nos ficheiros de texto substitui os marcadores {{CHAVE}} por valores.
export function copyTree(src, dst, replacements = null) {
  const files = listFiles(src);
  for (const rel of files) {
    const from = join(src, rel);
    const to = join(dst, rel);
    mkdirSync(dirname(to), { recursive: true });
    if (replacements && TEXTO.has(extname(rel).toLowerCase())) {
      let t = readFileSync(from, 'utf8');
      for (const [k, v] of Object.entries(replacements)) t = t.split(`{{${k}}}`).join(v);
      writeFileSync(to, t);
    } else {
      copyFileSync(from, to);
    }
  }
  return files.length;
}

// Impressao digital de varias arvores (para saber se o kit mudou desde a ultima instalacao).
export function fingerprint(paths) {
  const h = createHash('sha256');
  for (const p of paths) {
    if (!existsSync(p)) continue;
    if (statSync(p).isDirectory()) {
      for (const rel of listFiles(p)) {
        h.update(fwd(rel) + '\0');
        h.update(readFileSync(join(p, rel)));
      }
    } else {
      h.update(readFileSync(p));
    }
  }
  return h.digest('hex').slice(0, 16);
}

export function readJson(file, fallback = null) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

export function timestamp(d = new Date()) {
  return d.toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
}

export function moveAside(path, backupRoot, label) {
  const dest = join(backupRoot, label);
  mkdirSync(dirname(dest), { recursive: true });
  renameSync(path, dest);
  return dest;
}
