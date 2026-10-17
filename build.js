#!/usr/bin/env node
// Fetches live GitHub stats and (re)draws card.svg, and puts the same
// numbers in the README's alt text. Run by .github/workflows/build.yml on
// every push to main and once a day, then committed back if anything
// changed.
//
//   GH_TOKEN=... node build.js          # the real thing, in the Action
//   node build.js --fixture file.json   # from a saved API response, no network
//
// Uses the Action's own GITHUB_TOKEN rather than a personal access token: a
// GraphQL read of a user's own public profile doesn't need any more scope,
// so there's nothing extra to create or rotate.

import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { tokens } from './ds/js/tokens.js';

// The card is drawn in the same core theme designedbytrev is, read straight
// from the design system rather than retyped as hex. An SVG committed to a
// README can't reference a stylesheet or load a font, so this is the one
// consumer that has to take its tokens as values. GitHub shows it with the
// reader's own fonts, so the faces fall back to system-ui. Refresh with
// `node scripts/sync-ds.mjs`.
const t = tokens.themes.core;
const px = (name) => parseFloat(tokens.primitives[name]);

const CARD = {
  bg: t['--ds-color-bg'],
  border: t['--ds-color-border'],
  rule: t['--ds-color-border-subtle'],
  title: t['--ds-color-text'],
  body: t['--ds-color-text-dim'],
  muted: t['--ds-color-text-muted'],
  accent: t['--ds-color-accent-hover'],
  display: t['--ds-font-display'],
  sans: t['--ds-font-sans'],
};

const LOGIN = process.env.GH_LOGIN || 'trev-delivers';

const QUERY = `
  query($login: String!) {
    user(login: $login) {
      followers { totalCount }
      repositories(first: 100, ownerAffiliations: OWNER, isFork: false, privacy: PUBLIC) {
        totalCount
        nodes { stargazerCount }
      }
      contributionsCollection {
        contributionCalendar {
          totalContributions
          weeks { contributionDays { date contributionCount } }
        }
      }
    }
  }
`;

// GitHub's calendar comes back oldest-week-first, each week
// oldest-day-first, so flattening it is already in chronological
// order — no sort needed before walking it for streaks.
export function computeStreaks(days) {
  let longest = 0;
  let running = 0;
  for (const d of days) {
    if (d.contributionCount > 0) {
      running++;
      longest = Math.max(longest, running);
    } else {
      running = 0;
    }
  }

  // Current streak walks backward from the most recent day. A single
  // trailing zero is allowed without breaking it — that's today, and
  // today isn't over yet — but only one: yesterday still has to count.
  let i = days.length - 1;
  if (days[i] && days[i].contributionCount === 0) i--;
  let current = 0;
  for (; i >= 0 && days[i].contributionCount > 0; i--) current++;

  return { longest, current };
}

