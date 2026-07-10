import { cp, mkdtemp, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import {
  PreviewArgError,
  assertPortAvailable,
  buildPreviewArgs,
  busyPortMessage,
  exitCodeForSignal,
  isSafeMirrorPath,
  parsePreviewArgs,
  tempMirrorTemplate,
  waitForHttpResponse
} from './preview-tmp-utils.mjs';

const scriptPath = fileURLToPath(import.meta.url);
const defaultSourceDir = resolve(dirname(scriptPath), '..');

function run(command, args, { cwd }) {
  console.log(`[preview:tmp] ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.status !== 0) {
    const error = new Error(`${command} ${args.join(' ')} failed with status ${result.status ?? 1}`);
    error.exitCode = result.signal ? exitCodeForSignal(result.signal) : (result.status ?? 1);
    throw error;
  }
}

async function copyToMirror(sourceDir, targetDir) {
  await cp(sourceDir, targetDir, {
    recursive: true,
    filter: (src) => isSafeMirrorPath(sourceDir, src)
  });
}


function killChildTree(child, signal) {
  if (process.platform !== 'win32' && child.pid) {
    try {
      process.kill(-child.pid, signal);
      return;
    } catch {
      // Fall back to killing the direct child if the process group is already gone.
    }
  }
  child.kill(signal);
}

async function cleanup(targetDir) {
  if (!targetDir) return;
  await rm(targetDir, { recursive: true, force: true });
}

export async function main(argv = process.argv.slice(2), options = {}) {
  const sourceDir = resolve(options.sourceDir ?? process.env.PREVIEW_TMP_SOURCE_DIR ?? defaultSourceDir);
  let targetDir;
  let child;
  let stoppingSignal;
  let killTimer;
  let cleanupPromise;
  let signalHandlers;

  const parsed = parsePreviewArgs(argv);

  try {
    await assertPortAvailable(parsed.host, parsed.port);
  } catch (error) {
    if (error?.code === 'EADDRINUSE') {
      console.error(`[preview:tmp] ${busyPortMessage(parsed)}`);
      return 1;
    }
    throw error;
  }

  async function finish(exitCode) {
    if (killTimer) clearTimeout(killTimer);
    cleanupPromise = cleanupPromise ?? cleanup(targetDir);
    await cleanupPromise;
    return exitCode;
  }

  try {
    targetDir = await mkdtemp(tempMirrorTemplate());
    console.log(`[preview:tmp] mirror ${targetDir}`);

    const stop = (signal) => {
      if (stoppingSignal) return;
      stoppingSignal = signal;
      if (child && !child.killed) killChildTree(child, signal);
      if (!child) cleanupPromise = cleanupPromise ?? cleanup(targetDir);
      killTimer = setTimeout(() => {
        if (child && !child.killed) killChildTree(child, 'SIGKILL');
      }, 5000);
    };
    signalHandlers = {
      onSigint: () => stop('SIGINT'),
      onSigterm: () => stop('SIGTERM')
    };
    process.once('SIGINT', signalHandlers.onSigint);
    process.once('SIGTERM', signalHandlers.onSigterm);

    await copyToMirror(sourceDir, targetDir);
    run('npm', ['ci'], { cwd: targetDir });
    run('npm', ['run', 'build'], { cwd: targetDir });

    if (stoppingSignal) return finish(exitCodeForSignal(stoppingSignal));

    const previewArgs = buildPreviewArgs(parsed);
    console.log(`[preview:tmp] npm ${previewArgs.join(' ')}`);
    child = spawn('npm', previewArgs, { cwd: targetDir, stdio: 'inherit', shell: process.platform === 'win32', detached: process.platform !== 'win32' });

    let childExitResult;
    const childExit = new Promise((resolve) => {
      child.once('exit', (code, signal) => {
        childExitResult = { code, signal };
        resolve(childExitResult);
      });
      child.once('error', (error) => {
        childExitResult = { error };
        resolve(childExitResult);
      });
    });

    function previewExitError({ code, signal, error }) {
      if (error) return new Error(`Preview server failed before it was ready (${error.message}).`);
      const detail = signal ? `signal ${signal}` : `status ${code ?? 1}`;
      return new Error(`Preview server exited before it was ready (${detail}).`);
    }

    function assertChildAlive() {
      if (childExitResult || child.exitCode !== null || child.signalCode !== null) {
        throw previewExitError(childExitResult ?? { code: child.exitCode, signal: child.signalCode });
      }
    }

    await Promise.race([
      waitForHttpResponse(parsed.host, parsed.port),
      childExit.then((result) => { throw previewExitError(result); })
    ]);
    // A listener can appear between the availability probe and the child bind. Give a
    // pending child exit one turn to surface, then require the preview child to remain alive.
    await new Promise((resolve) => setImmediate(resolve));
    assertChildAlive();

    console.log(`[preview:tmp] ready ${parsed.readyUrl}`);

    const { code, signal, error } = await childExit;
    if (error) return finish(1);
    if (stoppingSignal) return finish(exitCodeForSignal(stoppingSignal));
    if (signal) return finish(exitCodeForSignal(signal));
    return finish(code ?? 0);
  } catch (error) {
    if (child && !child.killed) killChildTree(child, 'SIGTERM');
    cleanupPromise = cleanupPromise ?? cleanup(targetDir);
    await cleanupPromise;
    if (error?.exitCode !== undefined) return error.exitCode;
    console.error(`[preview:tmp] ${error.message}`);
    return 1;
  } finally {
    if (signalHandlers) {
      process.removeListener('SIGINT', signalHandlers.onSigint);
      process.removeListener('SIGTERM', signalHandlers.onSigterm);
    }
  }
}

if (process.argv[1] && resolve(process.argv[1]) === scriptPath) {
  try {
    const exitCode = await main();
    process.exit(exitCode);
  } catch (error) {
    if (error instanceof PreviewArgError) {
      console.error(`[preview:tmp] ${error.message}`);
      process.exit(1);
    }
    console.error(`[preview:tmp] ${error.stack ?? error.message}`);
    process.exit(1);
  }
}
