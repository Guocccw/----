/**
 * 音效与背景音乐
 *
 * 设计要点：
 * - 音频随小游戏代码包一起发布，`src` 用包内相对路径，不走网络、不受域名白名单限制。
 * - 微信/iOS 对 ogg 支持不好，所有文件统一用 mp3（见 docs/音效与音乐.md）。
 * - 音频实例全部懒创建：首屏不碰音频，第一次点击后才 unlock 并淡入 BGM。
 * - 这里只负责播放；「什么时候放什么」由 app.js 决定。
 * - 没有 wx 音频能力时（本地预览、单测）所有方法都是空操作，不会抛错。
 */

const STORAGE_KEY = 'guoguo.audio.v1';

/* 三首循环 BGM：菜单 / 对局 / 结算 */
const TRACKS = {
  menu: 'assets/audio/bgm-menu.mp3',
  game: 'assets/audio/bgm-game.mp3',
  result: 'assets/audio/bgm-result.mp3',
};

/* 音效：文件已裁掉头尾静音，volume 按响度手工配平 */
const SFX = {
  tap: { src: 'assets/audio/sfx-tap.mp3', volume: 0.42 },
  submit: { src: 'assets/audio/sfx-submit.mp3', volume: 0.5 },
  tick: { src: 'assets/audio/sfx-tick.mp3', volume: 1 },
  correct: { src: 'assets/audio/sfx-correct.mp3', volume: 0.78 },
  wrong: { src: 'assets/audio/sfx-wrong.mp3', volume: 0.62 },
  coin: { src: 'assets/audio/sfx-coin.mp3', volume: 0.9 },
};

/* 页面 → BGM。空值表示这一页不放音乐 */
const SCENE_TRACK = {
  loading: null,
  home: 'menu',
  create: 'menu',
  join: 'menu',
  room: 'menu',
  rules: 'menu',
  privacy: 'menu',
  rank: 'menu',
  profile: 'menu',
  game: 'game',
  result: 'result',
};

const BGM_VOLUME = 0.32; // 人声/音效优先，BGM 压到背景层
const FADE_MS = 160;
const POOL_SIZE = 2; // 同一个音效最多同时叠两层

const state = { music: true, sfx: true };
let ready = false; // wx 音频能力可用
let unlocked = false; // 收到过用户手势（iOS 解锁）
let suspended = false; // 切后台
let scene = 'loading';
let bgmCtx = null;
let bgmTrack = null;
let fadeTimer = null;
const pool = {}; // name -> { items: [ctx], next: 0 }
const failed = {}; // 报过错的 src，避免刷屏

function hasAudio() {
  return typeof wx !== 'undefined' && typeof wx.createInnerAudioContext === 'function';
}

function readSettings() {
  try {
    if (typeof wx === 'undefined' || typeof wx.getStorageSync !== 'function') return;
    const saved = wx.getStorageSync(STORAGE_KEY);
    if (saved && typeof saved === 'object') {
      if (typeof saved.music === 'boolean') state.music = saved.music;
      if (typeof saved.sfx === 'boolean') state.sfx = saved.sfx;
    }
  } catch (err) {}
}

function writeSettings() {
  try {
    if (typeof wx === 'undefined' || typeof wx.setStorageSync !== 'function') return;
    wx.setStorageSync(STORAGE_KEY, { music: state.music, sfx: state.sfx });
  } catch (err) {}
}

function init() {
  readSettings();
  ready = hasAudio();
  if (!ready) return;
  // 游戏音效不进「跟随系统静音」：手机静音时也能听到反馈，游戏内开关才是最终控制
  try {
    if (typeof wx.setInnerAudioOption === 'function') {
      wx.setInnerAudioOption({ obeyMuteSwitch: false, mixWithOther: false });
    }
  } catch (err) {}
}

function getState() {
  return { music: state.music, sfx: state.sfx };
}

/* ----------------------------- 背景音乐 ----------------------------- */

function ensureBgm() {
  if (bgmCtx || !ready) return bgmCtx;
  try {
    bgmCtx = wx.createInnerAudioContext();
    bgmCtx.loop = true;
    bgmCtx.volume = BGM_VOLUME;
    bgmCtx.obeyMuteSwitch = false; // 游戏内开关优先，手机静音也能听到
    bgmCtx.onError((err) => {
      console.warn('[guoguo] bgm error', bgmTrack, err && err.errMsg);
    });
  } catch (err) {
    bgmCtx = null;
  }
  return bgmCtx;
}

