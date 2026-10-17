#!/usr/bin/env node
/**
 * What is this app actually getting from the design system?
 *
 * ds:check already proves the vendored copy is current. That is a different
 * question from whether anything uses it. An app can carry the whole system
 * and still be built entirely out of hard-coded hexes.
 *
 * So this counts two things per app. Adoption: which tokens, components and
 * registry items are referenced, and which theme is imported. Bypass: values
 * and patterns that went around the system or break its written rules
 * (obvious's CLAUDE.md, "Design rules for every app that uses this"):
 * literal colours, durations, easing curves, font stacks, radii and px font
 * sizes, monospace, eyebrows, gradient text, and fonts loaded that aren't the
 * theme's. Bypass is the number that matters. It isn't meant to reach zero,
 * but it should be small, known and going down.
 *
 *   node scripts/audit-ds.mjs            # this app
 *   node scripts/audit-ds.mjs ../a ../b  # several, with a roll-up
 *   node scripts/audit-ds.mjs --json     # machine-readable
 *   node scripts/audit-ds.mjs --detail   # with file:line for every finding
 *   node scripts/audit-ds.mjs --max 60   # exit 1 above a budget, for CI
 *
 * An app declares deliberate exceptions in .ds-audit.json:
 *   {
 *     "ignore": ["src/map/"],
 *     "note": "basemap styling isn't ours",
 *     "exceptions": {
 *       "gradient-text": { "ignore": ["src/hero.css"], "note": "the gold headline, Trev's call" }
 *     }
 *   }
 * "ignore" excuses every category in those paths. An entry under
 * "exceptions" excuses one category in its paths, and only counts if it has
 * a note saying why.
 *
 * This file is copied into apps as scripts/audit-ds.mjs, so it stays one
 * file with no imports beyond Node's own.
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative, extname, basename, resolve, dirname, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SKIP_DIRS = new Set([
  "node_modules", ".git", ".next", "dist", "build", "out", "coverage",
  ".vercel", ".turbo", "generated", "ds", "scripts",
  /* Vendored agent skills and their references are prose about the rules,
     full of the very patterns this looks for. */
  ".claude", ".agents",
  /* Test fixtures exist to hold bad examples. */
  "fixtures", "__fixtures__",
]);
/* public/ is deliberately not skipped: on the portfolio it holds site.js,
   which is the entire behaviour layer. Asset files never match EXTENSIONS
   anyway, so nothing binary gets read. */
const EXTENSIONS = new Set([".css", ".scss", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".html"]);

/* Where shadcn puts obvious's registry items in an app. It's obvious's code,
   checked by obvious's own audit, so it counts toward neither bypass nor the
   app's own use of ob-* classes. */
const REGISTRY_DIR = `components${sep}obvious${sep}`;

const HERE = dirname(fileURLToPath(import.meta.url));

/* ---- where the system's files are ----------------------------------- */

/** True when the app takes obvious through npm rather than ds/. */
function usesNpmPackage(root) {
  try {
    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
    return Boolean({ ...pkg.dependencies, ...pkg.devDependencies }.obvious);
  } catch {
    return false;
  }
}

/** True when this script is running from inside obvious itself. */
function ownDist() {
  try {
    const own = JSON.parse(readFileSync(join(HERE, "..", "package.json"), "utf8"));
    if (own.name === "obvious" && existsSync(join(HERE, "..", "dist"))) return join(HERE, "..", "dist");
  } catch {
    /* copied into an app */
  }
  return null;
}

/** The built system an app is using: its vendored ds/, or for an npm
 *  consumer the installed package. If the package isn't installed and this
 *  is obvious's own copy of the script, obvious's dist/ stands in. */
export function systemDir(root) {
  if (existsSync(join(root, "ds"))) return join(root, "ds");
  const isObvious = ownDist() === join(root, "dist");
  if (usesNpmPackage(root) || isObvious) {
    const installed = join(root, "node_modules", "obvious", "dist");
    if (existsSync(installed)) return installed;
    return ownDist();
  }
  return null;
}

/** The component families the system ships, read out of the built CSS
 *  rather than listed here, so a new component shows up without anyone
 *  editing this file. A family is "used" if any of its classes appears
 *  anywhere in the app's own source. */
