const ENV_ID = 'cloud1-d3gvxmgkx8fcfc083';
const VERSION = '0.1.0';

const COLORS = {
  bg: '#FFF8F0',
  surface: '#FFFFFF',
  surface2: '#FFFDF9',
  primary: '#FF7A45',
  primaryDark: '#E85D2A',
  primarySoft: '#FFF0E6',
  primaryBorder: '#FFD3BF',
  primaryInk: '#B7410E',
  onPrimary: '#2D1A10',
  text: '#2D2A26',
  text2: '#6F6259',
  text3: '#9A8C80',
  border: '#F0E4D8',
  divider: '#F5EAE1',
  disabledBg: '#F6D9CC',
  disabledText: '#8A6A5C',
  success: '#2FBF71',
  successSoft: '#EAF9F0',
  successInk: '#1C7C46',
  danger: '#F2545B',
  dangerSoft: '#FFF0F1',
  dangerInk: '#C02C36',
  warning: '#F5A623',
  warningSoft: '#FFF6E5',
  warningInk: '#9A6200',
  info: '#4E8CFF',
  infoSoft: '#EAF1FF',
  infoInk: '#2F5FD0',
  aSoft: '#FFF1E8',
  aInk: '#B7410E',
  bSoft: '#EAF6EC',
  bInk: '#1C7C46',
  cSoft: '#FFF6E0',
  cInk: '#8A5A00',
  dSoft: '#EEEBFF',
  dInk: '#4B3FA8',
};

const EMOJIS = ['🍎', '🍋', '🍇', '🍉', '🍑', '🥝', '🍊', '🍓'];
const AVATAR_BGS = ['#FFE3D5', '#FFF3C4', '#EDE3FF', '#FFE0E4', '#FFE8DC', '#E4F7E8', '#FFEBD1', '#FFE1E6'];

const MESSAGES = {
  INVALID_PARAM: '参数不对，检查一下',
  UNAUTHORIZED: '登录失效，请重进',
  RATE_LIMITED: '操作太频繁，稍后再试',
  CONTENT_UNSAFE: '昵称包含不合适内容',
  ROOM_NOT_FOUND: '房间不存在，检查房间码',
  ROOM_FULL: '房间满了，4 人已到齐',
  ROOM_STARTED: '这局已经开始了',
  ROOM_CLOSED: '房间已解散',
  NOT_OWNER: '只有房主可以操作',
  NOT_ENOUGH_PLAYERS: '至少 2 人才能开始',
  NOT_IN_ROOM: '你不在这个房间里',
  ALREADY_IN_ROOM: '你还有一局没打完',
  KICKED: '你已被房主移出房间',
  ALREADY_ANSWERED: '这题已经答过了',
  ROUND_ENDED: '这题已经结束了',
  ROUND_MISMATCH: '题目变了，刷新一下',
  SETTLE_TOO_EARLY: '还没到结算时间',
  ADVANCE_TOO_EARLY: '揭晓还没结束',
  QUESTION_NOT_ENOUGH: '题库准备中，稍后再试',
  NETWORK_ERROR: '网络开小差了，点此重试',
  CLOUD_NOT_OPEN: '请先开通云开发',
  SYSTEM_ERROR: '服务开小差了',
};

class ApiError extends Error {
  constructor(name, code, message, retryable) {
    super(message || MESSAGES[name] || MESSAGES.SYSTEM_ERROR);
    this.name = name || 'SYSTEM_ERROR';
    this.code = code || 5005;
    this.retryable = !!retryable;
  }
}

let clockOffset = 0;
const clockSamples = [];

function syncClock(serverTime, t0, t1) {
  if (!serverTime) return;
  const sample = serverTime - (t0 + t1) / 2;
  if (clockSamples.length && Math.abs(sample - clockOffset) > 5000) clockSamples.length = 0;
  clockSamples.push(sample);
  if (clockSamples.length > 5) clockSamples.shift();
  const sorted = clockSamples.slice().sort((a, b) => a - b);
  clockOffset = sorted[Math.floor(sorted.length / 2)];
}

function now() {
  return Date.now() + clockOffset;
}

function requestId() {
  return 't_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
}

function call(action, data, timeout) {
  const limit = timeout || 8000;
  const t0 = Date.now();
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new ApiError('NETWORK_ERROR', 9001, MESSAGES.NETWORK_ERROR, true));
    }, limit);

    wx.cloud.callFunction({
      name: 'api',
      data: { action, data: data || {}, requestId: requestId(), clientVersion: VERSION },
      success(res) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        const body = (res && res.result) || {};
        if (body.serverTime) syncClock(body.serverTime, t0, Date.now());
        if (!body.ok) {
          const e = body.error || {};
          reject(new ApiError(e.name, e.code, e.message, e.retryable));
          return;
        }
        resolve(body.data || {});
      },
      fail(err) {
        const raw = String((err && (err.errMsg || err.message)) || '');
        console.error('[guoguo] cloud call failed', action, raw);
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (raw.indexOf('-601034') >= 0 || raw.indexOf('没有权限') >= 0) {
          reject(new ApiError('CLOUD_NOT_OPEN', 9002, MESSAGES.CLOUD_NOT_OPEN, false));
          return;
        }
        reject(new ApiError('NETWORK_ERROR', 9001, MESSAGES.NETWORK_ERROR, true));
      },
    });
  });
}

function messageFor(err) {
  if (!err) return MESSAGES.SYSTEM_ERROR;
  return err.message || MESSAGES[err.name] || MESSAGES.SYSTEM_ERROR;
}

function toast(title, icon) {
  wx.showToast({ title: String(title || '').slice(0, 20), icon: icon || 'none', duration: 1800 });
}

function formatScore(n) {
  return String(Math.max(0, Math.round(Number(n) || 0)));
}

function formatDuration(ms) {
  const value = Math.max(0, Number(ms) || 0);
  if (value < 1000) return '0.0s';
  return (value / 1000).toFixed(1) + 's';
}

function avatarOf(user) {
  if (user && user.avatar && user.avatar.value) return user.avatar;
  return { type: 'emoji', value: '🍎', bg: '#FFE3D5' };
}

function avatarText(avatar) {
  if (!avatar || !avatar.value) return '🍎';
  if (avatar.type === 'cloud') return '🍎';
  return avatar.value;
}

function avatarBg(avatar) {
  if (avatar && avatar.bg) return avatar.bg;
  return '#FFE3D5';
}

function getWindowInfo() {
  try {
    if (wx.getWindowInfo) return wx.getWindowInfo();
  } catch (err) {}
  return wx.getSystemInfoSync();
}

module.exports = {
  ENV_ID,
  VERSION,
  COLORS,
  EMOJIS,
  AVATAR_BGS,
  MESSAGES,
  ApiError,
  call,
  now,
  messageFor,
  toast,
  formatScore,
  formatDuration,
  avatarOf,
  avatarText,
  avatarBg,
  getWindowInfo,
};
