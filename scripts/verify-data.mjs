import { readFile } from 'node:fs/promises';
import { FORBIDDEN_KEYS, PLAYLIST_KEYS, PUBLIC_GENRES, PUBLIC_MOODS, PUBLIC_TOPICS, SITE_FACT_KEYS, SONG_KEYS, SUPPORT_FACT_KEYS } from './catalog-schema.mjs';
import { fail, pass } from './report.mjs';

const raw = await readFile('src/data/public-catalog.json', 'utf8').catch(() => null);
if (!raw) fail({ check: 'verify:data', problem: 'Public catalog is missing.', cause: 'Data export has not run.', path: 'src/data/public-catalog.json', fix: 'Run npm run export:data.' });
const catalog = JSON.parse(raw);
const siteFactsRaw = await readFile('src/data/site-facts.json', 'utf8');
const siteFacts = JSON.parse(siteFactsRaw);
const allowedSong = new Set(SONG_KEYS);
const allowedPlaylist = new Set(PLAYLIST_KEYS);


function checkControlledValues(record, field, allowedValues, kind, id) {
  const values = record[field];
  if (!Array.isArray(values)) {
    fail({ check: 'verify:data', problem: `${kind} ${id} has non-array ${field}.`, cause: 'Public taxonomy fields must be arrays of controlled public-safe values.', path: `src/data/public-catalog.json:${id}.${field}`, fix: `Export ${field} as an array using the public taxonomy contract in scripts/catalog-schema.mjs.` });
    return;
  }
  const allowed = new Set(allowedValues);
  for (const value of values) {
    if (!allowed.has(value)) fail({ check: 'verify:data', problem: `${kind} ${id} uses uncontrolled ${field} value: ${value}`, cause: 'Public taxonomy drifted outside the committed standalone website contract.', path: `src/data/public-catalog.json:${id}.${field}`, fix: `Choose an allowed value from scripts/catalog-schema.mjs or intentionally update the public taxonomy contract.` });
  }
}

function checkKeys(record, allowed, kind, id) {
  for (const key of Object.keys(record)) {
    if (!allowed.has(key)) fail({ check: 'verify:data', problem: `${kind} contains a non-allowlisted key: ${key}`, cause: 'Exporter copied data outside the approved public projection.', path: `src/data/public-catalog.json:${id}`, fix: `Remove ${key} from the public exporter allowlist.` });
  }
  for (const key of allowed) {
    if (!(key in record)) fail({ check: 'verify:data', problem: `${kind} is missing required key: ${key}`, cause: 'Exporter output does not match the approved public schema.', path: `src/data/public-catalog.json:${id}`, fix: `Populate ${key} in export-public-data.mjs or source normalized data.` });
  }
}

if (catalog.songs?.length !== 20) fail({ check: 'verify:data', problem: `Expected 20 MVP songs, found ${catalog.songs?.length ?? 0}.`, cause: 'MVP song filter/count drifted.', path: 'src/data/public-catalog.json', fix: 'Filter only site_status=mvp songs and keep the approved 20-song scope.' });
if (catalog.playlists?.length !== 5) fail({ check: 'verify:data', problem: `Expected 5 MVP playlists, found ${catalog.playlists?.length ?? 0}.`, cause: 'Optional future playlist may have leaked or an MVP playlist is missing.', path: 'src/data/public-catalog.json', fix: 'Filter only site_status=mvp playlists and exclude future-optional records.' });

for (const song of catalog.songs) {
  checkKeys(song, allowedSong, 'Song', song.id);
  checkControlledValues(song, 'public_genres', PUBLIC_GENRES, 'Song', song.id);
  checkControlledValues(song, 'public_moods', PUBLIC_MOODS, 'Song', song.id);
  checkControlledValues(song, 'public_topics', PUBLIC_TOPICS, 'Song', song.id);
}
for (const playlist of catalog.playlists) checkKeys(playlist, allowedPlaylist, 'Playlist', playlist.id);
const siteFactAllowed = new Set(SITE_FACT_KEYS);
for (const key of Object.keys(siteFacts)) if (!siteFactAllowed.has(key)) fail({ check: 'verify:data', problem: `Site facts contain a non-allowlisted key: ${key}`, cause: 'Owner launch metadata outside the public schema would be published.', path: 'src/data/site-facts.json', fix: `Remove ${key} or add a public-safe schema key intentionally.` });
const supportAllowed = new Set(SUPPORT_FACT_KEYS);
for (const key of Object.keys(siteFacts.support ?? {})) if (!supportAllowed.has(key)) fail({ check: 'verify:data', problem: `Support facts contain a non-allowlisted key: ${key}`, cause: 'Nested support metadata outside the public schema would be published.', path: 'src/data/site-facts.json:support', fix: `Remove ${key} or add a public-safe support schema key intentionally.` });

for (const forbidden of FORBIDDEN_KEYS) {
  if (raw.includes(`"${forbidden}"`)) fail({ check: 'verify:data', problem: `Forbidden field name appears in public catalog: ${forbidden}`, cause: 'Private/source-only field crossed the public projection.', path: 'src/data/public-catalog.json', fix: `Remove ${forbidden} from public data output.` });
}

const songIds = new Set(catalog.songs.map((song) => song.id));
const playlistIds = new Set(catalog.playlists.map((playlist) => playlist.id));
for (const song of catalog.songs) {
  if (!song.lyrics_eo.includes('\n')) fail({ check: 'verify:data', problem: `Song lyrics do not preserve line breaks for ${song.id}.`, cause: 'Lyrics were flattened or malformed.', path: `src/data/public-catalog.json:${song.id}`, fix: 'Export lyrics_eo exactly as a multiline string.' });
  for (const slug of song.playlist_slugs) if (!playlistIds.has(slug)) fail({ check: 'verify:data', problem: `Song ${song.id} references missing playlist ${slug}.`, cause: 'Playlist filtering/cross-reference drift.', path: `src/data/public-catalog.json:${song.id}`, fix: 'Keep song playlist_slugs aligned to exported MVP playlists.' });
}
for (const playlist of catalog.playlists) for (const id of playlist.song_ids) if (!songIds.has(id)) fail({ check: 'verify:data', problem: `Playlist ${playlist.id} references missing song ${id}.`, cause: 'Playlist song_ids include a non-exported song.', path: `src/data/public-catalog.json:${playlist.id}`, fix: 'Keep playlist song_ids aligned to exported MVP songs.' });
pass('verify:data', '20 songs, 5 playlists, allowlisted public schema, controlled public taxonomy');
