#!/usr/bin/env node
// Resumo curto para o revisor (Opus) num projeto real: estado das tarefas, resultado do gate
// e os ficheiros alterados mais arriscados, para ele ler so o essencial.
//   node digest.mjs [--projeto <dir>] [--base <ref>]
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { caminhos, lerPlano, fotografia, lerJson } from './lib/estado.mjs';
import { tabelaMarkdown } from './lib/tabela.mjs';
import { gate, gateMd } from './gate.mjs';

export function digest(dir, { base = null } = {}) {
  const c = caminhos(dir);
  const ponteiro = lerJson(c.ponteiro, {});
  const planoPath = ponteiro.plano || join(c.ws, 'plan.json');
  const plano = existsSync(planoPath) ? lerPlano(planoPath) : null;
  const f = plano ? fotografia(c, plano) : null;
  const g = gate(dir, { base, teste: null });
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
  const md = `# Resumo para a revisão

${tarefa ? '## Tarefa\n\n' + tarefa + '\n' : ''}
## Estado das tarefas

${f ? tabelaMarkdown(f) : 'sem plano'}

## Verificações automáticas

${gateMd(g)}

## Diff (resumo)

\`\`\`
${stat.trim().split('\n').slice(-25).join('\n')}
\`\`\`

## Ficheiros a rever com atenção (lê só estes)

${[...numstat, ...novos].map((p) => `- ${p}`).join('\n') || '- (sem alterações de código)'}
`;
  mkdirSync(c.ws, { recursive: true });
  writeFileSync(join(c.ws, 'revisao-resumo.md'), md);
  return md;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const a = process.argv.slice(2);
  const dir = a.includes('--projeto') ? a[a.indexOf('--projeto') + 1] : process.cwd();
  digest(dir, { base: a.includes('--base') ? a[a.indexOf('--base') + 1] : null });
  console.log('resumo escrito em .workshop/revisao-resumo.md');
}
