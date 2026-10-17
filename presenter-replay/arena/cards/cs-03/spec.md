# Cartão cs-03 — A password no registo

- **Categoria:** secure-code
- **Dificuldade:** 1
- **Modelo:** `spotTheFlaw` de `../../templates/spot-the-flaw.js`

## Conceito

Passwords e tokens nunca devem ir para os registos da aplicação.

## Enunciado (campo `prompt`)

Este código regista cada login. Que linha põe dados secretos nos registos?

## Conteúdo

Campo `language`: `"js"`

Campo `segments` (índices a partir de 0):

```json
[
  "logger.info('login', {",
  "  utilizador: req.body.email,",
  "  password: req.body.password,",
  "  ip: req.ip,",
  "});"
]
```

Campo `answer` (índices inseguros): `[2]`

## Explicação (campo `explanation`)

Os registos são lidos por muitas pessoas e ferramentas e guardados durante meses. Regista o evento e o utilizador, nunca a password nem o token.

## Feito quando

```
node --test cards/cs-03/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
