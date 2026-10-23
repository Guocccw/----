const { AppError } = require('../lib/errors');
const { weekRange } = require('../lib/time');
const { ensureUser, getUser, publicUser, clearActiveRoom } = require('../lib/users');
const { checkRate } = require('../lib/rate');
const { assertNickName, assertAvatar } = require('../lib/validate');

async function contentCheck(cloud, text) {
  if (!text) return;
  try {
    const res = await cloud.openapi.security.msgSecCheck({ content: text });
    if (res && res.result && res.result.suggest === 'risky') {
      throw new AppError('CONTENT_UNSAFE');
    }
  } catch (err) {
    if (err instanceof AppError) throw err;
    // 权限未开通或接口异常时不阻断；内容安全审核结果以人工复核兜底
  }
}

async function login(data, ctx) {
  const user = await ensureUser(ctx.db, ctx.openid);
  let activeRoom = null;

  if (user.activeRoomCode) {
    try {
      const snap = await ctx.db.collection('rooms').doc(user.activeRoomCode).get();
      const room = snap.data;
      if (room && room.status !== 'closed') {
        const player = room.players.find((p) => p.openid === ctx.openid && !p.left);
        if (player) {
          activeRoom = {
            roomCode: room._id,
            status: room.status,
            playerId: player.playerId,
          };
        } else {
          await clearActiveRoom(ctx.db, ctx.openid, user.activeRoomCode);
          user.activeRoomCode = null;
        }
      } else {
        await clearActiveRoom(ctx.db, ctx.openid, user.activeRoomCode);
        user.activeRoomCode = null;
      }
    } catch (err) {
      await clearActiveRoom(ctx.db, ctx.openid, user.activeRoomCode);
      user.activeRoomCode = null;
    }
  }

  return {
    user: publicUser(user),
    activeRoom,
    serverWeekKey: weekRange(ctx.now).weekKey,
  };
}

async function updateProfile(data, ctx) {
  const user = await getUser(ctx.db, ctx.openid);
  if (!user) throw new AppError('USER_NOT_FOUND');

  const patch = {};
  if (Object.prototype.hasOwnProperty.call(data, 'nickName')) {
    const nickName = assertNickName(data.nickName);
    await contentCheck(ctx.cloud, nickName);
    patch.nickName = nickName;
  }
  if (data.avatar) {
    patch.avatar = assertAvatar(data.avatar);
  }
  if (!Object.keys(patch).length) throw new AppError('INVALID_PARAM');

  const rate = checkRate(user, 'profile', 5, ctx.now);
  patch.rate = rate;
  patch.lastSeenAt = ctx.now;

  await ctx.db.collection('users').doc(ctx.openid).update({ data: patch });
  return { user: publicUser(Object.assign({}, user, patch)) };
}

async function updateSettings(data, ctx) {
  const user = await getUser(ctx.db, ctx.openid);
  if (!user) throw new AppError('USER_NOT_FOUND');
  const settings = Object.assign({}, user.settings || {});
  if (typeof data.sound === 'boolean') settings.sound = data.sound;
  if (typeof data.vibration === 'boolean') settings.vibration = data.vibration;
  if (typeof data.rankOptOut === 'boolean') settings.rankOptOut = data.rankOptOut;

  const rate = checkRate(user, 'profile', 5, ctx.now);
  await ctx.db.collection('users').doc(ctx.openid).update({
    data: { settings, rate, lastSeenAt: ctx.now },
  });
  return { user: publicUser(Object.assign({}, user, { settings })) };
}

module.exports = { login, updateProfile, updateSettings };
