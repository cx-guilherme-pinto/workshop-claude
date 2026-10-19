# Tarefa `index-page` — pesquisa e categorias do Canivete

Escreve **só** `pages/catalog.js`: um módulo ES **puro** (só funções, sem DOM) que a casca (`public/app.js`) usa na página inicial para pesquisar as ferramentas e agrupá-las por categoria.

A casca já desenha tudo (a grelha, a caixa de pesquisa e os cartões das ferramentas). Antes de usar o teu módulo, corre o teste dele no browser. Enquanto o ficheiro não existir ou o teste falhar, usa uma pesquisa simples: só no título, e com os acentos a contar ("agua" não encontra "Água"). Quando o teste passar, a pesquisa passa a ser a tua, sem recarregar a página.

## O que exporta

```js
import { T } from '../lib/texts.js';

export function normalize(text) { … }            // → texto
export function search(tools, query) { … }        // → lista de ferramentas
export function byCategory(tools, categories) { … } // → lista de grupos
export function summary(tools) { … }              // → { total, built, to_build }
```

Cada ferramenta que recebes tem esta forma (vem de `/api/tools`; podem vir mais campos, que ignoras e nunca mudas):

```js
{
  id: 'dn-01',
  title: 'Gorjeta e divisão da conta',
  concept: 'Num jantar de grupo: quanto é a gorjeta e quanto paga cada pessoa.',
  category: 'money',           // id da categoria
  category_name: 'Dinheiro',   // nome da categoria (pode ser null)
  template: 'calc',
  built: true,                 // true quando tools/dn-01/tool.js existe
}
```

E cada categoria: `{ id: 'money', name: 'Dinheiro' }`, pela ordem do catálogo (`specs/tools.json`).

## `normalize(text)`

Devolve o texto pronto para comparar, por esta ordem:

1. `null` ou `undefined` dão `''`; qualquer outro valor passa a texto com `String()`;
2. tira os acentos e a cedilha: `text.normalize('NFD')` e depois apaga os caracteres de `̀` a `ͯ` (`'Ação'` → `'Acao'`);
3. passa a minúsculas;
4. cada sequência de espaços (espaço, tab, mudança de linha) fica um só espaço;
5. tira os espaços do início e do fim.

`normalize('  Água   FRIA  ')` dá `'agua fria'`.

## `search(tools, query)`

1. Se `tools` não for uma lista (array), devolve `[]`.
2. A pesquisa são as palavras de `normalize(query)`, separadas pelos espaços. Sem palavras (`''`, só espaços, `null`, `undefined`), devolve **todas** as ferramentas, pela mesma ordem, numa lista **nova** (`tools.slice()`).
3. O texto de cada ferramenta é `normalize` de `id`, `title`, `concept` e `category_name` juntos, separados por um espaço. Um campo em falta ou `null` conta como `''`.
4. Uma ferramenta entra se **cada** palavra da pesquisa aparecer nesse texto, em qualquer ordem e em qualquer campo. As palavras podem ser partes de palavras: `'percent'` encontra "Percentagens", `'tx-'` encontra `tx-01`.
5. O resultado mantém a ordem de `tools` e tem os próprios objetos recebidos (não cópias). Sem resultados, `[]`.

| Pesquisa | Encontra |
|---|---|
| `'GORJETA'` | `dn-01` (maiúsculas e minúsculas são iguais) |
| `'agua'` e `'água'` | o título "Água por dia" e o conceito "… de agua …" (os acentos não contam, nos dois lados) |
| `'numeros'` | as ferramentas da categoria "Números" (o nome da categoria também conta) |
| `'nm-03'` | `nm-03` (o id também conta) |
| `'pessoa conta'` | só as que têm as duas palavras |

## `byCategory(tools, categories)`

Devolve um grupo por categoria, **pela ordem de `categories`** (não pela ordem em que as ferramentas aparecem):

```js
{ id: 'money', name: 'Dinheiro', tools: [ … ], built: 1 }
```

- `tools`: as ferramentas com `category` igual ao `id` da categoria, pela ordem recebida.
- `built`: quantas dessas têm `built === true` (só `true` conta).
- Cada grupo tem **exatamente** estas 4 chaves: `id`, `name`, `tools` e `built`.
- As categorias sem nenhuma ferramenta ficam de fora. Sem ferramentas, `[]`.
- As ferramentas cuja `category` não é nenhum dos `id` de `categories` (ou não tem categoria) vão, pela ordem recebida, para um **último** grupo com `id: 'other'` e `name: T.catalog.other` (o texto vem de `../lib/texts.js`, para estar na língua do projeto). Sem ferramentas assim, esse grupo não existe.

A casca chama `byCategory(search(tools, query), categories)`: só aparecem as categorias com resultados.

## `summary(tools)`

`{ total, built, to_build }`: o número de ferramentas, quantas têm `built === true` e quantas faltam (`total - built`). Se `tools` não for uma lista, `{ total: 0, built: 0, to_build: 0 }`.

## Regras (o teste verifica-as)

1. **Puro:** nunca mudes o que recebes (sem `sort()`, `push()` ou `t.x = …` nas listas e nos objetos recebidos; o teste congela-os). Para ordenar ou juntar, cria listas novas.
2. **Sem DOM, sem rede e sem armazenamento:** nada de `document`, `window`, `fetch`, `localStorage`, `sessionStorage` nem `import()` dinâmico. Nunca `innerHTML`, `eval` nem `Function`.
3. **Imports só de `../lib/*.js` e `../templates/*.js`:** precisas só de `import { T } from '../lib/texts.js';`.
4. Sem dependências e sem mexer em mais nenhum ficheiro (nem na casca, nem em `public/`, nem no teste).

## Verificar

```
node --test pages/catalog.test.js
```

passa sem erros. Para ver: `node server.js` e abre o endereço que ele mostra (normalmente `http://localhost:3000`). Escreve "agua" ou "dinheiro" na caixa de pesquisa.
