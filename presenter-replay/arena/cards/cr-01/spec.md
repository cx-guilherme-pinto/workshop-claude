# Cartão cr-01 — Decifra a mensagem de César

- **Categoria:** cryptography
- **Dificuldade:** 1
- **Modelo:** `answer` de `../../templates/answer.js`
- **Depende de:** lib-hash

## Conceito

A cifra de César troca cada letra por outra a uma distância fixa. Com só 25 chaves, parte-se em segundos.

## Enunciado (campo `prompt`)

Intercetaste uma mensagem cifrada com a cifra de César, com deslocamento 3. O que diz?

## Cenário (campo `scenario`)

```json
{
  "kind": "text",
  "label": "Mensagem intercetada",
  "lines": [
    "DWDTXH DR PHLR-GLD"
  ]
}
```

## Conteúdo

Lógica do `check` (em vez de `accept`):

O validate tem de usar a função caesar de ../../lib/hash.js: a resposta certa é caesar('DWDTXH DR PHLR-GLD', -3). Compara com normalize() dos dois lados, para maiúsculas e acentos não contarem.

Exemplo de resposta certa: `Ataque ao meio-dia`

## Explicação (campo `explanation`)

Cada letra recua 3 posições: D passa a A, W passa a T. Um atacante experimenta as 25 chaves em segundos. Serve para aprender, não para proteger.

## Feito quando

```
node --test cards/cr-01/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
