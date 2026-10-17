# The repos

One page per repo: what it is, how it ships, what checks it has, where the
danger is, and the open issues found in the review of 17 Oct 2026. Fix an
issue and remove it from here in the same change. Line numbers drift; search
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
in `web/`, and the scripts every app uses (`audit-ds.mjs`, `sync-ds.mjs`).

- **Ships:** apps take it by npm tarball pinned to a commit (MorrisOS), by
  `sync-ds.mjs` into `ds/` (the rest), or by `npx shadcn add @obvious/<name>`.
  The docs site deploys on Vercel.
- **Checks:** `npm run check` (build, theme contract, `dist/` committed) and
  a registry smoke test in CI.
- **Danger zones:** semantic token keys (every theme must match `core`, and
  apps break if one disappears); `primitives.json` (changes every app at
  once); the registry components, which apps copy and overwrite.
- **Open issues:**
  - No contrast check in the build, and several theme pairs fail AA (see
    `accessibility.md`).
  - `audit-ds.mjs` misses monospace, eyebrows, gradient text, radius, px type
    sizes, JS timings and font loading; counts vendored `.claude` and
    `.agents` files; shows no theme or components for npm consumers.
  - Ships things its own rules ban: `t-gradient-text`, mono in
    `tooltip.css` and `badge.css`, tracking in `pro-button.css`. Tooltip and
    badge also use portfolio-only variables.
  - No release tags, so every app's pin is "main at some point". Apps are 4
    to 29 commits behind.
  - `check` doesn't build the docs site; the smoke test uses `shadcn@latest`.
  - README has em dashes and aphorisms, and the themes table is stale.

## MorrisOS

The family's home app: Home, Stock, Shop, Meals, Admin, Music (Sonos) and a
guest page for friends at Ty Bach. Next 15, React 19, Supabase with RLS and
Google sign-in, Vercel in Frankfurt. Users: Trev and Emma on phones, guests,
and the shopping skills.

- **Ships:** `claude/*` branch, PR to `main`, Vercel.
- **Checks:** none beyond `next build`. No tests, lint, typecheck script or CI.
- **Danger zones:**
  - `household_members` and `is_household()`: a mistake locks the family out
    or lets strangers in.
  - The policy loop in `20261017_guests.sql`: a new table not added to it is
    readable by guests.
  - The live database. `.claude/settings.json` pre-approves
    `execute_sql` and `apply_migration`, so agents can change it without
    asking. Remove those (needs Trev's yes; it's his config).
  - Sonos tokens sealed with a key from `SONOS_CLIENT_SECRET`.
  - The shopping skills act on real accounts (they stop before payment).
- **Open issues:**
  1. Agents can run SQL on production without asking (above).
  2. Migrations can't rebuild the database: same-date files sort wrong,
     `items` and storage policies aren't in the repo, `tighten_household`
     puts back a hard-coded email list.
  3. No CI or tests.
  4. Guests can read the `sonos_auth` row (`20261017_sonos.sql`).
  5. Guests can't turn the speaker down in quiet hours (`Music.tsx`,
     `api/sonos/action/route.ts`).
  6. No `error.tsx`, `global-error.tsx` or `not-found.tsx`.
  7. Raw database and crypto messages in toasts (`Shell.tsx`, `Guest.tsx`,
     `Admin.tsx`, `api/sonos/callback`).
  8. `api/sonos/action` parses the body outside the `try` and doesn't
     validate it.
  9. Design rule breaches in `globals.css`: monospace on login and boot,
     `.eyebrow` and uppercase labels, glow on the main button, gradient
     tiles, hover lift. The DOS login may be a deliberate exception: ask,
     then record it in `.ds-audit.json`.
  10. Admin deletes and guest removal have no confirm or undo; `admin` isn't
      in the realtime publication; Music toasts on every failed poll.

## designedbytrev

Trev's portfolio. Static HTML, CSS and JS through Vite, 2 Vercel functions
(contribution graph, stats) and password middleware for the stats page. Type
authority for the design system, theme `core`. Has `write-portfolio`.

- **Ships:** PR to `main`, Vercel. Build sha in the footer.
- **Checks:** none beyond the Vite build.
- **Danger zones:** `body.locked` hides the page until JS runs; the GitHub
  HTML scrape in `api/gh-graph.js`; `cssMs` in `site.js` exists because
  minification once broke every timer. Portfolio claims follow
  `write-portfolio`'s truth rules.
