# Cartão rd-07 — DNS que ninguém lê

- **Categoria:** redes
- **Dificuldade:** 2
- **Modelo:** `resposta` de `../../templates/resposta.js`

## Conceito

O DNS tradicional viaja sem cifra; o DoH esconde os nomes que consultas.

## Enunciado (campo `prompt`)

Que sigla designa o DNS cifrado dentro de HTTPS?

## Conteúdo

Campo `placeholder`: `Sigla`

Campo `accept`: `["DoH","DNS over HTTPS","DNS sobre HTTPS"]`

Exemplo de resposta certa: `DoH`

## Explicação (campo `explanation`)

Sem cifra, quem está na rede vê e pode falsificar os nomes que pedes. Ativa o DNS cifrado (DoH ou DoT) no browser ou no sistema.

## Feito quando

```
node --test cards/rd-07/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
