#!/usr/bin/env node
// Gera, a partir de specs/cards.json, os ficheiros pre-escritos do projeto:
//   cards/<id>/spec.md, cards/<id>/card.test.js e TASKS.md.
// Corre-o quando mudares specs/cards.json:  node tools/gen.mjs   (--check so verifica)
// A lingua dos ficheiros gerados vem de specs/cards.json ("lingua": "pt" ou "en"; sem campo, pt).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHECK = process.argv.includes('--check');

const specs = JSON.parse(readFileSync(join(ROOT, 'specs/cards.json'), 'utf8'));
const extra = JSON.parse(readFileSync(join(ROOT, 'specs/tarefas.json'), 'utf8'));
const LINGUA = specs.lingua === 'en' ? 'en' : 'pt';

// Textos dos ficheiros gerados. Os nomes dos campos, os ids e os comandos nao se traduzem.
const TEXTOS = {
  pt: {
    cartao: 'Cartão',
    categoria: 'Categoria',
    dificuldade: 'Dificuldade',
    modelo: 'Modelo',
    modeloDe: (fn, ficheiro) => `\`${fn}\` de \`../../templates/${ficheiro}\``,
    dependeDe: 'Depende de',
    conceito: 'Conceito',
    enunciado: 'Enunciado (campo `prompt`)',
    cenario: 'Cenário (campo `scenario`)',
    conteudo: 'Conteúdo',
    opcoes: 'Campo `options` (mantém os ids):',
    campo: (nome) => `Campo \`${nome}\``,
    segmentos: 'Campo `segments` (índices a partir de 0):',
    respostaInseguros: 'Campo `answer` (índices inseguros)',
    itens: 'Campo `items` (já baralhados; mantém esta ordem):',
    respostaOrdem: 'Campo `answer` (ordem certa)',
    logicaCheck: 'Lógica do `check` (em vez de `accept`):',
    exemplo: 'Exemplo de resposta certa',
    explicacao: 'Explicação (campo `explanation`)',
    feitoQuando: 'Feito quando',
    passa: 'passa sem erros. Regras: `cards/CONTRACT.md`.',
    teste: {
      gerado: '// GERADO por tools/gen.mjs a partir de specs/cards.json. Nao editar a mao.',
      cartao: 'Cartao',
      carrega: 'card.js existe e carrega',
      naoCarrega: (id) => `cards/${id}/card.js nao existe, nao tem export default ou tem um erro: `,
      contrato: 'cumpre o contrato',
      idErrado: 'id errado',
      categoriaErrada: 'category errada',
      usaModelo: 'tem de usar o modelo ',
      dificuldade: 'difficulty tem de ser 1, 2 ou 3',
      semTitle: 'falta title',
      semExplanation: 'falta explanation',
      aceita: 'aceita a resposta certa',
      devia: 'validate devia aceitar ',
      rejeita: 'rejeita as respostas erradas',
      naoDevia: 'validate nao devia aceitar ',
      desenha: 'desenha o desafio e devolve a resposta',
      mostraTitle: 'o render tem de mostrar o title',
      devolve: 'a interacao devia devolver a resposta certa',
      fonte: 'fonte segura',
      usaHash: 'este cartao tem de usar ../../lib/hash.js',
    },
    tasks: {
      titulo: '# TASKS — Arena de Segurança',
      intro: 'Cada tarefa é feita por um agente. **Este ficheiro é gerado** por `node tools/gen.mjs` a partir de `specs/cards.json` e `specs/tarefas.json`.',
      participante: (n) => `- Modo participante: **${n} cartões** + utilitário + 2 páginas + integração + revisão.`,
      apresentador: (n) => `- Modo apresentador: **${n} cartões** + as mesmas tarefas.`,
      suporte: '## Tarefas de suporte',
      colunasSuporte: ['id', 'onda', 'o quê', 'spec', 'depende de'],
      colunasCartoes: ['id', 'modo', 'modelo', 'título', 'conceito', 'depende de'],
    },
    msg: {
      idRepetido: (id) => `id repetido: ${id}`,
      categoria: (id, cat) => `${id}: categoria desconhecida ${cat}`,
      modelo: (id, m) => `${id}: modelo desconhecido ${m}`,
      modo: (id) => `${id}: modo invalido`,
      erradas: (id) => `${id}: precisa de respostas erradas`,
      dependencia: (id, d) => `${id}: dependencia desconhecida ${d}`,
      problemas: 'specs/cards.json tem problemas:',
      desatualizado: (rel) => `desatualizado: ${rel}`,
      desatualizados: (n) => `${n} ficheiro(s) desatualizados. Corre: node tools/gen.mjs`,
      atualizado: 'gen: tudo atualizado',
      escritos: (n, m) => `gen: ${n} cartoes, ${m} ficheiro(s) escritos`,
    },
  },
  en: {
    cartao: 'Card',
    categoria: 'Category',
    dificuldade: 'Difficulty',
    modelo: 'Template',
    modeloDe: (fn, ficheiro) => `\`${fn}\` from \`../../templates/${ficheiro}\``,
    dependeDe: 'Depends on',
    conceito: 'Concept',
    enunciado: 'Prompt (field `prompt`)',
    cenario: 'Scenario (field `scenario`)',
    conteudo: 'Content',
    opcoes: 'Field `options` (keep the ids):',
    campo: (nome) => `Field \`${nome}\``,
    segmentos: 'Field `segments` (indexes start at 0):',
    respostaInseguros: 'Field `answer` (unsafe indexes)',
    itens: 'Field `items` (already shuffled; keep this order):',
    respostaOrdem: 'Field `answer` (right order)',
    logicaCheck: 'Logic of `check` (instead of `accept`):',
    exemplo: 'Example of a right answer',
    explicacao: 'Explanation (field `explanation`)',
    feitoQuando: 'Done when',
    passa: 'passes with no errors. Rules: `cards/CONTRACT.md`.',
    teste: {
      gerado: '// GENERATED by tools/gen.mjs from specs/cards.json. Do not edit by hand.',
      cartao: 'Card',
      carrega: 'card.js exists and loads',
      naoCarrega: (id) => `cards/${id}/card.js does not exist, has no default export or has an error: `,
      contrato: 'follows the contract',
      idErrado: 'wrong id',
      categoriaErrada: 'wrong category',
      usaModelo: 'must use the template ',
      dificuldade: 'difficulty must be 1, 2 or 3',
      semTitle: 'missing title',
      semExplanation: 'missing explanation',
      aceita: 'accepts the right answer',
      devia: 'validate should accept ',
      rejeita: 'rejects the wrong answers',
      naoDevia: 'validate should not accept ',
      desenha: 'draws the challenge and returns the answer',
      mostraTitle: 'render must show the title',
      devolve: 'the interaction should return the right answer',
      fonte: 'safe source',
      usaHash: 'this card must use ../../lib/hash.js',
    },
    tasks: {
      titulo: '# TASKS — Security Arena',
      intro: 'Each task is done by one agent. **This file is generated** by `node tools/gen.mjs` from `specs/cards.json` and `specs/tarefas.json`.',
      participante: (n) => `- Participant mode: **${n} cards** + utility + 2 pages + integration + review.`,
      apresentador: (n) => `- Presenter mode: **${n} cards** + the same tasks.`,
      suporte: '## Support tasks',
      colunasSuporte: ['id', 'wave', 'what', 'spec', 'depends on'],
      colunasCartoes: ['id', 'mode', 'template', 'title', 'concept', 'depends on'],
    },
    msg: {
      idRepetido: (id) => `repeated id: ${id}`,
      categoria: (id, cat) => `${id}: unknown category ${cat}`,
      modelo: (id, m) => `${id}: unknown template ${m}`,
      modo: (id) => `${id}: invalid mode`,
      erradas: (id) => `${id}: needs wrong answers`,
      dependencia: (id, d) => `${id}: unknown dependency ${d}`,
      problemas: 'specs/cards.json has problems:',
      desatualizado: (rel) => `out of date: ${rel}`,
      desatualizados: (n) => `${n} file(s) out of date. Run: node tools/gen.mjs`,
      atualizado: 'gen: everything up to date',
      escritos: (n, m) => `gen: ${n} cards, ${m} file(s) written`,
    },
  },
}[LINGUA];
const M = TEXTOS.msg;

