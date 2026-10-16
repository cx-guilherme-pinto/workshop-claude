# Cartão cr-10 — Números ao acaso a sério

- **Categoria:** criptografia
- **Dificuldade:** 2
- **Modelo:** `escolha` de `../../templates/escolha.js`

## Conceito

Tokens de segurança precisam de um gerador aleatório criptográfico, não de Math.random().

## Enunciado (campo `prompt`)

Vais gerar o token de um link de recuperação de password. Qual usas?

## Conteúdo

Campo `options` (mantém os ids):

| id | text |
| --- | --- |
| a | Math.random() |
| b | Date.now() |
| c | crypto.getRandomValues() |
| d | O email do utilizador em Base64 |

Campo `answer`: `"c"`

## Explicação (campo `explanation`)

Math.random() e a hora são previsíveis e o Base64 do email adivinha-se. Usa crypto.getRandomValues() ou crypto.randomBytes() com pelo menos 128 bits.

## Feito quando

```
node --test cards/cr-10/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
