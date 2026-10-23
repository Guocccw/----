const test = require('node:test');
const assert = require('node:assert/strict');
const { rankPlayers, rankScoreOf } = require('../../cloudfunctions/api/domain/ranking');

function p(id, score, correct, time, joined) {
  return {
    playerId: id,
    nickName: id,
    avatar: {},
    score,
    correctCount: correct,
    correctTimeMs: time,
    joinedAt: joined,
  };
}

test('按总分、答对、正确题用时、加入时间排序', () => {
  const list = [
    p('a', 100, 1, 10000, 1),
    p('b', 200, 1, 20000, 2),
    p('c', 200, 2, 30000, 3),
    p('d', 200, 2, 10000, 4),
  ];
  const ranked = rankPlayers(list);
  assert.deepEqual(ranked.map((x) => x.playerId), ['d', 'c', 'b', 'a']);
  assert.deepEqual(ranked.map((x) => x.rank), [1, 2, 3, 4]);
});

test('已离开玩家仍参与排名', () => {
  const ranked = rankPlayers([
    Object.assign(p('a', 100, 1, 1000, 1), { left: true }),
    p('b', 90, 1, 1000, 2),
  ]);
  assert.equal(ranked[0].playerId, 'a');
  assert.equal(ranked[0].left, true);
});

test('rankScore 单调且可比较', () => {
  const a = rankScoreOf({ score: 100, wins: 1, bestScore: 100 });
  const b = rankScoreOf({ score: 101, wins: 0, bestScore: 100 });
  const c = rankScoreOf({ score: 100, wins: 2, bestScore: 100 });
  assert.ok(b > a);
  assert.ok(c > a);
  assert.ok(c < b);
});
