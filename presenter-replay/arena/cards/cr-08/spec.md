# Cartão cr-08 — Guardar passwords: do pior ao melhor

- **Categoria:** cryptography
- **Dificuldade:** 2
- **Modelo:** `order` de `../../templates/order.js`

## Conceito

Passwords guardam-se com um hash lento e com salt, feito de propósito para custar a testar.

## Enunciado (campo `prompt`)

Ordena estas formas de guardar passwords, da pior à melhor.

## Conteúdo

Campo `items` (já baralhados; mantém esta ordem):

| id | text |
| --- | --- |
| a | SHA-256 com salt |
| b | Texto simples |
| c | Argon2id com salt |
| d | MD5 sem salt |

Campo `answer` (ordem certa): `["b","d","a","c"]`

## Explicação (campo `explanation`)

O SHA-256 é rápido de mais: uma placa gráfica testa milhares de milhões de palpites por segundo. Usa Argon2id, scrypt ou bcrypt, que são lentos de propósito.

## Feito quando

```
node --test cards/cr-08/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
