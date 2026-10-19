// The demo agents (agents/demo/) are the same for every Project 1 (the Security Arena, the Pocketknife): they are
// templates with {{...}} markers, and the assembly fills them in from the project's workshop.project.json (the file
// the generic /demo-* skills read). So each agent names the project's own contract and file names (cards/CONTRACT.md
// and cards/<id>/card.js in the Arena; tools/CONTRACT.md and tools/<id>/tool.js in the Pocketknife), with no extra
// turn to read the JSON at run time. The agents are written in English (D-20), so the names come from "en".
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const pick = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v.en ?? v.pt : v);

// The values of the markers, from a workshop.project.json already read.
export function agentVars(p) {
  const it = p?.item ?? {};
  for (const k of ['spec', 'test', 'file']) if (typeof it[k] !== 'string' || !it[k].includes('{id}')) throw new Error(`workshop.project.json: item.${k} must be a path with {id}`);
  if (typeof p.contract !== 'string' || !p.contract) throw new Error('workshop.project.json: missing "contract" (the path of the contract file)');
  const unit = pick(p.unit) ?? [];
  const at = (path, id) => path.replace('{id}', id);
  return {
    PROJECT: pick(p.name),
    UNIT: unit[0],
    UNITS: unit[1],
    CONTRACT: p.contract,
    ITEM_SPEC: at(it.spec, '<id>'),
    ITEM_TEST: at(it.test, '<id>'),
    ITEM_FILE: at(it.file, '<id>'),
    ITEM_SPECS: at(it.spec, '*'),
    ITEM_TESTS: at(it.test, '*'),
    ITEM_FILES: at(it.file, '*'),
    EXAMPLE_TEST: at(it.test, p.my_item?.id ?? 'my-01'),
  };
}

export function renderAgent(text, vars) {
  return text.replace(/\{\{([A-Z_]+)\}\}/g, (m, k) => {
    if (typeof vars[k] !== 'string' || !vars[k]) throw new Error(`agent marker ${m} has no value in workshop.project.json`);
    return vars[k];
  });
}

// Copies agents/demo/*.md to <dest>/.claude/agents/ with the markers of <dest>/workshop.project.json filled in.
export function copyDemoAgents(src, dest) {
  const vars = agentVars(JSON.parse(readFileSync(join(dest, 'workshop.project.json'), 'utf8')));
  const out = join(dest, '.claude', 'agents');
  mkdirSync(out, { recursive: true });
  for (const f of readdirSync(src).filter((x) => x.endsWith('.md'))) writeFileSync(join(out, f), renderAgent(readFileSync(join(src, f), 'utf8'), vars));
}
