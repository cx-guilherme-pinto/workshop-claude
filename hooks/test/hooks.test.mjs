// Testes do motor de medicao: precos, leitura de transcripts, totais e regras dos hooks.
// Lingua fixa para os testes existentes (os textos em portugues); os casos em ingles mudam-na
// localmente ou passam a lingua explicita. Nenhum modulo le a lingua ao ser importado.
process.env.WORKSHOP_LANG = 'pt';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { loadPricing, resolveModel, requestCost, tokensFromUsage, fmtUsd } from '../lib/cost.mjs';
import { summarize, parseMarkers } from '../lib/transcript.mjs';
import { totals } from '../lib/totals.mjs';
import { lingua, normalizar, textos, language, normalize, texts } from '../lib/language.mjs';
import { budgetMessage } from '../budget.mjs';

const KIT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const pricing = loadPricing(join(KIT, 'pricing.json'));

test('resolve IDs e aliases de modelos', () => {
  assert.equal(resolveModel('claude-haiku-5-5', pricing), 'claude-haiku-5-5');
  assert.equal(resolveModel('claude-sonnet-5-5-20261001', pricing), 'claude-sonnet-5-5');
  assert.equal(resolveModel('opus', pricing), 'claude-opus-5-5');
  assert.equal(resolveModel('claude-opus-5-5[1m]', pricing), 'claude-opus-5-5');
  assert.equal(resolveModel('gpt-9', pricing), null);
});

test('preços: Sonnet com leitura de cache a 0,05x e escrita de 1 h', () => {
  // Valores reais do spike 2 (sessao principal): coincide com o calculo manual.
  const t = { input: 20, output: 1604, cache_write_5m: 0, cache_write_1h: 13757, cache_read: 222503 };
  const c = requestCost(t, 'claude-sonnet-5-5', pricing).usd;
  assert.ok(Math.abs(c - 0.09336) < 0.0001, `custo ${c}`);
});

test('preços: Haiku acima de 100K tokens de prompt usa o escalão alto', () => {
  const curto = requestCost({ input: 50000, output: 1000, cache_write_5m: 0, cache_write_1h: 0, cache_read: 0 }, 'claude-haiku-5-5', pricing).usd;
  const longo = requestCost({ input: 150000, output: 1000, cache_write_5m: 0, cache_write_1h: 0, cache_read: 0 }, 'claude-haiku-5-5', pricing).usd;
  assert.ok(Math.abs(curto - (50000 * 0.1 + 1000 * 0.5) / 1e6) < 1e-9);
  assert.ok(Math.abs(longo - (150000 * 0.5 + 1000 * 2.5) / 1e6) < 1e-9);
});

test('modelo desconhecido devolve null, nunca 0', () => {
  assert.equal(requestCost({ input: 1, output: 1, cache_write_5m: 0, cache_write_1h: 0, cache_read: 0 }, 'modelo-x', pricing).usd, null);
});

test('tokensFromUsage separa cache 5m e 1h', () => {
  const t = tokensFromUsage({ input_tokens: 5, output_tokens: 7, cache_read_input_tokens: 100, cache_creation_input_tokens: 30, cache_creation: { ephemeral_5m_input_tokens: 10, ephemeral_1h_input_tokens: 20 } });
  assert.deepEqual(t, { input: 5, output: 7, cache_write_5m: 10, cache_write_1h: 20, cache_read: 100 });
});

