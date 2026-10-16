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

// Textos na lingua da Arena (tools/workshop/lingua.json). Fora de uma Arena montada (sem tools/workshop/)
// fica em portugues, para a recusa abaixo aparecer na mesma.
const { textos } = await import('./workshop/hooks/lib/lingua.mjs').catch(() => ({ textos: (d) => d.pt }));

const T = textos({
  pt: {
    semArena: (root) => `Recusado: ${root} não é uma Arena montada pelo kit (falta .arena-kit.json). Não mexo em nada.`,
    semGit: 'Recusado: esta pasta não é um repositório git.',
    outroRepo: (topo, root) => `Recusado: o repositório git começa em ${topo}, não em ${root}.`,
    semTag: (tag) => `Recusado: não existe a tag ${tag}. Monta a Arena outra vez com o instalador.`,
    simulacao: 'Simulação: nada vai mudar.\n',
    arquivo: (carimbo) => `Arquivo em .workshop/historico/${carimbo}/:`,
    copia: '(cópia)',
    nadaParaArquivar: 'Nada para arquivar em .workshop/.',
    repunha: (n) => `repunha ${n} ficheiro(s) alterado(s)`,
    nadaParaRepor: 'nada para repor',
    falhou: (cmd, out) => `${cmd} falhou:\n${out}`,
    apagou: (sim, n) => `${sim ? 'apagava' : 'apagou'} ${n} ficheiro(s) ou pasta(s) fora do git`,
    nadaParaApagar: 'nada para apagar',
    eMais: (n) => `… e mais ${n}`,
    semSim: '\nCorre sem --sim para fazer o reset.',
    feito: '\nArena de volta ao estado inicial. O histórico ficou em .workshop/historico/.',
  },
  en: {
    semArena: (root) => `Refused: ${root} is not an Arena assembled by the kit (no .arena-kit.json). Nothing was touched.`,
    semGit: 'Refused: this folder is not a git repository.',
    outroRepo: (topo, root) => `Refused: the git repository starts at ${topo}, not at ${root}.`,
    semTag: (tag) => `Refused: the tag ${tag} does not exist. Assemble the Arena again with the installer.`,
    simulacao: 'Dry run: nothing will change.\n',
    arquivo: (carimbo) => `Archive in .workshop/historico/${carimbo}/:`,
    copia: '(copy)',
    nadaParaArquivar: 'Nothing to archive in .workshop/.',
    repunha: (n) => `would restore ${n} changed file(s)`,
    nadaParaRepor: 'nothing to restore',
    falhou: (cmd, out) => `${cmd} failed:\n${out}`,
    apagou: (sim, n) => `${sim ? 'would delete' : 'deleted'} ${n} file(s) or folder(s) outside git`,
    nadaParaApagar: 'nothing to delete',
    eMais: (n) => `… and ${n} more`,
    semSim: '\nRun without --sim to do the reset.',
    feito: '\nArena back to its initial state. The history is in .workshop/historico/.',
  },
});

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
  sair(T.semArena(ROOT));
}
const topo = git('rev-parse', '--show-toplevel');
if (!topo.ok) sair(T.semGit);
// So o repositorio da propria Arena: nunca um repositorio de cima (por exemplo, o do kit).
if (realpathSync(topo.out) !== realpathSync(ROOT)) sair(T.outroRepo(topo.out, ROOT));
if (!git('rev-parse', '-q', '--verify', `refs/tags/${TAG}`).ok) sair(T.semTag(TAG));

// ---------- 1. arquivar ----------

const carimbo = new Date().toISOString().replace(/[:.]/g, '-');
const destino = join(WS, 'historico', carimbo);
const itens = existsSync(WS) ? readdirSync(WS).filter((n) => n !== 'historico') : [];
const gerados = ['plan.json', 'PLANO.md'].filter((f) => existsSync(join(ROOT, f)));

console.log(SIM ? T.simulacao : '');
if (itens.length || gerados.length) {
  console.log(T.arquivo(carimbo));
  for (const n of itens) console.log(`  .workshop/${n}`);
  for (const f of gerados) console.log(`  ${f} ${T.copia}`);
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
  console.log(T.nadaParaArquivar);
}

// ---------- 2. git reset --hard ----------

if (SIM) {
  const mudados = git('status', '--porcelain', '--untracked-files=no');
  console.log(`\ngit reset --hard ${TAG}: ${mudados.out ? T.repunha(mudados.out.split('\n').length) : T.nadaParaRepor}`);
} else {
  const r = git('reset', '--hard', TAG);
  if (!r.ok) sair(T.falhou(`git reset --hard ${TAG}`, r.out));
  console.log(`\ngit reset --hard ${TAG}: ${r.out}`);
}

// ---------- 3. git clean -fd (sem -x) ----------

const limpar = git('clean', SIM ? '-fdn' : '-fd');
if (!limpar.ok) sair(T.falhou('git clean', limpar.out));
const linhas = limpar.out ? limpar.out.split('\n') : [];
console.log(`git clean -fd: ${linhas.length ? T.apagou(SIM, linhas.length) : T.nadaParaApagar}`);
for (const l of linhas.slice(0, 40)) console.log(`  ${l.replace(/^Would remove |^Removing /, '')}`);
if (linhas.length > 40) console.log(`  ${T.eMais(linhas.length - 40)}`);

console.log(SIM ? T.semSim : T.feito);
