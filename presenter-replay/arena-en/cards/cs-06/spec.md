# Card cs-06 — Values kept apart from the SQL

- **Category:** secure-code
- **Difficulty:** 2
- **Template:** `answer` from `../../templates/answer.js`

## Concept

Parameterized queries send the SQL and the values separately, and the database never mixes them.

## Prompt (field `prompt`)

What is the technique called where you write the SQL with placeholders (like ?) and send the values separately?

## Content

Field `placeholder`: `Name of the technique`

Field `accept`: `["parameterized queries","parameterized query","parametrized queries","parametrized query","parameterised queries","parameterised query","prepared statements","prepared statement","parameterization","query parameterization","bind parameters"]`

Example of a right answer: `parameterized queries`

## Explanation (field `explanation`)

The value is never read as SQL, so ' OR '1'='1 stays plain text. Use them in every query, even the ones that look safe.

## Done when

```
node --test cards/cs-06/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