export async function fetchResponse(token) {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'trev-delivers-profile-readme',
    },
    body: JSON.stringify({ query: QUERY, variables: { login: LOGIN } }),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) {
    throw new Error(`GitHub API responded ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

// Turns the GraphQL response into the numbers on the card.
export function statsFrom({ data, errors }) {
  if (errors) throw new Error(JSON.stringify(errors));
  const user = data.user;
  const repos = user.repositories.nodes;
  const stars = repos.reduce((sum, r) => sum + r.stargazerCount, 0);

  const calendar = user.contributionsCollection.contributionCalendar;
  const days = calendar.weeks.flatMap((w) => w.contributionDays);
  const { longest, current } = computeStreaks(days);

  return {
    followers: user.followers.totalCount,
    repos: user.repositories.totalCount,
    stars,
    contributions: calendar.totalContributions,
    currentStreak: current,
    longestStreak: longest,
  };
}

function plural(n, word) {
  return `${n.toLocaleString('en-GB')} ${word}${n === 1 ? '' : 's'}`;
}

// What the card says, as a sentence. It's the card's aria-label and the
// README image's alt text, so screen readers get the numbers too.
export function describe(stats) {
  return `Trev Morris on GitHub: ${plural(stats.contributions, 'contribution')} in the past year, ` +
    `a current streak of ${plural(stats.currentStreak, 'day')}, a longest streak of ${plural(stats.longestStreak, 'day')}, ` +
    `${plural(stats.repos, 'public repo')}, ${plural(stats.stars, 'star')} and ${plural(stats.followers, 'follower')}.`;
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

// A plain card in the core theme: the name in the display face, everything
// else in the text face, 3 headline numbers and one line for the rest.
// There's no date on it, so it only changes when the numbers do.
export function renderCard(stats) {
  const label = describe(stats);
  const figure = (x, value, caption) => `
  <text x="${x}" y="138" style="font-variant-numeric:tabular-nums" font-family="${CARD.display}" font-size="30" font-weight="${tokens.primitives['--ds-weight-semibold']}" fill="${CARD.title}">${esc(value)}</text>
  <text x="${x}" y="162" font-family="${CARD.sans}" font-size="${px('--ds-text-xs')}" fill="${CARD.muted}">${esc(caption)}</text>`;

  return `<svg width="640" height="220" viewBox="0 0 640 220" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(label)}">
  <title>${esc(label)}</title>
  <rect x="0.5" y="0.5" width="639" height="219" rx="14" fill="${CARD.bg}" stroke="${CARD.border}"/>

  <text x="32" y="50" font-family="${CARD.display}" font-size="22" font-weight="${tokens.primitives['--ds-weight-semibold']}" fill="${CARD.title}">Trev Morris</text>
  <text x="32" y="74" font-family="${CARD.sans}" font-size="${px('--ds-text-sm')}" fill="${CARD.body}">Staff Product Designer at Cleo</text>
  <line x1="32" y1="96" x2="608" y2="96" stroke="${CARD.rule}"/>
${figure(32, stats.contributions.toLocaleString('en-GB'), 'contributions in the past year')}
${figure(248, plural(stats.currentStreak, 'day'), 'current streak')}
${figure(428, plural(stats.longestStreak, 'day'), 'longest streak')}

  <text x="32" y="198" font-family="${CARD.sans}" font-size="${px('--ds-text-xs')}" fill="${CARD.accent}">I make complicated products feel obvious.</text>
  <text x="608" y="198" font-family="${CARD.sans}" font-size="${px('--ds-text-xs')}" fill="${CARD.muted}" text-anchor="end">${esc(`${plural(stats.repos, 'public repo')}, ${plural(stats.stars, 'star')}, ${plural(stats.followers, 'follower')}`)}</text>
</svg>
`;
}

// Puts the card's description into the README's alt text.
export function withAlt(readme, stats) {
  return readme.replace(/(<img src="\.\/card\.svg" alt=")[^"]*(")/, `$1${esc(describe(stats))}$2`);
}

// Writes a file only if it would change, and says which.
function update(path, text) {
  if (fs.existsSync(path) && fs.readFileSync(path, 'utf8') === text) return false;
  fs.writeFileSync(path, text);
  return true;
}

async function main() {
  const args = process.argv.slice(2);
  const fixture = args.includes('--fixture') ? args[args.indexOf('--fixture') + 1] : null;
  let response;
  if (fixture) {
    response = JSON.parse(fs.readFileSync(fixture, 'utf8'));
  } else {
    if (!process.env.GH_TOKEN) throw new Error('GH_TOKEN env var is required (or pass --fixture)');
    response = await fetchResponse(process.env.GH_TOKEN);
  }
  const stats = statsFrom(response);
  const card = update('card.svg', renderCard(stats));
  const readme = update('README.md', withAlt(fs.readFileSync('README.md', 'utf8'), stats));
  console.log(card || readme ? 'Updated' : 'No change', stats);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
