# Contrato de cartão

Cada cartão é uma pasta `cards/<id>/` com três ficheiros:

| Ficheiro | Quem o escreve | Para quê |
|---|---|---|
| `spec.md` | já vem pronto | o que o cartão tem de ensinar e as respostas |
| `card.test.js` | já vem pronto | o teste que tem de ficar verde |
| `card.js` | **o agente** | o cartão em si |

## O que `card.js` exporta

Um único `export default` criado com um dos 4 modelos de `templates/`:

```js
import { choice } from '../../templates/choice.js';

export default choice({
  id: 'pw-01',                 // igual ao nome da pasta
  title: 'Qual é a password mais forte?',
  category: 'passwords',       // igual à spec
  difficulty: 1,               // 1, 2 ou 3
  concept: 'Uma frase curta com a ideia central.',
  prompt: 'O enunciado que o jogador lê.',
  explanation: 'A explicação mostrada no fim do desafio.',
  options: [ { id: 'a', text: '…' }, /* … */ ],
  answer: 'c',
});
```

O objeto final cumpre `{ id, title, category, difficulty, template, render(container, api), validate(answer) }`. O `render` vem do modelo, por isso **nunca o escrevas à mão**.

## Os 4 modelos

| Modelo | Import | Campos próprios | Formato da resposta |
|---|---|---|---|
| `choice` | `../../templates/choice.js` | `options: [{id, text, detail?}]`, `answer: 'b'`, `scenario?` | id da opção, ex.: `'b'` |
| `spotTheFlaw` | `../../templates/spot-the-flaw.js` | `segments: ['…', …]`, `answer: [2]`, `language?` | lista de índices, ex.: `[2]` |
| `order` | `../../templates/order.js` | `items: [{id, text}]` (baralhados), `answer: ['x','y','z']` | lista de ids pela ordem certa |
| `answer` | `../../templates/answer.js` | `accept: ['…']` **ou** `check(normalized, original)`, `placeholder?`, `scenario?` | texto |

`scenario` (opcional) é `{ kind: 'email' | 'url' | 'text' | 'chat', label?: '…', lines: ['…'] }` e aparece sempre como texto.

Para lógica própria em `answer`, usa `check`. A resposta chega normalizada (minúsculas, sem acentos, sem espaços a mais), e `normalize` também é exportado por `templates/answer.js`.

## Regras (os testes verificam-nas)

1. Só podes importar de `../../templates/*.js` e `../../lib/*.js`.
2. Nada de `document`, `window`, `innerHTML`, `eval`, `Function`, `fetch`, `localStorage` nem `import()` dinâmico no `card.js`.
3. O `id`, a `category` e o modelo têm de ser os da spec.
4. Todo o texto visível fica em português de Portugal, com frases curtas.
5. Não mexas em mais nenhum ficheiro. Se o teste falhar por causa de outro ficheiro, explica-o na resposta.

## Verificar

```
node --test cards/<id>/card.test.js
```
