const test = require('node:test');
const assert = require('node:assert/strict');
const { createState } = require('../app/domain/state');
const { checkAccess } = require('../app/domain/accessService');
const { validateShowShape } = require('../app/domain/scheduleService');

// Ces tests sont volontairement des smoke tests. Ils garantissent que le socle tourne,
// mais ne révèlent pas les checkers d'incident.
test('le starter charge les données du festival', () => {
  const state=createState();
  assert.equal(state.festival.name,'Holbies Festival');
  assert.ok(state.stages.length >= 4);
});

test('un show valide possède une fenêtre temporelle cohérente', () => {
  assert.equal(validateShowShape({id:'T',artistId:'AR-001',stageId:'ST-MAIN',start:'2026-09-02T12:00:00+02:00',end:'2026-09-02T13:00:00+02:00'}).ok,true);
});

test('un bracelet crew actif peut entrer backstage', () => {
  const state=createState();
  assert.equal(checkAccess(state,'WB-005','ZN-BACKSTAGE').allowed,true);
});

const { createFestivalServer, _resetForTests } = require('../app/server');

test('le Field Lab expose ses 5 bancs d’essai sans modifier l’état live', async (t) => {
  _resetForTests();
  const server = createFestivalServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (url, body) => fetch(base + url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  const before = await (await fetch(base + '/api/dashboard')).json();
  const clubBefore = before.stages.find(s => s.id === 'ST-CLUB').status;

  const responses = await Promise.all([
    post('/api/lab/access', { wristbandId:'WB-001', zoneId:'ZN-GENERAL' }),
    post('/api/lab/stage', { stageId:'ST-CLUB', nextStatus:'LIVE' }),
    post('/api/lab/capacity', { zoneId:'ZN-PIT', wristbandId:'WB-001', occupancy:5000 }),
    post('/api/lab/schedule', { artistId:'AR-001', stageId:'ST-MAIN', start:'2026-09-02T18:30:00+02:00', end:'2026-09-02T19:15:00+02:00' }),
    post('/api/lab/wristband-payload', { payload:{id:'WB-777',ticketId:'TK-001',level:'STANDARD'} })
  ]);
  responses.forEach(r => assert.ok(r.status >= 200 && r.status < 500));

  const after = await (await fetch(base + '/api/dashboard')).json();
  const clubAfter = after.stages.find(s => s.id === 'ST-CLUB').status;
  assert.equal(clubAfter, clubBefore);
  assert.equal(after.zones.find(z => z.id === 'ZN-PIT').occupancy, before.zones.find(z => z.id === 'ZN-PIT').occupancy);
  assert.equal(after.shows.length, before.shows.length);
  assert.equal(after.wristbands.length, before.wristbands.length);
});

const fs = require('node:fs');
const path = require('node:path');

test('le frontend contient bien les 5 bancs du Field Lab et leurs formulaires', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'app', 'public', 'index.html'), 'utf8');
  const expectedTools = ['access', 'stage', 'capacity', 'schedule', 'payload'];
  expectedTools.forEach(tool => assert.match(html, new RegExp(`data-lab-tool=["']${tool}["']`)));
  ['accessForm','stageForm','capacityForm','scheduleForm','payloadForm'].forEach(id => {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  });
});
