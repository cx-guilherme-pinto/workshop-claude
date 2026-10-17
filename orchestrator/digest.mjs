#!/usr/bin/env node
// Short summary for the reviewer (Opus) in a real project: task states, the gate result
// and the riskiest changed files, so it reads only what matters. Written to .workshop/review-summary.md.
//   node digest.mjs [--project <dir>] [--base <ref>]
// The summary is in the kit language; `l` is optional (tests).
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { caminhos, lerPlano, fotografia, lerPonteiro, primeiroQueExiste } from './lib/state.mjs';
import { tabelaMarkdown } from './lib/table.mjs';
import { gate, gateMd } from './gate.mjs';
import { isMain } from './lib/is-main.mjs';
import { opt } from './lib/args.mjs';
import { lingua, textos } from '../hooks/lib/language.mjs';

export const REVIEW_SUMMARY = 'review-summary.md';

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
    escrito: 'resumo escrito em .workshop/review-summary.md',
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
    escrito: 'summary written to .workshop/review-summary.md',
  },
};

export function digest(dir, { base = null, l = lingua() } = {}) {
  const T = textos(TEXTOS, l);
  const c = caminhos(dir);
  const ponteiro = lerPonteiro(c);
  const planoPath = ponteiro.plan || ponteiro.plano || join(c.ws, 'plan.json');
  const plano = existsSync(planoPath) ? lerPlano(planoPath, l) : null;
  const f = plano ? fotografia(c, plano) : null;
  const g = gate(dir, { base, teste: null, l });
  const stat = spawnSync('git', ['diff', '--stat', base ? `${base}...HEAD` : 'HEAD'], { cwd: dir, encoding: 'utf8' }).stdout || '';
  // Riskiest: non-test code with the most changed lines, up to 8.
  const numstat = (spawnSync('git', ['diff', '--numstat', base ? `${base}...HEAD` : 'HEAD'], { cwd: dir, encoding: 'utf8' }).stdout || '')
    .split('\n')
    .map((l) => l.split('\t'))
    .filter((p) => p.length === 3 && !/test|spec|\.md$|lock/.test(p[2]))
    .map(([a, d, p]) => ({ p, n: (Number(a) || 0) + (Number(d) || 0) }))
    .sort((x, y) => y.n - x.n)
    .slice(0, 8)
    .map((x) => x.p);
  const novos = g.alterados.filter((p) => !numstat.includes(p) && !/test|spec|\.md$|lock/.test(p)).slice(0, 8 - numstat.length);
  const fTarefa = primeiroQueExiste(join(c.ws, 'task.md'), join(c.ws, 'tarefa.md'));
  const tarefa = existsSync(fTarefa) ? readFileSync(fTarefa, 'utf8').slice(0, 2500) : '';
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
  writeFileSync(join(c.ws, REVIEW_SUMMARY), md);
  return md;
}

if (isMain(import.meta.url)) {
  const a = process.argv.slice(2);
  const dir = opt(a, '--project') || process.cwd();
  digest(dir, { base: opt(a, '--base') });
  console.log(textos(TEXTOS).escrito);
}
