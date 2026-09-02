const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
let data;
let lastActId = null;
let lastCleared = 0;
let localEvents = [];
let activeFilter = 'all';

const ART_IMG = {
  'AR-001': 'media/artist-neon.jpg',
  'AR-002': 'media/artist-rock.jpg',
  'AR-003': 'media/artist-techno.jpg',
  'AR-004': 'media/artist-indie.jpg',
  'AR-005': 'media/artist-house.jpg',
  'AR-006': 'media/artist-punk.jpg'
};
const STAGE_IMG = {
  'ST-MAIN': 'media/stage-main.jpg',
  'ST-PULSE': 'media/stage-pulse.jpg',
  'ST-CLUB': 'media/stage-club.jpg',
  'ST-LAB': 'media/stage-lab.jpg'
};

const INC_IMG = {
  'FC-101': 'media/stage-main.jpg',
  'FC-102': 'media/artist-neon.jpg',
  'FC-103': 'media/wristband.jpg',
  'FC-104': 'media/night-field.jpg',
  'FC-105': 'media/stage-club.jpg',
  'FC-106': 'media/crowd-hands.jpg',
  'FC-107': 'media/wristband.jpg',
  'FC-108': 'media/hero-stage.jpg',
  'FC-X01': 'media/wristband.jpg',
  'FC-X02': 'media/crowd-hands.jpg',
  'FC-X03': 'media/artist-indie.jpg',
  'FC-X04': 'media/stage-main.jpg',
  'FC-X05': 'media/wristband.jpg',
  'FC-X06': 'media/artist-neon.jpg',
  'FC-X07': 'media/gallery-2.jpg'
};
const LOOK = {
  'FC-101': { view: 'observe', where: 'LINE-UP · Créneaux sensibles', what: 'Main Stage : Neon Fox 18:00–19:00 et Syntax Error 18:30–19:30 se chevauchent.' },
  'FC-102': { view: 'observe', where: 'LINE-UP · Créneaux sensibles', what: 'Neon Fox apparaît sur Main Stage et Pulse Stage en même temps.' },
  'FC-103': { view: 'lab', where: 'FIELD LAB · Contrôle d’accès', what: 'Scanne WB-002 · VIP vers VIP Deck. Le billet TK-002 est CANCELLED.' },
  'FC-104': { view: 'lab', where: 'FIELD LAB · Contrôle d’accès', what: 'Scanne WB-003 · VIP vers Backstage.' },
  'FC-105': { view: 'lab', where: 'STAGE OPS puis Machine d’état', what: 'Club 42 est EVACUATED. Tente la transition vers LIVE.' },
  'FC-106': { view: 'lab', where: 'FIELD LAB · Banc Capacité', what: 'Teste Main Pit juste avant, exactement sur, puis juste après sa capacité maximale.' },
  'FC-107': { view: 'lab', where: 'FIELD LAB · Banc Payload API', what: 'Envoie un niveau inconnu ou un champ surprise et compare au contrat OpenAPI.' },
  'FC-108': { view: 'lab', where: 'FIELD LAB · Programmation + terminal', what: 'Reproduis le conflit dans le Lab, puis contrôle le vrai code HTTP de POST /api/shows depuis le terminal.' },
  'FC-X01': { view: 'lab', where: 'FIELD LAB · Contrôle d’accès', what: 'WB-004 · STANDARD vers General. Le pass est expiré.' },
  'FC-X02': { view: 'lab', where: 'Terminal', what: 'Entrée puis sortie sur General : l’occupation doit revenir.' },
  'FC-X03': { view: 'observe', where: 'LINE-UP · Créneaux sensibles', what: 'Les Holbies sur Lab Stage sont CANCELLED mais encore visibles.' },
  'FC-X04': { view: 'lab', where: 'Terminal', what: 'Reschedule un show vers un créneau déjà pris sur Main Stage.' },
  'FC-X05': { view: 'lab', where: 'Terminal', what: 'Émettre un second bracelet pour TK-001 (WB-001 déjà actif).' },
  'FC-X06': { view: 'lab', where: 'Terminal', what: 'GET /api/artists/AR-001 et compare au YAML.' },
  'FC-X07': { view: 'lab', where: 'Terminal', what: 'DELETE AR-001 (en show) vs AR-999 (inutilisé).' }
};

