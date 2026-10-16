#!/usr/bin/env node
// Volta a Arena ao estado inicial (usado pelo /demo-reset):
//   1. arquiva .workshop/* (menos historico/) e plan.json/PLANO.md em .workshop/historico/<data>/;
//   2. git reset --hard arena-inicial;
//   3. git clean -fd (sem -x: o que esta no .gitignore, como .workshop/, fica).
//
//   node tools/reset.mjs           faz o reset
//   node tools/reset.mjs --sim     so mostra o que faria
//
// Recusa se nao estiver dentro de uma Arena montada pelo kit (.arena-kit.json na raiz).
import { cpSync, existsSync, mkdirSync, readdirSync, realpathSync, renameSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SIM = process.argv.includes('--sim') || process.argv.includes('--dry-run');
const WS = join(ROOT, '.workshop');
const TAG = 'arena-inicial';

function sair(msg, codigo = 1) {
  console.error(msg);
  process.exit(codigo);
}

function git(...args) {
  const r = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8' });
  return { ok: r.status === 0, out: `${r.stdout || ''}${r.stderr || ''}`.trim() };
}

// ---------- verificacoes ----------

if (!existsSync(join(ROOT, '.arena-kit.json'))) {
  sair(`Recusado: ${ROOT} não é uma Arena montada pelo kit (falta .arena-kit.json). Não mexo em nada.`);
}
const topo = git('rev-parse', '--show-toplevel');
if (!topo.ok) sair('Recusado: esta pasta não é um repositório git.');
// So o repositorio da propria Arena: nunca um repositorio de cima (por exemplo, o do kit).
if (realpathSync(topo.out) !== realpathSync(ROOT)) sair(`Recusado: o repositório git começa em ${topo.out}, não em ${ROOT}.`);
if (!git('rev-parse', '-q', '--verify', `refs/tags/${TAG}`).ok) sair(`Recusado: não existe a tag ${TAG}. Monta a Arena outra vez com o instalador.`);

// ---------- 1. arquivar ----------

const carimbo = new Date().toISOString().replace(/[:.]/g, '-');
const destino = join(WS, 'historico', carimbo);
const itens = existsSync(WS) ? readdirSync(WS).filter((n) => n !== 'historico') : [];
const gerados = ['plan.json', 'PLANO.md'].filter((f) => existsSync(join(ROOT, f)));

console.log(SIM ? 'Simulação: nada vai mudar.\n' : '');
if (itens.length || gerados.length) {
  console.log(`Arquivo em .workshop/historico/${carimbo}/:`);
  for (const n of itens) console.log(`  .workshop/${n}`);
  for (const f of gerados) console.log(`  ${f} (cópia)`);
  if (!SIM) {
    mkdirSync(destino, { recursive: true });
    for (const n of itens) {
      try {
        renameSync(join(WS, n), join(destino, n));
      } catch {
        cpSync(join(WS, n), join(destino, n), { recursive: true });
        rmSync(join(WS, n), { recursive: true, force: true });
      }
    }
    for (const f of gerados) cpSync(join(ROOT, f), join(destino, f));
  }
} else {
  console.log('Nada para arquivar em .workshop/.');
}

// ---------- 2. git reset --hard ----------

if (SIM) {
  const mudados = git('status', '--porcelain', '--untracked-files=no');
  console.log(`\ngit reset --hard ${TAG}: ${mudados.out ? `repunha ${mudados.out.split('\n').length} ficheiro(s) alterado(s)` : 'nada para repor'}`);
} else {
  const r = git('reset', '--hard', TAG);
  if (!r.ok) sair(`git reset --hard ${TAG} falhou:\n${r.out}`);
  console.log(`\ngit reset --hard ${TAG}: ${r.out}`);
}

// ---------- 3. git clean -fd (sem -x) ----------

const limpar = git('clean', SIM ? '-fdn' : '-fd');
if (!limpar.ok) sair(`git clean falhou:\n${limpar.out}`);
const linhas = limpar.out ? limpar.out.split('\n') : [];
console.log(`git clean -fd: ${linhas.length ? `${SIM ? 'apagava' : 'apagou'} ${linhas.length} ficheiro(s) ou pasta(s) fora do git` : 'nada para apagar'}`);
for (const l of linhas.slice(0, 40)) console.log(`  ${l.replace(/^Would remove |^Removing /, '')}`);
if (linhas.length > 40) console.log(`  … e mais ${linhas.length - 40}`);

console.log(SIM ? '\nCorre sem --sim para fazer o reset.' : '\nArena de volta ao estado inicial. O histórico ficou em .workshop/historico/.');
