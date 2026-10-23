function isNotFound(err) {
  const msg = (err && (err.errMsg || err.message)) || '';
  return /does not exist|not exist|DATABASE_DOCUMENT_NOT_EXIST|文档不存在/i.test(msg);
}

function createPoller(options) {
  const viewId = options.viewId;
  const getInterval = typeof options.interval === 'function'
    ? options.interval
    : () => options.interval || 1000;
  let timer = null;
  let stopped = true;
  let inFlight = false;
  let failures = 0;

  async function tick() {
    if (stopped || inFlight) return;
    inFlight = true;
    try {
      const res = await wx.cloud
        .database()
        .collection('room_views')
        .doc(viewId)
        .get();
      failures = 0;
      if (res && res.data && options.onView) options.onView(res.data);
    } catch (err) {
      if (isNotFound(err)) {
        stopped = true;
        if (options.onGone) options.onGone();
        return;
      }
      failures += 1;
      if (options.onError) options.onError(err, failures);
    } finally {
      inFlight = false;
      schedule();
    }
  }

  function schedule() {
    if (stopped) return;
    const base = Math.max(300, getInterval());
    const delay = failures
      ? Math.min(10000, 1000 * Math.pow(2, Math.min(failures - 1, 4)))
      : base;
    timer = setTimeout(tick, delay);
  }

  function start() {
    if (!stopped) return;
    stopped = false;
    failures = 0;
    tick();
  }

  function stop() {
    stopped = true;
    if (timer) clearTimeout(timer);
    timer = null;
  }

  function refresh() {
    return tick();
  }

  return { start, stop, refresh };
}

module.exports = { createPoller };
