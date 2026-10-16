# Changes from the original

1. **`SKILL.md`, frontmatter:** added `disable-model-invocation: true`. The skill only runs when it is called by name (`/design-taste-frontend`). That way it does not fire on its own on every page and does not spend tokens by accident.
2. **`scripts/assets.mjs` removed.** It was the only file with network requests, to six public image APIs. Changes in `SKILL.md`:
   - the introduction, step 1, step 6.4.3, the video in step 6 and step 10 no longer say to run the script;
   - "Special cases → No network" now says that the search is never automatic;
   - the `scripts/assets.mjs` row left the "Files" table.
   `README.md`, `references/imagery.md`, `library/directions.json`, `scripts/draw.mjs` and `scripts/lib/rules.mjs` still mention `assets.mjs` in their text. Those mentions are harmless, because the file no longer exists.
3. **`SKILL.md`, "Use in this kit" section** at the start. Explains how to apply the rules to app screens, cards and slides, outside the original landing-page scope, without the full ritual, and tells Claude to talk to the user in their language.

There were no other changes. The remaining files are byte-for-byte identical to the pinned commit.
