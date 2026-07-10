import { request } from 'node:http';
import { createServer } from 'node:net';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

export const DEFAULT_HOST = '127.0.0.1';
export const DEFAULT_PORT = 4329;
export const MIRROR_PREFIX = 'kantoj-de-espero-preview-';
export const EXCLUDED_PARTS = new Set(['.git', '.astro', 'dist', 'node_modules']);

const SIGNAL_EXIT_CODES = { SIGINT: 130, SIGTERM: 143 };

export class PreviewArgError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PreviewArgError';
  }
}

export function parsePort(value) {
  if (value === undefined || value === '') throw new PreviewArgError('Missing value for --port. Use --port 4329 or --port=4329.');
  if (!/^\d+$/.test(value)) throw new PreviewArgError(`Invalid --port value "${value}". Use an integer from 1 to 65535.`);
  const port = Number(value);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65535) throw new PreviewArgError(`Invalid --port value "${value}". Use an integer from 1 to 65535.`);
  return port;
}

export function parseHost(value) {
  if (value === undefined || value === '') throw new PreviewArgError('Missing value for --host. Use --host 127.0.0.1 or --host=127.0.0.1.');
  return value;
}

export function parsePreviewArgs(argv) {
  const passthrough = [...argv];
  let host = DEFAULT_HOST;
  let port = DEFAULT_PORT;
  let explicitHost = false;
  let explicitPort = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--port') {
      explicitPort = true;
      port = parsePort(argv[index + 1]);
      index += 1;
    } else if (arg.startsWith('--port=')) {
      explicitPort = true;
      port = parsePort(arg.slice('--port='.length));
    } else if (arg === '--host') {
      explicitHost = true;
      host = parseHost(argv[index + 1]);
      index += 1;
    } else if (arg.startsWith('--host=')) {
      explicitHost = true;
      host = parseHost(arg.slice('--host='.length));
    }
  }

  return { host, port, explicitHost, explicitPort, passthrough, readyUrl: formatReadyUrl(host, port) };
}

export function formatReadyUrl(host, port) {
  const urlHost = host === '0.0.0.0' || host === '::' ? DEFAULT_HOST : host;
  const bracketedHost = urlHost.includes(':') && !urlHost.startsWith('[') ? `[${urlHost}]` : urlHost;
  return `http://${bracketedHost}:${port}/`;
}

export function buildPreviewArgs(parsed) {
  const args = ['run', 'preview', '--'];
  if (!parsed.explicitHost) args.push('--host', DEFAULT_HOST);
  if (!parsed.explicitPort) args.push('--port', String(DEFAULT_PORT));
  args.push(...parsed.passthrough);
  return args;
}

export function isSafeMirrorPath(sourceDir, candidatePath) {
  const relative = candidatePath.slice(sourceDir.length).replace(/^[/\\]/, '');
  if (!relative) return true;
  return !relative.split(/[/\\]/).some((part) => EXCLUDED_PARTS.has(part));
}

export function tempMirrorParent() {
  return tmpdir();
}

export function tempMirrorTemplate() {
  return join(tempMirrorParent(), MIRROR_PREFIX);
}

export function retryCommand(port) {
  return `npm run start:local -- --port ${port + 1}`;
}

export function busyPortMessage({ host, port, explicitPort }) {
  const requested = explicitPort ? 'requested' : 'default';
  return `The ${requested} preview port ${port} is already in use on ${host}. Stop the other process or retry with: ${retryCommand(port)}`;
}

export async function assertPortAvailable(host, port) {
  const probeHost = host === '0.0.0.0' || host === '::' ? DEFAULT_HOST : host;
  await new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen({ host: probeHost, port }, () => {
      server.close(resolve);
    });
  });
}

export async function waitForHttpResponse(host, port, { timeoutMs = 30_000, intervalMs = 100 } = {}) {
  const probeHost = host === '0.0.0.0' || host === '::' ? DEFAULT_HOST : host;
  const startedAt = Date.now();
  let lastError;
  while (Date.now() - startedAt < timeoutMs) {
    try {
      await requestOnce(probeHost, port);
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }
  throw new Error(`Timed out waiting for an HTTP response from preview on ${host}:${port}${lastError?.message ? ` (${lastError.message})` : ''}`);
}

function requestOnce(host, port) {
  return new Promise((resolve, reject) => {
    const probe = request({ host, port, path: '/', method: 'GET', timeout: 1000 }, (response) => {
      response.resume();
      resolve();
    });
    probe.once('timeout', () => probe.destroy(new Error('request timed out')));
    probe.once('error', reject);
    probe.end();
  });
}

export function exitCodeForSignal(signal) {
  return SIGNAL_EXIT_CODES[signal] ?? 1;
}
