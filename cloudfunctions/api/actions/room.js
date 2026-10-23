const { AppError } = require('../lib/errors');
const { runRoomTx } = require('../lib/room-tx');
const { syncViews, deleteViews } = require('../lib/views');
const { projectView } = require('../domain/view');
const {
  activePlayers,
  findPlayer,
  findPlayerById,
  requireActivePlayer,
  findAnswer,
  allAnswered,
  settleRound,
  startNextRound,
  finishGame,
} = require('../domain/room');
const { scoreAnswer } = require('../domain/scoring');
const { rankPlayers } = require('../domain/ranking');
const { newPlayerId, newGameId, newRoomCode } = require('../lib/ids');
const {
  assertRoomCode,
  assertConfig,
  assertChoice,
  assertInteger,
} = require('../lib/validate');
const { drawQuestions } = require('../lib/questions');
const { checkRate } = require('../lib/rate');
const { getUser, setActiveRoom, clearActiveRoom } = require('../lib/users');
const { applyGameStats } = require('../lib/stats');

function viewFor(room, openid) {
  const player = room.players.find((p) => p.openid === openid);
  if (!player || player.left) throw new AppError('NOT_IN_ROOM');
  return projectView(room, player);
}

function makePlayer(user, seat, now, existing) {
  return {
    playerId: newPlayerId(existing),
    openid: user._id,
    nickName: user.nickName,
    avatar: user.avatar,
    seat,
    joinedAt: now,
    left: false,
    score: 0,
    correctCount: 0,
    correctTimeMs: 0,
    answeredCount: 0,
    lastSeenAt: now,
  };
}

function firstFreeSeat(players) {
  const used = new Set(players.map((p) => p.seat));
  for (let seat = 1; seat <= 4; seat++) {
    if (!used.has(seat)) return seat;
  }
  return 0;
}

async function create(data, ctx) {
  const user = await getUser(ctx.db, ctx.openid);
  if (!user) throw new AppError('USER_NOT_FOUND');
  const config = assertConfig(data.config);

  if (user.activeRoomCode) {
    try {
      const snap = await ctx.db.collection('rooms').doc(user.activeRoomCode).get();
      const old = snap.data;
      if (old) {
        const member = old.players.some((p) => p.openid === ctx.openid && !p.left);
        if (!member) {
          await clearActiveRoom(ctx.db, ctx.openid, old._id);
        } else if (old.status === 'waiting' && old.ownerId === ctx.openid) {
          await syncViews(ctx.db, old);
          return { view: viewFor(old, ctx.openid) };
        } else if (old.status === 'waiting' || old.status === 'playing') {
          throw new AppError('ALREADY_IN_ROOM', { roomCode: old._id });
        }
      }
    } catch (err) {
      if (err instanceof AppError) throw err;
    }
    await clearActiveRoom(ctx.db, ctx.openid, user.activeRoomCode);
  }

  const rate = checkRate(user, 'create', 3, ctx.now);
  const now = Date.now();
  let room = null;
  let lastErr = null;

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = newRoomCode();
    const player = makePlayer(user, 1, now, null);
    const doc = {
      _id: code,
      ownerId: ctx.openid,
      status: 'waiting',
      closeReason: null,
      config,
      players: [player],
      kickedIds: [],
      questionIds: [],
      questionPool: [],
      round: null,
      history: [],
      final: null,
      gameId: null,
      version: 1,
      rematchCount: 0,
      startedAt: null,
      createdAt: now,
      updatedAt: now,
      lastActivityAt: now,
      lastPresenceSyncAt: now,
      closedAt: null,
    };
    try {
      const existing = await ctx.db.collection('rooms').doc(code).get().catch(() => null);
      if (existing && existing.data) continue;
      const payload = Object.assign({}, doc);
      delete payload._id;
      await ctx.db.collection('rooms').doc(code).set({ data: payload });
      room = doc;
      break;
    } catch (err) {
      lastErr = err;
    }
  }

  if (!room) throw lastErr || new AppError('ROOM_CODE_EXHAUSTED');

  await ctx.db.collection('users').doc(ctx.openid).update({
    data: { activeRoomCode: room._id, rate, lastSeenAt: now },
  });
  await syncViews(ctx.db, room);
  return { view: viewFor(room, ctx.openid) };
}

