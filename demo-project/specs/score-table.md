# Tarefa `score-table` — tabela de pontuação

Escreve **só** `pages/score.js`: um módulo ES que a app (`public/app.js`) importa quando o jogador abre `#/score`. Enquanto o ficheiro não existir, a app mostra "Ainda por construir — onda 2 do swarm".

O aspeto já está feito em `public/styles.css`, que segue `DESIGN.md`. Não escrevas CSS. Usa exatamente as classes e os atributos desta spec. Os números ficam em `tabular-nums` graças à classe `number`.

## O que exporta

```js
export function renderScore(container, { categories, cards, progress })
```

| Parâmetro | Forma |
|---|---|
| `container` | O elemento onde desenhas. Substitui todo o conteúdo com `container.replaceChildren(...)`. |
| `categories` | `[{ id: 'web', name: 'Web (XSS, SQLi, CSRF)' }]`. Uma linha por categoria, por esta ordem, mesmo que não tenha cartões. |
| `cards` | `[{ id, category, difficulty }]`. `category` é o `id` de uma categoria; `difficulty` é 1, 2 ou 3. |
| `progress` | `{ [id]: { correct: boolean } }`. Só `correct === true` conta. Ignora entradas de cartões que não estão em `cards`. |

## Contas

- Pontos de um cartão resolvido: `difficulty × 10`. Um cartão não resolvido vale 0.
- Por categoria: `resolvidos de cartões` (por exemplo `1 de 3`) e a soma dos pontos.
- Total: a soma das linhas.
- Máximo possível: a soma de `difficulty × 10` de todos os cartões das categorias.

## Estrutura que tens de criar

```html
<section class="score">
  <header class="page-header">
    <h1 class="page-title">Pontuação</h1>
    <p class="page-summary" data-summary>Tens 50 pontos de 90 possíveis.</p>
  </header>
  <table class="score-table">
    <thead>
      <tr><th>Categoria</th><th class="number">Resolvidos</th><th class="number">Pontos</th></tr>
    </thead>
    <tbody>
      <tr data-category="web">
        <th>Web (XSS, SQLi, CSRF)</th>
        <td class="number" data-solved>1 de 3</td>
        <td class="number" data-points>20</td>
      </tr>
      <!-- uma linha por categoria -->
    </tbody>
    <tfoot>
      <tr class="total" data-total>
        <th>Total</th>
        <td class="number" data-solved>3 de 5</td>
        <td class="number" data-points>50</td>
      </tr>
    </tfoot>
  </table>
</section>
```

- `data-points` contém **só o número** (`20`, não `20 pontos`).
- `data-solved` contém `X de Y`.
- Resumo (`data-summary`): `Tens P pontos de M possíveis.`
- Desenhar duas vezes no mesmo `container` não pode duplicar a tabela.

## Como criar o DOM

Usa o `h()` de `../templates/common.js`. Cria elementos com `textContent` e só aceita atributos de uma lista (`class`, `aria-*`, `data-*` e mais alguns; `scope` não está na lista e não é preciso).

```js
import { h } from '../templates/common.js';

export function renderScore(container, { categories = [], cards = [], progress = {} }) {
  const doc = container.ownerDocument;
  // h(doc, 'td', { class: 'number', 'data-points': '', text: String(points) })
  // h(doc, 'tr', { 'data-category': cat.id }, h(doc, 'th', { text: cat.name }), …)
  container.replaceChildren(h(doc, 'section', { class: 'score' } /* , … */));
}
```

## Regras (o teste verifica-as)

1. **DOM seguro:** só `h()`, `textContent` e `replaceChildren`. Nunca `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `eval` nem `Function`. Um nome como `<img src=x onerror=alert(1)>` aparece como texto.
2. **Sem `document` nem `window`:** usa `container.ownerDocument`. O teste corre em Node, com um DOM falso.
3. **Imports só de `../templates/*.js` e `../lib/*.js`.** Sem `fetch`, `localStorage` nem `import()`.
4. **Texto** em português de Portugal, igual ao desta spec: sem emoji e sem etiquetas em maiúsculas (ver `DESIGN.md`).
5. Não mexas em mais nenhum ficheiro.

## Verificar

```
node --test pages/score.test.js
```

passa sem erros. Para ver a página: `node server.js` e abre `http://localhost:3000/#/score`.
