#!/usr/bin/env node
/**
 * Pulls the built design tokens into an app's ds/ folder.
 *
 * This is the canonical copy; each consuming app keeps its own copy at
 * scripts/sync-ds.mjs. Tokens are vendored rather than installed as a
 * dependency on purpose: four of the six apps are private repos, two are
 * not npm-built at all (a static site and a README card generator), and a
 * vendored ds/ keeps every build hermetic with no registry or deploy-key
 * auth in the way. The version stamp in ds/.version says which obvious
 * commit ds/ came from.
 *
 *   node scripts/sync-ds.mjs              # pull main into ds/
 *   node scripts/sync-ds.mjs --ref v0.2.0 # pin a tag
 *   node scripts/sync-ds.mjs --check      # fail if ds/ isn't an untouched copy
 *                                         # of the commit its stamp names
 *   node scripts/sync-ds.mjs --latest     # fail if ds/ is behind main as well
 *   DS_LOCAL=../obvious node scripts/sync-ds.mjs   # work against a checkout
 *
 * --check used to fail whenever obvious main moved, which turned every app's
 * CI red each time obvious merged anything, with nothing wrong in the app.
 * Now it proves ds/ is exactly what it claims to be (no hand edits, no half
 * sync) and says how far behind main it is. Use --latest where an app should
 * always be on main.
 */
import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { join, relative } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";

const REPO = process.env.DS_REPO ?? "https://github.com/trev-delivers/obvious.git";
const args = process.argv.slice(2);
const ref = args.includes("--ref") ? args[args.indexOf("--ref") + 1] : "main";
const latest = args.includes("--latest");
const check = args.includes("--check") || latest;
const target = join(process.cwd(), "ds");

let source;
let cleanup = () => {};

if (process.env.DS_LOCAL) {
  source = process.env.DS_LOCAL;
  if (!existsSync(join(source, "dist"))) {
    console.error(`DS_LOCAL=${source} has no dist/. Run \`npm run build\` in obvious first.`);
    process.exit(1);
  }
} else {
  const tmp = mkdtempSync(join(tmpdir(), "obvious-"));
  cleanup = () => rmSync(tmp, { recursive: true, force: true });
  try {
    /* A check needs the commit ds/ claims to be, which may be older than
       main, so it takes the history (without file contents until needed). */
    const cloneArgs = check
      ? ["clone", "--filter=blob:none", "--branch", ref, REPO, tmp]
      : ["clone", "--depth", "1", "--branch", ref, REPO, tmp];
    execFileSync("git", cloneArgs, { stdio: "pipe" });
  } catch (err) {
    cleanup();
    console.error(`Could not fetch ${REPO} at ${ref}.\n${err.stderr?.toString() ?? err.message}`);
    process.exit(1);
  }
  source = tmp;
}

const version = JSON.parse(readFileSync(join(source, "package.json"), "utf8")).version;
/* The checkout's own HEAD, not anything baked into dist/ — a generated file
   cannot record the commit it is about to become part of, which is exactly
   why the build no longer tries to. */
let head = "local";
try {
  head = execFileSync("git", ["rev-parse", "--short", "HEAD"], { cwd: source, stdio: ["ignore", "pipe", "ignore"] })
    .toString()
    .trim();
} catch {
  /* DS_LOCAL may not be a checkout; the version still identifies the build */
}
const stamp = `obvious ${version} ${head} (ref: ${ref})\n`;

if (check) {
  const current = existsSync(join(target, ".version")) ? readFileSync(join(target, ".version"), "utf8") : "";
  const claimed = current.match(/^obvious \S+ ([0-9a-f]{7,40}) /)?.[1];
  const fail = (msg) => { cleanup(); console.error(msg); process.exit(1); };
  if (!claimed) fail(`ds/.version doesn't name an obvious commit (${current.trim() || "missing"}).\nRun: node scripts/sync-ds.mjs`);
  if (process.env.DS_LOCAL) fail("--check needs the obvious repo, not DS_LOCAL.");

  try {
    execFileSync("git", ["checkout", "--quiet", claimed], { cwd: source, stdio: "pipe" });
  } catch {
    fail(`ds/ says it came from obvious ${claimed}, which isn't on ${ref}.\nRun: node scripts/sync-ds.mjs`);
  }
  const files = (dir) => {
    const out = [];
    const walk = (d) => {
      for (const name of readdirSync(d)) {
        const full = join(d, name);
        if (statSync(full).isDirectory()) walk(full);
        else out.push(relative(dir, full));
      }
    };
    if (existsSync(dir)) walk(dir);
    return out.filter((f) => f !== ".version").sort();
  };
  const want = files(join(source, "dist"));
  const have = files(target);
  const differ = [
    ...want.filter((f) => !have.includes(f)).map((f) => `missing ${f}`),
    ...have.filter((f) => !want.includes(f)).map((f) => `extra ${f}`),
    ...want.filter((f) => have.includes(f) &&
      !readFileSync(join(source, "dist", f)).equals(readFileSync(join(target, f)))).map((f) => `changed ${f}`),
  ];
  if (differ.length) fail(`ds/ doesn't match obvious ${claimed}:\n  ${differ.slice(0, 20).join("\n  ")}\nRun: node scripts/sync-ds.mjs`);

  const behind = Number(execFileSync("git", ["rev-list", "--count", `${claimed}..origin/${ref}`], { cwd: source }).toString().trim());
  cleanup();
  if (behind && latest) fail(`ds/ matches obvious ${claimed}, but that's ${behind} commit${behind === 1 ? "" : "s"} behind ${ref}.\nRun: node scripts/sync-ds.mjs`);
  console.log(`ds/ matches obvious ${claimed}${behind ? ` (${behind} commit${behind === 1 ? "" : "s"} behind ${ref}; run sync-ds to update)` : `, the latest on ${ref}`}`);
  process.exit(0);
}

rmSync(target, { recursive: true, force: true });
mkdirSync(target, { recursive: true });
cpSync(join(source, "dist"), target, { recursive: true });
writeFileSync(join(target, ".version"), stamp);
cleanup();

console.log(`Synced ${stamp.trim()} into ds/`);
