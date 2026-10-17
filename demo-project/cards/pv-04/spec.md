# Cartão pv-04 — Levar os dados contigo

- **Categoria:** privacy
- **Dificuldade:** 2
- **Modelo:** `answer` de `../../templates/answer.js`

## Conceito

O RGPD dá-te o direito de receber os teus dados num formato que outro serviço consegue ler.

## Enunciado (campo `prompt`)

Que direito do RGPD te deixa levar os teus dados para outro serviço, num formato legível por máquina?

## Conteúdo

Campo `placeholder`: `Nome do direito`

Campo `accept`: `["portabilidade","direito à portabilidade","portabilidade dos dados","direito de portabilidade"]`

Exemplo de resposta certa: `portabilidade`

## Explicação (campo `explanation`)

O direito à portabilidade (artigo 20.º) aplica-se aos dados que forneceste. Pede-os ao serviço e importa-os no novo.

## Feito quando

```
node --test cards/pv-04/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
