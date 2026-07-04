import facts from '../src/data/site-facts.json' with { type: 'json' };
import catalog from '../src/data/public-catalog.json' with { type: 'json' };
import { fail, pass } from './report.mjs';

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
if (!isPublicLaunchUrl(facts.startHerePlaylistUrl)) launchFail('Start Here playlist URL is missing or invalid.', 'Homepage cannot promote a primary Start Here streaming CTA without a real http/https destination.', 'src/data/site-facts.json:startHerePlaylistUrl', 'Add the real Spotify/all-platform URL before launch.');
const START_HERE_PLAYLIST_ID = "start-here-modern-esperanto-pop-rock";
const startHerePlaylist = catalog.playlists.find(function (playlist) {
  return playlist.id === START_HERE_PLAYLIST_ID;
});
const startHerePlaylistHasPublicUrl = startHerePlaylist
  ? Object.values(startHerePlaylist.streaming_links || {}).some(function (url) {
      return typeof url === "string" && isPublicLaunchUrl(url);
    })
  : false;

if (!startHerePlaylistHasPublicUrl) {
  launchFail(
    "Start Here public catalog playlist is missing a public streaming URL",
    startHerePlaylist
      ? "all streaming_links entries are empty or non-http"
      : "playlist id " + START_HERE_PLAYLIST_ID + " was not found",
    "src/data/public-catalog.json:playlists." + START_HERE_PLAYLIST_ID + ".streaming_links",
    "Add the owner-supplied public Start Here playlist URL to the normalized playlist streaming_links and rerun export:data.",
  );
}

for (const song of catalog.songs) {
  const hasLink = Object.values(song.streaming_links).some((url) => typeof url === 'string' && isPublicLaunchUrl(url));
  if (!hasLink) launchFail(`Song ${song.id} has no streaming URL.`, 'Visible listen CTAs require real URLs or must remain hidden.', `src/data/public-catalog.json:${song.id}`, 'Add at least one real platform URL or keep listen buttons hidden for this song.');
}
if (launchBlockers === 0) {
  pass('verify:launch', 'owner-controlled launch facts are ready');
} else {
  console.error(`[verify:launch] ${launchBlockers} launch blocker(s) found; safe local build may still be valid.`);
}
