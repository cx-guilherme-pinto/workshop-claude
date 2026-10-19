// Tests of the deterministic orchestrator (next-wave + grade + validate-plan).
// Language fixed for the existing tests (the texts in Portuguese); the English cases pass the language
// explicitly or change it locally. No module reads the language when it is imported.
process.env.WORKSHOP_LANG = 'pt';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { proximaOnda, textoOnda } from '../next-wave.mjs';
import { validar, planoMd } from '../validate-plan.mjs';
import { estimar, tabelaEstimativa } from '../estimate.mjs';
import { relatorio } from '../report.mjs';
import { gate, gateMd } from '../gate.mjs';
import { avaliar } from '../grade.mjs';
import { lerPlano, normalizarPlano, caminhos } from '../lib/state.mjs';
import { usd, linhaResumo } from '../lib/table.mjs';
import { opt, opts, flag } from '../lib/args.mjs';

const AQUI = new URL('..', import.meta.url).pathname;

const OK = ['node', '-e', 'process.exit(0)'];
const FALHA = ['node', '-e', 'console.log("✖ falhou de proposito"); process.exit(1)'];

function projeto(tarefas, config = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'ws-orq-'));
  const plano = {
    v: 1, projeto: 't', modo: 'teste',
    config: { max_paralelo: 2, max_tentativas: 3, escalar_para: 'implementer', ...config },
    agentes: { worker: { modelo: 'claude-haiku-5-5' }, implementer: { modelo: 'claude-sonnet-5-5' } },
    tarefas: tarefas.map((t) => ({ grupo_tipo: 'cartao', onda: 1, agente: 'worker', depende: [], ficheiros: [], instrucoes: `faz ${t.id}`, ...t })),
  };
  writeFileSync(join(dir, 'plan.json'), JSON.stringify(plano));
  return { dir, plano: join(dir, 'plan.json') };
}
const estado = (dir, id) => JSON.parse(readFileSync(join(dir, '.workshop', 'status', `${id}.json`), 'utf8'));

test('respeita dependências e o máximo em paralelo', async () => {
  const p = projeto([{ id: 'a', teste: OK }, { id: 'b', teste: OK }, { id: 'c', teste: OK, depende: ['a'] }]);
  let r = await proximaOnda({ projeto: p.dir, plano: p.plano });
  assert.deepEqual(r.lote.map((t) => t.id), ['a', 'b']);
  assert.match(r.chamadas[0].prompt, /^TASK: a\nAGENT: worker-01\nATTEMPT: 1/);
  r = await proximaOnda({ projeto: p.dir, plano: p.plano });
  assert.deepEqual(r.lote.map((t) => t.id), ['c']);
  r = await proximaOnda({ projeto: p.dir, plano: p.plano });
  assert.equal(r.lote.length, 0);
  assert.equal(r.pendentes, 0);
  assert.equal(estado(p.dir, 'c').estado, 'verde');
});

test('as chamadas do lote correm em primeiro plano (run_in_background false), para o lote acabar no mesmo turno', async () => {
  const p = projeto([{ id: 'a', teste: FALHA }, { id: 'b', teste: FALHA }]);
  const r = await proximaOnda({ projeto: p.dir, plano: p.plano });
  assert.equal(r.chamadas.length, 2);
  for (const ch of r.chamadas) assert.equal(ch.run_in_background, false);
});

test('repete com o erro e escala para Sonnet na última tentativa', async () => {
  const p = projeto([{ id: 'x', teste: FALHA }]);
  await proximaOnda({ projeto: p.dir, plano: p.plano }); // tentativa 1
  let r = await proximaOnda({ projeto: p.dir, plano: p.plano }); // avalia 1 (vermelho) e lanca 2
  assert.equal(r.chamadas[0].subagent_type, 'worker');
  assert.match(r.chamadas[0].prompt, /ATTEMPT: 2[\s\S]*falhou de proposito/);
  r = await proximaOnda({ projeto: p.dir, plano: p.plano }); // lanca 3, em Sonnet
  assert.equal(r.chamadas[0].subagent_type, 'implementer');
  assert.match(r.chamadas[0].description, /^implementer-01/);
  r = await proximaOnda({ projeto: p.dir, plano: p.plano }); // avalia 3: falhou de vez
  assert.equal(estado(p.dir, 'x').estado, 'falhou');
  assert.equal(r.lote.length, 0);
});

test('uma dependência que falhou de vez não bloqueia as seguintes', async () => {
  const p = projeto([{ id: 'x', teste: FALHA }, { id: 'y', teste: OK, depende: ['x'] }], { max_tentativas: 1 });
  await proximaOnda({ projeto: p.dir, plano: p.plano });
  const r = await proximaOnda({ projeto: p.dir, plano: p.plano });
  assert.deepEqual(r.lote.map((t) => t.id), ['y']);
});

