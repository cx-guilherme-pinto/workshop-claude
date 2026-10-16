# Cartão ph-07 — O link mente

- **Categoria:** phishing
- **Dificuldade:** 2
- **Modelo:** `resposta` de `../../templates/resposta.js`

## Conceito

O texto de um link pode mostrar um endereço e levar a outro.

## Enunciado (campo `prompt`)

Num email, o link mostra um endereço, mas ao passar o rato o browser mostra outro. Que domínio vais abrir se clicares?

## Cenário (campo `scenario`)

```json
{
  "kind": "texto",
  "label": "Link no email",
  "lines": [
    "Texto do link: https://bancoluz.example/extrato",
    "Destino ao passar o rato: http://extrato-luz.test/abc"
  ]
}
```

## Conteúdo

Campo `placeholder`: `Domínio`

Campo `accept`: `["extrato-luz.test","http://extrato-luz.test","http://extrato-luz.test/abc"]`

Exemplo de resposta certa: `extrato-luz.test`

## Explicação (campo `explanation`)

O texto do link é só texto; o destino real é o que o browser mostra ao passar o rato. No telemóvel, mantém o dedo no link para o ver antes de abrir.

## Feito quando

```
node --test cards/ph-07/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
