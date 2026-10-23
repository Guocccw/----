const { AppError } = require('./errors');

const COUNTS = [10, 15, 20];
const DURATIONS = [10, 15, 20];
const EMOJIS = ['🍎', '🍋', '🍇', '🍉', '🍑', '🥝', '🍊', '🍓'];
const BGS = ['#FFE3D5', '#FFF3C4', '#EDE3FF', '#FFE0E4', '#FFE8DC', '#E4F7E8', '#FFEBD1', '#FFE1E6'];

function assertRoomCode(value) {
  if (typeof value !== 'string' || !/^[1-9]\d{5}$/.test(value)) {
    throw new AppError('INVALID_PARAM', { field: 'roomCode' });
  }
  return value;
}

function assertConfig(value) {
  const config = value || {};
  if (COUNTS.indexOf(Number(config.questionCount)) < 0) {
    throw new AppError('INVALID_CONFIG', { field: 'questionCount' });
  }
  if (DURATIONS.indexOf(Number(config.durationSec)) < 0) {
    throw new AppError('INVALID_CONFIG', { field: 'durationSec' });
  }
  const category = config.category || 'general';
  if (category !== 'general') throw new AppError('INVALID_CONFIG', { field: 'category' });
  return {
    questionCount: Number(config.questionCount),
    durationSec: Number(config.durationSec),
    revealSec: 3,
    countdownSec: 3,
    category,
  };
}

function assertChoice(value) {
  if (!Number.isInteger(value) || value < 0 || value > 3) {
    throw new AppError('INVALID_CHOICE');
  }
  return value;
}

function assertNickName(value) {
  const name = String(value || '').trim();
  const chars = Array.from(name);
  if (chars.length < 2 || chars.length > 12) {
    throw new AppError('INVALID_PARAM', { field: 'nickName' });
  }
  return name;
}

function assertAvatar(value) {
  if (!value || typeof value !== 'object') {
    throw new AppError('INVALID_PARAM', { field: 'avatar' });
  }
  if (value.type === 'emoji') {
    if (EMOJIS.indexOf(value.value) < 0) throw new AppError('INVALID_PARAM', { field: 'avatar' });
    if (value.bg && BGS.indexOf(value.bg) < 0) throw new AppError('INVALID_PARAM', { field: 'avatar' });
    return { type: 'emoji', value: value.value, bg: value.bg || BGS[0] };
  }
  if (value.type === 'cloud') {
    if (typeof value.value !== 'string' || value.value.indexOf('cloud://') !== 0) {
      throw new AppError('INVALID_PARAM', { field: 'avatar' });
    }
    return { type: 'cloud', value: value.value };
  }
  throw new AppError('INVALID_PARAM', { field: 'avatar' });
}

function assertInteger(value, field) {
  if (!Number.isInteger(value) || value < 0) {
    throw new AppError('INVALID_PARAM', { field });
  }
  return value;
}

module.exports = {
  COUNTS,
  DURATIONS,
  EMOJIS,
  BGS,
  assertRoomCode,
  assertConfig,
  assertChoice,
  assertNickName,
  assertAvatar,
  assertInteger,
};
