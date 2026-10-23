const DEFS = {
  UNKNOWN_ACTION: [1000, '服务开小差了', false],
  INVALID_PARAM: [1001, '参数不对，检查一下', false],
  UNAUTHORIZED: [1002, '登录失效，请重进', true],
  RATE_LIMITED: [1003, '操作太频繁，稍后再试', true],
  CONTENT_UNSAFE: [1004, '昵称包含不合适内容，请修改', false],
  FORBIDDEN: [1005, '没有权限这么做', false],
  USER_NOT_FOUND: [2001, '账号信息还没准备好', true],
  ROOM_NOT_FOUND: [3001, '房间不存在，检查一下房间码', false],
  ROOM_FULL: [3002, '房间满了，4 个人已经到齐', false],
  ROOM_STARTED: [3003, '这局已经开始了，等下一局吧', false],
  ROOM_CLOSED: [3004, '房间已解散', false],
  NOT_OWNER: [3005, '只有房主可以操作', false],
  NOT_ENOUGH_PLAYERS: [3006, '至少 2 个人才能开始', false],
  NOT_IN_ROOM: [3007, '你不在这个房间里', false],
  ALREADY_IN_ROOM: [3008, '你还有一局没打完', false],
  INVALID_CONFIG: [3009, '房间配置不对', false],
  KICKED: [3010, '你已被房主移出房间', false],
  ROOM_CODE_EXHAUSTED: [3011, '房间号用完了，稍后再试', true],
  ROUND_NOT_FOUND: [4001, '当前题目不存在', true],
  ROUND_MISMATCH: [4002, '题目已经变了，刷新一下', true],
  ALREADY_ANSWERED: [4003, '这题你已经答过了', false],
  ROUND_ENDED: [4004, '这题已经结束了', false],
  INVALID_CHOICE: [4005, '选项不对', false],
  ROUND_NOT_SETTLED: [4006, '还在结算中，稍等', true],
  SETTLE_TOO_EARLY: [4007, '还没到结算时间', true],
  ADVANCE_TOO_EARLY: [4008, '揭晓还没结束', true],
  QUESTION_NOT_ENOUGH: [5004, '题库准备中，稍后再试', true],
  DB_ERROR: [5001, '服务开小差了，稍后再试', true],
  CONFLICT_RETRY: [5002, '操作冲突，再试一次', true],
  SYSTEM_ERROR: [5005, '服务开小差了', true],
};

class AppError extends Error {
  constructor(name, detail) {
    const def = DEFS[name] || DEFS.SYSTEM_ERROR;
    super(def[1]);
    this.name = DEFS[name] ? name : 'SYSTEM_ERROR';
    this.code = def[0];
    this.retryable = def[2];
    this.detail = detail || null;
  }
}

function normalizeError(err) {
  if (err && err instanceof AppError) {
    return {
      code: err.code,
      name: err.name,
      message: err.message,
      retryable: err.retryable,
      detail: err.detail,
    };
  }
  return {
    code: DEFS.SYSTEM_ERROR[0],
    name: 'SYSTEM_ERROR',
    message: DEFS.SYSTEM_ERROR[1],
    retryable: true,
    detail: null,
  };
}

module.exports = { DEFS, AppError, normalizeError };
