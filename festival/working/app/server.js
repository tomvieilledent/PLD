const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { URL } = require('node:url');
const { createState } = require('./domain/state');
const schedule = require('./domain/scheduleService');
const access = require('./domain/accessService');
const stage = require('./domain/stageService');

const PUBLIC = path.join(__dirname, 'public');
const STATUS_FILE = path.join(__dirname, '..', '..', 'private', 'runtime', 'check-status.json');
let state = createState();


const STORY_ACTS = [
  {
    id:'ACT-1', number:'ACTE 1 / 4', time:'10:00', countdown:'T-03:00', title:'SOUNDCHECK IMPOSSIBLE',
    radio:'RÉGIE PROGRAMMATION', ids:['FC-101','FC-102'],
    message:'Le soundcheck démarre. Deux alertes apparaissent sur le planning : une scène est réservée deux fois et un artiste semble capable de jouer à deux endroits en même temps.',
    objective:'Stabiliser le line-up avant que les équipes techniques commencent les balances.'
  },
  {
    id:'ACT-2', number:'ACTE 2 / 4', time:'11:05', countdown:'T-01:55', title:'LES PORTES S’ENTROUVRENT',
    radio:'SÉCURITÉ / ACCRÉDITATIONS', ids:['FC-103','FC-104'],
    message:'Les premiers prestataires entrent sur site. Un bracelet lié à un billet annulé passe le contrôle et un profil VIP ouvre une zone réservée aux artistes.',
    objective:'Rétablir la chaîne de confiance Ticket → Bracelet → Zone avant l’arrivée du public.'
  },
  {
    id:'ACT-3', number:'ACTE 3 / 4', time:'12:10', countdown:'T-00:50', title:'LA FOULE MONTE',
    radio:'STAGE MANAGER', ids:['FC-105','FC-106'],
    message:'Club 42 est encore en procédure d’évacuation pendant que le Main Pit approche de sa capacité maximale. Les règles de sécurité ne pardonnent plus aucune approximation.',
    objective:'Empêcher les transitions dangereuses et verrouiller correctement les limites de capacité.'
  },
  {
    id:'ACT-4', number:'ACTE 4 / 4', time:'12:42', countdown:'T-00:18', title:'LE SYSTÈME MENT',
    radio:'API / INTÉGRATION', ids:['FC-107','FC-108'],
    message:'Les terminaux partenaires remontent des réponses incohérentes. Des données non prévues passent la validation et les codes HTTP ne racontent plus ce qui se passe réellement.',
    objective:'Remettre le contrat API au centre avant le feu vert final.'
  }
];
const ENCORE = {
  id:'ENCORE', number:'MODE ENCORE', time:'14:00+', countdown:'GATES OPEN', title:'APRÈS L’OUVERTURE, RIEN N’EST FINI',
  radio:'CONTROL ROOM', ids:['FC-X01','FC-X02','FC-X03','FC-X04','FC-X05','FC-X06','FC-X07'],
  message:'Les portes sont ouvertes. Le festival peut fonctionner, mais la Control Room détecte sept anomalies plus discrètes. Elles ne bloquent pas l’ouverture — elles séparent une plateforme fonctionnelle d’une plateforme vraiment robuste.',
  objective:'Traquer les incidents bonus et viser le run parfait 15 / 15.'
};
const ALL_MANDATORY = STORY_ACTS.flatMap(a=>a.ids);
const ALL_BONUS = ENCORE.ids;


function json(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, { 'Content-Type':'application/json; charset=utf-8', 'Content-Length':Buffer.byteLength(body) });
  res.end(body);
}

async function readJson(req) {
  const chunks=[];
  for await (const c of req) chunks.push(c);
  if (!chunks.length) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { return null; }
}

function getStatuses() {
  try { return JSON.parse(fs.readFileSync(STATUS_FILE, 'utf8')); }
  catch { return {}; }
}

function cloneFestivalState() {
  return structuredClone(state);
}

function labScheduleContext(tempState, show) {
  const stageWindow = tempState.shows.filter(existing =>
    existing.stageId === show.stageId && schedule.overlaps(existing.start, existing.end, show.start, show.end)
  );
  const artistWindow = tempState.shows.filter(existing =>
    existing.artistId === show.artistId && schedule.overlaps(existing.start, existing.end, show.start, show.end)
  );
  return { stageWindow, artistWindow };
}

