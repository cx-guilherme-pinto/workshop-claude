# Cartão ph-04 — O nome não prova nada

- **Categoria:** phishing
- **Dificuldade:** 2
- **Modelo:** `spotTheFlaw` de `../../templates/spot-the-flaw.js`

## Conceito

O nome do remetente é texto livre; o que conta é o domínio depois do @.

## Enunciado (campo `prompt`)

O Banco Luz só envia emails de @bancoluz.example. Que remetentes são falsos?

## Conteúdo

Campo `language`: `"text"`

Campo `segments` (índices a partir de 0):

```json
[
  "Banco Luz <avisos@bancoluz.example>",
  "Banco Luz <extratos@bancoluz.example>",
  "Banco Luz <seguranca@bancoluz-example.test>",
  "Banco Luz <ajuda@bancoluz.example>",
  "Banco Luz <bancoluz.example@correio-gratis.test>"
]
```

Campo `answer` (índices inseguros): `[2,4]`

## Explicação (campo `explanation`)

Qualquer pessoa pode pôr 'Banco Luz' como nome. Olha para o que vem depois do @: só bancoluz.example é do banco.

## Feito quando

```
node --test cards/ph-04/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
