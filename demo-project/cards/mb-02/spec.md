# Cartão mb-02 — O jogo pago de graça

- **Categoria:** mobile
- **Dificuldade:** 1
- **Modelo:** `escolha` de `../../templates/escolha.js`

## Conceito

Apps instaladas fora das lojas oficiais são a principal porta de entrada de malware no telemóvel.

## Enunciado (campo `prompt`)

Um amigo envia-te o APK de um jogo pago, 'de graça'. O que fazes?

## Conteúdo

Campo `options` (mantém os ids):

| id | text |
| --- | --- |
| a | Instalo e ativo 'origens desconhecidas' |
| b | Não instalo; uso só a loja oficial |
| c | Instalo e depois corro um antivírus |
| d | Instalo num telemóvel antigo |

Campo `answer`: `"b"`

## Explicação (campo `explanation`)

Apps pirateadas trazem muitas vezes malware escondido. Instala só da loja oficial e mantém desligada a instalação de origens desconhecidas.

## Feito quando

```
node --test cards/mb-02/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
