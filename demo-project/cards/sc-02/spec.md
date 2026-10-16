# Cartão sc-02 — Apaguei a chave no commit seguinte

- **Categoria:** segredos-cloud
- **Dificuldade:** 2
- **Modelo:** `escolha` de `../../templates/escolha.js`

## Conceito

O que entra no git fica no histórico; uma chave exposta tem de ser revogada.

## Enunciado (campo `prompt`)

Fizeste commit de uma chave de API e apagaste-a no commit seguinte. Está resolvido?

## Conteúdo

Campo `options` (mantém os ids):

| id | text |
| --- | --- |
| a | Sim, já não está no código |
| b | Não: fica no histórico; revoga a chave e cria outra |
| c | Sim, se o repositório for privado |
| d | Basta mudar o nome da variável |

Campo `answer`: `"b"`

## Explicação (campo `explanation`)

Qualquer clone ou fork guarda o commit antigo, e há robôs que procuram chaves em repositórios públicos. Revoga já a chave e só depois limpa o histórico.

## Feito quando

```
node --test cards/sc-02/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