const TEMPLATES = {
  escolha: { fn: 'escolha', ficheiro: 'escolha.js' },
  'clica-erro': { fn: 'clicaErro', ficheiro: 'clica-erro.js' },
  ordenar: { fn: 'ordenar', ficheiro: 'ordenar.js' },
  resposta: { fn: 'resposta', ficheiro: 'resposta.js' },
};

const erros = [];
const ids = new Set();
const cats = new Set(specs.categorias.map((c) => c.id));
for (const c of specs.cartoes) {
  if (ids.has(c.id)) erros.push(M.idRepetido(c.id));
  ids.add(c.id);
  if (!cats.has(c.categoria)) erros.push(M.categoria(c.id, c.categoria));
  if (!TEMPLATES[c.modelo]) erros.push(M.modelo(c.id, c.modelo));
  if (!['participante', 'apresentador'].includes(c.modo)) erros.push(M.modo(c.id));
  if (!Array.isArray(c.erradas) || c.erradas.length === 0) erros.push(M.erradas(c.id));
  for (const d of c.depende || []) if (!ids.has(d) && !extra.lib.some((l) => l.id === d) && !specs.cartoes.some((x) => x.id === d)) erros.push(M.dependencia(c.id, d));
}
if (erros.length) {
  console.error(M.problemas + '\n- ' + erros.join('\n- '));
  process.exit(1);
}

