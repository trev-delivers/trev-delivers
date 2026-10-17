# trev-delivers

My GitHub profile README. `build.js` reads my stats from GitHub and draws
`card.svg`, the card at the top, and puts the same numbers in the image's
alt text in `README.md` so screen readers get them.

## Running it

- `npm run check` runs the tests, checks `ds/` matches obvious's `main` and
  runs the design system audit (budget 0). There's nothing to install.
- `node build.js --fixture tests/fixture.json` draws the card from a saved
  GitHub response, with no network. Don't run it against the real API with
  a token from your machine; the Action does that.
- When obvious changes, run `node scripts/sync-ds.mjs` and commit `ds/`.

## How it ships

`.github/workflows/build.yml` runs every morning at 06:17 UTC and on every
push to `main`. It tests `build.js`, draws the card and commits it straight
to `main`, but only if the numbers changed. Pull requests run
`check.yml`.

## Careful with

- The bot commits to `main`, so pull `main` before you push.
- A push that fails 3 times fails the job. Until 17 Oct 2026 it went green
  anyway, so the card could go stale without anyone knowing.
- The card follows the design rules: the theme's 2 faces, no mono, no
  capitals with tracking, no middle dots, glow or scanlines. GitHub shows it
  with the reader's own fonts, so it has to look right in system-ui too.
- No date on the card. A date makes it change, and get committed, every day.
