'use strict';

const gateMeta = [
  { key: 'mass', number: '01', name: 'MASS', detail: 'IMAGE / CACHE', command: 'npm run mission -- check mass' },
  { key: 'safety', number: '02', name: 'SAFETY', detail: 'USER / HEALTH', command: 'npm run mission -- check safety' },
  { key: 'control', number: '03', name: 'FLIGHT CONTROL', detail: 'PR / QUALITY', command: 'npm run mission -- check control' },
  { key: 'compat', number: '04', name: 'COMPATIBILITY', detail: 'MATRIX / CACHE', command: 'npm run mission -- check compat' },
  { key: 'security', number: '05', name: 'SECURITY', detail: 'SCAN / POLICY', command: 'npm run mission -- check security' },
  { key: 'release', number: '06', name: 'RELEASE', detail: 'GHCR / TAGS', command: 'npm run mission -- check release' },
];

const deepSpaceMeta = [
  { code: 'X1', name: 'SECURITY THEATER', detail: 'SCAN / DECISION' },
  { code: 'X2', name: 'PR PUBLISHES PRODUCTION', detail: 'EVENT / REGISTRY' },
  { code: 'X3', name: 'CACHE THAT LIES', detail: 'LOCKFILE / CACHE' },
  { code: 'X4', name: 'TWO ARCHITECTURES', detail: 'AMD64 / ARM64' },
  { code: 'X5', name: 'SMALL BUT DEAD', detail: 'SIZE / HEALTH' },
  { code: 'X6', name: 'ONE COMBINATION FAILS', detail: 'MATRIX / DIAGNOSIS' },
];

let lastState = null;
let currentHintLevel = 1;
let currentHintGate = '01';

function fmtClock(date = new Date()) {
  return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'UTC' }).format(date);
}

function statusLabel(status) {
  return ({ CLEARED: 'CLEARED', NO_GO: 'NO GO', CHECK: 'CHECK', LOCKED: 'LOCKED', UNKNOWN: 'UNKNOWN', AVAILABLE: 'AVAILABLE', ACTIVE: 'ACTIVE' })[status] || status || 'UNKNOWN';
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
}

function renderGateBoard(state) {
  const board = document.querySelector('#gateBoard');
  const gates = state.gates || {};
  board.innerHTML = gateMeta.map((meta) => {
    const gate = gates[meta.key] || { status: 'UNKNOWN' };
    return `<div class="gate-row" data-key="${meta.key}" data-status="${escapeHtml(gate.status || 'UNKNOWN')}">
      <span class="gate-number">${meta.number}</span>
      <div><strong>${meta.name}</strong><small>${meta.detail}</small></div>
      <span class="gate-status">${statusLabel(gate.status)}</span>
    </div>`;
  }).join('');

  board.querySelectorAll('.gate-row').forEach((row) => {
    row.addEventListener('click', () => {
      const meta = gateMeta.find((item) => item.key === row.dataset.key);
      if (meta) {
        document.querySelector('#currentCommand').textContent = meta.command;
        currentHintGate = meta.number;
        currentHintLevel = 1;
      }
    });
  });
}

