# Cartão sc-10 — Como a app chega à base de dados

- **Categoria:** cloud-secrets
- **Dificuldade:** 2
- **Modelo:** `choice` de `../../templates/choice.js`

## Conceito

Credenciais temporárias, dadas pela cloud a um serviço, evitam chaves fixas que podem vazar.

## Enunciado (campo `prompt`)

Uma app na cloud precisa de ler uma base de dados. Que credencial é mais segura?

## Conteúdo

Campo `options` (mantém os ids):

| id | text |
| --- | --- |
| a | Uma chave de acesso fixa no código |
| b | Uma função (role) com credenciais temporárias geridas pela cloud |
| c | A password do administrador partilhada pela equipa |
| d | Uma chave num ficheiro no ambiente de trabalho |

Campo `answer`: `"b"`

## Explicação (campo `explanation`)

As credenciais temporárias expiram sozinhas e não há nada fixo para roubar do código. Dá à função só as permissões de leitura de que a app precisa.

## Feito quando

```
node --test cards/sc-10/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
