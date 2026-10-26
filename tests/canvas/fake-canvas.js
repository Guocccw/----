/**
 * 渲染冒烟测试用的 Canvas 2D 上下文桩。
 * 用 Proxy 兜住新增的绘制 API（clip / translate / rotate / setLineDash / 渐变等），
 * 让测试只关心「绘制过程不抛异常」。
 */
function makeCtx() {
  const gradient = { addColorStop() {} };
  const base = {
    canvas: { width: 0, height: 0 },
    measureText: (t) => ({ width: String(t == null ? '' : t).length * 8 }),
    createLinearGradient: () => gradient,
    createRadialGradient: () => gradient,
    createPattern: () => ({}),
  };
  return new Proxy(base, {
    get(target, key) {
      if (key in target) return target[key];
      if (typeof key === 'symbol' || key === 'then') return undefined;
      return () => {};
    },
    set(target, key, value) {
      target[key] = value;
      return true;
    },
  });
}

function makeCanvas() {
  const ctx = makeCtx();
  return {
    width: 0,
    height: 0,
    getContext: () => ctx,
    ctx,
  };
}

function makeAudio() {
  return {
    src: '',
    volume: 1,
    loop: false,
    paused: true,
    seeked: null,
    plays: 0,
    stops: 0,
    destroyed: false,
    play() {
      this.plays += 1;
      this.paused = false;
    },
    stop() {
      this.stops += 1;
      this.paused = true;
    },
    pause() {
      this.paused = true;
    },
    seek(t) {
      this.seeked = t;
    },
    destroy() {
      this.destroyed = true;
    },
    onError(fn) {
      this.onErrorFn = fn;
    },
    onEnded(fn) {
      this.onEndedFn = fn;
    },
  };
}

function makeWx(canvas, win) {
  const storage = {};
  const audios = [];
  const handlers = { touchStart: [], touchEnd: [], show: [], hide: [] };
  return {
    createCanvas: () => canvas,
    getWindowInfo: () => win,
    getMenuButtonBoundingClientRect: () => ({ top: (win.safeArea || {}).top + 4, bottom: (win.safeArea || {}).top + 36 }),
    getLaunchOptionsSync: () => ({ query: {} }),
    showShareMenu() {},
    onTouchStart(fn) {
      handlers.touchStart.push(fn);
    },
    onTouchEnd(fn) {
      handlers.touchEnd.push(fn);
    },
    onShow(fn) {
      handlers.show.push(fn);
    },
    onHide(fn) {
      handlers.hide.push(fn);
    },
    showToast() {},
    showModal() {},
    showActionSheet() {},
    setClipboardData() {},
    shareAppMessage() {},
    vibrateShort() {},
    setInnerAudioOption() {},
    createInnerAudioContext() {
      const ctx = makeAudio();
      audios.push(ctx);
      return ctx;
    },
    getStorageSync(key) {
      return Object.prototype.hasOwnProperty.call(storage, key) ? storage[key] : '';
    },
    setStorageSync(key, value) {
      storage[key] = value;
    },
    __audio: audios,
    __storage: storage,
    __handlers: handlers,
    cloud: {
      init() {},
      callFunction(opts) {
        const action = opts.data.action;
        if (action === 'auth.login') {
          opts.success({
            result: {
              ok: true,
              serverTime: Date.now(),
              data: {
                user: {
                  uid: 'u1',
                  nickName: 'A',
                  avatar: { type: 'emoji', value: '🍎', bg: '#FFE3D5' },
                  stats: {},
                },
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
}

module.exports = { makeCtx, makeCanvas, makeWx };