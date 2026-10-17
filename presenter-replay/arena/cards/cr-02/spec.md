# Cartão cr-02 — O cookie em Base64

- **Categoria:** cryptography
- **Dificuldade:** 1
- **Modelo:** `answer` de `../../templates/answer.js`
- **Depende de:** lib-hash

## Conceito

Base64 é uma forma de escrever bytes como texto, não uma cifra: qualquer pessoa o reverte.

## Enunciado (campo `prompt`)

Este cookie parece cifrado, mas está só em Base64. O que diz depois de descodificado?

## Cenário (campo `scenario`)

```json
{
  "kind": "text",
  "label": "Cookie guardado no browser",
  "lines": [
    "sessao=cGFwZWw9bGVpdG9y"
  ]
}
```

## Conteúdo

Campo `placeholder`: `Texto descodificado`

Lógica do `check` (em vez de `accept`):

O validate tem de usar a função fromBase64 de ../../lib/hash.js: a resposta certa é fromBase64('cGFwZWw9bGVpdG9y'). Compara com normalize() dos dois lados.

Exemplo de resposta certa: `papel=leitor`

## Explicação (campo `explanation`)

Qualquer pessoa descodifica o cookie e pode trocá-lo por papel=admin. Guarda o papel no servidor ou assina o cookie, em vez de confiar no Base64.

## Feito quando

```
node --test cards/cr-02/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
