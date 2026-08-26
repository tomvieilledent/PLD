'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { missionPayload } = require('../SYSTEME_MISSION_NE_PAS_MODIFIER/app/server');

test('release candidate points to the approved mission', () => {
  assert.equal(missionPayload().mission, 'ORBITER-8');
});
