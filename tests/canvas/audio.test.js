const test = require('node:test');
const assert = require('node:assert/strict');

const { makeCanvas, makeWx } = require('./fake-canvas');

const AUDIO_PATH = '../../minigame/js/audio';

function loadAudio(wxLike) {
  delete require.cache[require.resolve(AUDIO_PATH)];
  global.wx = wxLike;
  return require(AUDIO_PATH);
}

function stubWx() {
  return makeWx(makeCanvas(), {
    windowWidth: 375,
    windowHeight: 812,
    pixelRatio: 2,
    safeArea: { top: 44, bottom: 778 },
  });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test('没有音频能力时所有调用都是空操作', () => {
  const audio = loadAudio({});
  assert.deepEqual(audio.getState(), { music: true, sfx: true });
  assert.doesNotThrow(() => {
    audio.init();
    audio.setScene('home');
    audio.unlock();
    audio.play('tap');
    audio.suspend();
    audio.resume();
    audio.toggleMusic();
    audio.toggleSfx();
  });
  assert.deepEqual(audio.getState(), { music: false, sfx: false });
});

test('第一次手势后才起 BGM，切页面换曲且循环', async () => {
  const wxLike = stubWx();
  const audio = loadAudio(wxLike);
  audio.init();
  audio.setScene('home');
  assert.equal(wxLike.__audio.length, 0, '解锁前不创建音频实例');

  audio.unlock();
  const bgm = wxLike.__audio[0];
  assert.ok(bgm, '解锁后创建 BGM 实例');
  assert.equal(bgm.src, audio.TRACKS.menu);
  assert.equal(bgm.loop, true);
  assert.equal(bgm.paused, false);

  audio.setScene('game');
  await sleep(260); // 等淡出结束再换曲
  assert.equal(bgm.src, audio.TRACKS.game);
  assert.equal(bgm.paused, false);

  audio.setScene('game');
  await sleep(30);
  assert.equal(bgm.plays, 2, '同一首曲不重复 play');
});

test('关掉音乐立即停 BGM，并把开关写进本地缓存', async () => {
  const wxLike = stubWx();
  const audio = loadAudio(wxLike);
  audio.init();
  audio.setScene('home');
  audio.unlock();
  const bgm = wxLike.__audio[0];
  assert.equal(bgm.paused, false);

  assert.equal(audio.setMusic(false), false);
  assert.equal(bgm.paused, true);
  assert.deepEqual(wxLike.__storage[audio.STORAGE_KEY], { music: false, sfx: true });

  // 重新进游戏（模块重载）后读回缓存
  const reloaded = loadAudio(wxLike);
  reloaded.init();
  assert.deepEqual(reloaded.getState(), { music: false, sfx: true });
  reloaded.setScene('home');
  reloaded.unlock();
  assert.equal(wxLike.__audio.length, 1, '音乐关闭时不再创建 BGM');
});

test('音效走独立实例池，关掉音效后不再出声', () => {
  const wxLike = stubWx();
  const audio = loadAudio(wxLike);
  audio.init();
  audio.setScene('home');
  audio.unlock();
  const before = wxLike.__audio.length;

  audio.play('tap');
  const tap = wxLike.__audio.slice(before);
  assert.equal(tap.length, 2, '音效池一次建两个实例');
  assert.equal(tap[0].src, audio.SFX.tap.src);
  assert.equal(tap[0].volume, audio.SFX.tap.volume);
  assert.equal(tap[0].plays + tap[1].plays, 1);

  // 同一音效复用池子，不无限建实例
  audio.play('tap');
  audio.play('tap');
  const reused = wxLike.__audio.slice(before);
  assert.equal(reused.length, 2, '池子上限 2');
  assert.equal(reused[0].plays + reused[1].plays, 3);

  assert.equal(audio.setSfx(false), false);
  const playsBefore = wxLike.__audio.reduce((n, c) => n + c.plays, 0);
  audio.play('correct');
  assert.equal(wxLike.__audio.reduce((n, c) => n + c.plays, 0), playsBefore);
});

test('切后台暂停、回前台按当前页面恢复', async () => {
  const wxLike = stubWx();
  const audio = loadAudio(wxLike);
  audio.init();
  audio.setScene('game');
  audio.unlock();
  const bgm = wxLike.__audio[0];
  assert.equal(bgm.paused, false);

  audio.suspend();
  assert.equal(bgm.paused, true);

  audio.resume();
  assert.equal(bgm.paused, false);
  assert.equal(bgm.src, audio.TRACKS.game);
});

test('页面与曲目的对应关系完整', () => {
  const audio = loadAudio({});
  const screens = ['home', 'create', 'join', 'room', 'rules', 'privacy', 'rank', 'profile', 'game', 'result'];
  screens.forEach((name) => {
    const track = audio.SCENE_TRACK[name];
    assert.ok(track, name + ' 应该有 BGM');
    assert.ok(audio.TRACKS[track], name + ' 的曲目文件必须存在');
  });
  assert.equal(audio.SCENE_TRACK.loading, null);
  Object.keys(audio.SFX).forEach((name) => {
    assert.ok(/^assets\/audio\/sfx-[a-z]+\.mp3$/.test(audio.SFX[name].src), name);
    assert.ok(audio.SFX[name].volume > 0 && audio.SFX[name].volume <= 1, name);
  });
});
