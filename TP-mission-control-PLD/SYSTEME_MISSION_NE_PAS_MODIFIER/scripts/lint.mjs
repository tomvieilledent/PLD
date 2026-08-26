import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const roots = ['SYSTEME_MISSION_NE_PAS_MODIFIER/app/server.js', 'SYSTEME_MISSION_NE_PAS_MODIFIER/app/public', 'SYSTEME_MISSION_NE_PAS_MODIFIER/tests', 'TRAVAIL_ETUDIANT'];
const ignoredFiles = new Set();
const problems = [];

async function collect(target) {
  const stat = await import('node:fs/promises').then(({ stat }) => stat(target));
  if (stat.isFile()) return [target];
  const entries = await readdir(target, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => collect(path.join(target, entry.name))));
  return nested.flat();
}

for (const root of roots) {
  const files = await collect(root);
  for (const file of files.filter((candidate) => candidate.endsWith('.js') || candidate.endsWith('.mjs'))) {
    if (ignoredFiles.has(file)) continue;
    const source = await readFile(file, 'utf8');
    const lines = source.split('\n');
    lines.forEach((line, index) => {
      if (/\t/.test(line)) problems.push(`${file}:${index + 1} tab character`);
      if (/\s+$/.test(line) && line.length > 0) problems.push(`${file}:${index + 1} trailing whitespace`);
      if (/\bvar\s+/.test(line)) problems.push(`${file}:${index + 1} use let/const instead of var`);
      if (/\beval\s*\(/.test(line)) problems.push(`${file}:${index + 1} eval is forbidden`);
    });
  }
}

if (problems.length) {
  process.stderr.write(`Échec du lint Mission :\n${problems.map((problem) => ` - ${problem}`).join('\n')}\n`);
  process.exit(1);
}

process.stdout.write('Lint Mission validé.\n');
