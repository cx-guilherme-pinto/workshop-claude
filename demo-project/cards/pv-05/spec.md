# Cartão pv-05 — Dados a mais na newsletter

- **Categoria:** privacy
- **Dificuldade:** 1
- **Modelo:** `spotTheFlaw` de `../../templates/spot-the-flaw.js`

## Conceito

Minimização: recolhe só os dados de que precisas para o fim anunciado.

## Enunciado (campo `prompt`)

Este formulário serve só para receber a newsletter. Que campos pedem dados a mais?

## Conteúdo

Campo `language`: `"text"`

Campo `segments` (índices a partir de 0):

```json
[
  "Email",
  "Nome (opcional)",
  "Número do cartão de cidadão",
  "Data de nascimento completa",
  "Aceito receber a newsletter"
]
```

Campo `answer` (índices inseguros): `[2,3]`

## Explicação (campo `explanation`)

Para enviar uma newsletter basta o email. Dados que não recolhes não podem ser roubados numa fuga.

## Feito quando

```
node --test cards/pv-05/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
