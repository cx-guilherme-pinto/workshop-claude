# Cartão cr-06 — Uma letra muda tudo

- **Categoria:** cryptography
- **Dificuldade:** 2
- **Modelo:** `answer` de `../../templates/answer.js`
- **Depende de:** lib-hash

## Conceito

Efeito avalanche: mudar um só carácter na entrada muda o hash todo.

## Enunciado (campo `prompt`)

Estes dois textos só diferem numa maiúscula. Quantos dos 10 primeiros caracteres dos dois hashes são iguais, na mesma posição?

## Cenário (campo `scenario`)

```json
{
  "kind": "text",
  "label": "SHA-256",
  "lines": [
    "Atlas → 9dee1c0ed39ef4e2686f974b5d574531fa5091be91e7ea72875e763278293ad4",
    "atlas → 7c82602500857aa6ed0cf38c4c3e4ec645bdcaa82c00b9155eb08be100c778a9"
  ]
}
```

## Conteúdo

Campo `placeholder`: `Um número`

Lógica do `check` (em vez de `accept`):

O validate tem de usar a função sha256Hex de ../../lib/hash.js. Calcula sha256Hex('Atlas') e sha256Hex('atlas') e conta as posições de 0 a 9 em que o carácter é igual. Aceita a resposta normalizada se for esse número, escrito em algarismos.

Exemplo de resposta certa: `0`

## Explicação (campo `explanation`)

Num bom hash, cada carácter muda com a mesma probabilidade, por isso as coincidências são acaso. É isto que impede adivinhar a entrada a partir de hashes parecidos.

## Feito quando

```
node --test cards/cr-06/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
