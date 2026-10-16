# Cartão mb-10 — O que se vê no ecrã bloqueado

- **Categoria:** mobile
- **Dificuldade:** 1
- **Modelo:** `clicaErro` de `../../templates/clica-erro.js`

## Conceito

Notificações no ecrã bloqueado podem mostrar códigos a quem pegar no telemóvel.

## Enunciado (campo `prompt`)

Este é o ecrã bloqueado do teu telemóvel. Que notificação não devia aparecer assim?

## Conteúdo

Campo `language`: `"texto"`

Campo `segments` (índices a partir de 0):

```json
[
  "10:42 · Bateria 80%",
  "Banco Luz: o seu código de confirmação é 482913",
  "Rui: chego às 8",
  "Calendário: reunião às 15h"
]
```

Campo `answer` (índices inseguros): `[1]`

## Explicação (campo `explanation`)

Quem pegar no telemóvel lê o código sem o desbloquear. Configura as notificações para esconder o conteúdo no ecrã bloqueado.

## Feito quando

```
node --test cards/mb-10/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