async function join(data, ctx) {
  const code = assertRoomCode(data.roomCode);
  const user = await getUser(ctx.db, ctx.openid);
  if (!user) throw new AppError('USER_NOT_FOUND');

  if (user.activeRoomCode && user.activeRoomCode !== code) {
    try {
      const snap = await ctx.db.collection('rooms').doc(user.activeRoomCode).get();
      const old = snap.data;
      if (old) {
        const member = old.players.some((p) => p.openid === ctx.openid && !p.left);
        if (member && (old.status === 'waiting' || old.status === 'playing')) {
          throw new AppError('ALREADY_IN_ROOM', { roomCode: old._id });
        }
      }
    } catch (err) {
      if (err instanceof AppError) throw err;
    }
    await clearActiveRoom(ctx.db, ctx.openid, user.activeRoomCode);
  }

  const now = Date.now();
  const room = await runRoomTx(ctx.db, code, async (roomData) => {
    if (roomData.status === 'closed') throw new AppError('ROOM_CLOSED');
    const member = roomData.players.find((p) => p.openid === ctx.openid && !p.left);
    if (member) return roomData;
    if (roomData.status !== 'waiting') throw new AppError('ROOM_STARTED');
    if (roomData.players.length >= 4) throw new AppError('ROOM_FULL');
    if ((roomData.kickedIds || []).indexOf(ctx.openid) >= 0) throw new AppError('KICKED');

    const existing = new Set(roomData.players.map((p) => p.playerId));
    const player = makePlayer(user, firstFreeSeat(roomData.players), now, existing);
    roomData.players.push(player);
    roomData.version += 1;
    roomData.lastActivityAt = now;
    return roomData;
  });

  await setActiveRoom(ctx.db, ctx.openid, code);
  await syncViews(ctx.db, room);
  return { view: viewFor(room, ctx.openid) };
}

async function state(data, ctx) {
  const code = assertRoomCode(data.roomCode);
  let room;
  try {
    const snap = await ctx.db.collection('rooms').doc(code).get();
    room = snap.data;
  } catch (err) {
    throw new AppError('ROOM_NOT_FOUND');
  }
  if (!room) throw new AppError('ROOM_NOT_FOUND');
  if (room.status === 'closed') throw new AppError('ROOM_CLOSED');
  const view = viewFor(room, ctx.openid);
  const payload = Object.assign({}, view);
  delete payload._id;
  try {
    await ctx.db.collection('room_views').doc(view._id).set({ data: payload });
  } catch (err) {
    console.warn('[room.state] view repair failed', room._id, err && err.message);
  }
  return { view };
}

async function heartbeat(data, ctx) {
  const code = assertRoomCode(data.roomCode);
  let fanout = false;
  const now = Date.now();
  const room = await runRoomTx(ctx.db, code, async (roomData) => {
    if (roomData.status === 'closed') throw new AppError('ROOM_CLOSED');
    const player = requireActivePlayer(roomData, ctx.openid);
    player.lastSeenAt = now;
    roomData.lastActivityAt = now;
    if (now - (roomData.lastPresenceSyncAt || 0) > 10000) {
      roomData.version += 1;
      roomData.lastPresenceSyncAt = now;
      fanout = true;
    }
    return roomData;
  });

  if (fanout) await syncViews(ctx.db, room);
  return { version: room.version };
}

async function leave(data, ctx) {
  const code = assertRoomCode(data.roomCode);
  let closed = false;
  let leftPlayerId = '';
  const now = Date.now();

  const room = await runRoomTx(ctx.db, code, async (roomData) => {
    const player = findPlayer(roomData, ctx.openid);
    if (!player) return roomData;
    leftPlayerId = player.playerId;

    if (roomData.status === 'waiting') {
      roomData.players = roomData.players.filter((p) => p.openid !== ctx.openid);
      if (roomData.ownerId === ctx.openid) {
        const next = roomData.players.slice().sort((a, b) => a.joinedAt - b.joinedAt)[0];
        roomData.ownerId = next ? next.openid : '';
      }
      if (!roomData.players.length) {
        roomData.status = 'closed';
        roomData.closeReason = 'empty';
        roomData.closedAt = now;
        closed = true;
      }
    } else if (roomData.status === 'playing') {
      player.left = true;
      player.lastSeenAt = now;
      if (!activePlayers(roomData).length) {
        roomData.status = 'closed';
        roomData.closeReason = 'empty';
        roomData.closedAt = now;
        closed = true;
      } else if (roomData.ownerId === ctx.openid) {
        const next = activePlayers(roomData).sort((a, b) => a.joinedAt - b.joinedAt)[0];
        roomData.ownerId = next ? next.openid : '';
      }
    } else if (roomData.status === 'settled') {
      player.left = true;
      player.lastSeenAt = now;
      if (roomData.ownerId === ctx.openid) {
        const next = roomData.players
          .filter((p) => !p.left && p.openid !== ctx.openid)
          .sort((a, b) => a.joinedAt - b.joinedAt)[0];
        roomData.ownerId = next ? next.openid : '';
      }
    }
    roomData.version += 1;
    roomData.lastActivityAt = now;
    return roomData;
  });

  await clearActiveRoom(ctx.db, ctx.openid, code);
  if (closed) {
    await deleteViews(ctx.db, code);
  } else {
    if (leftPlayerId) {
      try {
        await ctx.db.collection('room_views').doc(code + '_' + leftPlayerId).remove();
      } catch (err) {
        console.warn('[leave] view remove failed', code, leftPlayerId);
      }
    }
    await syncViews(ctx.db, room);
  }
  return { left: true };
}

