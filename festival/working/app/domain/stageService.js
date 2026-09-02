const TRANSITIONS = {
  CLOSED: ['READY'],
  READY: ['LIVE', 'EVACUATED', 'CLOSED'],
  LIVE: ['PAUSED', 'READY', 'EVACUATED'],
  PAUSED: ['LIVE', 'READY', 'EVACUATED'],
  EVACUATED: ['READY', 'LIVE']
};

function transitionStage(state, stageId, nextStatus) {
  const stage = state.stages.find(s => s.id === stageId);
  if (!stage) return { ok:false, code:'STAGE_NOT_FOUND' };
  const allowed = TRANSITIONS[stage.status] || [];
  if (!allowed.includes(nextStatus)) return { ok:false, code:'INVALID_TRANSITION', from:stage.status, to:nextStatus };
  const previous = stage.status;
  stage.status = nextStatus;
  return { ok:true, from:previous, to:nextStatus, stage };
}

module.exports = { TRANSITIONS, transitionStage };
