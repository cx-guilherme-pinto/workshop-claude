#!/usr/bin/env node
// Prepara um RESUMO curto para o revisor (Opus), para ele nao ter de ler a arvore inteira:
// resultados dos testes, verificacoes estaticas e a lista dos ficheiros mais arriscados.
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { problemasDeSeguranca, problemasNoCartao } from '../lib/seguranca.js';
import { caminhos, lerPlano, fotografia } from './workshop/orquestrador/lib/estado.mjs';
import { tabelaMarkdown } from './workshop/orquestrador/lib/tabela.mjs';
import { textos } from './workshop/hooks/lib/lingua.mjs';

// Textos na lingua da Arena (tools/workshop/lingua.json). O nome do ficheiro e os caminhos nao mudam.
const T = textos({
  pt: {
    titulo: '# Resumo para a revisão',
    estado: '## Estado das tarefas',
    estaticas: '## Verificações estáticas',
    csp: 'CSP no servidor',
    definido: 'definido',
    emFalta: 'EM FALTA',
    perigosos: 'Padrões perigosos encontrados',
    nenhum: 'nenhum',
    rever: '## Ficheiros a rever com atenção (lê só estes)',
    falharam: '## Tarefas que falharam',
    escrito: 'resumo escrito em .workshop/revisao-resumo.md',
  },
  en: {
    titulo: '# Summary for the review',
    estado: '## Task status',
    estaticas: '## Static checks',
    csp: 'CSP on the server',
    definido: 'set',
    emFalta: 'MISSING',
    perigosos: 'Dangerous patterns found',
    nenhum: 'none',
    rever: '## Files to review closely (read only these)',
    falharam: '## Tasks that failed',
    escrito: 'summary written to .workshop/revisao-resumo.md',
  },
});

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
const csp = /Content-Security-Policy/.test(server) ? T.definido : T.emFalta;
const arriscados = ['server.js', 'public/app.js', 'public/dom.js', 'public/jogo.js', 'public/estado.js', 'public/progresso.js', 'pages/categoria.js', 'pages/pontuacao.js', 'lib/hash.js'].filter((p) => existsSync(join(ROOT, p)));
const md = `${T.titulo}

${T.estado}

${tabelaMarkdown(f)}

${T.estaticas}

- ${T.csp}: ${csp}
- ${T.perigosos}: ${achados.length ? '\n' + achados.map((a) => `  - ${a}`).join('\n') : T.nenhum}

${T.rever}

${arriscados.map((p) => `- ${p}`).join('\n')}
${f.tarefas.filter((t) => t.estado === 'falhou').length ? `\n${T.falharam}\n\n${f.tarefas.filter((t) => t.estado === 'falhou').map((t) => `- ${t.id}: ${(t.teste?.excerto || '').split('\n')[0]}`).join('\n')}` : ''}
`;
writeFileSync(join(ROOT, '.workshop/revisao-resumo.md'), md);
console.log(T.escrito);
