import { createServer } from 'node:http';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { fail, pass } from './report.mjs';
import {
  DEFAULT_HOST,
  DEFAULT_PORT,
  EXCLUDED_PARTS,
  MIRROR_PREFIX,
  PreviewArgError,
  buildPreviewArgs,
  isSafeMirrorPath,
  parsePreviewArgs,
  tempMirrorParent,
  tempMirrorTemplate
} from './preview-tmp-utils.mjs';

const check = 'verify:preview-tmp';
const repoDir = resolve(new URL('..', import.meta.url).pathname);
const scriptPath = fileURLToPath(new URL('./preview-tmp.mjs', import.meta.url));
const cleanup = [];

function assert(condition, problem, fix = 'Update scripts/preview-tmp.mjs and scripts/preview-tmp-utils.mjs to match the approved local browser QA contract.') {
  if (!condition) fail({ check, problem, cause: 'The temporary preview helper contract regressed.', path: 'scripts/preview-tmp.mjs', fix });
}

function assertThrows(fn, expected) {
  try {
    fn();
  } catch (error) {
    assert(error instanceof PreviewArgError, `Expected PreviewArgError for ${expected}.`);
    return String(error.message);
  }
  assert(false, `Expected invalid port failure for ${expected}.`);
}

async function makeFixture({ buildFails = false, installFails = false } = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'preview-tmp-fixture-'));
  cleanup.push(() => rm(dir, { recursive: true, force: true }));
  const packageJson = {
    name: 'preview-tmp-fixture',
    version: '1.0.0',
    private: true,
    type: 'module',
    scripts: {
      build: 'node build.mjs',
      preview: 'node preview.mjs'
    }
  };
  if (installFails) packageJson.dependencies = { 'fixture-missing-lock-entry': '1.0.0' };
  await writeFile(join(dir, 'package.json'), `${JSON.stringify(packageJson, null, 2)}\n`);
  await writeFile(join(dir, 'package-lock.json'), `${JSON.stringify({ lockfileVersion: 3, requires: true, packages: { '': packageJson } }, null, 2)}\n`);
  await writeFile(join(dir, 'build.mjs'), buildFails ? "console.error('fixture build failed'); process.exit(7);\n" : "console.log('fixture build ok');\n");
  await writeFile(join(dir, 'preview.mjs'), `
import { createServer } from 'node:http';
const args = process.argv.slice(2);
function value(name, fallback) {
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === name) return args[i + 1];
    if (args[i].startsWith(name + '=')) return args[i].slice(name.length + 1);
  }
  return fallback;
}
const host = value('--host', '127.0.0.1');
const port = Number(value('--port', '4329'));
const server = createServer((req, res) => {
  res.writeHead(200, { 'content-type': 'text/plain' });
  res.end('fixture preview ' + req.url);
});
function stop() { server.close(() => process.exit(0)); }
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
server.listen(port, host, () => console.log('[fixture] listening http://' + host + ':' + port + '/'));
`);
  await writeFile(join(dir, '.git'), 'not copied');
  await writeFile(join(dir, 'dist'), 'not copied');
  return dir;
}

function reservePort(port = 0) {
  return new Promise((resolve, reject) => {
    const server = createServer((_, res) => res.end('busy'));
    server.once('error', reject);
    server.listen(port, DEFAULT_HOST, () => resolve(server));
  });
}

