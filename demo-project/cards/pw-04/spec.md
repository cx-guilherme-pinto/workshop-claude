# Cartão pw-04 — Como guardar 80 passwords?

- **Categoria:** passwords
- **Dificuldade:** 1
- **Modelo:** `escolha` de `../../templates/escolha.js`

## Conceito

Um gestor de passwords cria e guarda uma password única e forte para cada site.

## Enunciado (campo `prompt`)

Tens 80 contas online. Qual é a forma mais segura de ter uma password diferente em cada uma?

## Conteúdo

Campo `options` (mantém os ids):

| id | text |
| --- | --- |
| a | Um caderno na secretária do escritório |
| b | Uma folha de cálculo chamada passwords.xlsx |
| c | Um gestor de passwords protegido por uma frase-passe e MFA |
| d | Uma password base com o nome do site no fim |

Campo `answer`: `"c"`

## Explicação (campo `explanation`)

O gestor gera passwords longas e aleatórias e só tens de decorar uma frase-passe. Protege-a com MFA, porque passa a ser a chave de tudo.

## Feito quando

```
node --test cards/pw-04/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
