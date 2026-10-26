const test = require('node:test');
const assert = require('node:assert/strict');

const { makeCanvas, makeWx } = require('./fake-canvas');

const canvas = makeCanvas();
global.wx = makeWx(canvas, {
  windowWidth: 375,
  windowHeight: 812,
  pixelRatio: 2,
  safeArea: { top: 44, bottom: 778 },
});
global.requestAnimationFrame = () => {};

const { App } = require('../../minigame/js/app');
const screens = require('../../minigame/js/screens');

test('小游戏 App 启动进入首页，基础导航可用', async () => {
  const app = new App();
  app.start();
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(app.state.screen, 'home');
  assert.equal(app.state.user.nickName, 'A');
  assert.ok(app.state.screenAt > 0);

  app.action('home.create');
  assert.equal(app.state.screen, 'create');
  app.action('create.count', 15);
  assert.equal(app.state.create.count, 15);
  app.action('create.duration', 20);
  assert.equal(app.state.create.duration, 20);
  app.action('create.back');
  assert.equal(app.state.screen, 'home');

  app.action('home.join');
  assert.equal(app.state.screen, 'join');
  app.action('join.key', '4');
  app.action('join.key', '8');
  assert.equal(app.state.joinCode, '48');
  app.action('join.del');
  assert.equal(app.state.joinCode, '4');
});

test('切换页面会刷新入场时间，按压态可以清除', async () => {
  const app = new App();
  app.start();
  await new Promise((resolve) => setTimeout(resolve, 20));
  const before = app.state.screenAt;
  await new Promise((resolve) => setTimeout(resolve, 5));
  app.go('rank');
  assert.ok(app.state.screenAt >= before);
  app.pressed = { id: 'x', at: Date.now() };
  app.pressTimer = setTimeout(() => { app.pressed = null; }, 5);
  await new Promise((resolve) => setTimeout(resolve, 15));
  assert.equal(app.pressed, null);
});

function playsOf(part) {
  return (global.wx.__audio || [])
    .filter((c) => String(c.src).indexOf(part) >= 0)
    .reduce((n, c) => n + c.plays, 0);
}

function roundOf(extra) {
  return Object.assign(
    {
      index: 0,
      total: 10,
      stem: '题干',
      options: ['A', 'B', 'C', 'D'],
      startedAt: Date.now(),
      endsAt: Date.now() + 15000,
      revealEndsAt: null,
      correctIndex: null,
      myChoice: null,
      myCorrect: null,
      myGain: null,
      answeredCount: 0,
      activeCount: 2,
      perPlayer: [],
    },
    extra || {}
  );
}

test('倒计时每整秒只响一次，进入抢答后最后三秒才滴答', async () => {
  const app = new App();
  app.start();
  await new Promise((resolve) => setTimeout(resolve, 20));
  app.state.screen = 'game';
  app.state.view = { status: 'playing', round: roundOf({ startedAt: Date.now() + 1800 }) };

  const base = playsOf('sfx-tick');
  app.tickSounds();
  app.tickSounds();
  assert.equal(playsOf('sfx-tick'), base + 1, '同一秒不重复滴答');

  app.state.view.round.startedAt = Date.now() + 800;
  app.tickSounds();
  assert.equal(playsOf('sfx-tick'), base + 2, '下一秒再响一次');

  // 抢答中：剩 12 秒不响，剩 3 秒开始响
  app.state.view.round.startedAt = Date.now() - 3000;
  app.state.view.round.endsAt = Date.now() + 12000;
  app.tickSounds();
  assert.equal(playsOf('sfx-tick'), base + 2);
  app.state.view.round.endsAt = Date.now() + 2400;
  app.tickSounds();
  assert.equal(playsOf('sfx-tick'), base + 3);
});

test('揭晓：答对是 chime + 加分金币，答错是低音 chime', async () => {
  const app = new App();
  app.start();
  await new Promise((resolve) => setTimeout(resolve, 20));

  const prev = { status: 'playing', round: roundOf({}) };
  const right = { status: 'playing', round: roundOf({ correctIndex: 0, myChoice: 0, myCorrect: true, myGain: 128 }) };
  const correctBefore = playsOf('sfx-correct');
  const coinBefore = playsOf('sfx-coin');
  app.revealSounds(prev, right);
  assert.equal(playsOf('sfx-correct'), correctBefore + 1);
  await new Promise((resolve) => setTimeout(resolve, 320));
  assert.equal(playsOf('sfx-coin'), coinBefore + 1, '加分时叠一声金币');

  const wrongView = { status: 'playing', round: roundOf({ correctIndex: 0, myChoice: 1, myCorrect: false, myGain: 0 }) };
  const wrongBefore = playsOf('sfx-wrong');
  app.revealSounds(prev, wrongView);
  assert.equal(playsOf('sfx-wrong'), wrongBefore + 1);

  // 同一题重复下发（轮询）不再重复播报
  const correctAgain = playsOf('sfx-correct');
  app.revealSounds(right, right);
  assert.equal(playsOf('sfx-correct'), correctAgain);
});

