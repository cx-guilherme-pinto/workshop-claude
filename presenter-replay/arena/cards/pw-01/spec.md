# Cartão pw-01 — Qual é a password mais forte?

- **Categoria:** passwords
- **Dificuldade:** 1
- **Modelo:** `choice` de `../../templates/choice.js`

## Conceito

O comprimento e a imprevisibilidade pesam mais do que trocar letras por símbolos.

## Enunciado (campo `prompt`)

Um atacante testa milhares de milhões de combinações por segundo. Qual destas aguenta mais tempo?

## Conteúdo

Campo `options` (mantém os ids):

| id | text |
| --- | --- |
| a | P@ssw0rd! |
| b | Benfica2024 |
| c | cavalo-agrafo-bateria-nuvem |
| d | Qw3rty!! |

Campo `answer`: `"c"`

## Explicação (campo `explanation`)

Quatro palavras ao acaso formam uma frase longa e imprevisível. Trocar a por @ não ajuda: essas trocas já estão nos dicionários dos atacantes.

## Feito quando

```
node --test cards/pw-01/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
