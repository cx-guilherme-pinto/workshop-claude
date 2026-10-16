# Cartão es-09 — O fornecedor mudou de banco

- **Categoria:** engenharia-social
- **Dificuldade:** 2
- **Modelo:** `clicaErro` de `../../templates/clica-erro.js`

## Conceito

Fraude do IBAN: um email pede para pagar a uma conta nova e evita qualquer confirmação.

## Enunciado (campo `prompt`)

Este email parece vir de um fornecedor habitual. Que linhas são sinais de fraude?

## Conteúdo

Campo `language`: `"texto"`

Campo `segments` (índices a partir de 0):

```json
[
  "De: Fornecedor Atlas <contas@atlas-fornecimentos.test>",
  "Bom dia, segue a fatura de outubro.",
  "Mudámos de banco: paguem já para o novo IBAN em anexo.",
  "Não liguem, a linha está em manutenção.",
  "Cumprimentos, Departamento Financeiro"
]
```

Campo `answer` (índices inseguros): `[2,3]`

## Explicação (campo `explanation`)

Uma mudança de IBAN com um pedido para não ligarem é o padrão desta fraude. Confirma sempre por telefone, para um número que já tinhas.

## Feito quando

```
node --test cards/es-09/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
