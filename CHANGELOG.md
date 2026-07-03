# Changelog

All notable changes to the Kantoj de Espero public website are documented here.

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
