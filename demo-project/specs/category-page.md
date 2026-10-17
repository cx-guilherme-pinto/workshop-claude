# Tarefa `category-page` — página de uma categoria

Escreve **só** `pages/category.js`: um módulo ES que a app (`public/app.js`) importa quando o jogador abre `#/category/<id>`. Enquanto o ficheiro não existir, a app mostra "Ainda por construir — onda 2 do swarm".

O aspeto já está feito em `public/styles.css`, que segue `DESIGN.md`. Não escrevas CSS. Usa exatamente as classes e os atributos desta spec, e o CSS desenha o resto.

## O que exporta

```js
export function renderCategory(container, { category, cards, progress, open })
```

| Parâmetro | Forma |
|---|---|
| `container` | O elemento onde desenhas. Substitui todo o conteúdo com `container.replaceChildren(...)`. |
| `category` | `{ id: 'web', name: 'Web (XSS, SQLi, CSRF)' }` |
| `cards` | `[{ id, title, difficulty, template, status }]`, pela ordem em que se mostram. `difficulty` é 1, 2 ou 3. `status` é `'playable'` ou `'not_built'`. |
| `progress` | `{ [id]: { correct: boolean } }`. Um cartão sem entrada ainda não foi jogado. Ignora as entradas de outros cartões. |
| `open` | `(id) => void`. Chama-a quando o jogador carrega num cartão jogável. A app abre o cartão. |

## Estado de cada cartão

Calcula-o por esta ordem e escreve-o no atributo `data-status` do `<li>`:

| `data-status` | Quando | Texto em `.tile-status` |
|---|---|---|
| `not_built` | `card.status === 'not_built'` (ganha sempre ao progresso) | `Por construir` |
| `solved` | `progress[id].correct === true` (só `true` conta) | `Resolvido` |
| `wrong` | há entrada em `progress[id]`, mas `correct` não é `true` | `Errado, tenta outra vez` |
| `not_played` | não há entrada | `Por jogar` |

Pontos de um cartão: `difficulty × 10`.

## Estrutura que tens de criar

```html
<section class="category" data-category="web">
  <header class="page-header">
    <h1 class="page-title">Web (XSS, SQLi, CSRF)</h1>
    <p class="page-summary" data-summary>1 de 4 resolvidos · 10 pontos</p>
  </header>
  <ul class="tiles">
    <li class="tile-item" data-card="web-01" data-status="solved">
      <button class="tile" type="button" data-open="web-01">
        <span class="tile-title">Encontra a injeção SQL</span>
        <span class="tile-meta">Nível 1 · 10 pontos</span>
        <span class="tile-status">Resolvido</span>
      </button>
    </li>
    <!-- um <li> por cartão, pela ordem de `cards` -->
  </ul>
</section>
```

- **Resumo** (`data-summary`): `X de Y resolvidos · P pontos`. `Y` é o número total de cartões recebidos (também os por construir). `X` e `P` contam só os `solved`.
- **Clique:** o `<button>` chama `open(card.id)` uma vez. Num cartão `not_built`, o botão tem o atributo `disabled` **e** o handler não chama `open`, mesmo que o clique chegue.
- **Lista vazia:** se `cards` vier vazio, em vez do `<ul>` mostra `<p class="page-empty">Ainda não há cartões nesta categoria.</p>`.
- Desenhar duas vezes no mesmo `container` não pode duplicar nada.

## Como criar o DOM

Usa o `h()` de `../templates/common.js`. Cria elementos com `textContent` e só aceita atributos de uma lista (`class`, `type`, `disabled`, `aria-*`, `data-*` e mais alguns).

```js
import { h } from '../templates/common.js';

export function renderCategory(container, { category, cards = [], progress = {}, open = () => {} }) {
  const doc = container.ownerDocument;
  // h(doc, 'button', { class: 'tile', type: 'button', 'data-open': id, disabled: true, on: { click: fn } }, filho1, filho2)
  // h(doc, 'span', { class: 'tile-title', text: title })
  // h(doc, 'p', { class: 'page-summary', 'data-summary': '', text: '…' })
  container.replaceChildren(h(doc, 'section', { class: 'category', 'data-category': category.id } /* , … */));
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
node --test pages/category.test.js
```

passa sem erros. Para ver a página: `node server.js` e abre o endereço que ele mostra com `#/category/web` no fim (normalmente `http://localhost:3000/#/category/web`).
