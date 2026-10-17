# Cartão pv-09 — Dados pessoais no URL

- **Categoria:** privacy
- **Dificuldade:** 2
- **Modelo:** `spotTheFlaw` de `../../templates/spot-the-flaw.js`

## Conceito

Dados pessoais no URL ficam no histórico e nos registos dos servidores por onde o pedido passa.

## Enunciado (campo `prompt`)

Este link foi gerado por uma loja depois do registo. Que partes não deviam estar no URL?

## Conteúdo

Campo `language`: `"url"`

Campo `segments` (índices a partir de 0):

```json
[
  "https://loja.example/bem-vindo",
  "?origem=newsletter",
  "&email=ana@exemplo.pt",
  "&telefone=910000000",
  "&idioma=pt"
]
```

Campo `answer` (índices inseguros): `[2,3]`

## Explicação (campo `explanation`)

O URL fica gravado no histórico, nos registos de servidores e proxies e em ferramentas de análise. Envia dados pessoais no corpo de um pedido POST, por HTTPS.

## Feito quando

```
node --test cards/pv-09/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