- **Open issues:**
  1. A script error leaves the page blank (`index.html` `class="locked"`,
     `site.css`).
  2. About 4 seconds of splash before a first-time visitor sees anything.
  3. contribkit's SVG is inlined with `innerHTML` on Trev's own origin.
  4. No CI; no `sync-ds --check` or audit run anywhere.
  5. No Open Graph or Twitter tags, so shared links have no preview.
  6. Gradient text on "obvious" in the hero breaks his own rule.
  7. Stats password can be guessed without limit; the cookie never rotates
     and lasts 90 days against a comment saying 30.
  8. Unused 1.3 MB PNG in `public/`, unminified `site.js`, graph image
     without dimensions, no security headers.

## daily-routine

Morning and night skincare checklist for Trev and his wife. Vite, React 19,
Framer Motion, localStorage only, share links in the URL hash. Theme
`routine`, whose palette follows the clock (`palette.ts`).

- **Ships:** PR to `main`, Vercel.
- **Checks:** `tsc -b` in the build, `ds:check`, `ds:audit`. `lint` is broken
  (eslint not installed). No tests or CI.
- **Danger zones:** storage keys and shape (`rg.*.v8`); the share format (old
  links must keep working); step IDs, which ticks depend on; the technique
  content, which is health guidance copied with sources.
- **Open issues:**
  1. An unedited routine gets new step IDs on every load, so ticks vanish
     (`routine.ts`, `App.tsx`).
  2. Hidden dialogs are still focusable; Enter on the hidden Reset wipes the
     routine (`ConfirmDialog.tsx`, `TechniqueSheet.tsx`).
  3. After editing a shared routine, reload shows the sharer's version, and
     your own was already overwritten.
  4. Shared links can carry a hidden buy link and malformed fields that blank
     the page; no error boundary.
  5. Keyboard users can't switch cards and can tick hidden steps.
  6. Ticks clear at midnight while the night card shows until 4am.
  7. "Make it your own" copies a share link; the app has 2 names.

## condiment-gallery

Condimental: friends sign in with Google, add a condiment as a 3D bottle and
rate it. Next 16 (read `node_modules/next/dist/docs/` first), React 19,
Prisma 7 on Neon, next-auth 4, react-three-fiber. Meant to use the
`condimental` theme but doesn't use obvious at all yet.

- **Ships:** not yet. One branch, no `main`, migrations run by hand.
- **Checks:** ESLint and the build.
- **Danger zones:** the hand-written next-auth adapter; next-auth 4 on
  Next 16; the generated Prisma path; WebGL contexts per card.
- **Open issues:**
  1. Google avatars through `next/image` with no `remotePatterns` should
     crash the header once someone with a photo signs in.
  2. No `prisma generate` in the build, so a fresh Vercel build fails.
  3. Any Google account can sign in.
  4. One WebGL canvas per card; past about 16 cards they go blank.
  5. No way to add a condiment on a phone.
  6. A validation error shows a crash page and wipes the form.
  7. Off-system: no theme, mono font, eyebrows, gradient text, glass, em
     dashes in copy.
  8. No edit or delete; any URL accepted for logos.

## time-dissonance

How many hours daylight saving has taken from you. React 19 and Vite, almost
all in `src/App.jsx`. Theme `dissonance`.

- **Ships:** PR to `main`, Vercel.
- **Checks:** ESLint config (not run), `ds:audit:ci --max 15` (not run). No
  tests or CI.
- **Danger zones:** the DST tables. The README claims historical accuracy.
- **Open issues:**
  1. DST rules are wrong for several regions and eras (US 1942 to 1945 and
     1946 to 1966, Australia 1944 to 1970, Europe 1946 to 1979). A 1950
     birth is overcounted by 16 to 30 hours. Needs a reviewed table with
     tests against tzdb.
  2. No CI, tests or lint gate.
  3. "Exact age" uses average year and month lengths and UTC midnight.
  4. Focus is lost when results appear and on reset.
  5. The error message clears after 3 seconds.
  6. The calculator sits under a full-screen hero on phones.
  7. Fade-up on every item and a scroll progress bar.
  8. README voice; `.ds-audit.json` ignores files without reasons.

## eye-for-type

Learn and practise kerning and rag. Static ES modules, no dependencies, no
build step beyond copying. Theme `specimen`.

- **Ships:** PR to `main`, Vercel (`scripts/build.sh`).
- **Checks:** 14 unit tests and 23 Playwright tests that replay earlier
  bugs, check sideways scroll at 5 widths and fail on console errors. Good,
  but nothing runs them automatically.
