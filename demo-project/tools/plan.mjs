#!/usr/bin/env node
// Gera o plano (DAG) da Arena para um modo e escreve plan.json + PLANO.md.
//
//   node tools/plan.mjs [--modo participante|apresentador] [--max N]
//   node tools/plan.mjs --aplicar .workshop/planner.json     aplica os ajustes do planner
//
// O grafo e deterministico (vem das specs); o planner (Opus) so pode ajustar o paralelismo
// e promover tarefas para Sonnet, com justificacao. O orquestrador (next-wave) segue o plan.json.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { estimar, tabelaEstimativa } from './workshop/orquestrador/estimate.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ler = (p) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));
const argv = process.argv.slice(2);
const opt = (k, d) => {
  const i = argv.indexOf(k);
  return i >= 0 ? argv[i + 1] : d;
};

const MODELOS = {
  worker: 'claude-haiku-5-5',
  implementer: 'claude-sonnet-5-5',
  integrator: 'claude-sonnet-5-5',
  reviewer: 'claude-opus-5-5',
  planner: 'claude-opus-5-5',
  'memoria-extrator': 'claude-haiku-5-5',
};

const INSTRUCOES = {
  cartao: (c) => `Constrói o cartão ${c.id} ("${c.titulo}").
1. Lê cards/${c.id}/spec.md e cards/CONTRACT.md.
2. Escreve só cards/${c.id}/card.js, com o modelo indicado na spec.
3. Verifica: node --test cards/${c.id}/card.test.js
Responde com uma única linha: "OK ${c.id}" ou "FALHOU ${c.id}: <motivo em poucas palavras>".`,
  lib: (t) => `Implementa ${t.ficheiros.join(', ')} conforme ${t.spec}.
Verifica: ${t.teste.join(' ')}
Responde com uma única linha: "OK ${t.id}" ou "FALHOU ${t.id}: <motivo>".`,
  pagina: (t) => `Implementa ${t.ficheiros.join(', ')} conforme ${t.spec}. Segue DESIGN.md.
Verifica: ${t.teste.join(' ')}
Responde com uma única linha: "OK ${t.id}" ou "FALHOU ${t.id}: <motivo>".`,
  integracao: (t) => `Integração final. Segue ${t.spec}.
Corre a suite completa: node --test
Responde com uma única linha: "OK ${t.id}" ou "FALHOU ${t.id}: <motivo>".`,
  revisao: (t) => `Revisão de segurança e qualidade. Segue ${t.spec}.
Lê primeiro .workshop/revisao-resumo.md (já gerado). Escreve o veredito em .workshop/veredito.json.
Responde com uma única linha: "OK ${t.id}: <veredito>".`,
};

function construir(modo, maxParalelo) {
  const specs = ler('specs/cards.json');
  const extra = ler('specs/tarefas.json');
  const cartoes = specs.cartoes.filter((c) => modo === 'apresentador' || c.modo === 'participante');
  const cat = Object.fromEntries(specs.categorias.map((c) => [c.id, c.nome]));
  const tarefas = [];
  for (const l of extra.lib) tarefas.push({ ...l, grupo: 'suporte', grupo_tipo: 'lib', instrucoes: INSTRUCOES.lib(l) });
  for (const c of cartoes) {
    tarefas.push({
      id: c.id,
      titulo: c.titulo,
      grupo: c.categoria,
      grupo_nome: cat[c.categoria],
      grupo_tipo: 'cartao',
      onda: 1,
      agente: 'worker',
      depende: c.depende || [],
      teste: ['node', '--test', `cards/${c.id}/card.test.js`],
      ficheiros: [`cards/${c.id}/card.js`],
      instrucoes: INSTRUCOES.cartao(c),
    });
  }
  if (!argv.includes('--so-cartoes')) {
    for (const p of extra.paginas) tarefas.push({ ...p, grupo: 'paginas', grupo_tipo: 'pagina', instrucoes: INSTRUCOES.pagina(p) });
    tarefas.push({ ...extra.integracao, depende: [...extra.integracao.depende, '*cartoes'], grupo: 'integracao', grupo_tipo: 'integracao', instrucoes: INSTRUCOES.integracao(extra.integracao) });
    tarefas.push({ ...extra.revisao, grupo: 'revisao', grupo_tipo: 'revisao', instrucoes: INSTRUCOES.revisao(extra.revisao) });
  }
  return {
    v: 1,
    projeto: 'arena-de-seguranca',
    modo,
    criado_em: new Date().toISOString(),
    modelo_principal: 'claude-sonnet-5-5',
    config: { max_paralelo: maxParalelo, max_tentativas: 3, escalar_para: 'implementer' },
    agentes: Object.fromEntries(Object.entries(MODELOS).map(([k, v]) => [k, { modelo: v }])),
    ajustes: null,
    apoio_estimativa: ['planner', 'memoria-extrator'],
    tarefas,
  };
}

function aplicarAjustes(plano, aj) {
  const notas = [];
  if (Number.isInteger(aj.max_paralelo) && aj.max_paralelo >= 1 && aj.max_paralelo <= 16) {
    plano.config.max_paralelo = aj.max_paralelo;
    notas.push(`paralelismo: ${aj.max_paralelo}`);
  }
  for (const id of aj.promover_para_sonnet || []) {
    const t = plano.tarefas.find((x) => x.id === id && x.agente === 'worker');
    if (t) {
      t.agente = 'implementer';
      notas.push(`${id} → Sonnet`);
    }
  }
  plano.ajustes = { justificacao: String(aj.justificacao || '').slice(0, 1500), riscos: (aj.riscos || []).slice(0, 8).map(String), aplicados: notas };
  return plano;
}

