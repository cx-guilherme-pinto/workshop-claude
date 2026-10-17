# Cartão sc-06 — A vida de um segredo

- **Categoria:** cloud-secrets
- **Dificuldade:** 2
- **Modelo:** `order` de `../../templates/order.js`

## Conceito

Um segredo tem ciclo de vida: cria-se num cofre, roda-se com regularidade e revoga-se no fim.

## Enunciado (campo `prompt`)

Ordena o ciclo de vida de uma chave de API, do primeiro ao último passo.

## Conteúdo

Campo `items` (já baralhados; mantém esta ordem):

| id | text |
| --- | --- |
| a | Dar acesso só ao serviço que a usa |
| b | Revogar a chave quando o serviço é desligado |
| c | Rodar a chave com regularidade |
| d | Criar a chave no cofre de segredos |

Campo `answer` (ordem certa): `["d","a","c","b"]`

## Explicação (campo `explanation`)

Rodar limita o tempo em que uma chave roubada serve, e revogar no fim evita chaves esquecidas. Automatiza a rotação no cofre de segredos.

## Feito quando

```
node --test cards/sc-06/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
