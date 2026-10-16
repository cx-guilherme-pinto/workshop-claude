# Cartão ph-09 — Phishing por SMS

- **Categoria:** phishing
- **Dificuldade:** 1
- **Modelo:** `clicaErro` de `../../templates/clica-erro.js`

## Conceito

Smishing: o mesmo truque do phishing, mas por SMS, onde é mais difícil ver o link.

## Enunciado (campo `prompt`)

Este SMS chegou ao teu telemóvel. Que trechos são sinais de smishing?

## Conteúdo

Campo `language`: `"texto"`

Campo `segments` (índices a partir de 0):

```json
[
  "Correios Rápidos:",
  "A encomenda CR-4471 não foi entregue.",
  "Motivo: morada incompleta.",
  "Atualize em http://cr-morada.test/pt",
  "Sem resposta em 12h, será devolvida."
]
```

Campo `answer` (índices inseguros): `[3,4]`

## Explicação (campo `explanation`)

O link aponta para um domínio estranho e o prazo curto serve para agires sem pensar. Abre a app ou o site oficial e procura lá o número da encomenda.

## Feito quando

```
node --test cards/ph-09/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
