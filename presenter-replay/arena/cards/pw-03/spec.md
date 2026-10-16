# Cartão pw-03 — Uma password, milhares de contas

- **Categoria:** passwords
- **Dificuldade:** 2
- **Modelo:** `escolha` de `../../templates/escolha.js`

## Conceito

Password spraying: testar uma password comum em muitas contas evita o bloqueio por tentativas falhadas.

## Enunciado (campo `prompt`)

Um atacante testa 'Verao2026!' uma única vez em cada uma das 5000 contas da Empresa Atlas. Como se chama este ataque?

## Conteúdo

Campo `options` (mantém os ids):

| id | text |
| --- | --- |
| a | Força bruta a uma só conta |
| b | Password spraying |
| c | Keylogger |
| d | Troca de SIM |

Campo `answer`: `"b"`

## Explicação (campo `explanation`)

Como cada conta só falha uma vez, o bloqueio nunca dispara. Recusa passwords comuns na criação e exige MFA.

## Feito quando

```
node --test cards/pw-03/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
