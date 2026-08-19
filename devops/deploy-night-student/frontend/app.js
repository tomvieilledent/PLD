const demo = new URLSearchParams(location.search).get('demo');
const mockGames = [
  {id:1,title:'Neon Drift',genre:'Course',players:'1-4',rating:4.8,image:'/assets/game-1.jpg'},
  {id:2,title:'Orbital Run',genre:'Action',players:'1-2',rating:4.6,image:'/assets/game-2.jpg'},
  {id:3,title:'Dungeon Byte',genre:'RPG',players:'1-4',rating:4.9,image:'/assets/game-3.jpg'},
  {id:4,title:'Pixel Rally',genre:'Arcade',players:'1-6',rating:4.5,image:'/assets/game-4.jpg'},
  {id:5,title:'Echoes IX',genre:'Aventure',players:'1',rating:4.7,image:'/assets/game-5.jpg'},
  {id:6,title:'Skyforge',genre:'Co-op',players:'2-4',rating:4.4,image:'/assets/game-6.jpg'},
  {id:7,title:'Cyber Arena',genre:'PvP',players:'2-8',rating:4.8,image:'/assets/game-7.jpg'},
  {id:8,title:'Forest Loop',genre:'Puzzle',players:'1-2',rating:4.3,image:'/assets/game-8.jpg'}
];

// Le catalogue visuel ne contient que ce que le support étudiant annonce déjà :
// nom de l'incident + impact utilisateur. Aucune cause ni correction n'est exposée ici.
const incidentCatalog = {
  '1': {title:'INCIDENT #01 · Ghost Host', impact:'L’API ne parvient plus à joindre PostgreSQL. Les requêtes catalogue échouent.'},
  '2': {title:'INCIDENT #02 · Too Fast', impact:'Après un redémarrage à froid, l’API part avant que PostgreSQL soit réellement prêt.'},
  '3': {title:'INCIDENT #03 · Port Collision', impact:'La release est bloquée : deux publications réclament le même port hôte.'},
  '4': {title:'BONUS #04 · Bad Gateway', impact:'Le reverse proxy répond 502 alors que les containers semblent démarrés.'},
  '5': {title:'BONUS #05 · Cache Phantom', impact:'La plateforme répond encore, mais Redis a disparu du chemin de requête.'},
  '6': {title:'BONUS #06 · Access Denied', impact:'L’API démarre avec une configuration qui n’est plus acceptée par PostgreSQL.'}
};

// Fallback purement visuel lorsque /api est indisponible. Dès que l'API répond,
// les métriques réelles reprennent la main.
const incidentFallback = {
  '1': {api:'offline',db:'online',cache:'online',latency:'--',source:'--'},
  '2': {api:'offline',db:'starting',cache:'online',latency:'--',source:'--'},
  '3': {api:'offline',db:'online',cache:'online',latency:'--',source:'--'},
  '4': {api:'offline',db:'online',cache:'online',latency:'--',source:'--'},
  '5': {api:'online',db:'online',cache:'offline',latency:74,source:'database'},
  '6': {api:'offline',db:'online',cache:'online',latency:'--',source:'--'}
};

const demoStates = {
  healthy:{api:'online',db:'online',cache:'online',latency:34,source:'redis',incident:null},
  incident1:{...incidentFallback['1'],incident:[incidentCatalog['1'].title,incidentCatalog['1'].impact]},
  incident2:{...incidentFallback['2'],incident:[incidentCatalog['2'].title,incidentCatalog['2'].impact]},
  incident3:{...incidentFallback['3'],incident:[incidentCatalog['3'].title,incidentCatalog['3'].impact]},
  incident4:{...incidentFallback['4'],incident:[incidentCatalog['4'].title,incidentCatalog['4'].impact]},
  incident5:{...incidentFallback['5'],incident:[incidentCatalog['5'].title,incidentCatalog['5'].impact]},
  incident6:{...incidentFallback['6'],incident:[incidentCatalog['6'].title,incidentCatalog['6'].impact]}
};