const fmtTime = iso => new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
const fmtStamp = iso => new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date(iso));

function pushLocal(text) {
  localEvents.unshift({ ts: new Date().toISOString(), type: 'LOCAL', message: text });
  localEvents = localEvents.slice(0, 5);
  renderHistory();
}
async function api(url, options) {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options });
  let body = {};
  try { body = await res.json(); } catch {}
  return { status: res.status, body };
}

function showView(name) {
  $$('.view').forEach(v => {
    const on = v.id === `view-${name}`;
    v.classList.toggle('is-on', on);
    v.hidden = !on;
  });
  $$('.step').forEach(b => b.classList.toggle('is-on', b.dataset.view === name));
  document.documentElement.classList.add('page-lock');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  try { sessionStorage.setItem('hfc-view', name); } catch {}
}

function nextViewForAct(story) {
  const id = story.id;
  if (id === 'ACT-1') return { view: 'observe', label: 'Voir le line-up du soir' };
  if (id === 'ACT-2' || id === 'ACT-4') return { view: 'lab', label: 'Aller au Field Lab' };
  if (id === 'ACT-3') return { view: 'observe', label: 'Voir scènes et zones' };
  return { view: 'missions', label: 'Ouvrir les incidents ENCORE' };
}

function flashGate(ok, title, kicker) {
  const el = $('#gateFlash');
  el.hidden = false;
  el.className = `gate-flash ${ok ? 'ok' : 'bad'}`;
  $('#gateKicker').textContent = kicker;
  $('#gateTitle').textContent = title;
  clearTimeout(flashGate._t);
  flashGate._t = setTimeout(() => { el.hidden = true; }, 1400);
}

function burstConfetti() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const c = document.createElement('canvas');
  c.style.cssText = 'position:fixed;inset:0;z-index:25;pointer-events:none;';
  document.body.appendChild(c);
  const ctx = c.getContext('2d');
  c.width = innerWidth; c.height = innerHeight;
  const bits = Array.from({ length: 70 }, () => ({
    x: Math.random() * c.width, y: -20,
    r: 4 + Math.random() * 5, vx: -1 + Math.random() * 2, vy: 3 + Math.random() * 3,
    color: ['#ff4f93', '#5eead4', '#f0c14b', '#4ade80'][Math.floor(Math.random() * 4)]
  }));
  let n = 0;
  (function frame() {
    ctx.clearRect(0, 0, c.width, c.height);
    bits.forEach(b => { b.x += b.vx; b.y += b.vy; ctx.fillStyle = b.color; ctx.fillRect(b.x, b.y, b.r, b.r * 1.4); });
    if (++n < 60) requestAnimationFrame(frame); else c.remove();
  })();
}

