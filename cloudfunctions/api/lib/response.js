function ok(data, serverTime) {
  return { ok: true, data: data || {}, serverTime };
}

function fail(error, serverTime) {
  return { ok: false, error, serverTime };
}

module.exports = { ok, fail };