function serveStatic(req, res, pathname) {
  const file = pathname === '/' ? 'index.html' : pathname.replace(/^\//,'');
  const full = path.normalize(path.join(PUBLIC, file));
  if (!full.startsWith(PUBLIC) || !fs.existsSync(full) || fs.statSync(full).isDirectory()) return false;
  const ext = path.extname(full).toLowerCase();
  const types = {
    '.html':'text/html; charset=utf-8',
    '.css':'text/css; charset=utf-8',
    '.js':'text/javascript; charset=utf-8',
    '.mjs':'text/javascript; charset=utf-8',
    '.svg':'image/svg+xml',
    '.png':'image/png',
    '.jpg':'image/jpeg',
    '.jpeg':'image/jpeg',
    '.webp':'image/webp',
    '.gif':'image/gif',
    '.mp4':'video/mp4',
    '.webm':'video/webm',
    '.json':'application/json; charset=utf-8',
    '.woff2':'font/woff2'
  };
  const type = types[ext] || 'application/octet-stream';
  const stat = fs.statSync(full);
  const range = req.headers.range;
  if (range) {
    const m = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (m) {
      const start = m[1] ? Number(m[1]) : 0;
      const end = m[2] ? Number(m[2]) : stat.size - 1;
      if (start > end || start >= stat.size || Number.isNaN(start) || Number.isNaN(end)) {
        res.writeHead(416, { 'Content-Range': `bytes */${stat.size}` });
        res.end();
        return true;
      }
      res.writeHead(206, {
        'Content-Type': type,
        'Content-Range': `bytes ${start}-${end}/${stat.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': (end - start) + 1
      });
      fs.createReadStream(full, { start, end }).pipe(res);
      return true;
    }
  }
  res.writeHead(200, {
    'Content-Type': type,
    'Content-Length': stat.size,
    'Accept-Ranges': 'bytes'
  });
  fs.createReadStream(full).pipe(res);
  return true;
}


function getHistory() {
  const historyFile = path.join(__dirname, '..', '..', 'private', 'runtime', 'story-history.json');
  try { return JSON.parse(fs.readFileSync(historyFile, 'utf8')); }
  catch { return []; }
}
function scoreAndRank(statuses) {
  const mandatory = ALL_MANDATORY.filter(id=>statuses[id]?.status==='CLEARED').length;
  const bonus = ALL_BONUS.filter(id=>statuses[id]?.status==='CLEARED').length;
  const xp = mandatory * 100 + bonus * 150;
  let rank = 'RUNNER TECH';
  if (xp >= 200) rank = 'RÉGIE JUNIOR';
  if (xp >= 500) rank = 'OPS ENGINEER';
  if (xp >= 800) rank = 'FESTIVAL ARCHITECT';
  if (xp >= 1400) rank = 'ENCORE LEGEND';
  return {xp, maxXp:1850, rank, mandatory, bonus};
}
function storyState(statuses) {
  const cleared = id => statuses[id]?.status === 'CLEARED';
  let currentIndex = STORY_ACTS.findIndex(a=>!a.ids.every(cleared));
  const gatesCleared = currentIndex === -1;
  if (gatesCleared) currentIndex = STORY_ACTS.length;
  const current = gatesCleared ? ENCORE : STORY_ACTS[currentIndex];
  const unlockedIds = gatesCleared
    ? [...ALL_MANDATORY, ...ALL_BONUS]
    : STORY_ACTS.slice(0,currentIndex+1).flatMap(a=>a.ids);
  const badges = STORY_ACTS
    .filter(a=>a.ids.every(cleared))
    .map((a,i)=>({id:a.id,label:['LINE-UP STABLE','ACCESS LOCKED','SAFETY FIRST','CONTRACT CLEAN'][i]}));
  if (gatesCleared) badges.push({id:'GATES',label:'GATES CLEARED'});
  if (ALL_BONUS.every(cleared)) badges.push({id:'PERFECT',label:'PERFECT RUN 15/15'});
  return {
    ...current,
    gatesCleared,
    unlockedIds,
    badges,
    score:scoreAndRank(statuses),
    acts:STORY_ACTS.map((a,index)=>({
      id:a.id, title:a.title, number:a.number,
      status:a.ids.every(cleared)?'CLEARED':(index===currentIndex&&!gatesCleared?'ACTIVE':'LOCKED'),
      ids:a.ids
    })),
    encoreStatus:gatesCleared?(ALL_BONUS.every(cleared)?'CLEARED':'ACTIVE'):'LOCKED'
  };
}


function incidentMeta(statuses) {
  const defs = [
    ['FC-101','Collision de scène','mandatory',1],['FC-102','Artiste ubiquitaire','mandatory',1],
    ['FC-103','Bracelet fantôme','mandatory',2],['FC-104','Backstage breach','mandatory',2],
    ['FC-105','Scène morte','mandatory',3],['FC-106','Une personne de trop','mandatory',3],
    ['FC-107','Payload sauvage','mandatory',4],['FC-108','Mauvais signal HTTP','mandatory',4],
    ['FC-X01','Pass expiré','bonus',5],['FC-X02','Zone qui ne se vide jamais','bonus',5],
    ['FC-X03','Concert annulé toujours visible','bonus',5],['FC-X04','Reschedule non atomique','bonus',5],
    ['FC-X05','Double bracelet','bonus',5],['FC-X06','Dérive sémantique API','bonus',5],
    ['FC-X07','Artiste orphelin','bonus',5]
  ];
  const story = storyState(statuses);
  return defs.map(([id,title,kind,act]) => ({
    id,title,kind,act,
    points:kind==='mandatory'?100:150,
    status:statuses[id]?.status || 'OPEN',
    attempts:statuses[id]?.attempts || 0,
    unlocked:story.unlockedIds.includes(id)
  }));
}

function dashboard() {
  const statuses = getStatuses();
  const incidents = incidentMeta(statuses);
  const mandatory = incidents.filter(i=>i.kind==='mandatory');
  const cleared = mandatory.filter(i=>i.status==='CLEARED').length;
  return {
    festival: state.festival,
    readiness: Math.round((cleared/mandatory.length)*100),
    clearedMandatory: cleared,
    totalMandatory: mandatory.length,
    incidents,
    story: storyState(statuses),
    history: getHistory(),
    stages: state.stages,
    zones: state.zones,
    shows: state.shows,
    lineup: schedule.getPublicLineup(state),
    artists: state.artists,
    tickets: state.tickets,
    wristbands: state.wristbands
  };
}

function createFestivalServer() {
  return http.createServer(async (req,res) => {
    const u = new URL(req.url, 'http://localhost');
    const p = u.pathname;
    if (req.method==='GET' && p==='/api/health') return json(res,200,{status:'ok'});
    if (req.method==='GET' && p==='/api/dashboard') return json(res,200,dashboard());
    if (req.method==='GET' && p==='/api/lineup') return json(res,200,schedule.getPublicLineup(state));

    // FIELD LAB : bancs d'essai en dry-run. Ils exécutent la vraie logique métier
    // sur une copie temporaire afin de reproduire un symptôme sans polluer la campagne.
    if (req.method==='POST' && p==='/api/lab/access') {
      const body=await readJson(req); if(body===null) return json(res,400,{error:'INVALID_JSON'});
      const temp=cloneFestivalState();
      const result=access.checkAccess(temp,body.wristbandId,body.zoneId,new Date(body.now || '2026-09-02T17:00:00+02:00'));
      return json(res,result.allowed?200:403,{dryRun:true,...result});
    }
    if (req.method==='POST' && p==='/api/lab/stage') {
      const body=await readJson(req); if(body===null) return json(res,400,{error:'INVALID_JSON'});
      const temp=cloneFestivalState();
      const before=temp.stages.find(s=>s.id===body.stageId);
      const result=stage.transitionStage(temp,body.stageId,body.nextStatus);
      return json(res,result.ok?200:409,{dryRun:true,before:before?{id:before.id,name:before.name,status:result.ok?result.from:before.status}:null,result});
    }
    if (req.method==='POST' && p==='/api/lab/capacity') {
      const body=await readJson(req); if(body===null) return json(res,400,{error:'INVALID_JSON'});
      const temp=cloneFestivalState();
      const zone=temp.zones.find(z=>z.id===body.zoneId);
      const occupancy=Number(body.occupancy);
      if (!zone) return json(res,404,{error:'ZONE_NOT_FOUND'});
      if (!Number.isInteger(occupancy) || occupancy < 0) return json(res,400,{error:'INVALID_OCCUPANCY'});
      zone.occupancy=occupancy;
      const before={id:zone.id,name:zone.name,occupancy:zone.occupancy,capacity:zone.capacity};
      const result=access.registerEntry(temp,body.wristbandId,body.zoneId,new Date(body.now || '2026-09-02T17:00:00+02:00'));
      const after=temp.zones.find(z=>z.id===body.zoneId);
      return json(res,result.allowed?200:403,{dryRun:true,before,result,after:{occupancy:after.occupancy,capacity:after.capacity}});
    }
    if (req.method==='POST' && p==='/api/lab/schedule') {
      const body=await readJson(req); if(body===null) return json(res,400,{error:'INVALID_JSON'});
      const temp=cloneFestivalState();
      const show={id:'LAB-TEST',artistId:body.artistId,stageId:body.stageId,start:body.start,end:body.end,status:'SCHEDULED'};
      const context=labScheduleContext(temp,show);
      const result=schedule.scheduleShow(temp,show);
      return json(res,result.ok?200:409,{dryRun:true,attempt:show,context,result});
    }
    if (req.method==='POST' && p==='/api/lab/wristband-payload') {
      const body=await readJson(req); if(body===null) return json(res,400,{error:'INVALID_JSON'});
      const temp=cloneFestivalState();
      const payload=body.payload;
      const result=access.issueWristband(temp,payload);
      return json(res,result.ok?201:400,{dryRun:true,payload,result});
    }
    if (req.method==='GET' && p.startsWith('/api/artists/')) {
      const id=p.split('/').pop(); const artist=state.artists.find(a=>a.id===id);
      if (!artist) return json(res,404,{error:'ARTIST_NOT_FOUND'});
      return json(res,200,{artist_id:artist.id,display_name:artist.name,genre:artist.genre});
    }
    if (req.method==='POST' && p==='/api/access/check') {
      const body=await readJson(req); if(body===null) return json(res,400,{error:'INVALID_JSON'});
      const result=access.checkAccess(state,body.wristbandId,body.zoneId,new Date(body.now || '2026-09-02T17:00:00+02:00'));
      return json(res,result.allowed?200:403,result);
    }
    if (req.method==='POST' && /^\/api\/zones\/[^/]+\/exit$/.test(p)) {
      const zoneId=p.split('/')[3]; const body=await readJson(req); if(body===null) return json(res,400,{error:'INVALID_JSON'});
      const result=access.registerExit(state,body.wristbandId,zoneId);
      return json(res,result.ok?200:404,result);
    }
    if (req.method==='POST' && p==='/api/wristbands') {
      const body=await readJson(req); if(body===null) return json(res,400,{error:'INVALID_JSON'});
      const result=access.issueWristband(state,body);
      return json(res,result.ok?201:400,result);
    }
    if (req.method==='POST' && p==='/api/shows') {
      const body=await readJson(req); if(body===null) return json(res,400,{error:'INVALID_JSON'});
      const result=schedule.scheduleShow(state,body);
      return json(res,result.ok?200:500,result);
    }
    if (req.method==='PATCH' && /^\/api\/shows\/[^/]+\/reschedule$/.test(p)) {
      const id=p.split('/')[3]; const body=await readJson(req); if(body===null) return json(res,400,{error:'INVALID_JSON'});
      const result=schedule.rescheduleShow(state,id,body);
      return json(res,result.ok?200:404,result);
    }
    if (req.method==='POST' && /^\/api\/stages\/[^/]+\/transition$/.test(p)) {
      const id=p.split('/')[3]; const body=await readJson(req); if(body===null) return json(res,400,{error:'INVALID_JSON'});
      const result=stage.transitionStage(state,id,body.nextStatus);
      return json(res,result.ok?200:409,result);
    }
    if (req.method==='DELETE' && p.startsWith('/api/artists/')) {
      const id=p.split('/').pop(); const result=schedule.deleteArtist(state,id);
      return json(res,result.ok?204:404,result);
    }
    if (req.method==='POST' && p==='/api/reset') { state=createState(); return json(res,200,{ok:true}); }
    if (serveStatic(req,res,p)) return;
    return json(res,404,{error:'NOT_FOUND'});
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT || 4177);
  createFestivalServer().listen(port, () => {
    console.log(`\nHOLBIES FESTIVAL CONTROL -> http://localhost:${port}\n`);
  });
}

module.exports = { createFestivalServer, dashboard, _resetForTests:()=>{state=createState();} };
