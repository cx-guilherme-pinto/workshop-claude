// Tests of the benchmark helpers that run without Claude (benchmark/):
//   - person.mjs: the "person" that completes the spec.md of the cards broken on purpose (D-28), from the complete
//     spec of `gen.mjs --no-gaps`, so that the card's spec check passes and gen keeps the completed spec;
//   - collect.mjs: the results.csv with the old header is rewritten with the new columns; 429s in transcripts;
//   - report.mjs: the full-day rows, the P1/P2 split and the comparison with the target and the cap.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { montar } from '../../installer/assemble-demo.mjs';
import { mergeMissing, expectedBroken, failedForSpec, fix } from '../../benchmark/person.mjs';
import { COLUNAS, gravarCsv, lerCsv, contar429 } from '../../benchmark/collect.mjs';
import { gerar } from '../../benchmark/report.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const env = () => {
  const e = { ...process.env };
  delete e.WORKSHOP_LANG;
  delete e.NODE_TEST_CONTEXT;
  return e;
};

test('mergeMissing inserts only the missing lines, in place, and keeps the person\'s own lines', () => {
  const complete = ['# t', '', 'a', '', 'Field `answer`: `"b"`', '', 'end'].join('\n');
  const real = ['# t', '', 'a', 'my note', '', 'end'].join('\n');
  const { text, added } = mergeMissing(real, complete);
  assert.deepEqual(added, ['Field `answer`: `"b"`']);
  assert.ok(text.includes('my note'));
  assert.ok(text.indexOf('Field `answer`') > text.indexOf('a') && text.indexOf('Field `answer`') < text.indexOf('end'));
  assert.deepEqual(mergeMissing(complete, complete).added, []);
});

