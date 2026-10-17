#!/usr/bin/env node
// Monta a Arena do replay (o plano B do video do enxame) com o codigo ATUAL do kit, em pt ou en, a partir de
// uma execucao gravada: a Arena como o instalador a monta, as solucoes de referencia (dev/solutions) para os
// cartoes e as paginas ficarem jogaveis, e replays/recording/ com o events.jsonl e o snapshot.json da execucao.
// Os ids antigos das tarefas (antes da D-25: integracao, revisao, pagina-categoria, tabela-pontuacao) passam
// aos novos, para a grelha so mostrar nomes ingleses. Ferramenta do organizador; nao chama a API.
//
//   node tools/record/montar-replay.mjs --lingua pt|en (--gravacao <pasta com events.jsonl e snapshot.json>
//                                       | --arena <Arena de uma execucao, com .workshop/>) [--dest <pasta>]
//
// Sem --dest: presenter-replay/arena (pt) ou presenter-replay/arena-en (en). A pasta de destino e refeita.
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const KIT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const a = process.argv.slice(2);
const opt = (k, d) => (a.includes(k) ? a[a.indexOf(k) + 1] : d);
const lingua = opt('--lingua', opt('--language', 'pt'));
if (!['pt', 'en'].includes(lingua)) { console.error('--lingua tem de ser pt ou en'); process.exit(2); }
const gravacao = opt('--gravacao');
const arenaRun = opt('--arena');
if (!gravacao === !arenaRun) { console.error('indica --gravacao <pasta> ou --arena <pasta>'); process.exit(2); }
const dest = resolve(opt('--dest', join(KIT, 'presenter-replay', lingua === 'en' ? 'arena-en' : 'arena')));

const IDS = { integracao: 'integration', revisao: 'review', 'pagina-categoria': 'category-page', 'tabela-pontuacao': 'score-table' };
const novoId = (id) => (typeof id === 'string' && IDS[id]) || id;
const lerJsonl = (f) => readFileSync(f, 'utf8').split('\n').filter((l) => l.trim()).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);

// 1. Eventos e fotografia da execucao.
let eventos;
let snapshot;
if (gravacao) {
  eventos = lerJsonl(join(gravacao, 'events.jsonl'));
  snapshot = existsSync(join(gravacao, 'snapshot.json')) ? JSON.parse(readFileSync(join(gravacao, 'snapshot.json'), 'utf8')) : null;
} else {
  eventos = lerJsonl(join(arenaRun, '.workshop', 'events.jsonl'));
  const m = await import(pathToFileURL(join(arenaRun, 'tools', 'workshop', 'orchestrator', 'lib', 'state.mjs')).href);
  const c = m.caminhos(arenaRun);
  snapshot = m.fotografia(c, m.lerPlano(join(arenaRun, 'plan.json')));
}
for (const e of eventos) {
  for (const k of ['tarefa', 'task']) if (k in e) e[k] = novoId(e[k]);
}
if (snapshot) {
  for (const k of ['tarefas', 'tasks']) if (Array.isArray(snapshot[k])) for (const t of snapshot[k]) t.id = novoId(t.id);
}
const modo = eventos.find((e) => e.tipo === 'inicio' || e.type === 'start')?.modo ?? eventos.find((e) => e.tipo === 'inicio' || e.type === 'start')?.mode;
const modoPlano = modo === 'apresentador' || modo === 'presenter' ? 'presenter' : 'participant';

// 2. A Arena com o codigo atual, como o instalador a monta, e as solucoes de referencia.
rmSync(dest, { recursive: true, force: true });
const montagem = spawnSync(process.execPath, [join(KIT, 'installer', 'assemble-demo.mjs'), '--dest', dest, '--language', lingua, '--no-git', '--force'], { encoding: 'utf8' });
if (montagem.status !== 0) { console.error(montagem.stderr || montagem.stdout); process.exit(1); }
rmSync(join(dest, '.claude'), { recursive: true, force: true }); // settings com caminhos locais (node, hooks): nao vao para o repo
rmSync(join(dest, '.arena-kit.json'), { force: true });
const SOL = join(KIT, 'dev', 'solutions');
cpSync(SOL, dest, { recursive: true, filter: (p) => resolve(p) !== resolve(SOL, 'i18n') });
if (existsSync(join(SOL, 'i18n', lingua))) cpSync(join(SOL, 'i18n', lingua), dest, { recursive: true });
const plano = spawnSync(process.execPath, ['tools/plan.mjs', '--mode', modoPlano], { cwd: dest, encoding: 'utf8', env: { ...process.env, WORKSHOP_LANG: lingua } });
if (plano.status !== 0) { console.error(plano.stderr || plano.stdout); process.exit(1); }

// 3. O replay.
const pasta = join(dest, 'replays', 'recording');
mkdirSync(pasta, { recursive: true });
writeFileSync(join(pasta, 'events.jsonl'), eventos.map((e) => JSON.stringify(e)).join('\n') + '\n');
if (snapshot) writeFileSync(join(pasta, 'snapshot.json'), JSON.stringify(snapshot, null, 2) + '\n');

// 4. Os testes passam (os quadrados verdes da grelha podem ser jogados).
const t = spawnSync(process.execPath, ['--test', '--test-timeout=10000'], { cwd: dest, encoding: 'utf8', env: { ...process.env, WORKSHOP_LANG: lingua } });
const resumo = /(?:#|ℹ) pass (\d+)[\s\S]*(?:#|ℹ) fail (\d+)/.exec(t.stdout || '');
console.log(`replay em ${dest}: ${eventos.length} eventos, modo ${modoPlano}, testes ${resumo ? `${resumo[1]} ok, ${resumo[2]} falharam` : `codigo ${t.status}`}`);
console.log(`plano B: cd ${dest} && node server.js  ->  http://localhost:3000/status?replay=recording`);
process.exitCode = t.status ?? 1;
