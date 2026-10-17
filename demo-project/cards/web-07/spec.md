# Cartão web-07 — O cookie de sessão bem configurado

- **Categoria:** web
- **Dificuldade:** 2
- **Modelo:** `choice` de `../../templates/choice.js`

## Conceito

Um cookie de sessão deve ter Secure, HttpOnly e SameSite.

## Enunciado (campo `prompt`)

Qual destes cabeçalhos cria um cookie de sessão bem protegido?

## Conteúdo

Campo `options` (mantém os ids):

| id | text |
| --- | --- |
| a | Set-Cookie: sessao=8f3a; Path=/ |
| b | Set-Cookie: sessao=8f3a; Secure; HttpOnly; SameSite=Lax; Path=/ |
| c | Set-Cookie: sessao=8f3a; HttpOnly |
| d | Set-Cookie: sessao=8f3a; Secure; SameSite=None |

Campo `answer`: `"b"`

## Explicação (campo `explanation`)

Secure só o envia por HTTPS, HttpOnly esconde-o do JavaScript e SameSite=Lax não o envia em POST vindos de outros sites. Usa os três no cookie de sessão.

## Feito quando

```
node --test cards/web-07/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