function runPreview(fixtureDir, args = []) {
  const child = spawn(process.execPath, [scriptPath, ...args], {
    cwd: repoDir,
    env: { ...process.env, PREVIEW_TMP_SOURCE_DIR: fixtureDir },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => { stdout += chunk; });
  child.stderr.on('data', (chunk) => { stderr += chunk; });
  const exit = new Promise((resolve) => child.once('exit', (code, signal) => resolve({ code, signal, stdout, stderr })));
  return { child, exit, get stdout() { return stdout; }, get stderr() { return stderr; } };
}

async function waitForOutput(proc, pattern, timeoutMs = 30_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const combined = `${proc.stdout}\n${proc.stderr}`;
    const match = combined.match(pattern);
    if (match) return match;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for ${pattern}. stdout=${proc.stdout} stderr=${proc.stderr}`);
}

async function fetchText(url) {
  const response = await fetch(url);
  return response.text();
}

try {
  const pkg = JSON.parse(await readFile('package.json', 'utf8'));
  assert(pkg.scripts?.['start:local'] === 'node scripts/preview-tmp.mjs', 'package.json must expose start:local as the canonical temporary preview helper.', 'Set scripts.start:local to node scripts/preview-tmp.mjs.');
  assert(pkg.scripts?.['verify:preview-tmp'] === 'node scripts/verify-preview-tmp.mjs', 'package.json must expose focused preview contract verification.');

  const parsedDefault = parsePreviewArgs([]);
  assert(parsedDefault.host === DEFAULT_HOST && parsedDefault.port === DEFAULT_PORT, 'Default preview target must be 127.0.0.1:4329.');
  assert(parsedDefault.readyUrl === 'http://127.0.0.1:4329/', 'Default ready URL must match the actual loopback listener.');
  assert(parsePreviewArgs(['--port', '4401']).port === 4401, '--port 4401 must normalize to explicit port 4401.');
  assert(parsePreviewArgs(['--port=4401']).port === 4401, '--port=4401 must normalize to explicit port 4401.');
  assert(parsePreviewArgs(['--host', '0.0.0.0']).readyUrl === 'http://127.0.0.1:4329/', 'Wildcard host readiness URL must remain browser-reachable on loopback.');
  for (const [args, label] of [[['--port'], 'missing'], [['--port', '0'], 'zero'], [['--port=abc'], 'malformed'], [['--port', '12x'], 'nonnumeric']]) {
    const message = assertThrows(() => parsePreviewArgs(args), label);
    assert(/--port|integer|Missing/.test(message), `Invalid ${label} port must explain the port contract.`);
  }
  assert(buildPreviewArgs(parsedDefault).join(' ') === 'run preview -- --host 127.0.0.1 --port 4329', 'Default preview invocation must pass explicit loopback host and port to Astro.');
  assert(EXCLUDED_PARTS.has('.git') && EXCLUDED_PARTS.has('dist') && EXCLUDED_PARTS.has('node_modules'), 'Mirror exclusions must include .git, dist, and node_modules.');
  assert(tempMirrorParent() === tmpdir() && tempMirrorTemplate().startsWith(join(tmpdir(), MIRROR_PREFIX)), 'Temporary mirrors must be per-run directories under the OS temp directory.');
  assert(isSafeMirrorPath('/repo/web', '/repo/web/src/pages/index.astro'), 'Normal source files must be copyable into the mirror.');
  assert(!isSafeMirrorPath('/repo/web', '/repo/web/.git/config'), '.git must not be copied into the mirror.');
  assert(!isSafeMirrorPath('/repo/web', '/repo/web/dist/index.html'), 'dist must not be copied into the mirror.');
  assert(!isSafeMirrorPath('/repo/web', '/repo/web/node_modules/astro/package.json'), 'node_modules must not be copied into the mirror.');

  const busy = await reservePort(0);
  const busyPort = busy.address().port;
  const fixture = await makeFixture();
  const busyRun = runPreview(fixture, ['--port', String(busyPort)]);
  const busyResult = await busyRun.exit;
  await new Promise((resolve) => busy.close(resolve));
  assert(busyResult.code !== 0, 'Explicit busy ports must fail nonzero.');
  assert(busyResult.stderr.includes(`requested preview port ${busyPort}`), 'Explicit busy-port failure must identify the requested port.');
  assert(busyResult.stderr.includes(`npm run start:local -- --port ${busyPort + 1}`), 'Busy-port failure must print an exact retry command.');
  assert(!busyResult.stdout.includes('[preview:tmp] ready') && !busyResult.stderr.includes('[preview:tmp] ready'), 'Busy-port failures must not print a ready URL.');

  const defaultBusy = await reservePort(DEFAULT_PORT);
  const defaultBusyRun = runPreview(fixture);
  const defaultBusyResult = await defaultBusyRun.exit;
  await new Promise((resolve) => defaultBusy.close(resolve));
  assert(defaultBusyResult.code !== 0, 'Busy default port 4329 must fail nonzero.');
  assert(defaultBusyResult.stderr.includes(`default preview port ${DEFAULT_PORT}`), 'Busy default-port failure must identify the default port.');
  assert(defaultBusyResult.stderr.includes(`npm run start:local -- --port ${DEFAULT_PORT + 1}`), 'Busy default-port failure must print an exact retry command.');
  assert(!defaultBusyResult.stdout.includes('[preview:tmp] ready') && !defaultBusyResult.stderr.includes('[preview:tmp] ready'), 'Busy default-port failures must not print a ready URL.');

  const okPortServer = await reservePort(0);
  const okPort = okPortServer.address().port;
  await new Promise((resolve) => okPortServer.close(resolve));
  const okRun = runPreview(fixture, ['--port', String(okPort)]);
  const ready = await waitForOutput(okRun, new RegExp(`\\[preview:tmp\\] ready http://127\\.0\\.0\\.1:${okPort}/`));
  assert(Boolean(ready), 'Readiness output must include the actual host and port.');
  const body = await fetchText(`http://127.0.0.1:${okPort}/contract`);
  assert(body.includes('/contract'), 'Ready URL must be printed only after the preview listener accepts requests.');
  const mirrorMatch = `${okRun.stdout}\n${okRun.stderr}`.match(/\[preview:tmp\] mirror (.+)/);
  assert(Boolean(mirrorMatch), 'Helper must print the per-run mirror path for diagnostics.');
  const mirrorPath = mirrorMatch[1].trim();
  assert(mirrorPath.startsWith(join(tmpdir(), MIRROR_PREFIX)), 'Mirror path must be a per-run temp directory.');
  okRun.child.kill('SIGTERM');
  const okExit = await okRun.exit;
  assert(okExit.code === 143 || okExit.signal === 'SIGTERM' || okExit.code === 0, 'Signal stop must exit cleanly after forwarding SIGTERM.');
  assert(!existsSync(mirrorPath), 'Signal stop must clean up the per-run mirror.');
  let stopped = false;
  try {
    await fetchText(`http://127.0.0.1:${okPort}/after-stop`);
  } catch {
    stopped = true;
  }
  assert(stopped, 'Signal stop must leave no reachable orphaned preview listener.');

  const failFixture = await makeFixture({ buildFails: true });
  const failRun = runPreview(failFixture, ['--port', String(okPort + 1)]);
  const failResult = await failRun.exit;
  assert(failResult.code === 7, 'Build failures must preserve the failing command status.');
  assert(!failResult.stdout.includes('[preview:tmp] ready') && !failResult.stderr.includes('[preview:tmp] ready'), 'Build failures must suppress ready URLs.');

  const installFailFixture = await makeFixture({ installFails: true });
  const installFailRun = runPreview(installFailFixture, ['--port', String(okPort + 2)]);
  const installFailResult = await installFailRun.exit;
  assert(installFailResult.code !== 0, 'npm ci failures must preserve a nonzero failing status.');
  assert(!installFailResult.stdout.includes('[preview:tmp] ready') && !installFailResult.stderr.includes('[preview:tmp] ready'), 'npm ci failures must suppress ready URLs.');

  const readme = await readFile('README.md', 'utf8');
  for (const required of ['npm run start:local', 'snapshot', '127.0.0.1', '--port', 'busy', 'Ctrl+C', 'cleanup', 'WSL', 'npm run dev']) {
    assert(readme.includes(required), `README must document ${required} for the local browser QA contract.`, 'Document start:local snapshot semantics, WSL rationale, loopback default, overrides, busy ports, stopping, cleanup, and dev distinction.');
  }

  const script = await readFile('scripts/preview-tmp.mjs', 'utf8');
  assert(script.includes("['ci']"), 'Temporary preview helper must use deterministic npm ci in the mirror.');
  assert(script.includes('waitForHttpResponse'), 'Temporary preview helper must wait for an HTTP response before printing readiness.');
  assert(script.includes('SIGTERM') && script.includes('SIGINT'), 'Temporary preview helper must handle termination signals.');

  pass(check, 'start:local contract, parser, mirror safety, default and explicit busy-port, HTTP readiness, install/build failure, signal cleanup, and README coverage passed');
} finally {
  for (const remove of cleanup.reverse()) await remove().catch(() => {});
}
