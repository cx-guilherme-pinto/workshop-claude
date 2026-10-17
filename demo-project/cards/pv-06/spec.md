# Cartão pv-06 — Pedir os teus dados a uma empresa

- **Categoria:** privacy
- **Dificuldade:** 2
- **Modelo:** `order` de `../../templates/order.js`

## Conceito

O direito de acesso deixa-te saber que dados uma empresa tem sobre ti.

## Enunciado (campo `prompt`)

Queres saber que dados a TelcoNet guarda sobre ti. Ordena os passos.

## Conteúdo

Campo `items` (já baralhados; mantém esta ordem):

| id | text |
| --- | --- |
| a | Recebes uma cópia dos dados, em regra até um mês |
| b | Descobres o contacto do encarregado de proteção de dados |
| c | Pedes a correção do que estiver errado |
| d | Envias o pedido de acesso por escrito |

Campo `answer` (ordem certa): `["b","d","a","c"]`

## Explicação (campo `explanation`)

O contacto do encarregado de proteção de dados está na política de privacidade. A empresa tem, em regra, um mês para responder, e podes pedir a correção do que estiver errado.

## Feito quando

```
node --test cards/pv-06/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
