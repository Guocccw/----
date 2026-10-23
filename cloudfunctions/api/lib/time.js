const SHANGHAI_OFFSET = 8 * 3600 * 1000;
const DAY = 24 * 3600 * 1000;

function mondayStartOf(ts) {
  const d = new Date(Number(ts) + SHANGHAI_OFFSET);
  const day = d.getUTCDay();
  const diff = (day + 6) % 7;
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - diff);
}

function weekKeyOf(ts) {
  const monday = new Date(mondayStartOf(ts));
  const y = monday.getUTCFullYear();
  const mm = String(monday.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(monday.getUTCDate()).padStart(2, '0');
  return `${y}${mm}${dd}`;
}

function weekRange(ts) {
  const start = mondayStartOf(ts);
  return {
    weekKey: weekKeyOf(ts),
    weekStartAt: start,
    weekEndAt: start + 7 * DAY - 1,
  };
}

module.exports = { weekKeyOf, weekRange, mondayStartOf };
