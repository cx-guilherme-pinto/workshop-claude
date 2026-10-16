# Cartão es-05 — A história da migração

- **Categoria:** engenharia-social
- **Dificuldade:** 1
- **Modelo:** `clicaErro` de `../../templates/clica-erro.js`

## Conceito

Pretexting: uma história credível serve para pedir algo que nunca se deve dar.

## Enunciado (campo `prompt`)

Recebeste estas mensagens no chat da empresa. Que trechos são sinais de alerta?

## Conteúdo

Campo `language`: `"texto"`

Campo `segments` (índices a partir de 0):

```json
[
  "Olá, sou o Rui da informática.",
  "Estamos a migrar as contas de email hoje.",
  "Preciso da tua password para copiar a tua caixa.",
  "O diretor quer isto feito até às 17h.",
  "Obrigado pela ajuda!"
]
```

Campo `answer` (índices inseguros): `[2,3]`

## Explicação (campo `explanation`)

A informática nunca precisa da tua password, e a pressa de um chefe serve para não pensares. Confirma o pedido por outro canal e reporta-o.

## Feito quando

```
node --test cards/es-05/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