test('transcript: deduplica por message.id ficando com o maior output, ignora sidechain na principal', () => {
  const d = mkdtempSync(join(tmpdir(), 'ws-tr-'));
  const f = join(d, 't.jsonl');
  const u = (out) => ({ input_tokens: 10, output_tokens: out, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 });
  const linhas = [
    { type: 'user', timestamp: '2026-10-16T10:00:00Z', message: { role: 'user', content: 'TASK: pw-01\nAGENT: worker-02\nATTEMPT: 2\n\nfaz' } },
    { type: 'assistant', timestamp: '2026-10-16T10:00:05Z', message: { id: 'm1', model: 'claude-haiku-5-5', usage: u(3) } },
    { type: 'assistant', timestamp: '2026-10-16T10:00:06Z', message: { id: 'm1', model: 'claude-haiku-5-5', usage: u(300) } },
    { type: 'assistant', timestamp: '2026-10-16T10:00:09Z', message: { id: 'm2', model: 'claude-haiku-5-5', usage: u(100) } },
    { type: 'assistant', isSidechain: true, timestamp: '2026-10-16T10:00:10Z', message: { id: 'm3', model: 'claude-opus-5-5', usage: u(1000) } },
  ];
  writeFileSync(f, linhas.map((l) => JSON.stringify(l)).join('\n') + '\n{linha partida');
  const s = summarize(f, pricing);
  assert.equal(s.requests, 3);
  const p = summarize(f, pricing, { onlyMainThread: true });
  assert.equal(p.requests, 2);
  assert.equal(p.tokens.output, 400);
  assert.deepEqual(parseMarkers(s.firstUser), { tarefa: 'pw-01', agente: 'worker-02', tentativa: 2 });
});

test('totais: última fotografia por sessão e um registo por agent_id', () => {
  const t = totals([
    { tipo: 'principal', sessao: 'a', custo_usd: 0.1, modelo: 'claude-sonnet-5-5' },
    { tipo: 'principal', sessao: 'a', custo_usd: 0.3, modelo: 'claude-sonnet-5-5' },
    { tipo: 'subagente', agent_id: 'x', custo_usd: 0.01, modelo: 'claude-haiku-5-5' },
    { tipo: 'subagente', agent_id: 'x', custo_usd: 0.01, modelo: 'claude-haiku-5-5' },
    { tipo: 'subagente', agent_id: 'y', custo_usd: 0.02, modelo: 'claude-haiku-5-5' },
  ]);
  assert.ok(Math.abs(t.total - 0.33) < 1e-9);
  assert.equal(t.nSubagentes, 2);
});

test('hook de utilizador não atua num projeto com hooks próprios (sem contar a dobrar)', () => {
  const proj = mkdtempSync(join(tmpdir(), 'ws-proj-'));
  mkdirSync(join(proj, '.workshop'));
  mkdirSync(join(proj, 'tools', 'workshop', 'hooks'), { recursive: true });
  const tr = join(proj, 'tr.jsonl');
  writeFileSync(tr, JSON.stringify({ type: 'assistant', message: { id: 'm', model: 'claude-sonnet-5-5', usage: { input_tokens: 1, output_tokens: 1 } } }) + '\n');
  const input = JSON.stringify({ session_id: 's', transcript_path: tr, cwd: proj });
  // Copia "de utilizador" (fora do projeto): nao escreve nada.
  spawnSync(process.execPath, [join(KIT, 'hooks', 'stop.mjs')], { input, env: { ...process.env, CLAUDE_PROJECT_DIR: proj } });
  let usage = '';
  try {
    usage = readFileSync(join(proj, '.workshop', 'usage.jsonl'), 'utf8');
  } catch {
    /* nao existe: bom */
  }
  assert.equal(usage, '');
  // Copia do proprio projeto: escreve.
  cpSync(join(KIT, 'hooks'), join(proj, 'tools', 'workshop', 'hooks'), { recursive: true });
  cpSync(join(KIT, 'pricing.json'), join(proj, 'tools', 'workshop', 'pricing.json'));
  const r = spawnSync(process.execPath, [join(proj, 'tools', 'workshop', 'hooks', 'stop.mjs')], { input, env: { ...process.env, CLAUDE_PROJECT_DIR: proj } });
  assert.equal(r.status, 0);
  assert.match(readFileSync(join(proj, '.workshop', 'usage.jsonl'), 'utf8'), /"tipo":"principal"/);
});

