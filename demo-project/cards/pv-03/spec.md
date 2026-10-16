# Cartão pv-03 — A imagem de 1 píxel

- **Categoria:** privacidade
- **Dificuldade:** 1
- **Modelo:** `escolha` de `../../templates/escolha.js`

## Conceito

Um píxel de rastreio num email avisa o remetente de quando e onde o abriste.

## Enunciado (campo `prompt`)

Um email de publicidade tem uma imagem invisível de 1×1 píxel. Para que serve?

## Conteúdo

Campo `options` (mantém os ids):

| id | text |
| --- | --- |
| a | Decoração |
| b | Saber se, quando e onde abriste o email |
| c | Acelerar o carregamento |
| d | Proteger contra spam |

Campo `answer`: `"b"`

## Explicação (campo `explanation`)

Ao carregar a imagem, o teu programa de email faz um pedido ao servidor do remetente. Bloqueia as imagens remotas por omissão.

## Feito quando

```
node --test cards/pv-03/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
