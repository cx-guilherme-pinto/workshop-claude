# Cartão mb-06 — Perdeste o telemóvel

- **Categoria:** mobile
- **Dificuldade:** 1
- **Modelo:** `choice` de `../../templates/choice.js`

## Conceito

Bloquear e apagar à distância protege os dados de um telemóvel perdido.

## Enunciado (campo `prompt`)

Perdeste o telemóvel com o email da empresa. O que fazes primeiro?

## Conteúdo

Campo `options` (mantém os ids):

| id | text |
| --- | --- |
| a | Espero que alguém o devolva |
| b | Bloqueio-o à distância, apago-o se for preciso e aviso a empresa |
| c | Publico nas redes sociais que o perdi |
| d | Compro outro e esqueço o assunto |

Campo `answer`: `"b"`

## Explicação (campo `explanation`)

Com a função de encontrar o dispositivo, localizas, bloqueias e apagas o telemóvel. Avisa a empresa para terminar as sessões abertas.

## Feito quando

```
node --test cards/mb-06/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
