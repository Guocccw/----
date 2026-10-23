const { APP_VERSION } = require('../constants/config');
const clock = require('./clock');
const { MESSAGES } = require('../constants/errors');

class ApiError extends Error {
  constructor(name, code, message, retryable, detail) {
    super(message || MESSAGES[name] || '服务开小差了');
    this.name = name || 'SYSTEM_ERROR';
    this.code = code || 5005;
    this.retryable = !!retryable;
    this.detail = detail || null;
  }
}

function makeRequestId() {
  return 't_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
}

function call(action, data, options) {
  const opts = options || {};
  const timeout = opts.timeout || 8000;
  const t0 = Date.now();
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new ApiError('NETWORK_ERROR', 9001, '网络开小差了，点此重试', true));
    }, timeout);

    wx.cloud
      .callFunction({
        name: 'api',
        data: {
          action,
          data: data || {},
          requestId: makeRequestId(),
          clientVersion: APP_VERSION,
        },
      })
      .then((res) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        const body = (res && res.result) || {};
        if (body.serverTime) clock.sync(body.serverTime, t0, Date.now());
        if (!body.ok) {
          const e = body.error || {};
          reject(
            new ApiError(
              e.name || 'SYSTEM_ERROR',
              e.code || 5005,
              e.message || '服务开小差了',
              e.retryable,
              e.detail
            )
          );
          return;
        }
        resolve(body.data || {});
      })
      .catch(() => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(new ApiError('NETWORK_ERROR', 9001, '网络开小差了，点此重试', true));
      });
  });
}

module.exports = { call, ApiError };
