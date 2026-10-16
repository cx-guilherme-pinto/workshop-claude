#!/usr/bin/env node
// Installs the Project 2 training project (exemplo-projeto-real) in a folder, with git init and a first commit.
//   node installer/assemble-sandbox.mjs --dest <folder> [--lingua pt|en] [--force]
//
// --lingua defaults to the kit language (hooks/lib/lingua.mjs: WORKSHOP_LANG, lingua.json, then the OS locale).
// The source in exemplo-projeto-real/ is the Portuguese project. exemplo-projeto-real/i18n/en/ is the whole
// English project: the code is translated too, so the file names change (src/livros.js -> src/books.js) and it
// cannot be laid over the Portuguese files. pt copies the project without i18n/; en copies only i18n/en/.
// tools/test/assemble-sandbox.test.mjs checks that both versions keep the same shape and that their tests pass.
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { ehPrincipal } from './lib/principal.mjs';
import { lingua as linguaDoKit, normalizar } from '../hooks/lib/lingua.mjs';

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
    else if (a === '--lingua') {
      o.lingua = normalizar(argv[++i]);
      if (!o.lingua) throw new Error('--lingua needs a value (pt or en)');
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
    return JSON.parse(readFileSync(f, 'utf8'));
  } catch {
    return {};
  }
}

export function montar({ dest, force = false, lingua = null, kit = KIT }) {
  const l = normalizar(lingua) || linguaDoKit();
  const proj = join(kit, 'exemplo-projeto-real');
  const origem = l === 'pt' ? proj : join(proj, 'i18n', l);
  if (!existsSync(join(origem, 'package.json'))) throw new Error(`training project not found: ${origem}`);
  const marca = join(dest, MARCA);
  if (existsSync(dest) && readdirSync(dest).length) {
    if (existsSync(marca) && !force) return { estado: 'ja_existia', lingua: lerMarca(marca).lingua ?? 'pt' };
    if (!force) throw new Error(`the folder ${dest} already exists (use --force to replace it)`);
    rmSync(dest, { recursive: true, force: true });
  }
  mkdirSync(dest, { recursive: true });
  copiar(origem, dest);
  writeFileSync(join(dest, '.gitignore'), 'node_modules/\n.DS_Store\n');
  writeFileSync(marca, JSON.stringify({ criado_em: new Date().toISOString(), lingua: l }) + '\n');
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
  return { estado: 'montado', dest: dest.replace(/\\/g, '/'), lingua: l };
}

if (ehPrincipal(import.meta.url)) {
  try {
    console.log(JSON.stringify(montar(args(process.argv.slice(2)))));
  } catch (e) {
    console.error(`ERRO: ${e.message}`);
    process.exit(1);
  }
}
