# Changelog

All notable changes to the Kantoj de Espero public website are documented here.

## [Unreleased]

## [0.1.12] - 2026-07-12

### Added
- Added compact bilingual song listening controls plus a direct Spotify embed for the currently Spotify-only Start Here playlist, with provider validation, analytics hooks, and keyboard-accessible tabs.
- Added contract checks and a real Playwright preview harness for gesture-gated playback, lifecycle states, provider switching, focus, and mobile overflow.

### Changed
- Kept song-player status and external fallback links through loading, loaded, error, and provider-switch states while removing unnecessary playlist service-selection and load controls.

### Fixed
- Restored the approved 44px touch targets for the reading theme control and bilingual playlist language switch.


### Fixed
- Corrected the standalone public-repository quickstart so it does not call the private data exporter.

## [0.1.10] - 2026-07-11

### Fixed
- Restored the compact light/dark reading control with the rounded, outlined treatment from the approved design prototype.
- Kept the text-led hero and route-preserving language navigation introduced in v0.1.9.

## [0.1.9] - 2026-07-11

### Changed
- Simplified the header into a calm editorial navigation and removed the dark-reading-mode control.
- Replaced the decorative empty hero geometry with text-led spacing.
- Made the header language link retain the equivalent English or Esperanto page whenever it exists.

### Fixed
- Added a self-hosted Noto Serif fallback with complete Esperanto character coverage.
- Aligned the language-switch label and its single underlined destination link.

## [0.1.8] - 2026-07-11

### Added
- Added a bilingual editorial home, song catalog, playlist index, playlist detail pages, lyric pages, and supporting project pages for curious listeners new to Esperanto.
- Added self-hosted Instrument Serif, DM Sans, and IBM Plex Mono typography with warm light and dark reading modes.

### Changed
- Reworked navigation, playlist discovery, song reading, licensing, privacy, analytics consent, and the custom 404 page around the approved editorial music-journal design system.
- Added responsive mobile layouts, accessible contrast checks, lyric integrity fixtures, route/SEO/privacy verification, and safe temporary-preview checks.

### Fixed
- Corrected bilingual route generation, rendered lyric character escaping, dark-mode reading surfaces, control contrast, and editorial title-link touch targets.

## [0.1.7] - 2026-07-11

### Added
- Added a structured public bug-report issue template.

### Changed
- Made the temporary preview lifecycle and readiness checks reliable for local browser verification.
- Improved the consent settings link touch target for keyboard and touch users.

### Fixed
- Preserved footer navigation to the analytics settings section when consent controls are active.

## [0.1.6] - 2026-07-07

### Added
- Added consent-first GA4 measurement with Measurement ID `G-K6Q30HHBH4`, Consent Mode v2 default-denied behavior, bilingual privacy/settings pages, and analytics consent controls.
- Added allowlisted listen-link and Start Here playlist CTA event instrumentation after analytics consent.
- Added analytics verification to the website verification chain so release checks reject ID drift, unsafe loader ordering, unapproved events/params, and missing privacy controls.

### Fixed
- Preserved consented outbound listen-click measurement before navigation without delaying non-consented visitor links.

## [0.1.5] - 2026-07-06

### Added
- Added a controlled public taxonomy contract so website verification catches genre, mood, and topic drift before publication.

### Changed
- Reframed the English and Esperanto homepages as a listener-facing first collection instead of an MVP catalog.
- Expanded route verification to reject stale MVP homepage copy in source and rendered output.
- Added a subtle homepage visual anchor and clearer stacked-panel separation using the documented site palette.

## [0.1.4] - 2026-07-06

### Added
- Added a default public social share preview image so shared pages render an intentional Kantoj de Espero card.

### Changed
- Pointed Open Graph and Twitter card metadata at the default share preview image across public pages.
- Expanded SEO verification to assert share-preview metadata and image dimensions.

### Fixed
- Kept the share preview domain cue inside the poster frame after design review so social crops stay readable.


## [0.1.3] - 2026-07-05

### Added
- Added `npm run preview:tmp` so browser QA can launch a reachable Astro preview from WSL checkouts under `/mnt/c`.

### Changed
- Let listeners start from the homepage and land on the internal Start Here playlist page before continuing to the approved Spotify playlist.
- Expanded `verify:launch` so it rebuilds and checks the rendered English and Esperanto Start Here CTA path.
- Tightened homepage hero rhythm and card-link affordance after design review.

### Fixed
- Kept the Start Here site fact, exported playlist streaming link, and rendered launch CTA path in sync with the approved Spotify playlist URL.

## [0.1.2] - 2026-07-04

### Changed
- Made launch readiness stricter: Start Here now requires a real `http` or `https` playlist URL in both site facts and exported playlist streaming links before `verify:launch` can pass.
- Improved mobile navigation touch targets so small-screen visitors can scan and tap the main sections more easily.

### Fixed
- Rejected malformed streaming URLs such as `httpx://` during export, launch verification, and rendered listen-link filtering.

## [0.1.1] - 2026-07-04

### Added
- Added `npm run smoke:local` as a deterministic static smoke path for WSL/browser-QA environments where the live Astro dev server is slow or unreachable.

### Changed
- Updated launch readiness so `verify:launch` now reports only the real owner-side Start Here playlist URL blocker when public bio, disclosure, contact, Esperanto approval, and MVP song links are current.
- Polished mobile navigation, card link affordance, and stacked song-page spacing after design review.

### Fixed
- Expanded route and privacy verification to catch stale public-copy and privacy leaks in the launch-facing build output.

## [0.1.0] - 2026-07-03

### Added
- Shipped the Astro static website MVP with English and Esperanto routes for the homepage, song catalog, 20 song pages, five playlist pages, about, licensing/custom-song, and custom 404 recovery.
- Added public-safe catalog export from the private normalized data into an allowlisted website JSON shape.
- Added canonical URLs, hreflang alternates, sitemap generation, Open Graph metadata, and JSON-LD for public music pages.
- Added GitHub Pages deployment and custom-domain configuration for `kantojdeespero.com`.

### Changed
- Kept listen buttons hidden when streaming URLs are missing so visitors never hit dead platform links.
- Kept support routes omitted until approved support facts and a real support URL exist.

### Fixed
- Kept Esperanto pages language-local in global navigation and footer links.
- Added a custom 404 page with English and Esperanto recovery links.
- Documented `npm run repair:deps` for wrong-platform optional native npm packages in Windows/WSL workflows.
