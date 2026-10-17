# The repos

One page per repo: what it is, how it ships, what checks it has, where the
danger is, and what's still open. The first review was on 17 Oct 2026 and
most of what it found was fixed the same night. Fix an issue and remove it
from here in the same change. Line numbers drift; search
for the code if a line doesn't match.

All repos are `trev-delivers/<name>` on GitHub and deploy on Vercel from
`main` unless noted.

## Read only

| Repo | Why | What's worth copying |
|---|---|---|
| `opendoorperformance` | Hannah's business site. She's not technical and publishing goes through Trev. | Lint, tsc and build gate. Honeypot and length limits on the enquiry form. Saves to the database before sending email. The handover doc for a non-technical owner. |
| `brookwood-village` | Village community site with its own voice (`write-like-brookwood-news`). | `docs/security.md` in plain English. Strict headers. Form handler checks origin, strips CRLF, checks file types by content. Contrast ratios next to the tokens. |
| `brookwood-hunt` | Built for people outside the family; takes primitives only. | RLS on every table in `supabase/setup.sql`. `.ds-audit.json` notes with measured reasons. |

Never branch, commit, push, migrate or deploy in these.

`cleo-2-5-prototype` is excluded. Don't open it.

## obvious

The design system. Tokens in `src/`, generated into `dist/` (CSS, Tailwind
bridge, shadcn bridge, JS), a shadcn registry in `registry/`, the docs site
in `web/`, and the scripts apps copy in: `audit-ds.mjs`, `sync-ds.mjs` and
`sync-skills.mjs`.

- **Ships:** merge to `main`. Apps take it by npm tarball pinned to a commit
  (MorrisOS), by `sync-ds.mjs` into `ds/` (the rest), or by
  `npx shadcn add @obvious/<name>`. Skills reach apps through
  `sync-skills.mjs`.
- **Checks:** `npm run check` builds `dist/` (fails on a missing theme key or
  a contrast pair getting worse), the registry and docs site, runs the tests
  in `test/`, audits obvious itself, and fails if `dist/` or `docs/` isn't
  committed. If you change a theme colour, rebuild and commit `docs/` too.
- **Danger zones:** theme keys; `primitives.json`; registry components (apps
  overwrite their copy on `add`); the copied scripts must stay single files.
- **Open issues:**
  1. 13 colour pairs fail contrast (`docs/contrast.md`). Trev chooses fixes.
  2. `t-gradient-text` and `t-think` break the written no-gradient-text rule.
     Kept until Trev decides.
  3. The audit doesn't check literal JS timings yet.
  4. No release tags. Proposed: semver, start at `v0.2.0`.

## MorrisOS

The family's home app: Home, Stock, Shop, Meals, Admin, Music (Sonos) and a
guest page for friends at Ty Bach. Next 15, React 19, Supabase with RLS and
Google sign-in, Vercel in Frankfurt.

- **Ships:** branch, PR to `main`, CI, Vercel.
- **Checks:** `npm run check`: typecheck, lint, vitest (including database
  tests on PGlite built from the migrations), the design audit, and
  Playwright against a fake Supabase (`tests/e2e/fake-supabase.mjs`).
- **Danger zones:** `household_members` and `is_household()`; every new table
  must be family-only unless the policy test allows it; the live database
  (write migrations as files, Trev applies); `sonos_read()` and the server
  key made from `SONOS_CLIENT_SECRET`; the shopping skills.
- **Migrations:** `20261017221257_baseline.sql` is the live schema; older
  files are in `supabase/history`. Before anyone runs `supabase db push`, the
  other live versions need `supabase migration repair --status reverted`.
- **Open issues:**
  1. 3 `npm audit` highs (sharp, source-map-js).
  2. `pg_trgm` is in the public schema (advisor warning).
  3. Middle-dot strings in Stock and Shop.

## designedbytrev

Trev's portfolio. Static HTML, CSS and JS through Vite, 2 Vercel functions
(contribution graph, stats) and password middleware for the stats page. Type
authority for the design system, theme `core`. Has `write-portfolio`.

- **Ships:** PR to `main`, CI, Vercel. Build sha in the footer.
- **Checks:** `npm run check`: unit tests, build, CSP hash check, `ds:check`,
  audit, smoke test (no JS, broken script, splash skip, stats gate).
- **Danger zones:** the inline head script whose hash is in the CSP (run
  `npm run csp` after touching it); the GitHub HTML scrape; `cssMs` timers.
  Portfolio claims follow `write-portfolio`'s truth rules.
- **Open issues:**
  1. Gold gradient on "obvious" is a recorded exception. Trev's call.
  2. Needs `STATS_SECRET` in Vercel and a firewall rate limit on
     `POST /api/stats-login`.

## daily-routine

Ritual: morning and night skincare checklist for Trev and his wife. Vite,
React 19, Framer Motion, localStorage only, share links in the URL hash.
Theme `routine`, whose palette follows the clock.

- **Ships:** PR to `main`, CI, Vercel.
- **Checks:** `npm run check`: typecheck, lint, vitest, build, audit,
  Playwright at 390 and 1280, morning and night.