function renderStory() {
  const s = data.story;
  $('#actNumber').textContent = s.number;
  $('#actTime').textContent = s.time;
  $('#actTitle').textContent = s.title;
  $('#radioSource').textContent = s.radio;
  $('#radioMessage').textContent = s.message;
  $('#actObjective').textContent = s.objective;
  $('#rank').textContent = s.score.rank;
  $('#xp').textContent = `${s.score.xp} XP`;
  $('#xpMax').textContent = `/ ${s.score.maxXp}`;
  $('#xpFill').style.width = `${Math.min(100, Math.round(s.score.xp / s.score.maxXp * 100))}%`;
  $('#clock').textContent = s.countdown;
  $('#clockLabel').textContent = s.gatesCleared ? 'Statut' : 'Ouverture';
  $('#liveState').textContent = s.gatesCleared ? 'Festival live' : 'Briefing';
  $('#campaignStatus').textContent = s.gatesCleared ? (s.encoreStatus === 'CLEARED' ? 'PERFECT RUN' : 'ENCORE ACTIVE') : 'CAMPAGNE ACTIVE';
  $('#badges').innerHTML = s.badges.length
    ? s.badges.map(b => `<span class="badge">${b.label}</span>`).join('')
    : '<span class="empty-badge">Aucun badge pour l’instant</span>';
  $('#actTrack').innerHTML = [...s.acts, { id: 'ENCORE', number: 'ENCORE', title: 'AFTER HOURS', status: s.encoreStatus }]
    .map(a => `<div class="act-node ${a.status.toLowerCase()}"><small>${a.number}</small><strong>${a.title}</strong></div>`)
    .join('');
  const next = nextViewForAct(s);
  const btn = $('#nextAction');
  btn.textContent = next.label;
  btn.onclick = () => showView(next.view);
  const startIntro = $('#startIntro');
  if (startIntro) {
    const first = (s.ids && s.ids[0]) || 'FC-101';
    startIntro.innerHTML = `Les bugs du line-up se voient sur <b>Le site</b> (badges rouges). Quand tu corriges le code, le site se met à jour tout seul. Les bracelets se testent au Field Lab. Checker : <code>npm run check -- ${first}</code>.`;
  }
  const hint = $('#observeHint');
  if (hint) {
    if (s.id === 'ACT-1') hint.textContent = 'Cherche les badges rouges : deux concerts sur Main Stage au même moment, et Neon Fox sur deux scènes. Si tu corriges, les badges disparaissent.';
    else if (s.id === 'ACT-2') hint.textContent = 'Cet acte se teste au Field Lab (scanner). Ici, scènes et zones restent visibles en live.';
    else if (s.id === 'ACT-3') hint.textContent = 'STAGE OPS : Club 42 EVACUATED. ZONES : Main Pit presque plein. Après correction, les alertes changent.';
    else hint.textContent = 'Les anomalies visibles ont un badge. Le reste se teste au Field Lab ou dans le terminal.';
  }
  const recipe = $('#labRecipe');
  if (recipe) {
    if (s.id === 'ACT-1') recipe.innerHTML = '<b>À tester maintenant :</b> ouvre le banc Programmation et tente Neon Fox ou Syntax Error sur un créneau déjà occupé.';
    else if (s.id === 'ACT-2') recipe.innerHTML = '<b>À tester maintenant :</b> banc Accès → WB-002 vers VIP Deck, puis WB-003 vers Backstage.';
    else if (s.id === 'ACT-3') recipe.innerHTML = '<b>À tester maintenant :</b> banc Scène → Club 42 vers LIVE, puis banc Capacité → Main Pit à la limite exacte.';
    else if (s.id === 'ACT-4') recipe.innerHTML = '<b>À tester maintenant :</b> banc Payload API pour le contrat d’entrée ; banc Programmation pour reproduire un conflit, puis terminal pour vérifier le vrai code HTTP de POST /api/shows.';
    else recipe.innerHTML = '<b>ENCORE :</b> le Lab couvre aussi le pass expiré, les doubles bracelets et les reschedules ; certains bonus restent volontairement à investiguer au terminal.';
  }
  if (lastActId && lastActId !== s.id) pushLocal(`NOUVEL ACTE DÉVERROUILLÉ · ${s.title}`);
  lastActId = s.id;
}

function renderCurrentMissions() {
  const box = $('#currentMissions');
  if (!box) return;
  const ids = data.story.ids || [];
  const list = data.incidents.filter(i => ids.includes(i.id));
  box.innerHTML = list.map(i => {
    const look = LOOK[i.id] || {};
    const locked = !i.unlocked;
    return `<article class="mission ${i.status === 'CLEARED' ? 'cleared' : ''}">
      <header><span class="mission-id">${i.id}</span><span>${i.points} XP</span></header>
      <h4>${locked ? 'Verrouillé' : i.title}</h4>
      <p>${look.what || ''}</p>
      <div class="state">${i.status === 'CLEARED' ? '✓ Corrigé — visible sur le site' : '● À voir sur le site / Field Lab'}</div>
      <button type="button" class="ghost" data-view="${look.view || 'missions'}">${look.view === 'lab' ? 'Tester au Field Lab' : look.view === 'observe' ? 'Voir le bug sur le site' : 'Voir le board'}</button>
    </article>`;
  }).join('');
  box.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => showView(b.dataset.view)));
}

