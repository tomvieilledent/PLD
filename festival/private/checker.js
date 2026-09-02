const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const { createState, cloneState }=require('../working/app/domain/state');
const schedule=require('../working/app/domain/scheduleService');
const access=require('../working/app/domain/accessService');
const stage=require('../working/app/domain/stageService');
const { createFestivalServer, _resetForTests }=require('../working/app/server');

const STATUS=path.join(__dirname,'runtime','check-status.json');
const HISTORY=path.join(__dirname,'runtime','story-history.json');
const readStatus=()=>{try{return JSON.parse(fs.readFileSync(STATUS,'utf8'))}catch{return {}}};
const writeStatus=s=>fs.writeFileSync(STATUS,JSON.stringify(s,null,2));
const readHistory=()=>{try{return JSON.parse(fs.readFileSync(HISTORY,'utf8'))}catch{return []}};
const writeHistory=h=>fs.writeFileSync(HISTORY,JSON.stringify(h.slice(-80),null,2));
function appendHistory(type,id,message){const h=readHistory();h.push({ts:new Date().toISOString(),type,id:id||null,message});writeHistory(h);}
const ok=(cond,msg)=>assert.equal(Boolean(cond),true,msg);
const eq=(a,b,msg)=>assert.deepEqual(a,b,msg);

const CAMPAIGN_ACTS=[
  {ids:['FC-101','FC-102'],next:'ACTE 2 DÉVERROUILLÉ — LES PORTES S’ENTROUVRENT'},
  {ids:['FC-103','FC-104'],next:'ACTE 3 DÉVERROUILLÉ — LA FOULE MONTE'},
  {ids:['FC-105','FC-106'],next:'ACTE 4 DÉVERROUILLÉ — LE SYSTÈME MENT'},
  {ids:['FC-107','FC-108'],next:'GATES CLEARED — MODE ENCORE DÉVERROUILLÉ'}
];
function campaignMilestone(status,id,previous){
  if(previous?.status==='CLEARED') return null;
  const act=CAMPAIGN_ACTS.find(a=>a.ids.includes(id));
  if(!act) return null;
  return act.ids.every(x=>status[x]?.status==='CLEARED')?act.next:null;
}


async function withServer(fn){
  _resetForTests();
  const server=createFestivalServer();
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const port=server.address().port; const base=`http://127.0.0.1:${port}`;
  try{return await fn(base)}finally{await new Promise(r=>server.close(r));}
}
async function request(base,url,options={}){
  const res=await fetch(base+url,{headers:{'content-type':'application/json'},...options});
  let body=null;try{body=await res.json()}catch{}
  return {status:res.status,body};
}