function renderDeepSpace(state) {
  const deep = state.deepSpace || {};
  const missions = deep.missions || {};
  const section = document.querySelector('#deepSpaceSection');
  const lock = document.querySelector('#deepSpaceLock');
  const board = document.querySelector('#deepSpaceBoard');
  const cleared = deepSpaceMeta.filter((meta) => missions[meta.code]?.status === 'CLEARED').length;

  section.dataset.unlocked = deep.unlocked ? 'true' : 'false';
  lock.hidden = Boolean(deep.unlocked);
  document.querySelector('#deepSpaceScore').textContent = `${cleared}/6`;
  document.querySelector('#deepSpaceState').textContent = deep.unlocked ? (cleared === 6 ? 'ALL INCIDENTS CLEARED' : 'MODE UNLOCKED') : 'LOCKED UNTIL FLIGHT READINESS 6/6';

  const activeMeta = deepSpaceMeta.find((meta) => missions[meta.code]?.status === 'ACTIVE');
  const availableMeta = deepSpaceMeta.find((meta) => missions[meta.code]?.status === 'AVAILABLE');
  const nextMeta = activeMeta || availableMeta;
  document.querySelector('#deepStartCommand').textContent = nextMeta ? (activeMeta ? `npm run mission -- check ${nextMeta.code}` : `npm run incident -- ${nextMeta.code}`) : (deep.unlocked ? 'DEEP SPACE COMPLETE' : 'LOCKED');
  document.querySelector('#deepCheckCommand').textContent = nextMeta ? `npm run mission -- check ${nextMeta.code}` : 'npm run mission -- status';

  board.innerHTML = deepSpaceMeta.map((meta) => {
    const mission = missions[meta.code] || { status: 'LOCKED', note: 'Flight Readiness 6/6 requis' };
    return `<article class="deep-card" data-code="${meta.code}" data-status="${escapeHtml(mission.status || 'LOCKED')}">
      <div class="deep-card-top"><span>${meta.code}</span><em>${statusLabel(mission.status)}</em></div>
      <strong>${meta.name}</strong>
      <small>${meta.detail}</small>
      <p>${escapeHtml(mission.note || '')}</p>
    </article>`;
  }).join('');

  board.querySelectorAll('.deep-card').forEach((card) => {
    card.addEventListener('click', () => {
      const mission = missions[card.dataset.code] || { status: 'LOCKED' };
      if (mission.status === 'LOCKED') return;
      const command = mission.status === 'AVAILABLE'
        ? `npm run incident -- ${card.dataset.code}`
        : mission.status === 'ACTIVE'
          ? `npm run mission -- check ${card.dataset.code}`
          : 'npm run mission -- status';
      document.querySelector('#currentCommand').textContent = command;
      currentHintGate = card.dataset.code;
      currentHintLevel = 1;
    });
  });
}

function renderSystems(systems = []) {
  const container = document.querySelector('#systems');
  container.innerHTML = systems.map((system) => `<div class="subsystem"><strong>${escapeHtml(system.name)}</strong><small>${escapeHtml(system.status)}</small><i></i></div>`).join('');
}

function renderEvents(events = []) {
  const log = document.querySelector('#eventLog');
  log.innerHTML = events.slice().reverse().map((event) => {
    const level = event.level || 'info';
    return `<div class="event ${level}"><time>${escapeHtml(event.time || '--:--:--')}</time><span class="source">${escapeHtml(event.source || 'SYSTEM')}</span><span class="message">${escapeHtml(event.message || '')}</span><span class="event-status">${escapeHtml(event.status || level.toUpperCase())}</span></div>`;
  }).join('');
  document.querySelector('#eventCount').textContent = `${events.length} ÉVÉNEMENTS`;
}

