# Cartão ph-06 — Lê o URL pela ordem certa

- **Categoria:** phishing
- **Dificuldade:** 2
- **Modelo:** `ordenar` de `../../templates/ordenar.js`

## Conceito

O domínio é o que fica entre :// e a primeira barra; é ele que diz de quem é o site.

## Enunciado (campo `prompt`)

Ordena as partes deste URL, da esquerda para a direita: https://bancoluz.example/entrar?ref=email

## Conteúdo

Campo `items` (já baralhados; mantém esta ordem):

| id | text |
| --- | --- |
| a | ?ref=email (parâmetros) |
| b | https:// (protocolo) |
| c | bancoluz.example (domínio) |
| d | /entrar (caminho) |

Campo `answer` (ordem certa): `["b","c","d","a"]`

## Explicação (campo `explanation`)

Só o domínio diz quem controla o site; o caminho e os parâmetros podem ter qualquer texto, até 'bancoluz'. Encontra o domínio antes de confiar.

## Feito quando

```
node --test cards/ph-06/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
