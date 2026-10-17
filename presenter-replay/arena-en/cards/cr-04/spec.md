# Card cr-04 — Repeated hashes in the breach

- **Category:** cryptography
- **Difficulty:** 2
- **Template:** `answer` from `../../templates/answer.js`
- **Depends on:** lib-hash

## Concept

Without a salt, identical passwords give identical hashes and stand out in a breach.

## Prompt (field `prompt`)

In a breach, the passwords were stored with SHA-256 and no salt. Which two users have the same password?

## Scenario (field `scenario`)

```json
{
  "kind": "text",
  "label": "Stolen table",
  "lines": [
    "ana: 6a0436eecdad379345d804a9e4861a46e2135054879760acaf8d88534f871b26",
    "tom: e44771109f62417cd312797e9fce2b3529ef53341414a6574aace379e4035de7",
    "eva: 6a0436eecdad379345d804a9e4861a46e2135054879760acaf8d88534f871b26"
  ]
}
```

## Content

Field `placeholder`: `Two names`

Logic of `check` (instead of `accept`):

The validate must use the sha256Hex function from ../../lib/hash.js. Define PASSWORDS = { ana: 'summer2026', tom: 'blue-cat-77', eva: 'summer2026' } and compute the sha256Hex of each one; the right names are the ones with a repeated hash. The check takes the words of the normalized answer that are keys of PASSWORDS and accepts it only if they are exactly those names, in any order.

Example of a right answer: `Ana and Eva`

## Explanation (field `explanation`)

Without a salt, the same password always gives the same hash. With a random salt per user and a slow algorithm like Argon2id, the hashes all come out different.

## Done when

```
node --test cards/cr-04/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
