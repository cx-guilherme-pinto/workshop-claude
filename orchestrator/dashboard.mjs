#!/usr/bin/env node
// Live swarm dashboard in the terminal (runs in a second terminal while the swarm works).
//   node dashboard.mjs [--project <dir>] [--plan <plan.json>] [--once]
// (--projeto, --plano and --uma-vez still work.)
import { existsSync } from 'node:fs';
import { caminhos, lerPlano, fotografia, lerJson, lerPonteiro, resolverNoProjeto } from './lib/state.mjs';
import { tabelaTexto, tempo, usd, nomeModo } from './lib/table.mjs';
import { opt, flag } from './lib/args.mjs';
import { lingua, textos } from '../hooks/lib/language.mjs';

const a = process.argv.slice(2);
const projeto = opt(a, '--project') || process.cwd();
const umaVez = flag(a, '--once');
const c = caminhos(projeto);
const L = lingua();
const T = textos({
  pt: {
    espera: 'À espera do plano (corre /demo-plan ou /task-plan)…',
    titulo: (p, m) => `Swarm ${p} · modo ${m}`,
    terminado: ' · TERMINADO',
    sair: '(Ctrl+C para sair)',
  },
  en: {
    espera: 'Waiting for the plan (run /demo-plan or /task-plan)…',
    titulo: (p, m) => `Swarm ${p} · mode ${m}`,
    terminado: ' · FINISHED',
    sair: '(Ctrl+C to exit)',
  },
}, L);

const COR = { verde: '\x1b[32m', vermelho: '\x1b[31m', falhou: '\x1b[31m', em_curso: '\x1b[33m', por_fazer: '\x1b[90m' };
const RESET = '\x1b[0m';
const usarCor = process.stdout.isTTY && !process.env.NO_COLOR;

function desenhar() {
  const ponteiro = lerPonteiro(c);
  const caminhoPlano = opt(a, '--plan') || ponteiro.plan || ponteiro.plano || resolverNoProjeto(projeto, 'plan.json');
  if (!existsSync(caminhoPlano)) return T.espera;
  const plano = lerPlano(caminhoPlano, L);
  const f = fotografia(c, plano);
  const run = lerJson(c.run, {});
  const decorrido = run.inicio ? ((run.fim ? Date.parse(run.fim) : Date.now()) - Date.parse(run.inicio)) / 1000 : null;
  let t = tabelaTexto(f, undefined, L);
  if (usarCor) {
    t = t
      .split('\n')
      .map((l) => {
        const tarefa = f.tarefas.find((x) => l.includes(` ${x.id} `));
        return tarefa ? COR[tarefa.estado] + l + RESET : l;
      })
      .join('\n');
  }
  return [`${T.titulo(plano.projeto, nomeModo(plano.modo, L))} · ${tempo(decorrido)} · ${usd(f.custo.total, L)}${run.fim ? T.terminado : ''}`, '', t].join('\n');
}

if (umaVez) {
  console.log(desenhar());
} else {
  const tick = () => {
    process.stdout.write('\x1b[2J\x1b[H' + desenhar() + `\n\n${T.sair}\n`);
  };
  tick();
  setInterval(tick, 1000);
}
