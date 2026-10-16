#!/usr/bin/env node
// Painel ao vivo do swarm no terminal (corre num segundo terminal enquanto o swarm trabalha).
//   node painel.mjs [--projeto <dir>] [--plano <plan.json>] [--uma-vez]
import { existsSync } from 'node:fs';
import { caminhos, lerPlano, fotografia, lerJson, resolverNoProjeto } from './lib/estado.mjs';
import { tabelaTexto, tempo, usd } from './lib/tabela.mjs';
import { lingua, textos } from '../hooks/lib/lingua.mjs';

const a = process.argv.slice(2);
const projeto = a.includes('--projeto') ? a[a.indexOf('--projeto') + 1] : process.cwd();
const umaVez = a.includes('--uma-vez');
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
  const ponteiro = lerJson(c.ponteiro, {});
  const caminhoPlano = a.includes('--plano') ? a[a.indexOf('--plano') + 1] : ponteiro.plano || resolverNoProjeto(projeto, 'plan.json');
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
  return [`${T.titulo(plano.projeto, plano.modo)} · ${tempo(decorrido)} · ${usd(f.custo.total, L)}${run.fim ? T.terminado : ''}`, '', t].join('\n');
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
