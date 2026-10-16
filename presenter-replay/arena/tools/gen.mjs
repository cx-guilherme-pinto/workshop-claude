#!/usr/bin/env node
// Gera, a partir de specs/cards.json, os ficheiros pre-escritos do projeto:
//   cards/<id>/spec.md, cards/<id>/card.test.js e TASKS.md.
// Corre-o quando mudares specs/cards.json:  node tools/gen.mjs   (--check so verifica)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHECK = process.argv.includes('--check');

const specs = JSON.parse(readFileSync(join(ROOT, 'specs/cards.json'), 'utf8'));
const extra = JSON.parse(readFileSync(join(ROOT, 'specs/tarefas.json'), 'utf8'));

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
  if (ids.has(c.id)) erros.push(`id repetido: ${c.id}`);
  ids.add(c.id);
  if (!cats.has(c.categoria)) erros.push(`${c.id}: categoria desconhecida ${c.categoria}`);
  if (!TEMPLATES[c.modelo]) erros.push(`${c.id}: modelo desconhecido ${c.modelo}`);
  if (!['participante', 'apresentador'].includes(c.modo)) erros.push(`${c.id}: modo invalido`);
  if (!Array.isArray(c.erradas) || c.erradas.length === 0) erros.push(`${c.id}: precisa de respostas erradas`);
  for (const d of c.depende || []) if (!ids.has(d) && !extra.lib.some((l) => l.id === d) && !specs.cartoes.some((x) => x.id === d)) erros.push(`${c.id}: dependencia desconhecida ${d}`);
}
if (erros.length) {
  console.error('specs/cards.json tem problemas:\n- ' + erros.join('\n- '));
  process.exit(1);
}

