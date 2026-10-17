# Cartão web-02 — Encontra o XSS

- **Categoria:** web
- **Dificuldade:** 1
- **Modelo:** `spotTheFlaw` de `../../templates/spot-the-flaw.js`

## Conceito

Pôr texto do utilizador em innerHTML deixa o browser executar código escondido nesse texto.

## Enunciado (campo `prompt`)

Este código mostra comentários numa página. Que linha permite XSS?

## Conteúdo

Campo `language`: `"js"`

Campo `segments` (índices a partir de 0):

```json
[
  "const comentario = params.get('texto');",
  "const p = document.createElement('p');",
  "p.innerHTML = 'Comentário: ' + comentario;",
  "lista.appendChild(p);",
  "contador.textContent = String(total);"
]
```

Campo `answer` (índices inseguros): `[2]`

## Explicação (campo `explanation`)

Um comentário como <img src=x onerror=alert(1)> corre código no browser de quem o lê. Usa textContent, que mostra o texto sem o interpretar como HTML.

## Feito quando

```
node --test cards/web-02/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
