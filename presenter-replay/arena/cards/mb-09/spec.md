# Cartão mb-09 — Gerir os telemóveis da empresa

- **Categoria:** mobile
- **Dificuldade:** 3
- **Modelo:** `answer` de `../../templates/answer.js`

## Conceito

A gestão de dispositivos móveis aplica regras de segurança e permite apagar dados à distância.

## Enunciado (campo `prompt`)

Que sigla designa o sistema que a empresa usa para exigir bloqueio de ecrã e apagar à distância os telemóveis de trabalho?

## Conteúdo

Campo `placeholder`: `Sigla`

Campo `accept`: `["MDM","mobile device management","gestão de dispositivos móveis"]`

Exemplo de resposta certa: `MDM`

## Explicação (campo `explanation`)

Com MDM, a empresa exige bloqueio e cifra e pode apagar só os dados de trabalho se o telemóvel se perder. Num telemóvel pessoal, usa um perfil de trabalho separado.

## Feito quando

```
node --test cards/mb-09/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