- **Danger zones:** storage keys and shape (`rg.*.v8`); the share format;
  step IDs (default ones are fixed, `am-1` and so on); the 4am day boundary;
  the technique content.
- **Open issues:**
  1. No CSP header.
  2. Muted footer text is about 2.4:1.
  3. Step rows are a `role=checkbox` with a link and a button inside.

## condiment-gallery

Condimental: friends sign in with Google, add a condiment as a 3D bottle and
rate it. Next 16 (read `node_modules/next/dist/docs/` first), Prisma 7 on
Neon, next-auth 4, react-three-fiber. On the `condimental` theme. Not live
yet; work merges into `claude/condiment-gallery-setup-tspvdf`.

- **Checks:** `npm run check`: typecheck, lint, vitest, build, `ds:check`,
  audit, Playwright.
- **Danger zones:** the hand-written next-auth adapter; `ALLOWED_EMAILS`
  (unset means nobody can sign in); the shared WebGL renderer for gallery
  stills.
- **Open issues:**
  1. No security headers or CSP.
  2. `npm audit` highs through Prisma's tooling.
  3. The header still shows a removed user as signed in until reload.
  4. Needs `ALLOWED_EMAILS` in Vercel before launch.

## time-dissonance

How many hours daylight saving has taken from you. React and Vite. Theme
`dissonance`.

- **Ships:** PR to `main`, CI, Vercel.
- **Checks:** `npm run check`: lint, vitest, `dst:check`, build, audit,
  Playwright.
- **Danger zones:** `src/lib/dst-table.js` is generated from tzdb by
  `scripts/gen-dst.mjs`. When Node's tz database changes, run
  `npm run dst:generate` and bump `.nvmrc`.
- **Open issues:** none known.

## eye-for-type

Learn and practise kerning and rag. Static ES modules, no app dependencies.
Theme `specimen`.

- **Ships:** PR to `main`, CI, Vercel (`scripts/build.sh`).
- **Checks:** `npm run check`: unit tests, `ds:check`, audit, build, 36
  browser tests, including runs with font hinting on as GitHub's runners do.
- **Danger zones:** saved scores; the rag editor is laid out at 20px and
  scaled to fit, so line breaks match on every screen (17 Oct 2026: CI's
  hinted fonts broke the rag differently at each width).
- **Open issues:** none known.

## ground-frames-register

Geoff's (Trev's dad) register of Southern ground frames as a password-gated
site. Python build, one self-contained page, Vercel functions with private
Blob storage, an overnight job that applies Geoff's saved corrections. Read
its CLAUDE.md in full before doing anything.

- **Ships:** push to `main` once, then `deploy.sh` checks. The overnight job
  also pushes to `main`.
- **Checks:** the strongest in the estate. `verify.py` (cells, fills and
  fonts), `check_batch.py`, browser tests, API concurrency tests, CI that
  fails on SKIP and on a stale build.
- **Danger zones:** Geoff's data (never altered); `nightly.sh`;
  `apply_corrections.py` and `_apply.js` must stay identical; row maps and
  `carry_over.py`; 2 pushes within a minute.
- **Open issues:**
  1. The fixes from 17 Oct are in PR #1, waiting on Trev.
  2. Needs `SESSION_SECRET` in Vercel (signs everyone out once) and a
     firewall rate limit on `POST /`.
  3. "sheet row N" is in monospace.

## holy-pixels

Trev's second pixel-art game. TypeScript, Vite, Vitest, one canvas. Read
`docs/handoff.md` first.

- **Ships:** work branches with neutral names PR straight to `main`, CI,
  Vercel; then check the build line on the menu matches.
- **Checks:** `npm run check`: tsc, vitest, build, smoke test across menu,
  sandbox, launch, fight and flight at 3 sizes. One heavy process at a time.
- **Danger zones:** surprises leaking in titles and branch names; storage
  keys with 2 naming schemes (leave them).
- **Open issues:**
  1. Pinch zoom needs one try on a real phone.
  2. No screenshot comparison against reference images.

## 4hm-the-game

Trev's first pixel-art brawler with minigames. Same stack as holy-pixels.

- **Ships:** PR to `main`, CI, Vercel. Build sha on the title screen.
- **Checks:** `npm run check`: tsc, about 2,400 tests, build, smoke test.
- **Danger zones:** achievement IDs (use the `RENAMED` map, never delete);
  save versions; surprises in branch names.
- **Open issues:**
  1. No control remapping (plan: one `KEYMAP`, then a Keys setting).
  2. About 1.3 MB of WAVs still preload.
  3. Footsteps loop needs a listen on an iPhone.

## trev-delivers

Trev's GitHub profile README. `build.js` draws `card.svg` from GitHub stats
daily through a GitHub Action that commits to `main`.

- **Ships:** the Action, daily at 06:17 UTC and on push.
- **Checks:** `npm run check` (tests against a saved response, `ds:check`,
  audit) on PRs; the daily job fails if its push fails.
- **Danger zones:** the bot commits straight to `main`.
- **Open issues:** none known.
