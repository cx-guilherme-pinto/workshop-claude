# Cartão rd-08 — Onde ligar as câmaras baratas

- **Categoria:** redes
- **Dificuldade:** 2
- **Modelo:** `escolha` de `../../templates/escolha.js`

## Conceito

Separar dispositivos pouco fiáveis numa rede própria limita o estrago se forem atacados.

## Enunciado (campo `prompt`)

Compraste câmaras Wi-Fi baratas para casa. Onde as ligas?

## Conteúdo

Campo `options` (mantém os ids):

| id | text |
| --- | --- |
| a | Na mesma rede do portátil do trabalho |
| b | Numa rede separada, como a de convidados |
| c | Diretamente à internet, sem router |
| d | Em qualquer rede, desde que tenha password |

Campo `answer`: `"b"`

## Explicação (campo `explanation`)

Se uma câmara for atacada, numa rede separada não chega ao portátil nem aos teus ficheiros. Muda-lhe também a password de fábrica e atualiza o firmware.

## Feito quando

```
node --test cards/rd-08/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
