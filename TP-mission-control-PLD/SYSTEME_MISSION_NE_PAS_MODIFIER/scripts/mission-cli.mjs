#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const MISSION_DIR = path.join(ROOT, 'SYSTEME_MISSION_NE_PAS_MODIFIER', 'runtime');
const STATE_FILE = path.join(MISSION_DIR, 'state.json');
const EVENTS_FILE = path.join(MISSION_DIR, 'events.json');
const WORKFLOW = path.join(ROOT, '.github', 'workflows', 'mission.yml');

const gates = ['mass', 'safety', 'control', 'compat', 'security', 'release'];
const deepSpaceCodes = ['X1', 'X2', 'X3', 'X4', 'X5', 'X6'];
const deepSpaceTitles = {
  X1: 'SECURITY THEATER',
  X2: 'PR PUBLISHES PRODUCTION',
  X3: 'CACHE THAT LIES',
  X4: 'TWO ARCHITECTURES',
  X5: 'SMALL BUT DEAD',
  X6: 'ONE COMBINATION FAILS',
};

function nowTime() { return new Date().toISOString().slice(11, 19); }
function ensureDir() { fs.mkdirSync(MISSION_DIR, { recursive: true }); }
function gitBranch() {
  try {
    return execFileSync('git', ['branch', '--show-current'], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() || 'detached';
  } catch {
    return 'local';
  }
}
function freshDeepSpace() {
  return {
    unlocked: false,
    active: null,
    missions: Object.fromEntries(deepSpaceCodes.map((code) => [code, { status: 'LOCKED', note: 'Flight Readiness 6/6 requis' }])),
    evidence: {},
  };
}
function defaultState() {
  return {
    version: 3,
    startedAt: new Date().toISOString(),
    launchWindowSeconds: 10800,
    mode: process.env.MISSION_MODE || 'simulation',
    buildSha: 'local',
    gates: {
      mass: { status: 'NO_GO', note: 'Baseline à mesurer' },
      safety: { status: 'NO_GO', note: 'Utilisateur / santé non validés' },
      control: { status: 'UNKNOWN', note: 'Contrôles PR non vérifiés' },
      compat: { status: 'UNKNOWN', note: 'Matrix non certifiée' },
      security: { status: 'LOCKED', note: 'En attente du build / scan' },
      release: { status: 'LOCKED', note: 'Chemin registry verrouillé' },
    },
    metrics: { baselineSizeMb: null, imageSizeMb: null, reductionPercent: null, buildSeconds: null, runtimeUid: null, health: 'unknown' },
    uplink: { workflow: 'unknown', matrixPassed: 0, matrixTotal: 5, security: 'locked', registry: 'locked', branch: gitBranch() },
    hintsUsed: {},
    incident: null,
    deepSpace: freshDeepSpace(),
  };
}
function loadJson(file, fallback) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; } }
function saveJson(file, value) { ensureDir(); fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`); }
function baseCleared(s) { return gates.every((key) => s.gates?.[key]?.status === 'CLEARED'); }
function normalizeDeepSpace(s) {
  s.deepSpace ||= freshDeepSpace();
  s.deepSpace.missions ||= {};
  s.deepSpace.evidence ||= {};
  for (const code of deepSpaceCodes) {
    s.deepSpace.missions[code] ||= { status: 'LOCKED', note: 'Incident non commencé' };
  }

  if (!baseCleared(s)) {
    s.deepSpace.unlocked = false;
    s.deepSpace.active = null;
    for (const code of deepSpaceCodes) {
      if (s.deepSpace.missions[code].status !== 'CLEARED') {
        s.deepSpace.missions[code] = { status: 'LOCKED', note: 'Flight Readiness 6/6 requis' };
      }
    }
    return s;
  }

  s.deepSpace.unlocked = true;
  const active = deepSpaceCodes.find((code) => s.deepSpace.missions[code]?.status === 'ACTIVE');
  s.deepSpace.active = active || null;
  if (active) return s;

  const next = deepSpaceCodes.find((code) => s.deepSpace.missions[code]?.status !== 'CLEARED');
  for (const code of deepSpaceCodes) {
    if (s.deepSpace.missions[code]?.status === 'CLEARED') continue;
    if (code === next) s.deepSpace.missions[code] = { status: 'AVAILABLE', note: 'Incident disponible' };
    else s.deepSpace.missions[code] = { status: 'LOCKED', note: `Terminez ${next || 'le parcours précédent'} avant` };
  }
  return s;
}
function state() {
  ensureDir();
  const s = normalizeDeepSpace(loadJson(STATE_FILE, defaultState()));
  s.version = 3;
  s.uplink ||= {};
  s.uplink.branch = gitBranch();
  return s;
}
function events() { return loadJson(EVENTS_FILE, []); }
function event(source, message, level = 'info', status = level.toUpperCase()) {
  const e = events();
  e.push({ time: nowTime(), source, message, level, status });
  saveJson(EVENTS_FILE, e.slice(-80));
}
function writeState(s) {
  normalizeDeepSpace(s);
  s.version = 3;
  s.uplink ||= {};
  s.uplink.branch = gitBranch();
  saveJson(STATE_FILE, s);
}
function setGate(s, key, status, note) { s.gates[key] = { status, note }; }
function shell(command, args = [], options = {}) {
  return spawnSync(command, args, { cwd: ROOT, encoding: 'utf8', shell: false, windowsHide: true, maxBuffer: 25 * 1024 * 1024, ...options });
}
function readEnv(file) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const i = line.indexOf('=');
    if (i > 0) out[line.slice(0, i)] = line.slice(i + 1);
  }
  return out;
}
function workflowText() { return fs.existsSync(WORKFLOW) ? fs.readFileSync(WORKFLOW, 'utf8') : ''; }
function printResult(ok, message) { console.log(`${ok ? '[GO]' : '[NO GO]'} ${message}`); }

function updateMeasurement(label) {
  const file = path.join(ROOT, 'TRAVAIL_ETUDIANT', 'PREUVES', `${label}.env`);
  const data = readEnv(file);
  const s = state();
  if (!Object.keys(data).length) return;
  if (label === 'baseline') s.metrics.baselineSizeMb = Number(data.SIZE_MB || 0) || null;
  if (label === 'final') s.metrics.imageSizeMb = Number(data.SIZE_MB || 0) || null;
  s.metrics.buildSeconds = Number(data.BUILD_SECONDS || 0) || null;
  s.metrics.runtimeUid = data.RUNNING_UID === '' ? null : data.RUNNING_UID;
  if (s.metrics.baselineSizeMb && s.metrics.imageSizeMb) {
    s.metrics.reductionPercent = ((s.metrics.baselineSizeMb - s.metrics.imageSizeMb) / s.metrics.baselineSizeMb) * 100;
  }
  writeState(s);
  event('DOCKER', `${label.toUpperCase()} mesuré : ${data.SIZE_MB || '?'} MB / ${data.BUILD_SECONDS || '?'} s / utilisateur ${data.RUNNING_UID === '0' ? 'root' : (data.RUNNING_UID || '?')}`, 'info', 'MEASURED');
}

function checkMass() {
  updateMeasurement('baseline');
  updateMeasurement('final');
  const s = state();
  const baseline = readEnv(path.join(ROOT, 'TRAVAIL_ETUDIANT', 'PREUVES', 'baseline.env'));
  const final = readEnv(path.join(ROOT, 'TRAVAIL_ETUDIANT', 'PREUVES', 'final.env'));
  if (!baseline.SIZE_BYTES || !final.SIZE_BYTES) {
    setGate(s, 'mass', 'NO_GO', 'Les mesures baseline et finale sont obligatoires');
    writeState(s);
    event('MASS', 'Preuves baseline/finale manquantes', 'bad', 'NO GO');
    printResult(false, 'Lancez npm run measure -- baseline puis npm run measure -- final.');
    return 1;
  }
  const reduction = ((Number(baseline.SIZE_BYTES) - Number(final.SIZE_BYTES)) / Number(baseline.SIZE_BYTES)) * 100;
  s.metrics.baselineSizeMb = Number(baseline.SIZE_MB);
  s.metrics.imageSizeMb = Number(final.SIZE_MB);
  s.metrics.reductionPercent = reduction;
  s.metrics.buildSeconds = Number(final.BUILD_SECONDS);
  s.metrics.runtimeUid = final.RUNNING_UID || null;
  const dockerignore = fs.existsSync(path.join(ROOT, 'TRAVAIL_ETUDIANT', 'Dockerfile.dockerignore'));
  const dockerfile = fs.readFileSync(path.join(ROOT, 'TRAVAIL_ETUDIANT', 'Dockerfile'), 'utf8');
  const manifestPos = dockerfile.search(/COPY\s+package(?:\.json|\*\.json|\.json\s+package-lock\.json)/i);
  const installPos = dockerfile.search(/RUN\s+npm\s+(?:ci|install)/i);
  const broadCopyPos = dockerfile.search(/COPY\s+\.\s+\./i);
  const cacheOrder = manifestPos >= 0 && installPos > manifestPos && (broadCopyPos < 0 || broadCopyPos > installPos);
  const ok = reduction >= 60 && dockerignore && cacheOrder;
  setGate(s, 'mass', ok ? 'CLEARED' : 'NO_GO', ok ? `${reduction.toFixed(1)}% reduction` : 'Objectif de réduction, cache ou contexte de build non validé');
  writeState(s);
  event('MASS', `Image ${baseline.SIZE_MB} MB -> ${final.SIZE_MB} MB (${reduction.toFixed(1)}%)`, ok ? 'good' : 'bad', ok ? 'CLEARED' : 'NO GO');
  printResult(ok, ok ? `Mass gate cleared - ${reduction.toFixed(1)}% reduction.` : 'Il faut ≥ 60 %, un Dockerfile.dockerignore pertinent et un ordre de layers favorable au cache.');
  return ok ? 0 : 1;
}

function inspectRuntime(image, container) {
  shell('docker', ['rm', '-f', container], { stdio: 'ignore' });
  const build = shell('docker', ['build', '-f', 'TRAVAIL_ETUDIANT/Dockerfile', '-t', image, '.'], { stdio: 'pipe' });
  if (build.status !== 0) return { buildOk: false, build };

  let configuredUser = '';
  try {
    configuredUser = execFileSync('docker', ['image', 'inspect', image, '--format', '{{.Config.User}}'], { encoding: 'utf8', windowsHide: true }).trim();
  } catch {}
  const runtimeUser = (!configuredUser || configuredUser === '0' || configuredUser.toLowerCase() === 'root') ? '0' : configuredUser;
  const run = shell('docker', ['run', '-d', '--name', container, image], { stdio: 'pipe' });
  if (run.status !== 0) return { buildOk: true, runOk: false, runtimeUser, run };

  let health = 'missing';
  for (let i = 0; i < 30; i += 1) {
    try {
      health = execFileSync('docker', ['inspect', '--format', '{{if .State.Health}}{{.State.Health.Status}}{{else}}missing{{end}}', container], { encoding: 'utf8', windowsHide: true }).trim();
    } catch {}
    if (health === 'healthy' || health === 'unhealthy') break;
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 500);
  }
  shell('docker', ['rm', '-f', container], { stdio: 'ignore' });
  return { buildOk: true, runOk: true, runtimeUser, health };
}

function checkSafety() {
  const s = state();
  if (shell('docker', ['version'], { stdio: 'ignore' }).status !== 0) {
    setGate(s, 'safety', 'NO_GO', 'Docker indisponible');
    writeState(s);
    event('SAFETY', 'Docker indisponible', 'bad', 'NO GO');
    printResult(false, 'Docker doit être installé et démarré. Lancez npm run doctor.');
    return 1;
  }
  const result = inspectRuntime('orbiter-7:safety-check', 'orbiter-7-flight-safety');
  if (!result.buildOk) {
    setGate(s, 'safety', 'NO_GO', 'Échec du build de l’image');
    writeState(s);
    event('SAFETY', 'Échec du build de l’image', 'bad', 'NO GO');
    process.stdout.write(result.build.stdout || '');
    process.stderr.write(result.build.stderr || '');
    return 1;
  }
  if (!result.runOk) {
    setGate(s, 'safety', 'NO_GO', 'Échec au démarrage du conteneur');
    writeState(s);
    event('SAFETY', 'Échec au démarrage du conteneur', 'bad', 'NO GO');
    process.stdout.write(result.run.stdout || '');
    process.stderr.write(result.run.stderr || '');
    return 1;
  }
  s.metrics.runtimeUid = result.runtimeUser;
  s.metrics.health = result.health;
  const ok = result.runtimeUser !== '0' && result.health === 'healthy';
  setGate(s, 'safety', ok ? 'CLEARED' : 'NO_GO', `Utilisateur ${result.runtimeUser === '0' ? 'root' : result.runtimeUser} / ${result.health}`);
  writeState(s);
  event('SAFETY', `Utilisateur runtime ${result.runtimeUser === '0' ? 'root' : result.runtimeUser} / health ${result.health}`, ok ? 'good' : 'bad', ok ? 'CLEARED' : 'NO GO');
  printResult(ok, ok ? 'Sécurité runtime validée.' : `Le runtime doit être non-root et healthy (utilisateur ${result.runtimeUser === '0' ? 'root' : result.runtimeUser}, ${result.health}).`);
  return ok ? 0 : 1;
}

function checkControl() {
  const s = state();
  const text = workflowText();
  const staticOk = Boolean(text) && /pull_request\s*:/i.test(text) && /npm\s+run\s+lint/i.test(text) && /npm\s+(?:test|run\s+test)/i.test(text);
  const local = shell('npm', ['run', 'check'], { stdio: 'pipe' }).status === 0;
  const proof = s.evidence?.control;
  const ok = staticOk && local && proof?.red && proof?.green;
  s.uplink.workflow = staticOk ? 'configured' : 'missing';
  setGate(s, 'control', ok ? 'CLEARED' : staticOk ? 'CHECK' : 'NO_GO', ok ? 'Red and green PR evidence recorded' : staticOk ? 'Workflow ready - remote proof required' : 'PR quality controls missing');
  writeState(s);
  event('CI', staticOk ? 'PR quality workflow detected' : 'PR quality workflow missing', staticOk ? 'info' : 'bad', staticOk ? 'CONFIGURED' : 'NO GO');
  printResult(ok, ok ? 'Flight Control validé.' : staticOk ? 'Workflow détecté. Enregistrez maintenant une vraie preuve de PR : npm run mission -- evidence control <red-url> <green-url>' : 'Le workflow doit protéger les pull requests avec le lint et les tests.');
  return ok ? 0 : 2;
}

function matrixStatic(text) {
  const combos = [[20, 'simulation'], [22, 'simulation'], [22, 'flight'], [24, 'simulation'], [24, 'flight']];
  const hasMatrix = /matrix\s*:/i.test(text);
  const hasCache = /cache\s*:\s*(?:npm|['"]?npm)/i.test(text) || /actions\/cache/i.test(text);
  const comboOk = combos.every(([node, mode]) => new RegExp(`node\\s*:\\s*${node}[\\s\\S]{0,100}mode\\s*:\\s*${mode}`, 'i').test(text));
  const no20Flight = !/node\s*:\s*20[\s\S]{0,100}mode\s*:\s*flight/i.test(text);
  return hasMatrix && hasCache && comboOk && no20Flight;
}
function securityStatic(text) {
  const trivy = /trivy|aquasecurity/i.test(text);
  const blocking = /exit[-_]code\s*:\s*['"]?1/i.test(text);
  const dependency = /needs\s*:\s*(?:\[[^\]]*(?:scan|build)[^\]]*\]|(?:build-and-scan|security|scan))/i.test(text);
  return trivy && blocking && dependency;
}
function releaseStatic(text) {
  const ghcr = /ghcr\.io|docker\/login-action/i.test(text);
  const sha = /type\s*=\s*sha|github\.sha|sha-/i.test(text);
  const latest = /latest/i.test(text);
  const protectedPath = /github\.event_name\s*==\s*['"]push['"]|event_name\s*==\s*'push'|refs\/heads\/main/i.test(text);
  return { ok: ghcr && sha && latest && protectedPath, protectedPath };
}
function checkCompat() {
  const s = state();
  const text = workflowText();
  const staticOk = matrixStatic(text);
  const proof = s.evidence?.compat;
  s.uplink.matrixPassed = proof?.url ? 5 : 0;
  const ok = staticOk && Boolean(proof?.url);
  setGate(s, 'compat', ok ? 'CLEARED' : staticOk ? 'CHECK' : 'NO_GO', ok ? '5/5 matrix proof recorded' : staticOk ? 'Matrix configured - run proof required' : 'Supported matrix not represented');
  writeState(s);
  event('GUIDANCE', staticOk ? 'Five supported Node/mode combinations detected' : 'Compatibility matrix incomplete', staticOk ? 'info' : 'bad', staticOk ? 'CONFIGURED' : 'NO GO');
  printResult(ok, ok ? 'Compatibilité validée — 5/5.' : staticOk ? 'Enregistrez un run de matrix réussi : npm run mission -- evidence compat <run-url>' : 'Combinaisons attendues : 20/simulation, 22/simulation, 22/flight, 24/simulation, 24/flight.');
  return ok ? 0 : 2;
}
function checkSecurity() {
  const s = state();
  const text = workflowText();
  const staticOk = securityStatic(text);
  const proof = s.evidence?.security;
  const ok = staticOk && Boolean(proof?.url);
  s.uplink.security = ok ? 'cleared' : staticOk ? 'configured' : 'blocked';
  setGate(s, 'security', ok ? 'CLEARED' : staticOk ? 'CHECK' : 'NO_GO', ok ? 'Blocking scan evidence recorded' : staticOk ? 'Security gate configured - proof required' : 'Scan does not govern publish');
  writeState(s);
  event('SECURITY', staticOk ? 'Blocking security policy detected' : 'Security gate missing or permissive', staticOk ? 'warn' : 'bad', staticOk ? 'ARMED' : 'NO GO');
  printResult(ok, ok ? 'Sécurité validée.' : staticOk ? 'Enregistrez un run volontairement bloqué par le scan : npm run mission -- evidence security <run-url>' : 'Une CRITICAL doit faire échouer le scan et la publication doit dépendre de cette gate.');
  return ok ? 0 : 2;
}
function checkRelease() {
  const s = state();
  const text = workflowText();
  const staticInfo = releaseStatic(text);
  const proof = s.evidence?.release;
  const securityCleared = s.gates.security?.status === 'CLEARED';
  const ok = staticInfo.ok && securityCleared && proof?.packageUrl && proof?.shaTag;
  s.uplink.registry = ok ? 'published' : staticInfo.ok ? 'ready' : 'locked';
  setGate(s, 'release', ok ? 'CLEARED' : staticInfo.ok ? 'CHECK' : 'LOCKED', ok ? 'GHCR + SHA proof recorded' : staticInfo.ok ? 'Release config ready - registry proof required' : 'Release path incomplete');
  writeState(s);
  event('FLIGHT', ok ? 'Traceable release verified' : staticInfo.ok ? 'Release path configured - waiting for proof' : 'Registry path remains locked', ok ? 'good' : 'warn', ok ? 'CLEARED' : 'HOLD');
  if (ok) event('DEEP SPACE', 'Flight Readiness 6/6 — Deep Space Mode déverrouillé', 'good', 'UNLOCKED');
  printResult(ok, ok ? 'Release autorisée — GO FOR LAUNCH. Deep Space Mode déverrouillé.' : staticInfo.ok && !securityCleared ? 'La sécurité doit être validée avant la publication.' : staticInfo.ok ? 'Enregistrez la preuve du package : npm run mission -- evidence release <package-url> <sha-tag>' : 'GHCR + latest + SHA + protected publish path required.');
  return ok ? 0 : 2;
}

function setDeepResult(s, code, ok, successNote, failNote) {
  if (ok) {
    s.deepSpace.missions[code] = { status: 'CLEARED', note: successNote };
    s.deepSpace.active = null;
    if (s.incident?.code === code) s.incident.active = false;
    writeState(s);
    event('DEEP SPACE', `${code} ${deepSpaceTitles[code]} cleared`, 'good', 'CLEARED');
    const next = deepSpaceCodes.find((item) => state().deepSpace.missions[item]?.status === 'AVAILABLE');
    if (next) event('DEEP SPACE', `${next} disponible`, 'info', 'AVAILABLE');
    return;
  }
  s.deepSpace.missions[code] = { status: 'ACTIVE', note: failNote };
  s.deepSpace.active = code;
  writeState(s);
  event('DEEP SPACE', `${code} reste actif : ${failNote}`, 'warn', 'ACTIVE');
}
function ensureDeepCheckReady(s, code) {
  if (!s.deepSpace?.unlocked) {
    printResult(false, 'Deep Space est verrouillé. Obtenez d’abord Flight Readiness 6/6.');
    return false;
  }
  const status = s.deepSpace.missions?.[code]?.status;
  if (status === 'CLEARED') {
    printResult(true, `${code} est déjà cleared.`);
    return 'cleared';
  }
  if (status === 'AVAILABLE') {
    printResult(false, `Armez d’abord ${code} avec : npm run incident -- ${code}`);
    return false;
  }
  if (status !== 'ACTIVE') {
    printResult(false, `${code} est verrouillé. Terminez l’incident précédent.`);
    return false;
  }
  return true;
}
function deepProof(s, code) { return s.deepSpace?.evidence?.[code] || {}; }
function checkDeepSpace(code) {
  const s = state();
  const ready = ensureDeepCheckReady(s, code);
  if (ready === 'cleared') return 0;
  if (!ready) return 2;
  const text = workflowText();
  let ok = false;
  let success = '';
  let fail = '';

  if (code === 'X1') {
    const proof = deepProof(s, code);
    ok = securityStatic(text) && Boolean(proof.blockedRunUrl);
    success = 'Scan bloquant + publication dépendante prouvés';
    fail = securityStatic(text) ? 'Ajoutez une preuve d’un run bloqué' : 'Le scan doit être bloquant et gouverner publish';
    printResult(ok, ok ? 'X1 cleared — le scanner a un vrai pouvoir de décision.' : securityStatic(text) ? 'Configuration cohérente. Preuve attendue : npm run mission -- evidence X1 <blocked-run-url>' : 'Vérifiez le code de sortie du scan et la dépendance du job publish.');
  } else if (code === 'X2') {
    const proof = deepProof(s, code);
    const release = releaseStatic(text);
    const prConfigured = /pull_request\s*:/i.test(text);
    ok = release.protectedPath && prConfigured && Boolean(proof.prRunUrl);
    success = 'PR validée sans chemin de publication production';
    fail = release.protectedPath ? 'Ajoutez la preuve d’une PR sans publication' : 'Le job publish doit exclure les Pull Requests';
    printResult(ok, ok ? 'X2 cleared — une PR ne peut pas publier en production.' : release.protectedPath ? 'Preuve attendue : npm run mission -- evidence X2 <pr-run-url>' : 'Séparez explicitement le chemin de validation PR du chemin de publication.');
  } else if (code === 'X3') {
    const proof = deepProof(s, code);
    const cacheConfigured = /cache\s*:\s*(?:npm|['"]?npm)/i.test(text) || /actions\/cache/i.test(text);
    ok = cacheConfigured && Boolean(proof.cacheHitUrl) && Boolean(proof.cacheMissUrl);
    success = 'Cache hit + invalidation après changement du lockfile prouvés';
    fail = cacheConfigured ? 'Montrez un cache hit puis un cache miss' : 'Aucun cache de dépendances détecté';
    printResult(ok, ok ? 'X3 cleared — le cache distingue correctement deux lockfiles.' : cacheConfigured ? 'Preuves attendues : npm run mission -- evidence X3 <cache-hit-url> <cache-miss-url>' : 'Configurez un cache de dépendances qui tient compte du lockfile.');
  } else if (code === 'X4') {
    const proof = deepProof(s, code);
    const multiPlatform = /platforms\s*:[\s\S]{0,220}linux\/amd64[\s\S]{0,220}linux\/arm64/i.test(text) || /platforms\s*:[\s\S]{0,220}linux\/arm64[\s\S]{0,220}linux\/amd64/i.test(text);
    ok = multiPlatform && Boolean(proof.manifestUrl);
    success = 'Manifest multi-plateforme amd64 + arm64 prouvé';
    fail = multiPlatform ? 'Ajoutez la preuve du manifest publié' : 'Les deux plateformes ne sont pas encore publiées ensemble';
    printResult(ok, ok ? 'X4 cleared — une même référence couvre amd64 et arm64.' : multiPlatform ? 'Preuve attendue : npm run mission -- evidence X4 <manifest-url>' : 'Le workflow de publication doit produire linux/amd64 et linux/arm64 sous une même référence.');
  } else if (code === 'X5') {
    if (shell('docker', ['version'], { stdio: 'ignore' }).status !== 0) {
      fail = 'Docker indisponible';
      printResult(false, 'Docker doit être démarré pour vérifier le healthcheck final.');
    } else {
      const result = inspectRuntime('orbiter-7:deep-x5', 'orbiter-7-deep-x5');
      ok = result.buildOk && result.runOk && result.health === 'healthy';
      success = 'Image finale légère et healthcheck fonctionnel';
      fail = !result.buildOk ? 'Le build échoue' : !result.runOk ? 'Le container ne démarre pas' : `Healthcheck ${result.health || 'missing'}`;
      printResult(ok, ok ? 'X5 cleared — la sonde de santé fonctionne dans l’image finale.' : `Le container doit devenir healthy. État observé : ${result.health || 'indisponible'}.`);
    }
  } else if (code === 'X6') {
    const proof = deepProof(s, code);
    const matrixOk = matrixStatic(text);
    ok = matrixOk && Boolean(proof.redRunUrl) && Boolean(proof.greenRunUrl);
    success = 'Anomalie isolée puis 5/5 rétabli avec preuves rouge/verte';
    fail = matrixOk ? 'Ajoutez les preuves rouge puis verte de la combinaison' : 'La matrix supportée n’est plus conforme';
    printResult(ok, ok ? 'X6 cleared — diagnostic terminé et 5/5 rétabli.' : matrixOk ? 'Preuves attendues : npm run mission -- evidence X6 <red-run-url> <green-run-url>' : 'Rétablissez exactement les cinq combinaisons supportées avant de fournir les preuves.');
  }

  setDeepResult(s, code, ok, success, fail);
  return ok ? 0 : 2;
}

function evidence(kind, args) {
  const s = state();
  s.evidence ||= {};
  const normalized = String(kind || '').toUpperCase();
  if (kind === 'control') {
    const [red, green] = args;
    if (!red || !green) throw new Error('Usage: npm run mission -- evidence control <red-url> <green-url>');
    s.evidence.control = { red, green };
    event('CI', 'PR red + green evidence recorded', 'good', 'PROOF');
  } else if (kind === 'compat') {
    const [url] = args;
    if (!url) throw new Error('Usage: npm run mission -- evidence compat <run-url>');
    s.evidence.compat = { url };
    s.uplink.matrixPassed = 5;
    event('GUIDANCE', '5/5 compatibility run evidence recorded', 'good', 'PROOF');
  } else if (kind === 'security') {
    const [url] = args;
    if (!url) throw new Error('Usage: npm run mission -- evidence security <blocked-run-url>');
    s.evidence.security = { url };
    event('SECURITY', 'Blocked CRITICAL run evidence recorded', 'good', 'PROOF');
  } else if (kind === 'release') {
    const [packageUrl, shaTag] = args;
    if (!packageUrl || !shaTag) throw new Error('Usage: npm run mission -- evidence release <package-url> <sha-tag>');
    s.evidence.release = { packageUrl, shaTag };
    event('REGISTRY', `GHCR evidence recorded: ${shaTag}`, 'good', 'PROOF');
  } else if (deepSpaceCodes.includes(normalized)) {
    if (!s.deepSpace?.unlocked) throw new Error('Deep Space est verrouillé tant que Flight Readiness n’est pas à 6/6.');
    s.deepSpace.evidence ||= {};
    if (normalized === 'X1') {
      const [blockedRunUrl] = args;
      if (!blockedRunUrl) throw new Error('Usage: npm run mission -- evidence X1 <blocked-run-url>');
      s.deepSpace.evidence.X1 = { blockedRunUrl };
    } else if (normalized === 'X2') {
      const [prRunUrl] = args;
      if (!prRunUrl) throw new Error('Usage: npm run mission -- evidence X2 <pr-run-url>');
      s.deepSpace.evidence.X2 = { prRunUrl };
    } else if (normalized === 'X3') {
      const [cacheHitUrl, cacheMissUrl] = args;
      if (!cacheHitUrl || !cacheMissUrl) throw new Error('Usage: npm run mission -- evidence X3 <cache-hit-url> <cache-miss-url>');
      s.deepSpace.evidence.X3 = { cacheHitUrl, cacheMissUrl };
    } else if (normalized === 'X4') {
      const [manifestUrl] = args;
      if (!manifestUrl) throw new Error('Usage: npm run mission -- evidence X4 <manifest-url>');
      s.deepSpace.evidence.X4 = { manifestUrl };
    } else if (normalized === 'X6') {
      const [redRunUrl, greenRunUrl] = args;
      if (!redRunUrl || !greenRunUrl) throw new Error('Usage: npm run mission -- evidence X6 <red-run-url> <green-run-url>');
      s.deepSpace.evidence.X6 = { redRunUrl, greenRunUrl };
    } else if (normalized === 'X5') {
      throw new Error('X5 ne demande pas d’URL : lancez directement npm run mission -- check X5');
    }
    event('DEEP SPACE', `${normalized} evidence recorded`, 'good', 'PROOF');
  } else {
    throw new Error(`Unknown evidence type: ${kind}`);
  }
  writeState(s);
}

function incident(code, clear = false) {
  const s = state();
  if (clear) {
    if (s.incident) s.incident.active = false;
    writeState(s);
    event('FLIGHT', 'Master alarm acquittée', 'info', 'ACK');
    return;
  }
  const incidents = {
    PR: { title: 'FLIGHT SOFTWARE INCIDENT', message: 'Une release candidate contient une régression. La pull request doit prouver que la CI sait la bloquer.' },
    X1: { title: 'SECURITY THEATER', message: 'Une finding CRITICAL a été détectée, mais la publication a quand même continué.' },
    X2: { title: 'UNAUTHORIZED RELEASE PATH', message: 'Une pull request peut publier dans le registry de production.' },
    X3: { title: 'CACHE INTEGRITY ALERT', message: 'Le cache des dépendances survit à une modification du lockfile qui devrait l’invalider.' },
    X4: { title: 'PLATFORM COVERAGE HOLD', message: 'Orbiter-7 doit être publié pour linux/amd64 et linux/arm64.' },
    X5: { title: 'HEALTH SIGNAL LOST', message: 'L’image est minuscule, mais le runtime final ne peut plus exécuter sa sonde de santé.' },
    X6: { title: 'COMPATIBILITY ANOMALY', message: 'Quatre jobs de matrix sont verts et une combinaison supportée reste rouge.' },
  };
  const normalized = String(code || '').toUpperCase();
  const data = incidents[normalized];
  if (!data) throw new Error('Incident inconnu. Utilisez PR ou X1..X6.');

  if (deepSpaceCodes.includes(normalized)) {
    normalizeDeepSpace(s);
    if (!s.deepSpace.unlocked) throw new Error('Deep Space est verrouillé. Obtenez d’abord les 6 gates obligatoires.');
    const status = s.deepSpace.missions[normalized]?.status;
    const otherActive = deepSpaceCodes.find((item) => item !== normalized && s.deepSpace.missions[item]?.status === 'ACTIVE');
    if (otherActive) throw new Error(`${otherActive} est déjà actif. Terminez-le avant de lancer ${normalized}.`);
    if (status === 'LOCKED') throw new Error(`${normalized} est verrouillé. Terminez l’incident Deep Space précédent.`);
    if (status === 'CLEARED') throw new Error(`${normalized} est déjà cleared.`);
    s.deepSpace.missions[normalized] = { status: 'ACTIVE', note: 'Incident en cours' };
    s.deepSpace.active = normalized;
  }

  s.incident = { active: true, code: normalized, ...data };
  writeState(s);
  event('ALARM', data.message, 'bad', 'MASTER ALARM');
}

function reset() {
  saveJson(STATE_FILE, defaultState());
  saveJson(EVENTS_FILE, [{ time: nowTime(), source: 'SYSTEM', message: 'État mission réinitialisé — maintien au sol actif', level: 'info', status: 'RESET' }]);
  console.log('Mission Control réinitialisé.');
}
function showStatus() {
  const s = state();
  writeState(s);
  console.log('\nORBITER-7 / FLIGHT READINESS');
  for (const key of gates) console.log(`${key.padEnd(12)} ${String(s.gates[key]?.status || 'UNKNOWN').padEnd(9)} ${s.gates[key]?.note || ''}`);
  console.log(`\nDEEP SPACE / ${s.deepSpace.unlocked ? 'UNLOCKED' : 'LOCKED'}`);
  for (const code of deepSpaceCodes) console.log(`${code.padEnd(12)} ${String(s.deepSpace.missions[code]?.status || 'LOCKED').padEnd(9)} ${s.deepSpace.missions[code]?.note || ''}`);
  console.log(`\nConsole: http://localhost:${process.env.PORT || 3000}`);
}

