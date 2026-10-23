const { AppError } = require('./errors');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isConflict(err) {
  const msg = String((err && (err.errMsg || err.message)) || '');
  return /conflict|transaction|write conflict|事务/i.test(msg);
}

function roomPatch(room) {
  return {
    ownerId: room.ownerId,
    status: room.status,
    closeReason: room.closeReason || null,
    players: room.players,
    kickedIds: room.kickedIds || [],
    questionIds: room.questionIds || [],
    questionPool: room.questionPool || [],
    round: room.round || null,
    history: room.history || [],
    final: room.final || null,
    gameId: room.gameId || null,
    version: room.version,
    rematchCount: room.rematchCount || 0,
    startedAt: room.startedAt || null,
    lastActivityAt: room.lastActivityAt,
    lastPresenceSyncAt: room.lastPresenceSyncAt || room.lastActivityAt,
    closedAt: room.closedAt || null,
    updatedAt: Date.now(),
  };
}

async function runRoomTx(db, roomCode, mutator, retries) {
  const max = retries || 3;
  for (let attempt = 0; attempt < max; attempt++) {
    const tx = await db.startTransaction();
    try {
      const snap = await tx.collection('rooms').doc(roomCode).get();
      if (!snap.data) throw new AppError('ROOM_NOT_FOUND');
      const room = snap.data;
      const result = await mutator(room, tx);
      await tx.collection('rooms').doc(roomCode).update({ data: roomPatch(room) });
      await tx.commit();
      return result;
    } catch (err) {
      try {
        await tx.rollback();
      } catch (e) {
        // ignore rollback failure
      }
      if (isConflict(err) && attempt < max - 1) {
        await sleep(30 * (attempt + 1));
        continue;
      }
      throw err;
    }
  }
  throw new AppError('CONFLICT_RETRY');
}

module.exports = { runRoomTx, roomPatch, isConflict };
