#!/usr/bin/env node
// Resumo curto para o revisor (Opus) num projeto real: estado das tarefas, resultado do gate
// e os ficheiros alterados mais arriscados, para ele ler so o essencial.
//   node digest.mjs [--projeto <dir>] [--base <ref>]
// O resumo sai na lingua do kit; `l` e opcional (testes).
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { caminhos, lerPlano, fotografia, lerJson } from './lib/estado.mjs';
import { tabelaMarkdown } from './lib/tabela.mjs';
import { gate, gateMd } from './gate.mjs';
import { ehPrincipal } from './lib/principal.mjs';
import { lingua, textos } from '../hooks/lib/lingua.mjs';

const TEXTOS = {
  pt: {
    titulo: '# Resumo para a revisão',
    tarefa: '## Tarefa',
    estado: '## Estado das tarefas',
    semPlano: 'sem plano',
    verificacoes: '## Verificações automáticas',
    diff: '## Diff (resumo)',
    ficheiros: '## Ficheiros a rever com atenção (lê só estes)',
    semCodigo: '- (sem alterações de código)',
    escrito: 'resumo escrito em .workshop/revisao-resumo.md',
  },
  en: {
    titulo: '# Summary for the review',
    tarefa: '## Task',
    estado: '## Task status',
    semPlano: 'no plan',
    verificacoes: '## Automatic checks',
    diff: '## Diff (summary)',
    ficheiros: '## Files to review carefully (read only these)',
    semCodigo: '- (no code changes)',
    escrito: 'summary written to .workshop/revisao-resumo.md',
  },
};

export function digest(dir, { base = null, l = lingua() } = {}) {
  const T = textos(TEXTOS, l);
  const c = caminhos(dir);
  const ponteiro = lerJson(c.ponteiro, {});
  const planoPath = ponteiro.plano || join(c.ws, 'plan.json');
  const plano = existsSync(planoPath) ? lerPlano(planoPath, l) : null;
  const f = plano ? fotografia(c, plano) : null;
  const g = gate(dir, { base, teste: null, l });
  const stat = spawnSync('git', ['diff', '--stat', base ? `${base}...HEAD` : 'HEAD'], { cwd: dir, encoding: 'utf8' }).stdout || '';
  // Mais arriscados: codigo nao-teste com mais linhas alteradas, ate 8.
  const numstat = (spawnSync('git', ['diff', '--numstat', base ? `${base}...HEAD` : 'HEAD'], { cwd: dir, encoding: 'utf8' }).stdout || '')
    .split('\n')
    .map((l) => l.split('\t'))
    .filter((p) => p.length === 3 && !/test|spec|\.md$|lock/.test(p[2]))
    .map(([a, d, p]) => ({ p, n: (Number(a) || 0) + (Number(d) || 0) }))
    .sort((x, y) => y.n - x.n)
    .slice(0, 8)
    .map((x) => x.p);
  const novos = g.alterados.filter((p) => !numstat.includes(p) && !/test|spec|\.md$|lock/.test(p)).slice(0, 8 - numstat.length);
  const tarefa = existsSync(join(c.ws, 'tarefa.md')) ? readFileSync(join(c.ws, 'tarefa.md'), 'utf8').slice(0, 2500) : '';
  const md = `${T.titulo}

${tarefa ? T.tarefa + '\n\n' + tarefa + '\n' : ''}
${T.estado}

${f ? tabelaMarkdown(f, undefined, l) : T.semPlano}

${T.verificacoes}

${gateMd(g, l)}

${T.diff}

\`\`\`
${stat.trim().split('\n').slice(-25).join('\n')}
\`\`\`

${T.ficheiros}

${[...numstat, ...novos].map((p) => `- ${p}`).join('\n') || T.semCodigo}
`;
  mkdirSync(c.ws, { recursive: true });
  writeFileSync(join(c.ws, 'revisao-resumo.md'), md);
  return md;
}

if (ehPrincipal(import.meta.url)) {
  const a = process.argv.slice(2);
  const dir = a.includes('--projeto') ? a[a.indexOf('--projeto') + 1] : process.cwd();
  digest(dir, { base: a.includes('--base') ? a[a.indexOf('--base') + 1] : null });
  console.log(textos(TEXTOS).escrito);
}
