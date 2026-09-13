#!/usr/bin/env node
/**
 * What is this app actually getting from the design system?
 *
 * ds:check already proves the vendored copy is current. That is a different
 * question from whether anything uses it — an app can carry the whole system
 * and still be built entirely out of hard-coded hexes, which is roughly where
 * several of these started.
 *
 * So this counts two things per app. Adoption: which tokens and components
 * are referenced. Bypass: the values that went around the system anyway —
 * literal colours, literal durations, literal easing curves, literal font
 * stacks. Bypass is the number that matters. It is never meant to reach zero
 * (icons need literal fills, one-off textures are one-off decisions) but it
 * should be small, known, and going down rather than quietly up.
 *
 *   node scripts/audit-ds.mjs            # this app
 *   node scripts/audit-ds.mjs ../a ../b  # several, with a roll-up
 *   node scripts/audit-ds.mjs --json     # machine-readable
 *   node scripts/audit-ds.mjs --detail   # with file:line for every finding
 *   node scripts/audit-ds.mjs --max 60   # exit 1 above a budget, for CI
 *
 * An app can declare deliberate exceptions in .ds-audit.json:
 *   { "ignore": ["src/map/"], "note": "basemap styling is not ours" }
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative, extname, basename } from "node:path";

const SKIP_DIRS = new Set([
  "node_modules", ".git", ".next", "dist", "build", "out", "coverage",
  ".vercel", ".turbo", "generated", "ds", "scripts",
]);
/* public/ is deliberately not skipped: on the portfolio it holds site.js,
   which is the entire behaviour layer. Asset files never match EXTENSIONS
   anyway, so nothing binary gets read. */
const EXTENSIONS = new Set([".css", ".scss", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".html"]);

/** The component families the system ships. A row is "used" if any class in
 *  its family appears anywhere in the app's own source. */
const COMPONENTS = {
  "t-input": "field",
  "t-error-msg": "field",
  "t-check-badge": "check-badge",
  "t-check-blur-wrap": "check-badge",
  "t-pro-btn": "pro-button",
  "t-gradient-text": "gradient-text",
  "t-think": "think",
  "t-boot-ring": "boot-ring",
  "t-link": "link",
  "t-reveal": "reveal",
};

const PATTERNS = {
  /* A literal colour that could have been a token. url(#id) is an SVG
     reference, not a colour, and would otherwise dominate the count. */
  colour: {
    label: "literal colours",
    re: /(?<!url\()#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\s*\(/g,
  },
  /* Timings inside a transition or animation. A bare number elsewhere is
     usually a size, so this deliberately only looks where time is meant. */
  duration: {
    label: "literal durations",
    re: /(?:transition|animation)(?:-duration|-delay)?\s*:\s*[^;}]*?\b\d*\.?\d+m?s\b/g,
  },
  easing: {
    label: "literal easing curves",
    re: /cubic-bezier\s*\(|(?<![-\w])linear\s*\(/g,
  },
  /* A stack is only a bypass if it names faces directly. Going through any
     variable — the system's --ds-font-*, or an app's own name for it, which
     is how the Tailwind bridge works — is adoption, not avoidance. */
  font: {
    label: "literal font stacks",
    re: /font-family\s*:\s*(?![^;}]*var\()[^;}]+/g,
  },
};

function walk(dir, files = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return files;
  }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    let stat;
    try {
      stat = statSync(full);
    } catch {
      continue;
    }
    if (stat.isDirectory()) walk(full, files);
    else if (EXTENSIONS.has(extname(entry)) && !basename(entry).includes(".min.")) files.push(full);
  }
  return files;
}

function lineOf(source, index) {
  return source.slice(0, index).split("\n").length;
}