const checks={
'FC-101': async()=>{
  const s=createState(); s.shows=s.shows.filter(x=>x.id!=='SH-102');
  const before=s.shows.length;
  const r=schedule.scheduleShow(s,{id:'T-101',artistId:'AR-002',stageId:'ST-MAIN',start:'2026-09-02T18:20:00+02:00',end:'2026-09-02T18:50:00+02:00'});
  ok(!r.ok,'Un chevauchement sur la même scène doit être refusé.'); eq(r.code,'STAGE_CONFLICT','Le diagnostic doit distinguer le conflit de scène.'); eq(s.shows.length,before,'Un refus ne doit pas modifier le planning.');
},
'FC-102': async()=>{
  const s=createState(); s.shows=s.shows.filter(x=>x.id!=='SH-103'); const before=s.shows.length;
  const r=schedule.scheduleShow(s,{id:'T-102',artistId:'AR-001',stageId:'ST-PULSE',start:'2026-09-02T18:30:00+02:00',end:'2026-09-02T18:50:00+02:00'});
  ok(!r.ok,'Un artiste ne peut jouer sur deux scènes en même temps.');eq(r.code,'ARTIST_CONFLICT');eq(s.shows.length,before);
},
'FC-103': async()=>{
  const s=createState(); const r=access.checkAccess(s,'WB-002','ZN-VIP',new Date('2026-09-02T17:00:00+02:00'));
  ok(!r.allowed,'Un billet annulé doit invalider son bracelet.');eq(r.code,'TICKET_INACTIVE');
  ok(access.checkAccess(s,'WB-003','ZN-VIP').allowed,'Un vrai billet VIP actif doit rester valide.');
},
'FC-104': async()=>{
  const s=createState(); ok(!access.checkAccess(s,'WB-003','ZN-BACKSTAGE').allowed,'VIP ne signifie pas backstage.');eq(access.checkAccess(s,'WB-003','ZN-BACKSTAGE').code,'LEVEL_FORBIDDEN');ok(access.checkAccess(s,'WB-005','ZN-BACKSTAGE').allowed,'CREW doit conserver son accès backstage.');
},
'FC-105': async()=>{
  const s=createState(); const bad=stage.transitionStage(s,'ST-CLUB','LIVE');ok(!bad.ok,'EVACUATED -> LIVE est interdit.');eq(bad.code,'INVALID_TRANSITION');const clear=stage.transitionStage(s,'ST-CLUB','READY');ok(clear.ok,'EVACUATED -> READY doit rester possible après safety clear.');const live=stage.transitionStage(s,'ST-CLUB','LIVE');ok(live.ok,'READY -> LIVE doit rester possible.');
},
'FC-106': async()=>{
  const s=createState(); const z=s.zones.find(x=>x.id==='ZN-PIT');z.occupancy=z.capacity;ok(!access.checkAccess(s,'WB-001','ZN-PIT').allowed,'Une zone à capacité exacte est déjà pleine.');eq(access.checkAccess(s,'WB-001','ZN-PIT').code,'ZONE_FULL');z.occupancy=z.capacity-1;ok(access.checkAccess(s,'WB-001','ZN-PIT').allowed,'La dernière place disponible doit rester accessible.');
},
'FC-107': async()=>{
  ok(access.validateWristbandPayload({id:'WB-900',ticketId:'TK-001',level:'VIP'}).ok,'Un payload valide doit passer.');ok(!access.validateWristbandPayload({id:'WB-900',ticketId:'TK-001',level:'GODMODE'}).ok,'Un niveau inconnu doit être rejeté.');ok(!access.validateWristbandPayload({id:'WB-900',ticketId:'TK-001',level:'VIP',admin:true}).ok,'Une propriété additionnelle doit être rejetée.');ok(!access.validateWristbandPayload({id:'WB-900',level:'VIP'}).ok,'Les champs requis doivent être imposés.');
},
'FC-108': async()=>withServer(async base=>{
  let r=await request(base,'/api/shows',{method:'POST',body:JSON.stringify({id:'HTTP-1',artistId:'AR-006',stageId:'ST-LAB',start:'2026-09-02T15:00:00+02:00',end:'2026-09-02T16:00:00+02:00'})});eq(r.status,201,'Une création réussie répond 201.');
  r=await request(base,'/api/shows',{method:'POST',body:JSON.stringify({id:'HTTP-2',artistId:'AR-006',stageId:'ST-MAIN',start:'2026-09-02T18:10:00+02:00',end:'2026-09-02T18:20:00+02:00'})});eq(r.status,409,'Un conflit métier répond 409.');
  r=await request(base,'/api/shows',{method:'POST',body:JSON.stringify({id:'BAD'})});eq(r.status,400,'Un payload invalide répond 400.');
}),
'FC-X01': async()=>{
  const s=createState();const r=access.checkAccess(s,'WB-004','ZN-GENERAL',new Date('2026-09-02T17:00:00+02:00'));ok(!r.allowed,'Un billet actif mais expiré doit être refusé.');eq(r.code,'TICKET_EXPIRED');
},
'FC-X02': async()=>{
  const s=createState();const z=s.zones.find(x=>x.id==='ZN-GENERAL');const before=z.occupancy;const entry=access.registerEntry(s,'WB-001','ZN-GENERAL');ok(entry.allowed);eq(z.occupancy,before+1);const exit=access.registerExit(s,'WB-001','ZN-GENERAL');ok(exit.ok);eq(z.occupancy,before,'Une sortie doit annuler l\'occupation créée par l\'entrée.');z.occupancy=0;access.registerExit(s,'WB-001','ZN-GENERAL');eq(z.occupancy,0,'Une occupation ne devient jamais négative.');
},
'FC-X03': async()=>{
  const s=createState();const lineup=schedule.getPublicLineup(s);ok(!lineup.some(x=>x.status==='CANCELLED'),'Le public ne doit jamais voir un show annulé.');ok(lineup.some(x=>x.id==='SH-101'),'Les shows programmés restent visibles.');
},
'FC-X04': async()=>{
  const s=createState();const original=cloneState(s).shows.find(x=>x.id==='SH-104');const r=schedule.rescheduleShow(s,'SH-104',{stageId:'ST-MAIN',start:'2026-09-02T18:10:00+02:00',end:'2026-09-02T18:40:00+02:00'});ok(!r.ok,'Un reschedule en conflit doit être refusé.');eq(r.code,'STAGE_CONFLICT');const after=s.shows.find(x=>x.id==='SH-104');eq(after,original,'Le show original doit rester inchangé après un refus.');const good=schedule.rescheduleShow(s,'SH-104',{stageId:'ST-LAB',start:'2026-09-02T16:00:00+02:00',end:'2026-09-02T17:00:00+02:00'});ok(good.ok,'Un reschedule sans conflit doit passer.');
},
'FC-X05': async()=>{
  const s=createState();let r=access.issueWristband(s,{id:'WB-999',ticketId:'TK-001',level:'STANDARD'});ok(!r.ok,'Un billet avec bracelet actif ne peut en recevoir un second.');eq(r.code,'ACTIVE_WRISTBAND_EXISTS');const old=s.wristbands.find(w=>w.ticketId==='TK-001');old.active=false;r=access.issueWristband(s,{id:'WB-999',ticketId:'TK-001',level:'STANDARD'});ok(r.ok,'Un nouveau bracelet doit être possible après désactivation de l\'ancien.');
},
'FC-X06': async()=>withServer(async base=>{
  const r=await request(base,'/api/artists/AR-001');eq(r.status,200);eq(Object.keys(r.body).sort(),['artistId','genre','name'].sort(),'Le contrat Artist doit être stable.');eq(r.body.artistId,'AR-001');eq(r.body.name,'Neon Fox');
}),
'FC-X07': async()=>{
  const s=createState();let r=schedule.deleteArtist(s,'AR-001');ok(!r.ok,'Un artiste référencé par un show ne peut pas être supprimé.');eq(r.code,'ARTIST_IN_USE');ok(s.artists.some(a=>a.id==='AR-001'),'Le refus ne doit pas supprimer l\'artiste.');r=schedule.deleteArtist(s,'AR-999');ok(r.ok,'Un artiste non référencé peut être supprimé.');ok(!s.artists.some(a=>a.id==='AR-999'));
}
};

