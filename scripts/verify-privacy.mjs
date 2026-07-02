import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { FORBIDDEN_KEYS } from './catalog-schema.mjs';
import { fail, pass } from './report.mjs';

const forbiddenFiles = ['AGENTS.md'];
const forbiddenDirs = ['sources/private-imports', 'docs/planning'];
const forbiddenTerms = [
  'source inspiration', 'generation workflow', 'direct artist-style', 'tags_raw_private_reviewed',
  'source_file', 'description_seed', 'public_tags_seed', 'genres_seed', 'moods_seed', 'topics_seed'
];
const scanRoots = ['src/data', 'src/pages', 'src/components', 'src/layouts', 'src/lib', 'dist'];

for (const file of forbiddenFiles) if (existsSync(file)) fail({ check: 'verify:privacy', problem: `${file} exists inside the public web repo.`, cause: 'Internal agent instructions must not be copied into web/.', path: file, fix: `Remove ${file} from web/.` });
for (const dir of forbiddenDirs) if (existsSync(dir)) fail({ check: 'verify:privacy', problem: `${dir} exists inside the public web repo.`, cause: 'Internal/private source material must not be copied into web/.', path: dir, fix: `Remove ${dir} from web/.` });

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) return walk(path);
    return [path];
  });
}

for (const root of scanRoots) {
  for (const path of walk(root)) {
    if (!/\.(json|astro|ts|html|xml|txt|css)$/.test(path)) continue;
    const text = readFileSync(path, 'utf8');
    for (const term of [...forbiddenTerms, ...FORBIDDEN_KEYS]) {
      if (text.includes(term)) fail({ check: 'verify:privacy', problem: `Forbidden private/source term appears: ${term}`, cause: 'Public website source/build output includes disallowed internal material.', path, fix: `Remove the term/data and regenerate public output from the allowlisted exporter.` });
    }
  }
}
pass('verify:privacy', 'no private imports, planning docs, AGENTS.md, or forbidden public data terms in scanned public source/build output');
