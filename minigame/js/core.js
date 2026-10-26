const ENV_ID = 'cloud1-d3gvxmgkx8fcfc083';
const VERSION = '0.1.0';

const COLORS = {
  // 果汁街机：奶油纸底 + 深可可描边 + 水果糖色
  ink: '#2E1B10',
  ink2: '#6B4A35',
  ink3: '#A98B77',
  paper: '#FFF4E3',
  paper2: '#FFE7C8',
  cream: '#FFF0DA',
  card: '#FFFDF7',

  orange: '#FF7A2F',
  orangeDeep: '#DD4F12',
  orangeSoft: '#FFDFC6',
  lime: '#A8D94C',
  limeDeep: '#4F8A16',
  limeSoft: '#EAF8D4',
  butter: '#FFCB3D',
  butterDeep: '#A87200',
  butterSoft: '#FFF2CC',
  berry: '#FF5D78',
  berryDeep: '#C41F3D',
  berrySoft: '#FFE0E7',
  grape: '#9C8BF7',
  grapeDeep: '#5841C4',
  grapeSoft: '#ECE6FF',
  sky: '#4FC4EC',
  skyDeep: '#17708F',
  skySoft: '#DDF3FC',

  success: '#4F9E24',
  successSoft: '#EAF8D4',
  successInk: '#2F6B0E',
  danger: '#D62C43',
  dangerSoft: '#FFE0E7',
  dangerInk: '#9E142B',
  warning: '#B37A00',
  warningSoft: '#FFF2CC',
  warningInk: '#8A5C00',
  info: '#17708F',
  infoSoft: '#DDF3FC',
  infoInk: '#135F79',
  disabled: '#E9DCC9',
  disabledInk: '#A98B77',

  // 旧命名保留，避免遗留引用失效
  bg: '#FFF4E3',
  surface: '#FFFDF7',
  surface2: '#FFF6E8',
  primary: '#FF7A2F',
  primaryDark: '#DD4F12',
  primarySoft: '#FFDFC6',
  primaryBorder: '#FFC9A6',
  primaryInk: '#B23E0C',
  onPrimary: '#2E1B10',
  text: '#2E1B10',
  text2: '#6B4A35',
  text3: '#A98B77',
  border: '#E9D8C2',
  divider: '#F2E3D0',
  disabledBg: '#E9DCC9',
  disabledText: '#A98B77',
  aSoft: '#FFE2CB',
  aInk: '#B23E0C',
  bSoft: '#E8F7D0',
  bInk: '#457A12',
  cSoft: '#FFF0C2',
  cInk: '#8A5C00',
  dSoft: '#E9E1FF',
  dInk: '#4E38B0',
};

const OPTION_STYLES = [
  { fill: '#FFE3CD', accent: '#FF7A2F', ink: '#A9390B' },
  { fill: '#E7F6CF', accent: '#A8D94C', ink: '#457A12' },
  { fill: '#FFEFC0', accent: '#FFCB3D', ink: '#8A5C00' },
  { fill: '#E8E0FF', accent: '#9C8BF7', ink: '#4E38B0' },
];

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
  OPTION_STYLES,
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
