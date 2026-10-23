const { AppError } = require('./errors');

function checkRate(user, key, limit, now) {
  const rate = Object.assign({}, user.rate || {});
  const cur = rate[key] || { windowStart: now, count: 0 };
  if (!cur.windowStart || now - cur.windowStart > 60 * 1000) {
    cur.windowStart = now;
    cur.count = 0;
  }
  if (cur.count >= limit) throw new AppError('RATE_LIMITED', { key });
  cur.count += 1;
  rate[key] = cur;
  return rate;
}

module.exports = { checkRate };
