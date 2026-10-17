# Cartão cr-09 — O S do HTTPS

- **Categoria:** cryptography
- **Dificuldade:** 1
- **Modelo:** `answer` de `../../templates/answer.js`

## Conceito

O HTTPS é HTTP dentro de TLS; o antigo SSL já não é seguro.

## Enunciado (campo `prompt`)

Que protocolo cifra a ligação quando vês https:// na barra do browser?

## Conteúdo

Campo `placeholder`: `Sigla`

Campo `accept`: `["TLS","Transport Layer Security","SSL/TLS"]`

Exemplo de resposta certa: `TLS`

## Explicação (campo `explanation`)

O SSL e as primeiras versões do TLS têm falhas conhecidas. Configura os servidores só com TLS 1.2 e 1.3.

## Feito quando

```
node --test cards/cr-09/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
