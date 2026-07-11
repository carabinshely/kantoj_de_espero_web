import { readFileSync, existsSync } from 'node:fs';
import catalog from '../src/data/public-catalog.json' with { type: 'json' };
import { fail, pass } from './report.mjs';
import { TEMPORARY_CANONICAL_BASE } from '../site.config.mjs';

const base = TEMPORARY_CANONICAL_BASE;
const sharePreviewPath = 'share-preview.png';
const sharePreviewPublicPath = `public/${sharePreviewPath}`;
const sharePreviewDistPath = `dist/${sharePreviewPath}`;
const sharePreviewUrl = new URL(sharePreviewPath, base).toString();
const sharePreviewWidth = 1200;
const sharePreviewHeight = 630;
const sharePreviewMaxBytes = 8 * 1024 * 1024;
const representativeShareRoutes = [
  '/',
  '/en/',
  '/eo/',
  '/en/playlists/start-here-modern-esperanto-pop-rock/',
  '/eo/ludlistoj/komencu-ci-tie-modernaj-esperantaj-poprokaj-kantoj/'
];

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
  if (route === '/en/privacy/') return '/eo/privateco/';
  if (route === '/eo/privateco/') return '/en/privacy/';
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
function metaContent(page, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = page.match(new RegExp(`<meta ${escaped} content="([^"]+)"`));
  return match?.[1] ?? null;
}
function readPngSize(path) {
  const data = readFileSync(path);
  if (data.length < 24 || data.toString('ascii', 1, 4) !== 'PNG') {
    fail({ check: 'verify:seo', problem: `${path} is not a readable PNG file.`, cause: 'The social preview asset is missing a valid PNG signature.', path, fix: 'Regenerate web/public/share-preview.png as a PNG file.' });
    return { width: 0, height: 0, bytes: data.length };
  }
  return { width: data.readUInt32BE(16), height: data.readUInt32BE(20), bytes: data.length };
}
function checkSharePreviewAsset(path, label) {
  if (!existsSync(path)) {
    fail({ check: 'verify:seo', problem: `${label} share preview asset is missing.`, cause: 'The public social preview image was not created or was not copied by the build.', path, fix: 'Keep public/share-preview.png in source and rerun npm run build.' });
    return;
  }
  const { width, height, bytes } = readPngSize(path);
  if (bytes >= sharePreviewMaxBytes) fail({ check: 'verify:seo', problem: `${label} share preview is too large: ${bytes} bytes.`, cause: 'Social preview image exceeds the approved 8 MB limit.', path, fix: 'Optimize or regenerate share-preview.png under 8 MB.' });
  if (width !== sharePreviewWidth || height !== sharePreviewHeight) fail({ check: 'verify:seo', problem: `${label} share preview dimensions are ${width}x${height}, expected ${sharePreviewWidth}x${sharePreviewHeight}.`, cause: 'The image no longer matches social-preview card dimensions.', path, fix: 'Regenerate share-preview.png at exactly 1200x630.' });
}
function checkSharePreviewMetadata(route) {
  const page = html(route);
  const path = `dist${route}index.html`;
  const ogImage = metaContent(page, 'property="og:image"');
  const ogWidth = metaContent(page, 'property="og:image:width"');
  const ogHeight = metaContent(page, 'property="og:image:height"');
  const twitterCard = metaContent(page, 'name="twitter:card"');
  const twitterImage = metaContent(page, 'name="twitter:image"');
  if (!ogImage) fail({ check: 'verify:seo', problem: `Missing og:image for ${route}.`, cause: 'BaseLayout did not render the default social preview image.', path, fix: 'Render absolute og:image metadata from the centralized share-preview URL helper.' });
  if (ogImage && ogImage !== sharePreviewUrl) fail({ check: 'verify:seo', problem: `og:image for ${route} is ${ogImage}, expected ${sharePreviewUrl}.`, cause: 'Social preview URL is not using the configured public base or stable asset path.', path, fix: 'Use siteUrl("/share-preview.png") for the default preview image.' });
  if (ogWidth !== String(sharePreviewWidth)) fail({ check: 'verify:seo', problem: `og:image:width for ${route} is ${ogWidth || 'missing'}, expected ${sharePreviewWidth}.`, cause: 'BaseLayout did not render the approved preview width.', path, fix: 'Render og:image:width content="1200".' });
  if (ogHeight !== String(sharePreviewHeight)) fail({ check: 'verify:seo', problem: `og:image:height for ${route} is ${ogHeight || 'missing'}, expected ${sharePreviewHeight}.`, cause: 'BaseLayout did not render the approved preview height.', path, fix: 'Render og:image:height content="630".' });
  if (twitterCard !== 'summary_large_image') fail({ check: 'verify:seo', problem: `twitter:card for ${route} is ${twitterCard || 'missing'}, expected summary_large_image.`, cause: 'Twitter card metadata is absent or not configured for large previews.', path, fix: 'Render twitter:card content="summary_large_image".' });
  if (!twitterImage) fail({ check: 'verify:seo', problem: `Missing twitter:image for ${route}.`, cause: 'BaseLayout did not render Twitter image metadata.', path, fix: 'Render twitter:image from the centralized share-preview URL helper.' });
  if (twitterImage && twitterImage !== sharePreviewUrl) fail({ check: 'verify:seo', problem: `twitter:image for ${route} is ${twitterImage}, expected ${sharePreviewUrl}.`, cause: 'Twitter image URL drifted from the default Open Graph preview URL.', path, fix: 'Use the same absolute share-preview URL for og:image and twitter:image.' });
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

checkSharePreviewAsset(sharePreviewPublicPath, 'Source');
checkSharePreviewAsset(sharePreviewDistPath, 'Built');
for (const route of representativeShareRoutes) checkSharePreviewMetadata(route);
for (const route of ['/', '/en/', '/eo/', '/en/songs/', '/eo/kantoj/', '/en/playlists/', '/eo/ludlistoj/', '/en/about/', '/eo/pri-ni/', '/en/licensing/', '/eo/licencado/', '/en/privacy/', '/eo/privateco/']) checkPage(route, true);
for (const song of catalog.songs) { checkPage(`/en/songs/${song.slug}/`, `/eo/kantoj/${song.slug}/`); checkPage(`/eo/kantoj/${song.slug}/`, `/en/songs/${song.slug}/`); }
for (const playlist of catalog.playlists) { checkPage(`/en/playlists/${playlist.slug_en}/`, `/eo/ludlistoj/${playlist.slug_eo}/`); checkPage(`/eo/ludlistoj/${playlist.slug_eo}/`, `/en/playlists/${playlist.slug_en}/`); }
for (const route of ['/en/privacy/', '/eo/privateco/']) {
  const page = html(route);
  if (!page.includes('<title>') || !page.toLowerCase().includes(route.startsWith('/eo/') ? 'privateco' : 'privacy')) fail({ check: 'verify:seo', problem: `Privacy metadata is missing for ${route}.`, cause: 'Localized privacy pages must remain discoverable and accurately labelled.', path: `dist${route}index.html`, fix: 'Keep localized privacy title and description metadata through BaseLayout.' });
}
if (!existsSync('dist/sitemap-index.xml')) fail({ check: 'verify:seo', problem: 'Sitemap index is missing.', cause: '@astrojs/sitemap did not generate output.', path: 'dist/sitemap-index.xml', fix: 'Keep sitemap integration configured and rerun npm run build.' });
const sitemap = readFileSync('dist/sitemap-index.xml', 'utf8') + (existsSync('dist/sitemap-0.xml') ? readFileSync('dist/sitemap-0.xml', 'utf8') : '');
if (!sitemap.includes(base)) fail({ check: 'verify:seo', problem: 'Sitemap does not use configured public base URL.', cause: 'Astro site/base configuration mismatch.', path: 'dist/sitemap-index.xml', fix: 'Set site/base in astro.config.mjs.' });
const builtAssets = existsSync('dist/_astro') ? readFileSync('src/styles/global.css', 'utf8') : '';
if (/fonts\.(googleapis|gstatic)\.com/i.test(builtAssets) || !builtAssets.includes('/fonts/instrument-serif-latin-ext.woff2') || !existsSync('public/fonts/LICENSES.txt')) fail({ check: 'verify:seo', problem: 'Self-hosted font contract is missing or uses an external font URL.', cause: 'The editorial type system must remain local and licensed in production.', path: 'src/styles/global.css', fix: 'Use local /fonts WOFF2 files and retain public/fonts/LICENSES.txt.' });
pass('verify:seo', 'canonical, hreflang, sitemap, JSON-LD, privacy metadata, and self-hosted font checks passed');
