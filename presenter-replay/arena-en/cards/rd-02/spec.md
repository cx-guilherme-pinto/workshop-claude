# Card rd-02 — Where your traffic goes

- **Category:** networks
- **Difficulty:** 2
- **Template:** `order` from `../../templates/order.js`

## Concept

Every point between you and the site can see where you are going; HTTPS hides the content, not the destination.

## Prompt (field `prompt`)

Order the path of a request, from your laptop to the site.

## Content

Field `items` (already shuffled; keep this order):

| id | text |
| --- | --- |
| a | Home router |
| b | Internet provider |
| c | The site's server |
| d | Laptop |

Field `answer` (right order): `["d","a","b","c"]`

## Explanation (field `explanation`)

The router and the internet provider see which sites you connect to and when, even with HTTPS. What HTTPS guarantees is that the content and the passwords stay encrypted all the way to the site.

## Done when

```
node --test cards/rd-02/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
