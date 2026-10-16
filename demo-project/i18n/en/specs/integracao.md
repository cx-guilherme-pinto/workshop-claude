# Task `integracao` — put everything together and make the suite green

Waves 1 and 2 are done: the cards (`cards/*/card.js`), `lib/hash.js` and the two pages (`pages/categoria.js`, `pages/pontuacao.js`). Each one passed its own test, on its own. Your job is to make sure they also pass **together**, including the app tests (`test/app.test.js`: server headers, refused paths and source code without dangerous patterns).

Some cards may have ended up as `falhou` (failed for good) after 3 attempts. The orchestrator has already given up on them: **do not redo them**.

## Check

```
node tools/check-integracao.mjs
```

It runs `node --test` on every test in the project, except the ones for card (or lib) tasks that `.workshop/status/<id>.json` marks as `falhou`. It exits with 0 only if everything passes. With `--lista`, it only shows which files are included and which are left out.

## Steps

1. Run the check. If it exits with 0, skip to step 5.
2. For each red file, read **only the first failure** and the file it points to.
3. Fix it, touching **only** `public/`, `pages/` and `test/`. Usual causes:
   - a page does not follow its spec (`specs/pagina-categoria.md` or `specs/tabela-pontuacao.md`): export name, classes, `data-*` attributes, exact text;
   - `test/app.test.js` finds `innerHTML`, `eval` or similar in a page: replace it with `h()` from `../templates/common.js`;
   - `public/app.js` passes the page parameters with a different name or shape than the spec says.
4. Go back to step 1. At most 5 rounds.
5. Write `.workshop/integracao.md` (format below) and finish.

## What you cannot change

`cards/**`, `templates/**`, `lib/**`, `specs/**`, `server.js` and `tools/**`. If the cause is there, do not work around it (not by deleting tests and not by weakening them): describe it in `.workshop/integracao.md`, in the "Unresolved" section, and finish with `FALHOU integracao: <reason>`.

You also cannot:
- delete tests;
- mark tests as `skip` or `todo`;
- lower what a test requires.

## `.workshop/integracao.md`

At most 25 lines, in English, in this format:

```markdown
# Integration

- Result: green
- Command: node tools/check-integracao.mjs
- Tests: 96 pass, 0 fail, in 14 files
- Left out (failed for good in the swarm): re-01

## Fixes

- pages/pontuacao.js: the total added up cards from categories outside the list; it now adds up the rows.

## Unresolved

- Nothing.
```

- One line per fix: file, problem and what changed.
- If you fixed nothing, write "None: the suite was already green."
- The numbers come from the `pass` and `fail` lines at the end of the `node --test` output.

## Done when

`node tools/check-integracao.mjs` exits with 0 and `.workshop/integracao.md` exists.
