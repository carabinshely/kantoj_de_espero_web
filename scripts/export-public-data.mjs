import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { TEMPORARY_CANONICAL_BASE } from '../site.config.mjs';
import { PLAYLIST_KEYS, SITE_FACT_KEYS, SONG_KEYS, STREAMING_PLATFORMS, SUPPORT_FACT_KEYS } from './catalog-schema.mjs';

const repoRoot = resolve('..');
const outDir = resolve('src/data');

async function readJson(path) {
  const raw = await readFile(path, 'utf8');
  return JSON.parse(raw.replace(/^\uFEFF/, ''));
}

function pick(record, keys) {
  return Object.fromEntries(keys.map((key) => [key, record[key] ?? null]));
}

function isHttpUrl(value) {
  if (Object.prototype.toString.call(value) !== '[object String]') return false;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function cleanLinks(links = {}) {
  return Object.fromEntries(STREAMING_PLATFORMS.map((platform) => [platform, isHttpUrl(links[platform]) ? links[platform] : null]));
}

const songsRaw = await readJson(resolve(repoRoot, 'data/normalized/songs.json'));
const playlistsRaw = await readJson(resolve(repoRoot, 'data/normalized/playlists.json'));

const songs = songsRaw
  .filter((song) => song.site_status === 'mvp')
  .map((song) => ({ ...pick(song, SONG_KEYS), streaming_links: cleanLinks(song.streaming_links), similar_song_ids: song.similar_song_ids ?? [] }));

const playlists = playlistsRaw
  .filter((playlist) => playlist.site_status === 'mvp')
  .map((playlist) => ({ ...pick(playlist, PLAYLIST_KEYS), streaming_links: cleanLinks(playlist.streaming_links) }));

const START_HERE_PLAYLIST_ID = 'start-here-modern-esperanto-pop-rock';
const startHerePlaylist = playlists.find((playlist) => playlist.id === START_HERE_PLAYLIST_ID);
const startHerePlaylistUrl = startHerePlaylist?.streaming_links?.spotify ?? null;
if (!isHttpUrl(startHerePlaylistUrl)) {
  throw new Error(`Expected ${START_HERE_PLAYLIST_ID} to have a canonical Spotify playlist URL`);
}

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

const defaultSiteFacts = {
  artistName: 'Kantoj de Espero',
  tagline: 'Modern Esperanto Pop-Rock',
  temporaryCanonicalBase: TEMPORARY_CANONICAL_BASE,
  finalDomainReady: false,
  disclosurePreferenceReady: false,
  publicBioReady: false,
  contactMethod: null,
  support: { enabled: false, url: null },
  esperantoCopyApproved: false,
  startHerePlaylistUrl,
  launchNotes: [
    'Final domain is kantojdeespero.com with DNS managed in Cloudflare.',
    'Public bio, disclosure preference, licensing contact, Esperanto MVP copy, and the Start Here playlist URL are owner-approved.',
    'Support routes remain omitted until a support URL and copy are approved.'
  ]
};

async function existingJsonOrNull(path) {
  try {
    return await readJson(path);
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
}

function pickExistingSiteFacts(facts) {
  if (!facts) return {};
  const picked = Object.fromEntries(SITE_FACT_KEYS.filter((key) => key in facts).map((key) => [key, facts[key]]));
  if (facts.support && typeof facts.support === 'object') {
    picked.support = Object.fromEntries(SUPPORT_FACT_KEYS.filter((key) => key in facts.support).map((key) => [key, facts.support[key]]));
  }
  return picked;
}

const existingSiteFacts = pickExistingSiteFacts(await existingJsonOrNull(resolve(outDir, 'site-facts.json')));
const siteFacts = {
  ...defaultSiteFacts,
  ...existingSiteFacts,
  support: { ...defaultSiteFacts.support, ...(existingSiteFacts.support ?? {}) },
  startHerePlaylistUrl,
  launchNotes: defaultSiteFacts.launchNotes
};

await mkdir(outDir, { recursive: true });
await writeFile(resolve(outDir, 'public-catalog.json'), `${JSON.stringify({ songs, playlists }, null, 2)}\n`, 'utf8');
await writeFile(resolve(outDir, 'site-facts.json'), `${JSON.stringify(siteFacts, null, 2)}\n`, 'utf8');
await mkdir(resolve('public'), { recursive: true });
await writeFile(resolve('public/robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${siteFacts.temporaryCanonicalBase}sitemap-index.xml\n`, 'utf8');
console.log(`Exported ${songs.length} songs and ${playlists.length} playlists to src/data/public-catalog.json`);
