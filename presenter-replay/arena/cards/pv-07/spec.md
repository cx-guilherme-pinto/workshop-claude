# Cartão pv-07 — Sem cookies e ainda te reconhecem

- **Categoria:** privacidade
- **Dificuldade:** 2
- **Modelo:** `escolha` de `../../templates/escolha.js`

## Conceito

A impressão digital do browser junta detalhes técnicos que te identificam sem cookies.

## Enunciado (campo `prompt`)

Apagaste todos os cookies, mas um site continua a reconhecer-te. Como é possível?

## Conteúdo

Campo `options` (mantém os ids):

| id | text |
| --- | --- |
| a | Impressão digital do browser: ecrã, fontes, versão e outros detalhes |
| b | O site leu o teu email |
| c | O Wi-Fi contou ao site |
| d | Foi coincidência |

Campo `answer`: `"a"`

## Explicação (campo `explanation`)

A combinação de pequenos detalhes do browser é quase única. Usa um browser com proteção contra fingerprinting e poucas extensões.

## Feito quando

```
node --test cards/pv-07/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
