// The demo agents (agents/demo/) are templates for every Project 1: the assembly fills in the project's name, contract
// and file names from its workshop.project.json (installer/lib/project-agents.mjs). The Pocketknife's agents must not
// talk about the Arena's cards, nor the Arena's about the Pocketknife's tools.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { agentVars, renderAgent } from '../../installer/lib/project-agents.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const AGENTS = join(ROOT, 'agents', 'demo');
const project = (d) => JSON.parse(readFileSync(join(ROOT, d, 'workshop.project.json'), 'utf8'));
const agents = () => readdirSync(AGENTS).filter((f) => f.endsWith('.md')).map((f) => [f, readFileSync(join(AGENTS, f), 'utf8')]);

const PROJECTS = {
  'demo-project': { contract: 'cards/CONTRACT.md', file: 'cards/<id>/card.js', foreign: /Pocketknife|Canivete|tool\.js|tools\/CONTRACT/i },
  'canivete-project': { contract: 'tools/CONTRACT.md', file: 'tools/<id>/tool.js', foreign: /Arena|card/i },
};

test('agents/demo: the contract named in each workshop.project.json exists', () => {
  for (const d of Object.keys(PROJECTS)) {
    assert.equal(project(d).contract, PROJECTS[d].contract, d);
    readFileSync(join(ROOT, d, project(d).contract));
  }
});

for (const [d, want] of Object.entries(PROJECTS)) {
  test(`agents/demo rendered for ${d}: no marker left, the project's own names, the frontmatter kept`, () => {
    const vars = agentVars(project(d));
    for (const [f, src] of agents()) {
      const out = renderAgent(src, vars);
      assert.ok(!out.includes('{{'), `${f}: a marker is left`);
      assert.doesNotMatch(out, want.foreign, `${f} talks about the other project`);
      assert.match(out, /^---\nname: [a-z-]+\ndescription: .+\nmodel: claude-[a-z0-9-]+\ntools: .+\n/, `${f}: frontmatter`);
      assert.match(out, /^maxTurns: \d+$/m, `${f}: maxTurns`);
      if (/^tools: .*Bash/m.test(out)) assert.match(out, /^permissionMode: acceptEdits$/m, `${f}: permissionMode`);
    }
    const worker = renderAgent(readFileSync(join(AGENTS, 'worker.md'), 'utf8'), vars);
    assert.ok(worker.includes(want.contract) && worker.includes(want.file), 'worker: the contract and the file of the project');
    for (const f of ['worker.md', 'implementer.md']) {
      const out = renderAgent(readFileSync(join(AGENTS, f), 'utf8'), vars);
      // no agent edits the spec or the test, and a gap in the spec stops with the marker
      assert.ok(out.includes(vars.ITEM_SPEC) && out.includes(vars.ITEM_TEST), `${f}: names the spec and the test it never changes`);
      assert.match(out, /`FAILED <id>: the spec does not decide the answer`/, f);
    }
  });
}

test('agentVars: a workshop.project.json without contract or item paths is an error', () => {
  const p = project('canivete-project');
  assert.throws(() => agentVars({ ...p, contract: undefined }), /contract/);
  assert.throws(() => agentVars({ ...p, item: { ...p.item, file: 'tool.js' } }), /item\.file/);
  assert.throws(() => renderAgent('{{NOPE}}', agentVars(p)), /\{\{NOPE\}\}/);
});
