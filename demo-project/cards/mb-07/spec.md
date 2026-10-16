# Cartão mb-07 — A app pronta para a loja?

- **Categoria:** mobile
- **Dificuldade:** 3
- **Modelo:** `clicaErro` de `../../templates/clica-erro.js`

## Conceito

Uma app publicada não deve estar em modo de depuração nem aceitar tráfego sem cifra.

## Enunciado (campo `prompt`)

Este é o manifesto Android da versão que vai para a loja. Que linhas são inseguras?

## Conteúdo

Campo `language`: `"html"`

Campo `segments` (índices a partir de 0):

```json
[
  "<application",
  "  android:label=\"Atlas\"",
  "  android:debuggable=\"true\"",
  "  android:allowBackup=\"false\"",
  "  android:usesCleartextTraffic=\"true\">"
]
```

Campo `answer` (índices inseguros): `[2,4]`

## Explicação (campo `explanation`)

O modo de depuração deixa ligar ferramentas à app e o tráfego sem cifra pode ser lido na rede. Publica com debuggable a false e só com HTTPS.

## Feito quando

```
node --test cards/mb-07/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
