# Cartão pw-06 — A política de passwords tem regras más

- **Categoria:** passwords
- **Dificuldade:** 2
- **Modelo:** `clicaErro` de `../../templates/clica-erro.js`

## Conceito

Mudanças forçadas e dicas de password tornam as passwords mais fracas, não mais fortes.

## Enunciado (campo `prompt`)

A Empresa Atlas publicou esta política. Que regras vão contra as boas práticas atuais?

## Conteúdo

Campo `language`: `"texto"`

Campo `segments` (índices a partir de 0):

```json
[
  "Mínimo de 12 caracteres.",
  "Obrigatório mudar a password a cada 30 dias.",
  "Permitir colar a password no campo de login.",
  "Recusar passwords que aparecem em fugas conhecidas.",
  "Mostrar uma dica da password no ecrã de login.",
  "MFA obrigatória em todas as contas."
]
```

Campo `answer` (índices inseguros): `[1,4]`

## Explicação (campo `explanation`)

Quem muda à força acaba em Verao2025!, Verao2026!, e a dica ajuda sobretudo o atacante. Muda a password só quando houver sinais de fuga e deixa colar, para os gestores de passwords funcionarem.

## Feito quando

```
node --test cards/pw-06/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
