#!/usr/bin/env node
// Installs the missions project (missions-project, workshop v2) in a folder, with git init and a first commit.
//   node installer/assemble-missions.mjs --dest <folder> [--language pt|en] [--kit-dir <dir>] [--force]
//
// Like assemble-sandbox.mjs: missions-project/ is the Portuguese project and missions-project/i18n/en/ the whole
// English one; the marker .missions-kit.json is written first with {"status":"incomplete"}; git runs isolated from
// the person's global config; --force moves an existing project to the backup folder.
//
// npm test uses the kit's reporter (missions/reporter.mjs in --kit-dir, ~/.workshop-claude/kit by default) next to
// the normal one: each run records tests_run in the local mission book (M6). The path is relative to the project
// when it has no spaces, otherwise a file:// URL (npm runs the script through a shell).
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, writeFileSync } from 'node:fs';
import { basename, join, dirname, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { isMain } from './lib/is-main.mjs';
import { userPaths } from './lib/fsx.mjs';
import { clearForAssembly, initKitRepo, isIncomplete, kitGit, writeIncompleteMark } from './lib/kit-repo.mjs';
import { lingua as linguaDoKit, normalizar } from '../hooks/lib/language.mjs';

export const MISSIONS_DIR = 'missions-project';

const KIT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MARCA = '.missions-kit.json';

const TEXTOS = {
  pt: { commit: 'Conversor de unidades para as missões', nome: 'Participante do Workshop', email: 'participante@workshop.invalid' },
  en: { commit: 'Unit converter for the missions', nome: 'Workshop Participant', email: 'participant@workshop.invalid' },
};

export function args(argv) {
  const o = { dest: null, force: false, lingua: null, kitDir: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dest') o.dest = argv[++i] ? resolve(argv[i]) : null;
    else if (a === '--force') o.force = true;
    else if (a === '--kit-dir') o.kitDir = argv[++i] ? resolve(argv[i]) : null;
    else if (a === '--language' || a === '--lingua') {
      o.lingua = normalizar(argv[++i]);
      if (!o.lingua) throw new Error('--language needs a value (pt or en)');
    }
  }
  if (!o.dest) throw new Error('missing --dest <folder>');
  return o;
}

const IGNORAR = /(^|[\\/])(\.DS_Store|node_modules|\.workshop)([\\/]|$)|^i18n([\\/]|$)/;

// The npm test script with the kit's reporter, or plain "node --test" if the kit has none.
export function testScript(dest, kitDir) {
  const rep = join(kitDir, 'missions', 'reporter.mjs');
  if (!existsSync(rep)) return 'node --test';
  // Real paths: with a link in the way (/var -> /private/var on macOS) the relative path would miss a level.
  // (for a folder that does not exist yet, the real path of the closest one that does, plus the rest)
  const real = (x) => {
    try {
      return realpathSync(x);
    } catch {
      const up = dirname(x);
      return up === x ? x : join(real(up), basename(x));
    }
  };
  let spec = relative(real(dest), real(rep)).replace(/\\/g, '/');
  if (!spec.startsWith('.')) spec = './' + spec;
  if (/\s/.test(spec)) spec = pathToFileURL(rep).href;
  return `node --test --test-reporter=spec --test-reporter-destination=stdout --test-reporter=${spec} --test-reporter-destination=stdout`;
}

function lerMarca(f) {
  try {
    return JSON.parse(readFileSync(f, 'utf8'));
  } catch {
    return {};
  }
}

export function montar({ dest, force = false, lingua = null, kitDir = null, kit = KIT }) {
  const l = normalizar(lingua) || linguaDoKit();
  const proj = join(kit, MISSIONS_DIR);
  const origem = l === 'pt' ? proj : join(proj, 'i18n', l);
  if (!existsSync(join(origem, 'package.json'))) throw new Error(`missions project not found: ${origem}`);
  const marca = join(dest, MARCA);
  let backup = null;
  if (existsSync(dest) && readdirSync(dest).length) {
    const incompleto = isIncomplete(dest, marca);
    if (existsSync(marca) && !force && !incompleto) return { status: 'already_there', language: lerMarca(marca).language ?? 'pt' };
    if (!force && !incompleto) throw new Error(`the folder ${dest} already exists (use --force to replace it)`);
    backup = clearForAssembly(dest, marca);
  }
  mkdirSync(dest, { recursive: true });
  writeIncompleteMark(marca, l);
  cpSync(origem, dest, { recursive: true, filter: (p) => !IGNORAR.test(relative(origem, p)) });
  const pkgFile = join(dest, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgFile, 'utf8'));
  pkg.scripts = { ...(pkg.scripts || {}), test: testScript(dest, kitDir || userPaths().kitDir) };
  writeFileSync(pkgFile, JSON.stringify(pkg, null, 2) + '\n');
  writeFileSync(join(dest, '.gitignore'), '.workshop/\nnode_modules/\n.DS_Store\n');
  writeFileSync(marca, JSON.stringify({ created_at: new Date().toISOString(), language: l }) + '\n');
  const t = TEXTOS[l];
  initKitRepo(dest, { name: t.nome, email: t.email });
  kitGit(dest, ['add', '-A']);
  kitGit(dest, ['commit', '-q', '-m', t.commit]);
  return { status: 'assembled', dest: dest.replace(/\\/g, '/'), language: l, ...(backup ? { backup } : {}) };
}

if (isMain(import.meta.url)) {
  try {
    console.log(JSON.stringify(montar(args(process.argv.slice(2)))));
  } catch (e) {
    console.error(`ERROR: ${e.message}`);
    process.exit(1);
  }
}
