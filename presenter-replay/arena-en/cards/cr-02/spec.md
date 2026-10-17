# Card cr-02 — The Base64 cookie

- **Category:** cryptography
- **Difficulty:** 1
- **Template:** `answer` from `../../templates/answer.js`
- **Depends on:** lib-hash

## Concept

Base64 is a way of writing bytes as text, not a cipher: anyone can reverse it.

## Prompt (field `prompt`)

This cookie looks encrypted, but it is only Base64. What does it say once decoded?

## Scenario (field `scenario`)

```json
{
  "kind": "text",
  "label": "Cookie stored in the browser",
  "lines": [
    "session=cm9sZT1yZWFkZXI="
  ]
}
```

## Content

Field `placeholder`: `Decoded text`

Logic of `check` (instead of `accept`):

The validate must use the fromBase64 function from ../../lib/hash.js: the right answer is fromBase64('cm9sZT1yZWFkZXI='). Compare with normalize() on both sides.

Example of a right answer: `role=reader`

## Explanation (field `explanation`)

Anyone can decode the cookie and swap it for role=admin. Keep the role on the server or sign the cookie, instead of trusting Base64.

## Done when

```
node --test cards/cr-02/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
