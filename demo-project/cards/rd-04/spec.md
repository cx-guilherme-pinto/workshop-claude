# Cartão rd-04 — O que acontece ao abrir um site HTTPS

- **Categoria:** networks
- **Dificuldade:** 2
- **Modelo:** `order` de `../../templates/order.js`

## Conceito

Antes de qualquer dado seguir cifrado, o browser confirma o certificado do servidor.

## Enunciado (campo `prompt`)

Abres https://loja.example. Ordena os passos, do primeiro ao último.

## Conteúdo

Campo `items` (já baralhados; mantém esta ordem):

| id | text |
| --- | --- |
| a | O servidor envia o seu certificado |
| b | Abre-se a ligação TCP ao servidor |
| c | O DNS traduz loja.example num endereço IP |
| d | O pedido HTTP segue cifrado |
| e | O browser valida o certificado |

Campo `answer` (ordem certa): `["c","b","a","e","d"]`

## Explicação (campo `explanation`)

Se o certificado não for válido para loja.example, o browser para antes de enviar dados. Nunca ignores esse aviso.

## Feito quando

```
node --test cards/rd-04/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
