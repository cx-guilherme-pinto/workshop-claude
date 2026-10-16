# Cartão sc-04 — Do acesso mínimo ao total

- **Categoria:** segredos-cloud
- **Dificuldade:** 1
- **Modelo:** `ordenar` de `../../templates/ordenar.js`

## Conceito

Menor privilégio: cada conta ou serviço recebe só o acesso de que precisa.

## Enunciado (campo `prompt`)

Ordena estas permissões sobre um bucket, da mais restrita à mais ampla.

## Conteúdo

Campo `items` (já baralhados; mantém esta ordem):

| id | text |
| --- | --- |
| a | Administrar toda a conta da cloud |
| b | Ler e escrever em todo o bucket |
| c | Ler um só ficheiro |
| d | Ler todo o bucket |

Campo `answer` (ordem certa): `["c","d","b","a"]`

## Explicação (campo `explanation`)

Se um serviço for comprometido, o atacante fica só com o que esse serviço podia fazer. Começa pelo acesso mínimo e alarga só quando for preciso.

## Feito quando

```
node --test cards/sc-04/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
