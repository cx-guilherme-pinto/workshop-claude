# Cartão es-08 — Phishing feito à medida

- **Categoria:** engenharia-social
- **Dificuldade:** 2
- **Modelo:** `resposta` de `../../templates/resposta.js`

## Conceito

Spear phishing: phishing dirigido a uma pessoa, com detalhes reais para parecer legítimo.

## Enunciado (campo `prompt`)

Um email usa o teu nome, o nome do teu chefe e o projeto em que trabalhas. Como se chama este tipo de phishing dirigido?

## Conteúdo

Campo `placeholder`: `Nome do ataque`

Campo `accept`: `["spear phishing","spear-phishing","spearphishing"]`

Exemplo de resposta certa: `spear phishing`

## Explicação (campo `explanation`)

Os detalhes vêm de redes sociais e de fugas de dados, por isso parecer pessoal não prova nada. Confirma pedidos invulgares por outro canal.

## Feito quando

```
node --test cards/es-08/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
