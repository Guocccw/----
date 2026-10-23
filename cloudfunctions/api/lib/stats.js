const { weekRange } = require('./time');
const { rankScoreOf } = require('../domain/ranking');

function isNotFound(err) {
  const msg = String((err && (err.errMsg || err.message)) || '');
  return /does not exist|not exist|DATABASE_DOCUMENT_NOT_EXIST/i.test(msg);
}

async function applyGameStats(db, gameId) {
  let game;
  try {
    const snap = await db.collection('games').doc(gameId).get();
    game = snap.data;
  } catch (err) {
    return false;
  }
  if (!game || game.statsApplied) return true;

  if (!game.valid || game.abandoned) {
    await db.collection('games').doc(gameId).update({
      data: { statsApplied: true, statsAppliedAt: Date.now(), statsSkipReason: 'invalid' },
    });
    return true;
  }

  const range = weekRange(game.endedAt);

  for (const p of game.players || []) {
    if (p.left || !p.openid) continue;

    let user;
    try {
      const snap = await db.collection('users').doc(p.openid).get();
      user = snap.data;
    } catch (err) {
      continue;
    }
    if (!user) continue;

    const isWin = p.rank === 1;
    const stats = Object.assign({}, user.stats || {}, {
      games: ((user.stats && user.stats.games) || 0) + 1,
      wins: ((user.stats && user.stats.wins) || 0) + (isWin ? 1 : 0),
      bestScore: Math.max((user.stats && user.stats.bestScore) || 0, p.score || 0),
      bestScoreAt:
        (p.score || 0) > ((user.stats && user.stats.bestScore) || 0)
          ? game.endedAt
          : (user.stats && user.stats.bestScoreAt) || 0,
      totalCorrect: ((user.stats && user.stats.totalCorrect) || 0) + (p.correctCount || 0),
      totalAnswered: ((user.stats && user.stats.totalAnswered) || 0) + (game.questionIds || []).length,
      totalPlayMs: ((user.stats && user.stats.totalPlayMs) || 0) + Math.max(0, game.endedAt - game.startedAt),
    });

    await db.collection('users').doc(p.openid).update({
      data: { stats, lastSeenAt: Date.now() },
    });

    if (user.settings && user.settings.rankOptOut) continue;

    const id = range.weekKey + '_' + user.uid;
    let current = null;
    try {
      const snap = await db.collection('leaderboards_weekly').doc(id).get();
      current = snap.data;
    } catch (err) {
      if (!isNotFound(err)) throw err;
    }

    if (!current) {
      const score = p.score || 0;
      const wins = isWin ? 1 : 0;
      const bestScore = p.score || 0;
      await db.collection('leaderboards_weekly').doc(id).set({
        data: {
          weekKey: range.weekKey,
          uid: user.uid,
          nickName: user.nickName,
          avatar: user.avatar,
          score,
          games: 1,
          wins,
          bestScore,
          firstRankAt: game.endedAt,
          rankScore: rankScoreOf({ score, wins, bestScore }),
          visible: true,
          updatedAt: game.endedAt,
        },
      });
    } else {
      const score = (current.score || 0) + (p.score || 0);
      const wins = (current.wins || 0) + (isWin ? 1 : 0);
      const bestScore = Math.max(current.bestScore || 0, p.score || 0);
      await db.collection('leaderboards_weekly').doc(id).update({
        data: {
          nickName: user.nickName,
          avatar: user.avatar,
          score,
          games: (current.games || 0) + 1,
          wins,
          bestScore,
          rankScore: rankScoreOf({ score, wins, bestScore }),
          updatedAt: game.endedAt,
        },
      });
    }
  }

  await db.collection('games').doc(gameId).update({
    data: { statsApplied: true, statsAppliedAt: Date.now() },
  });
  return true;
}

module.exports = { applyGameStats };
