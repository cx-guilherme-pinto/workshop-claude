# Cartão rd-09 — O router mal configurado

- **Categoria:** redes
- **Dificuldade:** 2
- **Modelo:** `clicaErro` de `../../templates/clica-erro.js`

## Conceito

WEP e WPS são pontos fracos conhecidos no Wi-Fi de casa.

## Enunciado (campo `prompt`)

Estas são as definições do router. Que linhas enfraquecem a rede?

## Conteúdo

Campo `language`: `"texto"`

Campo `segments` (índices a partir de 0):

```json
[
  "Nome da rede: CasaSilva",
  "Segurança: WEP",
  "Password: 20 caracteres ao acaso",
  "WPS: ligado",
  "Firmware: atualizado"
]
```

Campo `answer` (índices inseguros): `[1,3]`

## Explicação (campo `explanation`)

O WEP parte-se em minutos e o PIN do WPS adivinha-se por força bruta. Usa WPA3 (ou WPA2) e desliga o WPS.

## Feito quando

```
node --test cards/rd-09/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
