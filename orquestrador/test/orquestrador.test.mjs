// Testes do orquestrador deterministico (next-wave + grade + validate-plan).
// Lingua fixa para os testes existentes (os textos em portugues); os casos em ingles passam a lingua
// explicita ou mudam-na localmente. Nenhum modulo le a lingua ao ser importado.
process.env.WORKSHOP_LANG = 'pt';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { proximaOnda, textoOnda } from '../next-wave.mjs';
import { validar, planoMd } from '../validate-plan.mjs';
import { estimar, tabelaEstimativa } from '../estimate.mjs';
import { relatorio } from '../report.mjs';
import { gate, gateMd } from '../gate.mjs';
import { lerPlano } from '../lib/estado.mjs';
import { usd, linhaResumo } from '../lib/tabela.mjs';

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
  assert.match(r.chamadas[0].prompt, /^TAREFA: a\nAGENTE: worker-01\nTENTATIVA: 1/);
  r = await proximaOnda({ projeto: p.dir, plano: p.plano });
  assert.deepEqual(r.lote.map((t) => t.id), ['c']);
  r = await proximaOnda({ projeto: p.dir, plano: p.plano });
  assert.equal(r.lote.length, 0);
  assert.equal(r.pendentes, 0);
  assert.equal(estado(p.dir, 'c').estado, 'verde');
});

test('repete com o erro e escala para Sonnet na última tentativa', async () => {
  const p = projeto([{ id: 'x', teste: FALHA }]);
  await proximaOnda({ projeto: p.dir, plano: p.plano }); // tentativa 1
  let r = await proximaOnda({ projeto: p.dir, plano: p.plano }); // avalia 1 (vermelho) e lanca 2
  assert.equal(r.chamadas[0].subagent_type, 'worker');
  assert.match(r.chamadas[0].prompt, /TENTATIVA: 2[\s\S]*falhou de proposito/);
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
  assert.deepEqual(bom.plano.tarefas.map((t) => t.id), ['a', 'integracao', 'revisao']);
  assert.deepEqual(bom.plano.tarefas[1].depende, ['a']);
  assert.equal(bom.plano.tarefas[2].agente, 'ws-reviewer');
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
  assert.match(txt, /^ESTADO: LOTE 1 · onda 1 · 2 agente\(s\)$/m);
  assert.match(txt, /^<<<CHAMADAS$[\s\S]*^CHAMADAS>>>$/m);
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
    assert.match(txt, /^ESTADO: LOTE 1 · wave 1 · 2 agent\(s\)$/m);
    assert.match(txt, /^\| agent \| task \| type \|$/m);
    assert.match(txt, /^Launch these calls NOW/m);
    assert.match(r.chamadas[0].prompt, /^TAREFA: a\nAGENTE: worker-01\nTENTATIVA: 1/, 'marcadores do prompt nao mudam');
    r = await proximaOnda({ projeto: p.dir, plano: p.plano, l: 'en' });
    txt = textoOnda(r, 'en');
    assert.match(txt, /^## Previous batch result$/m);
    assert.match(txt, /^\| agent \| model \| task \| status \| time \| cost \|$/m);
    assert.match(txt, /\| a \| ✓ passed \|/);
    assert.match(r.chamadas[0].prompt, /TENTATIVA: 2[\s\S]*Attempt 1 failed\. Test excerpt:[\s\S]*Fix the cause and check again\.[\s\S]*This is the last attempt/);
    r = await proximaOnda({ projeto: p.dir, plano: p.plano, l: 'en' });
    txt = textoOnda(r, 'en');
    assert.match(txt, /^ESTADO: FIM · 1 green, 1 failed · duration .* · cost US\$ /m);
  });
});

test('plano em falta: o marcador "ERRO: Plano nao encontrado" fica igual nas duas linguas', () => {
  assert.throws(() => lerPlano('/nao/existe/plan.json', 'pt'), /^Error: Plano nao encontrado em \/nao\/existe\/plan\.json\. Corre primeiro/);
  assert.throws(() => lerPlano('/nao/existe/plan.json', 'en'), /^Error: Plano nao encontrado — no plan at \/nao\/existe\/plan\.json\. Run the planning step first/);
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
  assert.match(readFileSync(join(p.dir, '.workshop', 'memoria-resumo.md'), 'utf8'), /^# Resumo para a memória$/m);
  const en = relatorio(p.dir, p.plano, 'en');
  for (const h of ['## By model', '## By wave', '## By agent']) assert.ok(en.md.split('\n').includes(h), h);
  assert.match(en.md, /^# Swarm report — t \(mode teste\)$/m);
  assert.match(en.md, /^- \*\*Total cost:\*\* US\$ [0-9.]+ \(main session /m);
  assert.equal(readFileSync(join(p.dir, '.workshop', 'relatorio.md'), 'utf8'), en.md);
  const mem = readFileSync(join(p.dir, '.workshop', 'memoria-resumo.md'), 'utf8');
  assert.match(mem, /^# Summary for memory$/m);
  assert.match(mem, /^projeto: t$/m);
  assert.match(mem, /^custo_usd: [0-9.]+$/m);
});

test('gate: veredito e tabela em portugues e em ingles (marcadores iguais)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ws-gate-'));
  const en = gate(dir, { l: 'en' });
  assert.deepEqual(en.checks.map((c) => c.nome), ['Tests', 'Secrets', 'Dangerous code', 'Dependencies', 'Review (Opus)']);
  const mdEn = gateMd(en, 'en');
  assert.match(mdEn, /^\| check \| status \| detail \|$/m);
  assert.match(mdEn, /^GATE: APROVADO — ready for production \(check the ⚠️, if any\)\.$/m);
  assert.match(gateMd({ checks: [], bloqueado: true }, 'en'), /^GATE: REPROVADO — fix the ❌ items before moving on\.$/m);
  const pt = gate(dir, { l: 'pt' });
  assert.equal(pt.checks[0].nome, 'Testes');
  assert.match(gateMd(pt, 'pt'), /^GATE: APROVADO — pronto para produção \(revê os ⚠️, se houver\)\.$/m);
  assert.match(gateMd({ checks: [], bloqueado: true }, 'pt'), /^GATE: REPROVADO — corrige os pontos ❌ antes de avançar\.$/m);
});

test('validate-plan: mensagens, instrucoes e PLANO.md em ingles', () => {
  const mau = validar({ tarefas: [{ id: 'a', agente: 'gpt', instrucoes: 'x'.repeat(30) }] }, { l: 'en' });
  assert.ok(mau.erros.some((e) => /unknown agent gpt/.test(e)));
  const r = validar({ projeto: 'p', justificacao: 'two tasks', tarefas: [{ id: 'a', agente: 'ws-worker', ficheiros: ['a.js'], teste: ['npm', 'test'], instrucoes: 'Do thing A carefully.' }] }, { teste_global: ['npm', 'test'], l: 'en' });
  assert.deepEqual(r.erros, []);
  assert.match(r.plano.tarefas[0].instrucoes, /Check: npm test\nReply with a single line: "OK a" or "FALHOU a: <reason>"\.$/);
  assert.equal(r.plano.tarefas[1].titulo, 'Integration and full suite');
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