async function start(data, ctx) {
  const code = assertRoomCode(data.roomCode);

  let room;
  try {
    const snap = await ctx.db.collection('rooms').doc(code).get();
    room = snap.data;
  } catch (err) {
    throw new AppError('ROOM_NOT_FOUND');
  }
  if (!room) throw new AppError('ROOM_NOT_FOUND');
  if (room.status === 'playing') return { view: viewFor(room, ctx.openid) };
  if (room.status !== 'waiting') throw new AppError('ROOM_CLOSED');
  if (room.ownerId !== ctx.openid) throw new AppError('NOT_OWNER');
  if (activePlayers(room).length < 2) throw new AppError('NOT_ENOUGH_PLAYERS');

  const questions = await drawQuestions(ctx.db, room.config);
  const now = Date.now();
  const startAt = now + Number(room.config.countdownSec || 3) * 1000;

  const updated = await runRoomTx(ctx.db, code, async (roomData) => {
    if (roomData.status === 'playing') return roomData;
    if (roomData.status !== 'waiting') throw new AppError('ROOM_CLOSED');
    if (roomData.ownerId !== ctx.openid) throw new AppError('NOT_OWNER');
    if (activePlayers(roomData).length < 2) throw new AppError('NOT_ENOUGH_PLAYERS');

    const first = questions[0];
    roomData.questionIds = questions.map((q) => q._id);
    roomData.questionPool = questions;
    roomData.history = [];
    roomData.final = null;
    roomData.gameId = null;
    roomData.round = {
      index: 0,
      total: roomData.config.questionCount,
      questionId: first._id,
      question: { stem: first.stem, options: first.options, explain: first.explain || null },
      answerIndex: first.answerIndex,
      startedAt: startAt,
      endsAt: startAt + Number(roomData.config.durationSec) * 1000,
      settledAt: null,
      revealEndsAt: null,
      answers: [],
    };
    roomData.status = 'playing';
    roomData.startedAt = startAt;
    roomData.version += 1;
    roomData.lastActivityAt = now;
    return roomData;
  });

  await syncViews(ctx.db, updated);
  return { view: viewFor(updated, ctx.openid) };
}

async function answer(data, ctx) {
  const code = assertRoomCode(data.roomCode);
  const roundIndex = assertInteger(data.roundIndex, 'roundIndex');
  const choice = assertChoice(data.choice);
  const now = Date.now();

  const room = await runRoomTx(ctx.db, code, async (roomData) => {
    if (roomData.status !== 'playing') throw new AppError('ROUND_ENDED');
    const player = requireActivePlayer(roomData, ctx.openid);
    if (!roomData.round) throw new AppError('ROUND_NOT_FOUND');
    if (roomData.round.index !== roundIndex) throw new AppError('ROUND_MISMATCH');

    const existing = findAnswer(roomData, player.playerId);
    if (existing) {
      if (existing.choice !== choice) throw new AppError('ALREADY_ANSWERED');
      if (!roomData.round.settledAt && allAnswered(roomData)) {
        settleRound(roomData, now);
        roomData.version += 1;
      }
      return roomData;
    }
    if (roomData.round.settledAt) throw new AppError('ROUND_ENDED');
    if (now > roomData.round.endsAt + 800) throw new AppError('ROUND_ENDED');

    const correct = choice === roomData.round.answerIndex;
    const gain = scoreAnswer({
      correct,
      submittedAt: now,
      endsAt: roomData.round.endsAt,
      durationMs: roomData.round.endsAt - roomData.round.startedAt,
    });
    roomData.round.answers.push({
      playerId: player.playerId,
      choice,
      submittedAt: now,
      correct,
      gain,
    });
    player.answeredCount = (player.answeredCount || 0) + 1;
    roomData.lastActivityAt = now;

    if (allAnswered(roomData)) settleRound(roomData, now);
    roomData.version += 1;
    return roomData;
  });

  await syncViews(ctx.db, room);
  return { view: viewFor(room, ctx.openid) };
}

