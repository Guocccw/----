const test = require('node:test');
const assert = require('node:assert/strict');
const { scoreAnswer } = require('../../cloudfunctions/api/domain/scoring');

test('满分：15 秒题剩余 15 秒', () => {
  assert.equal(
    scoreAnswer({ correct: true, submittedAt: 0, endsAt: 15000, durationMs: 15000 }),
    150
  );
});

test('12 秒答对得 140', () => {
  assert.equal(
    scoreAnswer({ correct: true, submittedAt: 3000, endsAt: 15000, durationMs: 15000 }),
    140
  );
});

test('2.4 秒答对得 108', () => {
  assert.equal(
    scoreAnswer({ correct: true, submittedAt: 12600, endsAt: 15000, durationMs: 15000 }),
    108
  );
});

test('宽限期提交速度分为 0', () => {
  assert.equal(
    scoreAnswer({ correct: true, submittedAt: 15400, endsAt: 15000, durationMs: 15000 }),
    100
  );
});

test('答错得 0', () => {
  assert.equal(
    scoreAnswer({ correct: false, submittedAt: 0, endsAt: 15000, durationMs: 15000 }),
    0
  );
});

test('速度分不会越界', () => {
  const fast = scoreAnswer({ correct: true, submittedAt: -1000, endsAt: 15000, durationMs: 15000 });
  const slow = scoreAnswer({ correct: true, submittedAt: 999999, endsAt: 15000, durationMs: 15000 });
  assert.equal(fast, 150);
  assert.equal(slow, 100);
});
