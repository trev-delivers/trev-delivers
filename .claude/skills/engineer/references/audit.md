# Audits

An audit answers "is this up to scratch?" without Trev having to read
anything but the result. It reports. It doesn't change code unless he says
"fix it" afterwards.

## Scope

- **One repo** by default: the one you're in, or the one he named.
- **The whole estate** when he says "everything": every repo in
  `references/repos.md` that isn't read only or excluded. Read-only repos
  can be audited for his information if he asks. Trev passes those findings
  on himself; don't act on them.
- **One discipline** if he names it ("check the accessibility on Music").

## 1. Mechanical checks

Run these first. They're cheap and they're facts.

1. The repo's own checks, as listed in `references/repos.md` and its
   CLAUDE.md. Install dependencies if needed (`npm ci`). Don't run anything
   that deploys, pushes, writes to a live service or sends email. On
   ground-frames-register that means no `update.sh`, `apply.sh`,
   `deploy.sh` or `nightly.sh`; run `tools/verify.py` and the tests directly.
2. `node <obvious>/.claude/skills/engineer/scripts/scan.mjs <repo>`. Pattern
   checks for the rules nothing else enforces (design rules, copy, risky
   code, missing safety nets). Its findings are leads; verify each one.
3. `node <obvious>/scripts/audit-ds.mjs <repo>` for apps using obvious, and
   `node scripts/sync-ds.mjs --check` where the repo has a `ds/`.
4. `npm audit --omit=dev` (or `pip-audit` if installed).
5. For Supabase apps, `get_advisors` for security and performance on the
   project, if the Supabase tools are connected. Read only.
6. The browser smoke test from `shipping.md`, whether or not the repo has
   one: every page at 390px and 1280px, console errors, empty views,
   sideways scroll, screenshots of each.

## 2. Independent reviewers

Then send one reviewer per discipline, in parallel, each with a fresh
context, so no reviewer is marking its own homework. For a single repo keep
it to 5 or fewer:

1. **Security and data**, using `standards/security.md` and `data.md`.
2. **Front end and performance**, using `frontend.md` and `shipping.md`.
3. **Accessibility**, using `accessibility.md`, with the screenshots and the
   running app.
4. **Design system, UX, IA and interaction**, using `design.md`, obvious's
   rules and the screenshots.
5. **Copy**, using `write-like-trev`, over every string a person sees and
   the README.

Give each reviewer: the repo path, the repo's page from `repos.md`, its
standards file, the mechanical results for its area, and these instructions:

> Read only: don't edit, commit, push, deploy or write to any live service.
> Find real problems a real person would hit. For each, give file:line, what
> happens to whom (in plain words), severity (critical, high, medium, low)
> and a one-line fix. Check every claim against the code or the running app.
> Skip style preferences and anything the repo's CLAUDE.md says is
> deliberate. Note what's done well that other repos should copy.

For the whole estate, run one reviewer per repo or pair of repos instead,
covering all disciplines, and keep the total under 10.

## 3. Verify

Reviewers overstate. Before anything reaches Trev, check each finding
yourself or with a second agent told to disprove it:

- Does the code actually do that? Read the lines.
- Can a real person hit it? Trace the path from a real screen or request.
- Is the severity right? Critical means data loss, someone getting in who
  shouldn't, or the app down for everyone. High means a main task broken for
  some people, or a real security hole with a plausible path.
- Is it already listed in `repos.md`? Then it's a known issue; say whether
  it's still there.

Drop anything that doesn't survive. Say "unverified" on anything you
couldn't confirm but still think matters.

## 4. Report

Trev reads it. Follow `write-like-trev`. For one repo:

1. **A one-line verdict.** "Solid, 2 things to fix" or "Not safe to share
   yet: anyone with a Google account can get in."
2. **The list, worst first.** Each item: what happens, to whom, in plain
   words; how bad; whether he needs to look at a screen to judge it or can
   leave it to you; and a suggested fix. Group by severity. Leave out code.
3. **What's good**, briefly, so it doesn't get broken later.
4. **What wasn't checked** and why (a service wasn't connected, a test
   needs a password).

For the whole estate, add a short table first: repo, verdict, critical and
high counts, and the 1 thing to fix first.

Offer to publish the report as a page if it's long, and offer "fix them" as
the next step, worst first, one PR per repo.

Update `repos.md` with new open issues and remove fixed ones, in the same
change that fixes them or as part of the audit commit if Trev wants the
record kept.
