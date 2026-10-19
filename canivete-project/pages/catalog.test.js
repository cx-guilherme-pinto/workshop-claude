// Teste pré-escrito para a tarefa index-page (ver specs/index-page.md). Os agentes não o mudam.
// Corre em Node (node --test pages/catalog.test.js) e no browser: a casca corre-o antes de usar pages/catalog.js.
import { test, assert, readSource } from '../lib/testkit.js';
import { securityProblems, stripStringsAndComments } from '../lib/security.js';
import { T } from '../lib/texts.js';

// No browser a casca pede este teste com ?v=<versão>, e o mesmo ?v= passa para o catalog.js (um módulo novo a cada
// versão). No Node não há ?v=.
const VERSION = new URL(import.meta.url).search;

let mod = null;
let importError = null;
try {
  mod = await import('./catalog.js' + VERSION);
} catch (e) {
  importError = e;
}

test('pages/catalog.js existe e exporta normalize, search, byCategory e summary', () => {
  assert.ok(mod, `pages/catalog.js não existe ou tem um erro: ${importError?.message ?? ''}`);
  for (const name of ['normalize', 'search', 'byCategory', 'summary']) assert.equal(typeof mod[name], 'function', `falta export function ${name}`);
});

const CATEGORIES = [
  { id: 'text', name: 'Texto' },
  { id: 'numbers', name: 'Números' },
  { id: 'dates', name: 'Datas' },
  { id: 'money', name: 'Dinheiro' },
  { id: 'daily', name: 'Dia a dia' },
];

const tool = (id, category, title, concept, built) => ({ id, category, category_name: CATEGORIES.find((c) => c.id === category)?.name ?? null, title, concept, template: 'calc', built });

// Pela ordem do catálogo, que não é a das categorias: o dd-01 vem antes do nm-01.
const TOOLS = [
  tool('tx-01', 'text', 'Contar palavras', 'Conta as palavras de um texto e estima o tempo de leitura.', true),
  tool('dd-01', 'daily', 'Medidas de cozinha', 'Converte chávenas e colheres em gramas, para receitas.', false),
  tool('nm-01', 'numbers', 'Percentagens', 'Quanto é X % de Y, e que percentagem é um número de outro.', true),
  tool('tx-04', 'text', 'Remover acentos', 'Tira os acentos e a cedilha: ação dá acao.', false),
  tool('dt-01', 'dates', 'Dias entre duas datas', 'Quantos dias faltam até às férias ou passaram desde o aniversário.', true),
  tool('dn-01', 'money', 'Gorjeta e divisão da conta', 'Num jantar de grupo: a gorjeta e quanto paga cada pessoa.', true),
  tool('nm-03', 'numbers', 'Arredondar com casas decimais', 'Arredonda um número às casas que escolheres.', false),
  tool('dd-02', 'daily', 'Água por dia', 'Quantos litros de agua beber, pelo peso.', true),
];

// Congela a lista e cada ferramenta: uma função que as mude (sort, push, t.x = …) lança um erro.
const frozen = () => Object.freeze(TOOLS.map((t) => Object.freeze({ ...t })));
const ids = (list) => list.map((t) => t.id);

