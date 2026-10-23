const { AppError } = require('../lib/errors');
const { rankPlayers } = require('./ranking');

function activePlayers(room) {
  return room.players.filter((p) => !p.left);
}

function findPlayer(room, openid) {
  return room.players.find((p) => p.openid === openid);
}

function findPlayerById(room, playerId) {
  return room.players.find((p) => p.playerId === playerId);
}

function requireActivePlayer(room, openid) {
  const player = findPlayer(room, openid);
  if (!player || player.left) throw new AppError('NOT_IN_ROOM');
  return player;
}

function findAnswer(room, playerId) {
  if (!room.round || !room.round.answers) return null;
  return room.round.answers.find((a) => a.playerId === playerId) || null;
}

function allAnswered(room) {
  const active = activePlayers(room);
  if (!active.length) return false;
  return active.every((p) => !!findAnswer(room, p.playerId));
}

function settleRound(room, now) {
  if (!room.round || room.round.settledAt) return;
  const answers = new Map((room.round.answers || []).map((a) => [a.playerId, a]));
  for (const player of room.players) {
    const answer = answers.get(player.playerId);
    if (!answer) continue;
    player.score = (player.score || 0) + (answer.gain || 0);
    if (answer.correct) {
      player.correctCount = (player.correctCount || 0) + 1;
      player.correctTimeMs = (player.correctTimeMs || 0) + Math.max(0, answer.submittedAt - room.round.startedAt);
    }
  }
  room.round.settledAt = now;
  room.round.revealEndsAt = now + Number(room.config.revealSec || 3) * 1000;
  room.lastActivityAt = now;
}

function startNextRound(room, now) {
  const index = room.round.index + 1;
  const q = room.questionPool[index];
  if (!q) throw new AppError('ROUND_NOT_FOUND');
  const startAt = now + 1000;
  room.round = {
    index,
    total: room.config.questionCount,
    questionId: q._id,
    question: { stem: q.stem, options: q.options, explain: q.explain || null },
    answerIndex: q.answerIndex,
    startedAt: startAt,
    endsAt: startAt + Number(room.config.durationSec) * 1000,
    settledAt: null,
    revealEndsAt: null,
    answers: [],
  };
}

function finishGame(room, now, gameId) {
  if (room.round) room.history.push(room.round);
  const rankings = rankPlayers(room.players);
  const active = activePlayers(room);
  const valid = active.length >= 2;
  room.status = 'settled';
  room.gameId = gameId;
  room.final = {
    rankings,
    winnerId: rankings.length ? rankings[0].playerId : '',
    finishedAt: now,
  };
  room.round = null;
  room.lastActivityAt = now;

  const game = {
    _id: gameId,
    roomCode: room._id,
    questionIds: room.questionIds || [],
    players: rankings.map((r) => {
      const p = findPlayerById(room, r.playerId) || {};
      return Object.assign({}, r, { openid: p.openid || '', left: !!p.left });
    }),
    rounds: (room.history || []).map((r) => ({
      index: r.index,
      questionId: r.questionId,
      correctIndex: r.answerIndex,
      startedAt: r.startedAt,
      endsAt: r.endsAt,
      settledAt: r.settledAt,
      answers: (r.answers || []).map((a) => ({
        playerId: a.playerId,
        choice: a.choice,
        submittedAt: a.submittedAt,
        correct: a.correct,
        gain: a.gain,
      })),
    })),
    startedAt: room.startedAt,
    endedAt: now,
    valid,
    abandoned: false,
    statsApplied: false,
    createdAt: now,
  };
  return { game, rankings, valid };
}

module.exports = {
  activePlayers,
  findPlayer,
  findPlayerById,
  requireActivePlayer,
  findAnswer,
  allAnswered,
  settleRound,
  startNextRound,
  finishGame,
};
