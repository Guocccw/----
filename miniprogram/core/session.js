const KEY = 'guoguo_room_session';

function setActiveRoom(room) {
  if (!room) {
    wx.removeStorageSync(KEY);
    return;
  }
  wx.setStorageSync(KEY, {
    roomCode: room.roomCode,
    playerId: room.playerId || '',
    status: room.status || '',
    savedAt: Date.now(),
  });
}

function save(room) {
  if (!room) return;
  wx.setStorageSync(KEY, {
    roomCode: room.roomCode,
    playerId: room.playerId || '',
    status: room.status || '',
    savedAt: Date.now(),
  });
}

function load() {
  try {
    const saved = wx.getStorageSync(KEY);
    if (!saved || !saved.roomCode) return null;
    if (Date.now() - (saved.savedAt || 0) > 2 * 3600 * 1000) {
      wx.removeStorageSync(KEY);
      return null;
    }
    return saved;
  } catch (err) {
    return null;
  }
}

function clear() {
  wx.removeStorageSync(KEY);
}

module.exports = { setActiveRoom, save, load, clear };
