# Accessibility

The target is WCAG 2.2 AA everywhere, plus a few things that matter on
phones. Check these on every change to something people interact with, and
run `design:accessibility-review` for a full audit.

## Structure

- One `h1`, headings in order, `<main>`, `<nav>`, `<header>`, `<footer>`.
- `lang="en-GB"` on `<html>`.
- Real `<button>` for actions and `<a href>` for navigation. No clickable
  `div`s (daily-routine's card header), no `href="#"` buttons.
- Don't nest interactive things (a `role="checkbox"` row containing a link
  and a button).

## Keyboard and focus

- Everything works with a keyboard, including custom controls
  (eye-for-type's kerning sliders are the model).
- A visible focus ring on everything (obvious `base.css`). Never
  `outline: none` without a replacement that meets 3:1.
- Dialogs and sheets: move focus in, trap Tab, close on Escape, return focus
  to what opened them. Closed overlays get `inert` or `hidden`. `opacity: 0`
  on its own leaves them reachable: daily-routine's hidden Reset button can
  be tabbed to and pressed.
- When content is replaced (results appear, a form resets), move focus to
  the new heading (`tabIndex={-1}`) so screen readers know (time-dissonance).
- Tabs use the tabs pattern: `aria-controls`, `role="tabpanel"`, arrow keys.

## Screen readers

- Icon-only buttons have an `aria-label`.
- `aria-label` on a plain `span` or `div` is ignored. Use visually hidden
  text.
- Live regions announce the final value once. A number counting up inside
  `aria-live` chatters (eye-for-type).
- Tooltips are linked with `aria-describedby`.
- Toggle buttons have `aria-pressed`; groups of them have a group label.
- Text in SVG or canvas has a text alternative with the actual information
  (trev-delivers' stats card).
- Form fields have a real label. Placeholders disappear when you type, so
  they can only ever be hints.

## Seeing

- Text contrast 4.5:1 (3:1 for 24px+ or 19px bold). Non-text (focus rings,
  borders that matter, icons) 3:1. Check muted and status colours: several
  obvious themes fail (routine accent 2.89, morris light warning 2.41, core
  white on accent 3.72). Measure with real values, don't eyeball.
- Never block zoom. No `maximum-scale` or `user-scalable=no` (both games).
  Use `touch-action` on the canvas instead.
- Information isn't carried by colour alone.
- Text no smaller than 12px; body 16px or more on phones.

## Motion

- Respect `prefers-reduced-motion` in CSS and in JS (Framer's
  `MotionConfig reducedMotion="user"`, obvious `prefersReducedMotion()`).
- No flashing more than 3 times a second. Hit flashes in games tie to the
  calm setting.
- Screen shake and similar effects have their own toggle in the game, as
  well as following the OS setting (4HM has one; holy-pixels doesn't).
- Auto-rotating or auto-advancing things stop under reduced motion.

## Touch

- Targets 44px or more on phones (obvious `--ds-control-tap-min`). 24px is
  the legal minimum; it's fiddly with wet hands in a skincare app.
- Swipe areas don't trap the page scroll (eye-for-type's `touch-action:none`
  across the whole word).
- Drag-to-reorder has a non-drag alternative.

## Games

Controls can be remapped, audio has separate music and effects controls,
cutscenes can be skipped, and text is readable at the pixel scale. Both games
have most of this; remapping is the gap.
