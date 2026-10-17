# Cartão rd-03 — Sempre HTTPS

- **Categoria:** networks
- **Dificuldade:** 2
- **Modelo:** `answer` de `../../templates/answer.js`

## Conceito

O HSTS obriga o browser a usar HTTPS num site, mesmo que se escreva http://.

## Enunciado (campo `prompt`)

Que mecanismo diz ao browser para usar sempre HTTPS num site, mesmo que escrevas http:// na barra?

## Conteúdo

Campo `placeholder`: `Sigla ou nome do cabeçalho`

Campo `accept`: `["HSTS","Strict-Transport-Security","HTTP Strict Transport Security"]`

Exemplo de resposta certa: `HSTS`

## Explicação (campo `explanation`)

Sem HSTS, o primeiro pedido em http:// pode ser intercetado numa rede hostil. Envia Strict-Transport-Security com um max-age longo em todas as respostas HTTPS.

## Feito quando

```
node --test cards/rd-03/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
