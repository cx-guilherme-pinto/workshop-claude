# Card cr-03 — Which is the real file?

- **Category:** cryptography
- **Difficulty:** 2
- **Template:** `answer` from `../../templates/answer.js`
- **Depends on:** lib-hash

## Concept

A SHA-256 hash changes completely if the file changes, so it is used to check downloads.

## Prompt (field `prompt`)

You downloaded the Atlas Corp installer from three places. Which file (A, B or C) has the SHA-256 published on the official site?

## Scenario (field `scenario`)

```json
{
  "kind": "text",
  "label": "SHA-256 hashes",
  "lines": [
    "Published: 87131d4981f502852ee8408055118dda6716bd9566f320f67ca2483a787985ad",
    "A: 898bfd72ebe318770a748e1d72d5e99b8427672b7267a573f3dfd0cbb2b01fb8",
    "B: 87131d4981f502852ee8408055118dda6716bd9566f320f67ca2483a787985ad",
    "C: 877552cce26c4a37deefb8facb70690b7655ec641c43df3b13b3fac859cb996f"
  ]
}
```

## Content

Field `placeholder`: `A, B or C`

Logic of `check` (instead of `accept`):

The validate must use the sha256Hex function from ../../lib/hash.js. Define FILES = { a: 'Atlas App 2.9.3 (modified)', b: 'Atlas App 2.9.3 (official)', c: 'Atlas App 2.9.2 (official)' } and PUBLISHED = '87131d4981f502852ee8408055118dda6716bd9566f320f67ca2483a787985ad'. The check strips an optional 'file ' from the start of the normalized answer and accepts it only if it is a key of FILES whose sha256Hex(content) equals PUBLISHED.

Example of a right answer: `B`

## Explanation (field `explanation`)

A single different byte changes the whole hash: compare the full hash, not just the start. And make sure the hash comes from the official site, over HTTPS.

## Done when

```
node --test cards/cr-03/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
