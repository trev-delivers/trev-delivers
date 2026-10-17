# Data

The worst thing these apps can do is lose or corrupt something a person
cared about: Geoff's register, the family's stock list, someone's routine,
a player's unlocks. Treat saved data as the most fragile part of every app.

## Databases (Supabase, Postgres)

- **The repo describes production.** Every table, policy, function, trigger
  and storage rule is in a migration file, and a fresh database can be built
  by running them in order. Name files with a full timestamp
  (`20261017143000_guests.sql`) so same-day files sort correctly. MorrisOS
  can't currently be rebuilt from its migrations: same-date files run in
  the wrong order and `items` and the storage policies exist nowhere in the
  repo. Fix by dumping the live schema into a baseline migration.
- **Write migrations as files, review them, then apply.** Prefer a Supabase
  branch to test against. Never apply to production without Trev saying yes
  to that change.
- After any migration, run the Supabase security and performance advisors
  (`get_advisors`) and fix what they flag.
- Constraints back the business rules (one rating per person:
  condiment-gallery's `@@unique`). Foreign keys say what happens on delete.
- Seed data and data fixes are migrations too, with a record. MorrisOS seeds
  recipe packs from the browser, which works but leaves no trace.

## Writes

- Optimistic updates roll back on failure, and the rollback restores only
  the thing that failed. MorrisOS `Shell.tsx` restores a stale copy of the
  whole list, which can undo another phone's change.
- Two devices saving at once must lose nothing. ground-frames-register's
  pattern: conditional writes (ETag `ifMatch` or create-only), re-merge and
  retry on conflict, 409 for "superseded", 503 for "busy, try again", an
  append-only history, and a test against a fake store that interleaves
  calls.
- Insert where an upsert could overwrite something it shouldn't (MorrisOS
  adds guests with insert so a family member can't be turned into a guest).
- Destructive actions confirm first, or offer undo. Admin deletes and guest
  removal in MorrisOS do neither.

## Keeping data live

- MorrisOS's pattern is good: load once on arrival, keep it live with
  realtime, catch up when the app comes back from the background.
- Every table the UI shows live is in the realtime publication.
- Polling pauses when the page is hidden, backs off when it fails, and
  doesn't toast on every failed poll.

## Saved data in the browser (localStorage)

- Wrap every read and write in try/catch with a fallback. Private mode and
  full storage must never stop the app starting.
- Version the keys and the shape (`rg.routine.v8`). Migrate old versions
  on load, then save the migrated result straight away.
- Validate on load: types as well as shapes, drop what doesn't fit, and
  never crash on it (4HM's thread names, eye-for-type's `cleanScores`).
- IDs that other data points to must be stable. daily-routine creates new
  step IDs on every load of an unedited routine, so ticks vanish.
- Renaming an ID needs a rename map. 4HM drops unlocks whose achievement ID
  no longer exists, silently.
- Keep storage key names exactly as they are, even if they're inconsistent.
  Tidying them resets everyone's settings.
- Day boundaries match what the UI shows. daily-routine clears ticks at
  midnight while the night card stays up until 4am.

## Data someone else owns

ground-frames-register shows Geoff's spreadsheet verbatim. Anything derived
is kept visibly separate, suspected errors go to Geoff as queries, and an
independent verifier compares every cell with the source. Apply the same
idea anywhere the data belongs to someone else: show it as it is, and have
a second, independent check that it got through unchanged.
