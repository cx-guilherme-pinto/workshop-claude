# Card web-02 — Find the XSS

- **Category:** web
- **Difficulty:** 1
- **Template:** `spotTheFlaw` from `../../templates/spot-the-flaw.js`

## Concept

Putting user text into innerHTML lets the browser run code hidden in that text.

## Prompt (field `prompt`)

This code shows comments on a page. Which line allows XSS?

## Content

Field `language`: `"js"`

Field `segments` (indexes start at 0):

```json
[
  "const comment = params.get('text');",
  "const p = document.createElement('p');",
  "p.innerHTML = 'Comment: ' + comment;",
  "list.appendChild(p);",
  "counter.textContent = String(total);"
]
```

Field `answer` (unsafe indexes): `[2]`

## Explanation (field `explanation`)

A comment like <img src=x onerror=alert(1)> runs code in the browser of whoever reads it. Use textContent, which shows the text without interpreting it as HTML.

## Done when

```
node --test cards/web-02/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
