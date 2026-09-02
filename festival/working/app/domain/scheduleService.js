function overlaps(aStart, aEnd, bStart, bEnd) {
  return new Date(aStart) < new Date(bEnd) && new Date(bStart) < new Date(aEnd);
}

function validateShowShape(show) {
  if (!show || !show.id || !show.artistId || !show.stageId || !show.start || !show.end) {
    return { ok: false, code: 'INVALID_SHOW', message: 'Show incomplet.' };
  }
  if (new Date(show.start) >= new Date(show.end)) {
    return { ok: false, code: 'INVALID_WINDOW', message: 'La fin doit être après le début.' };
  }
  return { ok: true };
}

function scheduleShow(state, show) {
  const shape = validateShowShape(show);
  if (!shape.ok) return shape;
  if (!state.artists.some(a => a.id === show.artistId)) return { ok:false, code:'ARTIST_NOT_FOUND' };
  if (!state.stages.some(s => s.id === show.stageId)) return { ok:false, code:'STAGE_NOT_FOUND' };

  state.shows.push({ ...show, status: show.status || 'SCHEDULED' });
  return { ok:true, show };
}

function rescheduleShow(state, showId, patch) {
  const show = state.shows.find(s => s.id === showId);
  if (!show) return { ok:false, code:'SHOW_NOT_FOUND' };

  if (patch.start) show.start = patch.start;
  if (patch.end) show.end = patch.end;
  if (patch.stageId) show.stageId = patch.stageId;
  return { ok:true, show };
}

function getPublicLineup(state) {
  return state.shows.filter(show => show.status !== 'FINISHED');
}

function deleteArtist(state, artistId) {
  const idx = state.artists.findIndex(a => a.id === artistId);
  if (idx < 0) return { ok:false, code:'ARTIST_NOT_FOUND' };
  const [artist] = state.artists.splice(idx, 1);
  return { ok:true, artist };
}

module.exports = { overlaps, validateShowShape, scheduleShow, rescheduleShow, getPublicLineup, deleteArtist };