function setDot(id,state){
  const el=document.getElementById(id);
  el.className='dot '+(state==='online'?'online':state==='starting'?'pending':'offline');
}
function label(state){return state==='online'?'ONLINE':state==='starting'?'STARTING':'OFFLINE';}
function renderGames(games){
  const grid=document.getElementById('gamesGrid');
  document.getElementById('gameCount').textContent=games.length;
  grid.innerHTML=games.map(g=>`<article class="game-card"><img class="game-cover" src="${g.image}" alt=""><div class="game-meta"><strong>${g.title}</strong><div><span>${g.genre} · ${g.players}</span><span class="rating">★ ${g.rating}</span></div></div></article>`).join('');
}
function applyState(s){
  document.getElementById('apiStatus').textContent=label(s.api);
  document.getElementById('dbStatus').textContent=label(s.db);
  document.getElementById('cacheStatus').textContent=label(s.cache);
  setDot('apiDot',s.api); setDot('dbDot',s.db); setDot('cacheDot',s.cache);
  document.getElementById('latency').textContent=(s.latency==='--'?'--':s.latency+' ms');
  document.getElementById('dbConnection').textContent=s.db==='online'?'CONNECTED':s.db==='starting'?'STARTING':'FAILED';
  document.getElementById('cacheConnection').textContent=s.cache==='online'?'READY':'UNAVAILABLE';
  document.getElementById('dataSource').textContent=(s.source||'--').toUpperCase();
  const box=document.getElementById('incidentBox');
  if(s.incident){
    box.classList.add('active');
    box.innerHTML=`<div class="incident-head"><span class="incident-led"></span><strong>${s.incident[0]}</strong></div><p>${s.incident[1]}</p>`;
  }else{
    box.classList.remove('active');
    box.innerHTML=`<div class="incident-head"><span class="incident-led"></span><strong>Aucun incident actif</strong></div><p>Le système est stable. Gardez un œil sur les logs.</p>`;
  }
}

async function readActiveIncident(){
  try{
    const res=await fetch('/ops/incident.json?ts='+Date.now(),{cache:'no-store'});
    if(res.status===404) return null;
    if(!res.ok) return null;
    const payload=await res.json();
    const id=String(payload.incident||payload.id||'');
    if(!id) return null;
    const known=incidentCatalog[id];
    return {
      id,
      title: known ? known.title : (payload.title || `Incident ${id}`),
      impact: known ? known.impact : (payload.impact || 'Un incident est en cours.')
    };
  }catch(_){
    return null;
  }
}

async function readLiveSystem(){
  const started=performance.now();
  const [statusRes,gamesRes]=await Promise.all([
    fetch('/api/status',{cache:'no-store'}),
    fetch('/api/games',{cache:'no-store'})
  ]);
  if(!statusRes.ok||!gamesRes.ok) throw new Error('api unavailable');
  const status=await statusRes.json();
  const gamesPayload=await gamesRes.json();
  return {
    state:{
      api:'online',
      db:status.database?'online':'offline',
      cache:status.cache?'online':'offline',
      latency:Math.round(performance.now()-started),
      source:gamesPayload.source||'database',
      incident:null
    },
    games:gamesPayload.games||[]
  };
}

let refreshInProgress=false;
async function refresh(){
  if(refreshInProgress) return;
  refreshInProgress=true;
  try{
    const active=await readActiveIncident();
    try{
      const live=await readLiveSystem();
      live.state.incident=active ? [active.title,active.impact] : null;
      applyState(live.state);
      renderGames(live.games);
      document.getElementById('terminalText').textContent=active
        ? '$ curl /api/status\nHTTP 200 · incident encore actif, validez votre correction avec le check'
        : '$ curl /api/status\nHTTP 200 · système joignable';
    }catch(_){
      const base=active && incidentFallback[active.id]
        ? incidentFallback[active.id]
        : {api:'offline',db:'offline',cache:'offline',latency:'--',source:'--'};
      applyState({
        ...base,
        incident:active ? [active.title,active.impact] : ['Système indisponible','Commencez par observer les services et les logs.']
      });
      renderGames(mockGames);
      document.getElementById('terminalText').textContent=active
        ? '$ docker compose logs --tail=20\nIncident actif · partez des faits et des logs.'
        : '$ docker compose logs api\nAPI indisponible · ouvrez les logs pour commencer';
    }
  }finally{
    refreshInProgress=false;
  }
}

function bootDemo(){
  const s=demoStates[demo]||demoStates.healthy;
  applyState(s);
  renderGames(mockGames);
  document.getElementById('terminalText').textContent=demo==='healthy'
    ? '$ docker compose ps\n5 services running · db healthy · cache healthy'
    : '$ docker compose logs --tail=20\nAnalysez le signal, pas la personne.';
}

if(demo){
  bootDemo();
}else{
  refresh();
  setInterval(refresh,2500);
}
