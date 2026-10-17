# Cartão mb-03 — A app de limpeza quer acessibilidade

- **Categoria:** mobile
- **Dificuldade:** 2
- **Modelo:** `choice` de `../../templates/choice.js`

## Conceito

O serviço de acessibilidade deixa uma app ler o ecrã e carregar em botões por ti.

## Enunciado (campo `prompt`)

Uma app para 'limpar o telemóvel' pede acesso ao serviço de acessibilidade. Porque é perigoso?

## Conteúdo

Campo `options` (mantém os ids):

| id | text |
| --- | --- |
| a | Gasta muita bateria |
| b | Deixa a app ler o ecrã e carregar em botões por ti |
| c | Muda o tamanho da letra |
| d | Não é perigoso |

Campo `answer`: `"b"`

## Explicação (campo `explanation`)

Com este acesso, uma app maliciosa lê códigos e aprova pagamentos sem tu veres. Dá-o só a apps de acessibilidade em que confias.

## Feito quando

```
node --test cards/mb-03/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