function renderHistory() {
  if (!data) return;
  const persisted = (data.history || []).slice().reverse().slice(0, 8).map(e => ({
    ts: e.ts, type: e.type, message: e.message || `${e.id || ''} ${e.type}`
  }));
  const items = [...localEvents, ...persisted].sort((a, b) => new Date(b.ts) - new Date(a.ts)).slice(0, 3);
  $('#history').innerHTML = items.length
    ? items.map(e => `<div class="history-line"><time>${fmtStamp(e.ts)}</time><span class="history-dot ${String(e.type).toLowerCase()}"></span><p>${e.message}</p></div>`).join('')
    : '<div class="history-empty">Aucune action encore. Lance ton premier checker.</div>';
}

function timesOverlap(a, b) {
  return new Date(a.start) < new Date(b.end) && new Date(b.start) < new Date(a.end);
}

function flagMap(lineup) {
  const map = Object.fromEntries(lineup.map(s => [s.id, []]));
  for (let i = 0; i < lineup.length; i++) {
    for (let j = i + 1; j < lineup.length; j++) {
      const a = lineup[i], b = lineup[j];
      if (!timesOverlap(a, b)) continue;
      if (a.stageId === b.stageId) {
        map[a.id].push('stage');
        map[b.id].push('stage');
      }
      if (a.artistId === b.artistId) {
        map[a.id].push('artist');
        map[b.id].push('artist');
      }
    }
  }
  lineup.forEach(s => { if (s.status === 'CANCELLED') map[s.id].push('cancelled'); });
  return map;
}

function flagLabel(kind) {
  if (kind === 'stage') return 'CONFLIT';
  if (kind === 'artist') return '2 SCÈNES';
  if (kind === 'cancelled') return 'ANNULÉ';
  return kind;
}

function renderLiveFlags() {
  const box = $('#liveFlags');
  if (!box) return;
  const lineup = data.lineup || [];
  const flags = flagMap(lineup);
  const notes = [];
  if (lineup.some(s => flags[s.id].includes('stage'))) notes.push('Deux concerts se chevauchent sur la même scène');
  if (lineup.some(s => flags[s.id].includes('artist'))) notes.push('Un artiste est collé sur deux scènes en même temps');
  if (lineup.some(s => s.status === 'CANCELLED')) notes.push('Un show CANCELLED est encore affiché au public');
  const club = data.stages.find(s => s.id === 'ST-CLUB');
  if (club?.status === 'EVACUATED') notes.push('Club 42 est EVACUATED');
  const pit = data.zones.find(z => z.id === 'ZN-PIT');
  if (pit && pit.occupancy / pit.capacity >= 0.95) notes.push(`Main Pit presque plein (${pit.occupancy}/${pit.capacity})`);
  box.innerHTML = notes.length
    ? `<strong>Visible maintenant</strong> ${notes.map(n => `<span>${n}</span>`).join('')}<small>Quand tu corriges le code, cette bande se met à jour toute seule.</small>`
    : '<strong class="ok">Rien d’anormal sur le site</strong> <span>Les badges ont disparu — le live suit tes corrections.</span>';
  box.className = `live-flags ${notes.length ? 'hot' : 'ok'}`;
}

function explainAccess(status, body) {
  if (status < 300 && body.allowed) return `Elle ENTRE${body.owner ? ` (${body.owner})` : ''}. Code ${body.code || 'ACCESS_GRANTED'}.`;
  const why = {
    TICKET_CANCELLED: 'Le billet lié est annulé.',
    LEVEL_FORBIDDEN: 'Ce bracelet n’a pas le bon niveau pour cette zone.',
    ZONE_FULL: 'La zone est pleine.',
    WRISTBAND_INVALID: 'Bracelet invalide ou inactif.',
    TICKET_EXPIRED: 'Le pass est expiré.',
    TICKET_NOT_FOUND: 'Aucun billet lié.'
  };
  return `Elle est REFUSÉE. ${why[body.code] || body.code || body.error || `HTTP ${status}`}`;
}

