import { existsSync, readFileSync } from 'node:fs';
import catalog from '../src/data/public-catalog.json' with { type: 'json' };
import { fail, pass } from './report.mjs';
import { SITE_BASE } from '../site.config.mjs';
const cleanBase = SITE_BASE.endsWith('/') ? SITE_BASE : `${SITE_BASE}/`;
const usesProjectBase = cleanBase !== '/';
const doubleBase = usesProjectBase ? `${cleanBase}${cleanBase.slice(1)}` : null;

function routePath(route) { return `dist${route}index.html`; }
function routeHtml(route) { return readFileSync(routePath(route), 'utf8'); }
function assertIncludes(route, expected, problem, fix) {
  const html = routeHtml(route);
  if (!html.includes(expected)) fail({ check: 'verify:routes', problem, cause: `Expected rendered content was not found on ${route}.`, path: routePath(route), fix });
}
function assertNotIncludes(route, forbidden, problem, fix) {
  const html = routeHtml(route).toLowerCase();
  if (html.includes(forbidden.toLowerCase())) fail({ check: 'verify:routes', problem, cause: `Stale or launch-gated copy is still rendered on ${route}.`, path: routePath(route), fix });
}

function checkInternalHrefs(route) {
  const page = readFileSync(routePath(route), 'utf8');
  const hrefs = [...page.matchAll(/href="([^"]+)"/g)].map((match) => match[1]);
  for (const href of hrefs) {
    if (doubleBase && href.includes(doubleBase)) fail({ check: 'verify:routes', problem: `Double-base internal href found in ${route}: ${href}`, cause: 'A link was passed through the GitHub Pages base helper more than once.', path: routePath(route), fix: 'Pass root-relative route identities to pageHref() exactly once.' });
    if (href.startsWith('/_astro/') || href.startsWith(cleanBase)) continue;
    if (href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('#')) continue;
    if (usesProjectBase && href.startsWith('/')) fail({ check: 'verify:routes', problem: `Root-relative internal href found in ${route}: ${href}`, cause: 'GitHub Pages project-base deployment would navigate outside /kantoj_de_espero_web/.', path: routePath(route), fix: 'Wrap internal links with pageHref() from src/lib/seo.ts.' });
  }
}

function checkLocalizedShell(route) {
  const page = readFileSync(routePath(route), 'utf8');
  if (route.startsWith('/eo/') && (!page.includes('aria-label="Ĉefa navigado"') || !page.includes('href="/eo/kantoj/"') || !page.includes('href="/eo/ludlistoj/"') || !page.includes('href="/eo/licencado/"'))) fail({ check: 'verify:routes', problem: `Esperanto route ${route} does not keep global navigation in Esperanto.`, cause: 'The shared layout sent Esperanto visitors back to English catalog routes.', path: routePath(route), fix: 'Drive header/footer navigation from the current BaseLayout lang.' });
  if (route.startsWith('/en/') && (!page.includes('aria-label="Primary navigation"') || !page.includes('href="/en/songs/"') || !page.includes('href="/en/playlists/"') || !page.includes('href="/en/licensing/"'))) fail({ check: 'verify:routes', problem: `English route ${route} does not keep global navigation in English.`, cause: 'The shared layout should keep language-local catalog routes.', path: routePath(route), fix: 'Drive header/footer navigation from the current BaseLayout lang.' });
}

