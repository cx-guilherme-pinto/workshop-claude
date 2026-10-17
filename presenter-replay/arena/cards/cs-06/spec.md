# Cartão cs-06 — Valores separados do SQL

- **Categoria:** secure-code
- **Dificuldade:** 2
- **Modelo:** `answer` de `../../templates/answer.js`

## Conceito

Consultas parametrizadas enviam o SQL e os valores em separado, e a base de dados nunca os mistura.

## Enunciado (campo `prompt`)

Como se chama a técnica de escrever o SQL com marcadores (como ?) e enviar os valores à parte?

## Conteúdo

Campo `placeholder`: `Nome da técnica`

Campo `accept`: `["consultas parametrizadas","consulta parametrizada","queries parametrizadas","query parametrizada","prepared statements","prepared statement","instruções preparadas","parametrização"]`

Exemplo de resposta certa: `consultas parametrizadas`

## Explicação (campo `explanation`)

O valor nunca é lido como SQL, por isso ' OR '1'='1 fica só texto. Usa-as em todas as consultas, mesmo nas que parecem seguras.

## Feito quando

```
node --test cards/cs-06/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