function renderMetrics(state) {
  const metrics = state.metrics || {};
  const imageSize = metrics.imageSizeMb == null ? '-- MB' : `${Number(metrics.imageSizeMb).toFixed(1)} MB`;
  document.querySelector('#imageSize').textContent = imageSize;
  document.querySelector('#buildTime').textContent = metrics.buildSeconds == null ? '-- s' : `${metrics.buildSeconds} s`;
  document.querySelector('#runtimeUid').textContent = metrics.runtimeUid == null || metrics.runtimeUid === '' ? '--' : String(metrics.runtimeUid);
  document.querySelector('#healthStatus').textContent = String(metrics.health || 'UNKNOWN').toUpperCase();
  document.querySelector('#missionMode').textContent = String(state.mode || 'simulation').toUpperCase();
  document.querySelector('#buildSha').textContent = String(state.buildSha || 'local').slice(0, 12).toUpperCase();

  const delta = document.querySelector('#imageDelta');
  if (metrics.reductionPercent != null) {
    delta.textContent = `${Number(metrics.reductionPercent).toFixed(1)}% REDUCTION`;
    delta.className = Number(metrics.reductionPercent) >= 60 ? 'good' : 'bad';
  } else {
    delta.textContent = 'BASELINE À FAIRE';
    delta.className = '';
  }

  const uidNote = document.querySelector('#uidNote');
  if (String(metrics.runtimeUid) === '0') { uidNote.textContent = 'ROOT DÉTECTÉ'; uidNote.className = 'bad'; }
  else if (metrics.runtimeUid != null) { uidNote.textContent = 'NON-ROOT'; uidNote.className = 'good'; }
  else { uidNote.textContent = 'NON INSPECTÉ'; uidNote.className = ''; }

  const healthNote = document.querySelector('#healthNote');
  if (String(metrics.health).toLowerCase() === 'healthy') { healthNote.textContent = 'SONDE OK'; healthNote.className = 'good'; }
  else if (String(metrics.health).toLowerCase() === 'unhealthy') { healthNote.textContent = 'SONDE EN ÉCHEC'; healthNote.className = 'bad'; }
  else { healthNote.textContent = 'AUCUN SIGNAL'; healthNote.className = ''; }
}

function renderReadiness(state) {
  const gates = state.gates || {};
  const cleared = gateMeta.filter((meta) => gates[meta.key]?.status === 'CLEARED').length;
  const hasAlarm = Boolean(state.incident?.active) || gateMeta.some((meta) => gates[meta.key]?.status === 'NO_GO');
  const allGo = cleared === gateMeta.length;
  const incidentActive = Boolean(state.incident?.active);

  document.querySelector('#clearanceScore').textContent = `${cleared}/6`;
  document.querySelector('#clearanceText').textContent = allGo ? 'TOUTES STATIONS GO' : `${6 - cleared} GATES RESTANTES`;

  const missionState = document.querySelector('#missionState');
  missionState.className = `mission-state${incidentActive ? ' alarm' : allGo ? ' go' : hasAlarm ? ' alarm' : ''}`;
  missionState.querySelector('span').textContent = incidentActive ? 'MASTER ALARM' : allGo ? 'GO FOR LAUNCH' : hasAlarm ? 'GROUND HOLD' : 'QUALIFICATION';

  const firstPending = gateMeta.find((meta) => gates[meta.key]?.status !== 'CLEARED');
  if (firstPending) {
    document.querySelector('#currentCommand').textContent = firstPending.command;
    currentHintGate = firstPending.number;
    return;
  }

  const deep = state.deepSpace || {};
  const missions = deep.missions || {};
  const active = deepSpaceMeta.find((meta) => missions[meta.code]?.status === 'ACTIVE');
  const available = deepSpaceMeta.find((meta) => missions[meta.code]?.status === 'AVAILABLE');
  const current = active || available;
  if (current) {
    document.querySelector('#currentCommand').textContent = active ? `npm run mission -- check ${current.code}` : `npm run incident -- ${current.code}`;
    currentHintGate = current.code;
  } else {
    document.querySelector('#currentCommand').textContent = 'npm run mission -- status';
  }
}

function renderDirective(state) {
  const directive = state.directive || {};
  document.querySelector('.directive-code').textContent = `DIRECTIVE ${directive.code || '00'}`;
  document.querySelector('#directive strong').textContent = directive.title || 'BASELINE À FAIRE';
  document.querySelector('#directive p').textContent = directive.message || 'Mesurez le système avant toute optimisation.';
}

function renderUplink(state) {
  const uplink = state.uplink || {};
  document.querySelector('#ciWorkflow').textContent = String(uplink.workflow || 'UNKNOWN').toUpperCase();
  document.querySelector('#matrixState').textContent = `${uplink.matrixPassed || 0} / ${uplink.matrixTotal || 5}`;
  document.querySelector('#securityState').textContent = String(uplink.security || 'LOCKED').toUpperCase();
  document.querySelector('#registryState').textContent = String(uplink.registry || 'LOCKED').toUpperCase();
  document.querySelector('#branchName').textContent = String(uplink.branch || 'LOCAL').toUpperCase();
}

