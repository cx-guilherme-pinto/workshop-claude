# Card cr-01 — Decrypt Caesar's message

- **Category:** cryptography
- **Difficulty:** 1
- **Template:** `answer` from `../../templates/answer.js`
- **Depends on:** lib-hash

## Concept

The Caesar cipher replaces each letter with another one a fixed distance away. With only 25 keys, it breaks in seconds.

## Prompt (field `prompt`)

You intercepted a message encrypted with the Caesar cipher, with a shift of 3. What does it say?

## Scenario (field `scenario`)

```json
{
  "kind": "text",
  "label": "Intercepted message",
  "lines": [
    "DWWDFN DW QRRQ"
  ]
}
```

## Content

Logic of `check` (instead of `accept`):

The validate must use the caesar function from ../../lib/hash.js: the right answer is caesar('DWWDFN DW QRRQ', -3). Compare with normalize() on both sides, so that case and accents do not count.

Example of a right answer: `Attack at noon`

## Explanation (field `explanation`)

Each letter moves back 3 places: D becomes A, W becomes T. An attacker tries all 25 keys in seconds. It is for learning, not for protecting.

## Done when

```
node --test cards/cr-01/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