test('hooks saem sempre com 0, mesmo com stdin inválido', () => {
  for (const h of ['stop.mjs', 'subagent-stop.mjs']) {
    const r = spawnSync(process.execPath, [join(KIT, 'hooks', h)], { input: 'isto não é json' });
    assert.equal(r.status, 0, h);
  }
});

// ---------- lingua do kit (pt/en) ----------

test('lingua: normalizar tags de locale', () => {
  assert.equal(normalizar('pt-PT'), 'pt');
  assert.equal(normalizar('pt_BR.UTF-8'), 'pt');
  assert.equal(normalizar('pt'), 'pt');
  assert.equal(normalizar('en-US'), 'en');
  assert.equal(normalizar('he-IL'), 'en');
  assert.equal(normalizar('hi_IN'), 'en');
  assert.equal(normalizar('C'), null);
  assert.equal(normalizar('C.UTF-8'), null);
  assert.equal(normalizar('POSIX'), null);
  assert.equal(normalizar(''), null);
  assert.equal(normalizar(undefined), null);
  // O que nao e uma etiqueta de lingua nao conta como ingles (chaos G7-language).
  for (const x of ['UTF-8', 'brasil', 'portuguese', 'Português', 'pt-*', 'en,pt', 'pt-Applications']) assert.equal(normalizar(x), null, x);
});

test('lingua: um WORKSHOP_LANG desconhecido (br, brasil, pt-*) nao ganha ao language.json', () => {
  const comJson = mkdtempSync(join(tmpdir(), 'ws-lingua-'));
  writeFileSync(join(comJson, 'language.json'), JSON.stringify({ language: 'pt' }));
  for (const w of ['br', 'brasil', 'klingon', 'pt-*', 'es-ES', 'UTF-8']) {
    assert.equal(lingua({ env: { WORKSHOP_LANG: w, LANG: 'en_US.UTF-8' }, raiz: comJson }), 'pt', w);
  }
  assert.equal(lingua({ env: { WORKSHOP_LANG: 'he', LANG: 'pt_PT.UTF-8' }, raiz: comJson }), 'en', 'he e uma lingua do workshop: kit en');
  assert.equal(lingua({ env: { WORKSHOP_LANG: 'pt_BR.UTF-8' }, raiz: comJson }), 'pt');
});

test('lingua: WORKSHOP_LANG > language.json > LANG', () => {
  const comJson = mkdtempSync(join(tmpdir(), 'ws-lingua-'));
  writeFileSync(join(comJson, 'language.json'), JSON.stringify({ language: 'pt' }));
  const semJson = mkdtempSync(join(tmpdir(), 'ws-lingua-'));
  // WORKSHOP_LANG ganha a tudo.
  assert.equal(lingua({ env: { WORKSHOP_LANG: 'en', LANG: 'pt_PT.UTF-8' }, raiz: comJson }), 'en');
  assert.equal(lingua({ env: { WORKSHOP_LANG: 'pt-PT', LANG: 'en_US.UTF-8' }, raiz: semJson }), 'pt');
  // Sem WORKSHOP_LANG: o lingua.json da instalacao ganha ao locale.
  assert.equal(lingua({ env: { LANG: 'en_US.UTF-8' }, raiz: comJson }), 'pt');
  writeFileSync(join(comJson, 'language.json'), JSON.stringify({ language: 'en' }));
  assert.equal(lingua({ env: { LANG: 'pt_PT.UTF-8' }, raiz: comJson }), 'en');
  // An older install has lingua.json ({"lingua": ...}): still read.
  const antigo = mkdtempSync(join(tmpdir(), 'ws-lingua-'));
  writeFileSync(join(antigo, 'lingua.json'), JSON.stringify({ lingua: 'pt' }));
  assert.equal(lingua({ env: { LANG: 'en_US.UTF-8' }, root: antigo }), 'pt');
  assert.equal(language, lingua, 'English and older names are the same functions');
  assert.equal(normalize, normalizar);
  assert.equal(texts, textos);
  // Sem lingua.json: LC_ALL, depois LC_MESSAGES, depois LANG; 'C' nao conta.
  assert.equal(lingua({ env: { LANG: 'pt_PT.UTF-8' }, raiz: semJson }), 'pt');
  assert.equal(lingua({ env: { LC_ALL: 'he_IL.UTF-8', LANG: 'pt_PT.UTF-8' }, raiz: semJson }), 'en');
  assert.equal(lingua({ env: { LC_ALL: 'C', LANG: 'pt_PT.UTF-8' }, raiz: semJson }), 'pt');
  assert.equal(lingua({ env: { WORKSHOP_LANG: '', LANG: 'hi_IN' }, raiz: semJson }), 'en');
  // Sem nada: Intl do Node (pt ou en, conforme a maquina).
  assert.ok(['pt', 'en'].includes(lingua({ env: {}, raiz: semJson })));
  // textos(): lingua desconhecida cai no ingles.
  assert.equal(textos({ pt: 'ola', en: 'hello' }, 'pt'), 'ola');
  assert.equal(textos({ pt: 'ola', en: 'hello' }, 'xx'), 'hello');
});

