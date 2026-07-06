import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fail, pass } from './report.mjs';

const MEASUREMENT_ID = 'G-K6Q30HHBH4';
const allowedEvents = ['listen_click', 'playlist_cta_click'];
const allowedParams = ['platform', 'entity_type', 'entity_id', 'lang', 'page_path'];
const sourceFiles = [];
const builtFiles = [];
const builtHtmlFiles = [];

function walk(dir, out, predicate = () => true) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) walk(path, out, predicate);
    else if (predicate(path)) out.push(path);
  }
}
walk('src', sourceFiles, (path) => /\.(astro|ts|js|css)$/.test(path));
walk('dist', builtFiles, (path) => /\.(html|js|css)$/.test(path));
walk('dist', builtHtmlFiles, (path) => /\.html$/.test(path));

function read(path) { return readFileSync(path, 'utf8'); }
function includes(path, needle) { return existsSync(path) && read(path).includes(needle); }
function countIn(files, pattern) {
  return files.reduce((count, file) => count + (read(file).match(pattern) ?? []).length, 0);
}
function sourceContaining(pattern) {
  return sourceFiles.filter((file) => pattern.test(read(file)));
}

const analyticsConfig = 'src/lib/analytics.ts';
if (!existsSync(analyticsConfig)) fail({ check: 'verify:analytics', problem: 'Missing analytics config helper.', cause: 'Measurement ID and allowlists must have a single source of truth.', path: analyticsConfig, fix: 'Create src/lib/analytics.ts with the approved GA4 constants.' });
const configText = read(analyticsConfig);
if (!configText.includes(`GA4_MEASUREMENT_ID = '${MEASUREMENT_ID}'`)) fail({ check: 'verify:analytics', problem: `GA4 measurement ID is not ${MEASUREMENT_ID}.`, cause: 'The approved GA4 property ID drifted.', path: analyticsConfig, fix: `Set GA4_MEASUREMENT_ID to ${MEASUREMENT_ID}.` });
const sourceIdFiles = sourceContaining(new RegExp(MEASUREMENT_ID, 'g'));
if (sourceIdFiles.length !== 1 || sourceIdFiles[0] !== analyticsConfig) fail({ check: 'verify:analytics', problem: 'GA4 measurement ID is not source-defined exactly once.', cause: 'The ID must remain a single source of truth and be imported where needed.', path: sourceIdFiles.join(', ') || 'src/', fix: 'Keep the ID only in src/lib/analytics.ts and import that constant.' });

for (const eventName of allowedEvents) if (!configText.includes(`'${eventName}'`)) fail({ check: 'verify:analytics', problem: `Allowed event ${eventName} missing from config.`, cause: 'Custom event allowlist drifted.', path: analyticsConfig, fix: 'Keep exactly listen_click and playlist_cta_click in ANALYTICS_EVENTS.' });
const configuredEvents = configText.match(/ANALYTICS_EVENTS = \[([^\]]+)\]/s)?.[1]?.match(/'([^']+)'/g)?.map((x) => x.slice(1, -1)) ?? [];
if (configuredEvents.join('|') !== allowedEvents.join('|')) fail({ check: 'verify:analytics', problem: `Custom event allowlist is ${configuredEvents.join(', ') || 'empty'}, expected ${allowedEvents.join(', ')}.`, cause: 'Only approved custom events may be tracked.', path: analyticsConfig, fix: 'Set ANALYTICS_EVENTS exactly to listen_click and playlist_cta_click.' });
const configuredParams = configText.match(/ANALYTICS_PARAMS = \[([^\]]+)\]/s)?.[1]?.match(/'([^']+)'/g)?.map((x) => x.slice(1, -1)) ?? [];
if (configuredParams.join('|') !== allowedParams.join('|')) fail({ check: 'verify:analytics', problem: `Analytics param allowlist is ${configuredParams.join(', ') || 'empty'}, expected ${allowedParams.join(', ')}.`, cause: 'Custom event params must avoid private metadata and user identifiers.', path: analyticsConfig, fix: 'Set ANALYTICS_PARAMS exactly to platform, entity_type, entity_id, lang, page_path.' });

const consentComponent = 'src/components/AnalyticsConsent.astro';
const consentText = read(consentComponent);
for (const field of ['ad_storage', 'analytics_storage', 'ad_user_data', 'ad_personalization']) {
  if (!consentText.includes(field)) fail({ check: 'verify:analytics', problem: `Consent Mode v2 field ${field} is missing.`, cause: 'Basic Consent Mode v2 requires explicit default/update consent fields.', path: consentComponent, fix: `Add ${field} to consent default/update calls.` });
}

