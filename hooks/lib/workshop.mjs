// Utilitarios partilhados pelos hooks: ler stdin, localizar .workshop/, escrever eventos.
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { join } from 'node:path';

export async function readStdinJson() {
  const chunks = [];
  for await (const c of process.stdin) chunks.push(c);
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  return raw ? JSON.parse(raw) : {};
}

export function projectDir(input) {
  return process.env.CLAUDE_PROJECT_DIR || input?.cwd || process.cwd();
}

// So atua em projetos com a pasta .workshop/ (criada pelas skills do workshop).
export function workshopDir(input) {
  const d = join(projectDir(input), '.workshop');
  return existsSync(d) ? d : null;
}

export function appendJsonl(file, obj) {
  appendFileSync(file, JSON.stringify(obj) + '\n', 'utf8');
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
      if (d && existsSync(d)) appendFileSync(join(d, 'hooks-erros.log'), `${new Date().toISOString()} ${name}: ${err?.stack || err}\n`);
    } catch {
      /* sem log possivel */
    }
  }
  process.exit(0);
}
