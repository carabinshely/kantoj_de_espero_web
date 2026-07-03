import { readFileSync, existsSync } from 'node:fs';
import catalog from '../src/data/public-catalog.json' with { type: 'json' };
import { fail, pass } from './report.mjs';
import { TEMPORARY_CANONICAL_BASE } from '../site.config.mjs';
const base = TEMPORARY_CANONICAL_BASE;
function html(route) { return readFileSync(`dist${route}index.html`, 'utf8'); }
function checkPage(route, other) {
  const page = html(route);
  if (!page.includes('<link rel="canonical"')) fail({ check: 'verify:seo', problem: `Missing canonical tag for ${route}.`, cause: 'SEO helper/layout did not render canonical URL.', path: `dist${route}index.html`, fix: 'Pass path to BaseLayout and render canonical.' });
  if (!page.includes(base)) fail({ check: 'verify:seo', problem: `Canonical/alternate URL for ${route} does not use configured GitHub Pages base.`, cause: 'Astro site/base or SEO helper drifted.', path: `dist${route}index.html`, fix: 'Set SITE_URL/SITE_BASE or update astro.config.mjs/siteUrl helper.' });
  if (other && !page.includes('hreflang="x-default"')) fail({ check: 'verify:seo', problem: `Missing x-default hreflang for ${route}.`, cause: 'Language alternate helper did not include root fallback.', path: `dist${route}index.html`, fix: 'Include x-default alternate to /.' });
  const scripts = [...page.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  for (const [, json] of scripts) {
    const parsed = JSON.parse(json);
    if (!parsed['@type']) fail({ check: 'verify:seo', problem: `JSON-LD on ${route} has no @type.`, cause: 'Structured data helper emitted incomplete JSON-LD.', path: `dist${route}index.html`, fix: 'Add accurate @type from true public facts.' });
  }
}
for (const route of ['/', '/en/', '/eo/', '/en/songs/', '/eo/kantoj/', '/en/playlists/', '/eo/ludlistoj/', '/en/about/', '/eo/pri-ni/', '/en/licensing/', '/eo/licencado/']) checkPage(route, true);
for (const song of catalog.songs) { checkPage(`/en/songs/${song.slug}/`, `/eo/kantoj/${song.slug}/`); checkPage(`/eo/kantoj/${song.slug}/`, `/en/songs/${song.slug}/`); }
for (const playlist of catalog.playlists) { checkPage(`/en/playlists/${playlist.slug_en}/`, `/eo/ludlistoj/${playlist.slug_eo}/`); checkPage(`/eo/ludlistoj/${playlist.slug_eo}/`, `/en/playlists/${playlist.slug_en}/`); }
if (!existsSync('dist/sitemap-index.xml')) fail({ check: 'verify:seo', problem: 'Sitemap index is missing.', cause: '@astrojs/sitemap did not generate output.', path: 'dist/sitemap-index.xml', fix: 'Keep sitemap integration configured and rerun npm run build.' });
const sitemap = readFileSync('dist/sitemap-index.xml', 'utf8') + (existsSync('dist/sitemap-0.xml') ? readFileSync('dist/sitemap-0.xml', 'utf8') : '');
if (!sitemap.includes(base)) fail({ check: 'verify:seo', problem: 'Sitemap does not use configured public base URL.', cause: 'Astro site/base configuration mismatch.', path: 'dist/sitemap-index.xml', fix: 'Set site/base in astro.config.mjs.' });
pass('verify:seo', 'canonical, hreflang, sitemap, and JSON-LD checks passed');
