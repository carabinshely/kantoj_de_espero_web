import { existsSync, readFileSync } from 'node:fs';
import catalog from '../src/data/public-catalog.json' with { type: 'json' };
import { fail, pass } from './report.mjs';

const read = (path) => readFileSync(path, 'utf8');
const component = read('src/components/ListeningSurface.astro');
const menu = read('src/components/ListenMenu.astro');
const card = read('src/components/SongCard.astro');
const links = read('src/components/ListenLinks.astro');
const site = read('src/lib/site.ts');
const route = (path) => `dist${path}index.html`;

for (const marker of ['data-listening-surface', 'data-listening-provider', 'data-listening-load', 'data-listening-fallback', 'data-listening-state', 'data-listening-entity-id']) {
  if (!component.includes(marker)) fail({ check: 'verify:listening', problem: `Missing stable listening hook ${marker}.`, cause: 'Browser and static checks must use stable data hooks rather than styling classes.', path: 'src/components/ListeningSurface.astro', fix: `Restore ${marker} on the shared surface.` });
}
for (const marker of ['role="tablist"', 'role="tab"', 'aria-selected', 'role="tabpanel"']) {
  if (!component.includes(marker)) fail({ check: 'verify:listening', problem: `Missing listening accessibility/fallback contract ${marker}.`, cause: 'Provider selection must be accessible and retain an external fallback.', path: 'src/components/ListeningSurface.astro', fix: `Restore ${marker} to the shared surface.` });
}
if (!links.includes('target="_blank"') || !links.includes('data-analytics-event="listen_click"')) fail({ check: 'verify:listening', problem: 'External listening fallback is incomplete.', cause: 'Every provider state must retain a tracked external link.', path: 'src/components/ListenLinks.astro', fix: 'Keep target=_blank and the existing listen_click contract.' });
if (component.includes('music-kit') || component.includes('MusicKit') || component.includes('play()') || /<iframe[^>]+autoplay=/i.test(component)) fail({ check: 'verify:listening', problem: 'Apple embed or autoplay was introduced despite deferred validation.', cause: 'Apple is external-only and embedded playback must never autoplay.', path: 'src/components/ListeningSurface.astro', fix: 'Keep Apple external-only and create the Spotify iframe only in an explicit handler.' });
if (!component.includes("addEventListener('click'") || !component.includes('document.createElement(\'iframe\')') || !component.includes('clearPlayer')) fail({ check: 'verify:listening', problem: 'Lazy provider lifecycle is incomplete.', cause: 'The surface must create a player only after the explicit handler and clear it when switching.', path: 'src/components/ListeningSurface.astro', fix: 'Keep iframe creation in click/load handlers and cleanup before a provider switch.' });
if (card.includes('<iframe') || card.includes('ListeningSurface')) fail({ check: 'verify:listening', problem: 'Song cards are no longer compact.', cause: 'Catalog rows must not carry a player surface or frame.', path: 'src/components/SongCard.astro', fix: 'Use ListenMenu only in SongCard.' });
if (!menu.includes('<details') || !menu.includes('Escape') || !menu.includes('role="menu"')) fail({ check: 'verify:listening', problem: 'Compact provider menu lacks keyboard menu behavior.', cause: 'List controls must be keyboard accessible and closable.', path: 'src/components/ListenMenu.astro', fix: 'Use the details menu with Escape focus return.' });
if (!site.includes('providerLink') || !site.includes("url.hostname === 'open.spotify.com'") || !site.includes("music.apple.com")) fail({ check: 'verify:listening', problem: 'Provider URL validation is missing.', cause: 'Only expected provider URL shapes may be available.', path: 'src/lib/site.ts', fix: 'Validate Spotify and Apple hosts and entity paths in providerLink.' });

const song = catalog.songs[0];
for (const path of [`/en/songs/${song.slug}/`, `/eo/kantoj/${song.slug}/`]) {
  if (!existsSync(route(path))) fail({ check: 'verify:listening', problem: `Missing built route ${path}.`, cause: 'Bilingual listening parity cannot be checked.', path: route(path), fix: 'Run npm run build before verify:listening.' });
  const html = read(route(path));
  for (const marker of ['data-listening-surface', 'data-listening-provider="spotify"', 'data-listening-provider="apple_music"', 'data-listening-fallback']) if (!html.includes(marker)) fail({ check: 'verify:listening', problem: `Song route lacks ${marker}.`, cause: 'Songs with both public provider links need equal visible choice and fallback.', path: route(path), fix: 'Render ListeningSurface on both song route families.' });
}
const start = catalog.playlists.find((playlist) => playlist.id === 'start-here-modern-esperanto-pop-rock');
for (const path of [`/en/playlists/${start.slug_en}/`, `/eo/ludlistoj/${start.slug_eo}/`]) {
  const html = read(route(path));
  for (const marker of ['data-listening-mode="explicit"', 'data-listening-load', 'data-listening-provider="spotify"']) if (!html.includes(marker)) fail({ check: 'verify:listening', problem: `Start Here route lacks ${marker}.`, cause: 'Playlist providers must stay behind an explicit load action.', path: route(path), fix: 'Render ListeningSurface with explicitLoad for playlists.' });
}
for (const playlist of catalog.playlists.filter((item) => item.id !== start.id)) for (const path of [`/en/playlists/${playlist.slug_en}/`, `/eo/ludlistoj/${playlist.slug_eo}/`]) if (read(route(path)).includes('<section class="listening-surface"')) fail({ check: 'verify:listening', problem: `Provider-free playlist renders a player: ${path}.`, cause: 'Playlists with no valid public URL must omit the player.', path: route(path), fix: 'Let provider availability control surface rendering.' });
pass('verify:listening', 'provider URL validation, compact menus, lazy song surface, external-only Apple fallback, bilingual routes, and explicit playlist loading verified');
