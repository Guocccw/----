const test = require('node:test');
const assert = require('node:assert/strict');
const { settleRound, allAnswered, activePlayers } = require('../../cloudfunctions/api/domain/room');

function room() {
  return {
    config: { revealSec: 3 },
    players: [
      { playerId: 'a', openid: 'oa', score: 0, correctCount: 0, correctTimeMs: 0 },
      { playerId: 'b', openid: 'ob', score: 0, correctCount: 0, correctTimeMs: 0 },
    ],
    round: {
      startedAt: 1000,
      endsAt: 16000,
      settledAt: null,
      revealEndsAt: null,
      answers: [],
    },
  };
}

test('全员已答判断排除已离开玩家', () => {
  const r = room();
  r.players[1].left = true;
  r.round.answers.push({ playerId: 'a', choice: 0, submittedAt: 2000, correct: true, gain: 140 });
  assert.equal(activePlayers(r).length, 1);
  assert.equal(allAnswered(r), true);
});

test('结算只加一次分，并累计正确题用时', () => {
  const r = room();
  r.round.answers.push({ playerId: 'a', choice: 0, submittedAt: 5000, correct: true, gain: 130 });
  r.round.answers.push({ playerId: 'b', choice: 1, submittedAt: 6000, correct: false, gain: 0 });
  settleRound(r, 16000);
  settleRound(r, 17000);
  assert.equal(r.players[0].score, 130);
  assert.equal(r.players[0].correctCount, 1);
  assert.equal(r.players[0].correctTimeMs, 4000);
  assert.equal(r.players[1].score, 0);
  assert.equal(r.round.revealEndsAt, 19000);
});
