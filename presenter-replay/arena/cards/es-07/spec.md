# Cartão es-07 — A pen USB no parque

- **Categoria:** engenharia-social
- **Dificuldade:** 1
- **Modelo:** `escolha` de `../../templates/escolha.js`

## Conceito

Baiting: deixar um objeto apelativo, como uma pen USB, à espera de que alguém o use.

## Enunciado (campo `prompt`)

Encontras uma pen USB no parque da empresa com a etiqueta 'Salários 2026'. O que fazes?

## Conteúdo

Campo `options` (mantém os ids):

| id | text |
| --- | --- |
| a | Ligo-a ao meu portátil para ver de quem é |
| b | Entrego-a à equipa de segurança sem a ligar |
| c | Ligo-a a um computador da receção |
| d | Formato-a e fico com ela |

Campo `answer`: `"b"`

## Explicação (campo `explanation`)

Uma pen pode correr código assim que é ligada, ou fazer-se passar por um teclado. Entrega-a sem a ligar a nada.

## Feito quando

```
node --test cards/es-07/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
