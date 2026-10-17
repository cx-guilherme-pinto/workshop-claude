# Cartão ph-03 — O anexo disfarçado

- **Categoria:** phishing
- **Dificuldade:** 1
- **Modelo:** `spotTheFlaw` de `../../templates/spot-the-flaw.js`

## Conceito

Uma extensão dupla esconde um programa atrás de um nome que parece um documento.

## Enunciado (campo `prompt`)

Estes anexos chegaram de um fornecedor. Qual é um programa disfarçado?

## Conteúdo

Campo `language`: `"text"`

Campo `segments` (índices a partir de 0):

```json
[
  "relatorio_marco.pdf",
  "fatura_0423.pdf.exe",
  "fotos_evento.jpg",
  "contrato.docx",
  "orcamento.xlsx"
]
```

Campo `answer` (índices inseguros): `[1]`

## Explicação (campo `explanation`)

O que conta é a última extensão: .exe é um programa. Ativa a opção de mostrar as extensões e nunca abras executáveis recebidos por email.

## Feito quando

```
node --test cards/ph-03/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
