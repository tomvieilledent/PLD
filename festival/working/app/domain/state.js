const fs = require('node:fs');
const path = require('node:path');

const SEED = path.join(__dirname, '..', 'data', 'seed.json');

function createState() {
  return JSON.parse(fs.readFileSync(SEED, 'utf8'));
}

function cloneState(state) {
  return JSON.parse(JSON.stringify(state));
}

module.exports = { createState, cloneState };
