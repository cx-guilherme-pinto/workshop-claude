# Cartão sc-05 — O bucket público

- **Categoria:** cloud-secrets
- **Dificuldade:** 1
- **Modelo:** `choice` de `../../templates/choice.js`

## Conceito

Um bucket com leitura pública fica acessível a qualquer pessoa na internet.

## Enunciado (campo `prompt`)

O bucket atlas-backups tem a leitura pública ativa. Quem consegue ler os backups?

## Conteúdo

Campo `options` (mantém os ids):

| id | text |
| --- | --- |
| a | Só a equipa da Empresa Atlas |
| b | Qualquer pessoa na internet que saiba ou adivinhe o nome |
| c | Ninguém, os buckets são sempre privados |
| d | Só quem tiver conta no mesmo fornecedor |

Campo `answer`: `"b"`

## Explicação (campo `explanation`)

Há quem procure buckets abertos de forma automática, testando nomes previsíveis. Ativa o bloqueio de acesso público e dá acesso só a contas concretas.

## Feito quando

```
node --test cards/sc-05/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
