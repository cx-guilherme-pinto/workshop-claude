// Testes do orquestrador deterministico (next-wave + grade + validate-plan).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { proximaOnda } from '../next-wave.mjs';
import { validar } from '../validate-plan.mjs';

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
