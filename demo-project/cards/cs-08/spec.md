# Cartão cs-08 — Tentativas sem limite

- **Categoria:** secure-code
- **Dificuldade:** 2
- **Modelo:** `choice` de `../../templates/choice.js`

## Conceito

Sem limite de tentativas, o login fica aberto a ataques de força bruta.

## Enunciado (campo `prompt`)

O endpoint /login aceita pedidos sem limite. Que ataque fica mais fácil?

## Conteúdo

Campo `options` (mantém os ids):

| id | text |
| --- | --- |
| a | Força bruta de passwords |
| b | XSS |
| c | Path traversal |
| d | Nenhum, o login está protegido pela password |

Campo `answer`: `"a"`

## Explicação (campo `explanation`)

Um robô pode testar milhares de passwords por minuto. Limita as tentativas por conta e por IP e acrescenta atrasos crescentes.

## Feito quando

```
node --test cards/cs-08/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
