// build.js, run against a saved GitHub response. Nothing here calls the
// real API.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, copyFileSync, cpSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { computeStreaks, statsFrom, renderCard, describe, withAlt } from '../build.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const fixture = JSON.parse(readFileSync(join(root, 'tests/fixture.json'), 'utf8'));
const stats = statsFrom(fixture);
const days = (...counts) => counts.map((c, i) => ({ date: `2026-01-${String(i + 1).padStart(2, '0')}`, contributionCount: c }));

test('statsFrom reads the numbers out of the response', () => {
  assert.deepEqual(stats, { followers: 2, repos: 4, stars: 0, contributions: 1079, currentStreak: 8, longestStreak: 17 });
});

test('statsFrom stops on a GraphQL error', () => {
  assert.throws(() => statsFrom({ errors: [{ message: 'rate limited' }] }), /rate limited/);
});

test('streaks: today not being over yet does not break the current streak', () => {
  assert.deepEqual(computeStreaks(days(1, 1, 1, 0)), { longest: 3, current: 3 });
  assert.deepEqual(computeStreaks(days(1, 1, 0, 0)), { longest: 2, current: 0 });
  assert.deepEqual(computeStreaks(days(2, 0, 1, 1, 1, 1, 0, 3)), { longest: 4, current: 1 });
  assert.deepEqual(computeStreaks([]), { longest: 0, current: 0 });
});

test('the card follows the design rules', () => {
  const svg = renderCard(stats);
  assert.ok(!/mono/i.test(svg), 'a mono face');
  assert.ok(!/letter-spacing/.test(svg), 'tracking');
  assert.ok(!/&#(?:183);|·/.test(svg), 'middle dots');
  assert.ok(!/filter|feGaussianBlur|scanlines|pattern/.test(svg), 'glow or scanlines');
  assert.ok(!/—|&#(?:8212|8211);|–/.test(svg), 'dashes');
  assert.ok(!/>[^<]*[A-Z]{3,}[^<]*</.test(svg.replace(/<title>.*<\/title>/, '')), 'text in capitals');
  assert.match(svg, />Trev Morris</);
});

test('the card has no date on it, so the same numbers draw the same card', () => {
  assert.equal(renderCard(stats), renderCard(stats));
  assert.ok(!/\d{4}-\d{2}-\d{2}/.test(renderCard(stats)));
});

test('screen readers get the numbers', () => {
  const svg = renderCard(stats);
  const label = describe(stats);
  assert.match(label, /1,079 contributions/);
  assert.match(label, /current streak of 8 days/);
  assert.match(label, /longest streak of 17 days/);
  assert.match(label, /4 public repos, 0 stars and 2 followers/);
  assert.ok(svg.includes(`aria-label="${label}"`));
  assert.ok(svg.includes(`<title>${label}</title>`));
});

test('1 of something is singular', () => {
  const label = describe({ ...stats, currentStreak: 1, followers: 1, stars: 1, repos: 1 });
  assert.match(label, /streak of 1 day,/);
  assert.match(label, /1 public repo, 1 star and 1 follower\./);
});

test('withAlt puts the numbers in the README image alt text', () => {
  const readme = '<img src="./card.svg" alt="old words" width="640" />';
  assert.equal(withAlt(readme, stats), `<img src="./card.svg" alt="${describe(stats)}" width="640" />`);
});

test('build.js --fixture writes the card and README, and a second run changes nothing', () => {
  const dir = mkdtempSync(join(tmpdir(), 'card-'));
  copyFileSync(join(root, 'build.js'), join(dir, 'build.js'));
  cpSync(join(root, 'ds'), join(dir, 'ds'), { recursive: true });
  writeFileSync(join(dir, 'README.md'), '<img src="./card.svg" alt="x" width="640" />\n');
  const run = () => execFileSync(process.execPath, ['build.js', '--fixture', join(root, 'tests/fixture.json')], { cwd: dir, env: { PATH: process.env.PATH } }).toString();
  assert.match(run(), /^Updated/);
  assert.equal(readFileSync(join(dir, 'card.svg'), 'utf8'), renderCard(stats));
  assert.match(readFileSync(join(dir, 'README.md'), 'utf8'), /1,079 contributions/);
  assert.match(run(), /^No change/);
});

test('build.js without a token or fixture fails rather than drawing nothing', () => {
  assert.throws(() => execFileSync(process.execPath, ['build.js'], { cwd: root, env: { PATH: process.env.PATH }, stdio: 'pipe' }));
});