function checkLaunchCopy() {
  const publicBio = 'Kantoj de Espero is a modern Esperanto pop-rock project created in 2024 to bring fresh, contemporary energy to the Esperanto community.';
  assertIncludes('/en/about/', publicBio, 'English About page does not render the approved public bio.', 'Update src/pages/en/about/index.astro with the owner-approved public bio.');
  assertIncludes('/eo/pri-ni/', 'Kantoj de Espero estas moderna Esperanta poproka projekto kreita en 2024', 'Esperanto About page does not render the approved public bio.', 'Update src/pages/eo/pri-ni/index.astro with approved public-facing Esperanto copy.');
  for (const route of ['/en/licensing/', '/eo/licencado/']) {
    assertIncludes(route, 'href="mailto:kantojdeespero@gmail.com"', `${route} does not render the approved licensing contact mailto.`, 'Render the approved contact method as the primary licensing action.');
    assertIncludes(route, 'contact-link', `${route} contact email is missing the responsive contact-link class.`, 'Use the contact-link class so long email addresses wrap on narrow screens.');
  }
  for (const route of ['/en/about/', '/eo/pri-ni/', '/en/licensing/', '/eo/licencado/']) {
    assertNotIncludes(route, 'will be added before launch', `${route} still contains stale launch-gated placeholder copy.`, 'Replace placeholder launch text with approved public facts.');
    assertNotIncludes(route, 'blokos publikan publikigon', `${route} still says launch verification will block public release for stale facts.`, 'Replace stale launch-blocker copy with current approved public facts.');
  }
  const css = existsSync('dist/_astro') ? readFileSync('src/styles/global.css', 'utf8') : '';
  if (!css.includes('min-height: 44px') || !css.includes('.contact-link') || !css.includes('overflow-wrap: anywhere')) {
    fail({ check: 'verify:routes', problem: 'Responsive contact/action CSS guard is missing.', cause: 'Design acceptance requires keyboard/touch-friendly actions and wrapping email contact links.', path: 'src/styles/global.css', fix: 'Keep .button at least 44px high and .contact-link wrapping long email addresses.' });
  }
}

function requireRoute(route) {
  if (!existsSync(routePath(route))) fail({ check: 'verify:routes', problem: `Missing generated route ${route}`, cause: 'Astro did not emit an expected MVP route.', path: routePath(route), fix: 'Check page file/getStaticPaths and rerun npm run build.' });
}
const routes = ['/', '/en/', '/eo/', '/en/songs/', '/eo/kantoj/', '/en/playlists/', '/eo/ludlistoj/', '/en/about/', '/eo/pri-ni/', '/en/licensing/', '/eo/licencado/'];
for (const route of routes) requireRoute(route);
for (const song of catalog.songs) { requireRoute(`/en/songs/${song.slug}/`); requireRoute(`/eo/kantoj/${song.slug}/`); }
for (const playlist of catalog.playlists) { requireRoute(`/en/playlists/${playlist.slug_en}/`); requireRoute(`/eo/ludlistoj/${playlist.slug_eo}/`); }
if (existsSync('dist/en/support/index.html') || existsSync('dist/eo/subtenu/index.html')) fail({ check: 'verify:routes', problem: 'Support route was generated while support facts are disabled.', cause: 'Support pages/CTAs must be omitted without approved support URL/copy.', path: 'dist/en/support/index.html', fix: 'Remove support pages until support.enabled and support.url are approved.' });
if (!existsSync('dist/404.html')) fail({ check: 'verify:routes', problem: 'Missing custom 404 page.', cause: 'Unknown routes fall back to a plain server error instead of the site shell.', path: 'dist/404.html', fix: 'Add src/pages/404.astro with recovery links.' });
else {
  const notFound = readFileSync('dist/404.html', 'utf8');
  if (!notFound.includes('<main') || !notFound.includes('/en/') || !notFound.includes('/eo/')) fail({ check: 'verify:routes', problem: 'Custom 404 page lacks recovery navigation.', cause: 'Users on missing routes need a path back into both language homes.', path: 'dist/404.html', fix: 'Render the 404 through BaseLayout with English and Esperanto recovery links.' });
}
const allRoutes = [...routes, ...catalog.songs.flatMap((song) => [`/en/songs/${song.slug}/`, `/eo/kantoj/${song.slug}/`]), ...catalog.playlists.flatMap((playlist) => [`/en/playlists/${playlist.slug_en}/`, `/eo/ludlistoj/${playlist.slug_eo}/`])];
for (const route of allRoutes) { checkInternalHrefs(route); checkLocalizedShell(route); }
for (const route of routes) {
  const html = readFileSync(routePath(route), 'utf8');
  if (!html.includes('<main')) fail({ check: 'verify:routes', problem: `Route ${route} has no main landmark.`, cause: 'Base layout may not have rendered.', path: routePath(route), fix: 'Render routes through BaseLayout.' });
}
checkLaunchCopy();
pass('verify:routes', `${routes.length + catalog.songs.length * 2 + catalog.playlists.length * 2} expected routes generated plus custom 404; support omitted; approved public copy rendered`);