test('nunca junta no mesmo lote tarefas com ficheiros em comum', async () => {
  const p = projeto([
    { id: 'a', teste: OK, ficheiros: ['src/x.js'] },
    { id: 'b', teste: OK, ficheiros: ['src/'] },
    { id: 'c', teste: OK, ficheiros: ['docs/y.md'] },
  ], { max_paralelo: 3 });
  const r = await proximaOnda({ projeto: p.dir, plano: p.plano });
  assert.deepEqual(r.lote.map((t) => t.id), ['a', 'c']);
});

test('com worktrees, as chamadas levam isolation', async () => {
  const p = projeto([{ id: 'a', teste: OK, ficheiros: ['src/x.js'] }, { id: 'b', teste: OK, ficheiros: ['src/x.js'] }], { worktrees: true });
  const r = await proximaOnda({ projeto: p.dir, plano: p.plano });
  assert.equal(r.lote.length, 2);
  assert.ok(r.chamadas.every((c) => c.isolation === 'worktree'));
});

test('validate-plan: deteta ciclos, agentes desconhecidos e acrescenta integração e revisão', () => {
  const ciclo = validar({ tarefas: [{ id: 'a', agente: 'ws-worker', depende: ['b'], instrucoes: 'x'.repeat(30) }, { id: 'b', agente: 'ws-worker', depende: ['a'], instrucoes: 'x'.repeat(30) }] });
  assert.ok(ciclo.erros.some((e) => /ciclo/.test(e)));
  const mau = validar({ tarefas: [{ id: 'a', agente: 'gpt', instrucoes: 'x'.repeat(30) }] });
  assert.ok(mau.erros.some((e) => /agente desconhecido/.test(e)));
  const bom = validar({ tarefas: [{ id: 'a', agente: 'ws-worker', ficheiros: ['a.js'], teste: ['npm', 'test'], instrucoes: 'Faz a coisa A com cuidado.' }] }, { teste_global: ['npm', 'test'] });
  assert.deepEqual(bom.erros, []);
  assert.deepEqual(bom.plano.tasks.map((t) => t.id), ['a', 'integration', 'review']);
  assert.deepEqual(bom.plano.tasks[1].depends_on, ['a']);
  assert.equal(bom.plano.tasks[2].agent, 'ws-reviewer');
  assert.deepEqual(bom.plano.tasks[2].test, { json_file: '.workshop/verdict.json', field: 'verdict' });
});

// ---------- textos em portugues e em ingles ----------

// Muda WORKSHOP_LANG so durante fn (para o que nao recebe a lingua explicita, como o grade).
async function comLingua(l, fn) {
  const antes = process.env.WORKSHOP_LANG;
  process.env.WORKSHOP_LANG = l;
  try {
    return await fn();
  } finally {
    process.env.WORKSHOP_LANG = antes;
  }
}

