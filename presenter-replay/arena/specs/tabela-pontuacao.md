# Tarefa `tabela-pontuacao` — tabela de pontuação

Escreve **só** `pages/pontuacao.js`: um módulo ES que a app (`public/app.js`) importa quando o jogador abre `#/pontuacao`. Enquanto o ficheiro não existir, a app mostra "Ainda por construir — onda 2 do enxame".

O aspeto já está feito em `public/styles.css`, que segue `DESIGN.md`. Não escrevas CSS. Usa exatamente as classes e os atributos desta spec. Os números ficam em `tabular-nums` graças à classe `numero`.

## O que exporta

```js
export function renderPontuacao(container, { categorias, cartoes, progresso })
```

| Parâmetro | Forma |
|---|---|
| `container` | O elemento onde desenhas. Substitui todo o conteúdo com `container.replaceChildren(...)`. |
| `categorias` | `[{ id: 'web', nome: 'Web (XSS, SQLi, CSRF)' }]`. Uma linha por categoria, por esta ordem, mesmo que não tenha cartões. |
| `cartoes` | `[{ id, category, difficulty }]`. `category` é o `id` de uma categoria; `difficulty` é 1, 2 ou 3. |
| `progresso` | `{ [id]: { certo: boolean } }`. Só `certo === true` conta. Ignora entradas de cartões que não estão em `cartoes`. |

## Contas

- Pontos de um cartão resolvido: `difficulty × 10`. Um cartão não resolvido vale 0.
- Por categoria: `resolvidos de cartões` (por exemplo `1 de 3`) e a soma dos pontos.
- Total: a soma das linhas.
- Máximo possível: a soma de `difficulty × 10` de todos os cartões das categorias.

## Estrutura que tens de criar

```html
<section class="pontuacao">
  <header class="pagina-cabecalho">
    <h1 class="pagina-titulo">Pontuação</h1>
    <p class="pagina-resumo" data-resumo>Tens 50 pontos de 90 possíveis.</p>
  </header>
  <table class="tabela-pontos">
    <thead>
      <tr><th>Categoria</th><th class="numero">Resolvidos</th><th class="numero">Pontos</th></tr>
    </thead>
    <tbody>
      <tr data-categoria="web">
        <th>Web (XSS, SQLi, CSRF)</th>
        <td class="numero" data-resolvidos>1 de 3</td>
        <td class="numero" data-pontos>20</td>
      </tr>
      <!-- uma linha por categoria -->
    </tbody>
    <tfoot>
      <tr class="total" data-total>
        <th>Total</th>
        <td class="numero" data-resolvidos>3 de 5</td>
        <td class="numero" data-pontos>50</td>
      </tr>
    </tfoot>
  </table>
</section>
```

- `data-pontos` contém **só o número** (`20`, não `20 pontos`).
- `data-resolvidos` contém `X de Y`.
- Resumo (`data-resumo`): `Tens P pontos de M possíveis.`
- Desenhar duas vezes no mesmo `container` não pode duplicar a tabela.

## Como criar o DOM

Usa o `h()` de `../templates/common.js`. Cria elementos com `textContent` e só aceita atributos de uma lista (`class`, `aria-*`, `data-*` e mais alguns; `scope` não está na lista e não é preciso).

```js
import { h } from '../templates/common.js';

export function renderPontuacao(container, { categorias = [], cartoes = [], progresso = {} }) {
  const doc = container.ownerDocument;
  // h(doc, 'td', { class: 'numero', 'data-pontos': '', text: String(pontos) })
  // h(doc, 'tr', { 'data-categoria': cat.id }, h(doc, 'th', { text: cat.nome }), …)
  container.replaceChildren(h(doc, 'section', { class: 'pontuacao' } /* , … */));
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
node --test pages/pontuacao.test.js
```

passa sem erros. Para ver a página: `node server.js` e abre `http://localhost:3000/#/pontuacao`.
