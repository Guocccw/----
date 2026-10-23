const clock = require('./clock');

const state = {
  user: null,
  activeRoom: null,
  view: null,
  roomCode: null,
  playerId: null,
  viewId: null,
  phase: 'idle',
  network: 'online',
  lastSyncedAt: 0,
};

const listeners = new Set();

function notify() {
  listeners.forEach((fn) => {
    try {
      fn(state);
    } catch (err) {
      console.error('[store] listener error', err);
    }
  });
}

function getState() {
  return state;
}

function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function set(patch) {
  Object.assign(state, patch);
  notify();
}

function setUser(user) {
  state.user = user || null;
  notify();
}

function setActiveRoom(room) {
  state.activeRoom = room || null;
  notify();
}

function derivePhase(view) {
  if (!view) return 'idle';
  if (view.status === 'waiting') return 'waiting';
  if (view.status === 'closed') return 'closed';
  if (view.status === 'settled') return 'finished';
  if (!view.round) return 'waiting';
  const now = clock.now();
  if (now < view.round.startedAt) return 'countdown';
  if (now < view.round.endsAt) return 'answering';
  return 'revealed';
}

function applyView(view) {
  if (!view) return;
  const current = state.view;
  if (current && view.roomCode === current.roomCode) {
    if (view.version < current.version) return;
    if (view.version === current.version && view.updatedAt <= current.updatedAt) return;
  }
  state.view = view;
  state.activeRoom = {
    roomCode: view.roomCode,
    playerId: view.playerId,
    status: view.status,
  };
  state.roomCode = view.roomCode;
  state.playerId = view.playerId;
  state.viewId = view.roomCode + '_' + view.playerId;
  state.phase = derivePhase(view);
  state.lastSyncedAt = Date.now();
  notify();
}

function reset() {
  state.activeRoom = null;
  state.view = null;
  state.roomCode = null;
  state.playerId = null;
  state.viewId = null;
  state.phase = 'idle';
  state.network = 'online';
  state.lastSyncedAt = 0;
  notify();
}

module.exports = {
  getState,
  subscribe,
  set,
  setUser,
  setActiveRoom,
  applyView,
  derivePhase,
  reset,
};
