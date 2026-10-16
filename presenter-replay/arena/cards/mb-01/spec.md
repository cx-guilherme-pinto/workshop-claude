# Cartão mb-01 — Do bloqueio mais fraco ao mais forte

- **Categoria:** mobile
- **Dificuldade:** 1
- **Modelo:** `ordenar` de `../../templates/ordenar.js`

## Conceito

Quanto mais combinações o bloqueio tiver, mais tempo leva a adivinhar.

## Enunciado (campo `prompt`)

Ordena estes bloqueios de ecrã, do mais fraco ao mais forte.

## Conteúdo

Campo `items` (já baralhados; mantém esta ordem):

| id | text |
| --- | --- |
| a | Password longa com letras e números |
| b | Sem bloqueio |
| c | PIN de 6 dígitos |
| d | PIN de 4 dígitos |

Campo `answer` (ordem certa): `["b","d","c","a"]`

## Explicação (campo `explanation`)

Um PIN de 4 dígitos tem 10 000 combinações e um de 6 tem um milhão. Usa pelo menos 6 dígitos ou uma password, e a biometria por cima.

## Feito quando

```
node --test cards/mb-01/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
