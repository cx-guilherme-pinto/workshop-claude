# Cartão web-03 — O formulário escondido

- **Categoria:** web
- **Dificuldade:** 2
- **Modelo:** `choice` de `../../templates/choice.js`

## Conceito

CSRF: outro site faz o teu browser enviar um pedido com a tua sessão, sem tu saberes.

## Enunciado (campo `prompt`)

Tens sessão aberta no Banco Luz. Um site malicioso tem um formulário escondido que envia um POST para bancoluz.example/transferir. O que trava o ataque?

## Conteúdo

Campo `options` (mantém os ids):

| id | text |
| --- | --- |
| a | O site do banco usar HTTPS |
| b | Um token anti-CSRF no formulário e cookies SameSite |
| c | Uma password mais longa |
| d | Esconder o URL do formulário |

Campo `answer`: `"b"`

## Explicação (campo `explanation`)

O site malicioso não conhece o token secreto do formulário, e com SameSite o browser não envia o cookie de sessão nesse pedido. Usa os dois.

## Feito quando

```
node --test cards/web-03/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