function audit(root) {
  const config = existsSync(join(root, ".ds-audit.json"))
    ? JSON.parse(readFileSync(join(root, ".ds-audit.json"), "utf8"))
    : {};
  const ignore = config.ignore ?? [];

  const files = walk(root);
  /* Exceptions suppress bypass findings only. A file can be outside the
     system's remit and still reference its tokens — palette.ts writes every
     --ds-color-* there is — and hiding that would understate adoption to
     make the bypass number look better, which is the wrong trade. */
  const excused = (rel) => ignore.some((frag) => rel.includes(frag));

  const tokens = new Set();
  const components = new Set();
  const themes = new Set();
  const bypass = Object.fromEntries(Object.keys(PATTERNS).map((k) => [k, []]));

  for (const file of files) {
    const source = readFileSync(file, "utf8");
    const rel = relative(root, file);

    for (const match of source.matchAll(/--ds-[a-z0-9-]+/g)) tokens.add(match[0]);
    for (const [cls, family] of Object.entries(COMPONENTS)) {
      if (new RegExp(`\\b${cls}\\b`).test(source)) components.add(family);
    }
    for (const match of source.matchAll(/ds\/css\/themes\/([a-z]+)\.css/g)) themes.add(match[1]);

    if (excused(rel)) continue;
    for (const [key, { re }] of Object.entries(PATTERNS)) {
      for (const match of source.matchAll(re)) {
        bypass[key].push({ file: rel, line: lineOf(source, match.index), text: match[0].trim().slice(0, 72) });
      }
    }
  }

  let version = "not vendored";
  try {
    version = readFileSync(join(root, "ds", ".version"), "utf8").trim();
  } catch {
    /* An app that has not adopted the system at all still gets a row. */
  }

  return {
    app: basename(root),
    version,
    files: files.length,
    tokens: [...tokens].sort(),
    components: [...components].sort(),
    themes: [...themes].sort(),
    bypass,
    note: config.note,
  };
}

/* ---- reporting ------------------------------------------------------ */

const args = process.argv.slice(2);
const asJson = args.includes("--json");
const detail = args.includes("--detail");
const roots = args.filter((a) => !a.startsWith("--"));
const results = (roots.length ? roots : [process.cwd()]).map(audit);

if (asJson) {
  console.log(JSON.stringify(results, null, 2));
  process.exit(0);
}

const pad = (s, n) => String(s).padEnd(n);
const totalBypass = (r) => Object.values(r.bypass).reduce((n, list) => n + list.length, 0);

console.log("");
console.log(pad("app", 20) + pad("files", 7) + pad("tokens", 8) + pad("components", 12) + pad("bypass", 8) + "theme");
console.log("-".repeat(72));
for (const r of results) {
  console.log(
    pad(r.app, 20) +
      pad(r.files, 7) +
      pad(r.tokens.length, 8) +
      pad(`${r.components.length}/8`, 12) +
      pad(totalBypass(r), 8) +
      (r.themes.join(", ") || "—")
  );
}

console.log("");
for (const r of results) {
  console.log(`${r.app}  ${r.version}`);
  if (r.note) console.log(`  note: ${r.note}`);
  console.log(`  components: ${r.components.length ? r.components.join(", ") : "none"}`);
  for (const [key, { label }] of Object.entries(PATTERNS)) {
    const found = r.bypass[key];
    if (!found.length) continue;
    const where = [...new Set(found.map((f) => f.file))];
    console.log(`  ${pad(label + ":", 24)}${pad(found.length, 5)} in ${where.length} file${where.length === 1 ? "" : "s"}`);
    if (detail) for (const f of found) console.log(`      ${f.file}:${f.line}  ${f.text}`);
    else for (const f of found.slice(0, 3)) console.log(`      e.g. ${f.file}:${f.line}  ${f.text}`);
  }
  console.log("");
}

const grand = results.reduce((n, r) => n + totalBypass(r), 0);
console.log(`${results.length} app${results.length === 1 ? "" : "s"}, ${grand} values going around the system.`);
console.log("Run with --detail to see every one, or declare deliberate exceptions in .ds-audit.json.");
console.log("");

/* A budget rather than a gate at zero. Zero is the wrong target — icons need
   literal fills and a one-off texture is a one-off decision — but a number
   that is allowed to climb without anyone noticing is how a design system
   quietly stops being one. Set it just above where you are and ratchet down. */
const maxAt = args.indexOf("--max");
if (maxAt !== -1) {
  const budget = Number(args[maxAt + 1]);
  if (Number.isNaN(budget)) {
    console.error("--max needs a number");
    process.exit(2);
  }
  if (grand > budget) {
    console.error(`Over budget: ${grand} bypasses against a limit of ${budget}.`);
    process.exit(1);
  }
  console.log(`Within budget (${grand}/${budget}).`);
}
