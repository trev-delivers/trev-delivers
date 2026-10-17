# Security

Most of these apps are for family, friends or a few hundred visitors, so the
realistic threats are small: a curious guest, a shared link, a bot hammering
a form, a compromised dependency, an agent doing something it shouldn't. Fix
the realistic ones properly. Don't build a fortress around a static game.

## Access

- **Enforce access in the database and repeat it on the server.** Hiding a
  button is never the control. MorrisOS does this well: RLS through
  `is_family()` / `is_guest()`, the same `my_role()` used by the middleware,
  and guest limits checked again in `app/api/sonos/action/route.ts`.
- **Every table has RLS on, with named policies, in a migration file.**
  Hannah's site keeps its insert-only enquiry policy only in prose, which is
  the gap to avoid. brookwood-hunt's `supabase/setup.sql` is the model.
- **New tables default to the strictest role.** MorrisOS rewrites policies
  from a hand-kept list in `20261017_guests.sql`. A table missing from that
  list stays readable by guests. Prefer a test that asserts every public
  table's policies, with an allowlist for exceptions.
- **Guard against locking everyone out.** MorrisOS's last-adult trigger is
  the pattern.
- **Allowlist who can sign in** when an app is for named people.
  condiment-gallery lets any Google account in.
- **Middleware uses `getUser()`** (`getSession()` trusts the cookie) and fails closed
  when the role check errors.

## Input

- Validate every request body on the server with a schema (zod is already
  used in condiment-gallery). Parse inside the `try`. Reject unknown shapes
  with a 400 and a plain message.
- Clamp numbers, cap string lengths, allow only `https:` for user-supplied
  links, and check types as well as shapes when loading shared or saved
  data (daily-routine's share links can carry a hidden buy link).
- Escape everything that came from a person or a third party before it goes
  into HTML. Never `innerHTML` a response from someone else's server
  (designedbytrev inlines contribkit's SVG).
- Forms that anyone can reach get a honeypot and length limits (Hannah's
  site), and a rate limit if they send email or write data.
- Never show a query parameter back to the user as a message without an
  allowlist (MorrisOS toasts `?error=` verbatim).

## Passwords and sessions

- Compare secrets in constant time.
- Session cookies: `HttpOnly; Secure; SameSite=Lax`, an expiry that matches
  the comment, and a value that's an HMAC of an issued-at time with a
  separate secret. A hash of the password itself can't be revoked and can
  be cracked offline (ground-frames-register, designedbytrev stats).
- Rate-limit password forms (Vercel firewall rule or a counter in storage).

## Secrets

- Never commit secrets, passwords, tokens or personal data. Use Vercel env
  vars and `.env.local`. Commit a `.env.example` (check `.gitignore` doesn't
  swallow it, as condiment-gallery's `.env*` rule does).
- Don't derive an encryption key from a secret that might be rotated.
  MorrisOS seals Sonos tokens with a key from `SONOS_CLIENT_SECRET`, so
  rotating it breaks Music until someone reconnects.
- Server-only tokens stay server-only. Don't give the browser a policy that
  can read them (MorrisOS guests can select `sonos_auth`).

## Errors

- Users get a plain message from `write-like-trev`. The detail goes to the
  server log. Never show a raw database, crypto or stack message.

## Headers

Every site sets these (Next: `next.config` `headers()`; static: `vercel.json`):

- `Content-Security-Policy` with at least `frame-ancestors 'none';
  object-src 'none'; base-uri 'self'; form-action 'self'`, and a
  `script-src` where the app allows it.
- `X-Content-Type-Options: nosniff`, `Referrer-Policy:
  strict-origin-when-cross-origin`, `Strict-Transport-Security`,
  `Permissions-Policy` listing only what's used.
- `poweredByHeader: false` on Next.

MorrisOS and brookwood-village have good examples.

## Agents and automation

- `.claude/settings.json` must not pre-approve tools that change live data
  (`execute_sql`, `apply_migration`, deploys, deletes). MorrisOS currently
  does. Every change to a live database needs Trev's yes for that change.
- GitHub Actions: least `permissions:` at job level, actions pinned to a
  sha, untrusted event data passed through `env:` and never inlined into
  `run:` with `${{ }}`.

## Dependencies

- Lockfile committed. `npm audit --omit=dev` in the audit, with high and
  critical findings fixed or explained.
- Few dependencies is a feature (eye-for-type has none). Ask before adding
  one for something a few lines would do.
