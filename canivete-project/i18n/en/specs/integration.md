# Task `integration` — put everything together and make the suite green

Waves 1 and 2 are done: the tools (`tools/*/tool.js`) and the search (`pages/catalog.js`). Each one passed its own test, on its own. Your job is to make sure they also pass **together**, including the app tests (`test/app.test.js`: server headers, refused paths, `/api/tools` and source code without dangerous patterns).

Some tools may have failed for good after 3 attempts. The orchestrator has already given up on them: **do not redo them**.

## Check

```
node tools/check-integration.mjs
```

It runs `node --test` on every test in the project, except the ones for the tools that `.workshop/status/<id>.json` marks as failed for good and the tools outside the plan. It exits with 0 only if everything passes. With `--list`, it only shows which files are included and which are left out.

## Steps

1. Run the check. If it exits with 0, skip to step 5.
2. For each red file, read **only the first failure** and the file it points to.
3. Fix it, touching **only** `public/` and `pages/`. Usual causes:
   - `pages/catalog.js` does not follow `specs/index-page.md`: the name of an export, the shape of the groups (`id`, `name`, `tools`, `built`), the `other` group, or a list it receives that it changes;
   - `test/app.test.js` finds `innerHTML`, `eval` or similar in `public/` or `pages/`: replace it with `el()` from `public/dom.js` (in the shell) or remove it (the page is pure);
   - `public/app.js` calls `pages/catalog.js` with other parameters or another shape than the spec says.
4. Go back to step 1. At most 5 rounds.
5. Write `.workshop/integration.md` (format below) and finish.

## What you cannot change

`tools/**` (the tools, the specs, the tests and the scripts), `templates/**`, `lib/**`, `specs/**`, `test/**` and `server.js`. If the cause is there, do not work around it (neither by deleting nor by weakening tests): describe it in `.workshop/integration.md`, in the "Unresolved" section, and finish with `FAILED integration: <reason>`.

You also cannot:
- delete tests;
- mark tests as `skip` or `todo`;
- lower what a test requires.

## `.workshop/integration.md`

At most 25 lines, in English, with this format:

```markdown
# Integration

- Result: green
- Command: node tools/check-integration.mjs
- Tests: 212 pass, 0 fail, in 33 files
- Left out (failed for good in the swarm): nm-03

## Fixes

- pages/catalog.js: search() sorted the list it received with sort(); it now filters a copy.

## Unresolved

- Nothing.
```

- One line per fix: file, problem and what changed.
- If you fixed nothing, write "None: the suite was already green."
- The numbers come from the `pass` and `fail` lines at the end of the `node --test` output.

## Done when

`node tools/check-integration.mjs` exits with 0 and `.workshop/integration.md` exists.
