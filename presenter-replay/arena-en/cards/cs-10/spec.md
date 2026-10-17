# Card cs-10 — Pinned versions

- **Category:** secure-code
- **Difficulty:** 2
- **Template:** `answer` from `../../templates/answer.js`

## Concept

The lockfile pins the exact versions of every dependency, including indirect ones.

## Prompt (field `prompt`)

In npm, which file pins the exact versions of all installed dependencies?

## Content

Field `placeholder`: `File name`

Field `accept`: `["package-lock.json","package-lock","lockfile"]`

Example of a right answer: `package-lock.json`

## Explanation (field `explanation`)

With the lockfile in git, everyone installs exactly the same code, the code that was audited. Use npm ci in CI and review lockfile changes.

## Done when

```
node --test cards/cs-10/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
