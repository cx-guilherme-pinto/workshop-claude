# Cartão cs-10 — Versões fixas

- **Categoria:** codigo-seguro
- **Dificuldade:** 2
- **Modelo:** `resposta` de `../../templates/resposta.js`

## Conceito

O lockfile fixa as versões exatas de todas as dependências, incluindo as indiretas.

## Enunciado (campo `prompt`)

No npm, que ficheiro fixa as versões exatas de todas as dependências instaladas?

## Conteúdo

Campo `placeholder`: `Nome do ficheiro`

Campo `accept`: `["package-lock.json","package-lock","lockfile"]`

Exemplo de resposta certa: `package-lock.json`

## Explicação (campo `explanation`)

Com o lockfile no git, todos instalam exatamente o mesmo código, que é o que foi auditado. Usa npm ci no CI e revê as mudanças do lockfile.

## Feito quando

```
node --test cards/cs-10/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