test('fmtUsd: virgula em portugues, ponto em ingles', () => {
  assert.equal(fmtUsd(1.5, 'pt'), 'US$ 1,50');
  assert.equal(fmtUsd(1.5, 'en'), 'US$ 1.50');
  assert.equal(fmtUsd(0.01234, 'pt'), 'US$ 0,0123');
  assert.equal(fmtUsd(0.01234, 'en'), 'US$ 0.0123');
  assert.equal(fmtUsd(null, 'en'), 'US$ ?');
  assert.equal(fmtUsd(2), 'US$ 2,00', 'sem lingua explicita usa WORKSHOP_LANG (pt nos testes)');
});

function projetoComCusto(usd) {
  const proj = mkdtempSync(join(tmpdir(), 'ws-custo-'));
  const ws = join(proj, '.workshop');
  mkdirSync(join(ws, 'status'), { recursive: true });
  writeFileSync(join(ws, 'usage.jsonl'), JSON.stringify({ tipo: 'principal', sessao: 's', custo_usd: usd, modelo: 'claude-sonnet-5-5' }) + '\n');
  writeFileSync(join(ws, 'status', 'a.json'), JSON.stringify({ tarefa: 'a', estado: 'verde' }));
  writeFileSync(join(ws, 'status', 'b.json'), JSON.stringify({ tarefa: 'b', estado: 'vermelho' }));
  return { proj, ws };
}

test('aviso de orcamento em portugues e em ingles (uma vez cada)', () => {
  const orc = { budget: { target_usd: 5, cap_usd: 10 } };
  const pt = projetoComCusto(6);
  assert.equal(budgetMessage(pt.ws, orc, 'pt').systemMessage, 'Aviso: o custo acumulado deste projeto chegou a US$ 6,00, acima do alvo de US$ 5,00. A execução continua normalmente.');
  assert.equal(budgetMessage(pt.ws, orc, 'pt'), null, 'so avisa uma vez');
  assert.ok(JSON.parse(readFileSync(join(pt.ws, 'warnings.json'), 'utf8')).target);
  // The older pricing keys and the older avisos.json (already warned) still work.
  const velho = projetoComCusto(6);
  writeFileSync(join(velho.ws, 'avisos.json'), JSON.stringify({ alvo: '2026-10-16T10:00:00Z' }));
  assert.equal(budgetMessage(velho.ws, { orcamento: { alvo_usd: 5, teto_usd: 10 } }, 'en'), null);
  const en = projetoComCusto(6);
  assert.equal(budgetMessage(en.ws, orc, 'en').systemMessage, "Warning: this project's total cost has reached US$ 6.00, above the US$ 5.00 target. The run continues as normal.");
  const teto = projetoComCusto(12);
  assert.match(budgetMessage(teto.ws, orc, 'en').systemMessage, /^Warning: .* US\$ 12\.00, above the US\$ 10\.00 cap\. The run continues; nothing was stopped\.$/);
});