const j = (v) => JSON.stringify(v);
const cod = (s) => '`' + String(s).replace(/`/g, "'") + '`';
const linhaTabela = (cols) => '| ' + cols.map((x) => String(x).replace(/\|/g, '\\|').replace(/\n/g, ' ')).join(' | ') + ' |';

function specMd(c) {
  const t = TEMPLATES[c.modelo];
  const L = [];
  L.push(`# Cartão ${c.id} — ${c.titulo}`, '');
  L.push(`- **Categoria:** ${c.categoria}`);
  L.push(`- **Dificuldade:** ${c.dificuldade}`);
  L.push(`- **Modelo:** \`${t.fn}\` de \`../../templates/${t.ficheiro}\``);
  if (c.depende?.length) L.push(`- **Depende de:** ${c.depende.join(', ')}`);
  L.push('', '## Conceito', '', c.conceito, '', '## Enunciado (campo `prompt`)', '', c.enunciado, '');
  if (c.cenario) {
    L.push('## Cenário (campo `scenario`)', '', '```json', JSON.stringify(c.cenario, null, 2), '```', '');
  }
  L.push('## Conteúdo', '');
  if (c.modelo === 'escolha') {
    L.push('Campo `options` (mantém os ids):', '', linhaTabela(['id', 'text']), linhaTabela(['---', '---']));
    for (const o of c.opcoes) L.push(linhaTabela([o.id, o.texto]));
    L.push('', `Campo \`answer\`: \`${j(c.certa)}\``);
  } else if (c.modelo === 'clica-erro') {
    L.push(`Campo \`language\`: \`${j(c.linguagem || 'texto')}\``, '', 'Campo `segments` (índices a partir de 0):', '');
    L.push('```json', JSON.stringify(c.segmentos, null, 2), '```', '');
    L.push(`Campo \`answer\` (índices inseguros): \`${j(c.certa)}\``);
  } else if (c.modelo === 'ordenar') {
    L.push('Campo `items` (já baralhados; mantém esta ordem):', '', linhaTabela(['id', 'text']), linhaTabela(['---', '---']));
    for (const o of c.itens) L.push(linhaTabela([o.id, o.texto]));
    L.push('', `Campo \`answer\` (ordem certa): \`${j(c.certa)}\``);
  } else if (c.modelo === 'resposta') {
    if (c.placeholder) L.push(`Campo \`placeholder\`: ${cod(c.placeholder)}`, '');
    if (c.aceites) L.push(`Campo \`accept\`: \`${j(c.aceites)}\``, '');
    if (c.verificacao) L.push('Lógica do `check` (em vez de `accept`):', '', c.verificacao, '');
    L.push(`Exemplo de resposta certa: ${cod(c.certa)}`);
  }
  L.push('', '## Explicação (campo `explanation`)', '', c.explicacao, '');
  L.push('## Feito quando', '', '```', `node --test cards/${c.id}/card.test.js`, '```', '', 'passa sem erros. Regras: `cards/CONTRACT.md`.', '');
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
  return `// GERADO por tools/gen.mjs a partir de specs/cards.json. Nao editar a mao.
// Cartao ${c.id}: ${c.titulo}
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

test('${c.id}: card.js existe e carrega', () => {
  assert.ok(cartao, 'cards/${c.id}/card.js nao existe, nao tem export default ou tem um erro: ' + (erro?.message ?? ''));
});

if (cartao) {
  test('${c.id}: cumpre o contrato', () => {
    assert.equal(cartao.id, SPEC.id, 'id errado');
    assert.equal(cartao.category, SPEC.categoria, 'category errada');
    assert.equal(cartao.template, SPEC.modelo, 'tem de usar o modelo ' + SPEC.modelo);
    assert.ok([1, 2, 3].includes(cartao.difficulty), 'difficulty tem de ser 1, 2 ou 3');
    assert.ok(typeof cartao.title === 'string' && cartao.title.length > 3, 'falta title');
    assert.ok(typeof cartao.explanation === 'string' && cartao.explanation.length > 10, 'falta explanation');
    assert.equal(typeof cartao.render, 'function');
    assert.equal(typeof cartao.validate, 'function');
  });

  test('${c.id}: aceita a resposta certa', () => {
    assert.equal(cartao.validate(SPEC.certa), true, 'validate devia aceitar ' + JSON.stringify(SPEC.certa));
  });

  test('${c.id}: rejeita as respostas erradas', () => {
    for (const e of SPEC.erradas) assert.equal(cartao.validate(e), false, 'validate nao devia aceitar ' + JSON.stringify(e));
  });

  test('${c.id}: desenha o desafio e devolve a resposta', () => {
    const c = novoContentor();
    let recebida;
    cartao.render(c, { responder: (r) => { recebida = r; return { certo: cartao.validate(r) }; } });
    assert.ok(c.textContent.includes(cartao.title), 'o render tem de mostrar o title');
    ${interacao(c)}
    c.querySelector('.botao-principal').click();
    assert.${cmp}(recebida, SPEC.certa, 'a interacao devia devolver a resposta certa');
  });

  test('${c.id}: fonte segura', async () => {
    const src = await readSource('./card.js', import.meta.url);
    assert.deepEqual(problemasNoCartao(src), []);
    if (SPEC.depende.includes('lib-hash')) assert.match(src, /from\\s+['"]\\.\\.\\/\\.\\.\\/lib\\/hash\\.js['"]/, 'este cartao tem de usar ../../lib/hash.js');
  });
}
`;
}

function tasksMd() {
  const L = ['# TASKS — Arena de Segurança', ''];
  L.push('Cada tarefa é feita por um agente. **Este ficheiro é gerado** por `node tools/gen.mjs` a partir de `specs/cards.json` e `specs/tarefas.json`.', '');
  const part = specs.cartoes.filter((c) => c.modo === 'participante');
  L.push(`- Modo participante: **${part.length} cartões** + utilitário + 2 páginas + integração + revisão.`);
  L.push(`- Modo apresentador: **${specs.cartoes.length} cartões** + as mesmas tarefas.`, '');
  L.push('## Tarefas de suporte', '', linhaTabela(['id', 'onda', 'o quê', 'spec', 'depende de']), linhaTabela(['---', '---', '---', '---', '---']));
  for (const t of [...extra.lib, ...extra.paginas, extra.integracao, extra.revisao]) {
    L.push(linhaTabela([t.id, t.onda, t.titulo, t.spec ? `\`${t.spec}\`` : '—', (t.depende || []).join(', ') || '—']));
  }
  L.push('');
  for (const cat of specs.categorias) {
    const cs = specs.cartoes.filter((c) => c.categoria === cat.id);
    if (!cs.length) continue;
    L.push(`## ${cat.nome}`, '', linhaTabela(['id', 'modo', 'modelo', 'título', 'conceito', 'depende de']), linhaTabela(['---', '---', '---', '---', '---', '---']));
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
    console.error(`desatualizado: ${rel}`);
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
  console.error(`${mudou} ficheiro(s) desatualizados. Corre: node tools/gen.mjs`);
  process.exit(1);
}
console.log(CHECK ? 'gen: tudo atualizado' : `gen: ${specs.cartoes.length} cartoes, ${mudou} ficheiro(s) escritos`);