function componentsIn(root) {
  const map = new Map();
  const base = systemDir(root);
  const dir = base && join(base, "css", "components");
  if (!dir || !existsSync(dir)) return map;
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".css"))) {
    const family = basename(file, ".css");
    const css = readFileSync(join(dir, file), "utf8");
    /* Only the classes the component names itself after: a modifier like
       .t-pro-btn--icon is the same family as .t-pro-btn. */
    for (const m of css.matchAll(/\.(t-[a-z0-9-]+)/g)) {
      const cls = m[1];
      if (cls.includes("--")) continue;
      /* link.css styles .t-link.t-gradient-text, which doesn't make
         gradient text part of the link family. The first file to mention a
         class owns it, unless another file is named after it. */
      if (!map.has(cls) || cls.startsWith(`t-${family}`)) map.set(cls, family);
    }
  }
  return map;
}

/** obvious's registry items an app has installed, and the ob-* classes each
 *  one defines. Read from the app's copy in components/obvious/, or from
 *  registry/ when auditing obvious itself. */
function registryIn(root) {
  const classes = new Map();
  const items = new Set();
  const dirs = [join(root, "components", "obvious"), join(root, "registry", "obvious")];
  const dir = dirs.find((d) => existsSync(d));
  if (!dir) return { classes, items, dir: null };
  for (const file of readdirSync(dir)) {
    const item = basename(file, extname(file)).replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
    if (file.endsWith(".tsx")) items.add(item);
    if (!file.endsWith(".css")) continue;
    const css = readFileSync(join(dir, file), "utf8");
    for (const m of css.matchAll(/\.(ob-[a-z0-9-]+)/g)) {
      if (!m[1].includes("--")) classes.set(m[1], item);
    }
  }
  return { classes, items, dir };
}

