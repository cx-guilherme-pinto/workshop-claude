# Cartão ph-05 — O QR colado no parquímetro

- **Categoria:** phishing
- **Dificuldade:** 1
- **Modelo:** `escolha` de `../../templates/escolha.js`

## Conceito

Quishing: um QR falso colado por cima do verdadeiro leva a um site de pagamento falso.

## Enunciado (campo `prompt`)

No parquímetro há um autocolante com um QR para pagar. O QR abre parque-pagar.test e pede os dados do cartão. O que fazes?

## Conteúdo

Campo `options` (mantém os ids):

| id | text |
| --- | --- |
| a | Pago, é mais rápido |
| b | Pago na máquina ou na app oficial do parque |
| c | Leio o QR com outra app |
| d | Pago e guardo o recibo |

Campo `answer`: `"b"`

## Explicação (campo `explanation`)

Um QR é só um link que não consegues ler antes de abrir. Desconfia de autocolantes e paga pelos canais oficiais.

## Feito quando

```
node --test cards/ph-05/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
