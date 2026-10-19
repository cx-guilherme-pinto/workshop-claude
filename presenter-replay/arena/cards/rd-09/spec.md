# Cartão rd-09 — O router mal configurado

- **Categoria:** networks
- **Dificuldade:** 2
- **Modelo:** `spotTheFlaw` de `../../templates/spot-the-flaw.js`

## Conceito

Um router de casa tem várias portas: o próprio Wi-Fi, a página de administração e os aparelhos ligados a ele.

## Enunciado (campo `prompt`)

Estas são as definições do router da família Silva. Que linhas deixam um vizinho que não sabe a password do Wi-Fi entrar na rede?

## Conteúdo

Campo `language`: `"text"`

Campo `segments` (índices a partir de 0):

```json
[
  "Nome da rede: CasaSilva",
  "Segurança do Wi-Fi: WEP",
  "Password da página de administração: admin (a de fábrica)",
  "WPS: ligado, com PIN de 8 algarismos",
  "UPnP: ligado",
  "Administração remota: desligada"
]
```

Campo `answer` (índices inseguros): `[1,3]`

## Explicação (campo `explanation`)

Um vizinho ao alcance do sinal pode atacar o próprio Wi-Fi durante dias sem ninguém dar por isso. Usa WPA3 (ou WPA2) com uma password longa, desliga o WPS, muda a password de fábrica da administração e desliga o UPnP se não precisares dele.

## Feito quando

```
node --test cards/rd-09/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
