# Cartão pv-08 — A foto do cartão de embarque

- **Categoria:** privacy
- **Dificuldade:** 2
- **Modelo:** `choice` de `../../templates/choice.js`

## Conceito

O código de barras de um cartão de embarque contém o nome e a referência da reserva.

## Enunciado (campo `prompt`)

Qual destas publicações ajuda mais um burlão?

## Conteúdo

Campo `options` (mantém os ids):

| id | text |
| --- | --- |
| a | Foto do pôr do sol na praia |
| b | Foto do cartão de embarque com o código de barras visível |
| c | Opinião sobre um filme |
| d | Foto do teu gato |

Campo `answer`: `"b"`

## Explicação (campo `explanation`)

Com o nome e a referência da reserva, alguém pode alterar ou cancelar o voo. Publica depois da viagem e nunca mostres códigos nem documentos.

## Feito quando

```
node --test cards/pv-08/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
