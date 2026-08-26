#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

function run(command, args = []) {
  try {
    return spawnSync(command, args, { encoding: 'utf8', shell: false, windowsHide: true, timeout: 15000 });
  } catch (error) {
    return { status: 1, stdout: '', stderr: error.message };
  }
}
function ok(label, detail) { console.log(`[OK] ${label}${detail ? ` - ${detail}` : ''}`); }
function fail(label, detail) { console.log(`[ERREUR] ${label}${detail ? ` - ${detail}` : ''}`); }

console.log('\nORBITER-7 / CONTRÔLE ENVIRONNEMENT');
console.log(`Plateforme : ${process.platform} (${process.arch})`);
console.log(`Node       : ${process.version}`);

let errors = 0;
const major = Number(process.versions.node.split('.')[0]);
if (major >= 20) ok('Node', 'version >= 20'); else { fail('Node', 'Node 20 minimum requis'); errors++; }

const git = run('git', ['--version']);
if (git.status === 0) ok('Git', git.stdout.trim()); else { fail('Git', 'commande introuvable'); errors++; }

const docker = run('docker', ['--version']);
if (docker.status === 0) ok('Docker CLI', docker.stdout.trim()); else { fail('Docker CLI', 'Docker Desktop / Docker Engine introuvable'); errors++; }

if (docker.status === 0) {
  const info = run('docker', ['info', '--format', '{{.ServerVersion}}']);
  if (info.status === 0) ok('Docker Engine', `démarré (${info.stdout.trim() || 'version détectée'})`);
  else { fail('Docker Engine', 'Docker est installé mais le moteur ne répond pas. Lancez Docker Desktop / Docker Engine.'); errors++; }
}

if (errors) {
  console.log(`\n${errors} problème(s) à corriger avant de commencer.`);
  process.exitCode = 1;
} else {
  console.log('\nEnvironnement prêt. Vous pouvez lancer : npm run check puis npm start');
}
