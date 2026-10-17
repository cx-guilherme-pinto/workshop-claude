# Cartão ph-10 — A app pede acesso ao teu email

- **Categoria:** phishing
- **Dificuldade:** 3
- **Modelo:** `choice` de `../../templates/choice.js`

## Conceito

Phishing de consentimento: em vez da password, o atacante pede autorização para uma app entrar na tua conta.

## Enunciado (campo `prompt`)

Ao abrir um PDF partilhado, uma app pede: 'Ler, enviar e apagar emails em teu nome'. O que fazes?

## Conteúdo

Campo `options` (mantém os ids):

| id | text |
| --- | --- |
| a | Aceito, todas as apps pedem isto |
| b | Recuso e reporto: um leitor de PDF não precisa do teu email |
| c | Aceito e depois mudo a password |
| d | Aceito só desta vez |

Campo `answer`: `"b"`

## Explicação (campo `explanation`)

A autorização dá à app um token próprio, que pode continuar válido mesmo depois de mudares a password. Recusa pedidos desproporcionados e revoga apps suspeitas nas definições da conta.

## Feito quando

```
node --test cards/ph-10/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
