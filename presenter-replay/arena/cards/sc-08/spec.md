# Cartão sc-08 — A conta root da cloud

- **Categoria:** segredos-cloud
- **Dificuldade:** 1
- **Modelo:** `resposta` de `../../templates/resposta.js`

## Conceito

A conta principal da cloud controla tudo e precisa da proteção mais forte.

## Enunciado (campo `prompt`)

A conta root da cloud da Empresa Atlas só tem password. Que proteção deves ativar já?

## Conteúdo

Campo `placeholder`: `Sigla`

Campo `accept`: `["MFA","2FA","autenticação multifator","autenticação de dois fatores","dois fatores"]`

Exemplo de resposta certa: `MFA`

## Explicação (campo `explanation`)

Quem entrar na conta root pode apagar tudo ou criar recursos à tua custa. Ativa MFA com uma chave física e usa contas com menos permissões no dia a dia.

## Feito quando

```
node --test cards/sc-08/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
