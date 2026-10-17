# Cartão ph-01 — Qual é o site verdadeiro?

- **Categoria:** phishing
- **Dificuldade:** 1
- **Modelo:** `choice` de `../../templates/choice.js`

## Conceito

Domínios parecidos trocam uma letra ou juntam um hífen para enganar quem lê depressa.

## Enunciado (campo `prompt`)

O Banco Luz usa o domínio bancoluz.example. Qual destes links leva mesmo ao banco?

## Conteúdo

Campo `options` (mantém os ids):

| id | text |
| --- | --- |
| a | https://bancoIuz.example/entrar |
| b | https://banco-luz.example/entrar |
| c | https://bancoluz.example/entrar |
| d | https://bancolux.example/entrar |

Campo `answer`: `"c"`

## Explicação (campo `explanation`)

Em a há um I maiúsculo no lugar do l, em b um hífen a mais e em d um x no fim. Lê o domínio letra a letra ou, melhor, usa um marcador guardado.

## Feito quando

```
node --test cards/ph-01/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
