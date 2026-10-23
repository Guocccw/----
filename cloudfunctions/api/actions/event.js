const { AppError } = require('../lib/errors');
const { hash16 } = require('../lib/ids');

const ALLOWED = {
  app_launch: true,
  login_result: true,
  home_view: true,
  room_create: true,
  room_create_fail: true,
  room_join: true,
  room_join_fail: true,
  room_leave: true,
  game_start: true,
  question_show: true,
  answer_submit: true,
  round_settle: true,
  game_finish: true,
  rematch_click: true,
  share_click: true,
  share_enter: true,
  rank_view: true,
  profile_edit: true,
  client_error: true,
};

async function report(data, ctx) {
  const events = Array.isArray(data.events) ? data.events.slice(0, 20) : [];
  if (!events.length) throw new AppError('INVALID_PARAM', { field: 'events' });

  const clean = [];
  for (const event of events) {
    if (!event || !ALLOWED[event.name]) continue;
    const params = event.params && typeof event.params === 'object' ? event.params : {};
    const size = JSON.stringify(params).length;
    if (size > 1024) continue;
    clean.push({
      name: event.name,
      params,
      clientTs: Number(event.clientTs) || 0,
      page: String(event.page || ''),
      traceId: String(event.traceId || ''),
    });
  }
  if (!clean.length) throw new AppError('INVALID_PARAM', { field: 'events' });

  await ctx.db.collection('event_batches').add({
    data: {
      openidHash: hash16(ctx.openid),
      serverTs: ctx.now,
      clientVersion: String(data.clientVersion || ''),
      events: clean,
    },
  });
  return { accepted: clean.length };
}

module.exports = { report };
