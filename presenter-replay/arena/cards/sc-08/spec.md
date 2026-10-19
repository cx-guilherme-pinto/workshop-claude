# Cartão sc-08 — O segredo de produção

- **Categoria:** cloud-secrets
- **Dificuldade:** 2
- **Modelo:** `answer` de `../../templates/answer.js`

## Conceito

Autorização: ter sessão iniciada não quer dizer que possas ler todos os segredos.

## Enunciado (campo `prompt`)

Uma programadora com sessão iniciada pede à API de segredos da Empresa Atlas GET /secrets/prod-db-password, mas não tem permissão para os segredos de produção. Que código HTTP deve a API devolver?

## Conteúdo

Campo `placeholder`: `Código HTTP de 3 algarismos`

Campo `accept`: `["404","404 Not Found","Not Found","HTTP 404"]`

Exemplo de resposta certa: `404`

## Explicação (campo `explanation`)

O nome de um segredo já diz muito (prod-db-password, stripe-live-key). Se a API responder de forma diferente a 'não tens permissão' e a 'não existe', qualquer pessoa com conta pode experimentar nomes e descobrir que segredos existem. Regista a tentativa para a equipa de segurança a ver.

## Feito quando

```
node --test cards/sc-08/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
