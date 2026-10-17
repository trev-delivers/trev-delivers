# Front end

Trev and the people using these apps are mostly on phones, often on mobile
data. Build for that first.

## Every screen has all its states

- **Loading:** a skeleton of the real layout (MorrisOS `app/loading.tsx`),
  not a blank box or `fallback={null}`.
- **Empty:** says why it's empty and what to do next (`write-like-trev`).
- **Error:** a plain message and a way out (retry, go back). Next apps have
  `app/error.tsx`, `app/global-error.tsx` and `app/not-found.tsx`. Single
  page apps have an error boundary. Static pages catch errors per section so
  one failure doesn't blank everything (ground-frames-register wraps only one
  of its builders).
- **No script:** if the page hides content until JavaScript runs, it must
  show it when JavaScript fails. designedbytrev stays blank if `site.js`
  throws.
- **Offline or slow:** failures read as "We couldn't connect", never
  "TypeError: Failed to fetch".
- **Partial data:** long names, no photo, one item, 500 items.

## Performance

- Measure before and after. Note the built JS size in the report when it
  changes by more than 10%.
- Images: sized (width and height set), lazy below the fold, modern formats,
  nothing unused in `public/` (designedbytrev ships a 1.3 MB PNG nobody uses).
- Audio and big assets load when needed. 4HM preloads and decodes a 7.1 MB
  footsteps WAV.
- One WebGL context per page where possible. condiment-gallery mounts one
  per card and browsers stop at about 16.
- Don't fake work. time-dissonance adds an 810ms "Working it out" delay to
  an instant sum. Splash screens are skippable and short.
- Caching: HTML `no-cache` (revalidate), hashed assets long-lived. `no-store`
  makes phones download the whole page every visit.

## Next.js

- condiment-gallery and Hannah's site use a recent Next with breaking
  changes. Read `node_modules/next/dist/docs/` before writing code there.
- Pages stay thin; data loads on the server where possible.
- `next/image` needs `images.remotePatterns` for every outside host (Google
  avatars crash condiment-gallery without it).
- Generated clients (Prisma) are generated during the build
  (`postinstall: prisma generate`).

## Code that's easy to change safely

- Comments say why, one per decision (MorrisOS `lib/sonos.ts`,
  daily-routine). Never what the next line does.
- Pure logic lives apart from the DOM so it can be unit tested
  (eye-for-type's scoring, holy-pixels' fight world).
- Files that have grown past about 1,000 lines get split when you next work
  in them (time-dissonance `App.jsx`, 4HM `world.ts`), but only as part of a
  change that needs it.
- Match the surrounding code's style, naming and comment density.

## Games (holy-pixels, 4HM)

- Fixed-step loop with a cap on catch-up steps, interpolation between ticks,
  pause when the tab is hidden. Both games already do this.
- Art integrity tests (grids rectangular, palette only) and pixel-hash
  fingerprints for character rigs.
- Copy rules as unit tests (holy-pixels `src/blurbs.test.ts`).
- Settings through one registry (4HM `registerSetting()`).
- Measure bundle size: art modules live inside the JS.