function explainStage(status, body) {
  const result = body.result || body;
  if (status < 300 && result.ok) return `Changement ACCEPTÉ. ${result.from || ''} → ${result.to || result.status || ''}`.trim();
  return `Changement REFUSÉ. ${result.code || body.code || body.error || `HTTP ${status}`}`;
}

function explainCapacity(status, body) {
  const before = body.before || {};
  const after = body.after || {};
  const entered = body.result?.allowed;
  if (entered) return `ENTRÉE ACCEPTÉE · ${before.occupancy}/${before.capacity} → ${after.occupancy}/${after.capacity}`;
  return `ENTRÉE REFUSÉE · ${before.occupancy}/${before.capacity} · ${body.result?.code || body.error || `HTTP ${status}`}`;
}

function explainSchedule(status, body) {
  const result = body.result || {};
  const stageHits = body.context?.stageWindow?.length || 0;
  const artistHits = body.context?.artistWindow?.length || 0;
  if (result.ok) return `PROGRAMMATION ACCEPTÉE · ${stageHits} show(s) sur la scène et ${artistHits} show(s) du même artiste croisent cette fenêtre.`;
  return `PROGRAMMATION REFUSÉE · ${result.code || body.error || `HTTP ${status}`}`;
}

function explainPayload(status, body) {
  const result = body.result || {};
  if (result.ok) return `PAYLOAD ACCEPTÉ · bracelet ${result.wristband?.id || ''} créé dans le dry-run.`;
  return `PAYLOAD REFUSÉ · ${result.code || body.error || `HTTP ${status}`}`;
}

function festivalIso(value) {
  if (!value) return value;
  return value.length === 16 ? `${value}:00+02:00` : value;
}

function setLabTool(name) {
  $$('.lab-tool').forEach(b => b.classList.toggle('is-on', b.dataset.labTool === name));
  $$('.lab-station').forEach(station => {
    const on = station.dataset.labStation === name;
    station.classList.toggle('is-on', on);
    station.hidden = !on;
  });
}

function renderZones() {
  const board = $('#zoneBoard');
  if (board) {
    board.innerHTML = data.zones.map(z => {
      const pct = Math.min(100, Math.round(z.occupancy / z.capacity * 100));
      return `<article class="zone-row">
        <strong>${z.name}</strong>
        <small>${z.requiredLevels.join(' · ')}</small>
        <span>${z.occupancy.toLocaleString('fr-FR')} / ${z.capacity.toLocaleString('fr-FR')}</span>
        <div class="occ ${pct >= 95 ? 'hot' : ''}"><i style="width:${pct}%"></i></div>
      </article>`;
    }).join('');
  }
  const lab = $('#labZones');
  if (lab) {
    lab.innerHTML = data.zones.map(z => {
      const pct = Math.min(100, Math.round(z.occupancy / z.capacity * 100));
      return `<article class="lab-zone ${pct >= 95 ? 'hot' : ''}">
        <strong>${z.name}</strong>
        <span>${z.occupancy.toLocaleString('fr-FR')} / ${z.capacity.toLocaleString('fr-FR')}</span>
        <div class="occ ${pct >= 95 ? 'hot' : ''}"><i style="width:${pct}%"></i></div>
      </article>`;
    }).join('');
  }
}

