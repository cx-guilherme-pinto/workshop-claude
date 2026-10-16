// Le a definicao (incluindo a resposta) dos cartoes de uma Arena, sem browser, para o record-jogo.mjs.
// O card.js chama um modelo (clicaErro, escolha, ordenar, resposta) com a definicao: aqui o modelo e
// trocado por uma funcao que devolve a definicao tal como esta. Ferramenta do organizador.
//   node cartoes.mjs <arena>   -> lista: modelo, id, titulo
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const MODELOS = { clicaErro: 'clica-erro', escolha: 'escolha', ordenar: 'ordenar', resposta: 'resposta' };

export function lerDefinicao(ficheiro) {
  let src = readFileSync(ficheiro, 'utf8');
  let modelo = null;
  src = src.replace(/^import\s*\{([^}]*)\}\s*from\s*['"][^'"]+['"];?\s*$/gm, (_, nomes) =>
    nomes.split(',').map((n) => n.trim()).filter(Boolean).map((n) => {
      if (MODELOS[n]) { modelo = MODELOS[n]; return `const ${n} = (d) => ({ ...d, __modelo: ${JSON.stringify(MODELOS[n])} });`; }
      return `const ${n} = (s) => String(s ?? '').trim().toLowerCase();`;
    }).join('\n'));
  src = src.replace(/^export\s+default\s+/m, 'module.exports = ');
  const ctx = { module: { exports: null } };
  vm.runInNewContext(src, ctx, { filename: ficheiro, timeout: 1000 });
  const def = ctx.module.exports;
  if (!def || !def.__modelo) throw new Error(`${ficheiro}: nao consegui ler a definicao`);
  return { ...def, modelo: def.__modelo || modelo };
}

export function lerCartoes(arena) {
  const pasta = join(arena, 'cards');
  return readdirSync(pasta).filter((n) => existsSync(join(pasta, n, 'card.js'))).sort().map((n) => {
    try { return lerDefinicao(join(pasta, n, 'card.js')); } catch { return null; }
  }).filter(Boolean);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  for (const c of lerCartoes(process.argv[2])) {
    const tam = (c.segments || c.options || c.items || []).length;
    console.log([c.modelo.padEnd(10), c.id.padEnd(7), String(tam).padStart(2), c.title, JSON.stringify(c.answer).slice(0, 40)].join('  '));
  }
}
