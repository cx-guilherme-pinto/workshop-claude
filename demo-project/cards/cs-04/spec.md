# Cartão cs-04 — A calculadora com eval

- **Categoria:** codigo-seguro
- **Dificuldade:** 1
- **Modelo:** `escolha` de `../../templates/escolha.js`

## Conceito

eval() executa como código qualquer texto que receber.

## Enunciado (campo `prompt`)

Uma calculadora web faz eval(entrada) com o que o utilizador escreve. Porque é perigoso?

## Conteúdo

Campo `options` (mantém os ids):

| id | text |
| --- | --- |
| a | É lento |
| b | Executa qualquer código que o utilizador escrever |
| c | Não aceita números decimais |
| d | Não funciona no telemóvel |

Campo `answer`: `"b"`

## Explicação (campo `explanation`)

Quem escrever código em vez de uma conta consegue executá-lo. Usa um parser de expressões que só aceite números e operadores.

## Feito quando

```
node --test cards/cs-04/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
