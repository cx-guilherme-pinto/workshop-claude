# Project conventions

- Node 22+, ES modules, **no external dependencies**.
- Tests with `node --test` in `test/*.test.js`, one file per module.
- Validation errors throw `ValidationError` (from `src/errors.js`) with a short message in English.
- Data lives in memory (`src/data.js`); there is no database.
- User-facing text in English.
