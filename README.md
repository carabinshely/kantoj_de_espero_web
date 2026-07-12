# Kantoj de Espero Web

Astro static website for the public Kantoj de Espero MVP. This `web/` directory is a separate public website Git repository nested inside the private outer repository. It has its own `.git`, branch, remote, commits, and pull requests; keep private planning/source material in the outer repo.

## Maintainer quickstart

Prerequisites:

- Node.js 22 LTS or newer.
- npm with the committed `package-lock.json`.
- Run commands from this `web/` directory unless noted.

```bash
npm install
npm run start:local
```

The public repository includes the committed public data projection, so this
standalone quickstart does not require access to the private normalized-data
workspace. Run `npm run export:data` only from the private workspace when
regenerating that projection.


### Browser QA from WSL or `/mnt/c`

Use `npm run start:local` as the primary browser-QA lane when this repo is checked out under WSL/`/mnt/c` or when you need a reproducible local preview:

```bash
npm run start:local
```

`start:local` is a snapshot server, not a live-edit development server. Each run creates a fresh per-run mirror under Linux temporary storage, safely excludes `.git`, `dist`, `.astro`, and `node_modules`, runs deterministic `npm ci`, builds the site, then starts Astro preview from that mirror. The helper prints `[preview:tmp] ready http://127.0.0.1:4329/` only after the listener is actually reachable, and removes the temporary mirror during normal exit or `Ctrl+C`/`SIGTERM` cleanup.

Defaults are intentionally loopback-only:

```text
host: 127.0.0.1
port: 4329
```

Override the port explicitly when needed:

```bash
npm run start:local -- --port 4401
npm run start:local -- --port=4401
```

If the requested or default port is busy, the command fails clearly instead of silently switching ports, and prints an exact retry command such as:

```text
npm run start:local -- --port 4330
```

Only override the host when you intentionally need non-loopback access:

```bash
npm run start:local -- --host 0.0.0.0 --port 4401
```

For live iterative development while editing files, keep using Astro dev directly:

```bash
npm run dev -- --host 127.0.0.1
```

If you are switching between Windows and WSL, or the first build fails with a missing `@rolldown/binding-*` native package, repair optional native dependencies before running dev or verify:

```bash
npm run repair:deps
```

Deterministic static smoke path, useful when the live dev server is slow or unreachable in WSL/browser-QA environments:

```bash
npm run smoke:local
```

`smoke:local` builds the site and probes the rendered home, About, Licensing, and custom 404 files from `dist/`.

Safe local build and verification:

```bash
npm run verify
```

`npm run verify` builds from committed public data and runs safe-local checks. In the private workspace, run `npm run verify:full` to regenerate public data before verifying:

- `verify:data`
- `verify:routes`
- `verify:seo`
- `verify:privacy`

`npm run export:data` is intentionally a private-workspace command because it reads `../data/normalized/`. A standalone public `web/` checkout can still run `npm install`, `npm run build`, `npm run smoke:local`, and `npm run verify` against committed public data.

Launch readiness is separate:

```bash
npm run verify:launch
```

`verify:launch` runs a fresh Astro build and proves the launch listening path: English and Esperanto homepages link first to the internal Start Here playlist pages, and those playlist pages expose the approved Spotify playlist URL. If it reports missing public bio, disclosure preference, contact method, Esperanto approval, Start Here playlist URL drift, or MVP song streaming links, regenerate public data with `npm run export:data` in the private workspace or fix the launch fact before release.

The intended listener path is:

```text
Homepage primary CTA -> internal Start Here playlist page -> Spotify playlist
```

## Troubleshooting

If Astro fails with `Cannot find native binding` for `@rolldown/binding-*`, the local `node_modules` tree likely has optional native packages for the wrong platform, commonly after switching between Windows and WSL. Repair it from this `web/` directory:

```bash
npm run repair:deps
```

Then rerun `npm run smoke:local` or `npm run verify`. If it still fails, remove `node_modules` and run `npm install` again.

If `npm run dev -- --host 127.0.0.1` or `npm run preview -- --host 127.0.0.1` does not become reachable quickly from a WSL checkout under `/mnt/c`, use `npm run smoke:local` for a deterministic static check or `npm run start:local` for browser QA against a fresh built snapshot. `preview:tmp` remains the underlying helper, but `start:local` is the maintained command documented for local browser QA.

After implementing launch-facing changes, rerun `/devex-review` or an equivalent timed manual pass and compare time-to-hello-world against the target: under 2 minutes for `smoke:local`, and 2 to 5 minutes for a healthy full `npm run verify`.

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
6. Treat GitHub Actions runtime deprecation warnings as release blockers. Update the affected action or explicitly opt into the supported runtime before merging, so Pages deploys stay warning-clean.

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
