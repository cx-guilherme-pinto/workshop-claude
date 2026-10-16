# Cartão es-03 — O banco ao telefone

- **Categoria:** engenharia-social
- **Dificuldade:** 1
- **Modelo:** `resposta` de `../../templates/resposta.js`

## Conceito

Vishing: burla por chamada de voz em que o burlão finge ser do banco ou do apoio técnico.

## Enunciado (campo `prompt`)

Liga alguém do 'apoio do Banco Luz' e pede o código que acabaste de receber por SMS. Quantas vezes um banco a sério te pede esse código ao telefone?

## Conteúdo

Campo `placeholder`: `Uma palavra`

Campo `accept`: `["nunca","0","zero","nenhuma","nenhuma vez","jamais"]`

Exemplo de resposta certa: `nunca`

## Explicação (campo `explanation`)

O código serve para tu aprovares uma operação; quem o pede quer aprová-la por ti. Desliga e liga para o número que está no verso do cartão.

## Feito quando

```
node --test cards/es-03/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
