# Cartão cs-05 — Corrigir uma dependência vulnerável

- **Categoria:** secure-code
- **Dificuldade:** 2
- **Modelo:** `order` de `../../templates/order.js`

## Conceito

Uma dependência com uma falha conhecida corrige-se atualizando-a, com testes antes do deploy.

## Enunciado (campo `prompt`)

O npm audit avisa que uma dependência tem uma falha conhecida. Ordena os passos para a corrigir.

## Conteúdo

Campo `items` (já baralhados; mantém esta ordem):

| id | text |
| --- | --- |
| a | Atualizar a versão no package.json e no lockfile |
| b | Correr os testes |
| c | Ler o aviso e ver que versão corrige a falha |
| d | Fazer deploy |

Campo `answer` (ordem certa): `["c","a","b","d"]`

## Explicação (campo `explanation`)

Uma falha publicada é explorada depressa, por isso atualizar é urgente, mas os testes evitam partir a app. Automatiza os avisos com npm audit ou um bot de dependências.

## Feito quando

```
node --test cards/cs-05/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
