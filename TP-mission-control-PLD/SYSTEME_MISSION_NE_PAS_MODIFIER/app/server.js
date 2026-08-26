'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const HOST = '0.0.0.0';
const DEFAULT_PORT = 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const MISSION_DIR = path.join(__dirname, '..', 'runtime');
const STATE_FILE = path.join(MISSION_DIR, 'state.json');
const EVENTS_FILE = path.join(MISSION_DIR, 'events.json');
const HINTS_DIR = path.join(__dirname, '..', 'indices');
const SUPPORTED_MODES = new Set(['simulation', 'flight']);
const BASE_GATES = ['mass', 'safety', 'control', 'compat', 'security', 'release'];
const DEEP_CODES = ['X1', 'X2', 'X3', 'X4', 'X5', 'X6'];

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
};

function missionMode() {
  const requested = process.env.MISSION_MODE || 'simulation';
  return SUPPORTED_MODES.has(requested) ? requested : 'simulation';
}

function freshDeepSpace() {
  return {
    unlocked: false,
    active: null,
    missions: Object.fromEntries(DEEP_CODES.map((code) => [code, { status: 'LOCKED', note: 'Flight Readiness 6/6 requis' }])),
    evidence: {},
  };
}

function defaultState() {
  return {
    version: 3,
    startedAt: new Date().toISOString(),
    launchWindowSeconds: 10800,
    mode: missionMode(),
    buildSha: process.env.BUILD_SHA || 'local',
    gates: {
      mass: { status: 'NO_GO', note: 'Baseline à mesurer' },
      safety: { status: 'NO_GO', note: 'UID / health non validés' },
      control: { status: 'UNKNOWN', note: 'Contrôles PR non vérifiés' },
      compat: { status: 'UNKNOWN', note: 'Matrix non certifiée' },
      security: { status: 'LOCKED', note: 'En attente du build / scan' },
      release: { status: 'LOCKED', note: 'Chemin registry verrouillé' },
    },
    metrics: {
      baselineSizeMb: null,
      imageSizeMb: null,
      reductionPercent: null,
      buildSeconds: null,
      runtimeUid: null,
      health: 'unknown',
    },
    uplink: {
      workflow: 'unknown',
      matrixPassed: 0,
      matrixTotal: 5,
      security: 'locked',
      registry: 'locked',
      branch: 'local',
    },
    directive: {
      code: '00',
      title: 'BASELINE REQUIRED',
      message: 'Mesurez le système avant toute optimisation.',
    },
    hintsUsed: {},
    incident: null,
    deepSpace: freshDeepSpace(),
  };
}

function initialEvents() {
  return [
    { time: nowTime(), source: 'SYSTEM', message: 'Mission Control Orbiter-7 en ligne', level: 'info', status: 'NOMINAL' },
    { time: nowTime(), source: 'FLIGHT', message: 'Qualification de release ouverte — maintien au sol actif', level: 'warn', status: 'HOLD' },
  ];
}

function nowTime() {
  return new Date().toISOString().slice(11, 19);
}

function ensureMissionFiles() {
  fs.mkdirSync(MISSION_DIR, { recursive: true });
  if (!fs.existsSync(STATE_FILE)) fs.writeFileSync(STATE_FILE, `${JSON.stringify(defaultState(), null, 2)}\n`);
  if (!fs.existsSync(EVENTS_FILE)) fs.writeFileSync(EVENTS_FILE, `${JSON.stringify(initialEvents(), null, 2)}\n`);
}

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}

function writeJson(file, payload) {
  fs.writeFileSync(file, `${JSON.stringify(payload, null, 2)}\n`);
}

function baseCleared(state) {
  return BASE_GATES.every((key) => state.gates?.[key]?.status === 'CLEARED');
}

