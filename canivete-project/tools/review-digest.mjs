#!/usr/bin/env node
// Prepares a short SUMMARY for the reviewer (Opus), so it does not have to read the whole tree (adapted from the
// Security Arena): the tasks table, the static checks of tools/*/tool.js, public/, pages/, templates/ and lib/, and
// the list of the files to review. Writes .workshop/review-summary.md.
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync, mkdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { securityProblems, toolProblems } from '../lib/security.js';
import { PROJECT as ROOT, TOOL_ID, loadEngine, projectTexts } from './engine.mjs';

const engine = await loadEngine(ROOT);

// Texts in the project's language. The file name and the paths do not change.
const T = projectTexts({
  pt: {
    title: '# Resumo para a revisão',
    state: '## Estado das tarefas',
    static: '## Verificações estáticas',
    csp: 'CSP no servidor',
    set: 'definido',
    missing: 'EM FALTA',
    local: 'Liga só a 127.0.0.1',
    yes: 'sim',
    no: 'NÃO',
    tools: (n, built) => `Ferramentas: ${built} de ${n} com tools/<id>/tool.js`,
    dangerous: 'Padrões perigosos encontrados',
    none: 'nenhum',
    review: '## Ficheiros a rever com atenção (lê só estes)',
    failed: '## Tarefas que falharam',
    written: 'resumo escrito em .workshop/review-summary.md',
    noEngine: 'Falta o motor do workshop em tools/workshop/ (monta o Canivete com o instalador).',
  },
  en: {
    title: '# Summary for the review',
    state: '## Task status',
    static: '## Static checks',
    csp: 'CSP on the server',
    set: 'set',
    missing: 'MISSING',
    local: 'Binds only to 127.0.0.1',
    yes: 'yes',
    no: 'NO',
    tools: (n, built) => `Tools: ${built} of ${n} with tools/<id>/tool.js`,
    dangerous: 'Dangerous patterns found',
    none: 'none',
    review: '## Files to review closely (read only these)',
    failed: '## Tasks that failed',
    written: 'summary written to .workshop/review-summary.md',
    noEngine: 'The workshop engine is missing in tools/workshop/ (assemble the Pocketknife with the installer).',
  },
}, ROOT);

if (!engine.state?.readPlan || !engine.state?.snapshot || !engine.table?.markdownTable) {
  console.error(T.noEngine);
  process.exit(1);
}

function files(dir, filter) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const n of readdirSync(dir).sort()) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) out.push(...files(p, filter));
    else if (filter(p)) out.push(p);
  }
  return out;
}
const rel = (p) => relative(ROOT, p).split(sep).join('/');

const plan = engine.state.readPlan(join(ROOT, 'plan.json'));
const snap = engine.state.snapshot(engine.state.paths(ROOT), plan);
const tasks = snap.tasks ?? snap.tarefas ?? [];
const stateOf = (t) => t.state ?? t.estado;

// The tools: only computation (lib/security.js toolProblems: no DOM, network, storage, eval, Math.random…).
const toolIds = existsSync(join(ROOT, 'tools')) ? readdirSync(join(ROOT, 'tools')).filter((n) => TOOL_ID.test(n)).sort() : [];
const built = toolIds.filter((id) => existsSync(join(ROOT, 'tools', id, 'tool.js')));
const findings = [];
const flagged = new Set();
for (const id of built) {
  const f = join(ROOT, 'tools', id, 'tool.js');
  for (const prob of toolProblems(readFileSync(f, 'utf8'))) {
    findings.push(`${rel(f)}: ${prob}`);
    flagged.add(rel(f));
  }
}
// The shell, the catalog page, the templates and lib: no HTML from text, no eval (the tests and security.js itself
// name the patterns on purpose).
for (const d of ['public', 'pages', 'templates', 'lib']) {
  for (const p of files(join(ROOT, d), (x) => /\.m?js$/.test(x) && !x.endsWith('.test.js') && !x.endsWith(`${sep}security.js`))) {
    for (const prob of securityProblems(readFileSync(p, 'utf8'))) {
      findings.push(`${rel(p)}: ${prob}`);
      flagged.add(rel(p));
    }
  }
}
const server = existsSync(join(ROOT, 'server.js')) ? readFileSync(join(ROOT, 'server.js'), 'utf8') : '';
const csp = /Content-Security-Policy/.test(server) ? T.set : T.missing;
const local = /listen\([^)]*'127\.0\.0\.1'/.test(server) && !/listen\([^)]*'0\.0\.0\.0'/.test(server) ? T.yes : T.no;
const failed = tasks.filter((t) => ['falhou', 'failed'].includes(stateOf(t)));
// The files to review: the server, the shell, the catalog page, the shared template code, plus every tool flagged
// above and every tool that failed for good.
const risky = [
  'server.js', 'public/app.js', 'public/tool-view.js', 'public/finder.js', 'public/testrun.js', 'public/dom.js', 'public/status.js',
  'pages/catalog.js', 'templates/common.js', 'templates/generate.js',
].filter((p) => existsSync(join(ROOT, p)));
for (const t of failed) if (TOOL_ID.test(String(t.id)) && existsSync(join(ROOT, 'tools', t.id, 'tool.js'))) flagged.add(`tools/${t.id}/tool.js`);
for (const f of flagged) if (!risky.includes(f)) risky.push(f);
const excerpt = (t) => ((t.test ?? t.teste)?.excerpt ?? (t.test ?? t.teste)?.excerto ?? '').split('\n')[0];
const md = `${T.title}

${T.state}

${engine.table.markdownTable(snap)}

${T.static}

- ${T.csp}: ${csp}
- ${T.local}: ${local}
- ${T.tools(toolIds.length, built.length)}
- ${T.dangerous}: ${findings.length ? '\n' + findings.map((a) => `  - ${a}`).join('\n') : T.none}

${T.review}

${risky.map((p) => `- ${p}`).join('\n')}
${failed.length ? `\n${T.failed}\n\n${failed.map((t) => `- ${t.id}: ${excerpt(t)}`).join('\n')}` : ''}
`;
mkdirSync(join(ROOT, '.workshop'), { recursive: true });
writeFileSync(join(ROOT, '.workshop/review-summary.md'), md);
console.log(T.written);