function render() {
  renderStory();
  $('#readiness').textContent = `${data.readiness}%`;
  $('#readinessText').textContent = `${data.clearedMandatory} / ${data.totalMandatory} obligatoires cleared`;
  $('#meterFill').style.width = `${data.readiness}%`;
  $('#stageCount').textContent = data.stages.length;
  $('#runScore').textContent = `${data.story.score.mandatory + data.story.score.bonus}/15`;

  $('#stages').innerHTML = data.stages.map(s => `<article class="stage ${s.status}">
    <img src="${STAGE_IMG[s.id] || 'media/hero-stage.jpg'}" alt="">
    <div class="stage-copy">
      <span class="status ${s.status}">${s.status}</span>
      <strong>${s.name}</strong>
      <small>Capacité ${s.capacity.toLocaleString('fr-FR')}</small>
    </div>
  </article>`).join('');

  const flags = flagMap(data.lineup);
  $('#lineup').innerHTML = data.lineup.slice().sort((a, b) => new Date(a.start) - new Date(b.start)).map(s => {
    const a = data.artists.find(x => x.id === s.artistId);
    const st = data.stages.find(x => x.id === s.stageId);
    const marks = [...new Set(flags[s.id] || [])];
    const hot = marks.length ? ' conflict' : '';
    const badges = marks.map(k => `<em class="flag flag-${k}">${flagLabel(k)}</em>`).join('');
    return `<article class="show ${s.status === 'CANCELLED' ? 'cancelled' : ''}${hot}">
      <img src="${ART_IMG[s.artistId] || 'media/hero-stage.jpg'}" alt="">
      <time>${fmtTime(s.start)}</time>
      <div class="poster-copy">
        <strong>${a?.name || s.artistId}</strong>
        <small>${st?.name || s.stageId} · ${fmtTime(s.end)}</small>
        ${badges}
      </div>
      <span class="show-status">${s.status}</span>
    </article>`;
  }).join('');
  renderLiveFlags();

  $('#incidentGrid').innerHTML = data.incidents.map(i => {
    const locked = !i.unlocked;
    const look = LOOK[i.id] || {};
    return `<article class="incident ${i.status === 'CLEARED' ? 'cleared' : ''} ${locked ? 'locked' : ''}" data-kind="${i.kind}">
      <div class="incident-top"><span class="incident-id">${i.id}</span><span class="incident-kind">${i.kind === 'mandatory' ? 'ACTE ' + i.act : 'ENCORE'} · ${i.points} XP</span></div>
      <h3>${locked ? 'SIGNAL VERROUILLÉ' : i.title}</h3>
      <p>${locked ? 'Termine l’acte précédent pour ouvrir ce canal.' : i.status === 'CLEARED' ? 'Incident documenté et validé.' : (look.what || 'Voir le PDF et working/docs/incidents.md.') + (look.where ? ' · ' + look.where : '')}</p>
      <span class="state">${locked ? '◌ LOCKED' : i.status === 'CLEARED' ? '✓ CLEARED' : '● OPEN'}</span>
      <img class="incident-photo" src="${INC_IMG[i.id] || 'media/hero-stage.jpg'}" alt="">
    </article>`;
  }).join('');
  applyFilter();
  renderCurrentMissions();

  fillSelect('#wristband', data.wristbands, w => `${w.id} · ${w.level}`, w => w.id);
  fillSelect('#zone', data.zones, z => `${z.name} (${z.occupancy}/${z.capacity})`, z => z.id);
  fillSelect('#stageSelect', data.stages, s => `${s.name} · ${s.status}`, s => s.id);
  fillSelect('#capacityZone', data.zones, z => `${z.name} · max ${z.capacity}`, z => z.id);
  fillSelect('#capacityWristband', data.wristbands, w => `${w.id} · ${w.level}`, w => w.id);
  fillSelect('#scheduleArtist', data.artists, a => `${a.name} · ${a.id}`, a => a.id);
  fillSelect('#scheduleStage', data.stages, st => `${st.name} · ${st.status}`, st => st.id);
  if (!$('#capacityZone').dataset.initialized) {
    $('#capacityZone').value = 'ZN-PIT';
    $('#capacityWristband').value = 'WB-001';
    $('#capacityOccupancy').value = data.zones.find(z => z.id === 'ZN-PIT')?.capacity || 5000;
    $('#capacityZone').dataset.initialized = '1';
  }
  if (!$('#scheduleArtist').dataset.initialized) {
    $('#scheduleArtist').value = 'AR-001';
    $('#scheduleStage').value = 'ST-MAIN';
    $('#scheduleArtist').dataset.initialized = '1';
  }
  renderZones();
  renderHistory();

  const clearedNow = data.story.score.mandatory + data.story.score.bonus;
  if (lastCleared && clearedNow > lastCleared) burstConfetti();
  lastCleared = clearedNow;
}