function normalizeDeepSpace(state) {
  state.deepSpace ||= freshDeepSpace();
  state.deepSpace.missions ||= {};
  state.deepSpace.evidence ||= {};
  for (const code of DEEP_CODES) {
    state.deepSpace.missions[code] ||= { status: 'LOCKED', note: 'Incident non commencé' };
  }

  if (!baseCleared(state)) {
    state.deepSpace.unlocked = false;
    state.deepSpace.active = null;
    for (const code of DEEP_CODES) {
      if (state.deepSpace.missions[code].status !== 'CLEARED') {
        state.deepSpace.missions[code] = { status: 'LOCKED', note: 'Flight Readiness 6/6 requis' };
      }
    }
    return state;
  }

  state.deepSpace.unlocked = true;
  const active = DEEP_CODES.find((code) => state.deepSpace.missions[code]?.status === 'ACTIVE');
  state.deepSpace.active = active || null;
  if (active) return state;

  const next = DEEP_CODES.find((code) => state.deepSpace.missions[code]?.status !== 'CLEARED');
  for (const code of DEEP_CODES) {
    if (state.deepSpace.missions[code]?.status === 'CLEARED') continue;
    if (code === next) state.deepSpace.missions[code] = { status: 'AVAILABLE', note: 'Incident disponible' };
    else state.deepSpace.missions[code] = { status: 'LOCKED', note: `Terminez ${next || 'le parcours précédent'} avant` };
  }
  return state;
}

function readState() {
  ensureMissionFiles();
  const state = normalizeDeepSpace(readJson(STATE_FILE, defaultState()));
  state.version = 3;
  state.mode = missionMode();
  state.buildSha = process.env.BUILD_SHA || state.buildSha || 'local';
  writeJson(STATE_FILE, state);
  return state;
}

function readEvents() {
  ensureMissionFiles();
  return readJson(EVENTS_FILE, initialEvents()).slice(-80);
}

function appendEvent(event) {
  const events = readEvents();
  events.push({ time: nowTime(), level: 'info', status: 'INFO', ...event });
  writeJson(EVENTS_FILE, events.slice(-80));
}

function currentDirective(state) {
  const order = [
    ['mass', '01', 'MASS / BUILD CONTEXT', 'L image et le rebuild doivent être qualifiés avant toute autre gate.'],
    ['safety', '02', 'CREW SAFETY', 'Le runtime doit prouver son identité non-root et un signal de santé fiable.'],
    ['control', '03', 'FLIGHT CONTROL', 'Une mauvaise pull request doit être détectée avant main.'],
    ['compat', '04', 'COMPATIBILITY', 'Certifiez exactement les cinq environnements de mission supportés.'],
    ['security', '05', 'SECURITY CLEARANCE', 'Une finding CRITICAL doit pouvoir arrêter la chaîne avant publication.'],
    ['release', '06', 'RELEASE AUTHORIZATION', 'Publiez uniquement depuis le chemin autorisé avec une trace immuable.'],
  ];
  const pending = order.find(([key]) => state.gates?.[key]?.status !== 'CLEARED');
  if (pending) return { code: pending[1], title: pending[2], message: pending[3] };

  const deepMeta = {
    X1: ['SECURITY THEATER', 'Vérifiez que le scanner décide réellement si la publication peut continuer.'],
    X2: ['PR PUBLISHES PRODUCTION', 'Prouvez qu une Pull Request ne peut jamais écrire dans le registry de production.'],
    X3: ['CACHE THAT LIES', 'Vérifiez qu un changement du lockfile invalide réellement le cache des dépendances.'],
    X4: ['TWO ARCHITECTURES', 'Étendez la release à linux/amd64 et linux/arm64 sous une même référence.'],
    X5: ['SMALL BUT DEAD', 'Conservez une image légère sans casser le healthcheck du runtime final.'],
    X6: ['ONE COMBINATION FAILS', 'Isolez une anomalie de matrix et rétablissez les cinq environnements supportés.'],
  };
  const active = DEEP_CODES.find((code) => state.deepSpace?.missions?.[code]?.status === 'ACTIVE');
  const available = DEEP_CODES.find((code) => state.deepSpace?.missions?.[code]?.status === 'AVAILABLE');
  const current = active || available;
  if (current) {
    const [title, message] = deepMeta[current];
    return { code: current, title: `DEEP SPACE / ${title}`, message };
  }
  return { code: 'DS', title: 'DEEP SPACE COMPLETE', message: 'Les six incidents optionnels sont cleared. Mission d entraînement complète.' };
}