if (mod && ['normalize', 'search', 'byCategory', 'summary'].every((n) => typeof mod[n] === 'function')) {
  // ---------- normalize ----------

  test('normalize: minúsculas, sem acentos nem cedilha, espaços juntos e aparados', () => {
    assert.equal(mod.normalize('  Água   FRIA  '), 'agua fria');
    assert.equal(mod.normalize('Ação e Coração'), 'acao e coracao');
    assert.equal(mod.normalize('Números'), 'numeros');
    assert.equal(mod.normalize('tab\tlinha\nfim'), 'tab linha fim');
    assert.equal(mod.normalize(''), '');
  });

  test('normalize: null e undefined dão texto vazio', () => {
    assert.equal(mod.normalize(null), '');
    assert.equal(mod.normalize(undefined), '');
  });

  // ---------- search ----------

  test('search: sem pesquisa (vazia ou só espaços) devolve todas, pela mesma ordem, numa lista nova', () => {
    const list = frozen();
    for (const q of ['', '   ', undefined, null]) {
      const r = mod.search(list, q);
      assert.deepEqual(ids(r), ids(TOOLS), `pesquisa ${JSON.stringify(q)}`);
      assert.ok(r !== list, 'devolve uma lista nova, não a mesma');
    }
  });

  test('search: não distingue maiúsculas de minúsculas', () => {
    assert.deepEqual(ids(mod.search(frozen(), 'GORJETA')), ['dn-01']);
    assert.deepEqual(ids(mod.search(frozen(), 'pAlAvRaS')), ['tx-01']);
  });

  test('search: não distingue acentos, nem na pesquisa nem no texto', () => {
    assert.deepEqual(ids(mod.search(frozen(), 'agua')), ['dd-02'], '"agua" encontra o título "Água por dia"');
    assert.deepEqual(ids(mod.search(frozen(), 'água')), ['dd-02'], '"água" encontra-o também');
    assert.deepEqual(ids(mod.search(frozen(), 'chavenas')), ['dd-01'], '"chavenas" encontra "chávenas" no conceito');
    assert.deepEqual(ids(mod.search(frozen(), 'AÇÃO')), ['tx-04'], '"AÇÃO" encontra "ação" no conceito');
  });

  test('search: procura no título, no conceito e no nome da categoria', () => {
    assert.deepEqual(ids(mod.search(frozen(), 'arredondar')), ['nm-03'], 'no título');
    assert.deepEqual(ids(mod.search(frozen(), 'férias')), ['dt-01'], 'no conceito');
    assert.deepEqual(ids(mod.search(frozen(), 'numeros')), ['nm-01', 'nm-03'], 'no nome da categoria (category_name), sem acento');
    assert.deepEqual(ids(mod.search(frozen(), 'DINHEIRO')), ['dn-01'], 'no nome da categoria, em maiúsculas');
  });

  test('search: procura também no id', () => {
    assert.deepEqual(ids(mod.search(frozen(), 'nm-03')), ['nm-03']);
    assert.deepEqual(ids(mod.search(frozen(), 'TX-')), ['tx-01', 'tx-04']);
  });

  test('search: com várias palavras, cada uma tem de aparecer (em qualquer ordem e em qualquer campo)', () => {
    assert.deepEqual(ids(mod.search(frozen(), 'conta  pessoa')), ['dn-01'], 'as duas palavras estão no dn-01');
    assert.deepEqual(ids(mod.search(frozen(), 'pessoa conta')), ['dn-01'], 'por outra ordem');
    assert.deepEqual(ids(mod.search(frozen(), 'dinheiro jantar')), ['dn-01'], 'uma no nome da categoria, outra no conceito');
    assert.deepEqual(ids(mod.search(frozen(), 'texto gramas')), [], 'nenhuma ferramenta tem as duas');
  });

  test('search: as palavras podem ser partes de palavras', () => {
    assert.deepEqual(ids(mod.search(frozen(), 'percent')), ['nm-01']);
    assert.deepEqual(ids(mod.search(frozen(), 'dat')), ['dt-01']);
  });

  test('search: sem resultados devolve uma lista vazia', () => {
    assert.deepEqual(mod.search(frozen(), 'xilofone'), []);
  });

  test('search: mantém a ordem recebida e devolve as mesmas ferramentas (não cópias)', () => {
    const list = frozen();
    const r = mod.search(list, 'a');
    assert.deepEqual(ids(r), ids(TOOLS.filter((t) => /a/.test(mod.normalize([t.id, t.title, t.concept, t.category_name].join(' '))))));
    assert.ok(r.every((t) => list.includes(t)), 'cada resultado é o próprio objeto da lista');
  });

  test('search: campos em falta contam como texto vazio, e o que não é lista dá []', () => {
    const list = [{ id: 'xx-01', title: 'Só título' }, { id: 'xx-02', concept: 'Só conceito' }, { id: 'xx-03', category_name: null }];
    assert.deepEqual(ids(mod.search(list, 'so')), ['xx-01', 'xx-02']);
    assert.deepEqual(mod.search(null, 'a'), []);
    assert.deepEqual(mod.search(undefined, ''), []);
  });

  // ---------- byCategory ----------

  test('byCategory: um grupo por categoria, pela ordem das categorias, com as ferramentas pela ordem recebida', () => {
    const g = mod.byCategory(frozen(), CATEGORIES);
    assert.deepEqual(g.map((x) => x.id), ['text', 'numbers', 'dates', 'money', 'daily']);
    assert.deepEqual(g.map((x) => x.name), ['Texto', 'Números', 'Datas', 'Dinheiro', 'Dia a dia']);
    assert.deepEqual(g.map((x) => ids(x.tools)), [['tx-01', 'tx-04'], ['nm-01', 'nm-03'], ['dt-01'], ['dn-01'], ['dd-01', 'dd-02']]);
  });

  test('byCategory: built conta as ferramentas com built === true de cada grupo', () => {
    const g = mod.byCategory(frozen(), CATEGORIES);
    assert.deepEqual(g.map((x) => x.built), [1, 1, 1, 1, 1]);
    const truthy = [{ ...TOOLS[0], built: 'sim' }, { ...TOOLS[3], built: 1 }];
    assert.equal(mod.byCategory(truthy, CATEGORIES)[0].built, 0, 'só true conta');
  });

  test('byCategory: as categorias sem ferramentas ficam de fora', () => {
    const g = mod.byCategory(mod.search(frozen(), 'arredondar'), CATEGORIES);
    assert.equal(g.length, 1);
    assert.equal(g[0].id, 'numbers');
    assert.deepEqual(ids(g[0].tools), ['nm-03']);
    assert.deepEqual(mod.byCategory([], CATEGORIES), []);
  });

  test('byCategory: as ferramentas de uma categoria desconhecida (ou sem categoria) vão para um último grupo "other"', () => {
    const list = [tool('zz-01', 'space', 'Distância à Lua', 'Em quilómetros.', true), TOOLS[0], { ...TOOLS[2], category: null }];
    const g = mod.byCategory(list, CATEGORIES);
    assert.deepEqual(g.map((x) => x.id), ['text', 'other']);
    const other = g[g.length - 1];
    assert.equal(other.name, T.catalog.other, 'o nome do grupo vem de T.catalog.other (lib/texts.js)');
    assert.deepEqual(ids(other.tools), ['zz-01', 'nm-01']);
    assert.equal(other.built, 2);
  });

  test('byCategory: cada grupo tem exatamente id, name, tools e built, e não muda o que recebe', () => {
    const g = mod.byCategory(frozen(), Object.freeze(CATEGORIES.map((c) => Object.freeze({ ...c }))));
    for (const x of g) assert.deepEqual(Object.keys(x).sort(), ['built', 'id', 'name', 'tools']);
  });

  // ---------- summary ----------

  test('summary: total, prontas (built === true) e por construir', () => {
    assert.deepEqual(mod.summary(frozen()), { total: 8, built: 5, to_build: 3 });
    assert.deepEqual(mod.summary([]), { total: 0, built: 0, to_build: 0 });
    assert.deepEqual(mod.summary(null), { total: 0, built: 0, to_build: 0 });
  });

  // ---------- source ----------

  test('pages/catalog.js é um módulo puro e seguro', async () => {
    const src = await readSource('./catalog.js', import.meta.url);
    assert.deepEqual(securityProblems(src), [], 'padrões perigosos');
    const code = stripStringsAndComments(src);
    const forbidden = [
      ['document', '\\bdocument\\b'],
      ['window', '\\bwindow\\b'],
      ['fetch', '\\bfetch\\s*\\('],
      ['XMLHttpRequest', 'XMLHttpRequest'],
      ['localStorage', '\\blocalStorage\\b'],
      ['sessionStorage', '\\bsessionStorage\\b'],
      ['import()', '\\bimport\\s*\\('],
    ];
    const found = forbidden.filter(([, re]) => new RegExp(re).test(code)).map(([name]) => name);
    assert.deepEqual(found, [], 'um módulo puro: sem DOM, sem rede, sem armazenamento e sem import() dinâmico');
    for (const m of src.matchAll(/^\s*import\s[^'"]*['"]([^'"]+)['"]/gm)) {
      assert.ok(/^\.\.\/(lib|templates)\/[\w-]+\.js$/.test(m[1]), `import não permitido: ${m[1]} (só ../lib/*.js e ../templates/*.js)`);
    }
  });
}
