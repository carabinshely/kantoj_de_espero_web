# Kantoj de Espero Web

Astro static website for the public Kantoj de Espero MVP. This `web/` directory is a separate public website repo; keep private planning/source material in the outer repo.

## Maintainer quickstart

Prerequisites:

- Node.js 22 LTS or newer.
- npm with the committed `package-lock.json`.
- Run commands from this `web/` directory unless noted.

```bash
npm install
npm run export:data
npm run dev
```

Safe local build and verification:

```bash
npm run build
npm run verify
```

`npm run verify` builds from committed public data and runs safe-local checks. In the private workspace, run `npm run verify:full` to regenerate public data before verifying:

- `verify:data`
- `verify:routes`
- `verify:seo`
- `verify:privacy`

`npm run export:data` is intentionally a private-workspace command because it reads `../data/normalized/`. A standalone public `web/` checkout can still run `npm install`, `npm run build`, and `npm run verify` against committed public data.

Launch readiness is separate:

```bash
npm run verify:launch
```

`verify:launch` is expected to fail until owner-controlled facts are added: final domain, streaming links, contact method, support decision, disclosure preference, public bio, and Esperanto-copy approval.

## Public data flow

The site does not copy normalized records wholesale. `npm run export:data` reads `../data/normalized/` and writes an allowlisted public projection to `src/data/public-catalog.json` plus launch facts in `src/data/site-facts.json`.

Do not add private imports, planning docs, raw provenance, prompts, generation workflow details, or `AGENTS.md` to this repo.

## Verification failure format

Verification scripts print:

- check name
- problem
- cause
- file/path or route
- exact fix
- severity (`local-blocker` or `launch-blocker`)

## Upgrade policy

Stay boring:

1. Use Node LTS.
2. Keep npm as the package manager unless the owner explicitly changes it.
3. Commit `package-lock.json` after dependency changes.
4. Upgrade Astro/dependencies in small batches.
5. After every upgrade, run `npm run build`, `npm run verify`, and then inspect `npm run verify:launch` blockers.

## Feedback and decision channels

- Owner-input blockers belong in the outer repo `TODO.md`.
- Architecture/build decisions belong in the approved review artifacts or future decision docs.
- Public site bugs can move to `web` issues when the public repo is ready for that workflow.
- Never store private notes or raw source material in `web/`.

## Deployment note

Astro is configured for GitHub Pages using the final custom domain `https://kantojdeespero.com/`.

GitHub Pages needs the committed `public/CNAME` file so the built site publishes a `CNAME` file containing:

```text
kantojdeespero.com
```

Cloudflare DNS should point the apex domain to GitHub Pages A records and `www` to `carabinshely.github.io`. Keep DNS records DNS-only until GitHub Pages has verified the custom domain and issued HTTPS.