for (const l of ['pt', 'en']) {
  test(`person.mjs completes the 4 broken cards (${l}): the spec check passes and gen --check keeps them`, () => {
    const base = mkdtempSync(join(tmpdir(), `bench-person-${l}-`));
    try {
      const dest = join(base, 'arena');
      montar({ dest, node: process.execPath, git: false, probe: false, lingua: l });
      const ids = expectedBroken(dest);
      assert.equal(ids.length, 4);
      // The state the orchestrator writes when a card fails for a missing spec detail.
      mkdirSync(join(dest, '.workshop', 'status'), { recursive: true });
      for (const id of ids) writeFileSync(join(dest, '.workshop', 'status', `${id}.json`), JSON.stringify({ tarefa: id, estado: 'falhou', motivo: 'spec', tentativa: 1 }));
      writeFileSync(join(dest, '.workshop', 'status', 'pv-01.json'), JSON.stringify({ tarefa: 'pv-01', estado: 'falhou', tentativa: 3 }));
      assert.deepEqual(failedForSpec(dest), ids);
      for (const id of ids) {
        const before = spawnSync(process.execPath, ['--test', `cards/${id}/card.test.js`], { cwd: dest, encoding: 'utf8', env: env() });
        const added = fix(dest, id);
        assert.ok(added.length >= 1, `${id}: no line added`);
        assert.deepEqual(fix(dest, id), [], `${id}: a second fix must add nothing`);
        const after = spawnSync(process.execPath, ['--test', `cards/${id}/card.test.js`], { cwd: dest, encoding: 'utf8', env: env() });
        // Without card.js the card still fails; only the spec test changes from failing to passing.
        const failed = (out) => Number((/ℹ fail (\d+)/.exec(out) || [])[1] || 0);
        assert.equal(failed(after.stdout), failed(before.stdout) - 1, `${id}: the spec test still fails\n${after.stdout.slice(-800)}`);
      }
      const check = spawnSync(process.execPath, ['tools/gen.mjs', '--check'], { cwd: dest, encoding: 'utf8', env: env() });
      assert.equal(check.status, 0, check.stderr);
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });
}

test('gravarCsv rewrites an old results.csv with the new columns and keeps the old rows', () => {
  const dir = mkdtempSync(join(tmpdir(), 'bench-csv-'));
  try {
    const f = join(dir, 'results.csv');
    const velho = 'id,modo,isolado,duracao_s,custo_total,custo_haiku,custo_sonnet,custo_opus,agentes,verdes,falhadas,testes_pass,testes_fail,testes_ok,veredito,gate,claude_total_cost_usd,negacoes,erros';
    writeFileSync(f, `${velho}\nr1,participante,0,216,1.0478,0.0255,0.6946,0.3278,22,20,0,155,0,sim,aprovado,aprovado,2.3931,0,0\n`);
    gravarCsv(f, { ...Object.fromEntries(COLUNAS.map((k) => [k, ''])), id: 'r2', escopo: 'day', custo_total: '4.9', resultado: 'ok' });
    const { cab, rows } = lerCsv(f);
    assert.deepEqual(cab, COLUNAS);
    assert.equal(rows.length, 2);
    assert.equal(rows[0].custo_total, '1.0478');
    assert.equal(rows[0].escopo, '');
    assert.equal(rows[1].escopo, 'day');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('contar429 counts rate-limit errors in the isolated transcripts and in stderr', () => {
  const run = mkdtempSync(join(tmpdir(), 'bench-429-'));
  try {
    const d = join(run, 'config', 'projects', '-x-arena', 'sid', 'subagents');
    mkdirSync(d, { recursive: true });
    writeFileSync(join(d, 'agent-1.jsonl'), ['{"type":"system","subtype":"api_error","error":{"status":429}}', '{"type":"assistant"}', '{"isApiErrorMessage":true,"message":{"content":"API Error: 429 rate_limit_error"}}'].join('\n'));
    writeFileSync(join(run, 'p1-2-swarm.err'), 'ok\n');
    assert.equal(contar429(run), 2);
  } finally {
    rmSync(run, { recursive: true, force: true });
  }
});

test('report.mjs shows the full day, the P1/P2 split, the target and the cap, and the old rows apart', () => {
  const linha = (o) => ({ ...Object.fromEntries(COLUNAS.map((k) => [k, ''])), modo: 'participant', lingua: 'pt', versao: 'v1.0.0-rc.4', crypto: 'sonnet', resultado: 'ok', ...o });
  const rows = [
    { ...Object.fromEntries(COLUNAS.map((k) => [k, ''])), id: 'old', modo: 'participante', duracao_s: '216', custo_total: '1.05', custo_haiku: '0.02', custo_sonnet: '0.7', custo_opus: '0.33', agentes: '22', testes_ok: 'sim', erros: '0', claude_total_cost_usd: '2.4' },
    linha({ id: 'd1', escopo: 'day', custo_total: '4.9', p1_custo: '4.3', p2_custo: '0.6', duracao_s: '1300', p1_duracao_s: '1000', p2_duracao_s: '300', agentes: '125', p1_retry_spec: '4', p1_retry_verdes: '4', erros_429: '0', gate: 'approved', p2_gate: 'approved' }),
    linha({ id: 'd2', escopo: 'day', custo_total: '5.4', p1_custo: '4.7', p2_custo: '0.7', duracao_s: '1400', gate: 'approved', p2_gate: 'approved' }),
    linha({ id: 'd3', escopo: 'day', lingua: 'en', custo_total: '11', p1_custo: '10', p2_custo: '1', resultado: 'falhou: 1 permissoes negadas', negacoes: '1' }),
  ];
  const md = gerar(rows, { alvo: 5, teto: 10, agora: new Date('2026-10-20T10:00:00Z') });
  assert.match(md, /## Resumo/);
  assert.match(md, /Dia completo \(Projeto 1 \+ Projeto 2\) \| pt \| participante \| v1\.0\.0-rc\.4 \| sonnet \| 2 \| 2\/2 \| US\$ 5,15 \| US\$ 5,40 \| US\$ 4,50 · US\$ 0,65 \| média US\$ 5,15: \*\*acima do alvo\*\*/);
  assert.match(md, /máximo US\$ 11,00: \*\*ACIMA DO TETO\*\*/);
  assert.match(md, /\| custo do Projeto 2 \| US\$ 0,60 \| US\$ 0,65 \| US\$ 0,70 \|/);
  assert.match(md, /Critério de aceitação .*\*\*CUMPRIDO\*\* \(mas a média passa o alvo\)/);
  assert.match(md, /Critério de aceitação .*\*\*NÃO CUMPRIDO\*\*/);
  assert.match(md, /## Execuções anteriores \(só o Projeto 1/);
  assert.match(md, /\| old \| 3,6 min \| US\$ 1,05 \|/);
});

test('run-benchmark.sh --dry-run is documented and the old Project 2 script goes through it', () => {
  const sh = readFileSync(join(ROOT, 'benchmark', 'run-benchmark.sh'), 'utf8');
  assert.match(sh, /--dry-run\) DRY=1/);
  // The token only goes to the environment of claude, never to argv.
  assert.doesNotMatch(sh, /-p[^\n]*\$TOKEN/);
  assert.match(readFileSync(join(ROOT, 'benchmark', 'run-projeto2.sh'), 'utf8'), /run-benchmark\.sh" --scope p2/);
});