test('statusline: palavras e numeros na lingua do kit', () => {
  const { proj } = projetoComCusto(6);
  const input = JSON.stringify({ cwd: proj, model: { display_name: 'Sonnet' }, cost: { total_duration_ms: 3900000 } });
  const correr = (l) => spawnSync(process.execPath, [join(KIT, 'statusline', 'statusline.mjs')], { input, encoding: 'utf8', env: { ...process.env, WORKSHOP_LANG: l } }).stdout;
  assert.equal(correr('pt'), 'Sonnet · sessão US$ ? · projeto US$ 6,00 de US$ 5,00 ⚠ acima do alvo · swarm 1✓ 0… 1✗ · 1 h 5 min');
  assert.equal(correr('en'), 'Sonnet · session US$ ? · project US$ 6.00 of US$ 5.00 ⚠ over the target · swarm 1✓ 0… 1✗ · 1 h 5 min');
});

test('subagent prompt markers: TASK/AGENT/ATTEMPT, and the older TAREFA/AGENTE/TENTATIVA', () => {
  assert.deepEqual(parseMarkers('TASK: pw-01\nAGENT: worker-02\nATTEMPT: 2\n\ndo it'), { tarefa: 'pw-01', agente: 'worker-02', tentativa: 2 });
  assert.deepEqual(parseMarkers('TAREFA: pw-01\nAGENTE: worker-02\nTENTATIVA: 3\n\nfaz'), { tarefa: 'pw-01', agente: 'worker-02', tentativa: 3 });
  assert.deepEqual(parseMarkers('no markers'), { tarefa: null, agente: null, tentativa: 1 });
});

test('pricing.json: English keys, and the older Portuguese keys give the same prices', () => {
  assert.ok(pricing.models && pricing.budget && !pricing.modelos && !pricing.orcamento);
  assert.equal(pricing.budget.target_usd, 5);
  assert.equal(pricing.budget.cap_usd, 10);
  const velho = {
    modelos: { 'claude-haiku-5-5': { nome: 'Haiku 5.5', input: 0.1, output: 0.5, cache_write_5m: 0.125, cache_write_1h: 0.2, cache_read: 0.01, prompt_longo: { acima_de_tokens: 100000, input: 0.5, output: 2.5, cache_write_5m: 0.625, cache_write_1h: 1, cache_read: 0.05 } } },
    aliases: { haiku: 'claude-haiku-5-5' },
    orcamento: { alvo_usd: 5, teto_usd: 10 },
  };
  const t = { input: 150000, output: 1000, cache_write_5m: 0, cache_write_1h: 0, cache_read: 0 };
  assert.equal(requestCost(t, 'haiku', velho).usd, requestCost(t, 'haiku', pricing).usd);
});

test('chaos R4: a null line in usage.jsonl is skipped, and an append after a cut line starts on a new line', async () => {
  const { readJsonl } = await import('../lib/transcript.mjs');
  const { appendJsonl } = await import('../lib/workshop.mjs');
  const dir = mkdtempSync(join(tmpdir(), 'ws-usage-'));
  const f = join(dir, 'usage.jsonl');
  writeFileSync(f, 'null\n42\n{"tipo":"principal","sessao":"s","custo_usd":1}\n{"tipo":"subag');
  appendJsonl(f, { tipo: 'subagente', agent_id: 'a1', custo_usd: 2 });
  const regs = readJsonl(f);
  assert.deepEqual(regs.map((r) => r.tipo), ['principal', 'subagente']);
  assert.doesNotThrow(() => totals([null, 7, ...regs]));
});
