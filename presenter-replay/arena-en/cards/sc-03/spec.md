# Card sc-03 — The .env stays out

- **Category:** cloud-secrets
- **Difficulty:** 1
- **Template:** `answer` from `../../templates/answer.js`

## Concept

The .env file with secrets never goes into the repository; share only a .env.example without values.

## Prompt (field `prompt`)

Which git file says which files, like .env, must never go into the repository?

## Content

Field `placeholder`: `File name`

Field `accept`: `[".gitignore"]`

Example of a right answer: `.gitignore`

## Explanation (field `explanation`)

Put .env in .gitignore before the first commit and keep a .env.example with just the variable names. That way the team knows what to configure without seeing the values.

## Done when

```
node --test cards/sc-03/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
