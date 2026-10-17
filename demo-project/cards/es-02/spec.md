# Cartão es-02 — Seguras a porta?

- **Categoria:** social-engineering
- **Dificuldade:** 1
- **Modelo:** `choice` de `../../templates/choice.js`

## Conceito

Tailgating: entrar numa zona protegida colado a quem tem acesso.

## Enunciado (campo `prompt`)

À porta do escritório, alguém com uma caixa pesada pede-te para segurar a porta. Não tem cartão à vista. O que fazes?

## Conteúdo

Campo `options` (mantém os ids):

| id | text |
| --- | --- |
| a | Seguro a porta, é ser educado |
| b | Ofereço ajuda e acompanho-o à receção para se identificar |
| c | Empresto-lhe o meu cartão |
| d | Deixo entrar e aviso mais tarde |

Campo `answer`: `"b"`

## Explicação (campo `explanation`)

Ser simpático não obriga a abrir a porta. Encaminha quem não tem cartão para a receção.

## Feito quando

```
node --test cards/es-02/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
