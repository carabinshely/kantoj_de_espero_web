import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import facts from '../src/data/site-facts.json' with { type: 'json' };
import catalog from '../src/data/public-catalog.json' with { type: 'json' };
import { fail, pass } from './report.mjs';

const START_HERE_PLAYLIST_ID = 'start-here-modern-esperanto-pop-rock';
const START_HERE_SPOTIFY_URL = 'https://open.spotify.com/playlist/5rbdelkCrs26Tjc8y2gqWD';
const START_HERE_ROUTES = {
  en: '/en/playlists/start-here-modern-esperanto-pop-rock/',
  eo: '/eo/ludlistoj/komencu-ci-tie-modernaj-esperantaj-poprokaj-kantoj/',
};

let launchBlockers = 0;
function launchFail(problem, cause, path, fix) {
  launchBlockers += 1;
  fail({ check: 'verify:launch', problem, cause, path, fix, severity: 'launch-blocker' });
}
function isPublicLaunchUrl(value) {
  if (Object.prototype.toString.call(value) !== '[object String]') return false;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

if (!facts.finalDomainReady) launchFail('Final domain/custom canonical decision is not marked ready.', 'The scaffold uses a temporary GitHub Pages canonical base.', 'src/data/site-facts.json:finalDomainReady', 'Set the final domain or explicitly approve the temporary GitHub Pages URL for launch.');
if (!facts.publicBioReady) launchFail('Public bio is not marked ready.', 'The approved plan requires owner-controlled public bio before deployment.', 'src/data/site-facts.json:publicBioReady', 'Add approved public bio facts and mark publicBioReady true.');
if (!facts.disclosurePreferenceReady) launchFail('Public disclosure preference is not marked ready.', 'Owner disclosure preference is a launch fact.', 'src/data/site-facts.json:disclosurePreferenceReady', 'Record the approved public disclosure preference and mark it ready.');
if (!facts.contactMethod) launchFail('Licensing/custom-song contact method is missing.', 'Licensing CTA cannot launch without an approved contact route or method.', 'src/data/site-facts.json:contactMethod', 'Add approved contact method or remove launch licensing CTA emphasis.');
if (!facts.esperantoCopyApproved) launchFail('Esperanto draft copy is not marked owner-approved or fluent-reviewed.', 'Esperanto copy remains draft in normalized data.', 'src/data/site-facts.json:esperantoCopyApproved', 'Review/approve Esperanto copy and mark it ready.');
if (!isPublicLaunchUrl(facts.startHerePlaylistUrl)) launchFail('Start Here playlist URL is missing or invalid.', 'The internal Start Here page cannot expose a primary streaming CTA without a real http/https destination.', 'src/data/site-facts.json:startHerePlaylistUrl', 'Add the real Spotify/all-platform URL before launch.');
if (facts.startHerePlaylistUrl !== START_HERE_SPOTIFY_URL) launchFail('Start Here site fact does not match the canonical Spotify playlist URL.', 'The launch path must mirror canonical playlist data instead of preserving a divergent value.', 'src/data/site-facts.json:startHerePlaylistUrl', 'Rerun export:data after updating canonical normalized playlist data.');

const startHerePlaylist = catalog.playlists.find(function (playlist) {
  return playlist.id === START_HERE_PLAYLIST_ID;
});
const startHerePlaylistUrl = startHerePlaylist?.streaming_links?.spotify ?? null;
const startHerePlaylistHasCanonicalUrl = startHerePlaylistUrl === START_HERE_SPOTIFY_URL;
if (facts.startHerePlaylistUrl !== startHerePlaylistUrl) launchFail('Start Here site fact does not mirror the public catalog playlist URL.', 'Exporter/site-facts drift would make launch CTAs depend on divergent sources.', 'src/data/site-facts.json:startHerePlaylistUrl', 'Rerun export:data so site facts derive from the canonical Start Here playlist.');

if (!startHerePlaylistHasCanonicalUrl) {
  launchFail(
    'Start Here public catalog playlist is missing the canonical Spotify streaming URL.',
    startHerePlaylist
      ? 'streaming_links.spotify is missing or differs from the approved URL'
      : 'playlist id ' + START_HERE_PLAYLIST_ID + ' was not found',
    'src/data/public-catalog.json:playlists.' + START_HERE_PLAYLIST_ID + '.streaming_links.spotify',
    'Add the owner-supplied public Start Here playlist URL to the normalized playlist streaming_links and rerun export:data.',
  );
}

for (const song of catalog.songs) {
  const hasLink = Object.values(song.streaming_links).some((url) => typeof url === 'string' && isPublicLaunchUrl(url));
  if (!hasLink) launchFail(`Song ${song.id} has no streaming URL.`, 'Visible listen CTAs require real URLs or must remain hidden.', `src/data/public-catalog.json:${song.id}`, 'Add at least one real platform URL or keep listen buttons hidden for this song.');
}

const homepageSources = [
  { lang: 'en', path: resolve('src/pages/en/index.astro'), expectedRoute: START_HERE_ROUTES.en },
  { lang: 'eo', path: resolve('src/pages/eo/index.astro'), expectedRoute: START_HERE_ROUTES.eo },
];
for (const homepage of homepageSources) {
  const source = readFileSync(homepage.path, 'utf8');
  if (!source.includes(homepage.expectedRoute)) {
    launchFail(
      homepage.lang.toUpperCase() + ' homepage primary CTA does not link to the internal Start Here playlist page.',
      'The approved launch path is homepage -> internal Start Here page -> Spotify.',
      homepage.path,
      'Point the homepage primary listening CTA to ' + homepage.expectedRoute + '.',
    );
  }
  if (source.includes(START_HERE_SPOTIFY_URL)) {
    launchFail(
      homepage.lang.toUpperCase() + ' homepage links directly to the Spotify playlist.',
      'The homepage must preserve bilingual site context before sending listeners to Spotify.',
      homepage.path,
      'Remove direct homepage Spotify links and keep Spotify on the internal Start Here playlist page.',
    );
  }
}


const renderedRoutes = [
  {
    label: 'EN homepage',
    path: resolve('dist/en/index.html'),
    mustInclude: START_HERE_ROUTES.en,
    mustExclude: START_HERE_SPOTIFY_URL,
  },
  {
    label: 'EO homepage',
    path: resolve('dist/eo/index.html'),
    mustInclude: START_HERE_ROUTES.eo,
    mustExclude: START_HERE_SPOTIFY_URL,
  },
  {
    label: 'EN Start Here playlist page',
    path: resolve('dist/en/playlists/start-here-modern-esperanto-pop-rock/index.html'),
    mustInclude: START_HERE_SPOTIFY_URL,
  },
  {
    label: 'EO Start Here playlist page',
    path: resolve('dist/eo/ludlistoj/komencu-ci-tie-modernaj-esperantaj-poprokaj-kantoj/index.html'),
    mustInclude: START_HERE_SPOTIFY_URL,
  },
];
for (const route of renderedRoutes) {
  if (!existsSync(route.path)) {
    launchFail(
      route.label + ' build output is missing.',
      'Rendered launch-path assertions require current Astro build output.',
      route.path,
      'Run npm run build before npm run verify:launch.',
    );
    continue;
  }
  const html = readFileSync(route.path, 'utf8');
  if (route.mustInclude && !html.includes(route.mustInclude)) {
    launchFail(
      route.label + ' does not render the required Start Here launch target.',
      'The launch gate must prove the rendered homepage -> internal page -> Spotify path.',
      route.path,
      'Rebuild after ensuring the homepage points internally and the Start Here page receives the Spotify playlist URL.',
    );
  }
  if (route.mustExclude && html.includes(route.mustExclude)) {
    launchFail(
      route.label + ' renders a direct Spotify playlist link.',
      'Homepages must preserve bilingual site context before sending listeners to Spotify.',
      route.path,
      'Remove direct homepage Spotify links; keep Spotify on the internal Start Here playlist page.',
    );
  }
}

if (launchBlockers === 0) {
  pass('verify:launch', 'owner-controlled launch facts and rendered Start Here path are ready');
} else {
  console.error(`[verify:launch] ${launchBlockers} launch blocker(s) found; safe local build may still be valid.`);
}
