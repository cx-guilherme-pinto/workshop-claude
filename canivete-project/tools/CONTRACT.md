# Contrato de uma ferramenta (`tools/<id>/tool.js`)

Cada ferramenta do Canivete é um módulo ES com um `export default` feito por um dos 4 modelos de `templates/`. O agente escreve **só** `tools/<id>/tool.js`. A spec (`tools/<id>/spec.md`) e o teste (`tools/<id>/tool.test.js`) já vêm prontos, e a interface é da casca (`public/`).

```js
import { calc, ToolError } from '../../templates/calc.js';

export default calc({
  id: 'nm-01',
  title: 'X % de Y e Y é que % de X',
  inputs: [
    { name: 'x', type: 'number', label: 'X' },
    { name: 'y', type: 'number', label: 'Y' },
  ],
  run({ x, y }) {
    if (x === 0) throw new ToolError('X não pode ser 0.');
    return { x_percent_of_y: Math.round(x * y) / 100, y_percent_of_x: Math.round((y / x) * 10000) / 100 };
  },
});
```

## Regras

1. **O modelo é o da spec:** `calc`, `convert`, `text` ou `generate`, importado de `../../templates/<modelo>.js`.
2. **Os campos do objeto:** `id` e `title` da spec. `inputs` tem as entradas da spec, com os mesmos nomes e pela mesma ordem; copia `type`, `label` e o resto (`default`, `min`, `max`, `options`).
3. **`run` recebe as entradas já lidas:** números como `number`, datas como texto `AAAA-MM-DD`, listas como arrays. Devolve a saída da spec: um número, um texto, uma lista ou um objeto com os campos da spec.
4. **Uma entrada que a ferramenta não aceita:** `throw new ToolError('<a mensagem da spec>')`. As entradas que o modelo não consegue ler (vazias, que não são números…) já dão erro sozinhas, com a mensagem de `lib/texts.js`.
5. **`generate`:** o acaso vem só do `random()` (e de `randomInt(n)`) que o `run` recebe no segundo argumento. Nunca uses `Math.random` nem `crypto`: com a mesma seed, o resultado tem de ser igual.
6. **Proibido:** DOM (`document`, `window`), rede (`fetch`…), armazenamento, `eval`, `Function`, `import()` dinâmico e `import` de fora de `../../templates/` e `../../lib/`.
7. **Sem dependências.**

## Verificar

```
node --test tools/<id>/tool.test.js
```

O teste verifica o contrato, cada exemplo da spec, cada entrada inválida e a fonte segura. Os agentes nunca mudam specs nem testes.
