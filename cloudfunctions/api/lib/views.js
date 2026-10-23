const { projectView } = require('../domain/view');

async function syncViews(db, room) {
  const targets = room.players.filter((p) => !p.left);
  const results = await Promise.allSettled(
    targets.map((p) => {
      const view = projectView(room, p);
      const payload = Object.assign({}, view);
      delete payload._id;
      return db
        .collection('room_views')
        .doc(room._id + '_' + p.playerId)
        .set({ data: payload });
    })
  );
  const failed = results.filter((r) => r.status === 'rejected');
  if (failed.length) {
    console.warn('[views] fanout failed', room._id, failed.length);
    return false;
  }
  return true;
}

async function deleteViews(db, roomCode) {
  try {
    await db.collection('room_views').where({ roomCode }).remove();
  } catch (err) {
    console.warn('[views] delete failed', roomCode, err && err.message);
  }
}

module.exports = { syncViews, deleteViews };
