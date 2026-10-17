# Cartão pw-10 — Entrar sem password

- **Categoria:** passwords
- **Dificuldade:** 2
- **Modelo:** `answer` de `../../templates/answer.js`

## Conceito

Uma passkey troca a password por um par de chaves: a chave privada nunca sai do teu dispositivo.

## Enunciado (campo `prompt`)

Que nome tem a credencial que substitui a password por um par de chaves guardado no telemóvel ou no computador?

## Conteúdo

Campo `placeholder`: `Uma palavra`

Campo `accept`: `["passkey","passkeys","chave de acesso","chaves de acesso"]`

Exemplo de resposta certa: `passkey`

## Explicação (campo `explanation`)

A passkey só funciona no domínio verdadeiro e o servidor guarda apenas a chave pública, por isso não há segredo para roubar. Ativa-a nos sites que a oferecem.

## Feito quando

```
node --test cards/pw-10/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