test('next-wave: tabela, progresso e marcador em portugues', async () => {
  const p = projeto([{ id: 'a', teste: OK }, { id: 'b', teste: FALHA }]);
  let r = await proximaOnda({ projeto: p.dir, plano: p.plano });
  let txt = textoOnda(r, 'pt');
  assert.match(txt, /^Progresso: 0\/2 verdes · 2 a trabalhar · 0 vermelhos · 0 por fazer · custo /m);
  assert.match(txt, /^STATE: BATCH 1 · onda 1 · 2 agente\(s\)$/m);
  assert.match(txt, /^<<<CALLS$[\s\S]*^CALLS>>>$/m);
  r = await proximaOnda({ projeto: p.dir, plano: p.plano });
  txt = textoOnda(r, 'pt');
  assert.match(txt, /^## Resultado do lote anterior$/m);
  assert.match(txt, /^\| agente \| modelo \| tarefa \| estado \| tempo \| custo \|$/m);
  assert.match(r.chamadas[0].prompt, /A tentativa 1 falhou\. Excerto do teste:/);
});

test('next-wave: tabela, progresso, marcador e prompts em ingles', async () => {
  await comLingua('en', async () => {
    const p = projeto([{ id: 'a', teste: OK }, { id: 'b', teste: FALHA }], { max_tentativas: 2 });
    let r = await proximaOnda({ projeto: p.dir, plano: p.plano, l: 'en' });
    let txt = textoOnda(r, 'en');
    assert.match(txt, /^Progress: 0\/2 green · 2 working · 0 red · 0 to do · cost US\$ 0\.0000$/m);
    assert.match(txt, /^STATE: BATCH 1 · wave 1 · 2 agent\(s\)$/m);
    assert.match(txt, /^\| agent \| task \| type \|$/m);
    assert.match(txt, /^Launch these calls NOW/m);
    assert.match(r.chamadas[0].prompt, /^TASK: a\nAGENT: worker-01\nATTEMPT: 1/, 'the prompt markers are English in both languages');
    r = await proximaOnda({ projeto: p.dir, plano: p.plano, l: 'en' });
    txt = textoOnda(r, 'en');
    assert.match(txt, /^## Previous batch result$/m);
    assert.match(txt, /^\| agent \| model \| task \| status \| time \| cost \|$/m);
    assert.match(txt, /\| a \| ✓ passed \|/);
    assert.match(r.chamadas[0].prompt, /ATTEMPT: 2[\s\S]*Attempt 1 failed\. Test excerpt:[\s\S]*Fix the cause and check again\.[\s\S]*This is the last attempt/);
    r = await proximaOnda({ projeto: p.dir, plano: p.plano, l: 'en' });
    txt = textoOnda(r, 'en');
    assert.match(txt, /^STATE: DONE · 1 green, 1 failed · duration .* · cost US\$ /m);
    assert.doesNotMatch(txt, /ESTADO|LOTE|CHAMADAS|TAREFA|FALHOU/);
  });
});

test('missing plan: the "ERROR: plan not found" marker is the same in both languages', () => {
  assert.throws(() => lerPlano('/nao/existe/plan.json', 'pt'), /^Error: plan not found — não há plano em \/nao\/existe\/plan\.json\. Corre primeiro/);
  assert.throws(() => lerPlano('/nao/existe/plan.json', 'en'), /^Error: plan not found — no plan at \/nao\/existe\/plan\.json\. Run the planning step first/);
  const r = spawnSync(process.execPath, [join(AQUI, 'next-wave.mjs'), '--plan', '/nao/existe/plan.json'], { encoding: 'utf8', env: { ...process.env, WORKSHOP_LANG: 'en' } });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /^ERROR: plan not found — /);
});

test('numeros: virgula em portugues, ponto em ingles', () => {
  assert.equal(usd(1.5, 'pt'), 'US$ 1,50');
  assert.equal(usd(1.5, 'en'), 'US$ 1.50');
  assert.equal(usd(0.0123, 'en'), 'US$ 0.0123');
  assert.equal(usd(null, 'en'), '—');
  const f = { total: 3, contagem: { verde: 1, em_curso: 1, vermelho: 1, falhou: 0, por_fazer: 0 }, custo: { total: 2.5 } };
  assert.equal(linhaResumo(f, 'pt'), '1/3 verdes · 1 a trabalhar · 1 vermelhos · 0 por fazer · custo US$ 2,50');
  assert.equal(linhaResumo(f, 'en'), '1/3 green · 1 working · 1 red · 0 to do · cost US$ 2.50');
});

test('relatorio: titulos em portugues e em ingles; chaves da memoria iguais', async () => {
  const p = projeto([{ id: 'a', teste: OK }]);
  await proximaOnda({ projeto: p.dir, plano: p.plano });
  await proximaOnda({ projeto: p.dir, plano: p.plano });
  const pt = relatorio(p.dir, p.plano, 'pt');
  for (const h of ['## Por modelo', '## Por onda', '## Por agente']) assert.ok(pt.md.split('\n').includes(h), h);
  assert.match(pt.md, /^# Relatório do swarm — t \(modo teste\)$/m);
  assert.match(readFileSync(join(p.dir, '.workshop', 'memory-summary.md'), 'utf8'), /^# Resumo para a memória$/m);
  const en = relatorio(p.dir, p.plano, 'en');
  for (const h of ['## By model', '## By wave', '## By agent']) assert.ok(en.md.split('\n').includes(h), h);
  assert.match(en.md, /^# Swarm report — t \(mode test\)$/m);
  assert.match(en.md, /^- \*\*Total cost:\*\* US\$ [0-9.]+ \(main session /m);
  assert.equal(readFileSync(join(p.dir, '.workshop', 'report.md'), 'utf8'), en.md);
  const mem = readFileSync(join(p.dir, '.workshop', 'memory-summary.md'), 'utf8');
  assert.match(mem, /^# Summary for memory$/m);
  assert.match(mem, /^project: t$/m);
  assert.match(mem, /^task: t-test$/m);
  assert.match(mem, /^cost_usd: [0-9.]+$/m);
  assert.ok(!existsSync(join(p.dir, '.workshop', 'relatorio.md')) && !existsSync(join(p.dir, '.workshop', 'memoria-resumo.md')));
});

test('gate: veredito e tabela em portugues e em ingles (marcadores iguais)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ws-gate-'));
  const en = gate(dir, { l: 'en' });
  assert.deepEqual(en.checks.map((c) => c.nome), ['Tests', 'Secrets', 'Dangerous code', 'Dependencies', 'Review (Opus)']);
  const mdEn = gateMd(en, 'en');
  assert.match(mdEn, /^\| check \| status \| detail \|$/m);
  assert.match(mdEn, /^GATE: APPROVED — ready for production \(check the ⚠️, if any\)\.$/m);
  assert.match(gateMd({ checks: [], bloqueado: true }, 'en'), /^GATE: REJECTED — fix the ❌ items before moving on\.$/m);
  const pt = gate(dir, { l: 'pt' });
  assert.equal(pt.checks[0].nome, 'Testes');
  assert.match(gateMd(pt, 'pt'), /^GATE: APPROVED — pronto para produção \(revê os ⚠️, se houver\)\.$/m);
  assert.match(gateMd({ checks: [], bloqueado: true }, 'pt'), /^GATE: REJECTED — corrige os pontos ❌ antes de avançar\.$/m);
});

test('validate-plan: messages, instructions and PLAN.md in English', () => {
  const mau = validar({ tarefas: [{ id: 'a', agente: 'gpt', instrucoes: 'x'.repeat(30) }] }, { l: 'en' });
  assert.ok(mau.erros.some((e) => /unknown agent gpt/.test(e)));
  const r = validar({ projeto: 'p', justificacao: 'two tasks', tarefas: [{ id: 'a', agente: 'ws-worker', ficheiros: ['a.js'], teste: ['npm', 'test'], instrucoes: 'Do thing A carefully.' }] }, { teste_global: ['npm', 'test'], l: 'en' });
  assert.deepEqual(r.erros, []);
  assert.match(r.plano.tasks[0].instructions, /Check: npm test\nReply with a single line: "OK a" or "FAILED a: <reason>"\.$/);
  assert.equal(r.plano.tasks[1].title, 'Integration and full suite');
  assert.match(r.plano.tasks[1].instructions, /\.workshop\/integration\.md[\s\S]*"OK integration" or "FAILED integration: <reason>"/);
  assert.match(r.plano.tasks[2].instructions, /\.workshop\/review-summary\.md[\s\S]*\.workshop\/verdict\.json[\s\S]*"OK review: <verdict>"/);
  const md = planoMd(r.plano, r.avisos, estimar(r.plano, { l: 'en' }), 'en');
  assert.match(md, /^# Plan — p$/m);
  assert.ok(md.split('\n').includes('## Why this number of agents'));
  assert.match(md, /^\| \*\*estimated total\*\* \| \| \| \| \*\*US\$ [0-9]+\.[0-9]+\*\* \|$/m);
  assert.match(md, /^Target: US\$ 5\.00 · cap: US\$ 10\.00\./m);
  const pt = validar({ projeto: 'p', tarefas: [{ id: 'a', agente: 'ws-worker', ficheiros: ['a.js'], teste: ['npm', 'test'], instrucoes: 'Faz a coisa A com cuidado.' }] }, { l: 'pt' });
  const mdPt = planoMd(pt.plano, pt.avisos, estimar(pt.plano, { l: 'pt' }), 'pt');
  assert.match(mdPt, /^# Plano — p$/m);
  assert.ok(mdPt.split('\n').includes('## Porquê este número de agentes'));
  assert.match(tabelaEstimativa(estimar(pt.plano, { l: 'pt' }), 'pt'), /^\| sessão principal \| .* \| US\$ [0-9]+,[0-9]+ \|$/m);
});

// ---------- English names (the participant sees them in both languages) ----------

test('validate-plan: English proposal keys; plan.json with English keys that readPlan understands', async () => {
  const r = validar({
    project: 'lib', task_id: 'EX-1', justification: 'one task', risks: ['x'], max_parallel: 2,
    tasks: [
      { id: 'a', title: 'Do A', agent: 'ws-worker', depends_on: [], files: ['a.js'], test: OK, instructions: 'Do thing A carefully.' },
      { id: 'b', title: 'Do B', agent: 'ws-implementer', depends_on: ['a'], files: ['b.js'], test: OK, instructions: 'Do thing B carefully.', jira: 'EX-2' },
    ],
  }, { global_test: OK, l: 'en' });
  assert.deepEqual(r.erros, []);
  const plan = r.plano;
  assert.equal(plan.mode, 'production');
  assert.equal(plan.config.max_parallel, 2);
  assert.equal(plan.adjustments.justification, 'one task');
  assert.deepEqual(plan.tasks.map((t) => [t.id, t.wave]), [['a', 1], ['b', 2], ['integration', 3], ['review', 4]]);
  assert.equal(plan.tasks[1].jira, 'EX-2');
  const keys = JSON.stringify(plan);
  for (const pt of ['tarefas', 'depende', 'ficheiros', 'instrucoes', 'grupo_tipo', 'onda', 'agente', 'modo', 'projeto', 'veredito', 'integracao', 'revisao', 'FALHOU']) assert.ok(!keys.includes(`"${pt}"`) && !keys.includes(pt + '"'), pt);
  // Runs end to end through next-wave with the English plan.
  const dir = mkdtempSync(join(tmpdir(), 'ws-en-'));
  mkdirSync(join(dir, '.workshop'), { recursive: true });
  const fp = join(dir, '.workshop', 'plan.json');
  writeFileSync(fp, JSON.stringify(plan));
  const n = lerPlano(fp, 'en');
  assert.equal(n.modo, 'producao');
  assert.deepEqual(n.tarefas[3].teste, { ficheiro_json: '.workshop/verdict.json', campo: 'verdict' });
  const w = await proximaOnda({ projeto: dir, plano: fp, l: 'en' });
  assert.deepEqual(w.lote.map((t) => t.id), ['a']);
  assert.ok(existsSync(join(dir, '.workshop', 'orchestrator.json')));
  assert.equal(JSON.parse(readFileSync(join(dir, '.workshop', 'orchestrator.json'), 'utf8')).plan, fp);
  const md = planoMd(plan, r.avisos, estimar(plan, { l: 'en' }), 'en');
  assert.match(md, /^# Plan — lib \(EX-1\)$/m);
  assert.match(md, /^\| review \| 4 \| ws-reviewer \(Opus\) \| \.workshop\/verdict\.json \| verdict \|$/m);
});

test('readPlan: the Arena plan in either schema gives the same internal plan', () => {
  const pt = { v: 1, projeto: 'arena', modo: 'participante', config: { max_paralelo: 8, max_tentativas: 3, escalar_para: 'implementer' }, agentes: { worker: { modelo: 'claude-haiku-5-5' } }, apoio_estimativa: ['planner', 'memoria-extrator'],
    tarefas: [{ id: 'lib-hash', grupo_tipo: 'lib', onda: 1, agente: 'worker', depende: [] }, { id: 'pw-01', grupo_tipo: 'cartao', onda: 1, agente: 'worker', depende: ['lib-hash'] }, { id: 'integration', grupo_tipo: 'integracao', onda: 3, agente: 'integrator', depende: ['*cartoes'] }] };
  const en = { v: 1, project: 'arena', mode: 'participant', config: { max_parallel: 8, max_attempts: 3, escalate_to: 'implementer' }, agents: { worker: { model: 'claude-haiku-5-5' } }, support_estimate: ['planner', 'memory-extractor'],
    tasks: [{ id: 'lib-hash', group_type: 'lib', wave: 1, agent: 'worker', depends_on: [] }, { id: 'pw-01', group_type: 'card', wave: 1, agent: 'worker', depends_on: ['lib-hash'] }, { id: 'integration', group_type: 'integration', wave: 3, agent: 'integrator', depends_on: ['*cards'] }] };
  const dir = mkdtempSync(join(tmpdir(), 'ws-plan-'));
  writeFileSync(join(dir, 'pt.json'), JSON.stringify(pt));
  writeFileSync(join(dir, 'en.json'), JSON.stringify(en));
  const a = lerPlano(join(dir, 'pt.json'), 'en');
  const b = lerPlano(join(dir, 'en.json'), 'en');
  assert.deepEqual(b.tarefas, a.tarefas);
  assert.equal(b.modo, 'participante');
  assert.deepEqual(b.tarefas[2].depende, ['pw-01', 'lib-hash']);
  assert.equal(b.config.max_paralelo, 8);
  assert.deepEqual(normalizarPlano(normalizarPlano(en)), normalizarPlano(en), 'idempotent');
  // The estimate takes the in-memory plan in either schema, with the renamed profile.
  assert.equal(estimar(en, { l: 'en' }).total, estimar(pt, { l: 'en' }).total);
  assert.ok(estimar(en, { l: 'en' }).linhas.some((x) => x.tipo === 'memory-extractor' && x.custo > 0));
});

test('gate and grade: verdict.json with English keys, and the older veredito.json', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'ws-verdict-'));
  mkdirSync(join(dir, '.workshop'), { recursive: true });
  writeFileSync(join(dir, '.workshop', 'verdict.json'), JSON.stringify({ verdict: 'approved_with_reservations', summary: 'ok.', issues: [{ severity: 'medium', file: 'a.js', description: 'x', fix: 'y' }] }));
  let g = gate(dir, { l: 'en' });
  let rev = g.checks.find((c) => c.nome === 'Review (Opus)');
  assert.equal(rev.ok, true);
  assert.match(rev.detalhe, /^approved_with_reservations · 1 issue \(0 high\) · ok\.$/);
  writeFileSync(join(dir, '.workshop', 'verdict.json'), JSON.stringify({ verdict: 'rejected', summary: 'no.', issues: [{ severity: 'high', file: 'a.js' }] }));
  g = gate(dir, { l: 'en' });
  assert.equal(g.bloqueado, true);
  assert.match(gateMd(g, 'en'), /^GATE: REJECTED/m);
  // Older file and keys.
  const old = mkdtempSync(join(tmpdir(), 'ws-veredito-'));
  mkdirSync(join(old, '.workshop'), { recursive: true });
  writeFileSync(join(old, '.workshop', 'veredito.json'), JSON.stringify({ veredito: 'reprovado', resumo: 'nao', problemas: [{ gravidade: 'alta' }] }));
  assert.equal(gate(old, { l: 'pt' }).bloqueado, true);
  // grade: the review test names veredito.json/veredito or verdict.json/verdict; either file is accepted.
  const plano = { config: { max_tentativas: 3 } };
  for (const teste of [{ ficheiro_json: '.workshop/veredito.json', campo: 'veredito' }, { ficheiro_json: '.workshop/verdict.json', campo: 'verdict' }]) {
    const st = await avaliar(dir, plano, { id: 'review', teste }, { l: 'en' });
    assert.equal(st.estado, 'verde', JSON.stringify(teste));
    assert.equal(st.teste.valor, 'rejected');
    assert.equal(st.teste.ficheiro, '.workshop/verdict.json');
  }
});

test('the command-line options have English names, and the older ones still work', () => {
  assert.equal(opt(['--project', 'a'], '--project'), 'a');
  assert.equal(opt(['--projeto', 'a'], '--project'), 'a');
  assert.equal(opt(['--plano', 'p.json'], '--plan'), 'p.json');
  assert.deepEqual(opts(['--ignore', 'cards/', '--ignorar', 'x/'], '--ignore'), ['cards/', 'x/']);
  assert.equal(flag(['--todos'], '--all'), true);
  assert.equal(flag(['--summary'], '--summary'), true);
  assert.equal(flag(['--uma-vez'], '--once'), true);
  // grade --summary and --resumo give the same table; ids are not taken for options.
  const dir = mkdtempSync(join(tmpdir(), 'ws-args-'));
  writeFileSync(join(dir, 'plan.json'), JSON.stringify({ v: 1, project: 't', mode: 'test', config: {}, tasks: [{ id: 'a', agent: 'worker', depends_on: [], instructions: 'x' }] }));
  const run = (...a) => spawnSync(process.execPath, [join(AQUI, 'grade.mjs'), ...a], { encoding: 'utf8', env: { ...process.env, WORKSHOP_LANG: 'en' } });
  const en = run('--project', dir, '--summary');
  const pt = run('--projeto', dir, '--resumo');
  assert.equal(en.status, 0, en.stderr);
  assert.equal(en.stdout, pt.stdout);
  assert.match(en.stdout, /^agent +model +task +status +time +cost$/m);
  assert.match(run('--project', dir).stderr, /--all or --summary/);
});

test('init-workshop, explore and dashboard: English output keys and options', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ws-init-'));
  const git = (...a) => spawnSync('git', a, { cwd: dir, encoding: 'utf8' });
  git('init', '-q', '-b', 'main');
  git('config', 'user.email', 't@t.invalid');
  git('config', 'user.name', 't');
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ scripts: { test: 'node --test' } }));
  git('add', '-A');
  git('commit', '-q', '-m', 'x');
  const env = { ...process.env, WORKSHOP_LANG: 'en' };
  const i = spawnSync(process.execPath, [join(AQUI, 'init-workshop.mjs'), '--project', dir], { encoding: 'utf8', env });
  assert.equal(i.status, 0, i.stderr);
  const j = JSON.parse(i.stdout);
  assert.deepEqual(Object.keys(j), ['project', 'root', 'base', 'branch']);
  assert.ok(JSON.parse(readFileSync(join(dir, '.workshop', 'base.json'), 'utf8')).created_at);
  const e = spawnSync(process.execPath, [join(AQUI, 'explore.mjs'), '--project', dir, '--json'], { encoding: 'utf8', env });
  const ej = JSON.parse(e.stdout);
  assert.deepEqual(ej.likely_tests, [['npm', 'test']]);
  assert.equal(ej.total_files, 1);
  const em = spawnSync(process.execPath, [join(AQUI, 'explore.mjs'), '--projeto', dir], { encoding: 'utf8', env });
  assert.match(em.stdout, /^- Likely test commands: `npm test`$/m);
  writeFileSync(join(dir, 'plan.json'), JSON.stringify({ v: 1, project: 'p', mode: 'participant', config: {}, tasks: [{ id: 'a', agent: 'worker', depends_on: [], instructions: 'x' }] }));
  const d = spawnSync(process.execPath, [join(AQUI, 'dashboard.mjs'), '--project', dir, '--once'], { encoding: 'utf8', env });
  assert.equal(d.status, 0, d.stderr);
  assert.match(d.stdout, /^Swarm p · mode participant · /m);
});