const j = (v) => JSON.stringify(v);
const cod = (s) => '`' + String(s).replace(/`/g, "'") + '`';
const linhaTabela = (cols) => '| ' + cols.map((x) => String(x).replace(/\|/g, '\\|').replace(/\n/g, ' ')).join(' | ') + ' |';

function specMd(c) {
  const t = TEMPLATES[c.modelo];
  const L = [];
  const X = TEXTOS;
  L.push(`# ${X.cartao} ${c.id} — ${c.titulo}`, '');
  L.push(`- **${X.categoria}:** ${c.categoria}`);
  L.push(`- **${X.dificuldade}:** ${c.dificuldade}`);
  L.push(`- **${X.modelo}:** ${X.modeloDe(t.fn, t.ficheiro)}`);
  if (c.depende?.length) L.push(`- **${X.dependeDe}:** ${c.depende.join(', ')}`);
  L.push('', `## ${X.conceito}`, '', c.conceito, '', `## ${X.enunciado}`, '', c.enunciado, '');
  if (c.cenario) {
    L.push(`## ${X.cenario}`, '', '```json', JSON.stringify(c.cenario, null, 2), '```', '');
  }
  L.push(`## ${X.conteudo}`, '');
  if (c.modelo === 'escolha') {
    L.push(X.opcoes, '', linhaTabela(['id', 'text']), linhaTabela(['---', '---']));
    for (const o of c.opcoes) L.push(linhaTabela([o.id, o.texto]));
    L.push('', `${X.campo('answer')}: \`${j(c.certa)}\``);
  } else if (c.modelo === 'clica-erro') {
    L.push(`${X.campo('language')}: \`${j(c.linguagem || 'texto')}\``, '', X.segmentos, '');
    L.push('```json', JSON.stringify(c.segmentos, null, 2), '```', '');
    L.push(`${X.respostaInseguros}: \`${j(c.certa)}\``);
  } else if (c.modelo === 'ordenar') {
    L.push(X.itens, '', linhaTabela(['id', 'text']), linhaTabela(['---', '---']));
    for (const o of c.itens) L.push(linhaTabela([o.id, o.texto]));
    L.push('', `${X.respostaOrdem}: \`${j(c.certa)}\``);
  } else if (c.modelo === 'resposta') {
    if (c.placeholder) L.push(`${X.campo('placeholder')}: ${cod(c.placeholder)}`, '');
    if (c.aceites) L.push(`${X.campo('accept')}: \`${j(c.aceites)}\``, '');
    if (c.verificacao) L.push(X.logicaCheck, '', c.verificacao, '');
    L.push(`${X.exemplo}: ${cod(c.certa)}`);
  }
  L.push('', `## ${X.explicacao}`, '', c.explicacao, '');
  L.push(`## ${X.feitoQuando}`, '', '```', `node --test cards/${c.id}/card.test.js`, '```', '', X.passa, '');
  return L.join('\n');
}

function interacao(c) {
  switch (c.modelo) {
    case 'escolha':
      return `c.querySelector('[data-opcao="' + SPEC.certa + '"]').click();`;
    case 'clica-erro':
      return `for (const i of SPEC.certa) c.querySelector('[data-indice="' + i + '"]').click();`;
    case 'ordenar':
      return [
        `for (let p = 0; p < SPEC.certa.length; p++) {`,
        `      for (let guarda = 0; guarda < 50; guarda++) {`,
        `        const ordem = Array.from(c.querySelectorAll('[data-item]'), (n) => n.getAttribute('data-item'));`,
        `        if (ordem.indexOf(SPEC.certa[p]) <= p) break;`,
        `        c.querySelector('[data-item="' + SPEC.certa[p] + '"]').querySelector('[data-mover="cima"]').click();`,
        `      }`,
        `    }`,
      ].join('\n');
    case 'resposta':
      return `c.querySelector('input').value = SPEC.certa;`;
    default:
      return '';
  }
}

function testJs(c) {
  const spec = { id: c.id, categoria: c.categoria, modelo: c.modelo, certa: c.certa, erradas: c.erradas, depende: c.depende || [] };
  const cmp = c.modelo === 'escolha' || c.modelo === 'resposta' ? 'equal' : 'deepEqual';
  const X = TEXTOS.teste;
  const q = (s) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  return `${X.gerado}
// ${X.cartao} ${c.id}: ${c.titulo}
import { test, assert, readSource, novoContentor } from '../../lib/testkit.js';
import { problemasNoCartao } from '../../lib/seguranca.js';

const SPEC = ${JSON.stringify(spec)};

let cartao = null;
let erro = null;
try {
  cartao = (await import('./card.js')).default ?? null;
} catch (e) {
  erro = e;
}

test('${c.id}: ${q(X.carrega)}', () => {
  assert.ok(cartao, '${q(X.naoCarrega(c.id))}' + (erro?.message ?? ''));
});

if (cartao) {
  test('${c.id}: ${q(X.contrato)}', () => {
    assert.equal(cartao.id, SPEC.id, '${q(X.idErrado)}');
    assert.equal(cartao.category, SPEC.categoria, '${q(X.categoriaErrada)}');
    assert.equal(cartao.template, SPEC.modelo, '${q(X.usaModelo)}' + SPEC.modelo);
    assert.ok([1, 2, 3].includes(cartao.difficulty), '${q(X.dificuldade)}');
    assert.ok(typeof cartao.title === 'string' && cartao.title.length > 3, '${q(X.semTitle)}');
    assert.ok(typeof cartao.explanation === 'string' && cartao.explanation.length > 10, '${q(X.semExplanation)}');
    assert.equal(typeof cartao.render, 'function');
    assert.equal(typeof cartao.validate, 'function');
  });

  test('${c.id}: ${q(X.aceita)}', () => {
    assert.equal(cartao.validate(SPEC.certa), true, '${q(X.devia)}' + JSON.stringify(SPEC.certa));
  });

  test('${c.id}: ${q(X.rejeita)}', () => {
    for (const e of SPEC.erradas) assert.equal(cartao.validate(e), false, '${q(X.naoDevia)}' + JSON.stringify(e));
  });

  test('${c.id}: ${q(X.desenha)}', () => {
    const c = novoContentor();
    let recebida;
    cartao.render(c, { responder: (r) => { recebida = r; return { certo: cartao.validate(r) }; } });
    assert.ok(c.textContent.includes(cartao.title), '${q(X.mostraTitle)}');
    ${interacao(c)}
    c.querySelector('.botao-principal').click();
    assert.${cmp}(recebida, SPEC.certa, '${q(X.devolve)}');
  });

  test('${c.id}: ${q(X.fonte)}', async () => {
    const src = await readSource('./card.js', import.meta.url);
    assert.deepEqual(problemasNoCartao(src), []);
    if (SPEC.depende.includes('lib-hash')) assert.match(src, /from\\s+['"]\\.\\.\\/\\.\\.\\/lib\\/hash\\.js['"]/, '${q(X.usaHash)}');
  });
}
`;
}

function tasksMd() {
  const X = TEXTOS.tasks;
  const L = [X.titulo, ''];
  L.push(X.intro, '');
  const part = specs.cartoes.filter((c) => c.modo === 'participante');
  L.push(X.participante(part.length));
  L.push(X.apresentador(specs.cartoes.length), '');
  L.push(X.suporte, '', linhaTabela(X.colunasSuporte), linhaTabela(['---', '---', '---', '---', '---']));
  for (const t of [...extra.lib, ...extra.paginas, extra.integracao, extra.revisao]) {
    L.push(linhaTabela([t.id, t.onda, t.titulo, t.spec ? `\`${t.spec}\`` : '—', (t.depende || []).join(', ') || '—']));
  }
  L.push('');
  for (const cat of specs.categorias) {
    const cs = specs.cartoes.filter((c) => c.categoria === cat.id);
    if (!cs.length) continue;
    L.push(`## ${cat.nome}`, '', linhaTabela(X.colunasCartoes), linhaTabela(['---', '---', '---', '---', '---', '---']));
    for (const c of cs) L.push(linhaTabela([c.id, c.modo, c.modelo, c.titulo, c.conceito, (c.depende || []).join(', ') || '—']));
    L.push('');
  }
  return L.join('\n');
}

let mudou = 0;
function escrever(rel, conteudo) {
  const p = join(ROOT, rel);
  const atual = existsSync(p) ? readFileSync(p, 'utf8') : null;
  if (atual === conteudo) return;
  mudou++;
  if (CHECK) {
    console.error(M.desatualizado(rel));
    return;
  }
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, conteudo, 'utf8');
}

for (const c of specs.cartoes) {
  escrever(`cards/${c.id}/spec.md`, specMd(c));
  escrever(`cards/${c.id}/card.test.js`, testJs(c));
}
escrever('TASKS.md', tasksMd());

if (CHECK && mudou) {
  console.error(M.desatualizados(mudou));
  process.exit(1);
}
console.log(CHECK ? M.atualizado : M.escritos(specs.cartoes.length, mudou));
