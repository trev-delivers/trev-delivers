#!/usr/bin/env node
/**
 * Pattern checks for the things nothing else in the estate enforces: the
 * design rules audit-ds doesn't cover, copy rules, risky code, and missing
 * safety nets. Every finding is a lead to verify by reading the code, not a
 * verdict. Read only: it never writes anything.
 *
 *   node scan.mjs <repo>            summary with a few examples per check
 *   node scan.mjs <repo> --all      every match
 *   node scan.mjs <repo> --json     machine-readable
 *
 * Paths listed under "ignore" in the repo's .ds-audit.json are skipped, the
 * same as audit-ds, so a recorded exception stays an exception.
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative, extname, basename } from "node:path";

const args = process.argv.slice(2);
const root = args.find((a) => !a.startsWith("--")) ?? ".";
const ALL = args.includes("--all");
const JSON_OUT = args.includes("--json");

/* .claude and .agents hold vendored skills, ds is the synced design system,
   and content-export / design-options are Hannah's archived material. None of
   it is the app's own code. */
const SKIP_DIRS = new Set([
  "node_modules", ".git", ".next", "dist", "build", "out", "coverage", ".vercel",
  ".turbo", "generated", "ds", ".claude", ".agents", "content-export",
  "design-options", "vendor", ".venv", "venv", "__pycache__", "site", "corrected",
]);
const CODE = new Set([".css", ".scss", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".html", ".astro", ".svelte", ".vue"]);
const PROSE = new Set([".md", ".mdx"]);

let ignore = [];
try {
  ignore = JSON.parse(readFileSync(join(root, ".ds-audit.json"), "utf8")).ignore ?? [];
} catch {}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const rel = relative(root, full);
    if (ignore.some((p) => rel.startsWith(p))) continue;
    let st;
    try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) {
      if (!SKIP_DIRS.has(name)) walk(full, out);
    } else if (st.size < 400_000 && !/\.min\.|lock|\.map$/.test(name)) {
      out.push(full);
    }
  }
  return out;
}

const files = walk(root);
const findings = new Map();
function hit(check, file, line, text) {
  if (!findings.has(check.id)) findings.set(check.id, { ...check, matches: [] });
  findings.get(check.id).matches.push({ file: relative(root, file), line, text: text.trim().slice(0, 140) });
}

/* Line checks. `in` says which files a check reads. `skipComment` drops lines
   that are only a comment, so a note about monospace isn't a use of it. */
