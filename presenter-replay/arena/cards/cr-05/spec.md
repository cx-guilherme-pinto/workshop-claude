# Cartão cr-05 — Hash ou cifra?

- **Categoria:** cryptography
- **Dificuldade:** 1
- **Modelo:** `choice` de `../../templates/choice.js`

## Conceito

Uma cifra reverte-se com a chave; um hash é de sentido único.

## Enunciado (campo `prompt`)

Qual é a diferença entre cifrar e calcular um hash?

## Conteúdo

Campo `options` (mantém os ids):

| id | text |
| --- | --- |
| a | São a mesma coisa com nomes diferentes |
| b | A cifra reverte-se com a chave; o hash não se reverte |
| c | O hash precisa de uma chave secreta; a cifra não |
| d | O hash é sempre mais seguro do que a cifra |

Campo `answer`: `"b"`

## Explicação (campo `explanation`)

Cifra-se o que se vai voltar a ler, como um ficheiro. Para passwords guarda-se um hash lento com salt, porque só é preciso comparar.

## Feito quando

```
node --test cards/cr-05/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
