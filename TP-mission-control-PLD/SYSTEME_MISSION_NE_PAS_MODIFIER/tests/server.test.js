'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { createServer, missionPayload, missionMode } = require('../app/server');

async function withServer(run) {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('mission payload identifies ORBITER-7', () => {
  assert.equal(missionPayload().mission, 'ORBITER-7');
});

test('MISSION_MODE is exposed by the payload', () => {
  const expected = ['simulation', 'flight'].includes(process.env.MISSION_MODE)
    ? process.env.MISSION_MODE
    : 'simulation';
  assert.equal(missionMode(), expected);
  assert.equal(missionPayload().mode, expected);
});

test('GET /health returns an ok status', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/health`);
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.status, 'ok');
    assert.equal(body.mission, 'ORBITER-7');
    assert.equal(body.mode, missionMode());
  });
});

test('GET /api/mission returns systems', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/mission`);
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.systems.length, 4);
    assert.ok(body.systems.every((system) => system.status === 'ONLINE'));
    assert.equal(body.state.deepSpace.unlocked, false);
    assert.equal(body.state.deepSpace.missions.X1.status, 'LOCKED');
  });
});

test('GET / serves the Mission Control interface', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/`);
    const body = await response.text();
    assert.equal(response.status, 200);
    assert.match(body, /MISSION CONTROL/);
    assert.match(body, /ORBITER-7/);
  });
});
