# Cartão mb-08 — Carregar no aeroporto

- **Categoria:** mobile
- **Dificuldade:** 2
- **Modelo:** `choice` de `../../templates/choice.js`

## Conceito

Uma porta USB pública pode trocar dados com o telemóvel, não só energia.

## Enunciado (campo `prompt`)

No aeroporto, queres carregar o telemóvel. O que é mais seguro?

## Conteúdo

Campo `options` (mantém os ids):

| id | text |
| --- | --- |
| a | Usar a porta USB e aceitar 'Confiar neste computador' |
| b | Usar o teu carregador numa tomada, ou um bloqueador de dados USB |
| c | Usar a porta USB com o Wi-Fi desligado |
| d | Usar a porta USB com o telemóvel em silêncio |

Campo `answer`: `"b"`

## Explicação (campo `explanation`)

Pela tomada só passa energia. Se usares uma porta USB, nunca aceites 'Confiar neste computador'.

## Feito quando

```
node --test cards/mb-08/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
