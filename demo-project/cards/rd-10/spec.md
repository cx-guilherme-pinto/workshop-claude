# Cartão rd-10 — Aviso de certificado

- **Categoria:** networks
- **Dificuldade:** 1
- **Modelo:** `choice` de `../../templates/choice.js`

## Conceito

Um aviso de certificado pode ser sinal de que alguém está a intercetar a ligação.

## Enunciado (campo `prompt`)

No Wi-Fi do hotel, o browser avisa 'A ligação não é privada' ao abrir loja.example. O que fazes?

## Conteúdo

Campo `options` (mantém os ids):

| id | text |
| --- | --- |
| a | Carrego em 'Avançar mesmo assim' |
| b | Saio da página e não escrevo dados |
| c | Recarrego até o aviso desaparecer |
| d | Desligo o antivírus |

Campo `answer`: `"b"`

## Explicação (campo `explanation`)

Um certificado inválido pode querer dizer que alguém se pôs no meio da ligação. Sai, usa os dados móveis e tenta mais tarde.

## Feito quando

```
node --test cards/rd-10/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
