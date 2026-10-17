# Cartão rd-06 — Portas a mais na firewall

- **Categoria:** networks
- **Dificuldade:** 2
- **Modelo:** `spotTheFlaw` de `../../templates/spot-the-flaw.js`

## Conceito

Um servidor web só deve expor à internet as portas de que precisa.

## Enunciado (campo `prompt`)

Estas são as regras da firewall de um servidor web público. Que regras expõem demasiado?

## Conteúdo

Campo `language`: `"text"`

Campo `segments` (índices a partir de 0):

```json
[
  "allow tcp 443 from any",
  "allow tcp 80 from any (redireciona para 443)",
  "allow tcp 22 from any",
  "allow tcp 3306 from any",
  "deny all"
]
```

Campo `answer` (índices inseguros): `[2,3]`

## Explicação (campo `explanation`)

A base de dados (3306) nunca deve estar aberta à internet e o SSH (22) deve aceitar só a VPN ou os IPs da equipa. Deixa abertas só as portas 80 e 443.

## Feito quando

```
node --test cards/rd-06/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