function renderAlarm(state) {
  const alarm = document.querySelector('#masterAlarm');
  const incident = state.incident;
  if (!incident?.active) { alarm.hidden = true; return; }
  alarm.hidden = false;
  document.querySelector('#alarmTitle').textContent = incident.title || 'ANOMALIE DÉTECTÉE';
  document.querySelector('#alarmMessage').textContent = incident.message || '';
}

function renderCountdown(state) {
  const total = Number(state.launchWindowSeconds || 10800);
  const started = Date.parse(state.startedAt || new Date().toISOString());
  const elapsed = Math.max(0, Math.floor((Date.now() - started) / 1000));
  const remaining = Math.max(0, total - elapsed);
  const h = String(Math.floor(remaining / 3600)).padStart(2, '0');
  const m = String(Math.floor((remaining % 3600) / 60)).padStart(2, '0');
  const s = String(remaining % 60).padStart(2, '0');
  document.querySelector('#countdown').textContent = `T-${h}:${m}:${s}`;
}

async function refresh() {
  try {
    const response = await fetch('/api/mission', { cache: 'no-store' });
    if (!response.ok) throw new Error('mission link unavailable');
    const payload = await response.json();
    const state = payload.state;
    lastState = state;
    document.querySelector('#vehicle').textContent = payload.vehicle;
    document.querySelector('#missionName').textContent = payload.mission;
    renderSystems(payload.systems);
    renderMetrics(state);
    renderGateBoard(state);
    renderReadiness(state);
    renderDirective(state);
    renderUplink(state);
    renderEvents(payload.events || []);
    renderAlarm(state);
    renderDeepSpace(state);
    renderCountdown(state);
    document.querySelector('#linkState').textContent = 'LIAISON DONNÉES NOMINALE';
  } catch (error) {
    document.querySelector('#linkState').textContent = 'LIAISON DONNÉES PERDUE';
  }
}

async function requestHint() {
  const response = await fetch(`/api/hint?gate=${encodeURIComponent(currentHintGate)}&level=${currentHintLevel}`, { method: 'POST' });
  if (!response.ok) return;
  const payload = await response.json();
  document.querySelector('#hintLevel').textContent = `INDICE ${currentHintLevel}`;
  document.querySelector('#hintTitle').textContent = payload.title || currentHintGate;
  document.querySelector('#hintText').textContent = payload.text || 'Aucun indice disponible.';
  document.querySelector('#hintDialog').showModal();
}

document.querySelector('#hintButton').addEventListener('click', requestHint);
document.querySelector('#nextHint').addEventListener('click', async () => { if (currentHintLevel < 3) currentHintLevel += 1; await requestHint(); });
document.querySelector('#closeHint').addEventListener('click', () => document.querySelector('#hintDialog').close());
document.querySelector('#closeHintBottom').addEventListener('click', () => document.querySelector('#hintDialog').close());
document.querySelector('#dismissAlarm').addEventListener('click', async () => {
  try { await fetch('/api/ack', { method: 'POST' }); } catch {}
  document.querySelector('#masterAlarm').setAttribute('hidden', '');
  await refresh();
});
document.querySelector('#copyCommand').addEventListener('click', async () => {
  const command = document.querySelector('#currentCommand').textContent;
  try {
    await navigator.clipboard.writeText(command);
    document.querySelector('#copyCommand').textContent = 'COPIÉ';
    setTimeout(() => document.querySelector('#copyCommand').textContent = 'COPIER', 1200);
  } catch {}
});

setInterval(() => { document.querySelector('#utcClock').textContent = fmtClock(); if (lastState) renderCountdown(lastState); }, 1000);
setInterval(refresh, 2000);
document.querySelector('#utcClock').textContent = fmtClock();
refresh();
