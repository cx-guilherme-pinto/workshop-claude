# Cartão cr-07 — Que password gerada aguenta mais?

- **Categoria:** cryptography
- **Dificuldade:** 2
- **Modelo:** `order` de `../../templates/order.js`

## Conceito

A força de uma password gerada ao acaso é o número de possibilidades do gerador.

## Enunciado (campo `prompt`)

Um gestor de passwords gerou estas quatro passwords ao acaso. O atacante sabe como cada uma foi gerada e experimenta todas as possibilidades. Ordena-as, da que cai mais depressa à que aguenta mais.

## Conteúdo

Campo `items` (já baralhados; mantém esta ordem):

| id | text |
| --- | --- |
| a | 4 palavras ao acaso de uma lista de 2000, como nuvem-agrafo-cavalo-rio |
| b | 12 caracteres ao acaso dos 94 do teclado, como q7#Vm2!xR9pL |
| c | 8 algarismos ao acaso, como 40718325 |
| d | 6 letras minúsculas ao acaso, como kqzmwe |

Campo `answer` (ordem certa): `["c","d","a","b"]`

## Explicação (campo `explanation`)

Conta as possibilidades de cada gerador: as opções de um símbolo, multiplicadas uma vez por cada símbolo. Um atacante que conhece o gerador só experimenta essas.

## Feito quando

```
node --test cards/cr-07/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
