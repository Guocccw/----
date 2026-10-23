const FALLBACK = '服务开小差了，稍后再试';

const MESSAGES = {
  INVALID_PARAM: '参数不对，检查一下',
  UNAUTHORIZED: '登录失效，请重进',
  RATE_LIMITED: '操作太频繁，稍后再试',
  CONTENT_UNSAFE: '昵称包含不合适内容，请修改',
  USER_NOT_FOUND: '账号信息还没准备好',
  ROOM_NOT_FOUND: '房间不存在，检查一下房间码',
  ROOM_FULL: '房间满了，4 个人已经到齐',
  ROOM_STARTED: '这局已经开始了，等下一局吧',
  ROOM_CLOSED: '房间已解散',
  NOT_OWNER: '只有房主可以操作',
  NOT_ENOUGH_PLAYERS: '至少 2 个人才能开始',
  NOT_IN_ROOM: '你不在这个房间里',
  ALREADY_IN_ROOM: '你还有一局没打完',
  INVALID_CONFIG: '房间配置不对',
  KICKED: '你已被房主移出房间',
  ROUND_NOT_FOUND: '当前题目不存在',
  ROUND_MISMATCH: '题目已经变了，刷新一下',
  ALREADY_ANSWERED: '这题你已经答过了',
  ROUND_ENDED: '这题已经结束了',
  INVALID_CHOICE: '选项不对',
  ROUND_NOT_SETTLED: '还在结算中，稍等',
  SETTLE_TOO_EARLY: '还没到结算时间',
  ADVANCE_TOO_EARLY: '揭晓还没结束',
  QUESTION_NOT_ENOUGH: '题库准备中，稍后再试',
  NETWORK_ERROR: '网络开小差了，点此重试',
  CLOUD_INIT_FAILED: '服务初始化失败',
  SESSION_EXPIRED: '登录过期，请重进',
  SYSTEM_ERROR: FALLBACK,
};

function messageFor(error) {
  if (!error) return FALLBACK;
  return error.message || MESSAGES[error.name] || FALLBACK;
}

module.exports = { MESSAGES, messageFor };
