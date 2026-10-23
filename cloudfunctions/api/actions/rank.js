const { weekRange } = require('../lib/time');

function fmt(ts) {
  const d = new Date(ts + 8 * 3600 * 1000);
  return d.getUTCMonth() + 1 + '.' + d.getUTCDate();
}

function sanitize(entry) {
  return {
    uid: entry.uid,
    nickName: entry.nickName,
    avatar: entry.avatar,
    score: entry.score || 0,
    games: entry.games || 0,
    wins: entry.wins || 0,
    bestScore: entry.bestScore || 0,
    firstRankAt: entry.firstRankAt || 0,
  };
}

async function meta(data, ctx) {
  const range = weekRange(ctx.now);
  return {
    weekKey: range.weekKey,
    weekStartAt: range.weekStartAt,
    weekEndAt: range.weekEndAt,
    weekText: '本周 ' + fmt(range.weekStartAt) + ' – ' + fmt(range.weekEndAt),
  };
}

async function weekly(data, ctx) {
  const range = weekRange(ctx.now);
  const db = ctx.db;
  const _ = ctx._;

  // 首版周榜数据量小，全量读取后在内存排序，避免依赖复合索引。
  const allRes = await db.collection('leaderboards_weekly').limit(1000).get();
  const visible = (allRes.data || [])
    .filter((entry) => entry.weekKey === range.weekKey && entry.visible !== false)
    .sort((a, b) => {
      if ((b.rankScore || 0) !== (a.rankScore || 0)) return (b.rankScore || 0) - (a.rankScore || 0);
      return (a.firstRankAt || 0) - (b.firstRankAt || 0);
    });

  const top = visible.slice(0, 50).map((entry, index) =>
    Object.assign(sanitize(entry), { rank: index + 1 })
  );

  const user = await ctx.db.collection('users').doc(ctx.openid).get().catch(() => null);
  const uid = user && user.data ? user.data.uid : '';
  if (!uid) {
    return {
      weekKey: range.weekKey,
      weekStartAt: range.weekStartAt,
      weekEndAt: range.weekEndAt,
      weekText: '本周 ' + fmt(range.weekStartAt) + ' – ' + fmt(range.weekEndAt),
      top,
      me: null,
      myRank: null,
    };
  }

  const index = visible.findIndex((entry) => entry.uid === uid);
  const mine = index >= 0 ? visible[index] : null;
  const myRank = index >= 0 ? index + 1 : null;

  return {
    weekKey: range.weekKey,
    weekStartAt: range.weekStartAt,
    weekEndAt: range.weekEndAt,
    weekText: '本周 ' + fmt(range.weekStartAt) + ' – ' + fmt(range.weekEndAt),
    top,
    me: mine ? sanitize(mine) : null,
    myRank,
  };
}

module.exports = { meta, weekly };
