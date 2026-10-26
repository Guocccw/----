const test = require('node:test');
const assert = require('node:assert/strict');

const { makeCanvas, makeWx } = require('./fake-canvas');

const canvas = makeCanvas();
const info = { windowWidth: 375, windowHeight: 812, pixelRatio: 2, safeArea: { top: 44, bottom: 778 } };
global.wx = makeWx(canvas, info);

const ui = require('../../minigame/js/ui');
const screens = require('../../minigame/js/screens');

ui.init(canvas, info);

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
  const e = extra || {};
  return {
    state: Object.assign(
      {
        screen,
        screenAt: Date.now() - 3000,
        user: {
          nickName: 'A',
          avatar: avatar('🍎'),
          stats: { games: 2, wins: 1, bestScore: 300, totalAnswered: 10, totalCorrect: 8 },
        },
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
      e
    ),
    hits: [],
    pressed: null,
    now: () => Date.now(),
    phase: e.phase || (() => 'waiting'),
    chips: e.chips || (() => []),
  };
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

const revealedView = JSON.parse(JSON.stringify(gameView));
revealedView.round.correctIndex = 0;
revealedView.round.myChoice = 0;
revealedView.round.myCorrect = true;
revealedView.round.myGain = 138;

/* 揭晓时：两人都答对，B 手速更快（加分更多） */
function championChips() {
  return [
    { playerId: 'p1', nickName: 'A', avatar: avatar('🍎'), answered: true, correct: true, gain: 121, isMe: true },
    { playerId: 'p2', nickName: 'B', avatar: avatar('🍋'), answered: true, correct: true, gain: 152, isMe: false },
  ];
}

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

function cases() {
  return [
    ['home', makeApp('home')],
    ['home.active', makeApp('home', { activeRoom: { roomCode: '123456', playerId: 'p1', status: 'waiting' } })],
    ['create', makeApp('create')],
    ['join', makeApp('join')],
    ['room', makeApp('room', { view: waitingView })],
    ['game', makeApp('game', { view: gameView, phase: () => 'answering' })],
    ['game.revealed', makeApp('game', { view: revealedView, phase: () => 'revealed' })],
    ['game.champion', makeApp('game', { view: revealedView, phase: () => 'revealed', chips: championChips })],
    [
      'game.champion.pop',
      makeApp('game', {
        view: revealedView,
        phase: () => 'revealed',
        chips: championChips,
        revealAt: Date.now() - 120,
      }),
    ],
    ['result', makeApp('result', { view: resultView })],
    [
      'rank',
      makeApp('rank', {
        rank: {
          loading: false,
          weekText: '本周',
          top: [resultView.final.rankings[0]],
          me: { uid: 'u1', score: 300, games: 2, wins: 1 },
          myRank: 1,
        },
      }),
    ],
    ['rank.empty', makeApp('rank')],
    ['profile', makeApp('profile')],
    ['rules', makeApp('rules')],
    ['privacy', makeApp('privacy')],
    ['loading', makeApp('loading')],
  ];
}

function runAll(width, height, dpr, safeTop, safeBottom) {
  ui.init(canvas, {
    windowWidth: width,
    windowHeight: height,
    pixelRatio: dpr,
    safeArea: { top: safeTop, bottom: safeBottom },
  });
  for (const [name, app] of cases()) {
    const screenName = name.split('.')[0];
    assert.doesNotThrow(() => screens[screenName](app), name);
    assert.ok(Array.isArray(app.hits), name);
  }
}

test('所有页面在 375x812 下可渲染', () => {
  runAll(375, 812, 2, 44, 778);
});

test('首页与对局页的关键热区存在', () => {
  ui.init(canvas, { windowWidth: 375, windowHeight: 812, pixelRatio: 2, safeArea: { top: 44, bottom: 778 } });
  const homeApp = makeApp('home');
  screens.home(homeApp);
  const homeIds = homeApp.hits.map((h) => h.id);
  assert.ok(homeIds.includes('home.create'));
  assert.ok(homeIds.includes('home.join'));
  assert.ok(homeIds.includes('nav.rank'));

  const gameApp = makeApp('game', { view: gameView, phase: () => 'answering' });
  screens.game(gameApp);
  const answerHits = gameApp.hits.filter((h) => h.id === 'game.answer');
  assert.equal(answerHits.length, 4);
  assert.deepEqual(answerHits.map((h) => h.payload), [0, 1, 2, 3]);
});

test('本轮冠军是答对且加分最高的人，没人答对就没有冠军', () => {
  const app = makeApp('game', { view: revealedView, phase: () => 'revealed', chips: championChips });
  const champ = screens.roundChampion(app);
  assert.ok(champ, '有人答对就有冠军');
  assert.equal(champ.playerId, 'p2', '加分更高的 B 是冠军');

  const wrongOnly = makeApp('game', {
    view: revealedView,
    phase: () => 'revealed',
    chips: () => championChips().map((c) => Object.assign({}, c, { correct: false, gain: 0 })),
  });
  assert.equal(screens.roundChampion(wrongOnly), null, '全员答错不贴冠军');
});

test('嘲讽文案同一轮稳定，相邻轮次换一句', () => {
  assert.equal(screens.tauntFor(3, 'p2'), screens.tauntFor(3, 'p2'));
  assert.notEqual(screens.tauntFor(3, 'p2'), screens.tauntFor(4, 'p2'));
});

test('所有页面在 320x568 下不抛异常', () => {
  runAll(320, 568, 2, 20, 568);
});

test('所有页面在 390x844 下不抛异常', () => {
  runAll(390, 844, 3, 47, 810);
});
