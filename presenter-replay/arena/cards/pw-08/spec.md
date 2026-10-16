# Cartão pw-08 — O teu email apareceu numa fuga

- **Categoria:** passwords
- **Dificuldade:** 1
- **Modelo:** `escolha` de `../../templates/escolha.js`

## Conceito

Quando uma conta aparece numa fuga, muda-se a password nesse site e em todos onde se repetia.

## Enunciado (campo `prompt`)

Um serviço de verificação de fugas diz que o teu email apareceu na fuga de uma loja online. O que fazes primeiro?

## Conteúdo

Campo `options` (mantém os ids):

| id | text |
| --- | --- |
| a | Apago o email e crio outro |
| b | Mudo a password dessa loja e de onde a reutilizei |
| c | Nada, a fuga já foi há meses |
| d | Respondo ao aviso com a password para confirmar |

Campo `answer`: `"b"`

## Explicação (campo `explanation`)

As listas de fugas circulam durante anos, por isso a password exposta deixa de servir. Muda-a onde quer que se repita e ativa MFA nessas contas.

## Feito quando

```
node --test cards/pw-08/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
