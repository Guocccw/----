const { activePlayers, findAnswer } = require('./room');

function projectView(room, player) {
  const now = Date.now();
  const active = activePlayers(room);
  const round = room.round;
  const settled = !!(round && round.settledAt);
  const myAnswer = round ? findAnswer(room, player.playerId) : null;
  const myCorrect = settled && myAnswer ? !!myAnswer.correct : null;
  const myGain = settled && myAnswer ? Number(myAnswer.gain || 0) : null;

  return {
    _id: room._id + '_' + player.playerId,
    roomCode: room._id,
    playerId: player.playerId,
    openid: player.openid,
    version: room.version,
    status: room.status,
    ownerId: room.ownerId,
    isOwner: room.ownerId === player.openid,
    config: {
      questionCount: room.config.questionCount,
      durationSec: room.config.durationSec,
      revealSec: room.config.revealSec,
    },
    players: room.players.map((p) => ({
      playerId: p.playerId,
      nickName: p.nickName,
      avatar: p.avatar,
      seat: p.seat,
      score: p.score || 0,
      isOwner: p.openid === room.ownerId,
      correctCount: p.correctCount || 0,
      left: !!p.left,
      lastSeenAt: p.lastSeenAt || 0,
    })),
    round: round
      ? {
          index: round.index,
          total: round.total,
          stem: round.question.stem,
          options: round.question.options,
          startedAt: round.startedAt,
          endsAt: round.endsAt,
          revealEndsAt: round.revealEndsAt || null,
          correctIndex: settled ? round.answerIndex : null,
          explain: settled ? round.question.explain || null : null,
          myChoice: myAnswer ? myAnswer.choice : null,
          myCorrect,
          myGain,
          answeredCount: active.filter((p) => !!findAnswer(room, p.playerId)).length,
          activeCount: active.length,
          perPlayer: active.map((p) => {
            const a = findAnswer(room, p.playerId);
            return {
              playerId: p.playerId,
              answered: !!a,
              correct: settled && a ? !!a.correct : null,
              gain: settled && a ? Number(a.gain || 0) : null,
            };
          }),
        }
      : null,
    final: room.final || null,
    updatedAt: now,
  };
}

module.exports = { projectView };
