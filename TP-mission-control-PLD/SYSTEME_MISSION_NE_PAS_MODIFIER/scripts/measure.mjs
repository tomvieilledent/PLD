#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const LABEL = String(process.argv[2] || 'baseline').trim().toLowerCase();
if (!/^[a-z0-9_-]+$/.test(LABEL)) {
  console.error('[ERREUR] Le nom de mesure doit contenir uniquement lettres, chiffres, _ ou -.');
  process.exit(1);
}
const IMAGE = `orbiter-7:${LABEL}`;
const EVIDENCE_DIR = path.join(ROOT, 'TRAVAIL_ETUDIANT', 'PREUVES');
const DOCKERFILE = path.join('TRAVAIL_ETUDIANT', 'Dockerfile');
fs.mkdirSync(EVIDENCE_DIR, { recursive: true });

function commandOk(command, args) {
  try { return spawnSync(command, args, { cwd: ROOT, stdio: 'ignore', shell: false, windowsHide: true }).status === 0; }
  catch { return false; }
}
function execText(command, args) {
  return execFileSync(command, args, { cwd: ROOT, encoding: 'utf8', windowsHide: true }).trim();
}
function runStreaming(command, args) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let child;
    try { child = spawn(command, args, { cwd: ROOT, shell: false, windowsHide: true }); }
    catch (error) { reject(error); return; }
    child.stdout.on('data', (data) => { chunks.push(data); process.stdout.write(data); });
    child.stderr.on('data', (data) => { chunks.push(data); process.stderr.write(data); });
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, output: Buffer.concat(chunks).toString('utf8') }));
  });
}

if (!commandOk('docker', ['version'])) {
  console.error('[ERREUR] Docker doit être installé et démarré. Lancez `npm run doctor` pour vérifier votre environnement.');
  process.exit(1);
}

console.log(`\nORBITER-7 / MESURE ${LABEL.toUpperCase()}`);
const started = Date.now();
const result = await runStreaming('docker', ['build', '--progress=plain', '-f', DOCKERFILE, '-t', IMAGE, '.']);
const buildSeconds = Math.max(0.1, (Date.now() - started) / 1000);
fs.writeFileSync(path.join(EVIDENCE_DIR, `${LABEL}-build.log`), result.output);
if (result.code !== 0) {
  console.error('\n[ERREUR] Le build Docker a échoué. Consultez le log affiché ci-dessus.');
  process.exit(result.code || 1);
}

const sizeBytes = Number(execText('docker', ['image', 'inspect', IMAGE, '--format', '{{.Size}}']));
const sizeMb = sizeBytes / 1024 / 1024;
let configuredUser = '';
try { configuredUser = execText('docker', ['image', 'inspect', IMAGE, '--format', '{{.Config.User}}']); } catch {}
const runtimeUser = (!configuredUser || configuredUser === '0' || configuredUser.toLowerCase() === 'root') ? '0' : configuredUser;

const envText = [
  `LABEL=${LABEL}`,
  `IMAGE=${IMAGE}`,
  `SIZE_BYTES=${sizeBytes}`,
  `SIZE_MB=${sizeMb.toFixed(1)}`,
  `BUILD_SECONDS=${buildSeconds.toFixed(1)}`,
  `RUNNING_UID=${runtimeUser}`,
  ''
].join('\n');
fs.writeFileSync(path.join(EVIDENCE_DIR, `${LABEL}.env`), envText);

console.log('\nRÉSULTAT');
console.log(`Image            : ${IMAGE}`);
console.log(`Taille           : ${sizeMb.toFixed(1)} MB`);
console.log(`Temps de build   : ${buildSeconds.toFixed(1)} s`);
console.log(`Utilisateur image: ${runtimeUser === '0' ? 'root / UID 0' : runtimeUser}`);
console.log(`Preuve           : TRAVAIL_ETUDIANT/PREUVES/${LABEL}.env`);

try {
  spawnSync(process.execPath, [path.join('SYSTEME_MISSION_NE_PAS_MODIFIER','scripts','mission-cli.mjs'), 'record', 'measurement', LABEL], { cwd: ROOT, stdio: 'ignore', shell: false, windowsHide: true });
} catch {}
