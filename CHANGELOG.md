# Changelog

All notable changes to the Kantoj de Espero public website are documented here.

## [Unreleased]

### Added
- Added `npm run preview:tmp` for browser-reachable Astro preview audits from WSL checkouts under `/mnt/c`.

### Changed
- Made the homepage launch path point listeners to the internal Start Here playlist page first, then onward to the approved Spotify playlist.
- Expanded `verify:launch` so it rebuilds and checks the rendered English and Esperanto Start Here CTA path.

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
