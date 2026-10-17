# Cartão web-10 — O CORS demasiado aberto

- **Categoria:** web
- **Dificuldade:** 3
- **Modelo:** `spotTheFlaw` de `../../templates/spot-the-flaw.js`

## Conceito

Refletir qualquer origem com credenciais deixa qualquer site ler respostas em nome do utilizador.

## Enunciado (campo `prompt`)

Esta API serve só a app loja.example. Que linha a deixa exposta a qualquer site?

## Conteúdo

Campo `language`: `"js"`

Campo `segments` (índices a partir de 0):

```json
[
  "app.use(cors({",
  "  origin: (origem, cb) => cb(null, origem),",
  "  credentials: true,",
  "  methods: ['GET', 'POST'],",
  "}));"
]
```

Campo `answer` (índices inseguros): `[1]`

## Explicação (campo `explanation`)

Aceitar a origem que vier, com credentials, deixa qualquer site ler as respostas com os cookies da vítima. Usa uma lista fixa: origin: ['https://loja.example'].

## Feito quando

```
node --test cards/web-10/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
