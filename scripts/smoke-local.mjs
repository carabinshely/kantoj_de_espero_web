import { existsSync, readFileSync } from 'node:fs';
import { fail, pass } from './report.mjs';

const probes = [
  { route: '/', path: 'dist/index.html', mustInclude: '<main' },
  { route: '/en/about/', path: 'dist/en/about/index.html', mustInclude: 'Kantoj de Espero is a modern Esperanto pop-rock project created in 2024' },
  { route: '/en/licensing/', path: 'dist/en/licensing/index.html', mustInclude: 'mailto:kantojdeespero@gmail.com' },
  { route: '/404.html', path: 'dist/404.html', mustInclude: '<main' }
];

for (const probe of probes) {
  if (!existsSync(probe.path)) {
    fail({ check: 'smoke:local', problem: `Missing built route ${probe.route}`, cause: 'The static build did not emit a route required by maintainer smoke testing.', path: probe.path, fix: 'Run npm run build and inspect Astro route output.' });
  }
  const html = readFileSync(probe.path, 'utf8');
  if (!html.includes(probe.mustInclude)) {
    fail({ check: 'smoke:local', problem: `Built route ${probe.route} did not contain expected launch-ready content.`, cause: 'The static preview fallback is not proving the updated public pages.', path: probe.path, fix: 'Rebuild and inspect the route content.' });
  }
}

pass('smoke:local', `${probes.length} static routes are present and contain launch-ready smoke content`);
