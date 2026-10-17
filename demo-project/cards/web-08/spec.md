# Cartão web-08 — A sessão do princípio ao fim

- **Categoria:** web
- **Dificuldade:** 2
- **Modelo:** `order` de `../../templates/order.js`

## Conceito

O id de sessão deve ser novo depois do login e destruído no logout.

## Enunciado (campo `prompt`)

Ordena o ciclo de uma sessão segura, do primeiro ao último passo.

## Conteúdo

Campo `items` (já baralhados; mantém esta ordem):

| id | text |
| --- | --- |
| a | O browser envia o cookie em cada pedido |
| b | O utilizador faz login com sucesso |
| c | O servidor cria um id de sessão novo e aleatório |
| d | No logout, o servidor apaga a sessão |

Campo `answer` (ordem certa): `["b","c","a","d"]`

## Explicação (campo `explanation`)

Criar o id só depois do login impede que um atacante te imponha um id que já conhece (fixação de sessão). No logout, apaga a sessão no servidor e não só o cookie.

## Feito quando

```
node --test cards/web-08/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