// ---------- chaos round 2 (R4-arena): corrupt verdicts, hostile tests, concurrent runs, broken state ----------

test('chaos R4: a verdict that cannot be read, or says anything but an approval, never passes the gate', async () => {
  const { utimesSync } = await import('node:fs');
  const casos = {
    fenced: '```json\n{"verdict":"rejected","issues":[{"severity":"high"}]}\n```\n',
    truncated: '{"verdict":"approved","summary":"cut',
    upper: '{"verdict":"REJECTED","issues":[{"severity":"HIGH"}]}',
    unknown: '{"verdict":"changes_requested","issues":[{"severity":"critical"}]}',
    null: 'null',
    empty: '',
    array: '[]',
  };
  for (const [nome, txt] of Object.entries(casos)) {
    const dir = mkdtempSync(join(tmpdir(), 'ws-verdict-chaos-'));
    mkdirSync(join(dir, '.workshop'), { recursive: true });
    writeFileSync(join(dir, '.workshop', 'verdict.json'), txt);
    let g;
    assert.doesNotThrow(() => (g = gate(dir, { l: 'en' })), nome);
    assert.equal(g.bloqueado, true, nome);
    assert.match(gateMd(g, 'en'), /^GATE: REJECTED/m, nome);
    const rev = g.checks.find((c) => c.nome === 'Review (Opus)');
    if (['truncated', 'null', 'empty', 'array'].includes(nome)) assert.match(rev.detalhe, /unreadable or invalid verdict \(\.workshop\/verdict\.json\)/, nome);
  }
  // Both files: the newer one wins, and its name is shown.
  const dir = mkdtempSync(join(tmpdir(), 'ws-verdict-both-'));
  mkdirSync(join(dir, '.workshop'), { recursive: true });
  writeFileSync(join(dir, '.workshop', 'verdict.json'), '{"verdict":"approved"}');
  utimesSync(join(dir, '.workshop', 'verdict.json'), new Date(Date.now() - 60000), new Date(Date.now() - 60000));
  writeFileSync(join(dir, '.workshop', 'veredito.json'), '{"veredito":"reprovado"}');
  const g = gate(dir, { l: 'en' });
  assert.equal(g.bloqueado, true);
  assert.match(g.checks.find((c) => c.nome === 'Review (Opus)').detalhe, /\(\.workshop\/veredito\.json\)$/);
  // A well-formed approval (fenced, upper-case, with spaces) still passes.
  writeFileSync(join(dir, '.workshop', 'veredito.json'), '```json\n{"veredito":" Approved ","problemas":[{"gravidade":"LOW"}]}\n```');
  assert.equal(gate(dir, { l: 'en' }).bloqueado, false);
});

