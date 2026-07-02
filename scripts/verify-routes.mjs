import { existsSync, readFileSync } from 'node:fs';
import catalog from '../src/data/public-catalog.json' with { type: 'json' };
import { fail, pass } from './report.mjs';

function routePath(route) { return `dist${route}index.html`; }
function requireRoute(route) {
  if (!existsSync(routePath(route))) fail({ check: 'verify:routes', problem: `Missing generated route ${route}`, cause: 'Astro did not emit an expected MVP route.', path: routePath(route), fix: 'Check page file/getStaticPaths and rerun npm run build.' });
}
const routes = ['/', '/en/', '/eo/', '/en/songs/', '/eo/kantoj/', '/en/playlists/', '/eo/ludlistoj/', '/en/about/', '/eo/pri-ni/', '/en/licensing/', '/eo/licencado/'];
for (const route of routes) requireRoute(route);
for (const song of catalog.songs) { requireRoute(`/en/songs/${song.slug}/`); requireRoute(`/eo/kantoj/${song.slug}/`); }
for (const playlist of catalog.playlists) { requireRoute(`/en/playlists/${playlist.slug_en}/`); requireRoute(`/eo/ludlistoj/${playlist.slug_eo}/`); }
if (existsSync('dist/en/support/index.html') || existsSync('dist/eo/subtenu/index.html')) fail({ check: 'verify:routes', problem: 'Support route was generated while support facts are disabled.', cause: 'Support pages/CTAs must be omitted without approved support URL/copy.', path: 'dist/en/support/index.html', fix: 'Remove support pages until support.enabled and support.url are approved.' });
for (const route of routes) {
  const html = readFileSync(routePath(route), 'utf8');
  if (!html.includes('<main')) fail({ check: 'verify:routes', problem: `Route ${route} has no main landmark.`, cause: 'Base layout may not have rendered.', path: routePath(route), fix: 'Render routes through BaseLayout.' });
}
pass('verify:routes', `${routes.length + catalog.songs.length * 2 + catalog.playlists.length * 2} expected routes generated; support omitted`);
