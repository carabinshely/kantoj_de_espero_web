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

After the launch-fact reconciliation slice, `verify:launch` should collapse from stale public-data blockers to either PASS or the real owner-side Start Here blockers: the direct `startHerePlaylistUrl` site fact and/or the exported Start Here playlist `streaming_links` entry. If it reports missing public bio, disclosure preference, contact method, Esperanto approval, or MVP song streaming links, the public data is stale and should be regenerated or fixed.

## Troubleshooting

If Astro fails with `Cannot find native binding` for `@rolldown/binding-*`, the local `node_modules` tree likely has optional native packages for the wrong platform, commonly after switching between Windows and WSL. Repair it from this `web/` directory:

```bash
npm run repair:deps
```

Then rerun `npm run smoke:local` or `npm run verify`. If it still fails, remove `node_modules` and run `npm install` again.

If `npm run dev -- --host 127.0.0.1` does not become reachable quickly in WSL, use `npm run smoke:local` for a deterministic static check, then try `npm run preview -- --host 127.0.0.1` after `npm run build` if you need a local HTTP server.

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
