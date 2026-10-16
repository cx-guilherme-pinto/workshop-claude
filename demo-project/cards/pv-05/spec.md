# Cartão pv-05 — Dados a mais na newsletter

- **Categoria:** privacidade
- **Dificuldade:** 1
- **Modelo:** `clicaErro` de `../../templates/clica-erro.js`

## Conceito

Minimização: recolhe só os dados de que precisas para o fim anunciado.

## Enunciado (campo `prompt`)

Este formulário serve só para receber a newsletter. Que campos pedem dados a mais?

## Conteúdo

Campo `language`: `"texto"`

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
