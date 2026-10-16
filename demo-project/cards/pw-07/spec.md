# Cartão pw-07 — Como funciona o credential stuffing

- **Categoria:** passwords
- **Dificuldade:** 2
- **Modelo:** `ordenar` de `../../templates/ordenar.js`

## Conceito

Credential stuffing: pares de email e password roubados num site são testados em muitos outros.

## Enunciado (campo `prompt`)

Ordena as fases deste ataque, da primeira à última.

## Conteúdo

Campo `items` (já baralhados; mantém esta ordem):

| id | text |
| --- | --- |
| a | Entram nas contas onde a password foi reutilizada |
| b | Os atacantes testam os pares em lojas, bancos e email |
| c | Um fórum sofre uma fuga de emails e passwords |
| d | A lista de pares é vendida ou publicada |

Campo `answer` (ordem certa): `["c","d","b","a"]`

## Explicação (campo `explanation`)

O ataque só resulta onde a password se repete. Uma password diferente em cada site e MFA travam-no.

## Feito quando

```
node --test cards/pw-07/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
