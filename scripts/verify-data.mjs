import { readFile } from 'node:fs/promises';
import { SONG_KEYS, PLAYLIST_KEYS, FORBIDDEN_KEYS } from './catalog-schema.mjs';
import { fail, pass } from './report.mjs';

const raw = await readFile('src/data/public-catalog.json', 'utf8').catch(() => null);
if (!raw) fail({ check: 'verify:data', problem: 'Public catalog is missing.', cause: 'Data export has not run.', path: 'src/data/public-catalog.json', fix: 'Run npm run export:data.' });
const catalog = JSON.parse(raw);
const allowedSong = new Set(SONG_KEYS);
const allowedPlaylist = new Set(PLAYLIST_KEYS);

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

for (const song of catalog.songs) checkKeys(song, allowedSong, 'Song', song.id);
for (const playlist of catalog.playlists) checkKeys(playlist, allowedPlaylist, 'Playlist', playlist.id);
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
pass('verify:data', '20 songs, 5 playlists, allowlisted public schema');
