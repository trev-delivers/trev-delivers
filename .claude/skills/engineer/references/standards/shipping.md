# Shipping

How a change gets from a branch to live without Trev having to check it.
Most of this comes from ground-frames-register, eye-for-type and 4HM, which
already do it.

## The baseline every repo should have

If a repo is missing any of these, it's a gap to report, and the first thing
to add when you next work there.

1. **One command that runs every check.** `npm run check` (or `./check.sh`
   for Python). It runs, in order: typecheck, lint, unit tests, build,
   design system checks (`ds:check` and `ds:audit --max N` where the app
   uses obvious), and the browser smoke test. It exits non-zero on any
   failure.
2. **CI on every pull request and every push to `main`** running that same
   command. GitHub Actions, Node from `.nvmrc` or `package.json` engines,
   `npm ci`. Template:

   ```yaml
   name: check
   on:
     pull_request:
     push:
       branches: [main]
   permissions:
     contents: read
   concurrency:
     group: check-${{ github.ref }}
     cancel-in-progress: true
   jobs:
     check:
       runs-on: ubuntu-latest
       timeout-minutes: 15
       steps:
         - uses: actions/checkout@<sha>   # pin to a commit sha
         - uses: actions/setup-node@<sha>
           with:
             node-version: 22
             cache: npm
         - run: npm ci
         - run: npx playwright install-deps chromium || true
         - run: npm run check
   ```

   Pin third-party actions to a commit sha with the tag in a comment, and
   let Dependabot bump them.
3. **A browser smoke test** (Playwright). Open every page or screen at 390px
   and 1280px. Fail on any `pageerror` or console error, any empty view, and
   any sideways scroll (`document.documentElement.scrollWidth >
   innerWidth`). ground-frames-register's `tools/test_builder.py` and
   eye-for-type's `tests/e2e.mjs` are the models. This is what catches a
   page that builds fine and is blank when it runs, which is what took the
   register down on 8 Oct 2026.
4. **Skip locally, fail in CI.** A test that needs a tool that isn't
   installed prints `SKIP` and exits 0 on a laptop. CI greps the log for
   `SKIP` and fails. (ground-frames-register `checks.yml`.)
5. **The build in the footer.** Bake the git sha in at build time and show it
   somewhere quiet (4HM title screen, designedbytrev footer). That's how you
   prove what's live.
6. **A live check after every push to `main`.** Wait for the production
   deployment of that exact sha, fetch the live page and compare it with the
   local build (the hashed bundle name, or the sha in the footer). Wait about
   75 seconds and check again, because Vercel can finish 2 close pushes out
   of order. Vercel has also missed a push entirely (12 Oct 2026), so check a
   deployment exists at all.
7. **A CLAUDE.md** with what the repo is, how to run its checks, how it
   ships, its danger zones and its incidents written as dated rules ("this
   happened on 10 Oct 2026"). Keep it true. 4HM's README contradicts its
   code in 5 places, and agents read it first.

## Branches and pull requests

- Work on the branch you were given. Open a PR only when asked.
- On the games (holy-pixels, 4HM) branch names, commit titles and PR titles
  stay generic ("Stage tweaks"). Features are surprises, and GitHub puts the
  branch name in merge commits.
- Commit messages follow `write-like-trev`: imperative subject under 60
  characters, a body that explains why when the reason isn't obvious.
- If a PR is yours, it's yours until it's merged: fix CI, answer review,
  keep it mergeable.

## Before pushing

- Run the full check locally and read the output. Don't trust exit codes
  alone on scripts that might swallow errors.
- Reproduce a CI failure locally before you fix it, then show it passing.
- Fetch the base branch first on a shallow clone, or the push gets rejected
  as too big.
- On ground-frames-register, bring `main` in first: the overnight job
  commits to it.

## Unattended jobs (nightly builds, bots, cron)

ground-frames-register's overnight update is the model:

- A quiet period before acting (nothing saved in the last hour).
- `concurrency` group and `timeout-minutes` on the workflow.
- Hand-started runs are dry runs unless someone unticks it.
- `shell: bash` so pipes fail properly. Put the log tail in the step summary.
- Any failure puts nothing live, and GitHub emails Trev.
- An independent check after the batch: exactly the intended things
  changed, everything else is untouched.
- A failed push must fail the job. trev-delivers' retry loop exits green
  after 3 failed pushes (`build.yml:44-48`), so the card can go stale behind
  a green tick.
- Pushes made with `GITHUB_TOKEN` don't trigger other workflows, so CI
  checks on push won't run for the bot's own commits. Run the checks inside
  the job.
- Pin dependencies the job installs, with a lockfile. An unpinned library
  writing someone's master data overnight is a gamble.