const [command, sub, ...rest] = process.argv.slice(2);
try {
  let code = 0;
  if (command === 'check') {
    const normalized = String(sub || '').toUpperCase();
    if (sub === 'mass') code = checkMass();
    else if (sub === 'safety') code = checkSafety();
    else if (sub === 'control') code = checkControl();
    else if (sub === 'compat') code = checkCompat();
    else if (sub === 'security') code = checkSecurity();
    else if (sub === 'release') code = checkRelease();
    else if (deepSpaceCodes.includes(normalized)) code = checkDeepSpace(normalized);
    else throw new Error('Usage: npm run mission -- check mass|safety|control|compat|security|release|X1|X2|X3|X4|X5|X6');
  } else if (command === 'evidence') evidence(sub, rest);
  else if (command === 'record' && sub === 'measurement') updateMeasurement(rest[0]);
  else if (command === 'incident') incident(sub);
  else if (command === 'ack') incident(null, true);
  else if (command === 'reset') reset();
  else if (command === 'status' || !command) showStatus();
  else throw new Error('Usage: npm run mission -- status | check <gate|X1..X6> | evidence <type|X1..X6> ... | incident <PR|X1..X6> | ack | reset');
  process.exitCode = code;
} catch (error) {
  console.error(`[ERROR] ${error.message}`);
  process.exitCode = 1;
}
