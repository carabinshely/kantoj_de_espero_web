import { existsSync, readFileSync } from 'node:fs';
import ts from 'typescript';
import catalog from '../src/data/public-catalog.json' with { type: 'json' };
import { fail, pass } from './report.mjs';

const read = (path) => readFileSync(path, 'utf8');
const component = read('src/components/ListeningSurface.astro');
const menu = read('src/components/ListenMenu.astro');
const card = read('src/components/SongCard.astro');
const links = read('src/components/ListenLinks.astro');
const site = read('src/lib/site.ts');
const route = (path) => `dist${path}index.html`;
const providerSource = site.match(/export function providerLink[\s\S]*?(?=\nexport function availableProviders)/)?.[0];
if (!providerSource) fail({ check: 'verify:listening', problem: 'Provider URL helper is missing.', cause: 'URL fixtures cannot exercise an absent availability boundary.', path: 'src/lib/site.ts', fix: 'Restore providerLink().' });
const providerModule = { exports: {} };
const providerJs = ts.transpileModule(`${providerSource}\nmodule.exports = providerLink;`, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
new Function('module', 'exports', providerJs)(providerModule, providerModule.exports);
const providerLink = providerModule.exports;
const linksFor = (url, provider) => ({ spotify: provider === 'spotify' ? url : null, apple_music: provider === 'apple_music' ? url : null, youtube_music: null, deezer: null, amazon_music: null, hyperfollow: null });
const providerFixtures = [
  ['spotify song', 'spotify', 'song', 'https://open.spotify.com/track/6cCZjsskx4CGr0CfgDSxI5', true],
  ['spotify wrong entity', 'spotify', 'song', 'https://open.spotify.com/playlist/5rbdelkCrs26Tjc8y2gqWD', false],
  ['spotify invalid id', 'spotify', 'song', 'https://open.spotify.com/track/not-an-id', false],
  ['spotify lookalike host', 'spotify', 'song', 'https://open.spotify.com.evil.example/track/6cCZjsskx4CGr0CfgDSxI5', false],
  ['spotify credentials', 'spotify', 'song', 'https://user:pass@open.spotify.com/track/6cCZjsskx4CGr0CfgDSxI5', false],
  ['apple song', 'apple_music', 'song', 'https://music.apple.com/us/song/nokta-ombroj/1774576255', true],
  ['apple wrong entity', 'apple_music', 'playlist', 'https://music.apple.com/us/song/nokta-ombroj/1774576255', false],
  ['apple missing storefront', 'apple_music', 'song', 'https://music.apple.com/song/nokta-ombroj/1774576255', false],
  ['apple missing numeric id', 'apple_music', 'song', 'https://music.apple.com/us/song/nokta-ombroj/not-a-number', false],
  ['apple lookalike host', 'apple_music', 'song', 'https://music.apple.com.evil.example/us/song/nokta-ombroj/1774576255', false],
  ['apple fragment', 'apple_music', 'song', 'https://music.apple.com/us/song/nokta-ombroj/1774576255#bad', false]
];
for (const [label, provider, entityType, url, expected] of providerFixtures) {
  const actual = Boolean(providerLink(linksFor(url, provider), provider, entityType));
  if (actual !== expected) fail({ check: 'verify:listening', problem: `Provider URL fixture failed: ${label}.`, cause: `Expected ${expected ? 'available' : 'unavailable'} for ${url}.`, path: 'src/lib/site.ts', fix: 'Tighten providerLink host, entity path, credential, port, and fragment validation.' });
}

for (const marker of ['data-listening-surface', 'data-listening-provider', 'data-listening-load', 'data-listening-fallback', 'data-listening-state', 'data-listening-entity-id']) {
  if (!component.includes(marker)) fail({ check: 'verify:listening', problem: `Missing stable listening hook ${marker}.`, cause: 'Browser and static checks must use stable data hooks rather than styling classes.', path: 'src/components/ListeningSurface.astro', fix: `Restore ${marker} on the shared surface.` });
}
for (const marker of ['role="tablist"', 'role="tab"', 'aria-selected', 'role="tabpanel"']) {
  if (!component.includes(marker)) fail({ check: 'verify:listening', problem: `Missing listening accessibility/fallback contract ${marker}.`, cause: 'Provider selection must be accessible and retain an external fallback.', path: 'src/components/ListeningSurface.astro', fix: `Restore ${marker} to the shared surface.` });
}
if (!links.includes('target="_blank"') || !links.includes('data-analytics-event="listen_click"')) fail({ check: 'verify:listening', problem: 'External listening fallback is incomplete.', cause: 'Every provider state must retain a tracked external link.', path: 'src/components/ListenLinks.astro', fix: 'Keep target=_blank and the existing listen_click contract.' });
if (component.includes('music-kit') || component.includes('MusicKit') || component.includes('play()') || /<iframe[^>]+autoplay=/i.test(component)) fail({ check: 'verify:listening', problem: 'Apple embed or autoplay was introduced despite deferred validation.', cause: 'Apple is external-only and embedded playback must never autoplay.', path: 'src/components/ListeningSurface.astro', fix: 'Keep Apple external-only and create the Spotify iframe only in an explicit handler.' });
if (!component.includes("addEventListener('load'") || !component.includes("addEventListener('error'") || !component.includes("setState('loading'") || !component.includes("setState('configuration-error'")) fail({ check: 'verify:listening', problem: 'Player lifecycle does not expose truthful loading or fallback states.', cause: 'Iframe insertion must remain loading until the observable load event and surface errors/configuration failures.', path: 'src/components/ListeningSurface.astro', fix: 'Use loading, loaded, error, and configuration-error states while retaining the fallback.' });
if (!component.includes("addEventListener('keydown'") || !component.includes('ArrowRight') || !component.includes('Home') || !component.includes('buttons[next].click()')) fail({ check: 'verify:listening', problem: 'Provider tabs lack keyboard navigation.', cause: 'Tab controls require arrow/Home/End keyboard behavior.', path: 'src/components/ListeningSurface.astro', fix: 'Add roving keyboard activation for provider tabs.' });
if (!component.includes('load.dataset.analyticsPlatform = provider')) fail({ check: 'verify:listening', problem: 'Playlist load analytics platform is stale after provider selection.', cause: 'A future Apple playlist must report Apple Music rather than the initial Spotify value.', path: 'src/components/ListeningSurface.astro', fix: 'Update data-analytics-platform whenever the selected provider changes.' });
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
pass('verify:listening', `provider URL validation (${providerFixtures.length} positive/negative fixtures), compact menus, truthful lazy player states, keyboard tabs, external-only Apple fallback, bilingual routes, and explicit playlist loading verified`);
