#!/usr/bin/env node
/**
 * Pulls the built design tokens into an app's ds/ folder.
 *
 * This is the canonical copy; each consuming app keeps its own copy at
 * scripts/sync-ds.mjs. Tokens are vendored rather than installed as a
 * dependency on purpose: four of the six apps are private repos, two are
 * not npm-built at all (a static site and a README card generator), and a
 * vendored ds/ keeps every build hermetic with no registry or deploy-key
 * auth in the way. The version stamp in ds/.version is what stops that
 * turning into drift — run with --check in CI to prove a tree is current.
 *
 *   node scripts/sync-ds.mjs              # pull main into ds/
 *   node scripts/sync-ds.mjs --ref v0.2.0 # pin a tag
 *   node scripts/sync-ds.mjs --check      # fail if ds/ is out of date
 *   DS_LOCAL=../obvious node scripts/sync-ds.mjs   # work against a checkout
 */
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";

const REPO = process.env.DS_REPO ?? "https://github.com/trev-delivers/obvious.git";
const args = process.argv.slice(2);
const ref = args.includes("--ref") ? args[args.indexOf("--ref") + 1] : "main";
const check = args.includes("--check");
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
    execFileSync("git", ["clone", "--depth", "1", "--branch", ref, REPO, tmp], { stdio: "pipe" });
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
  const current = existsSync(join(target, ".version")) ? readFileSync(join(target, ".version"), "utf8") : "(none)";
  cleanup();
  if (current !== stamp) {
    console.error(`ds/ is out of date.\n  have: ${current.trim()}\n  want: ${stamp.trim()}\nRun: node scripts/sync-ds.mjs`);
    process.exit(1);
  }
  console.log(`ds/ is current (${stamp.trim()})`);
  process.exit(0);
}

rmSync(target, { recursive: true, force: true });
mkdirSync(target, { recursive: true });
cpSync(join(source, "dist"), target, { recursive: true });
writeFileSync(join(target, ".version"), stamp);
cleanup();

console.log(`Synced ${stamp.trim()} into ds/`);
