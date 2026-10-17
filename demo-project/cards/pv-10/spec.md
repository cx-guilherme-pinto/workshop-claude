# Cartão pv-10 — Quem vê a tua publicação?

- **Categoria:** privacy
- **Dificuldade:** 1
- **Modelo:** `order` de `../../templates/order.js`

## Conceito

Cada nível de partilha alarga quem vê o que publicas; o mais restrito é o mais privado.

## Enunciado (campo `prompt`)

Ordena as opções de partilha, da mais privada à mais pública.

## Conteúdo

Campo `items` (já baralhados; mantém esta ordem):

| id | text |
| --- | --- |
| a | Amigos |
| b | Só eu |
| c | Público |
| d | Amigos de amigos |

Campo `answer` (ordem certa): `["b","a","d","c"]`

## Explicação (campo `explanation`)

Amigos de amigos podem ser milhares de desconhecidos. Escolhe Amigos por omissão e revê as publicações antigas.

## Feito quando

```
node --test cards/pv-10/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