const labels={
'FC-101':'Collision de scène','FC-102':'Artiste ubiquitaire','FC-103':'Bracelet fantôme','FC-104':'Backstage breach','FC-105':'Scène morte','FC-106':'Une personne de trop','FC-107':'Payload sauvage','FC-108':'Mauvais signal HTTP','FC-X01':'Pass expiré','FC-X02':'Zone qui ne se vide jamais','FC-X03':'Concert annulé toujours visible','FC-X04':'Reschedule non atomique','FC-X05':'Double bracelet','FC-X06':'Dérive sémantique API','FC-X07':'Artiste orphelin'};
const hints={
'FC-101':['Compare les créneaux, pas seulement les identifiants.','Une collision est vraie quand startA < endB ET startB < endA.','Cherche la création de show dans ScheduleService et refuse avant de muter le tableau.'],
'FC-102':['Le conflit peut exister même si les scènes sont différentes.','Réutilise la même logique de chevauchement mais sur artistId.','Le checker attend un code métier distinct ARTIST_CONFLICT.'],
'FC-103':['Le bracelet seul ne suffit jamais.','Remonte jusqu’au ticket lié et vérifie son état.','Un accès avec ticket non ACTIVE doit répondre TICKET_INACTIVE.'],
'FC-104':['VIP n’est pas synonyme de tous les droits.','La zone porte déjà la liste des niveaux autorisés.','Supprime le passe-droit universel VIP et laisse requiredLevels décider.'],
'FC-105':['Regarde la FSM Stage fournie.','EVACUATED n’a qu’une sortie métier normale.','Corrige la table TRANSITIONS : EVACUATED -> READY seulement.'],
'FC-106':['Teste la frontière exacte, pas seulement le dépassement.','capacity est le maximum de personnes déjà présentes.','La condition de refus doit couvrir occupancy >= capacity.'],
'FC-107':['Le contrat OpenAPI est strict.','Vérifie required, enum et additionalProperties.','Accepte exactement id, ticketId, level et quatre niveaux autorisés.'],
'FC-108':['Les codes HTTP font partie du contrat.','Sépare validation, conflit métier et création.','POST /api/shows : 201 / 400 / 409.'],
'FC-X01':['ACTIVE ne signifie pas forcément encore valide.','Compare now à validUntil.','Si now > validUntil, refuse avec TICKET_EXPIRED.'],
'FC-X02':['Observe l’occupation avant entrée, après entrée, après sortie.','La sortie doit être l’opération inverse de l’entrée.','Décrémente avec un plancher à zéro.'],
'FC-X03':['Le line-up public est une vue filtrée.','CANCELLED n’est pas une information à afficher comme un show disponible.','Exclus au minimum CANCELLED et FINISHED selon les règles de la vue.'],
'FC-X04':['Reschedule = mêmes invariants qu’une création.','Valide sur une copie avant de modifier l’original.','En cas de conflit, retourne le code et conserve exactement le show initial.'],
'FC-X05':['Le bracelet actif est unique par ticket.','Cherche un bracelet actif existant avant l’insertion.','Refuse avec ACTIVE_WRISTBAND_EXISTS, mais autorise si l’ancien est désactivé.'],
'FC-X06':['Compare la réponse réelle au YAML.','Le mapping public n’est pas le mapping interne.','Expose artistId, name, genre et rien d’autre.'],
'FC-X07':['Pense ON DELETE RESTRICT.','Avant suppression, cherche les shows qui référencent l’artiste.','Refuse avec ARTIST_IN_USE si une référence existe.']
};