for (const file of sourceFiles) {
  const text = read(file);
  const hasGaLoader = text.includes('googletagmanager.com/gtag/js');
  const hasGaConfig = text.includes("'config'") || text.includes('\"config\"') || text.includes('gtag(\"config\"') || text.includes("gtag('config'");
  if ((hasGaLoader || hasGaConfig) && file !== consentComponent) fail({ check: 'verify:analytics', problem: `GA4 loader/config appears outside the consent component: ${file}`, cause: 'All GA4 loading and config must remain behind the Basic consent-first gate.', path: file, fix: 'Move GA4 loader/config calls into AnalyticsConsent.astro.' });
}
if (!consentText.includes('clearGaCookies')) fail({ check: 'verify:analytics', problem: 'Consent revocation does not include GA cookie cleanup.', cause: 'Revocation should stop future analytics and clear existing GA cookies best-effort.', path: consentComponent, fix: 'Call a cookie cleanup helper from the denied/revoke path.' });

const defaultIndex = consentText.indexOf("'consent', 'default'");
const loaderIndex = consentText.indexOf('googletagmanager.com/gtag/js');
const configIndex = consentText.indexOf("'config'");
if (defaultIndex === -1 || loaderIndex === -1 || configIndex === -1 || !(defaultIndex < loaderIndex && loaderIndex < configIndex)) fail({ check: 'verify:analytics', problem: 'Consent default, GA4 loader, and GA4 config ordering is unsafe.', cause: 'Consent must default denied before any GA4 config/event, and GA4 must load only inside the grant path.', path: consentComponent, fix: 'Keep consent default at bootstrap and load gtag/js plus config only in loadGa4 after consent.' });
if (!/readChoice\(\) !== grantedValue/.test(consentText) || !/choice === grantedValue\) loadGa4/.test(consentText)) fail({ check: 'verify:analytics', problem: 'GA4 loading is not clearly gated by stored or accepted consent.', cause: 'The plan forbids loading gtag/js or config before a granted choice.', path: consentComponent, fix: 'Gate loadGa4 behind stored granted consent or the accept handler.' });

const dataEventValues = new Set();
for (const file of sourceFiles) for (const match of read(file).matchAll(/data-analytics-event="([^"]+)"/g)) dataEventValues.add(match[1]);
for (const value of dataEventValues) if (!allowedEvents.includes(value)) fail({ check: 'verify:analytics', problem: `Unapproved analytics event attribute: ${value}`, cause: 'Only the approved custom events may be instrumented.', path: 'src/', fix: 'Remove or rename the event to an approved allowlist value.' });
for (const eventName of allowedEvents) if (!dataEventValues.has(eventName)) fail({ check: 'verify:analytics', problem: `No source instrumentation for ${eventName}.`, cause: 'The approved analytics plan requires listen links and homepage Start Here CTAs.', path: 'src/', fix: `Add data-analytics-event="${eventName}" to the relevant public links.` });

const allowedInstrumentationFiles = new Set([
  'src/components/AnalyticsConsent.astro',
  'src/components/ListenLinks.astro',
  'src/pages/en/index.astro',
  'src/pages/eo/index.astro'
]);
for (const file of sourceFiles) {
  const text = read(file);
  if ((text.includes('data-analytics-event') || text.includes("gtag('event'") || text.includes('gtag("event"')) && !allowedInstrumentationFiles.has(file)) {
    fail({ check: 'verify:analytics', problem: `Analytics event instrumentation appears outside the approved files: ${file}`, cause: 'Event location allowlist restricts listen tracking to ListenLinks/helper and playlist CTA tracking to homepage CTAs.', path: file, fix: 'Move tracking through ListenLinks, AnalyticsConsent, or the approved homepage Start Here CTA.' });
  }
}

const forbiddenCustomEvents = ['page_view', 'click', 'select_content', 'purchase', 'sign_up', 'login'];
for (const eventName of forbiddenCustomEvents) {
  if (sourceFiles.some((file) => read(file).includes(`data-analytics-event="${eventName}"`) || read(file).includes(`'event', '${eventName}'`) || read(file).includes(`"event", "${eventName}"`))) {
    fail({ check: 'verify:analytics', problem: `Forbidden custom analytics event found: ${eventName}`, cause: 'page_view may only be standard GA4 config after consent; other custom events are out of scope.', path: 'src/', fix: 'Remove the forbidden custom event.' });
  }
}

const disallowedParamAttrs = sourceFiles.flatMap((file) => [...read(file).matchAll(/data-analytics-([a-z-]+)=/g)].map((match) => ({ file, name: match[1] }))).filter(({ name }) => name !== 'event' && !['platform', 'entity-type', 'entity-id', 'lang'].includes(name));
if (disallowedParamAttrs.length) fail({ check: 'verify:analytics', problem: `Unapproved analytics data attributes: ${disallowedParamAttrs.map((x) => `${x.file}:${x.name}`).join(', ')}`, cause: 'Custom event params are limited to the approved field list.', path: 'src/', fix: 'Remove unapproved analytics attributes.' });

