# Cartão pw-02 — Do segundo fator mais forte ao mais fraco

- **Categoria:** passwords
- **Dificuldade:** 1
- **Modelo:** `ordenar` de `../../templates/ordenar.js`

## Conceito

Nem todo o segundo fator protege o mesmo: os que resistem a phishing ficam no topo.

## Enunciado (campo `prompt`)

Ordena estas formas de entrar numa conta, da mais segura para a menos segura.

## Conteúdo

Campo `items` (já baralhados; mantém esta ordem):

| id | text |
| --- | --- |
| a | Código por SMS |
| b | Só password |
| c | Chave de segurança ou passkey |
| d | App autenticadora (código de 6 dígitos) |

Campo `answer` (ordem certa): `["c","d","a","b"]`

## Explicação (campo `explanation`)

Chaves de segurança e passkeys não funcionam num site falso, por isso resistem a phishing. O SMS pode ser desviado com uma troca de SIM, mas ainda é melhor do que só a password.

## Feito quando

```
node --test cards/pw-02/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
