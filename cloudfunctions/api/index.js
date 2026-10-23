const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

const { ok, fail } = require('./lib/response');
const { AppError, normalizeError } = require('./lib/errors');

const routes = {
  'auth.login': require('./actions/auth').login,
  'user.updateProfile': require('./actions/auth').updateProfile,
  'user.updateSettings': require('./actions/auth').updateSettings,
  'room.create': require('./actions/room').create,
  'room.join': require('./actions/room').join,
  'room.state': require('./actions/room').state,
  'room.heartbeat': require('./actions/room').heartbeat,
  'room.leave': require('./actions/room').leave,
  'room.start': require('./actions/room').start,
  'room.answer': require('./actions/room').answer,
  'room.settle': require('./actions/room').settle,
  'room.advance': require('./actions/room').advance,
  'room.rematch': require('./actions/room').rematch,
  'rank.meta': require('./actions/rank').meta,
  'rank.weekly': require('./actions/rank').weekly,
  'event.report': require('./actions/event').report,
};

exports.main = async (event) => {
  const startedAt = Date.now();
  try {
    const action = String((event && event.action) || '');
    const handler = routes[action];
    if (!handler) throw new AppError('UNKNOWN_ACTION');

    const wxContext = cloud.getWXContext();
    if (!wxContext.OPENID) throw new AppError('UNAUTHORIZED');

    const ctx = {
      openid: wxContext.OPENID,
      db,
      _,
      cloud,
      now: Date.now(),
      requestId: String((event && event.requestId) || ''),
      clientVersion: String((event && event.clientVersion) || ''),
    };
    const data = await handler((event && event.data) || {}, ctx);
    return ok(data, Date.now());
  } catch (err) {
    const normalized = normalizeError(err);
    console.error('[api]', event && event.action, normalized.code, normalized.message, {
      requestId: event && event.requestId,
      durationMs: Date.now() - startedAt,
    });
    return fail(normalized, Date.now());
  }
};
