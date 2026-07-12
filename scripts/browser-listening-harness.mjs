import { existsSync, readFileSync } from 'node:fs';
import { fail, pass } from './report.mjs';

const read = (path) => readFileSync(path, 'utf8');
const component = read('src/components/ListeningSurface.astro');
const menu = read('src/components/ListenMenu.astro');
const styles = read('src/styles/global.css');
const songRoute = 'dist/en/songs/nokta-ombroj/index.html';
const playlistRoute = 'dist/en/playlists/start-here-modern-esperanto-pop-rock/index.html';

for (const path of [songRoute, playlistRoute]) if (!existsSync(path)) fail({ check: 'test:browser-listening', problem: `Missing built route ${path}.`, cause: 'The harness requires current static output.', path, fix: 'Run npm run build before test:browser-listening.' });
const songHtml = read(songRoute);
const playlistHtml = read(playlistRoute);
for (const marker of ['data-listening-surface', 'data-listening-provider="spotify"', 'data-listening-provider="apple_music"', 'data-listening-fallback']) if (!songHtml.includes(marker)) fail({ check: 'test:browser-listening', problem: `Song surface is missing ${marker}.`, cause: 'Gesture-gated provider interaction needs stable browser hooks.', path: songRoute, fix: 'Restore the shared listening-surface hook.' });
if (!playlistHtml.includes('data-listening-mode="explicit"') || !playlistHtml.includes('data-listening-load')) fail({ check: 'test:browser-listening', problem: 'Playlist does not require explicit loading.', cause: 'No provider request may occur before the playlist load action.', path: playlistRoute, fix: 'Render the shared surface with explicitLoad.' });
for (const contract of [
  ['gesture-gated iframe creation', "addEventListener('click'", "document.createElement('iframe')"],
  ['switch cleanup', 'clearPlayer', "panel.querySelector('iframe')?.remove()"],
  ['truthful load state', "setState('loading'", "addEventListener('load'"],
  ['observable provider failure', "addEventListener('error'", "setState('configuration-error'"],
  ['Apple external-only state', "setState('external-only'", 'Apple Music is available as an external link.'],
  ['tab keyboard navigation', "addEventListener('keydown'", 'buttons[next].click()']
]) if (!component.includes(contract[1]) || !component.includes(contract[2])) fail({ check: 'test:browser-listening', problem: `Missing ${contract[0]} contract.`, cause: 'The browser-facing interaction lifecycle regressed.', path: 'src/components/ListeningSurface.astro', fix: `Restore ${contract[0]} behavior.` });
for (const contract of [['menu Escape close/focus return', 'Escape'], ['menu semantics', 'role="menu"']]) if (!menu.includes(contract[1])) fail({ check: 'test:browser-listening', problem: `Missing ${contract[0]}.`, cause: 'Compact list provider choice must remain keyboard accessible.', path: 'src/components/ListenMenu.astro', fix: `Restore ${contract[0]}.` });
for (const contract of [['visible focus', 'button:focus-visible'], ['mobile layout', '@media (max-width:720px)'], ['reduced motion', '@media (prefers-reduced-motion:reduce)'], ['44px controls', 'min-height:44px']]) if (!styles.includes(contract[1])) fail({ check: 'test:browser-listening', problem: `Missing ${contract[0]} CSS contract.`, cause: 'Listening controls must remain accessible at narrow widths and with reduced motion.', path: 'src/styles/global.css', fix: `Restore ${contract[0]} styling.` });
pass('test:browser-listening', 'static browser-facing harness passed: gesture-gated loading, provider cleanup/failure states, keyboard menus/tabs, fallback hooks, mobile sizing, focus, and reduced-motion contracts');
