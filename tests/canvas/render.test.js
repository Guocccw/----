const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const noop = () => {};
const ctx = {
  scale: noop,
  clearRect: noop,
  fillRect: noop,
  fillText: noop,
  measureText: (t) => ({ width: String(t).length * 8 }),
  beginPath: noop,
  moveTo: noop,
  lineTo: noop,
  arc: noop,
  arcTo: noop,
  closePath: noop,
  quadraticCurveTo: noop,
  roundRect: noop,
  rect: noop,
  strokeRect: noop,
  fill: noop,
  stroke: noop,
  save: noop,
  restore: noop,
};
const canvas = { width: 0, height: 0, getContext: () => ctx };
global.wx = {
  createCanvas: () => canvas,
  getWindowInfo: () => ({
    windowWidth: 375,
    windowHeight: 812,
    pixelRatio: 2,
    safeArea: { top: 44, bottom: 778 },
  }),
};

const ui = require('../../minigame/js/ui');
const screens = require('../../minigame/js/screens');

ui.init(canvas, wx.getWindowInfo());

function avatar(v) {
  return { type: 'emoji', value: v, bg: '#FFE3D5' };
}

function player(id, name, seat, score) {
  return {
    playerId: id,
    nickName: name,
    avatar: avatar(seat === 1 ? '🍎' : '🍋'),
    seat,
    score: score || 0,
    correctCount: 1,
    correctTimeMs: 4000,
    left: false,
    lastSeenAt: Date.now(),
    isOwner: seat === 1,
  };
}

function makeApp(screen, extra) {
  const app = {
    state: Object.assign(
      {
        screen,
        user: { nickName: 'A', avatar: avatar('🍎'), stats: { games: 2, wins: 1, bestScore: 300, totalAnswered: 10, totalCorrect: 8 } },
        activeRoom: { roomCode: '123456', playerId: 'p1', status: 'waiting' },
        view: null,
        roomCode: '123456',
        loading: false,
        error: '',
        create: { count: 10, duration: 15 },
        joinCode: '123',
        joinError: '',
        rank: { loading: false, weekText: '本周 10.19 – 10.25', top: [], me: null, myRank: null },
        privacyTab: 'privacy',
        submitting: false,
        pendingChoice: null,
      },
      extra || {}
    ),
    hits: [],
    now: () => Date.now(),
    phase: () => 'waiting',
    chips: () => [],
  };
  return app;
}

const waitingView = {
  roomCode: '123456',
  playerId: 'p1',
  isOwner: true,
  status: 'waiting',
  config: { questionCount: 10, durationSec: 15, revealSec: 3 },
  players: [player('p1', 'A', 1, 0), player('p2', 'B', 2, 0)],
  round: null,
  final: null,
};

const gameView = {
  roomCode: '123456',
  playerId: 'p1',
  isOwner: true,
  status: 'playing',
  config: { questionCount: 10, durationSec: 15, revealSec: 3 },
  players: [player('p1', 'A', 1, 120), player('p2', 'B', 2, 80)],
  round: {
    index: 2,
    total: 10,
    stem: '下列哪种水果的维生素 C 含量通常最高？',
    options: ['猕猴桃', '苹果', '香蕉', '西瓜'],
    startedAt: Date.now() - 3000,
    endsAt: Date.now() + 12000,
    revealEndsAt: null,
    correctIndex: null,
    myChoice: null,
    myCorrect: null,
    myGain: null,
    answeredCount: 0,
    activeCount: 2,
    perPlayer: [
      { playerId: 'p1', answered: false, correct: null, gain: null },
      { playerId: 'p2', answered: true, correct: null, gain: null },
    ],
  },
  final: null,
};

const resultView = Object.assign({}, gameView, {
  status: 'settled',
  round: null,
  final: {
    winnerId: 'p1',
    rankings: [
      { rank: 1, playerId: 'p1', nickName: 'A', avatar: avatar('🍎'), score: 300, correctCount: 3, correctTimeMs: 9000, left: false },
      { rank: 2, playerId: 'p2', nickName: 'B', avatar: avatar('🍋'), score: 260, correctCount: 2, correctTimeMs: 7000, left: false },
    ],
  },
});

test('所有页面在 375x812 下可渲染', () => {
  ui.init(canvas, { windowWidth: 375, windowHeight: 812, pixelRatio: 2, safeArea: { top: 44, bottom: 778 } });
  const cases = [
    ['home', makeApp('home')],
    ['create', makeApp('create')],
    ['join', makeApp('join')],
    ['room', makeApp('room', { view: waitingView })],
    ['game', makeApp('game', { view: gameView, phase: () => 'answering' })],
    ['result', makeApp('result', { view: resultView })],
    ['rank', makeApp('rank', { rank: { loading: false, weekText: '本周', top: [resultView.final.rankings[0]], me: { uid: 'u1', score: 300, games: 2, wins: 1 }, myRank: 1 } })],
    ['profile', makeApp('profile')],
    ['rules', makeApp('rules')],
    ['privacy', makeApp('privacy')],
    ['loading', makeApp('loading')],
  ];
  for (const [name, app] of cases) {
    assert.doesNotThrow(() => screens[name](app), name);
    assert.ok(app.hits.length >= 0);
  }
});

test('所有页面在 320x568 下不抛异常', () => {
  ui.init(canvas, { windowWidth: 320, windowHeight: 568, pixelRatio: 2, safeArea: { top: 20, bottom: 568 } });
  const cases = [
    ['home', makeApp('home')],
    ['create', makeApp('create')],
    ['join', makeApp('join')],
    ['room', makeApp('room', { view: waitingView })],
    ['game', makeApp('game', { view: gameView, phase: () => 'answering' })],
    ['result', makeApp('result', { view: resultView })],
    ['rank', makeApp('rank', { rank: { loading: false, weekText: '本周', top: [resultView.final.rankings[0]], me: { uid: 'u1', score: 300, games: 2, wins: 1 }, myRank: 1 } })],
    ['profile', makeApp('profile')],
    ['rules', makeApp('rules')],
    ['privacy', makeApp('privacy')],
    ['loading', makeApp('loading')],
  ];
  for (const [name, app] of cases) {
    assert.doesNotThrow(() => screens[name](app), name);
  }
});
