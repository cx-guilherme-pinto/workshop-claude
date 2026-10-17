# Cartão cr-04 — Hashes repetidos na fuga

- **Categoria:** cryptography
- **Dificuldade:** 2
- **Modelo:** `answer` de `../../templates/answer.js`
- **Depende de:** lib-hash

## Conceito

Sem salt, passwords iguais dão hashes iguais e saltam à vista numa fuga.

## Enunciado (campo `prompt`)

Numa fuga, as passwords estavam guardadas com SHA-256 sem salt. Que dois utilizadores têm a mesma password?

## Cenário (campo `scenario`)

```json
{
  "kind": "text",
  "label": "Tabela roubada",
  "lines": [
    "ana: 1e3d55f96ef8725c64a70777ef8c59e3d6d5f401bd19aa2652667ab1520e377c",
    "rui: ebc177dd3e4cc895830bec79e5849fe1e98ab462cd07101d75376612bc997c8b",
    "eva: 1e3d55f96ef8725c64a70777ef8c59e3d6d5f401bd19aa2652667ab1520e377c"
  ]
}
```

## Conteúdo

Campo `placeholder`: `Dois nomes`

Lógica do `check` (em vez de `accept`):

O validate tem de usar a função sha256Hex de ../../lib/hash.js. Define PASSWORDS = { ana: 'verao2026', rui: 'gato-azul-77', eva: 'verao2026' } e calcula o sha256Hex de cada uma; os nomes certos são os que têm um hash repetido. O check tira da resposta normalizada as palavras que são chaves de PASSWORDS e aceita-a só se forem exatamente esses nomes, por qualquer ordem.

Exemplo de resposta certa: `Ana e Eva`

## Explicação (campo `explanation`)

Sem salt, a mesma password dá sempre o mesmo hash. Com um salt aleatório por utilizador e um algoritmo lento como Argon2id, os hashes ficam todos diferentes.

## Feito quando

```
node --test cards/cr-04/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
