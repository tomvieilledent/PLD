#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const MISSION_CLI = path.join(ROOT, 'SYSTEME_MISSION_NE_PAS_MODIFIER', 'scripts', 'mission-cli.mjs');
const TEMPLATE = path.join(ROOT, 'SYSTEME_MISSION_NE_PAS_MODIFIER', 'incidents', 'broken-release.template.js');
const TARGET = path.join(ROOT, 'TRAVAIL_ETUDIANT', 'release-gate.test.js');
const BONUS_DIR = path.join(ROOT, 'SYSTEME_MISSION_NE_PAS_MODIFIER', 'incidents_bonus');

function mission(...args) {
  return spawnSync(process.execPath, [MISSION_CLI, ...args], { cwd: ROOT, stdio: 'inherit', shell: false, windowsHide: true });
}

const raw = String(process.argv[2] || '').trim();
const code = raw.toUpperCase();
if (raw.toLowerCase() === 'pr') {
  fs.copyFileSync(TEMPLATE, TARGET);
  const result = mission('incident', 'PR');
  if (result.status !== 0) process.exit(result.status || 1);
  console.log(`\nMASTER ALARM - INCIDENT LOGICIEL DE VOL\n\nUn test volontairement cassé a été ajouté :\n  TRAVAIL_ETUDIANT/release-gate.test.js\n\nCréez une branche, commitez, ouvrez une pull request et utilisez les logs GitHub Actions.\nNe désactivez pas le test ou le workflow pour obtenir du vert.`);
} else if (raw.toLowerCase() === 'reset') {
  fs.rmSync(TARGET, { force: true });
  const result = mission('ack');
  if (result.status !== 0) process.exit(result.status || 1);
  console.log('Fichier d incident PR supprimé. Alarme acquittée.');
} else if (/^X[1-6]$/.test(code)) {
  const result = mission('incident', code);
  if (result.status !== 0) process.exit(result.status || 1);
  const file = fs.readdirSync(BONUS_DIR).find((name) => name.startsWith(`${code}-`));
  console.log(`\nDEEP SPACE MODE - ${code} ACTIF`);
  console.log(`Mission Control suit maintenant cet incident en direct.`);
  if (file) console.log(`Brief : SYSTEME_MISSION_NE_PAS_MODIFIER/incidents_bonus/${file}`);
  console.log(`Quand votre correction et vos preuves sont prêtes : npm run mission -- check ${code}`);
} else {
  console.error('Usage : npm run incident -- pr | reset | X1 | X2 | X3 | X4 | X5 | X6');
  process.exitCode = 1;
}
