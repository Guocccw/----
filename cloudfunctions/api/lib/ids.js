const crypto = require('crypto');

function uidOf(openid) {
  return crypto.createHash('md5').update(String(openid)).digest('hex').slice(0, 16);
}

function hash16(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, 16);
}

function newPlayerId(existing) {
  for (let i = 0; i < 8; i++) {
    const id = crypto.randomBytes(4).toString('hex');
    if (!existing || !existing.has(id)) return id;
  }
  throw new Error('player id exhausted');
}

function newGameId(now) {
  return 'g_' + now + '_' + crypto.randomBytes(2).toString('hex');
}

function newRoomCode() {
  return String(crypto.randomInt(100000, 1000000));
}

module.exports = { uidOf, hash16, newPlayerId, newGameId, newRoomCode };
