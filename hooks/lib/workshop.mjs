// Utilitarios partilhados pelos hooks: ler stdin, localizar .workshop/, escrever eventos.
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync, renameSync, realpathSync, statSync, openSync, readSync, closeSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export async function readStdinJson() {
  const chunks = [];
  for await (const c of process.stdin) chunks.push(c);
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  return raw ? JSON.parse(raw) : {};
}

export function projectDir(input) {
  return process.env.CLAUDE_PROJECT_DIR || input?.cwd || process.cwd();
}

const HERE = dirname(fileURLToPath(import.meta.url));

// So atua em projetos com a pasta .workshop/ (criada pelas skills do workshop).
// Se o projeto tiver a sua propria copia dos hooks (Arena: tools/workshop/hooks), a copia de
// utilizador nao faz nada, para o custo nao ser contado duas vezes.
export function workshopDir(input) {
  const proj = projectDir(input);
  const d = join(proj, '.workshop');
  if (!existsSync(d)) return null;
  const propria = resolve(proj, 'tools', 'workshop', 'hooks');
  if (existsSync(propria)) {
    const real = (p) => realpathSync(p).toLowerCase();
    if (!real(resolve(HERE, '..')).startsWith(real(propria))) return null;
  }
  return d;
}

// Se o ficheiro acabar numa linha cortada (um crash, uma edicao a mao), comeca numa linha nova:
// senao o registo novo ficava colado a linha partida e perdia-se.
export function appendJsonl(file, obj) {
  let antes = '';
  try {
    const s = statSync(file);
    if (s.size) {
      const fd = openSync(file, 'r');
      const b = Buffer.alloc(1);
      try {
        readSync(fd, b, 0, 1, s.size - 1);
      } finally {
        closeSync(fd);
      }
      if (b[0] !== 10) antes = '\n';
    }
  } catch {
    /* ficheiro novo */
  }
  appendFileSync(file, antes + JSON.stringify(obj) + '\n', 'utf8');
}

export function readJsonSafe(file, fallback) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

// Escrita atomica (ficheiro temporario + rename). Num unico escritor por ficheiro.
export function writeJsonAtomic(file, obj) {
  const tmp = file + '.' + process.pid + '.tmp';
  writeFileSync(tmp, JSON.stringify(obj, null, 2) + '\n', 'utf8');
  try {
    renameSync(tmp, file);
  } catch {
    // Windows: rename sobre ficheiro aberto pode falhar (EPERM). Escrever diretamente.
    writeFileSync(file, JSON.stringify(obj, null, 2) + '\n', 'utf8');
  }
}

export function ensureDir(d) {
  mkdirSync(d, { recursive: true });
  return d;
}

// Os hooks nunca bloqueiam: qualquer erro vai para o log e o hook sai com 0.
export async function runHook(name, fn) {
  try {
    const input = await readStdinJson();
    const out = await fn(input);
    if (out) process.stdout.write(JSON.stringify(out));
  } catch (err) {
    try {
      const d = process.env.CLAUDE_PROJECT_DIR ? join(process.env.CLAUDE_PROJECT_DIR, '.workshop') : null;
      if (d && existsSync(d)) appendFileSync(join(d, 'hook-errors.log'), `${new Date().toISOString()} ${name}: ${err?.stack || err}\n`);
    } catch {
      /* sem log possivel */
    }
  }
  process.exit(0);
}