test('chaos R4: grade counts a card test that ran none of its own tests as red, and kills a test that never ends', async () => {
  const { semTestesProprios, resumirSaida } = await import('../grade.mjs');
  const t = { id: 'pw-03', grupo_tipo: 'cartao', teste: ['node', '--test', 'cards/pw-03/card.test.js'] };
  const spec = '✔ cards/pw-03/card.test.js (31.4ms)\nℹ tests 1\nℹ pass 1\nℹ fail 0\n';
  const tap = 'TAP version 13\n# Subtest: cards/pw-03/card.test.js\nok 1 - cards/pw-03/card.test.js\n1..1\n# tests 1\n# pass 1\n# fail 0\n';
  const trocado = '✔ fine (0.1ms)\nℹ pass 1\nℹ fail 0\n';
  const bom = 'ok 1 - pw-03: card.js exists and loads\nok 2 - pw-03: follows the contract\n# pass 2\n# fail 0\n';
  for (const out of [spec, tap, trocado]) assert.equal(semTestesProprios(t, out, resumirSaida(out)), 'cards/pw-03/card.test.js', out);
  assert.equal(semTestesProprios(t, bom, resumirSaida(bom)), null);
  assert.equal(semTestesProprios({ ...t, teste: ['node', '-e', 'process.exit(0)'] }, '', resumirSaida('')), null, 'only node --test');
  // For real: an emptied test file, and a test that loops forever (its child process is killed too).
  const p = projeto([
    { id: 'vazio', teste: ['node', '--test', 'vazio.test.js'] },
    { id: 'ciclo', teste: ['node', '--test', 'ciclo.test.js'], timeout_s: 3 },
  ]);
  writeFileSync(join(p.dir, 'vazio.test.js'), '');
  writeFileSync(join(p.dir, 'ciclo.test.js'), "import test from 'node:test';\ntest('ciclo: x', () => { for (;;) {} });\n");
  const plano = lerPlano(p.plano);
  const inicio = Date.now();
  const [a, b] = await Promise.all(plano.tarefas.map((x) => avaliar(p.dir, plano, x, { l: 'en' })));
  assert.equal(a.estado, 'vermelho');
  assert.match(a.teste.excerto, /^vazio\.test\.js ran none of the task's tests/);
  assert.equal(b.estado, 'vermelho');
  assert.equal(b.teste.esgotado, true);
  assert.match(b.teste.excerto, /^\[timed out: 3s\]/);
  assert.ok(Date.now() - inicio < 20000);
  if (process.platform !== 'win32') {
    await new Promise((r) => setTimeout(r, 300));
    const ps = spawnSync('ps', ['-ax', '-o', 'command='], { encoding: 'utf8' }).stdout;
    assert.ok(!ps.split('\n').some((l) => l.includes(p.dir) || (l.includes('ciclo.test.js') && l.includes('--test'))), 'no test process left behind');
  }
});

test('chaos R4: a grade that finishes after next-wave relaunched the task keeps the newer attempt', async () => {
  const p = projeto([{ id: 'lento', teste: ['node', '-e', 'setTimeout(() => process.exit(1), 1500)'] }]);
  await proximaOnda({ projeto: p.dir, plano: p.plano });
  const plano = lerPlano(p.plano);
  const c = caminhos(p.dir);
  const avaliacao = avaliar(p.dir, plano, plano.tarefas[0]);
  await new Promise((r) => setTimeout(r, 300));
  const { gravarEstado, lerEstado } = await import('../lib/state.mjs');
  gravarEstado(c, { ...lerEstado(c, 'lento'), tentativa: 2, agente: 'worker-02' });
  const st = await avaliacao;
  assert.equal(st.estado, 'em_curso');
  assert.equal(estado(p.dir, 'lento').agente, 'worker-02');
});

test('chaos R4: two next-wave at once: the second stops with a clear message; a stale lock is replaced', async () => {
  const p = projeto([{ id: 'a', teste: ['node', '-e', 'setTimeout(() => process.exit(0), 800)'] }]);
  await proximaOnda({ projeto: p.dir, plano: p.plano }); // a is now em_curso: the next call grades it (slowly)
  const primeiro = proximaOnda({ projeto: p.dir, plano: p.plano, l: 'en' });
  await new Promise((r) => setTimeout(r, 200));
  await assert.rejects(proximaOnda({ projeto: p.dir, plano: p.plano, l: 'en' }), /^Error: another next-wave is already running in this project \(pid \d+\)/);
  await primeiro;
  assert.ok(!existsSync(join(p.dir, '.workshop', 'next-wave.lock')));
  writeFileSync(join(p.dir, '.workshop', 'next-wave.lock'), JSON.stringify({ pid: 2 ** 22 + 12345, started: '2026-01-01T00:00:00Z' }));
  const r = await proximaOnda({ projeto: p.dir, plano: p.plano, l: 'en' });
  assert.equal(r.pendentes, 0);
  const ev = readFileSync(join(p.dir, '.workshop', 'events.jsonl'), 'utf8');
  assert.equal(ev.split('\n').filter((l) => l.includes('"tipo":"inicio"')).length, 1);
});

test('chaos R4: broken or stale state files give clear messages, never a crash or a phantom green', async () => {
  const { lerEstado, lerJsonl, fotografia, evento } = await import('../lib/state.mjs');
  // A plan with a trailing comma is invalid (with the position), not "not found".
  const p = projeto([{ id: 'a', teste: OK }, { id: 'b', teste: OK }]);
  const bom = readFileSync(p.plano, 'utf8');
  writeFileSync(p.plano, bom.replace(/}$/, ',}'));
  assert.throws(() => lerPlano(p.plano, 'en'), /^Error: Invalid plan: .*plan\.json \(.*position \d+.*\)\. Fix the file or plan again/);
  writeFileSync(p.plano, bom);
  await proximaOnda({ projeto: p.dir, plano: p.plano });
  const c = caminhos(p.dir);
  // 0 bytes, `null`, an unknown state: "to do" + corrupto, and next-wave stops naming the file.
  for (const txt of ['', 'null', '{"estado":"???"}']) {
    writeFileSync(join(c.status, 'a.json'), txt);
    assert.equal(lerEstado(c, 'a').estado, 'por_fazer');
    assert.ok(lerEstado(c, 'a').corrupto);
    assert.doesNotThrow(() => fotografia(c, lerPlano(p.plano)));
    await assert.rejects(proximaOnda({ projeto: p.dir, plano: p.plano, l: 'en' }), /unreadable state file\(s\): .*a\.json\. Delete it/);
  }
  writeFileSync(join(c.status, 'a.json'), JSON.stringify({ tarefa: 'a', estado: 'em_curso', tentativa: 1, agente: 'worker-01' }));
  // A `null` usage line and a cut events line.
  writeFileSync(c.usage, 'null\n42\n{"tipo":"principal","sessao":"s","custo_usd":0.5}\n');
  assert.equal(lerJsonl(c.usage).length, 1);
  assert.equal(fotografia(c, lerPlano(p.plano)).custo.total, 0.5);
  writeFileSync(c.eventos, '{"ts":"x","tipo":"est');
  evento(c, { tipo: 'teste' });
  assert.deepEqual(lerJsonl(c.eventos).map((e) => e.tipo), ['teste']);
  // A new plan over an old finished run starts a new run (the old states go to .workshop/history/).
  for (const id of ['a', 'b']) writeFileSync(join(c.status, `${id}.json`), JSON.stringify({ tarefa: id, estado: 'verde', tentativa: 1 }));
  writeFileSync(c.run, JSON.stringify({ inicio: '2026-01-01T10:00:00.000Z', fim: '2026-01-01T11:00:00.000Z', lote: 4, contador: { worker: 9 } }));
  const novo = JSON.parse(bom);
  novo.criado_em = new Date().toISOString();
  writeFileSync(p.plano, JSON.stringify(novo));
  const r = await proximaOnda({ projeto: p.dir, plano: p.plano, l: 'en' });
  assert.deepEqual(r.lote.map((t) => t.id), ['a', 'b']);
  assert.match(r.chamadas[0].description, /^worker-01 /);
  assert.equal(r.run.fim, null);
  assert.ok(existsSync(join(p.dir, '.workshop', 'history')));
  // A plan with no tasks says so.
  const vazio = projeto([]);
  assert.match(textoOnda(await proximaOnda({ projeto: vazio.dir, plano: vazio.plano, l: 'en' }), 'en'), /^The plan has no tasks[\s\S]*STATE: DONE/m);
});
