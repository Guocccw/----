const api = require('./api');
const store = require('./store');
const session = require('./session');

async function fetchState(roomCode) {
  const data = await api.call('room.state', { roomCode });
  if (data && data.view) {
    store.applyView(data.view);
    session.save({
      roomCode: data.view.roomCode,
      playerId: data.view.playerId,
      status: data.view.status,
    });
  }
  return data.view;
}

function goHome() {
  store.reset();
  session.clear();
  wx.reLaunch({ url: '/pages/home/index' });
}

function handleRoomError(err) {
  if (!err) return false;
  const gone = ['ROOM_NOT_FOUND', 'ROOM_CLOSED', 'NOT_IN_ROOM', 'KICKED'];
  if (gone.indexOf(err.name) >= 0) {
    goHome();
    return true;
  }
  return false;
}

module.exports = { fetchState, goHome, handleRoomError };
