// The names a participant sees are English in both languages (files, folders, markers, MCP tools, keys the
// skills and agents ask for). Only human sentences are localised. This keeps the rename from coming back.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

function files(dir) {
  const out = [];
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (n === 'node_modules' || n.startsWith('.')) continue;
    if (statSync(p).isDirectory()) out.push(...files(p));
    else out.push(p);
  }
  return out;
}

// Old names (identifiers, markers, files, MCP tools) that must not appear in what the skills and agents say.
const OLD = [
  /\bmemoria_(procurar|adicionar|relacionadas)\b/, /mcp__memoria__/, /\bmemoria-extrator\b/, /\/memoria\b/,
  /\borquestrador\b/, /\bexemplo-projeto-real\b/, /\bexplorar\.mjs\b/, /\bpainel\.mjs\b/, /\bpublicar-texto\b/,
  /ESTADO: /, /CHAMADAS/, /GATE: (APROVADO|REPROVADO)/, /\bPLANO (OK|INVALIDO)\b/, /\bENXAME OK\b/, /\bCUSTO OK\b/, /\bFALHOU\b/,
  /MEMORIA INDISPONIVEL/, /Plano nao encontrado/, /\bERRO:/,
  /\bveredito\b/, /\baprovado(_com_reservas)?\b/, /\breprovado\b/, /\btarefa\.(md|json)\b/, /\bPLANO\.md\b/,
  /\brelatorio\.md\b/, /\bmemoria-resumo\b/, /\brevisao-resumo\b/, /\bplano-resumo\b/, /\bplan-proposta\b/, /\bintegracao\b/, /\brevisao\b/,
  /\bhistorico\b/, /\barena-inicial\b/, /\barena-de-seguranca\b/, /--(todos|teste|ignorar|plano|projeto|modo|aplicar)\b/,
  /\b(licao|nao_fazer|historico)\b/, /\b(projeto|tarefa|epico|etiquetas|ficheiros|ligacoes|custo_usd|texto)\b`/,
  /\bMemória\b/,
];

test('skills and agents: no old Portuguese names (markers, files, flags, MCP tools, JSON keys)', () => {
  const bad = [];
  for (const d of ['skills-demo', 'skills-prod', 'agents']) {
    for (const f of files(join(ROOT, d)).filter((x) => x.endsWith('.md'))) {
      readFileSync(f, 'utf8').split('\n').forEach((l, i) => {
        for (const re of OLD) if (re.test(l)) bad.push(`${relative(ROOT, f)}:${i + 1}: ${re} · ${l.trim().slice(0, 100)}`);
      });
    }
  }
  assert.deepEqual(bad, []);
});

test('skills and agents use the agent-memory MCP tools and the English markers', () => {
  const read = (p) => readFileSync(join(ROOT, p), 'utf8');
  for (const p of ['agents/demo/memory-extractor.md', 'agents/prod/memory-extractor.md']) {
    assert.match(read(p), /^tools: Read, mcp__agent-memory__memory_add, mcp__agent-memory__memory_search$/m, p);
    assert.match(read(p), /`MEMORY UNAVAILABLE`/, p);
    assert.match(read(p), /`lesson`, `do`, `dont`, `history`/, p);
  }
  for (const p of ['skills-demo/demo-swarm/SKILL.md', 'skills-prod/task-swarm/SKILL.md']) {
    for (const m of ['STATE: DONE', 'STATE: BLOCKED', 'STATE: BATCH', '<<<CALLS', 'CALLS>>>', 'ERROR: plan not found']) assert.ok(read(p).includes(m), `${p}: ${m}`);
  }
  // the generic /demo-review runs the gate command of each project's workshop.project.json (D-33)
  assert.match(read('skills-demo/demo-review/SKILL.md'), /Run the command in `gate`/);
  assert.match(JSON.parse(read('demo-project/workshop.project.json')).gate, /gate\.mjs --test "node tools\/check-integration\.mjs" --base arena-start --ignore cards\//);
  assert.match(JSON.parse(read('canivete-project/workshop.project.json')).gate, /gate\.mjs --test "node tools\/check-integration\.mjs" --base canivete-start/);
  assert.match(read('skills-demo/demo-plan/SKILL.md'), /node tools\/plan\.mjs --apply \.workshop\/planner\.json/);
  assert.match(read('skills-prod/task-intake/SKILL.md'), /`## Acceptance criteria`/);
});

test('the engine folders the participant gets have English file names', () => {
  const PT = /(estado|tabela|padroes|principal|painel|explorar|publicar|perfis|lingua|linguas|custo|orquestrador|memoria|resumo|relatorio|veredito|tarefa)/i;
  const bad = [];
  for (const d of ['orchestrator', 'hooks', 'statusline', 'installer', 'skills-demo', 'skills-prod', 'agents']) {
    for (const f of files(join(ROOT, d))) if (PT.test(relative(ROOT, f))) bad.push(relative(ROOT, f));
  }
  assert.deepEqual(bad, []);
});
