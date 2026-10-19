# Cartão pv-07 — Sem cookies e ainda te reconhecem

- **Categoria:** privacy
- **Dificuldade:** 2
- **Modelo:** `choice` de `../../templates/choice.js`

## Conceito

Um site pode reconhecer-te sem cookies, através de detalhes que não mudam quando os apagas.

## Enunciado (campo `prompt`)

Em casa, apagaste todos os cookies e abriste o site noutro browser, no mesmo portátil. O site continua a reconhecer-te. Qual é a explicação mais provável?

## Conteúdo

Campo `options` (mantém os ids):

| id | text |
| --- | --- |
| a | Impressão digital do browser: versão, extensões, definições e outros detalhes do browser |
| b | O endereço IP público da tua ligação de casa |
| c | O site leu o histórico do teu browser |
| d | Foi coincidência |

Campo `answer`: `"b"`

## Explicação (campo `explanation`)

Apagar os cookies só limpa o que o browser guardou. O que o site vê de fora depende do browser que usas e da rede de onde te ligas. Para visitas que não queres ligadas entre si, usa uma VPN ou o Tor.

## Feito quando

```
node --test cards/pv-07/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
