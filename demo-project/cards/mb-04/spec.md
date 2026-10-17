# Cartão mb-04 — A atualização pendente

- **Categoria:** mobile
- **Dificuldade:** 1
- **Modelo:** `choice` de `../../templates/choice.js`

## Conceito

As atualizações de segurança corrigem falhas que os atacantes já conhecem.

## Enunciado (campo `prompt`)

O telemóvel tem uma atualização de segurança pendente há três semanas. O que fazes?

## Conteúdo

Campo `options` (mantém os ids):

| id | text |
| --- | --- |
| a | Espero pela próxima versão grande |
| b | Instalo assim que puder |
| c | Só atualizo se notar problemas |
| d | Desligo as atualizações |

Campo `answer`: `"b"`

## Explicação (campo `explanation`)

Quando a correção sai, a falha fica pública e os ataques aumentam. Ativa as atualizações automáticas e troca de telemóvel quando deixar de as receber.

## Feito quando

```
node --test cards/mb-04/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
