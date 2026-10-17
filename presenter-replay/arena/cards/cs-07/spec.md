# Cartão cs-07 — O erro que conta demais

- **Categoria:** secure-code
- **Dificuldade:** 2
- **Modelo:** `spotTheFlaw` de `../../templates/spot-the-flaw.js`

## Conceito

Mensagens de erro detalhadas revelam ao atacante como a aplicação funciona por dentro.

## Enunciado (campo `prompt`)

Este é o tratamento de erros da API. Que linha revela detalhes internos a quem fez o pedido?

## Conteúdo

Campo `language`: `"js"`

Campo `segments` (índices a partir de 0):

```json
[
  "app.use((err, req, res, next) => {",
  "  log.error(err);",
  "  res.status(500).send(err.stack);",
  "});"
]
```

Campo `answer` (índices inseguros): `[2]`

## Explicação (campo `explanation`)

O stack trace mostra caminhos, versões e partes do código. Regista os detalhes no servidor e devolve só uma mensagem genérica com um id do erro.

## Feito quando

```
node --test cards/cs-07/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
