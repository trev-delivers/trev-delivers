# Design, UX, IA and interaction

Trev designs. Your job is to build what he means, keep it consistent with the
system, and catch the things a designer would spot on a phone. When you have
to make a design call he hasn't made, make the plainest one that fits the
system, and list it under "What I decided for you".

## The design system

The rules live in obvious's CLAUDE.md under "Design rules for every app that
uses this". As checks:

1. Colours, radius, durations and easing come from `--ds-*` tokens.
2. Spacing and type come from the scale and the type roles
   (`--ds-type-h1-*` and so on). Size, leading and tracking travel together.
3. The theme's pair of faces only: `--ds-font-display` for headings,
   `--ds-font-sans` for everything else. Load no other fonts.
4. No monospace anywhere. Figures use `font-variant-numeric: tabular-nums`.
5. No eyebrows: no small label above a heading, nothing uppercase with
   letter-spacing. Labels are sentence case, `label` type role, no tracking.
6. None of the generated-site furniture: gradient text or washes, pill
   badges above headings, glows and blobs, a coloured stripe down a card,
   01/02/03 on things that aren't steps, hover lift on every card, fade-up on
   every section, emoji or icons in coloured squares, arrows on links,
   middle-dot metadata strings.
7. Exceptions are written in `.ds-audit.json` with the measured reason
   (brookwood-hunt's contrast note is the model). An ignore without a reason
   isn't an exception.
8. `ds/` is current (`node scripts/sync-ds.mjs --check`), or the npm pin is
   recent.

`audit-ds.mjs` checks 1 and part of 3 only. `scripts/scan.mjs` in this skill
checks 4, 5 and parts of 6 by pattern. Neither replaces looking at the
screen. A clean audit isn't proof.

Several apps break these today, including the system itself (it ships
`t-gradient-text`). Don't fix other people's breaches as a side effect;
report them. Don't add new ones.

Brookwood (parchment) is outside the family on purpose: it takes the
primitives and none of the shared components. It's read only anyway.

## UX

- Lead with the task. If the point of the page is a calculator, it's above
  the fold on a phone (time-dissonance hides it under a full-screen hero).
- One primary action per screen.
- Every main action works at every width. condiment-gallery hides "add" on
  phones.
- Anything that ends, deletes or overwrites something asks first, names the
  thing and the consequence, or offers undo.
- Errors stay until the person fixes them. No 3-second error messages.
- Don't block a safe action to stop an unsafe one. MorrisOS guests can't
  turn the speaker down during quiet hours.
- Labels match what the button does ("Make it your own" that copies a link
  is wrong).
- One name per thing across the app, the title and the README.

## IA

- Navigation stays the same between sections of one app (MorrisOS's tab bar
  on phones and sidebar on desktop).
- Every view has an address. Back does what people expect, including closing
  a sheet (ground-frames-register's routes are the model).
- Count the tabs on a phone. Trials and experiments go somewhere quieter.
- Deep links from signed-out visitors come back to the same place after
  sign-in.

## Interaction and motion

- Use the shared pieces before writing new ones: obvious's registry (Sheet,
  Toasts, PlusMenu, motion) and the transitions.dev snippets through
  `transitions-dev`.
- Durations and easing from tokens. Open and close are asymmetric; tune with
  `transitions-polish`.
- Motion explains a change (something appeared, moved, was saved). Don't
  decorate.
- Feedback within 100ms of a tap. Pending states on buttons that wait.
- Games follow holy-pixels' handoff rules: 44px targets, one primary button,
  Escape is Back, ask before ending a run, cutscenes say how to skip.

## Words

Everything on screen goes through `write-like-trev`. Copy checks that can be
automated (no em dashes, length limits) belong in unit tests, as in
holy-pixels' `blurbs.test.ts`.

## Showing Trev

Screenshots at 390px and 1280px, light and dark where the app has both,
before and after. If a change is about motion, a short screen recording or a
sequence of frames. He judges with his eyes; give him something to look at.
