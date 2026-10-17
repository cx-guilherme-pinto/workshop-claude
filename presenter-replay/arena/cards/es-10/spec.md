# Cartão es-10 — O golpe do número novo

- **Categoria:** social-engineering
- **Dificuldade:** 1
- **Modelo:** `order` de `../../templates/order.js`

## Conceito

O golpe do 'mudei de número' usa a confiança da família para pedir dinheiro com pressa.

## Enunciado (campo `prompt`)

Ordena as fases deste golpe por mensagem, da primeira à última.

## Conteúdo

Campo `items` (já baralhados; mantém esta ordem):

| id | text |
| --- | --- |
| a | Escreve: 'Olá mãe, este é o meu número novo' |
| b | Pede dinheiro para pagar uma conta urgente |
| c | A vítima transfere sem confirmar por voz |
| d | Diz que o telemóvel antigo avariou e que não pode ligar |

Campo `answer` (ordem certa): `["a","d","b","c"]`

## Explicação (campo `explanation`)

A desculpa para não poder ligar é o ponto-chave. Liga para o número antigo ou faz uma pergunta que só a pessoa verdadeira saiba responder.

## Feito quando

```
node --test cards/es-10/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
