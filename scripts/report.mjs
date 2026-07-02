export function fail({ check, problem, cause, path, fix, severity = 'local-blocker' }) {
  console.error(`\n[${check}] ${severity}`);
  console.error(`Problem: ${problem}`);
  console.error(`Cause: ${cause}`);
  console.error(`Path: ${path}`);
  console.error(`Fix: ${fix}\n`);
  process.exitCode = 1;
}

export function pass(check, detail) {
  console.log(`[${check}] PASS${detail ? ` — ${detail}` : ''}`);
}