- **Danger zones:** saved scores; the measure-based type sizing in `text.js`.
- **Open issues:**
  1. Tests don't run on deploy; no CI.
  2. The score counts up inside a live region.
  3. If the kerning word fails to lay out, the stage is blank and the button
     does nothing.
  4. `touch-action:none` across the whole word stops page scroll on phones.
  5. Small touch targets; `aria-label` on a span.
  6. Some "X, not Y" copy.

## ground-frames-register

Geoff's (Trev's dad) register of Southern ground frames as a password-gated
site. Python build, one self-contained page, Vercel functions with private
Blob storage, an overnight job that applies Geoff's saved corrections. Its
CLAUDE.md is long and every rule in it was learned the hard way. Read all of
it before doing anything.

- **Ships:** push to `main` once, then `deploy.sh` checks. The overnight job
  also pushes to `main`.
- **Checks:** the strongest in the estate. `verify.py`, `check_batch.py`,
  `check_js.py`, browser tests, API concurrency tests, CI that fails on SKIP
  and on a stale build.
- **Danger zones:** Geoff's data (never altered); `nightly.sh`;
  `apply_corrections.py` and `_apply.js` must stay identical; row maps and
  `carry_over.py`; 2 pushes within a minute.
- **Open issues:**
  1. Cell fills and fonts aren't compared by `verify.py` or `check_batch.py`,
     and fills carry meaning.
  2. `nightly.sh` doesn't URL-encode the password, so a password with `&`,
     `+` or `%` skips carry-over and Geoff's decisions vanish from view.
  3. Unpinned openpyxl writes the master workbook overnight.
  4. The session cookie is a hash of the password; no rate limit; plain `===`
     compares.
  5. One runtime error at boot blanks the site; no `window.onerror`.
  6. 11px muted labels at 3.5:1, uppercase and tracked.
  7. Nightly pushes skip CI's deployment guard and don't recheck after a
     pause.
  8. `no-store` means every phone visit downloads the full 248 KB page.

## holy-pixels

Trev's second pixel-art game. TypeScript, Vite, Vitest, one canvas, no
runtime dependencies. Read `docs/handoff.md` first.

- **Ships:** agents in their own worktrees; the main session checks, merges
  to the dev branch, opens a PR to `main`, merges it and waits until the live
  bundle matches a local build, then reports the build with before and after
  screenshots.
- **Checks:** `npx tsc --noEmit`, `npx vitest run --dir src --testTimeout
  60000`, `npm run build`. About 424 tests. Run one heavy process at a time;
  kill only your own vite.
- **Danger zones:** surprises leaking in titles and branch names; storage
  keys with 2 naming schemes (leave them).
- **Open issues:**
  1. No CI.
  2. No build sha in the game, so the "build number" can't be checked.
  3. Pinch zoom blocked (`index.html`).
  4. Shake can't be turned off in the game.
  5. The dev branch isn't named in CLAUDE.md.
  6. No screenshot tests.

## 4hm-the-game

Trev's first pixel-art brawler with minigames. Same stack as holy-pixels,
about 1,961 tests, CI on every PR, build sha on the title screen.

- **Ships:** PR to `main`, CI, Vercel.
- **Checks:** CI runs `tsc -b`, tests and build.
- **Danger zones:** achievement IDs (renaming wipes unlocks); saves have no
  schema version; surprises in branch names.
- **Open issues:**
  1. A 7.1 MB footsteps WAV is preloaded and decoded.
  2. The README contradicts the code in 5 places.
  3. Renaming an achievement silently deletes players' unlocks.
  4. Pinch zoom blocked.
  5. No control remapping.

## trev-delivers

Trev's GitHub profile README. `build.js` draws `card.svg` from GitHub stats
daily through a GitHub Action that commits to `main`.

- **Ships:** the Action, daily at 06:17 UTC and on push.
- **Checks:** none.
- **Danger zones:** the bot commits straight to `main`.
- **Open issues:**
  1. The push loop exits green after 3 failed pushes.
  2. `ds/` is 29 commits behind, with no check.
  3. The card breaks the design rules: monospace, capitals with tracking,
     middle dots, glow, scanlines.
  4. README copy: em dashes, an emoji, a number in words.
  5. Actions pinned by tag; no concurrency or timeout; write permission at
     workflow level.
  6. Screen readers get none of the stats.
  7. The date stamp forces a commit every day.
