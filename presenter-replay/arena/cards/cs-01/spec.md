# Cartão cs-01 — Encontra o path traversal

- **Categoria:** codigo-seguro
- **Dificuldade:** 2
- **Modelo:** `clicaErro` de `../../templates/clica-erro.js`

## Conceito

Juntar ao caminho o nome de um ficheiro vindo do utilizador deixa sair da pasta prevista.

## Enunciado (campo `prompt`)

Este endpoint serve ficheiros da pasta de uploads. Que linha deixa ler ficheiros de fora dessa pasta?

## Conteúdo

Campo `language`: `"js"`

Campo `segments` (índices a partir de 0):

```json
[
  "app.get('/download', (req, res) => {",
  "  const nome = req.query.ficheiro;",
  "  const caminho = path.join('/srv/uploads', nome);",
  "  res.sendFile(caminho);",
  "});"
]
```

Campo `answer` (índices inseguros): `[2]`

## Explicação (campo `explanation`)

Com ficheiro=../../etc/passwd, o caminho sai da pasta de uploads. Usa path.basename(nome) ou confirma que o caminho resolvido começa por /srv/uploads/.

## Feito quando

```
node --test cards/cs-01/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