function mermaid(plano) {
  const L = ['flowchart LR'];
  const cartoes = plano.tarefas.filter((t) => t.grupo_tipo === 'cartao');
  const porId = (id) => id.replace(/[^a-zA-Z0-9]/g, '_');
  L.push('  hash["lib-hash<br/>Haiku"]');
  if (plano.modo === 'apresentador') {
    const grupos = new Map();
    for (const c of cartoes) grupos.set(c.grupo, [...(grupos.get(c.grupo) || []), c]);
    for (const [g, cs] of grupos) {
      L.push(`  ${porId('g-' + g)}["${cs[0].grupo_nome} ×${cs.length}<br/>Haiku"]`);
      if (cs.some((c) => c.depende.includes('lib-hash'))) L.push(`  hash --> ${porId('g-' + g)}`);
      L.push(`  ${porId('g-' + g)} --> paginas`);
    }
  } else {
    for (const c of cartoes) {
      L.push(`  ${porId(c.id)}["${c.id}<br/>${c.agente === 'worker' ? 'Haiku' : 'Sonnet'}"]`);
      if (c.depende.includes('lib-hash')) L.push(`  hash --> ${porId(c.id)}`);
      L.push(`  ${porId(c.id)} --> paginas`);
    }
  }
  L.push('  hash --> paginas');
  L.push('  paginas["onda 2 · Sonnet<br/>categorias + pontuação"] --> integracao["onda 3 · Sonnet<br/>integração + suite"]');
  L.push('  integracao --> revisao["onda 4 · Opus<br/>revisão"]');
  return L.join('\n');
}

function planoMd(plano, est) {
  const n = plano.tarefas.filter((t) => t.grupo_tipo === 'cartao').length;
  const cripto = plano.tarefas.filter((t) => t.depende.includes('lib-hash')).map((t) => t.id);
  return `# Plano da Arena — modo ${plano.modo}

| onda | modelo | o quê | em paralelo |
|---|---|---|---|
| 1 | Haiku | \`lib-hash\` + ${n} cartões (${cripto.join(', ')} esperam pelo \`lib-hash\`) | até ${plano.config.max_paralelo} |
| 2 | Sonnet | página de categoria + tabela de pontuação | 2 |
| 3 | Sonnet | integração e suite completa; cartões que falhem 2× são refeitos em Sonnet | 1+ |
| 4 | Opus | revisão de segurança e qualidade, veredito final | 1 |

\`\`\`mermaid
${mermaid(plano)}
\`\`\`

## Estimativa de custo

${tabelaEstimativa(est)}
${plano.ajustes ? `\n## Ajustes do planner\n\n${plano.ajustes.justificacao}\n\n${plano.ajustes.aplicados.map((a) => `- ${a}`).join('\n')}\n${plano.ajustes.riscos.length ? '\nRiscos:\n' + plano.ajustes.riscos.map((r) => `- ${r}`).join('\n') : ''}` : ''}
`;
}

function resumoParaPlanner(plano) {
  const cartoes = plano.tarefas.filter((t) => t.grupo_tipo === 'cartao');
  const linhas = cartoes.map((t) => `- ${t.id} · ${t.grupo} · ${t.titulo}${t.depende.length ? ` · depende de ${t.depende.join(', ')}` : ''}`);
  return `# Resumo do plano (modo ${plano.modo})

Tarefas: ${plano.tarefas.length} (${cartoes.length} cartões, lib-hash, 2 páginas, integração, revisão).
Modelos: cartões e lib-hash em Haiku; páginas e integração em Sonnet; revisão em Opus.
Paralelismo atual: ${plano.config.max_paralelo}. Tentativas por tarefa: 3 (a 3.ª em Sonnet).

Cartões:
${linhas.join('\n')}
`;
}

const aplicar = opt('--aplicar');
let plano;
if (aplicar) {
  plano = JSON.parse(readFileSync(join(ROOT, 'plan.json'), 'utf8'));
  if (existsSync(join(ROOT, aplicar))) plano = aplicarAjustes(plano, JSON.parse(readFileSync(join(ROOT, aplicar), 'utf8')));
} else {
  const modo = opt('--modo', 'participante');
  if (!['participante', 'apresentador'].includes(modo)) {
    console.error('modo tem de ser participante ou apresentador');
    process.exit(2);
  }
  plano = construir(modo, Number(opt('--max', process.env.ARENA_MAX_PARALELO || (modo === 'apresentador' ? 16 : 8))));
}
const est = estimar(plano);
writeFileSync(join(ROOT, 'plan.json'), JSON.stringify(plano, null, 2) + '\n');
writeFileSync(join(ROOT, 'PLANO.md'), planoMd(plano, est));
mkdirSync(join(ROOT, '.workshop'), { recursive: true });
writeFileSync(join(ROOT, '.workshop/plano-resumo.md'), resumoParaPlanner(plano));
console.log(planoMd(plano, est));
