const test = require('node:test');
const assert = require('node:assert/strict');

const noop = () => {};
const ctx = {
  scale: noop, clearRect: noop, fillRect: noop, fillText: noop,
  measureText: (t) => ({ width: String(t).length * 8 }),
  beginPath: noop, moveTo: noop, lineTo: noop, arc: noop, arcTo: noop,
  closePath: noop, quadraticCurveTo: noop, roundRect: noop, rect: noop, strokeRect: noop, fill: noop, stroke: noop, save: noop, restore: noop,
};
const canvas = { width: 0, height: 0, getContext: () => ctx };

global.wx = {
  createCanvas: () => canvas,
  getWindowInfo: () => ({ windowWidth: 375, windowHeight: 812, pixelRatio: 2, safeArea: { top: 44, bottom: 778 } }),
  getMenuButtonBoundingClientRect: () => ({ top: 48, bottom: 80, left: 280, right: 365 }),
  getLaunchOptionsSync: () => ({ query: {} }),
  showShareMenu: noop,
  onTouchStart: noop,
  onTouchEnd: noop,
  onShow: noop,
  onHide: noop,
  showToast: noop,
  showModal: noop,
  showActionSheet: noop,
  setClipboardData: noop,
  shareAppMessage: noop,
  vibrateShort: noop,
  cloud: {
    init: noop,
    callFunction(opts) {
      const action = opts.data.action;
      if (action === 'auth.login') {
        opts.success({
          result: {
            ok: true,
            serverTime: Date.now(),
            data: {
              user: { uid: 'u1', nickName: 'A', avatar: { type: 'emoji', value: '🍎', bg: '#FFE3D5' }, stats: {} },
              activeRoom: null,
              serverWeekKey: '20261019',
            },
          },
        });
        return;
      }
      opts.success({ result: { ok: true, data: {}, serverTime: Date.now() } });
    },
  },
};
global.requestAnimationFrame = () => {};

const { App } = require('../../minigame/js/app');

test('小游戏 App 启动进入首页，基础导航可用', async () => {
  const app = new App();
  app.start();
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(app.state.screen, 'home');
  assert.equal(app.state.user.nickName, 'A');

  app.action('home.create');
  assert.equal(app.state.screen, 'create');
  app.action('create.count', 15);
  assert.equal(app.state.create.count, 15);
  app.action('create.duration', 20);
  assert.equal(app.state.create.duration, 20);
  app.action('create.back');
  assert.equal(app.state.screen, 'home');
});
