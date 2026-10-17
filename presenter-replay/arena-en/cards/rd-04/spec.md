# Card rd-04 — What happens when you open an HTTPS site

- **Category:** networks
- **Difficulty:** 2
- **Template:** `order` from `../../templates/order.js`

## Concept

Before any data is sent encrypted, the browser checks the server's certificate.

## Prompt (field `prompt`)

You open https://shop.example. Order the steps, from first to last.

## Content

Field `items` (already shuffled; keep this order):

| id | text |
| --- | --- |
| a | The server sends its certificate |
| b | A TCP connection to the server is opened |
| c | DNS translates shop.example into an IP address |
| d | The HTTP request is sent encrypted |
| e | The browser validates the certificate |

Field `answer` (right order): `["c","b","a","e","d"]`

## Explanation (field `explanation`)

If the certificate is not valid for shop.example, the browser stops before sending any data. Never ignore that warning.

## Done when

```
node --test cards/rd-04/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
