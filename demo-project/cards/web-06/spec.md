# Cartão web-06 — De onde podem vir os scripts?

- **Categoria:** web
- **Dificuldade:** 2
- **Modelo:** `resposta` de `../../templates/resposta.js`

## Conceito

A Content-Security-Policy diz ao browser de que origens pode carregar scripts e outros recursos.

## Enunciado (campo `prompt`)

Que cabeçalho HTTP diz ao browser de onde pode carregar scripts, para travar XSS?

## Conteúdo

Campo `placeholder`: `Nome do cabeçalho`

Campo `accept`: `["Content-Security-Policy","CSP","Content Security Policy"]`

Exemplo de resposta certa: `Content-Security-Policy`

## Explicação (campo `explanation`)

Com script-src 'self', um script injetado inline ou de outra origem não corre. É uma segunda barreira: continua a tratar bem o texto do utilizador.

## Feito quando

```
node --test cards/web-06/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
