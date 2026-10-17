# Cartão cr-03 — Qual é o ficheiro verdadeiro?

- **Categoria:** cryptography
- **Dificuldade:** 2
- **Modelo:** `answer` de `../../templates/answer.js`
- **Depende de:** lib-hash

## Conceito

Um hash SHA-256 muda por completo se o ficheiro mudar, por isso serve para confirmar downloads.

## Enunciado (campo `prompt`)

Descarregaste o instalador da Empresa Atlas de três sítios. Qual ficheiro (A, B ou C) tem o SHA-256 publicado no site oficial?

## Cenário (campo `scenario`)

```json
{
  "kind": "text",
  "label": "Hashes SHA-256",
  "lines": [
    "Publicado: aead3ef36683a19ac4daef563b4c4c88076a8e63d039cc71cce386bd856aa07a",
    "A: ad6973aa9c3038822a7d97182035090e3fd17bd077015dd313aa6f0c0afe36d0",
    "B: aead3ef36683a19ac4daef563b4c4c88076a8e63d039cc71cce386bd856aa07a",
    "C: af402ffc51b958773a597f51605df39c11553f8a02f1c87575e22a3501c1a3b6"
  ]
}
```

## Conteúdo

Campo `placeholder`: `A, B ou C`

Lógica do `check` (em vez de `accept`):

O validate tem de usar a função sha256Hex de ../../lib/hash.js. Define FICHEIROS = { a: 'Atlas App 2.4.1 (alterado)', b: 'Atlas App 2.4.1 (oficial)', c: 'Atlas App 2.4.0 (oficial)' } e PUBLICADO = 'aead3ef36683a19ac4daef563b4c4c88076a8e63d039cc71cce386bd856aa07a'. O check tira um 'ficheiro ' opcional do início da resposta normalizada e aceita-a só se for uma chave de FICHEIROS cujo sha256Hex(conteúdo) é igual a PUBLICADO.

Exemplo de resposta certa: `B`

## Explicação (campo `explanation`)

Basta um byte diferente para o hash mudar todo: compara o hash completo, não só o início. E confirma que o hash vem do site oficial, por HTTPS.

## Feito quando

```
node --test cards/cr-03/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
