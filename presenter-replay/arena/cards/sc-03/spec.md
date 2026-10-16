# Cartão sc-03 — O .env fica de fora

- **Categoria:** segredos-cloud
- **Dificuldade:** 1
- **Modelo:** `resposta` de `../../templates/resposta.js`

## Conceito

O ficheiro .env com segredos nunca entra no repositório; partilha-se só um .env.example sem valores.

## Enunciado (campo `prompt`)

Que ficheiro do git diz que ficheiros, como o .env, nunca devem entrar no repositório?

## Conteúdo

Campo `placeholder`: `Nome do ficheiro`

Campo `accept`: `[".gitignore"]`

Exemplo de resposta certa: `.gitignore`

## Explicação (campo `explanation`)

Põe .env no .gitignore antes do primeiro commit e mantém um .env.example só com os nomes das variáveis. Assim a equipa sabe o que configurar sem ver os valores.

## Feito quando

```
node --test cards/sc-03/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
