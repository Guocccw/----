/* 预览用假数据：覆盖每个页面的关键状态。 */
(function () {
  const AVATARS = [
    { value: '🍊', bg: '#FFE0C2' },
    { value: '🍑', bg: '#FFDDE3' },
    { value: '🍋', bg: '#FFF1BF' },
    { value: '🍇', bg: '#E9E2FF' },
  ];

  function avatarOf(i) {
    const a = AVATARS[i % AVATARS.length];
    return { type: 'emoji', value: a.value, bg: a.bg };
  }

  function player(id, name, seat, extra) {
    return Object.assign(
      {
        playerId: id,
        nickName: name,
        avatar: avatarOf(seat - 1),
        seat,
        score: 0,
        correctCount: 0,
        correctTimeMs: 0,
        left: false,
        lastSeenAt: Date.now(),
        isOwner: seat === 1,
      },
      extra || {}
    );
  }

  const user = {
    uid: 'u1',
    nickName: '阿果',
    avatar: avatarOf(0),
    stats: { games: 12, wins: 5, bestScore: 1280, totalAnswered: 120, totalCorrect: 96 },
  };

  function config(count, duration) {
    return { questionCount: count || 10, durationSec: duration || 15, revealSec: 3 };
  }

  function roomView(players, extra) {
    return Object.assign(
      {
        roomCode: '482915',
        playerId: 'p1',
        isOwner: true,
        status: 'waiting',
        config: config(10, 15),
        players,
        round: null,
        final: null,
      },
      extra || {}
    );
  }

  function gameView(extra) {
    const now = Date.now();
    return Object.assign(
      {
        roomCode: '482915',
        playerId: 'p1',
        isOwner: true,
        status: 'playing',
        config: config(10, 15),
        players: [
          player('p1', '阿果', 1, { score: 420 }),
          player('p2', '小桃', 2, { score: 380 }),
          player('p3', '柠檬', 3, { score: 260 }),
          player('p4', '葡萄', 4, { score: 190 }),
        ],
        round: {
          index: 2,
          total: 10,
          stem: '下列哪种水果的维生素 C 含量通常最高？',
          options: ['猕猴桃', '苹果', '香蕉', '西瓜'],
          startedAt: now - 4200,
          endsAt: now + 10800,
          revealEndsAt: null,
          correctIndex: null,
          myChoice: null,
          myCorrect: null,
          myGain: null,
          answeredCount: 1,
          activeCount: 4,
          perPlayer: [
            { playerId: 'p1', answered: false, correct: null, gain: null },
            { playerId: 'p2', answered: true, correct: null, gain: null },
            { playerId: 'p3', answered: false, correct: null, gain: null },
            { playerId: 'p4', answered: true, correct: null, gain: null },
          ],
        },
        final: null,
      },
      extra || {}
    );
  }

  const resultView = {
    roomCode: '482915',
    playerId: 'p1',
    isOwner: true,
    status: 'settled',
    config: config(10, 15),
    players: [],
    round: null,
    final: {
      winnerId: 'p1',
      rankings: [
        { rank: 1, playerId: 'p1', nickName: '阿果', avatar: avatarOf(0), score: 1280, correctCount: 10, correctTimeMs: 42000, left: false },
        { rank: 2, playerId: 'p2', nickName: '小桃', avatar: avatarOf(1), score: 1160, correctCount: 9, correctTimeMs: 45000, left: false },
        { rank: 3, playerId: 'p3', nickName: '柠檬', avatar: avatarOf(2), score: 940, correctCount: 8, correctTimeMs: 52000, left: false },
        { rank: 4, playerId: 'p4', nickName: '葡萄', avatar: avatarOf(3), score: 610, correctCount: 6, correctTimeMs: 61000, left: false },
      ],
    },
  };

  const rankTop = [
    { rank: 1, uid: 'u9', nickName: '橘子汽水', avatar: avatarOf(2), score: 3680, games: 14, wins: 9 },
    { rank: 2, uid: 'u2', nickName: '小桃', avatar: avatarOf(1), score: 3120, games: 13, wins: 6 },
    { rank: 3, uid: 'u5', nickName: '葡萄冻', avatar: avatarOf(3), score: 2860, games: 11, wins: 5 },
    { rank: 4, uid: 'u1', nickName: '阿果', avatar: avatarOf(0), score: 2450, games: 12, wins: 5 },
    { rank: 5, uid: 'u6', nickName: '柠檬精', avatar: avatarOf(2), score: 2210, games: 10, wins: 3 },
    { rank: 6, uid: 'u7', nickName: '西瓜太郎', avatar: avatarOf(1), score: 1980, games: 9, wins: 2 },
    { rank: 7, uid: 'u8', nickName: '柚子树', avatar: avatarOf(3), score: 1740, games: 8, wins: 2 },
  ];

  function makeApp(screen, patch) {
    const app = {
      state: Object.assign(
        {
          screen,
          screenAt: Date.now() - 2400,
          user,
          activeRoom: null,
          view: null,
          roomCode: '',
          loading: false,
          error: '',
          create: { count: 10, duration: 15 },
          joinCode: '',
          joinError: '',
          rank: { loading: false, weekText: '本周 10.19 – 10.25', top: [], me: null, myRank: null },
          privacyTab: 'privacy',
          submitting: false,
          pendingChoice: null,
        },
        patch || {}
      ),
      hits: [],
      pressed: null,
      now: () => Date.now(),
      phase: () => 'idle',
      chips: () => [],
    };
    return app;
  }

  function chipsFor(view, answered) {
    const per = (view.round && view.round.perPlayer) || [];
    return (view.players || []).map((p, i) => {
      const item = per.find((x) => x.playerId === p.playerId) || {};
      return {
        playerId: p.playerId,
        nickName: p.nickName,
        avatar: p.avatar,
        answered: !!(answered && answered.indexOf(i) >= 0),
        correct: item.correct,
        gain: item.gain,
        isMe: p.playerId === view.playerId,
      };
    });
  }

  const WAITING_2 = roomView([player('p1', '阿果', 1, { score: 0 }), player('p2', '小桃', 2, { score: 0 })]);
  const WAITING_4 = roomView(
    [player('p1', '阿果', 1), player('p2', '小桃', 2), player('p3', '柠檬', 3), player('p4', '葡萄', 4)],
    { isOwner: false }
  );

  const GAME_BASE = gameView();

  const STATES = {
    home: () =>
      makeApp('home', { activeRoom: null }),
    'home.active': () =>
      makeApp('home', { activeRoom: { roomCode: '482915', playerId: 'p1', status: 'waiting' } }),
    create: () => makeApp('create'),
    join: () => makeApp('join', { joinCode: '482' }),
    'join.empty': () => makeApp('join', { joinCode: '' }),
    'join.error': () => makeApp('join', { joinCode: '482915', joinError: '房间不存在，检查房间码' }),
    room: () => makeApp('room', { view: WAITING_2, roomCode: '482915', activeRoom: { roomCode: '482915', playerId: 'p1', status: 'waiting' } }),
    'room.full': () => makeApp('room', { view: WAITING_4, roomCode: '482915' }),
    'game.answering': () => {
      const view = gameView();
      const app = makeApp('game', { view, roomCode: '482915' });
      app.phase = () => 'answering';
      app.chips = () => chipsFor(view, [1, 3]);
      return app;
    },
    'game.submitted': () => {
      const view = gameView();
      view.round.myChoice = 0;
      view.round.answeredCount = 3;
      const app = makeApp('game', { view, roomCode: '482915' });
      app.phase = () => 'answering';
      app.chips = () => chipsFor(view, [0, 1, 3]);
      return app;
    },
    'game.revealed': () => {
      const view = gameView();
      view.round.correctIndex = 0;
      view.round.myChoice = 0;
      view.round.myCorrect = true;
      view.round.myGain = 121;
      view.round.answeredCount = 4;
      view.round.revealEndsAt = Date.now() + 2600;
      view.round.perPlayer = [
        { playerId: 'p1', answered: true, correct: true, gain: 121 },
        { playerId: 'p2', answered: true, correct: true, gain: 152 },
        { playerId: 'p3', answered: true, correct: false, gain: 0 },
        { playerId: 'p4', answered: true, correct: false, gain: 0 },
      ];
      const app = makeApp('game', { view, roomCode: '482915', revealAt: Date.now() - 600 });
      app.phase = () => 'revealed';
      app.chips = () => chipsFor(view, [0, 1, 2, 3]);
      return app;
    },
    'game.wrong': () => {
      const view = gameView();
      view.round.correctIndex = 2;
      view.round.myChoice = 1;
      view.round.myCorrect = false;
      view.round.myGain = 0;
      view.round.answeredCount = 4;
      view.round.revealEndsAt = Date.now() + 2600;
      view.round.perPlayer = [
        { playerId: 'p1', answered: true, correct: false, gain: 0 },
        { playerId: 'p2', answered: true, correct: false, gain: 0 },
        { playerId: 'p3', answered: true, correct: true, gain: 143 },
        { playerId: 'p4', answered: true, correct: false, gain: 0 },
      ];
      const app = makeApp('game', { view, roomCode: '482915', revealAt: Date.now() - 600 });
      app.phase = () => 'revealed';
      app.chips = () => chipsFor(view, [0, 1, 2, 3]);
      return app;
    },
    'game.countdown': () => {
      const view = gameView();
      view.round.startedAt = Date.now() + 2400;
      view.round.endsAt = Date.now() + 17400;
      const app = makeApp('game', { view, roomCode: '482915' });
      app.phase = () => 'countdown';
      app.chips = () => chipsFor(view, []);
      return app;
    },
    result: () => makeApp('result', { view: resultView, roomCode: '482915' }),
    rank: () =>
      makeApp('rank', {
        rank: {
          loading: false,
          weekText: '本周 10.19 – 10.25',
          top: rankTop,
          me: { uid: 'u1', score: 2450, games: 12, wins: 5 },
          myRank: 4,
        },
      }),
    'rank.empty': () =>
      makeApp('rank', { rank: { loading: false, weekText: '本周 10.19 – 10.25', top: [], me: null, myRank: null } }),
    profile: () => makeApp('profile'),
    rules: () => makeApp('rules'),
    privacy: () => makeApp('privacy'),
    loading: () => makeApp('loading'),
  };

  const ORDER = [
    ['home', '首页'],
    ['create', '创建房间'],
    ['join', '输入房间码'],
    ['room', '等待房间'],
    ['game.answering', '对局 · 作答'],
    ['game.revealed', '对局 · 揭晓'],
    ['result', '结算'],
    ['rank', '排行榜'],
    ['profile', '我的'],
    ['rules', '玩法说明'],
  ];

  function build(name) {
    const factory = STATES[name] || STATES.home;
    return factory();
  }

  window.Fixtures = { build, ORDER, STATES };
})();
