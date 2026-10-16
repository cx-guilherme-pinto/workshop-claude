# Cartão rd-02 — Por onde passa o teu tráfego

- **Categoria:** redes
- **Dificuldade:** 2
- **Modelo:** `ordenar` de `../../templates/ordenar.js`

## Conceito

Cada ponto entre ti e o site pode ver para onde vais; o HTTPS esconde o conteúdo, não o destino.

## Enunciado (campo `prompt`)

Ordena o caminho de um pedido, do teu portátil até ao site.

## Conteúdo

Campo `items` (já baralhados; mantém esta ordem):

| id | text |
| --- | --- |
| a | Router de casa |
| b | Fornecedor de internet |
| c | Servidor do site |
| d | Portátil |

Campo `answer` (ordem certa): `["d","a","b","c"]`

## Explicação (campo `explanation`)

O router e o fornecedor de internet veem a que sites te ligas e quando, mesmo com HTTPS. O que o HTTPS garante é que o conteúdo e as passwords seguem cifrados até ao site.

## Feito quando

```
node --test cards/rd-02/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
