# Cartão ph-08 — Ativar o conteúdo?

- **Categoria:** phishing
- **Dificuldade:** 2
- **Modelo:** `choice` de `../../templates/choice.js`

## Conceito

As macros de um documento são código; ativá-las pode instalar malware.

## Enunciado (campo `prompt`)

Um documento recebido por email diz: 'Ative o conteúdo para ver a fatura.' O que fazes?

## Conteúdo

Campo `options` (mantém os ids):

| id | text |
| --- | --- |
| a | Ativo, senão não vejo a fatura |
| b | Fecho e confirmo com o remetente por outro canal |
| c | Reencaminho para um colega abrir |
| d | Guardo e abro mais tarde |

Campo `answer`: `"b"`

## Explicação (campo `explanation`)

Uma fatura verdadeira não precisa de macros para ser lida. Fecha o ficheiro e confirma com o remetente por telefone ou pelo portal oficial.

## Feito quando

```
node --test cards/ph-08/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
