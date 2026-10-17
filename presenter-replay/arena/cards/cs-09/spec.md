# Cartão cs-09 — Encontra a injeção de comandos

- **Categoria:** secure-code
- **Dificuldade:** 2
- **Modelo:** `spotTheFlaw` de `../../templates/spot-the-flaw.js`

## Conceito

Juntar texto do utilizador a um comando da shell deixa correr outros comandos.

## Enunciado (campo `prompt`)

Este endpoint faz ping a um servidor. Que linha permite injetar comandos?

## Conteúdo

Campo `language`: `"js"`

Campo `segments` (índices a partir de 0):

```json
[
  "const host = req.query.host;",
  "exec('ping -c 1 ' + host, (err, saida) => {",
  "  res.send(saida);",
  "});"
]
```

Campo `answer` (índices inseguros): `[1]`

## Explicação (campo `explanation`)

Com host=exemplo.pt; ls, a shell corre um segundo comando. Usa execFile('ping', ['-c', '1', host]), que não passa pela shell, e valida o host.

## Feito quando

```
node --test cards/cs-09/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