const LINE_CHECKS = [
  { id: "mono", area: "design", label: "Monospace in use (rule: no monospace)", in: CODE, skipComment: true,
    re: /\bmonospace\b|font-mono\b|--ds-font-mono|var\(--mono\)|Geist_Mono|JetBrains|IBM Plex Mono|Fira Code|Roboto Mono/ },
  { id: "gradient-text", area: "design", label: "Gradient text (rule: none)", in: CODE, skipComment: true,
    re: /background-clip:\s*text|bg-clip-text|t-gradient-text/ },
  { id: "middle-dot", area: "design", label: "Middle-dot metadata string (rule: none)", in: new Set([".tsx", ".jsx", ".html", ".astro"]), skipComment: true,
    re: /\s·\s|&middot;|\\u00b7/ },
  { id: "link-arrow", area: "design", label: "Arrow tacked onto link or button text (rule: none)", in: new Set([".tsx", ".jsx", ".html", ".astro"]), skipComment: true,
    re: /[A-Za-z]\s?(→|&rarr;|->)\s*<\/(a|button|Link)>/ },
  { id: "hover-lift", area: "design", label: "Hover lift (rule: not on every card)", in: CODE, skipComment: true,
    re: /hover:-translate-y|hover:scale-|:hover[^{]*\{[^}]*translateY\(-/ },
  { id: "zoom-blocked", area: "accessibility", label: "Pinch zoom blocked", in: new Set([".html", ".tsx", ".jsx", ".ts"]),
    re: /maximum-scale\s*=\s*1|user-scalable\s*=\s*(no|0)|maximumScale:\s*1|userScalable:\s*false/ },
  { id: "outline-none", area: "accessibility", label: "Focus outline removed (check there's a replacement)", in: CODE, skipComment: true,
    re: /outline:\s*(none|0)\b|outline-none\b|focus:outline-none/ },
  { id: "href-hash", area: "accessibility", label: 'href="#" used as a button', in: new Set([".tsx", ".jsx", ".html", ".astro"]),
    re: /href=["']#["']/ },
  { id: "inner-html", area: "security", label: "innerHTML / dangerouslySetInnerHTML (check the source is trusted or escaped)", in: CODE, skipComment: true,
    re: /\.innerHTML\s*[+]?=|dangerouslySetInnerHTML|insertAdjacentHTML/ },
  { id: "secret", area: "security", label: "Possible secret in the repo", in: new Set([...CODE, ".json", ".env", ".yml", ".yaml", ".py", ".sql", ".toml"]),
    re: /-----BEGIN [A-Z ]*PRIVATE KEY-----|\bsk_live_[0-9a-zA-Z]{10,}|\bghp_[0-9a-zA-Z]{30,}|\bxox[bp]-[0-9a-zA-Z-]{10,}|service_role[^\n]{0,20}eyJ[A-Za-z0-9_-]{20,}|AKIA[0-9A-Z]{16}/ },
  { id: "raw-error", area: "security", label: "Raw error message shown or returned (check it isn't user-facing)", in: new Set([".ts", ".tsx", ".js", ".jsx"]), skipComment: true,
    re: /(toast|notify|setError|alert|json)\([^)]*(error|err|e)\.message/ },
  { id: "em-dash-ui", area: "copy", label: "Em or en dash in UI code (rule: none in copy; ignore if it's a comment)", in: new Set([".tsx", ".jsx", ".html", ".astro", ".vue", ".svelte"]), skipComment: true,
    re: /[—–]/ },
  { id: "em-dash-docs", area: "copy", label: "Em or en dash in docs", in: PROSE,
    re: /[—–]/ },
  { id: "x-not-y", area: "copy", label: '"X, not Y" phrasing (rule: none)', in: new Set([...PROSE, ".html", ".tsx", ".jsx"]), skipComment: true,
    re: /\w, not (a |an |the )?\w|\w, never \w|not just \w+, but/i },
  { id: "us-spelling", area: "copy", label: "US spelling (UK English)", in: new Set([...PROSE, ".html", ".tsx", ".jsx"]), skipComment: true,
    re: />[^<]*\b(color|favorite|organize|behavior|center|catalog|analyze|license(?= key)|gray)\b[^<]*</i },
];

/* Block check: uppercase and letter-spacing in the same CSS rule, or
   `uppercase` with `tracking-` in one Tailwind class string. That's an
   eyebrow, which the rules ban. */
function eyebrows(file, text) {
  const ext = extname(file);
  if (ext === ".css" || ext === ".scss") {
    const re = /([^{}]+)\{([^}]*)\}/g;
    let m;
    while ((m = re.exec(text))) {
      const body = m[2];
      if (/text-transform:\s*uppercase/.test(body) && /letter-spacing:\s*(?!0\b|normal)/.test(body)) {
        hit(EYEBROW, file, text.slice(0, m.index).split("\n").length, m[1].trim());
      }
    }
  } else if (CODE.has(ext)) {
    text.split("\n").forEach((line, i) => {
      if (/\buppercase\b/.test(line) && /\btracking-(?!normal|tight)/.test(line)) hit(EYEBROW, file, i + 1, line);
      if (/textTransform:\s*["']uppercase/.test(line) && /letterSpacing/.test(line)) hit(EYEBROW, file, i + 1, line);
    });
  }
}
const EYEBROW = { id: "eyebrow", area: "design", label: "Uppercase with letter-spacing, an eyebrow (rule: none)" };

const isComment = (l) => /^\s*(\/\/|\/?\*|<!--|#)/.test(l);

for (const file of files) {
  const ext = extname(file);
  const name = basename(file);
  let text;
  try { text = readFileSync(file, "utf8"); } catch { continue; }
  const lines = text.split("\n");
  for (const c of LINE_CHECKS) {
    const applies = c.in.has(ext) || (c.id === "secret" && name.startsWith(".env") && !name.endsWith(".example"));
    if (!applies) continue;
    lines.forEach((l, i) => {
      if (c.skipComment && isComment(l)) return;
      if (c.re.test(l)) hit(c, file, i + 1, l);
    });
  }
  eyebrows(file, text);
}

/* Repo-level checks: the safety nets from standards/shipping.md. */
const repo = { id: "repo", area: "safety nets", label: "Missing safety nets", matches: [] };
const note = (text, file = ".") => repo.matches.push({ file, line: 0, text });
const has = (p) => existsSync(join(root, p));
const workflows = has(".github/workflows") ? readdirSync(join(root, ".github/workflows")) : [];

if (!workflows.length) note("No CI: .github/workflows is missing, so nothing checks a change before it goes live");
if (!has("CLAUDE.md") && !has("AGENTS.md")) note("No CLAUDE.md: agents start with no rules, checks or danger zones for this repo");

let pkg = null;
try { pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")); } catch {}
if (pkg) {
  const s = pkg.scripts ?? {};
  if (!s.check) note('No "check" script running every check in one command', "package.json");
  if (!s.test && !Object.keys(s).some((k) => k.startsWith("test"))) note("No test script", "package.json");
  if (s.lint && !Object.keys({ ...pkg.devDependencies, ...pkg.dependencies }).some((d) => d.includes("eslint") || d.includes("biome"))) {
    note('"lint" script exists but no linter is installed, so it fails', "package.json");
  }
}
const testFiles = files.filter((f) => /\.(test|spec)\.[cm]?[jt]sx?$|(^|\/)tests?\//.test(relative(root, f)) || /test_.*\.py$/.test(f));
if (!testFiles.length) note("No test files found");

for (const wf of workflows) {
  const file = `.github/workflows/${wf}`;
  const text = readFileSync(join(root, file), "utf8");
  text.split("\n").forEach((l, i) => {
    const m = l.match(/uses:\s*([\w.-]+\/[\w.\/-]+)@([\w.-]+)/);
    if (m && !/^[0-9a-f]{40}$/.test(m[2])) repo.matches.push({ file, line: i + 1, text: `Action pinned by tag, not commit sha: ${m[1]}@${m[2]}` });
    if (/\$\{\{\s*github\.event\.[^}]*(title|body|head_ref|message|name)/.test(l) && /run:/.test(text)) {
      repo.matches.push({ file, line: i + 1, text: "Event text inlined with ${{ }} (pass it through env: instead)" });
    }
  });
  if (!/permissions:/.test(text)) note("Workflow has no permissions: block (defaults may be broad)", file);
  if (!/timeout-minutes:/.test(text)) note("Workflow has no timeout-minutes", file);
}

if (has(".claude/settings.json")) {
  try {
    const allow = JSON.parse(readFileSync(join(root, ".claude/settings.json"), "utf8")).permissions?.allow ?? [];
    for (const a of allow) {
      if (/execute_sql|apply_migration|deploy|delete|merge_branch|reset_branch|create_project|push|rm -rf|Bash\(\*\)|^Bash$/i.test(a)) {
        repo.matches.push({ file: ".claude/settings.json", line: 0, text: `Pre-approved without a prompt: ${a}` });
      }
    }
  } catch {}
}

/* Security headers: Next sets them in next.config, static sites in vercel.json. */
const headerSources = ["next.config.mjs", "next.config.js", "next.config.ts", "vercel.json", "astro.config.mjs"]
  .filter(has).map((f) => readFileSync(join(root, f), "utf8")).join("\n");
if ((has("vercel.json") || pkg) && !/Content-Security-Policy/i.test(headerSources)) {
  note("No Content-Security-Policy header set in next.config or vercel.json");
}
if (/next/.test(JSON.stringify(pkg?.dependencies ?? {})) && has("app") &&
    !["app/error.tsx", "app/error.jsx", "app/error.js"].some(has)) {
  note("No app/error.tsx, so a render error shows Next's default page with no way back", "app");
}
if (has("ds/.version") && has("scripts/sync-ds.mjs")) {
  const ci = workflows.map((w) => readFileSync(join(root, ".github/workflows", w), "utf8")).join("\n");
  if (!/sync-ds|ds:check/.test(ci)) note("ds/ is synced but nothing checks it's current (sync-ds --check in CI)", "ds/");
}
if (repo.matches.length) findings.set("repo", repo);

/* Output. */
const ordered = [...findings.values()].sort((a, b) =>
  ["safety nets", "security", "accessibility", "design", "copy"].indexOf(a.area) -
  ["safety nets", "security", "accessibility", "design", "copy"].indexOf(b.area));

if (JSON_OUT) {
  console.log(JSON.stringify({ root, files: files.length, findings: ordered }, null, 2));
} else {
  console.log(`\n${basename(root === "." ? process.cwd() : root)}: ${files.length} files scanned\n`);
  if (!ordered.length) console.log("Nothing found. Still look at the screens.\n");
  for (const f of ordered) {
    const n = f.matches.length;
    console.log(`${f.area.padEnd(14)} ${f.label}${f.id === "repo" ? "" : `: ${n}`}`);
    for (const m of ALL || f.id === "repo" ? f.matches : f.matches.slice(0, 4)) {
      console.log(`    ${m.file}${m.line ? `:${m.line}` : ""}  ${m.text}`);
    }
    if (!ALL && f.id !== "repo" && n > 4) console.log(`    ...and ${n - 4} more (--all)`);
  }
  console.log("\nLeads, not verdicts: check each against the code before reporting it.\n");
}
