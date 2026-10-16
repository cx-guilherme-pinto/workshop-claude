# Cartão cs-02 — Validar a idade

- **Categoria:** codigo-seguro
- **Dificuldade:** 1
- **Modelo:** `escolha` de `../../templates/escolha.js`

## Conceito

Validar com uma lista do que é permitido é mais seguro do que tentar bloquear o que é perigoso.

## Enunciado (campo `prompt`)

Um formulário pede a idade. Qual é a melhor validação no servidor?

## Conteúdo

Campo `options` (mantém os ids):

| id | text |
| --- | --- |
| a | Remover os caracteres < e > |
| b | Aceitar só números inteiros entre 0 e 130 |
| c | Validar só no browser, com JavaScript |
| d | Aceitar tudo e tratar depois |

Campo `answer`: `"b"`

## Explicação (campo `explanation`)

Definir o que é válido fecha a porta a tudo o resto, incluindo truques que não previste. A validação no browser ajuda o utilizador, mas o servidor tem de repetir tudo.

## Feito quando

```
node --test cards/cs-02/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