function applyFilter() {
  $$('.incident').forEach(card => card.classList.toggle('hidden', activeFilter !== 'all' && card.dataset.kind !== activeFilter));
}
function fillSelect(sel, items, label, value) {
  const el = $(sel);
  const old = el.value;
  el.innerHTML = items.map(x => `<option value="${value(x)}">${label(x)}</option>`).join('');
  if ([...el.options].some(o => o.value === old)) el.value = old;
}
async function refresh() {
  const r = await api('/api/dashboard');
  data = r.body;
  render();
}

$$('.lab-tool').forEach(button => button.addEventListener('click', () => setLabTool(button.dataset.labTool)));
setLabTool('access');

$('#accessForm').addEventListener('submit', async e => {
  e.preventDefault();
  const r = await api('/api/lab/access', {
    method: 'POST',
    body: JSON.stringify({ wristbandId: $('#wristband').value, zoneId: $('#zone').value })
  });
  const out = $('#accessResult');
  out.textContent = `HTTP ${r.status} · DRY RUN\n${JSON.stringify(r.body, null, 2)}`;
  out.className = `result ${r.status < 300 && r.body.allowed ? 'ok' : 'bad'}`;
  const verdict = $('#accessVerdict');
  verdict.textContent = explainAccess(r.status, r.body);
  verdict.className = `verdict ${r.status < 300 && r.body.allowed ? 'ok' : 'bad'}`;
  flashGate(r.status < 300 && r.body.allowed, r.status < 300 && r.body.allowed ? 'ACCESS GRANTED' : 'ACCESS DENIED', `${$('#wristband').value} → ${$('#zone').value}`);
  pushLocal(`LAB ACCESS ${$('#wristband').value} → ${$('#zone').value} · HTTP ${r.status}`);
});

$('#stageForm').addEventListener('submit', async e => {
  e.preventDefault();
  const id = $('#stageSelect').value;
  const r = await api('/api/lab/stage', {
    method: 'POST',
    body: JSON.stringify({ stageId:id, nextStatus: $('#nextStatus').value })
  });
  const out = $('#stageResult');
  out.textContent = `HTTP ${r.status} · DRY RUN\n${JSON.stringify(r.body, null, 2)}`;
  out.className = `result ${r.status < 300 ? 'ok' : 'bad'}`;
  const verdict = $('#stageVerdict');
  verdict.textContent = explainStage(r.status, r.body);
  verdict.className = `verdict ${r.status < 300 ? 'ok' : 'bad'}`;
  pushLocal(`LAB STAGE ${id} → ${$('#nextStatus').value} · HTTP ${r.status}`);
});

$('#capacityZone').addEventListener('change', () => {
  const zone = data.zones.find(z => z.id === $('#capacityZone').value);
  if (zone) $('#capacityOccupancy').value = zone.capacity;
});
$$('[data-capacity-preset]').forEach(button => button.addEventListener('click', () => {
  const zone = data.zones.find(z => z.id === $('#capacityZone').value);
  if (!zone) return;
  const offset = button.dataset.capacityPreset === 'below' ? -1 : button.dataset.capacityPreset === 'above' ? 1 : 0;
  $('#capacityOccupancy').value = Math.max(0, zone.capacity + offset);
}));
$('#capacityForm').addEventListener('submit', async e => {
  e.preventDefault();
  const r = await api('/api/lab/capacity', {
    method:'POST',
    body:JSON.stringify({zoneId:$('#capacityZone').value,wristbandId:$('#capacityWristband').value,occupancy:Number($('#capacityOccupancy').value)})
  });
  $('#capacityResult').textContent = `HTTP ${r.status} · DRY RUN\n${JSON.stringify(r.body, null, 2)}`;
  $('#capacityResult').className = `result ${r.status < 300 ? 'ok' : 'bad'}`;
  $('#capacityVerdict').textContent = explainCapacity(r.status,r.body);
  $('#capacityVerdict').className = `verdict ${r.status < 300 ? 'ok' : 'bad'}`;
  pushLocal(`LAB CAPACITY ${$('#capacityZone').value} @ ${$('#capacityOccupancy').value} · HTTP ${r.status}`);
});

