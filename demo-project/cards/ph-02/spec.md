# Cartão ph-02 — O que denuncia este email?

- **Categoria:** phishing
- **Dificuldade:** 1
- **Modelo:** `choice` de `../../templates/choice.js`

## Conceito

Pressa e links para outro domínio são os sinais mais comuns de phishing.

## Enunciado (campo `prompt`)

Este email chegou hoje. Qual é o sinal mais forte de que é phishing?

## Cenário (campo `scenario`)

```json
{
  "kind": "email",
  "label": "Caixa de entrada",
  "lines": [
    "De: Correios Rápidos <avisos@correios-rapidos.example>",
    "Assunto: A sua encomenda foi retida",
    "Pague 1,99 € nas próximas 2 horas ou a encomenda é devolvida.",
    "Pagar agora: http://cr-pagamentos.test/pt"
  ]
}
```

## Conteúdo

Campo `options` (mantém os ids):

| id | text |
| --- | --- |
| a | O valor é baixo |
| b | O prazo de 2 horas e o link para outro domínio |
| c | O email tem assunto |
| d | Fala de uma encomenda |

Campo `answer`: `"b"`

## Explicação (campo `explanation`)

A pressa serve para não pensares, e o link leva a cr-pagamentos.test, que não é dos Correios Rápidos. Abre o site oficial à mão e confirma lá a encomenda.

## Feito quando

```
node --test cards/ph-02/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
