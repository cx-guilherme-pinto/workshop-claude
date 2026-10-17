#!/usr/bin/env node
// Installs the Project 2 practice project (practice-project) in a folder, with git init and a first commit.
//   node installer/assemble-sandbox.mjs --dest <folder> [--language pt|en] [--force]     (--lingua still works)
//
// --language defaults to the kit language (hooks/lib/language.mjs: WORKSHOP_LANG, language.json, then the OS locale).
// The source in practice-project/ is the Portuguese project. practice-project/i18n/en/ is the whole
// English project: the code is translated too, so the file names change (src/livros.js -> src/books.js) and it
// cannot be laid over the Portuguese files. pt copies the project without i18n/; en copies only i18n/en/.
// tools/test/assemble-sandbox.test.mjs checks that both versions keep the same shape and that their tests pass.
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { isMain } from './lib/is-main.mjs';
import { lingua as linguaDoKit, normalizar } from '../hooks/lib/language.mjs';

// The kit folder with the practice project (exemplo-projeto-real until v1.0.0-rc.1).
export const PRACTICE_DIR = 'practice-project';

const KIT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MARCA = '.sandbox-kit.json';

const TEXTOS = {
  pt: { commit: 'Biblioteca Municipal v0.3.0', nome: 'Participante do Workshop', email: 'participante@workshop.invalid' },
  en: { commit: 'Municipal Library v0.3.0', nome: 'Workshop Participant', email: 'participant@workshop.invalid' },
};

export function args(argv) {
  const o = { dest: null, force: false, lingua: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dest') o.dest = argv[++i] ? resolve(argv[i]) : null;
    else if (a === '--force') o.force = true;
    else if (a === '--language' || a === '--lingua') {
      o.lingua = normalizar(argv[++i]);
      if (!o.lingua) throw new Error('--language needs a value (pt or en)');
    }
  }
  if (!o.dest) throw new Error('missing --dest <folder>');
  return o;
}

// Skips the paths relative to the copied folder (the kit itself lives in ~/.workshop-claude/..., so the
// absolute path cannot be tested), and i18n/ only at the top of the project.
const IGNORAR = /(^|[\\/])(\.DS_Store|node_modules|\.workshop)([\\/]|$)|^i18n([\\/]|$)/;

function copiar(src, dst) {
  cpSync(src, dst, { recursive: true, filter: (p) => !IGNORAR.test(relative(src, p)) });
}

function lerMarca(f) {
  try {
    const m = JSON.parse(readFileSync(f, 'utf8'));
    return { ...m, language: m.language ?? m.lingua };
  } catch {
    return {};
  }
}

export function montar({ dest, force = false, lingua = null, kit = KIT }) {
  const l = normalizar(lingua) || linguaDoKit();
  const proj = join(kit, PRACTICE_DIR);
  const origem = l === 'pt' ? proj : join(proj, 'i18n', l);
  if (!existsSync(join(origem, 'package.json'))) throw new Error(`training project not found: ${origem}`);
  const marca = join(dest, MARCA);
  if (existsSync(dest) && readdirSync(dest).length) {
    if (existsSync(marca) && !force) return { status: 'already_there', language: lerMarca(marca).language ?? 'pt' };
    if (!force) throw new Error(`the folder ${dest} already exists (use --force to replace it)`);
    rmSync(dest, { recursive: true, force: true });
  }
  mkdirSync(dest, { recursive: true });
  copiar(origem, dest);
  writeFileSync(join(dest, '.gitignore'), 'node_modules/\n.DS_Store\n');
  writeFileSync(marca, JSON.stringify({ created_at: new Date().toISOString(), language: l }) + '\n');
  const t = TEXTOS[l];
  const git = (...x) => {
    const r = spawnSync('git', x, { cwd: dest, encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`git ${x.join(' ')}: ${r.stderr}`);
  };
  git('init', '-q', '-b', 'main');
  git('config', 'user.name', t.nome);
  git('config', 'user.email', t.email);
  git('add', '-A');
  git('commit', '-q', '-m', t.commit);
  return { status: 'assembled', dest: dest.replace(/\\/g, '/'), language: l };
}

if (isMain(import.meta.url)) {
  try {
    console.log(JSON.stringify(montar(args(process.argv.slice(2)))));
  } catch (e) {
    console.error(`ERROR: ${e.message}`);
    process.exit(1);
  }
}
