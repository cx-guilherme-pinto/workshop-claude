# Cartão cr-02 — O cookie em Base64

- **Categoria:** criptografia
- **Dificuldade:** 1
- **Modelo:** `resposta` de `../../templates/resposta.js`
- **Depende de:** lib-hash

## Conceito

Base64 é uma forma de escrever bytes como texto, não uma cifra: qualquer pessoa o reverte.

## Enunciado (campo `prompt`)

Este cookie parece cifrado, mas está só em Base64. O que diz depois de descodificado?

## Cenário (campo `scenario`)

```json
{
  "kind": "texto",
  "label": "Cookie guardado no browser",
  "lines": [
    "sessao=cGFwZWw9bGVpdG9y"
  ]
}
```

## Conteúdo

Campo `placeholder`: `Texto descodificado`

Lógica do `check` (em vez de `accept`):

O validate tem de usar a função deBase64 de ../../lib/hash.js: a resposta certa é deBase64('cGFwZWw9bGVpdG9y'). Compara com normalizar() dos dois lados.

Exemplo de resposta certa: `papel=leitor`

## Explicação (campo `explanation`)

Qualquer pessoa descodifica o cookie e pode trocá-lo por papel=admin. Guarda o papel no servidor ou assina o cookie, em vez de confiar no Base64.

## Feito quando

```
node --test cards/cr-02/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
