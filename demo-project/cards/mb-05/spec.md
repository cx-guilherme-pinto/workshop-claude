# Cartão mb-05 — Como se rouba um número de telemóvel

- **Categoria:** mobile
- **Dificuldade:** 2
- **Modelo:** `ordenar` de `../../templates/ordenar.js`

## Conceito

Troca de SIM: o atacante convence a operadora a passar o teu número para um cartão dele.

## Enunciado (campo `prompt`)

Ordena as fases de um ataque de troca de SIM, da primeira à última.

## Conteúdo

Campo `items` (já baralhados; mantém esta ordem):

| id | text |
| --- | --- |
| a | A operadora ativa o número num SIM novo |
| b | Liga para a operadora e faz-se passar pela vítima |
| c | O atacante recebe os códigos por SMS da vítima |
| d | Recolhe dados pessoais da vítima |

Campo `answer` (ordem certa): `["d","b","a","c"]`

## Explicação (campo `explanation`)

Depois da troca, todos os códigos por SMS vão para o atacante. Pede à tua operadora, como a TelcoNet, um PIN para alterações e usa uma app autenticadora em vez de SMS.

## Feito quando

```
node --test cards/mb-05/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
