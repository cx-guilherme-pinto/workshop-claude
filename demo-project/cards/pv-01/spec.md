# Cartão pv-01 — A calculadora curiosa

- **Categoria:** privacy
- **Dificuldade:** 1
- **Modelo:** `choice` de `../../templates/choice.js`

## Conceito

Uma app só deve ter as permissões de que precisa para funcionar.

## Enunciado (campo `prompt`)

Uma app de calculadora pede acesso. Que permissão faz sentido dares-lhe?

## Conteúdo

Campo `options` (mantém os ids):

| id | text |
| --- | --- |
| a | Contactos |
| b | Localização precisa |
| c | Microfone |
| d | Nenhuma destas |

Campo `answer`: `"d"`

## Explicação (campo `explanation`)

Uma calculadora não precisa de saber quem conheces nem onde estás. Recusa o que não faz sentido e revê as permissões nas definições.

## Feito quando

```
node --test cards/pv-01/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
