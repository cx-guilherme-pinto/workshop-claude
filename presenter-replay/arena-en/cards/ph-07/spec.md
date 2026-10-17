# Card ph-07 — The link lies

- **Category:** phishing
- **Difficulty:** 2
- **Template:** `answer` from `../../templates/answer.js`

## Concept

The text of a link can show one address and take you to another.

## Prompt (field `prompt`)

In an email, the link shows one address, but when you hover over it the browser shows another. Which domain will you open if you click?

## Scenario (field `scenario`)

```json
{
  "kind": "text",
  "label": "Link in the email",
  "lines": [
    "Link text: https://lumenbank.example/statement",
    "Destination on hover: http://statement-lumen.test/abc"
  ]
}
```

## Content

Field `placeholder`: `Domain`

Field `accept`: `["statement-lumen.test","http://statement-lumen.test","http://statement-lumen.test/abc"]`

Example of a right answer: `statement-lumen.test`

## Explanation (field `explanation`)

The link text is just text; the real destination is what the browser shows on hover. On a phone, press and hold the link to see it before opening.

## Done when

```
node --test cards/ph-07/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
