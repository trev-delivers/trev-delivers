#!/usr/bin/env node
// Fetches live GitHub stats and (re)renders card.svg. Run by
// .github/workflows/build.yml on every push to main and once a day on
// a schedule, then committed back — see that file for the "why".
//
// Deliberately uses the GitHub Actions default GITHUB_TOKEN (via
// GH_TOKEN in the workflow) rather than a personal access token: a
// GraphQL read of a user's own public profile data doesn't need any
// scope beyond that, so there's nothing extra to create or rotate.

import fs from 'node:fs';

const TOKEN = process.env.GH_TOKEN;
const LOGIN = process.env.GH_LOGIN || 'trev-delivers';

if (!TOKEN) {
  console.error('GH_TOKEN env var is required');
  process.exit(1);
}

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
function computeStreaks(days) {
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

async function fetchStats() {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `bearer ${TOKEN}`,
      'Content-Type': 'application/json',
      'User-Agent': 'trev-delivers-profile-readme',
    },
    body: JSON.stringify({ query: QUERY, variables: { login: LOGIN } }),
  });
  if (!res.ok) {
    throw new Error(`GitHub API responded ${res.status}: ${await res.text()}`);
  }
  const { data, errors } = await res.json();
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

// The boot ring from designbytrev.vercel.app, reproduced statically
// here (no CSS animation support in an <img>-embedded SVG) with a
// fixed "mid-boot" pattern lit rather than fully on or fully off —
// reads as alive without needing motion to sell it.
function bootRing(cx, cy, radius, litCount) {
  const count = 12;
  const dotSize = 6;
  let out = '';
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    const lit = i < litCount;
    out += `<rect x="${(x - dotSize / 2).toFixed(2)}" y="${(y - dotSize / 2).toFixed(2)}" width="${dotSize}" height="${dotSize}" rx="1.5" fill="${lit ? '#7C9AFF' : '#2A2D33'}"${lit ? ' filter="url(#glow)"' : ''}/>`;
  }
  return out;
}

function plural(n, word) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

function renderCard(stats) {
  const date = new Date().toISOString().slice(0, 10);

  return `<svg width="640" height="220" viewBox="0 0 640 220" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Trev Morris GitHub stats card">
  <defs>
    <filter id="glow" x="-100%" y="-100%" width="300%" height="300%">
      <feGaussianBlur stdDeviation="2" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <pattern id="scanlines" width="1" height="3" patternUnits="userSpaceOnUse">
      <rect width="1" height="1" fill="#ffffff" opacity="0.035"/>
    </pattern>
  </defs>

  <rect x="0.5" y="0.5" width="639" height="219" rx="14" fill="#0A0B0C" stroke="rgba(255,255,255,0.10)"/>
  <rect x="0.5" y="0.5" width="639" height="219" rx="14" fill="url(#scanlines)"/>

  ${bootRing(70, 110, 34, Math.min(12, Math.max(3, Math.round((stats.contributions / 1500) * 12))))}

  <text x="140" y="44" font-family="ui-monospace,'JetBrains Mono',Menlo,Consolas,monospace" font-size="20" font-weight="700" fill="#ECEDEE" letter-spacing="0.5">TREV MORRIS</text>
  <text x="140" y="64" font-family="ui-monospace,'JetBrains Mono',Menlo,Consolas,monospace" font-size="12.5" fill="#8A8F94">Staff Product Designer &#8212; Cleo</text>
  <line x1="140" y1="78" x2="616" y2="78" stroke="rgba(255,255,255,0.06)"/>

  <text x="140" y="104" font-family="ui-monospace,'JetBrains Mono',Menlo,Consolas,monospace" font-size="13" fill="#C4C8CB">${stats.contributions.toLocaleString()} contributions in the past year</text>
  <text x="140" y="127" font-family="ui-monospace,'JetBrains Mono',Menlo,Consolas,monospace" font-size="13" fill="#C4C8CB">current streak ${plural(stats.currentStreak, 'day')} &#183; longest streak ${plural(stats.longestStreak, 'day')}</text>
  <text x="140" y="150" font-family="ui-monospace,'JetBrains Mono',Menlo,Consolas,monospace" font-size="13" fill="#C4C8CB">${plural(stats.repos, 'public repo')} &#183; ${plural(stats.stars, 'star')} &#183; ${plural(stats.followers, 'follower')}</text>

  <line x1="140" y1="166" x2="616" y2="166" stroke="rgba(255,255,255,0.06)"/>
  <text x="140" y="190" font-family="ui-monospace,'JetBrains Mono',Menlo,Consolas,monospace" font-size="13.5" fill="#7C9AFF">I make complicated products feel obvious.</text>

  <text x="616" y="208" font-family="ui-monospace,'JetBrains Mono',Menlo,Consolas,monospace" font-size="10" fill="#5A5E64" text-anchor="end">auto-generated &#183; ${date}</text>
</svg>
`;
}

async function main() {
  const stats = await fetchStats();
  fs.writeFileSync('card.svg', renderCard(stats));
  console.log('card.svg updated', stats);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
