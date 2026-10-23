const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;
const { applyGameStats } = require('./lib/stats');
const { weekKeyOf } = require('./lib/time');

async function deleteViews(roomCode) {
  try {
    await db.collection('room_views').where({ roomCode }).remove();
  } catch (err) {
    console.warn('[cron] delete views failed', roomCode, err && err.message);
  }
}

async function clearActive(players, roomCode) {
  for (const p of players || []) {
    try {
      const snap = await db.collection('users').doc(p.openid).get();
      if (snap.data && snap.data.activeRoomCode === roomCode) {
        await db.collection('users').doc(p.openid).update({
          data: { activeRoomCode: null },
        });
      }
    } catch (err) {
      // 用户可能已删除或数据不存在
    }
  }
}

async function closeRoom(room, reason) {
  const now = Date.now();
  try {
    await db.collection('rooms').doc(room._id).update({
      data: {
        status: 'closed',
        closeReason: reason,
        closedAt: now,
        updatedAt: now,
      },
    });
  } catch (err) {
    return;
  }
  await deleteViews(room._id);
  await clearActive(room.players, room._id);
}

async function cleanupRooms() {
  const now = Date.now();
  const groups = [
    { status: 'waiting', before: now - 2 * 3600 * 1000, reason: 'expired' },
    { status: 'playing', before: now - 30 * 60 * 1000, reason: 'abandoned' },
    { status: 'settled', before: now - 30 * 60 * 1000, reason: 'expired' },
  ];
  for (const group of groups) {
    const res = await db
      .collection('rooms')
      .where({ status: group.status, lastActivityAt: _.lt(group.before) })
      .limit(50)
      .get();
    for (const room of res.data || []) {
      await closeRoom(room, group.reason);
    }
  }
}

async function retryStats() {
  const res = await db
    .collection('games')
    .where({ statsApplied: false, endedAt: _.gt(Date.now() - 24 * 3600 * 1000) })
    .limit(30)
    .get();
  for (const game of res.data || []) {
    try {
      await applyGameStats(db, game._id);
    } catch (err) {
      console.warn('[cron] stats retry failed', game._id, err && err.message);
    }
  }
}

async function prune() {
  const now = Date.now();
  try {
    await db
      .collection('event_batches')
      .where({ serverTs: _.lt(now - 90 * 24 * 3600 * 1000) })
      .remove();
  } catch (err) {}
  try {
    const cutoff = weekKeyOf(now - 56 * 24 * 3600 * 1000);
    await db
      .collection('leaderboards_weekly')
      .where({ weekKey: _.lt(cutoff) })
      .remove();
  } catch (err) {}
  try {
    await db
      .collection('games')
      .where({ statsApplied: true, endedAt: _.lt(now - 180 * 24 * 3600 * 1000) })
      .remove();
  } catch (err) {}
}

exports.main = async () => {
  await cleanupRooms();
  await retryStats();
  await prune();
  return { ok: true, at: Date.now() };
};
