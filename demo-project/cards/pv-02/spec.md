# Cartão pv-02 — A foto diz onde estás

- **Categoria:** privacy
- **Dificuldade:** 2
- **Modelo:** `answer` de `../../templates/answer.js`

## Conceito

Os metadados EXIF de uma foto podem guardar as coordenadas GPS de onde foi tirada.

## Enunciado (campo `prompt`)

Como se chamam os metadados de uma foto que podem guardar a data, o modelo do telemóvel e as coordenadas GPS?

## Conteúdo

Campo `placeholder`: `Sigla`

Campo `accept`: `["EXIF","metadados EXIF","dados EXIF"]`

Exemplo de resposta certa: `EXIF`

## Explicação (campo `explanation`)

Uma foto partilhada como ficheiro pode revelar a tua morada. Desliga a localização na câmara ou remove os metadados antes de enviar.

## Feito quando

```
node --test cards/pv-02/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
