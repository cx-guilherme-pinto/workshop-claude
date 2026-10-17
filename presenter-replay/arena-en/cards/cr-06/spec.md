# Card cr-06 — One letter changes everything

- **Category:** cryptography
- **Difficulty:** 2
- **Template:** `answer` from `../../templates/answer.js`
- **Depends on:** lib-hash

## Concept

Avalanche effect: changing a single character in the input changes the whole hash.

## Prompt (field `prompt`)

These two texts differ only in one capital letter. How many of the first 10 characters of the two hashes are the same, in the same position?

## Scenario (field `scenario`)

```json
{
  "kind": "text",
  "label": "SHA-256",
  "lines": [
    "Atlas → 9dee1c0ed39ef4e2686f974b5d574531fa5091be91e7ea72875e763278293ad4",
    "atlas → 7c82602500857aa6ed0cf38c4c3e4ec645bdcaa82c00b9155eb08be100c778a9"
  ]
}
```

## Content

Field `placeholder`: `A number`

Logic of `check` (instead of `accept`):

The validate must use the sha256Hex function from ../../lib/hash.js. Compute sha256Hex('Atlas') and sha256Hex('atlas') and count the positions from 0 to 9 where the character is the same. Accept the normalized answer if it is that number, written in digits.

Example of a right answer: `0`

## Explanation (field `explanation`)

In a good hash, every character changes with the same probability, so any matches are pure chance. This is what stops anyone from guessing the input from similar-looking hashes.

## Done when

```
node --test cards/cr-06/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
