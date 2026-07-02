import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { SONG_KEYS, PLAYLIST_KEYS, STREAMING_PLATFORMS } from './catalog-schema.mjs';

const repoRoot = resolve('..');
const outDir = resolve('src/data');

async function readJson(path) {
  const raw = await readFile(path, 'utf8');
  return JSON.parse(raw.replace(/^\uFEFF/, ''));
}

function pick(record, keys) {
  return Object.fromEntries(keys.map((key) => [key, record[key] ?? null]));
}

function cleanLinks(links = {}) {
  return Object.fromEntries(STREAMING_PLATFORMS.map((platform) => [platform, typeof links[platform] === 'string' && links[platform].startsWith('http') ? links[platform] : null]));
}

const songsRaw = await readJson(resolve(repoRoot, 'data/normalized/songs.json'));
const playlistsRaw = await readJson(resolve(repoRoot, 'data/normalized/playlists.json'));

const songs = songsRaw
  .filter((song) => song.site_status === 'mvp')
  .map((song) => ({ ...pick(song, SONG_KEYS), streaming_links: cleanLinks(song.streaming_links), similar_song_ids: song.similar_song_ids ?? [] }));

const playlists = playlistsRaw
  .filter((playlist) => playlist.site_status === 'mvp')
  .map((playlist) => ({ ...pick(playlist, PLAYLIST_KEYS), streaming_links: cleanLinks(playlist.streaming_links) }));

if (songs.length !== 20) throw new Error(`Expected 20 MVP songs, found ${songs.length}`);
if (playlists.length !== 5) throw new Error(`Expected 5 MVP playlists, found ${playlists.length}`);

const songIds = new Set(songs.map((song) => song.id));
const playlistIds = new Set(playlists.map((playlist) => playlist.id));
for (const song of songs) {
  song.playlist_slugs = song.playlist_slugs.filter((slug) => playlistIds.has(slug));
}
for (const playlist of playlists) {
  playlist.song_ids = playlist.song_ids.filter((id) => songIds.has(id));
}

const siteFacts = {
  artistName: 'Kantoj de Espero',
  tagline: 'Modern Esperanto Pop-Rock',
  temporaryCanonicalBase: 'https://carabinshely.github.io/kantoj_de_espero_web/',
  finalDomainReady: false,
  disclosurePreferenceReady: false,
  publicBioReady: false,
  contactMethod: null,
  support: { enabled: false, url: null },
  esperantoCopyApproved: false,
  startHerePlaylistUrl: null,
  launchNotes: [
    'Owner-controlled launch facts are intentionally separate from the safe local build.',
    'Add streaming links, contact/support decisions, final domain, public bio, and Esperanto-copy approval before public launch.'
  ]
};

await mkdir(outDir, { recursive: true });
await writeFile(resolve(outDir, 'public-catalog.json'), `${JSON.stringify({ songs, playlists }, null, 2)}\n`, 'utf8');
await writeFile(resolve(outDir, 'site-facts.json'), `${JSON.stringify(siteFacts, null, 2)}\n`, 'utf8');
console.log(`Exported ${songs.length} songs and ${playlists.length} playlists to src/data/public-catalog.json`);
