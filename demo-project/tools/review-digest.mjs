#!/usr/bin/env node
// Prepara um RESUMO curto para o revisor (Opus), para ele nao ter de ler a arvore inteira:
// resultados dos testes, verificacoes estaticas e a lista dos ficheiros mais arriscados.
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { problemasDeSeguranca, problemasNoCartao } from '../lib/seguranca.js';
import { caminhos, lerPlano, fotografia } from './workshop/orquestrador/lib/estado.mjs';
import { tabelaMarkdown } from './workshop/orquestrador/lib/tabela.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function ficheiros(dir, filtro) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) out.push(...ficheiros(p, filtro));
    else if (filtro(p)) out.push(p);
  }
  return out;
}

const plano = lerPlano(join(ROOT, 'plan.json'));
const f = fotografia(caminhos(ROOT), plano);
const achados = [];
for (const p of ficheiros(join(ROOT, 'cards'), (x) => x.endsWith('card.js'))) {
  for (const prob of problemasNoCartao(readFileSync(p, 'utf8'))) achados.push(`${relative(ROOT, p)}: ${prob}`);
}
for (const d of ['public', 'pages', 'templates', 'lib']) {
  for (const p of ficheiros(join(ROOT, d), (x) => x.endsWith('.js') && !x.endsWith('.test.js') && !x.includes('seguranca.js') && !x.includes('fakedom.js'))) {
    for (const prob of problemasDeSeguranca(readFileSync(p, 'utf8'))) achados.push(`${relative(ROOT, p)}: ${prob}`);
  }
}
const server = existsSync(join(ROOT, 'server.js')) ? readFileSync(join(ROOT, 'server.js'), 'utf8') : '';
const csp = /Content-Security-Policy/.test(server) ? 'definido' : 'EM FALTA';
const arriscados = ['server.js', 'public/app.js', 'pages/categoria.js', 'pages/pontuacao.js', 'lib/hash.js'].filter((p) => existsSync(join(ROOT, p)));
const md = `# Resumo para a revisão

## Estado das tarefas

${tabelaMarkdown(f)}

## Verificações estáticas

- CSP no servidor: ${csp}
- Padrões perigosos encontrados: ${achados.length ? '\n' + achados.map((a) => `  - ${a}`).join('\n') : 'nenhum'}

## Ficheiros a rever com atenção (lê só estes)

${arriscados.map((p) => `- ${p}`).join('\n')}
${f.tarefas.filter((t) => t.estado === 'falhou').length ? `\n## Tarefas que falharam\n\n${f.tarefas.filter((t) => t.estado === 'falhou').map((t) => `- ${t.id}: ${(t.teste?.excerto || '').split('\n')[0]}`).join('\n')}` : ''}
`;
writeFileSync(join(ROOT, '.workshop/revisao-resumo.md'), md);
console.log('resumo escrito em .workshop/revisao-resumo.md');
