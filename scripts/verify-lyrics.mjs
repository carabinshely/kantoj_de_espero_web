import { readFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fail, pass } from './report.mjs';

const [catalogRaw, fixtureRaw] = await Promise.all([
  readFile('src/data/public-catalog.json', 'utf8'),
  readFile('scripts/fixtures/lyrics-sha256.json', 'utf8')
]);
const catalog = JSON.parse(catalogRaw);
const fixture = JSON.parse(fixtureRaw);
const songIds = new Set(catalog.songs.map((song) => song.id));
for (const id of Object.keys(fixture)) {
  if (!songIds.has(id)) fail({ check: 'verify:lyrics', problem: `Immutable lyric fixture contains unknown song ${id}.`, cause: 'The release fixture must describe exactly the published MVP catalog.', path: 'scripts/fixtures/lyrics-sha256.json', fix: 'Restore the fixture only as part of an owner-approved lyric publication update.' });
}
for (const song of catalog.songs) {
  const expected = fixture[song.id];
  if (!expected) fail({ check: 'verify:lyrics', problem: `Missing immutable lyric fixture for ${song.id}.`, cause: 'A published lyric has no release-integrity baseline.', path: 'scripts/fixtures/lyrics-sha256.json', fix: 'Restore the baseline fixture; do not regenerate it during visual work.' });
  const actual = {
    sha256: createHash('sha256').update(song.lyrics_eo, 'utf8').digest('hex'),
    utf8Bytes: Buffer.byteLength(song.lyrics_eo, 'utf8'),
    lineBreaks: (song.lyrics_eo.match(/\n/g) ?? []).length
  };
  for (const key of ['sha256', 'utf8Bytes', 'lineBreaks']) {
    if (actual[key] !== expected[key]) fail({ check: 'verify:lyrics', problem: `Published lyrics changed for ${song.id} (${key}).`, cause: 'The editorial redesign must preserve lyrics_eo byte-for-byte, including line breaks.', path: `src/data/public-catalog.json:${song.id}.lyrics_eo`, fix: 'Restore the exact published string; fixture changes require a separately approved lyric-publication review.' });
  }
  const escaped = song.lyrics_eo.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  for (const route of [`dist/en/songs/${song.slug}/index.html`, `dist/eo/kantoj/${song.slug}/index.html`]) {
    if (existsSync(route) && !readFileSync(route, 'utf8').includes(escaped)) fail({ check: 'verify:lyrics', problem: `Rendered lyrics differ for ${song.id}.`, cause: 'The template must pass published lyrics_eo through unchanged after HTML escaping.', path: route, fix: 'Render the opaque lyrics_eo value directly in the lyric reading surface.' });
  }
}
pass('verify:lyrics', `${catalog.songs.length} published Esperanto lyrics match immutable SHA-256, UTF-8 byte-length, line-break, and rendered-output fixtures`);
