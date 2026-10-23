const { uidOf } = require('./ids');
const { EMOJIS, BGS } = require('./validate');

function randomDefaultAvatar() {
  const index = Math.floor(Math.random() * EMOJIS.length);
  return { type: 'emoji', value: EMOJIS[index], bg: BGS[index] };
}

function defaultNickName() {
  return '果友' + String(Math.floor(1000 + Math.random() * 9000));
}

function publicUser(user) {
  return {
    uid: user.uid,
    nickName: user.nickName,
    avatar: user.avatar,
    stats: user.stats || {},
    settings: user.settings || {},
    activeRoomCode: user.activeRoomCode || null,
  };
}

async function getUser(db, openid) {
  try {
    const snap = await db.collection('users').doc(openid).get();
    return snap.data || null;
  } catch (err) {
    return null;
  }
}

async function ensureUser(db, openid) {
  const existing = await getUser(db, openid);
  if (existing) {
    await db.collection('users').doc(openid).update({
      data: { lastLoginAt: Date.now(), lastSeenAt: Date.now() },
    });
    return Object.assign({}, existing, { lastLoginAt: Date.now() });
  }
  const now = Date.now();
  const user = {
    _id: openid,
    uid: uidOf(openid),
    nickName: defaultNickName(),
    avatar: randomDefaultAvatar(),
    createdAt: now,
    lastLoginAt: now,
    lastSeenAt: now,
    stats: {
      games: 0,
      wins: 0,
      bestScore: 0,
      bestScoreAt: 0,
      totalCorrect: 0,
      totalAnswered: 0,
      totalPlayMs: 0,
    },
    settings: { sound: true, vibration: true, rankOptOut: false },
    activeRoomCode: null,
    rate: {},
  };
  const payload = Object.assign({}, user);
  delete payload._id;
  await db.collection('users').doc(openid).set({ data: payload });
  return user;
}

async function setActiveRoom(db, openid, roomCode) {
  try {
    await db.collection('users').doc(openid).update({
      data: { activeRoomCode: roomCode || null },
    });
  } catch (err) {
    console.warn('[users] setActiveRoom failed', openid, err && err.message);
  }
}

async function clearActiveRoom(db, openid, roomCode) {
  try {
    const user = await getUser(db, openid);
    if (user && (!roomCode || user.activeRoomCode === roomCode)) {
      await db.collection('users').doc(openid).update({
        data: { activeRoomCode: null },
      });
    }
  } catch (err) {
    console.warn('[users] clearActiveRoom failed', openid, err && err.message);
  }
}

module.exports = {
  randomDefaultAvatar,
  defaultNickName,
  publicUser,
  getUser,
  ensureUser,
  setActiveRoom,
  clearActiveRoom,
};
