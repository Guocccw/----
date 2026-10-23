const test = require('node:test');
const assert = require('node:assert/strict');
const { weekKeyOf, weekRange } = require('../../cloudfunctions/api/lib/time');

test('周日晚与周一早分属不同周（Asia/Shanghai）', () => {
  const sunday = Date.parse('2026-10-18T23:59:59+08:00');
  const monday = Date.parse('2026-10-19T00:00:00+08:00');
  assert.equal(weekKeyOf(sunday), '20261012');
  assert.equal(weekKeyOf(monday), '20261019');
});

test('周范围从周一到周日', () => {
  const range = weekRange(Date.parse('2026-10-22T12:00:00+08:00'));
  assert.equal(range.weekKey, '20261019');
  assert.equal(new Date(range.weekStartAt + 8 * 3600 * 1000).toISOString().slice(0, 10), '2026-10-19');
  assert.equal(range.weekEndAt - range.weekStartAt, 7 * 24 * 3600 * 1000 - 1);
});