test('揭晓时刻只在第一次看到本题揭晓时记录（冠军贴纸 0.3 秒弹跳的起点）', async () => {
  const app = new App();
  app.start();
  await new Promise((resolve) => setTimeout(resolve, 20));

  const before = { status: 'playing', round: roundOf({}) };
  const revealed = {
    status: 'playing',
    round: roundOf({ correctIndex: 0, myChoice: 0, myCorrect: true, myGain: 128 }),
  };

  app.markReveal(before, before);
  assert.equal(app.state.revealAt, 0, '还没揭晓时不记时刻');

  app.markReveal(before, revealed);
  const at = app.state.revealAt;
  assert.ok(at > 0, '刚看到揭晓时记下本地时刻');

  await new Promise((resolve) => setTimeout(resolve, 5));
  app.markReveal(revealed, revealed);
  assert.equal(app.state.revealAt, at, '轮询重复下发同一题不重启动画');

  app.markReveal(revealed, before);
  assert.equal(app.state.revealAt, 0, '进入下一题后清掉');
});

test('第一次点击解锁 BGM，并按页面切曲', async () => {
  const app = new App();
  app.start();
  await new Promise((resolve) => setTimeout(resolve, 20));
  screens.home(app); // raf 在测试里是空实现，手动画一帧拿到热区
  const create = app.hits.find((h) => h.id === 'home.create');
  assert.ok(create, '首页应有创建房间热区');

  const h = global.wx.__handlers;
  const at = { clientX: create.x + create.w / 2, clientY: create.y + create.h / 2 };
  const tapBefore = playsOf('sfx-tap');
  h.touchStart.forEach((fn) => fn({ touches: [at] }));
  h.touchEnd.forEach((fn) => fn({ changedTouches: [at] }));

  const bgm = (global.wx.__audio || []).filter((c) => c.loop);
  assert.ok(bgm.length >= 1, '解锁后应该创建循环 BGM');
  assert.equal(bgm[0].src, 'assets/audio/bgm-menu.mp3');
  assert.equal(bgm[0].paused, false);
  assert.equal(playsOf('sfx-tap'), tapBefore + 1, '按钮点击应有咔哒声');
  assert.equal(app.state.screen, 'create');

  await new Promise((resolve) => setTimeout(resolve, 20));
  app.go('result');
  await new Promise((resolve) => setTimeout(resolve, 220));
  assert.equal(bgm[0].src, 'assets/audio/bgm-result.mp3', '结算页换成庆祝曲');
});

test('加入页数字键盘：点数字写入数字，不会写入 null', async () => {
  const app = new App();
  app.start();
  await new Promise((resolve) => setTimeout(resolve, 20));
  app.go('join');
  screens.join(app); // raf 在测试里是空实现，手动画一帧拿到热区

  const keys = app.hits.filter((h) => h.id === 'join.key');
  assert.equal(keys.length, 10);
  assert.deepEqual(
    keys.map((h) => h.payload).sort(),
    ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
    '每个数字键都要带着自己的数字'
  );

  const h = global.wx.__handlers;
  const tap = (hit) => {
    const at = { clientX: hit.x + hit.w / 2, clientY: hit.y + hit.h / 2 };
    h.touchStart.forEach((fn) => fn({ touches: [at] }));
    h.touchEnd.forEach((fn) => fn({ changedTouches: [at] }));
  };

  ['1', '2', '3', '4', '5', '6'].forEach((digit) => {
    tap(app.hits.find((hit) => hit.id === 'join.key' && hit.payload === digit));
  });
  assert.equal(app.state.joinCode, '123456', '点六下应得到六位房间码，而不是 null');

  // 满六位后继续点不再追加
  tap(app.hits.find((hit) => hit.id === 'join.key' && hit.payload === '7'));
  assert.equal(app.state.joinCode, '123456');

  // 删除键回退一位
  tap(app.hits.find((hit) => hit.id === 'join.del'));
  assert.equal(app.state.joinCode, '12345');
});