async function settle(data, ctx) {
  const code = assertRoomCode(data.roomCode);
  const roundIndex = assertInteger(data.roundIndex, 'roundIndex');
  const now = Date.now();

  const room = await runRoomTx(ctx.db, code, async (roomData) => {
    if (roomData.status === 'settled') return roomData;
    if (roomData.status !== 'playing') throw new AppError('ROUND_NOT_FOUND');
    if (!roomData.round) throw new AppError('ROUND_NOT_FOUND');
    if (roomData.round.index > roundIndex) return roomData;
    if (roomData.round.index !== roundIndex) throw new AppError('ROUND_MISMATCH');
    if (roomData.round.settledAt) return roomData;
    if (now < roomData.round.endsAt && !allAnswered(roomData)) {
      throw new AppError('SETTLE_TOO_EARLY');
    }
    settleRound(roomData, now);
    roomData.version += 1;
    roomData.lastActivityAt = now;
    return roomData;
  });

  await syncViews(ctx.db, room);
  return { view: viewFor(room, ctx.openid) };
}

async function advance(data, ctx) {
  const code = assertRoomCode(data.roomCode);
  const roundIndex = assertInteger(data.roundIndex, 'roundIndex');
  const now = Date.now();
  let pendingGame = null;

  const room = await runRoomTx(ctx.db, code, async (roomData) => {
    if (roomData.status === 'settled') return roomData;
    if (roomData.status !== 'playing' || !roomData.round) throw new AppError('ROUND_NOT_FOUND');
    if (roomData.round.index > roundIndex) return roomData;
    if (roomData.round.index !== roundIndex) throw new AppError('ROUND_MISMATCH');
    if (!roomData.round.settledAt) throw new AppError('ROUND_NOT_SETTLED');
    if (now < roomData.round.revealEndsAt + 300) throw new AppError('ADVANCE_TOO_EARLY');

    if (roomData.round.index + 1 >= roomData.round.total) {
      const gameId = newGameId(now);
      const result = finishGame(roomData, now, gameId);
      pendingGame = result.game;
    } else {
      roomData.history.push(roomData.round);
      startNextRound(roomData, now);
    }
    roomData.version += 1;
    roomData.lastActivityAt = now;
    return roomData;
  });

  if (pendingGame) {
    try {
      const payload = Object.assign({}, pendingGame);
      delete payload._id;
      await ctx.db.collection('games').doc(pendingGame._id).set({ data: payload });
      await applyGameStats(ctx.db, pendingGame._id);
    } catch (err) {
      console.error('[advance] game/stats failed', err);
    }
  }
  await syncViews(ctx.db, room);
  return { view: viewFor(room, ctx.openid) };
}

async function rematch(data, ctx) {
  const code = assertRoomCode(data.roomCode);
  const now = Date.now();

  const room = await runRoomTx(ctx.db, code, async (roomData) => {
    if (roomData.status === 'waiting') return roomData;
    if (roomData.status !== 'settled') throw new AppError('ROOM_CLOSED');
    if (roomData.ownerId !== ctx.openid) throw new AppError('NOT_OWNER');

    const active = activePlayers(roomData).sort((a, b) => a.seat - b.seat);
    const owner = roomData.players.find((p) => p.openid === roomData.ownerId && !p.left) || active[0];
    roomData.ownerId = owner ? owner.openid : '';
    active.forEach((p, index) => {
      p.seat = index + 1;
      p.score = 0;
      p.correctCount = 0;
      p.correctTimeMs = 0;
      p.answeredCount = 0;
    });
    roomData.players = active;
    roomData.status = 'waiting';
    roomData.round = null;
    roomData.history = [];
    roomData.questionIds = [];
    roomData.questionPool = [];
    roomData.final = null;
    roomData.gameId = null;
    roomData.startedAt = null;
    roomData.rematchCount = (roomData.rematchCount || 0) + 1;
    roomData.version += 1;
    roomData.lastActivityAt = now;
    return roomData;
  });

  await syncViews(ctx.db, room);
  return { view: viewFor(room, ctx.openid) };
}

module.exports = { create, join, state, heartbeat, leave, start, answer, settle, advance, rematch };
