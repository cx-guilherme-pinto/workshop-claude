# Cartão es-04 — 15 pedidos de aprovação

- **Categoria:** engenharia-social
- **Dificuldade:** 2
- **Modelo:** `escolha` de `../../templates/escolha.js`

## Conceito

Fadiga de MFA: o atacante já tem a password e envia pedidos até alguém aprovar.

## Enunciado (campo `prompt`)

O teu telemóvel mostra 15 pedidos seguidos para aprovar um login que não fizeste. O que fazes?

## Conteúdo

Campo `options` (mantém os ids):

| id | text |
| --- | --- |
| a | Aprovo um para pararem |
| b | Recuso todos, mudo a password e aviso a equipa de segurança |
| c | Desligo o telemóvel e espero |
| d | Desinstalo a app autenticadora |

Campo `answer`: `"b"`

## Explicação (campo `explanation`)

Os pedidos mostram que alguém já sabe a tua password. Recusa, muda-a já e pede MFA com correspondência de números ou uma chave física.

## Feito quando

```
node --test cards/es-04/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