$('#scheduleForm').addEventListener('submit', async e => {
  e.preventDefault();
  const r = await api('/api/lab/schedule', {
    method:'POST',
    body:JSON.stringify({artistId:$('#scheduleArtist').value,stageId:$('#scheduleStage').value,start:festivalIso($('#scheduleStart').value),end:festivalIso($('#scheduleEnd').value)})
  });
  $('#scheduleResult').textContent = `HTTP ${r.status} · DRY RUN\n${JSON.stringify(r.body, null, 2)}`;
  $('#scheduleResult').className = `result ${r.status < 300 ? 'ok' : 'bad'}`;
  $('#scheduleVerdict').textContent = explainSchedule(r.status,r.body);
  $('#scheduleVerdict').className = `verdict ${r.status < 300 ? 'ok' : 'bad'}`;
  pushLocal(`LAB SCHEDULE ${$('#scheduleArtist').value} @ ${$('#scheduleStage').value} · HTTP ${r.status}`);
});

const PAYLOAD_PRESETS = {
  valid:{id:'WB-777',ticketId:'TK-001',level:'STANDARD'},
  level:{id:'WB-777',ticketId:'TK-001',level:'GODMODE'},
  extra:{id:'WB-777',ticketId:'TK-001',level:'STANDARD',admin:true}
};
$$('[data-payload-preset]').forEach(button => button.addEventListener('click', () => {
  $('#payloadJson').value = JSON.stringify(PAYLOAD_PRESETS[button.dataset.payloadPreset], null, 2);
}));
$('#payloadForm').addEventListener('submit', async e => {
  e.preventDefault();
  let payload;
  try { payload = JSON.parse($('#payloadJson').value); }
  catch {
    $('#payloadVerdict').textContent = 'JSON INVALIDE · corrige la syntaxe avant l’envoi.';
    $('#payloadVerdict').className = 'verdict bad';
    $('#payloadResult').textContent = 'Le navigateur n’a pas envoyé la requête : JSON.parse a échoué.';
    $('#payloadResult').className = 'result bad';
    return;
  }
  const r = await api('/api/lab/wristband-payload', {method:'POST',body:JSON.stringify({payload})});
  $('#payloadResult').textContent = `HTTP ${r.status} · DRY RUN\n${JSON.stringify(r.body, null, 2)}`;
  $('#payloadResult').className = `result ${r.status < 300 ? 'ok' : 'bad'}`;
  $('#payloadVerdict').textContent = explainPayload(r.status,r.body);
  $('#payloadVerdict').className = `verdict ${r.status < 300 ? 'ok' : 'bad'}`;
  pushLocal(`LAB PAYLOAD ${payload.id || '?'} · HTTP ${r.status}`);
});

$$('.filter').forEach(b => b.addEventListener('click', () => {
  $$('.filter').forEach(x => x.classList.remove('active'));
  b.classList.add('active');
  activeFilter = b.dataset.kind;
  applyFilter();
}));

$$('[data-view]').forEach(el => {
  if (el.id === 'nextAction') return;
  el.addEventListener('click', () => showView(el.dataset.view));
});

const hashView = { '#lab': 'lab', '#incidents': 'missions', '#campaign': 'start', '#timeline': 'start' };
if (hashView[location.hash]) showView(hashView[location.hash]);
else {
  try {
    const saved = sessionStorage.getItem('hfc-view');
    if (saved) showView(saved);
    else showView('start');
  } catch { showView('start'); }
}

const video = $('#heroVideo');
if (video) {
  const reveal = () => {
    video.classList.add('is-on');
    const fb = document.querySelector('.hero-fallback');
    if (fb) fb.classList.add('is-off');
  };
  if (video.readyState >= 3) reveal();
  video.addEventListener('canplay', reveal, { once: true });
  video.addEventListener('playing', reveal);
  video.play?.().catch(() => {});
}

refresh().then(() => pushLocal('CONTROL ROOM CONNECTÉE · documentation = source de vérité'));
setInterval(refresh, 4000);
