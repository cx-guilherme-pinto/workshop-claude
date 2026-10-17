# Cartão rd-01 — Duas redes no café

- **Categoria:** networks
- **Dificuldade:** 1
- **Modelo:** `choice` de `../../templates/choice.js`

## Conceito

Qualquer pessoa pode criar uma rede Wi-Fi com o nome de um café (evil twin).

## Enunciado (campo `prompt`)

No café aparecem as redes 'Cafe_Central' e 'Cafe_Central_Gratis'. O que fazes?

## Conteúdo

Campo `options` (mantém os ids):

| id | text |
| --- | --- |
| a | Escolho a grátis, é aberta |
| b | Pergunto ao balcão qual é a oficial e uso só sites com HTTPS |
| c | Escolho a que tem mais sinal |
| d | Tanto faz, o Wi-Fi é sempre cifrado |

Campo `answer`: `"b"`

## Explicação (campo `explanation`)

Uma rede falsa pode ver e alterar o tráfego que não for cifrado. Confirma o nome com o café, prefere HTTPS ou os dados móveis e evita operações sensíveis.

## Feito quando

```
node --test cards/rd-01/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
