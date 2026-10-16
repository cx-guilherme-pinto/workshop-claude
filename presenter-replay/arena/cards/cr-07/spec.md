# Cartão cr-07 — Da chave mais fraca à mais forte

- **Categoria:** criptografia
- **Dificuldade:** 1
- **Modelo:** `ordenar` de `../../templates/ordenar.js`

## Conceito

Cada bit a mais numa chave duplica o número de chaves que um atacante tem de testar.

## Enunciado (campo `prompt`)

Ordena estas cifras, da chave mais fraca à mais forte.

## Conteúdo

Campo `items` (já baralhados; mantém esta ordem):

| id | text |
| --- | --- |
| a | DES (56 bits) |
| b | AES-128 |
| c | AES-256 |
| d | César (25 chaves) |

Campo `answer` (ordem certa): `["d","a","b","c"]`

## Explicação (campo `explanation`)

César e DES partem-se por força bruta; o AES-128 já está fora de alcance e o AES-256 dá margem extra. Usa AES com chaves de 128 ou 256 bits.

## Feito quando

```
node --test cards/cr-07/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
