# Cartão es-01 — O pedido urgente do diretor

- **Categoria:** engenharia-social
- **Dificuldade:** 1
- **Modelo:** `escolha` de `../../templates/escolha.js`

## Conceito

Fraude do CEO: alguém finge ser um chefe para pedir uma transferência urgente e secreta.

## Enunciado (campo `prompt`)

Este email chegou à contabilidade da Empresa Atlas. O que fazes?

## Cenário (campo `scenario`)

```json
{
  "kind": "email",
  "label": "Email recebido",
  "lines": [
    "De: Diretor-geral <dg.atlas@correio-rapido.test>",
    "Preciso de uma transferência urgente de 18 000 € para um fornecedor novo.",
    "Estou numa reunião, não me ligues. Responde só por email."
  ]
}
```

## Conteúdo

Campo `options` (mantém os ids):

| id | text |
| --- | --- |
| a | Faço a transferência, é o diretor |
| b | Confirmo por telefone, para o número interno que já conheço |
| c | Respondo ao email a pedir mais detalhes |
| d | Peço a um colega para fazer a transferência |

Campo `answer`: `"b"`

## Explicação (campo `explanation`)

Urgência, segredo e um endereço de fora da empresa são os sinais clássicos. Confirma sempre por um canal que já conheces, nunca pelo que vem na mensagem.

## Feito quando

```
node --test cards/es-01/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