function fadeTo(volume, done) {
  if (!bgmCtx) {
    if (done) done();
    return;
  }
  if (fadeTimer) clearInterval(fadeTimer);
  const from = typeof bgmCtx.volume === 'number' ? bgmCtx.volume : BGM_VOLUME;
  const steps = 6;
  let i = 0;
  fadeTimer = setInterval(() => {
    i += 1;
    const v = from + ((volume - from) * i) / steps;
    try {
      bgmCtx.volume = Math.max(0, Math.min(1, v));
    } catch (err) {}
    if (i >= steps) {
      clearInterval(fadeTimer);
      fadeTimer = null;
      if (done) done();
    }
  }, FADE_MS / steps);
}

function stopBgm(fade) {
  const ctx = bgmCtx;
  bgmTrack = null;
  if (!ctx) return;
  if (!fade) {
    if (fadeTimer) {
      clearInterval(fadeTimer);
      fadeTimer = null;
    }
    try {
      ctx.stop();
      ctx.volume = BGM_VOLUME;
    } catch (err) {}
    return;
  }
  fadeTo(0, () => {
    try {
      ctx.stop();
      ctx.volume = BGM_VOLUME;
    } catch (err) {}
  });
}

function playTrack(ctx, src) {
  try {
    ctx.stop();
    ctx.src = src;
    ctx.volume = 0;
    ctx.play();
    fadeTo(BGM_VOLUME);
  } catch (err) {}
}

function startBgm(track) {
  if (!ready || !state.music || suspended || !unlocked) return;
  const src = TRACKS[track];
  if (!src) return;
  const ctx = ensureBgm();
  if (!ctx) return;
  if (bgmTrack === track && ctx.paused === false) return;
  const switching = !!bgmTrack && bgmTrack !== track;
  bgmTrack = track;
  if (switching) fadeTo(0, () => {
    if (bgmTrack === track) playTrack(ctx, src);
  });
  else playTrack(ctx, src);
}

function wantedTrack() {
  if (!state.music || suspended || !unlocked) return null;
  return SCENE_TRACK[scene] || null;
}

function syncBgm() {
  const want = wantedTrack();
  if (!want) {
    if (bgmTrack) stopBgm(true);
    return;
  }
  if (bgmTrack !== want) startBgm(want);
}

/* ------------------------------- 音效 ------------------------------- */

function contextFor(name) {
  const item = SFX[name];
  if (!item) return null;
  if (pool[name]) return pool[name];
  const slot = { items: [], next: 0 };
  for (let i = 0; i < POOL_SIZE; i++) {
    try {
      const ctx = wx.createInnerAudioContext();
      ctx.src = item.src;
      ctx.volume = item.volume;
      ctx.obeyMuteSwitch = false;
      ctx.onError((err) => {
        if (failed[item.src]) return;
        failed[item.src] = true;
        console.warn('[guoguo] sfx error', item.src, err && err.errMsg);
      });
      slot.items.push(ctx);
    } catch (err) {}
  }
  pool[name] = slot;
  return slot;
}

function play(name) {
  if (!ready || !state.sfx || suspended) return;
  const slot = contextFor(name);
  if (!slot || !slot.items.length) return;
  const ctx = slot.items[slot.next % slot.items.length];
  slot.next = (slot.next + 1) % slot.items.length;
  try {
    if (ctx.paused === false) ctx.stop();
    if (typeof ctx.seek === 'function') ctx.seek(0);
    ctx.play();
  } catch (err) {}
}

/* ------------------------------- 生命周期 ------------------------------- */

function unlock() {
  if (!ready || unlocked) return;
  unlocked = true;
  syncBgm();
}

function setScene(name) {
  scene = name || 'loading';
  syncBgm();
}

function suspend() {
  suspended = true;
  stopBgm(false);
}

function resume() {
  if (!suspended) return;
  suspended = false;
  syncBgm();
}

function setMusic(on) {
  state.music = !!on;
  writeSettings();
  if (state.music) syncBgm();
  else stopBgm(false); // 关开关要立刻静音，不做淡出
  return state.music;
}

function setSfx(on) {
  state.sfx = !!on;
  if (!state.sfx) {
    // 关音效要立即安静，正在响的也掐掉
    Object.keys(pool).forEach((name) => {
      pool[name].items.forEach((ctx) => {
        try {
          ctx.stop();
        } catch (err) {}
      });
    });
  }
  writeSettings();
  return state.sfx;
}

function toggleMusic() {
  return setMusic(!state.music);
}

function toggleSfx() {
  return setSfx(!state.sfx);
}

module.exports = {
  STORAGE_KEY,
  TRACKS,
  SFX,
  SCENE_TRACK,
  init,
  getState,
  unlock,
  setScene,
  suspend,
  resume,
  play,
  setMusic,
  setSfx,
  toggleMusic,
  toggleSfx,
};
