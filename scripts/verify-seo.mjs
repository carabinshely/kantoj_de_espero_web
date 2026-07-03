import { readFileSync, existsSync } from 'node:fs';
import catalog from '../src/data/public-catalog.json' with { type: 'json' };
import { fail, pass } from './report.mjs';
import { TEMPORARY_CANONICAL_BASE } from '../site.config.mjs';
const base = TEMPORARY_CANONICAL_BASE;
function html(route) { return readFileSync(`dist${route}index.html`, 'utf8'); }
function expectedAlternate(route) {
  if (route === '/en/') return '/eo/';
  if (route === '/eo/') return '/en/';
  if (route === '/en/songs/') return '/eo/kantoj/';
  if (route === '/eo/kantoj/') return '/en/songs/';
  if (route === '/en/playlists/') return '/eo/ludlistoj/';
  if (route === '/eo/ludlistoj/') return '/en/playlists/';
  if (route === '/en/about/') return '/eo/pri-ni/';
  if (route === '/eo/pri-ni/') return '/en/about/';
  if (route === '/en/licensing/') return '/eo/licencado/';
  if (route === '/eo/licencado/') return '/en/licensing/';
  const song = catalog.songs.find((item) => route === `/en/songs/${item.slug}/` || route === `/eo/kantoj/${item.slug}/`);
  if (song) return route.startsWith('/en/') ? `/eo/kantoj/${song.slug}/` : `/en/songs/${song.slug}/`;
  const playlist = catalog.playlists.find((item) => route === `/en/playlists/${item.slug_en}/` || route === `/eo/ludlistoj/${item.slug_eo}/`);
  if (playlist) return route.startsWith('/en/') ? `/eo/ludlistoj/${playlist.slug_eo}/` : `/en/playlists/${playlist.slug_en}/`;
  return null;
}
function linkTags(page) {
  return [...page.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"/g)].map(([, lang, href]) => ({ lang, href }));
}
function checkPage(route, other) {
  const page = html(route);
  if (!page.includes('<link rel="canonical"')) fail({ check: 'verify:seo', problem: `Missing canonical tag for ${route}.`, cause: 'SEO helper/layout did not render canonical URL.', path: `dist${route}index.html`, fix: 'Pass path to BaseLayout and render canonical.' });
  if (!page.includes(base)) fail({ check: 'verify:seo', problem: `Canonical/alternate URL for ${route} does not use configured GitHub Pages base.`, cause: 'Astro site/base or SEO helper drifted.', path: `dist${route}index.html`, fix: 'Set SITE_URL/SITE_BASE or update astro.config.mjs/siteUrl helper.' });
  if (other && !page.includes('hreflang="x-default"')) fail({ check: 'verify:seo', problem: `Missing x-default hreflang for ${route}.`, cause: 'Language alternate helper did not include root fallback.', path: `dist${route}index.html`, fix: 'Include x-default alternate to /.' });
  const expectedOther = expectedAlternate(route);
  if (expectedOther) {
    const tags = linkTags(page);
    const selfLang = route.startsWith('/eo/') ? 'eo' : 'en';
    const otherLang = selfLang === 'en' ? 'eo' : 'en';
    const expectedSelfHref = base + route.slice(1);
    const expectedOtherHref = base + expectedOther.slice(1);
    if (!tags.some((tag) => tag.lang === selfLang && tag.href === expectedSelfHref)) fail({ check: 'verify:seo', problem: `Missing exact self hreflang for ${route}.`, cause: 'Hreflang helper did not emit the current localized URL.', path: `dist${route}index.html`, fix: `Add ${selfLang} alternate ${expectedSelfHref}.` });
    if (!tags.some((tag) => tag.lang === otherLang && tag.href === expectedOtherHref)) fail({ check: 'verify:seo', problem: `Missing exact reciprocal hreflang for ${route}.`, cause: 'Hreflang helper did not emit the paired localized URL.', path: `dist${route}index.html`, fix: `Add ${otherLang} alternate ${expectedOtherHref}.` });
    if (!tags.some((tag) => tag.lang === 'x-default' && tag.href === base)) fail({ check: 'verify:seo', problem: `Missing exact x-default hreflang for ${route}.`, cause: 'Hreflang helper did not emit the root fallback.', path: `dist${route}index.html`, fix: `Add x-default alternate ${base}.` });
  }
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
