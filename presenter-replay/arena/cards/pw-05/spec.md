# Cartão pw-05 — Os três tipos de fator

- **Categoria:** passwords
- **Dificuldade:** 1
- **Modelo:** `answer` de `../../templates/answer.js`

## Conceito

A MFA junta fatores de tipos diferentes: algo que sabes, algo que tens e algo que és.

## Enunciado (campo `prompt`)

A password é algo que sabes. A impressão digital é algo que és. E uma chave física ou o telemóvel é algo que…?

## Conteúdo

Campo `placeholder`: `Uma palavra`

Campo `accept`: `["tens","algo que tens","possuis","algo que possuis","posse"]`

Exemplo de resposta certa: `tens`

## Explicação (campo `explanation`)

Juntar fatores de tipos diferentes obriga o atacante a roubar duas coisas distintas. Duas passwords seguidas continuam a ser um só tipo de fator.

## Feito quando

```
node --test cards/pw-05/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