for (const file of ['src/pages/en/songs/[slug].astro', 'src/pages/eo/kantoj/[slug].astro']) {
  const text = read(file);
  if (!text.includes('entityType="song"') || !text.includes('entityId={song.id}')) fail({ check: 'verify:analytics', problem: 'Song ListenLinks do not pass song.id tracking context.', cause: 'Song listen_click events must identify only the public song id.', path: file, fix: 'Pass entityType="song" entityId={song.id} lang to ListenLinks.' });
}
for (const file of ['src/pages/en/playlists/[slug].astro', 'src/pages/eo/ludlistoj/[slug].astro']) {
  const text = read(file);
  if (!text.includes('entityType="playlist"') || !text.includes('entityId={playlist.id}')) fail({ check: 'verify:analytics', problem: 'Playlist ListenLinks do not pass playlist.id tracking context.', cause: 'Playlist listen_click events must identify only the public playlist id.', path: file, fix: 'Pass entityType="playlist" entityId={playlist.id} lang to ListenLinks.' });
}
for (const file of ['src/pages/en/index.astro', 'src/pages/eo/index.astro']) {
  if (!read(file).includes('data-analytics-event="playlist_cta_click"')) fail({ check: 'verify:analytics', problem: 'Homepage Start Here CTA is not instrumented.', cause: 'Approved plan requires homepage playlist_cta_click after consent.', path: file, fix: 'Add playlist_cta_click data attributes to the Start Here CTA.' });
}

const forbiddenPatterns = [
  /GTM-[A-Z0-9]+/,
  /AW-[A-Z0-9-]+/,
  /googleadservices\.com/,
  /doubleclick\.net/,
  /googlesyndication\.com/,
  /cmp/i,
  /cookiebot/i,
  /onetrust/i
];
for (const file of [...sourceFiles, ...builtFiles]) {
  const text = read(file);
  for (const pattern of forbiddenPatterns) if (pattern.test(text)) fail({ check: 'verify:analytics', problem: `Forbidden analytics/ads/vendor pattern ${pattern} found.`, cause: 'Scope excludes Ads, GTM, remarketing, audiences, CMPs, and vendors.', path: file, fix: 'Remove the out-of-scope analytics/vendor code or copy.' });
}

const sitemapText = (existsSync('dist/sitemap-index.xml') ? read('dist/sitemap-index.xml') : '') + (existsSync('dist/sitemap-0.xml') ? read('dist/sitemap-0.xml') : '');
for (const route of ['dist/en/privacy/index.html', 'dist/eo/privateco/index.html']) {
  if (!existsSync(route)) fail({ check: 'verify:analytics', problem: `Missing privacy route ${route}.`, cause: 'Bilingual privacy/settings access is required.', path: route, fix: 'Add the localized privacy page and rerun build.' });
  const html = read(route);
  if (!html.includes('data-consent-manage') || !html.includes('data-consent-revoke')) fail({ check: 'verify:analytics', problem: `${route} lacks analytics settings controls.`, cause: 'Visitors need manage/revoke access from the privacy pages.', path: route, fix: 'Render manage and revoke consent controls.' });
  if (!html.includes('<link rel="canonical"') || !html.includes('hreflang="en"') || !html.includes('hreflang="eo"') || !html.includes('hreflang="x-default"')) fail({ check: 'verify:analytics', problem: `${route} lacks canonical or bilingual hreflang coverage.`, cause: 'Privacy routes must keep the same localized SEO coverage as other public pages.', path: route, fix: 'Pass path and alternatePath to BaseLayout for each privacy route.' });
}
for (const route of ['https://kantojdeespero.com/en/privacy/', 'https://kantojdeespero.com/eo/privateco/']) {
  if (!sitemapText.includes(route)) fail({ check: 'verify:analytics', problem: `Privacy route missing from sitemap: ${route}`, cause: 'The approved privacy routes must be discoverable in the generated sitemap.', path: 'dist/sitemap-0.xml', fix: 'Keep privacy routes as static Astro pages and rerun build.' });
}
for (const route of builtHtmlFiles) {
  const html = read(route);
  if (!html.includes('/en/privacy/') && !html.includes('/eo/privateco/')) fail({ check: 'verify:analytics', problem: `${route} lacks footer privacy access.`, cause: 'Every public page must expose privacy/settings access through BaseLayout.', path: route, fix: 'Add localized privacy/settings links to the shared footer.' });
  if (!html.includes('data-consent-manage')) fail({ check: 'verify:analytics', problem: `${route} lacks footer analytics settings access.`, cause: 'Visitors must be able to manage consent after initial choice.', path: route, fix: 'Add a data-consent-manage footer control.' });
}

if (!includes('package.json', '"verify:analytics"')) fail({ check: 'verify:analytics', problem: 'verify:analytics is missing from package scripts.', cause: 'Analytics checks must run in npm run verify.', path: 'package.json', fix: 'Add verify:analytics and include it in verify.' });

pass('verify:analytics', `${MEASUREMENT_ID} consent-gated GA4; v2 denied default; approved events/params only; bilingual privacy/settings verified`);
