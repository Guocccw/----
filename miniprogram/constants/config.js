// 云开发环境 ID：留空时使用当前默认环境；正式环境请填写。
const ENV_ID = '';
const APP_VERSION = '0.1.0';

const DEFAULT_CONFIG = {
  questionCount: 10,
  durationSec: 15,
  category: 'general',
};

const MAX_PLAYERS = 4;
const MIN_PLAYERS = 2;

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];
const OPTION_CLASS = ['a', 'b', 'c', 'd'];

module.exports = {
  ENV_ID,
  APP_VERSION,
  DEFAULT_CONFIG,
  MAX_PLAYERS,
  MIN_PLAYERS,
  OPTION_LETTERS,
  OPTION_CLASS,
};
