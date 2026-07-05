import { cp, mkdir, readdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';

const sourceDir = resolve(new URL('..', import.meta.url).pathname);
const targetDir = join(tmpdir(), 'kantoj-de-espero-preview');
const preserve = new Set(['node_modules']);
const excluded = new Set(['.git', 'dist', 'node_modules']);

async function resetTarget() {
  await mkdir(targetDir, { recursive: true });
  for (const entry of await readdir(targetDir, { withFileTypes: true })) {
    if (preserve.has(entry.name)) continue;
    await rm(join(targetDir, entry.name), { recursive: true, force: true });
  }
}

function shouldCopy(src) {
  const relative = src.slice(sourceDir.length).replace(/^[/\\]/, '');
  if (!relative) return true;
  return !relative.split(/[/\\]/).some((part) => excluded.has(part));
}

function run(command, args, options = {}) {
  console.log(`[preview:tmp] ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, { cwd: targetDir, stdio: 'inherit', shell: process.platform === 'win32', ...options });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

await resetTarget();
await cp(sourceDir, targetDir, { recursive: true, filter: shouldCopy });

const installArgs = existsSync(join(targetDir, 'package-lock.json')) ? ['install'] : ['install'];
run('npm', installArgs);
run('npm', ['run', 'build']);

const passthrough = process.argv.slice(2);
const hasHost = passthrough.some((arg) => arg === '--host' || arg.startsWith('--host='));
const hasPort = passthrough.some((arg) => arg === '--port' || arg.startsWith('--port='));
const previewArgs = ['run', 'preview', '--'];
if (!hasHost) previewArgs.push('--host', '127.0.0.1');
if (!hasPort) previewArgs.push('--port', '4329');
previewArgs.push(...passthrough);

console.log(`[preview:tmp] serving mirrored build from ${targetDir}`);
const child = spawn('npm', previewArgs, { cwd: targetDir, stdio: 'inherit', shell: process.platform === 'win32' });

function stop(signal) {
  child.kill(signal);
}
process.on('SIGINT', () => stop('SIGINT'));
process.on('SIGTERM', () => stop('SIGTERM'));
child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 0);
});
