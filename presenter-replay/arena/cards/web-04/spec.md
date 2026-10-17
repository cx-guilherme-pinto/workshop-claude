# Cartão web-04 — As faturas dos outros

- **Categoria:** web
- **Dificuldade:** 2
- **Modelo:** `spotTheFlaw` de `../../templates/spot-the-flaw.js`

## Conceito

IDOR: o servidor devolve um objeto só pelo id, sem confirmar que pertence a quem pede.

## Enunciado (campo `prompt`)

Qualquer cliente autenticado consegue ver a fatura de outro mudando o número no URL. Que linha causa o problema?

## Conteúdo

Campo `language`: `"js"`

Campo `segments` (índices a partir de 0):

```json
[
  "app.get('/faturas/:id', autenticado, async (req, res) => {",
  "  const fatura = await db.faturas.findOne({ id: req.params.id });",
  "  if (!fatura) return res.status(404).end();",
  "  res.json(fatura);",
  "});"
]
```

Campo `answer` (índices inseguros): `[1]`

## Explicação (campo `explanation`)

Estar autenticado não chega: falta confirmar o dono. Procura com findOne({ id: req.params.id, clienteId: req.user.id }) para cada cliente ver só o que é seu.

## Feito quando

```
node --test cards/web-04/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
