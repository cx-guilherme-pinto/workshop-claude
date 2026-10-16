# Cartão pw-09 — A pergunta de segurança

- **Categoria:** passwords
- **Dificuldade:** 2
- **Modelo:** `escolha` de `../../templates/escolha.js`

## Conceito

As respostas verdadeiras a perguntas de segurança encontram-se muitas vezes nas redes sociais.

## Enunciado (campo `prompt`)

Um site pede uma resposta para 'Nome do primeiro animal de estimação'. Qual é a melhor opção?

## Conteúdo

Campo `options` (mantém os ids):

| id | text |
| --- | --- |
| a | O nome verdadeiro do animal |
| b | Uma resposta inventada e aleatória, guardada no gestor de passwords |
| c | O nome do animal com 123 no fim |
| d | A mesma resposta que uso noutros sites |

Campo `answer`: `"b"`

## Explicação (campo `explanation`)

Quem te segue nas redes sociais pode saber o nome do teu animal. Trata a resposta como uma password: aleatória e guardada no gestor.

## Feito quando

```
node --test cards/pw-09/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
