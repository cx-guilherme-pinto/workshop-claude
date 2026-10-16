# Cartão rd-05 — O que uma VPN não faz

- **Categoria:** redes
- **Dificuldade:** 2
- **Modelo:** `escolha` de `../../templates/escolha.js`

## Conceito

Uma VPN cifra o caminho até ao servidor da VPN; não trava phishing nem malware.

## Enunciado (campo `prompt`)

Ligaste uma VPN. De que é que ela te protege mesmo?

## Conteúdo

Campo `options` (mantém os ids):

| id | text |
| --- | --- |
| a | De sites de phishing |
| b | De quem está na mesma rede Wi-Fi ver o teu tráfego |
| c | De malware que já está no portátil |
| d | De o site saber quem és depois do login |

Campo `answer`: `"b"`

## Explicação (campo `explanation`)

A VPN esconde o tráfego da rede local, mas o fornecedor da VPN passa a vê-lo. Para phishing e malware precisas de outras defesas, como MFA e atualizações.

## Feito quando

```
node --test cards/rd-05/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