function missionPayload() {
  const state = readState();
  state.directive = currentDirective(state);
  return {
    mission: 'ORBITER-7',
    vehicle: 'AURORA',
    mode: state.mode,
    buildSha: state.buildSha,
    systems: [
      { name: 'Telemetry', status: 'ONLINE' },
      { name: 'Navigation', status: 'ONLINE' },
      { name: 'Guidance', status: 'ONLINE' },
      { name: 'Payload', status: 'ONLINE' },
    ],
    state,
    events: readEvents(),
  };
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

function hintPath(gate, level) {
  const rawGate = String(gate || '').toUpperCase();
  const gateValue = /^X[1-6]$/.test(rawGate) ? rawGate : rawGate.padStart(2, '0');
  const levelValue = Number(level);
  if (![1, 2, 3].includes(levelValue)) return null;
  if (/^0[1-6]$/.test(gateValue)) return path.join(HINTS_DIR, `gate-${gateValue}-hint-${levelValue}.md`);
  if (/^X[1-6]$/.test(gateValue)) return path.join(HINTS_DIR, `bonus-${gateValue}-hint-${levelValue}.md`);
  return null;
}

function readHint(gate, level) {
  const file = hintPath(gate, level);
  if (!file || !fs.existsSync(file)) return null;
  const raw = fs.readFileSync(file, 'utf8').trim();
  const lines = raw.split(/\r?\n/);
  const title = (lines.find((line) => line.startsWith('# ')) || `# ${gate}`).replace(/^#\s*/, '');
  const text = lines.filter((line) => !line.startsWith('#')).join(' ').trim();
  return { title, text };
}

function recordHint(gate, level) {
  const state = readState();
  state.hintsUsed = state.hintsUsed || {};
  const key = String(gate || '').toUpperCase();
  const current = Number(state.hintsUsed[key] || 0);
  state.hintsUsed[key] = Math.max(current, Number(level));
  writeJson(STATE_FILE, state);
  appendEvent({ source: 'CREW', message: `${key.startsWith('X') ? 'Deep Space' : 'Gate'} ${key} - indice ${level} demandé`, level: 'warn', status: 'ASSIST' });
}

function safeStaticPath(urlPath) {
  const requested = urlPath === '/' ? '/index.html' : urlPath;
  const decoded = decodeURIComponent(requested.split('?')[0]);
  const resolved = path.resolve(PUBLIC_DIR, `.${decoded}`);
  if (!resolved.startsWith(PUBLIC_DIR)) return null;
  return resolved;
}

function requestHandler(req, res) {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

  if (url.pathname === '/health') {
    sendJson(res, 200, { status: 'ok', mission: 'ORBITER-7', mode: missionMode() });
    return;
  }

  if (url.pathname === '/api/mission') {
    sendJson(res, 200, missionPayload());
    return;
  }

  if (url.pathname === '/api/hint' && req.method === 'POST') {
    const gate = url.searchParams.get('gate');
    const level = url.searchParams.get('level');
    const hint = readHint(gate, level);
    if (!hint) { sendJson(res, 404, { error: 'hint not found' }); return; }
    recordHint(gate, Number(level));
    sendJson(res, 200, hint);
    return;
  }

  if (url.pathname === '/api/ack' && req.method === 'POST') {
    const state = readState();
    if (state.incident) state.incident.active = false;
    writeJson(STATE_FILE, state);
    appendEvent({ source: 'FLIGHT', message: 'Alarme principale acquittée par l équipage', level: 'info', status: 'ACK' });
    sendJson(res, 200, { ok: true });
    return;
  }

  const filePath = safeStaticPath(url.pathname);
  if (!filePath) { sendJson(res, 403, { error: 'forbidden' }); return; }

  fs.stat(filePath, (statError, stats) => {
    if (statError || !stats.isFile()) { sendJson(res, 404, { error: 'not found' }); return; }
    const extension = path.extname(filePath);
    res.writeHead(200, {
      'Content-Type': CONTENT_TYPES[extension] || 'application/octet-stream',
      'Cache-Control': extension === '.html' ? 'no-store' : 'public, max-age=60',
    });
    fs.createReadStream(filePath).pipe(res);
  });
}

function createServer() { return http.createServer(requestHandler); }

if (require.main === module) {
  ensureMissionFiles();
  const port = Number(process.env.PORT || DEFAULT_PORT);
  const server = createServer();
  server.listen(port, HOST, () => process.stdout.write(`Orbiter-7 Flight Operations listening on http://${HOST}:${port}\n`));
}

module.exports = { createServer, missionPayload, missionMode, readState, readEvents };
