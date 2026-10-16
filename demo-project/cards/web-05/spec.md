# Cartão web-05 — Para onde vais depois do login?

- **Categoria:** web
- **Dificuldade:** 2
- **Modelo:** `escolha` de `../../templates/escolha.js`

## Conceito

Open redirect: o site reencaminha para qualquer endereço que venha no URL.

## Enunciado (campo `prompt`)

Depois do login, a loja manda-te para o endereço do parâmetro voltar: https://loja.example/login?voltar=https://loja-falsa.test. Qual é o risco?

## Conteúdo

Campo `options` (mantém os ids):

| id | text |
| --- | --- |
| a | Nenhum, o login é na loja verdadeira |
| b | Acabas num site falso que parece a loja |
| c | O login fica mais lento |
| d | Os cookies são apagados |

Campo `answer`: `"b"`

## Explicação (campo `explanation`)

O link começa no domínio verdadeiro, o que dá confiança, e depois leva a vítima para o site falso. Aceita só caminhos internos, como /conta, ou uma lista fixa de destinos.

## Feito quando

```
node --test cards/web-05/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
