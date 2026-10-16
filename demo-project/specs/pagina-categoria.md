# Tarefa `pagina-categoria` — página de uma categoria

Escreve **só** `pages/categoria.js`: um módulo ES que a app (`public/app.js`) importa quando o jogador abre `#/categoria/<id>`. Enquanto o ficheiro não existir, a app mostra "Ainda por construir — onda 2 do enxame".

O aspeto já está feito em `public/styles.css`, que segue `DESIGN.md`. Não escrevas CSS. Usa exatamente as classes e os atributos desta spec, e o CSS desenha o resto.

## O que exporta

```js
export function renderCategoria(container, { categoria, cartoes, progresso, abrir })
```

| Parâmetro | Forma |
|---|---|
| `container` | O elemento onde desenhas. Substitui todo o conteúdo com `container.replaceChildren(...)`. |
| `categoria` | `{ id: 'web', nome: 'Web (XSS, SQLi, CSRF)' }` |
| `cartoes` | `[{ id, title, difficulty, template, estado }]`, pela ordem em que se mostram. `difficulty` é 1, 2 ou 3. `estado` é `'jogavel'` ou `'por_construir'`. |
| `progresso` | `{ [id]: { certo: boolean } }`. Um cartão sem entrada ainda não foi jogado. Ignora as entradas de outros cartões. |
| `abrir` | `(id) => void`. Chama-a quando o jogador carrega num cartão jogável. A app abre o cartão. |

## Estado de cada cartão

Calcula-o por esta ordem e escreve-o no atributo `data-estado` do `<li>`:

| `data-estado` | Quando | Texto em `.tile-estado` |
|---|---|---|
| `por_construir` | `cartao.estado === 'por_construir'` (ganha sempre ao progresso) | `Por construir` |
| `certo` | `progresso[id].certo === true` (só `true` conta) | `Resolvido` |
| `errado` | há entrada em `progresso[id]`, mas `certo` não é `true` | `Errado, tenta outra vez` |
| `por_jogar` | não há entrada | `Por jogar` |

Pontos de um cartão: `difficulty × 10`.

## Estrutura que tens de criar

```html
<section class="categoria" data-categoria="web">
  <header class="pagina-cabecalho">
    <h1 class="pagina-titulo">Web (XSS, SQLi, CSRF)</h1>
    <p class="pagina-resumo" data-resumo>1 de 4 resolvidos · 10 pontos</p>
  </header>
  <ul class="tiles">
    <li class="tile-item" data-cartao="web-01" data-estado="certo">
      <button class="tile" type="button" data-abrir="web-01">
        <span class="tile-titulo">Encontra a injeção SQL</span>
        <span class="tile-meta">Nível 1 · 10 pontos</span>
        <span class="tile-estado">Resolvido</span>
      </button>
    </li>
    <!-- um <li> por cartão, pela ordem de `cartoes` -->
  </ul>
</section>
```

- **Resumo** (`data-resumo`): `X de Y resolvidos · P pontos`. `Y` é o número total de cartões recebidos (também os por construir). `X` e `P` contam só os `certo`.
- **Clique:** o `<button>` chama `abrir(cartao.id)` uma vez. Num cartão `por_construir`, o botão tem o atributo `disabled` **e** o handler não chama `abrir`, mesmo que o clique chegue.
- **Lista vazia:** se `cartoes` vier vazio, em vez do `<ul>` mostra `<p class="pagina-vazia">Ainda não há cartões nesta categoria.</p>`.
- Desenhar duas vezes no mesmo `container` não pode duplicar nada.

## Como criar o DOM

Usa o `h()` de `../templates/common.js`. Cria elementos com `textContent` e só aceita atributos de uma lista (`class`, `type`, `disabled`, `aria-*`, `data-*` e mais alguns).

```js
import { h } from '../templates/common.js';

export function renderCategoria(container, { categoria, cartoes = [], progresso = {}, abrir = () => {} }) {
  const doc = container.ownerDocument;
  // h(doc, 'button', { class: 'tile', type: 'button', 'data-abrir': id, disabled: true, on: { click: fn } }, filho1, filho2)
  // h(doc, 'span', { class: 'tile-titulo', text: titulo })
  // h(doc, 'p', { class: 'pagina-resumo', 'data-resumo': '', text: '…' })
  container.replaceChildren(h(doc, 'section', { class: 'categoria', 'data-categoria': categoria.id } /* , … */));
}
```

`disabled: true` cria o atributo; `disabled: false` não cria nada.

## Regras (o teste verifica-as)

1. **DOM seguro:** só `h()`, `textContent` e `replaceChildren`. Nunca `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `eval` nem `Function`. Um título como `<img src=x onerror=alert(1)>` aparece como texto.
2. **Sem `document` nem `window`:** usa `container.ownerDocument`. O teste corre em Node, com um DOM falso.
3. **Imports só de `../templates/*.js` e `../lib/*.js`.** Sem `fetch`, `localStorage` nem `import()`.
4. **Texto** em português de Portugal, igual ao desta spec: sem emoji e sem etiquetas em maiúsculas (ver `DESIGN.md`).
5. Não mexas em mais nenhum ficheiro.

## Verificar

```
node --test pages/categoria.test.js
```

passa sem erros. Para ver a página: `node server.js` e abre `http://localhost:3000/#/categoria/web`.
