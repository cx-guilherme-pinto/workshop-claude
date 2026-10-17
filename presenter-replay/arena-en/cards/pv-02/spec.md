# Card pv-02 — The photo says where you are

- **Category:** privacy
- **Difficulty:** 2
- **Template:** `answer` from `../../templates/answer.js`

## Concept

A photo's EXIF metadata can store the GPS coordinates of where it was taken.

## Prompt (field `prompt`)

What is the name of a photo's metadata that can store the date, the phone model and the GPS coordinates?

## Content

Field `placeholder`: `Acronym`

Field `accept`: `["EXIF","EXIF metadata","EXIF data"]`

Example of a right answer: `EXIF`

## Explanation (field `explanation`)

A photo shared as a file can reveal your address. Turn off location in the camera or remove the metadata before sending.

## Done when

```
node --test cards/pv-02/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
