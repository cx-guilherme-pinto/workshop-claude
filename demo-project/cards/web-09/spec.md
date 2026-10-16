# Cartão web-09 — O site dentro de um iframe

- **Categoria:** web
- **Dificuldade:** 3
- **Modelo:** `resposta` de `../../templates/resposta.js`

## Conceito

Clickjacking: outro site carrega o teu num iframe invisível e engana o utilizador para clicar.

## Enunciado (campo `prompt`)

Que cabeçalho clássico impede que outros sites carreguem o teu dentro de um iframe?

## Conteúdo

Campo `placeholder`: `Nome do cabeçalho`

Campo `accept`: `["X-Frame-Options","frame-ancestors","Content-Security-Policy","CSP","CSP frame-ancestors"]`

Exemplo de resposta certa: `X-Frame-Options`

## Explicação (campo `explanation`)

Com X-Frame-Options: DENY ou a diretiva CSP frame-ancestors 'none', o browser recusa mostrar o site num iframe alheio. Ativa um deles em todas as páginas.

## Feito quando

```
node --test cards/web-09/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
