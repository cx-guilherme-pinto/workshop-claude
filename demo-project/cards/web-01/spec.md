# Cartão web-01 — Encontra a injeção SQL

- **Categoria:** web
- **Dificuldade:** 2
- **Modelo:** `clicaErro` de `../../templates/clica-erro.js`

## Conceito

Juntar texto do utilizador a uma consulta SQL deixa o atacante reescrever a consulta.

## Enunciado (campo `prompt`)

Este código de login vai para produção amanhã. Que linha permite uma injeção SQL?

## Conteúdo

Campo `language`: `"js"`

Campo `segments` (índices a partir de 0):

```json
[
  "const email = req.body.email;",
  "const pass = req.body.password;",
  "const sql = \"SELECT * FROM users WHERE email = '\" + email + \"'\";",
  "const user = await db.query(sql);",
  "if (!user || !(await verify(pass, user.hash))) return res.status(401).end();"
]
```

Campo `answer` (índices inseguros): `[2]`

## Explicação (campo `explanation`)

Ao colar o email no SQL, o atacante pode fechar a aspa e juntar ' OR '1'='1. Usa consultas parametrizadas: db.query('… WHERE email = ?', [email]).

## Feito quando

```
node --test cards/web-01/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
