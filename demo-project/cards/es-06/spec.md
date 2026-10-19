# Cartão es-06 — As fases de um ataque de engenharia social

- **Categoria:** social-engineering
- **Dificuldade:** 2
- **Modelo:** `order` de `../../templates/order.js`

## Conceito

Um ataque de engenharia social começa muito antes do contacto: com pesquisa sobre o alvo.

## Enunciado (campo `prompt`)

Ordena as fases do ataque, da primeira à última.

## Conteúdo

Campo `items` (já baralhados; mantém esta ordem):

| id | text |
| --- | --- |
| a | Pesquisar o alvo nas redes sociais e no site da empresa |
| b | Pedir o acesso, os dados ou o dinheiro |
| c | Sair sem deixar rasto |
| d | Criar confiança com uma história credível |

Campo `answer` (ordem certa): `["a","d","b","c"]`

## Explicação (campo `explanation`)

Quanto mais o atacante sabe sobre ti, mais credível é a história. Partilha menos detalhes do trabalho em público.

## Feito quando

```
node --test cards/es-06/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