async function runOne(id,quiet=false){
  if(!checks[id]) throw new Error(`Incident inconnu: ${id}`);
  const before=readStatus(); const previous=before[id]||{}; const attempts=(previous.attempts||0)+(quiet?0:1);
  try{
    await checks[id]();
    const status=readStatus();status[id]={status:'CLEARED',checkedAt:new Date().toISOString(),attempts};writeStatus(status);
    if(!quiet){appendHistory('CLEARED',id,`${id} · ${labels[id]} — INCIDENT CLEARED (+${id.includes('X')?150:100} XP)`);console.log(`
✓ ${id} — ${labels[id]}
  INCIDENT CLEARED
`);const milestone=campaignMilestone(status,id,previous);if(milestone){appendHistory('UNLOCK',id,milestone);console.log(`  ${milestone}
`);}}
    return true
  }
  catch(e){
    const status=readStatus();status[id]={status:'OPEN',checkedAt:new Date().toISOString(),attempts};writeStatus(status);
    if(!quiet){appendHistory('FAILED',id,`${id} · checker échoué — ${e.message}`);console.error(`
✕ ${id} — ${labels[id]}
  ${e.message}
`);}
    return false
  }
}

async function main(){
  const [cmd,arg,levelRaw]=process.argv.slice(2);
  if(cmd==='reset'){writeStatus({});writeHistory([]);console.log('Campagne réinitialisée : statuts + journal de régie.');return;}
  if(cmd==='hint'){const level=Math.max(1,Math.min(3,Number(levelRaw||1)));if(!hints[arg])throw new Error('Incident inconnu.');appendHistory('HINT',arg,`${arg} · indice ${level}/3 demandé`);console.log(`\nINDICE ${level}/3 — ${arg}\n${hints[arg][level-1]}\n`);return;}
  if(cmd==='check'){if(!arg)throw new Error('Usage: npm run check -- FC-101');process.exitCode=(await runOne(arg))?0:1;return;}
  if(cmd==='validate'){
    const ids=Object.keys(checks);let pass=0;console.log('\nHOLBIES FESTIVAL — FINAL VALIDATION\n');
    for(const id of ids){const yes=await runOne(id,true);console.log(`${yes?'✓':'✕'} ${id.padEnd(7)} ${labels[id]}`);if(yes)pass++;}
    const mandatory=ids.filter(x=>!x.includes('X'));const st=readStatus();const mandPass=mandatory.filter(x=>st[x]?.status==='CLEARED').length;
    console.log(`\n${pass}/${ids.length} incidents cleared · ${mandPass}/${mandatory.length} obligatoires\n`);
    appendHistory('VALIDATION',null,`Validation globale : ${pass}/15 · ${mandPass}/8 obligatoires`);
    if(mandPass===mandatory.length)console.log('GATES CLEARED — le festival peut ouvrir.\n');else{console.log('GATES BLOCKED — incidents obligatoires encore ouverts.\n');process.exitCode=1;}
    return;
  }
  console.log('Commandes: check | validate | hint | reset');
}
main().catch(e=>{console.error(e.message);process.exitCode=1});
