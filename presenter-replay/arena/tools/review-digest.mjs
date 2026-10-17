#!/usr/bin/env node
// Prepares a short SUMMARY for the reviewer (Opus), so it does not have to read the whole tree:
// test results, static checks and the list of the riskiest files. Writes .workshop/review-summary.md.
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync, mkdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { securityProblems, cardProblems } from '../lib/security.js';
import { ARENA as ROOT, loadEngine } from './engine.mjs';

const engine = await loadEngine(ROOT);

// Texts in the Arena's language. The file name and the paths do not change.
const DIC = {
  pt: {
    title: '# Resumo para a revisão',
    state: '## Estado das tarefas',
    static: '## Verificações estáticas',
    csp: 'CSP no servidor',
    set: 'definido',
    missing: 'EM FALTA',
    dangerous: 'Padrões perigosos encontrados',
    none: 'nenhum',
    review: '## Ficheiros a rever com atenção (lê só estes)',
    failed: '## Tarefas que falharam',
    written: 'resumo escrito em .workshop/review-summary.md',
    noEngine: 'Falta o motor do workshop em tools/workshop/ (monta a Arena com o instalador).',
  },
  en: {
    title: '# Summary for the review',
    state: '## Task status',
    static: '## Static checks',
    csp: 'CSP on the server',
    set: 'set',
    missing: 'MISSING',
    dangerous: 'Dangerous patterns found',
    none: 'none',
    review: '## Files to review closely (read only these)',
    failed: '## Tasks that failed',
    written: 'summary written to .workshop/review-summary.md',
    noEngine: 'The workshop engine is missing in tools/workshop/ (assemble the Arena with the installer).',
  },
};
const T = engine.texts ? engine.texts(DIC) : DIC.pt;

if (!engine.state?.readPlan || !engine.state?.snapshot || !engine.table?.markdownTable) {
  console.error(T.noEngine);
  process.exit(1);
}

function files(dir, filter) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) out.push(...files(p, filter));
    else if (filter(p)) out.push(p);
  }
  return out;
}

const plan = engine.state.readPlan(join(ROOT, 'plan.json'));
const snap = engine.state.snapshot(engine.state.paths(ROOT), plan);
const tasks = snap.tasks ?? snap.tarefas ?? [];
const stateOf = (t) => t.state ?? t.estado;
const findings = [];
for (const p of files(join(ROOT, 'cards'), (x) => x.endsWith('card.js'))) {
  for (const prob of cardProblems(readFileSync(p, 'utf8'))) findings.push(`${relative(ROOT, p)}: ${prob}`);
}
for (const d of ['public', 'pages', 'templates', 'lib']) {
  for (const p of files(join(ROOT, d), (x) => x.endsWith('.js') && !x.endsWith('.test.js') && !x.includes('security.js') && !x.includes('fakedom.js'))) {
    for (const prob of securityProblems(readFileSync(p, 'utf8'))) findings.push(`${relative(ROOT, p)}: ${prob}`);
  }
}
const server = existsSync(join(ROOT, 'server.js')) ? readFileSync(join(ROOT, 'server.js'), 'utf8') : '';
const csp = /Content-Security-Policy/.test(server) ? T.set : T.missing;
const risky = ['server.js', 'public/app.js', 'public/dom.js', 'public/play.js', 'public/status.js', 'public/progress.js', 'pages/category.js', 'pages/score.js', 'lib/hash.js'].filter((p) => existsSync(join(ROOT, p)));
const failed = tasks.filter((t) => ['falhou', 'failed'].includes(stateOf(t)));
const excerpt = (t) => ((t.test ?? t.teste)?.excerpt ?? (t.test ?? t.teste)?.excerto ?? '').split('\n')[0];
const md = `${T.title}

${T.state}

${engine.table.markdownTable(snap)}

${T.static}

- ${T.csp}: ${csp}
- ${T.dangerous}: ${findings.length ? '\n' + findings.map((a) => `  - ${a}`).join('\n') : T.none}

${T.review}

${risky.map((p) => `- ${p}`).join('\n')}
${failed.length ? `\n${T.failed}\n\n${failed.map((t) => `- ${t.id}: ${excerpt(t)}`).join('\n')}` : ''}
`;
mkdirSync(join(ROOT, '.workshop'), { recursive: true });
writeFileSync(join(ROOT, '.workshop/review-summary.md'), md);
console.log(T.written);