/** Font family names the given themes declare, lower-cased. */
function themeFaces(root, themes) {
  const faces = new Set();
  const dir = systemDir(root);
  const file = dir && join(dir, "js", "tokens.json");
  if (file && existsSync(file)) {
    let tokens = {};
    try {
      tokens = JSON.parse(readFileSync(file, "utf8"));
    } catch {
      /* unreadable: every load gets flagged, which is the safe side */
    }
    for (const name of themes) {
      const t = tokens.themes?.[name];
      if (!t) continue;
      for (const slot of ["display", "sans", "script"]) {
        for (const face of String(t[`--ds-font-${slot}`] ?? "").split(",")) {
          const clean = face.trim().replace(/^['"]|['"]$/g, "").toLowerCase();
          /* A theme can name a face through a variable an app sets, as
             parchment does with var(--font-fell) and next/font. */
          const viaVar = clean.match(/^var\((--[\w-]+)/);
          if (viaVar) faces.add(viaVar[1]);
          else if (clean) faces.add(clean);
        }
      }
    }
  }
  return faces;
}

/* ---- what counts as a bypass ---------------------------------------- */

function lineOf(source, index) {
  return source.slice(0, index).split("\n").length;
}

/** Removes var(...) calls (one level of nesting deep), so a fallback such as
 *  var(--ds-radius-md, 8px) isn't counted as a literal. */
const stripVars = (value) => value.replace(/var\((?:[^()]|\([^()]*\))*\)/g, "");

/** A px length that isn't 0px and isn't a unit conversion (calc(n * 1px)). */
const PX = /(?<!\*\s*)(?<![\w.])(?!0+(?:\.0+)?px)(?:\d*\.)?\d+px\b/;

/** Finds `prop: value` declarations, CSS (kebab) or JS (camel), and keeps
 *  those whose value passes the test. */
function declarations(source, cssProp, jsProp, test) {
  const out = [];
  const re = new RegExp(`(?<![\\w-])(?:${cssProp})\\s*:\\s*([^;}{\\n]+)|(?<![\\w-])(?:${jsProp})\\s*:\\s*([^,}{\\n]+)`, "g");
  for (const m of source.matchAll(re)) {
    const value = m[1] ?? m[2];
    if (test(value, m[1] === undefined)) out.push({ index: m.index, text: m[0] });
  }
  return out;
}

const pxOrNumber = (value, isJs) => {
  const v = stripVars(value);
  if (PX.test(v)) return true;
  /* React reads a bare number as px: borderRadius: 8, fontSize: 14. */
  return isJs && /^\s*[1-9]\d*(?:\.\d+)?\s*$/.test(v);
};

const regexFinder = (re) => (source) => [...source.matchAll(re)].map((m) => ({ index: m.index, text: m[0] }));

/** Every string literal in a file, with its offset. */
function strings(source) {
  return [...source.matchAll(/"[^"\n]*"|'[^'\n]*'|`[^`]*`/g)].map((m) => ({ index: m.index, text: m[0] }));
}

const TW_UPPER = /(?:^|[\s:"'`])uppercase(?=[\s"'`;]|$)/;
const TW_TRACK = /(?:^|[\s:"'`])tracking-(?!normal\b|0\b)[a-z0-9[]/;

function eyebrows(source) {
  const out = [];
  /* CSS rules and JS style objects: uppercase and tracking in one block. */
  for (const m of source.matchAll(/\{[^{}]*\}/g)) {
    const body = m[0];
    const upper = body.match(/(?:text-transform|textTransform)\s*:\s*['"]?uppercase/);
    const track = body.match(/(?:letter-spacing|letterSpacing)\s*:\s*['"]?(?!(?:0(?:\.0+)?(?:em|px|rem)?|normal)['"]?\s*[;,}\n])[^;,}\n]+/);
    if (upper && track) out.push({ index: m.index + upper.index, text: upper[0] + " + " + track[0].trim() });
  }
  /* Tailwind: uppercase and tracking-* in one class string, one @apply, or
     strings on one line (cn("uppercase", "tracking-wide")). */
  for (const s of strings(source)) {
    if (TW_UPPER.test(s.text) && TW_TRACK.test(s.text)) out.push({ index: s.index, text: s.text });
  }
  for (const m of source.matchAll(/@apply[^;}\n]*/g)) {
    if (TW_UPPER.test(m[0]) && TW_TRACK.test(m[0])) out.push({ index: m.index, text: m[0] });
  }
  const lines = source.split("\n");
  let offset = 0;
  for (const line of lines) {
    const joined = strings(line).map((s) => s.text).join(" ");
    if (TW_UPPER.test(joined) && TW_TRACK.test(joined)) out.push({ index: offset, text: line.trim() });
    offset += line.length + 1;
  }
  return out;
}

/** Fonts the app loads itself: Google Fonts, @font-face, next/font and
 *  @fontsource. Each comes back with the face names it loads. */
function fontLoads(source) {
  const out = [];
  for (const m of source.matchAll(/fonts\.googleapis\.com\/css2?\?[^"'`)\s>]+/g)) {
    const url = m[0].replace(/&amp;/g, "&");
    const faces = [...url.matchAll(/family=([^&:]+)/g)].flatMap((f) =>
      decodeURIComponent(f[1].replace(/\+/g, " ")).split("|").map((s) => s.split(":")[0].trim()),
    );
    out.push({ index: m.index, text: "Google Fonts " + faces.join(", "), faces });
  }
  for (const m of source.matchAll(/@font-face\s*\{[^}]*\}/g)) {
    const fam = m[0].match(/font-family\s*:\s*['"]?([^;'"]+)/);
    const face = fam ? fam[1].trim() : "unnamed";
    out.push({ index: m.index, text: `@font-face ${face}`, faces: [face] });
  }
  for (const m of source.matchAll(/import\s*\{([^}]+)\}\s*from\s*['"]next\/font\/google['"]/g)) {
    const names = m[1].split(",").map((s) => s.trim().split(/\s+as\s+/)[0]).filter(Boolean);
    /* next/font can hand the face to CSS as a variable, which is how a
       theme that says var(--font-fell) gets it. */
    const variables = names.map((n) => {
      const call = source.match(new RegExp(`\\b${n}\\s*\\(\\s*\\{[^}]*?variable\\s*:\\s*['"](--[\\w-]+)`));
      return call ? call[1] : null;
    });
    const faces = names.map((n) => n.replace(/_/g, " "));
    out.push({ index: m.index, text: "next/font " + faces.join(", "), faces, variables });
  }
  for (const m of source.matchAll(/from\s*['"]next\/font\/local['"]/g)) {
    out.push({ index: m.index, text: "next/font/local", faces: [] });
  }
  for (const m of source.matchAll(/['"]@fontsource(?:-variable)?\/([a-z0-9-]+)/g)) {
    const face = m[1].replace(/-/g, " ");
    out.push({ index: m.index, text: `@fontsource ${face}`, faces: [face] });
  }
  return out;
}

const RADIUS_CSS = "border(?:-(?:top|bottom|start|end)-(?:left|right|start|end))?-radius";
const RADIUS_JS = "border(?:Top|Bottom|Start|End)?(?:Left|Right|Start|End)?Radius";

/** Every category. `perLine` collapses several hits on one line into one,
 *  so a single font stack or a -webkit- pair isn't counted three times. The
 *  first 4 keep their original per-match counting. */
export const PATTERNS = {
  /* A literal colour that could have been a token. url(#id) is an SVG
     reference, not a colour. */
  colour: {
    label: "literal colours",
    find: regexFinder(/(?<!url\()#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\s*\(/g),
  },
  /* Timings inside a transition or animation. A bare number elsewhere is
     usually a size, so this only looks where time is meant. */
  duration: {
    label: "literal durations",
    find: regexFinder(/(?:transition|animation)(?:-duration|-delay)?\s*:\s*[^;}]*?\b\d*\.?\d+m?s\b/g),
  },
  easing: {
    label: "literal easing curves",
    find: regexFinder(/cubic-bezier\s*\(|(?<![-\w])linear\s*\(/g),
  },
  /* A stack is only a bypass if it names faces directly. Going through any
     variable (the system's --ds-font-*, or an app's own name for it) is
     adoption. */
  font: {
    label: "literal font stacks",
    find: regexFinder(/font-family\s*:\s*(?![^;}]*var\()[^;}]+/g),
  },
  radius: {
    label: "literal radii",
    perLine: true,
    find: (source) => [
      ...declarations(source, RADIUS_CSS, RADIUS_JS, pxOrNumber),
      ...regexFinder(/(?<![-\w])rounded(?:-[a-z]{1,2})?-\[\d*\.?\d+px\]/g)(source),
    ],
  },
  "font-size": {
    label: "px font sizes",
    perLine: true,
    find: (source) => [
      ...declarations(source, "font-size", "fontSize", pxOrNumber),
      /* The font shorthand: `font: 600 12px/1.4 ...`. CSS only, since a JS
         `font:` key is more often an object. */
      ...declarations(source, "font", "(?!)", (v) => PX.test(stripVars(v))),
      ...regexFinder(/(?<![-\w])text-\[\d*\.?\d+px\]/g)(source),
    ],
  },
  /* No monospace anywhere: the generic family, Tailwind's font-mono, the
     mono slot, and named mono faces. */
  mono: {
    label: "monospace",
    perLine: true,
    find: regexFinder(
      /\bmonospace\b|(?<![-\w])font-mono\b|--ds-font-mono\b|var\(--(?:font-)?mono\)|\b[A-Za-z]+[ +_]Mono\b|\bGeistMono\b|geist\/font\/mono|\bSFMono\b|\bMenlo\b|\bConsolas\b|\bFira[ +_]Code\b/g,
    ),
  },
  /* Capitals with letter-spacing in one rule. */
  eyebrow: {
    label: "eyebrows (caps + tracking)",
    perLine: true,
    find: eyebrows,
  },
  "gradient-text": {
    label: "gradient text",
    perLine: true,
    find: regexFinder(/(?:background-clip|backgroundClip)\s*:\s*['"]?text\b|(?<![-\w])bg-clip-text\b/gi),
  },
  /* Loading a face the theme doesn't name. Needs to know the theme, so the
     audit fills `allowed` in before it runs. */
  "font-loading": {
    label: "fonts loaded outside the theme",
    perLine: true,
    find: (source, ctx) =>
      fontLoads(source).filter(
        (load) =>
          !load.faces.length ||
          !ctx.allowed.size ||
          load.faces.some((f, i) => !ctx.allowed.has(f.toLowerCase()) && !ctx.allowed.has(load.variables?.[i])),
      ),
  },
};

/* ---- the audit ------------------------------------------------------ */

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

/** Reads .ds-audit.json. Exceptions without a note are dropped and reported,
 *  because an ignore with no reason isn't an exception. */
export function readConfig(root) {
  const path = join(root, ".ds-audit.json");
  const config = existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : {};
  const exceptions = {};
  const problems = [];
  for (const [key, entry] of Object.entries(config.exceptions ?? {})) {
    if (!PATTERNS[key]) {
      problems.push(`exceptions.${key}: no such category (one of ${Object.keys(PATTERNS).join(", ")})`);
      continue;
    }
    const ignore = Array.isArray(entry?.ignore) ? entry.ignore.filter((s) => typeof s === "string" && s) : [];
    const note = typeof entry?.note === "string" ? entry.note.trim() : "";
    if (!note) problems.push(`exceptions.${key}: has no note, so it doesn't count`);
    else if (!ignore.length) problems.push(`exceptions.${key}: names no paths, so it doesn't count`);
    else exceptions[key] = { ignore, note };
  }
  return { ignore: config.ignore ?? [], note: config.note, exceptions, problems };
}

export function audit(root) {
  root = resolve(root);
  const config = readConfig(root);
  const files = walk(root);
  const matches = (rel, list) => list.some((frag) => rel.includes(frag));

  const tokens = new Set();
  const components = new Set();
  const themes = new Set();
  const registryUsed = new Set();
  const obClasses = new Set();
  const catalogue = componentsIn(root);
  const registry = registryIn(root);
  const bypass = Object.fromEntries(Object.keys(PATTERNS).map((k) => [k, []]));
  const excused = Object.fromEntries(Object.keys(config.exceptions).map((k) => [k, 0]));

  const sources = files.map((file) => ({ rel: relative(root, file), source: readFileSync(file, "utf8") }));

  /* Adoption first: the theme has to be known before font loading can be
     checked against it. Exceptions never hide adoption. A file can be
     outside the system's remit and still use its tokens. */
  for (const { rel, source } of sources) {
    for (const match of source.matchAll(/--ds-[a-z0-9-]+/g)) tokens.add(match[0]);
    for (const [cls, family] of catalogue) {
      if (new RegExp(`(?<![\\w-])${cls}(?![\\w-])`).test(source)) components.add(family);
    }
    for (const match of source.matchAll(/(?:ds|obvious(?:\/dist)?)\/css\/themes\/([a-z]+)\.css/g)) themes.add(match[1]);

    if ((registry.dir && rel.startsWith(REGISTRY_DIR)) || rel.startsWith(`registry${sep}`)) continue;
    for (const m of source.matchAll(/(?<![\w-])(ob-[a-z0-9-]+)/g)) {
      const item = registry.classes.get(m[1]);
      if (item) {
        obClasses.add(m[1]);
        registryUsed.add(item);
      }
    }
    for (const m of source.matchAll(/components\/obvious\/([A-Za-z-]+)/g)) {
      const item = m[1].replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
      if (registry.items.has(item)) registryUsed.add(item);
    }
  }

  const ctx = { allowed: themeFaces(root, themes) };

  for (const { rel, source } of sources) {
    if (matches(rel, config.ignore)) continue;
    if (rel.startsWith(REGISTRY_DIR)) continue;
    for (const [key, { find, perLine }] of Object.entries(PATTERNS)) {
      const seen = new Set();
      for (const hit of find(source, ctx)) {
        const line = lineOf(source, hit.index);
        if (perLine) {
          if (seen.has(line)) continue;
          seen.add(line);
        }
        const exception = config.exceptions[key];
        if (exception && matches(rel, exception.ignore)) {
          excused[key]++;
          continue;
        }
        bypass[key].push({ file: rel, line, text: hit.text.trim().replace(/\s+/g, " ").slice(0, 72) });
      }
    }
  }
  for (const key of Object.keys(bypass)) bypass[key].sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);

  let version = "not vendored";
  try {
    version = readFileSync(join(root, "ds", ".version"), "utf8").trim();
  } catch {
    if (usesNpmPackage(root)) {
      const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
      version = `npm ${({ ...pkg.dependencies, ...pkg.devDependencies }).obvious}`;
    }
  }

  return {
    app: basename(root),
    version,
    files: files.length,
    tokens: [...tokens].sort(),
    components: [...components].sort(),
    catalogue: new Set(catalogue.values()).size,
    registry: [...registryUsed].sort(),
    registryCatalogue: registry.items.size,
    obClasses: obClasses.size,
    themes: [...themes].sort(),
    bypass,
    excused: Object.fromEntries(
      Object.entries(config.exceptions).map(([k, e]) => [k, { count: excused[k], note: e.note }]),
    ),
    problems: config.problems,
    note: config.note,
  };
}

export const totalBypass = (r) => Object.values(r.bypass).reduce((n, list) => n + list.length, 0);

/* ---- reporting ------------------------------------------------------ */

function report(results, { detail }) {
  const lines = [];
  const log = (s = "") => lines.push(s);
  const pad = (s, n) => String(s).padEnd(n);

  log("");
  log(pad("app", 20) + pad("files", 7) + pad("tokens", 8) + pad("components", 12) + pad("bypass", 8) + "theme");
  log("-".repeat(72));
  for (const r of results) {
    log(
      pad(r.app, 20) +
        pad(r.files, 7) +
        pad(r.tokens.length, 8) +
        pad(`${r.components.length}/${r.catalogue}`, 12) +
        pad(totalBypass(r), 8) +
        (r.themes.join(", ") || "none found"),
    );
  }

  log("");
  for (const r of results) {
    log(`${r.app}  ${r.version}`);
    if (r.note) log(`  note: ${r.note}`);
    log(`  components: ${r.components.length ? r.components.join(", ") : "none"}`);
    if (r.registryCatalogue) {
      log(
        `  registry: ${r.registry.length ? r.registry.join(", ") : "none"} of ${r.registryCatalogue} installed` +
          ` (${r.obClasses} ob-* class${r.obClasses === 1 ? "" : "es"} used)`,
      );
    }
    for (const p of r.problems) log(`  .ds-audit.json: ${p}`);
    for (const [key, { label }] of Object.entries(PATTERNS)) {
      const found = r.bypass[key];
      if (!found.length) continue;
      const where = [...new Set(found.map((f) => f.file))];
      log(`  ${pad(label + ":", 32)}${pad(found.length, 5)} in ${where.length} file${where.length === 1 ? "" : "s"}`);
      if (detail) for (const f of found) log(`      ${f.file}:${f.line}  ${f.text}`);
      else for (const f of found.slice(0, 3)) log(`      e.g. ${f.file}:${f.line}  ${f.text}`);
    }
    for (const [key, { count, note }] of Object.entries(r.excused)) {
      log(`  excused ${PATTERNS[key].label}: ${count}. ${note}`);
    }
    log("");
  }

  const grand = results.reduce((n, r) => n + totalBypass(r), 0);
  log(`${results.length} app${results.length === 1 ? "" : "s"}, ${grand} values going around the system.`);
  log("Run with --detail to see every one, or declare deliberate exceptions in .ds-audit.json.");
  log("");
  return { text: lines.join("\n"), grand };
}

function main(args) {
  const asJson = args.includes("--json");
  const detail = args.includes("--detail");
  const maxAt = args.indexOf("--max");
  const roots = args.filter((a, i) => !a.startsWith("--") && (maxAt === -1 || i !== maxAt + 1));
  const results = (roots.length ? roots : [process.cwd()]).map(audit);

  if (asJson) {
    console.log(JSON.stringify(results, null, 2));
    return 0;
  }

  const { text, grand } = report(results, { detail });
  console.log(text);

  /* A budget rather than a gate at zero. Set it just above where you are
     and ratchet it down. */
  if (maxAt !== -1) {
    const budget = Number(args[maxAt + 1]);
    if (Number.isNaN(budget)) {
      console.error("--max needs a number");
      return 2;
    }
    if (grand > budget) {
      console.error(`Over budget: ${grand} bypasses against a limit of ${budget}.`);
      return 1;
    }
    console.log(`Within budget (${grand}/${budget}).`);
  }
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  process.exitCode = main(process.argv.slice(2));
}
