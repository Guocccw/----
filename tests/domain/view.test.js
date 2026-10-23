const test = require('node:test');
const assert = require('node:assert/strict');
const { projectView } = require('../../cloudfunctions/api/domain/view');
const { finishGame } = require('../../cloudfunctions/api/domain/room');

function makeRoom() {
  return {
    _id: '123456',
    ownerId: 'oa',
    status: 'playing',
    version: 7,
    config: { questionCount: 1, durationSec: 15, revealSec: 3 },
    players: [
      {
        playerId: 'pa',
        openid: 'oa',
        nickName: 'A',
        avatar: { type: 'emoji', value: '🍎', bg: '#FFE3D5' },
        seat: 1,
        joinedAt: 1,
        left: false,
        score: 0,
        correctCount: 0,
        correctTimeMs: 0,
      },
      {
        playerId: 'pb',
        openid: 'ob',
        nickName: 'B',
        avatar: { type: 'emoji', value: '🍋', bg: '#FFF3C4' },
        seat: 2,
        joinedAt: 2,
        left: false,
        score: 0,
        correctCount: 0,
        correctTimeMs: 0,
      },
    ],
    round: {
      index: 0,
      total: 1,
      questionId: 'q1',
      question: { stem: '题干', options: ['A', 'B', 'C', 'D'], explain: null },
      answerIndex: 2,
      startedAt: 1000,
      endsAt: 16000,
      settledAt: null,
      revealEndsAt: null,
      answers: [{ playerId: 'pa', choice: 2, submittedAt: 5000, correct: true, gain: 130 }],
    },
    history: [],
  };
}

test('未结算视图不泄露答案与他人选择', () => {
  const room = makeRoom();
  const view = projectView(room, room.players[0]);
  assert.equal(view.round.correctIndex, null);
  assert.equal(view.round.myChoice, 2);
  assert.equal(view.round.myCorrect, null);
  assert.equal(view.round.perPlayer[0].correct, null);
  assert.equal(JSON.stringify(view).includes('answerIndex'), false);
  assert.equal(JSON.stringify(view).includes('"choice"'), false);
});

test('结算后视图包含正确项与本题得分', () => {
  const room = makeRoom();
  room.round.settledAt = 16000;
  room.round.revealEndsAt = 19000;
  const view = projectView(room, room.players[0]);
  assert.equal(view.round.correctIndex, 2);
  assert.equal(view.round.myCorrect, true);
  assert.equal(view.round.myGain, 130);
  assert.equal(view.round.perPlayer[0].correct, true);
});

test('结束对局写入 final 与 game 历史', () => {
  const room = makeRoom();
  room.round.settledAt = 16000;
  room.round.revealEndsAt = 19000;
  room.history.push(room.round);
  room.round = null;
  const result = finishGame(room, 20000, 'g1');
  assert.equal(room.status, 'settled');
  assert.equal(room.final.winnerId, 'pa');
  assert.equal(result.game.rounds.length, 1);
  assert.equal(result.game.valid, true);
});
