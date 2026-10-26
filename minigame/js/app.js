const core = require('./core');
const ui = require('./ui');
const screens = require('./screens');
const audio = require('./audio');

const ROOM_SCREENS = ['room', 'game', 'result'];

class App {
  constructor() {
    this.canvas = null;
    this.screens = screens;
    this.hits = [];
    this.touch = null;
    this.pollTimer = null;
    this.polling = false;
    this.heartbeatTimer = null;
    this.settleBusy = false;
    this.advanceBusy = false;
    this.pressed = null;
    this.pressTimer = null;
    this.returnScreen = 'home';
    this.hidden = false;
    this.audio = audio;
    this.audioCue = '';
    this.state = {
      screen: 'loading',
      screenAt: Date.now(),
      user: null,
      activeRoom: null,
      view: null,
      roomCode: '',
      loading: false,
      error: '',
      pendingCode: '',
      create: { count: 10, duration: 15 },
      joinCode: '',
      joinError: '',
      rank: { loading: false, weekText: '', top: [], me: null, myRank: null },
      privacyTab: 'privacy',
      submitting: false,
      pendingChoice: null,
      // 本地第一次看到「本题揭晓」的时刻：冠军贴纸的 0.3 秒弹跳从这里起算
      revealAt: 0,
    };
  }

  start() {
    this.canvas = wx.createCanvas();
    const info = core.getWindowInfo();
    ui.init(this.canvas, info);
    audio.init();
    audio.setScene(this.state.screen);
    this.bindEvents();
    this.loop();
    this.boot();
  }

  async boot() {
    this.state.screen = 'loading';
    this.state.error = '';
    try {
      if (!wx.cloud) throw new Error('当前微信版本不支持云开发');
      const opts = { traceUser: true };
      if (core.ENV_ID) opts.env = core.ENV_ID;
      wx.cloud.init(opts);
      try {
        wx.showShareMenu({ withShareTicket: true });
      } catch (err) {}
      const launch = wx.getLaunchOptionsSync ? wx.getLaunchOptionsSync() : {};
      const code = launch && launch.query && launch.query.code;
      if (code && /^[1-9]\d{5}$/.test(String(code))) this.state.pendingCode = String(code);
      await this.login();
    } catch (err) {
      console.error('[guoguo] boot failed', err);
      this.state.error = core.messageFor(err);
      this.state.screen = 'loading';
    }
  }

  async login() {
    const data = await core.call('auth.login');
    this.state.user = data.user || null;
    this.state.activeRoom = data.activeRoom || null;
    if (this.state.pendingCode) {
      const code = this.state.pendingCode;
      this.state.pendingCode = '';
      await this.joinRoom(code, true);
      return;
    }
    if (this.state.activeRoom && this.state.activeRoom.roomCode) {
      await this.openRoom(this.state.activeRoom.roomCode);
      return;
    }
    this.go('home');
  }

  async retry() {
    this.state.error = '';
    this.state.screen = 'loading';
    await this.boot();
  }

  bindEvents() {
    wx.onTouchStart((e) => {
      const t = e.touches && e.touches[0];
      if (!t) return;
      // 第一次手势才允许出声（iOS 自动播放限制）
      audio.unlock();
      this.touch = { x: t.clientX, y: t.clientY, at: Date.now() };
      // 按下反馈：让贴纸按钮真的有“压下去”的手感
      for (let i = this.hits.length - 1; i >= 0; i--) {
        const h = this.hits[i];
        if (t.clientX >= h.x && t.clientX <= h.x + h.w && t.clientY >= h.y && t.clientY <= h.y + h.h) {
          this.pressed = { id: h.id, at: Date.now() };
          if (wx.vibrateShort) wx.vibrateShort({ type: 'light' });
          break;
        }
      }
    });

    wx.onTouchEnd((e) => {
      if (!this.touch) return;
      const t = e.changedTouches && e.changedTouches[0];
      if (!t) return;
      const dx = t.clientX - this.touch.x;
      const dy = t.clientY - this.touch.y;
      const moved = Math.sqrt(dx * dx + dy * dy);
      const tap = moved < 14;
      this.touch = null;
      if (this.pressTimer) clearTimeout(this.pressTimer);
      this.pressTimer = setTimeout(() => { this.pressed = null; }, 110);
      if (!tap) return;
      for (let i = this.hits.length - 1; i >= 0; i--) {
        const h = this.hits[i];
        if (t.clientX >= h.x && t.clientX <= h.x + h.w && t.clientY >= h.y && t.clientY <= h.y + h.h) {
          // 选项点击由 answer() 放「提交」音，其他按钮统一「咔哒」
          if (h.id !== 'game.answer') audio.play('tap');
          this.action(h.id, h.payload);
          return;
        }
      }
    });

    wx.onShow((res) => {
      this.hidden = false;
      audio.resume();
      const q = (res && res.query) || {};
      if (q.code && /^[1-9]\d{5}$/.test(String(q.code)) && this.state.user && this.state.screen === 'home') {
        this.joinRoom(String(q.code));
      }
      if (ROOM_SCREENS.indexOf(this.state.screen) >= 0) {
        this.startPoll();
        this.startHeartbeat();
      }
    });

    wx.onHide(() => {
      this.hidden = true;
      audio.suspend();
      this.stopRoom();
    });

    // 来电、语音通话等系统中断结束后，把 BGM 接回来
    if (wx.onAudioInterruptionBegin) wx.onAudioInterruptionBegin(() => audio.suspend());
    if (wx.onAudioInterruptionEnd) {
      wx.onAudioInterruptionEnd(() => {
        if (!this.hidden) audio.resume();
      });
    }
  }

  loop() {
    const raf = typeof requestAnimationFrame === 'function'
      ? requestAnimationFrame
      : (fn) => setTimeout(() => fn(Date.now()), 16);
    const frame = () => {
      if (!this.hidden) {
        this.tick();
        const drawer = this.screens[this.state.screen] || this.screens.loading;
        drawer(this);
      }
      raf(frame);
    };
    raf(frame);
  }

  now() {
    return core.now();
  }

  phase() {
    const view = this.state.view;
    if (!view) return 'idle';
    if (view.status === 'waiting') return 'waiting';
    if (view.status === 'settled') return 'settled';
    if (!view.round) return 'waiting';
    const now = this.now();
    if (now < view.round.startedAt) return 'countdown';
    if (view.round.correctIndex !== null && typeof view.round.correctIndex !== 'undefined') return 'revealed';
    if (now < view.round.endsAt) return 'answering';
    return 'revealed';
  }

  remaining() {
    const view = this.state.view;
    if (!view || !view.round) return 0;
    return Math.max(0, view.round.endsAt - this.now());
  }

  chips() {
    const view = this.state.view;
    if (!view || !view.round) return [];
    const per = view.round.perPlayer || [];
    return (view.players || []).filter((p) => !p.left).map((p) => {
      const item = per.find((x) => x.playerId === p.playerId) || {};
      return {
        playerId: p.playerId,
        nickName: p.nickName,
        avatar: p.avatar,
        answered: !!item.answered,
        correct: item.correct,
        gain: item.gain,
        isMe: p.playerId === view.playerId,
      };
    });
  }

  tick() {
    if (this.state.screen !== 'game') return;
    const view = this.state.view;
    if (!view || !view.round) return;
    const round = view.round;
    this.tickSounds();
    const now = this.now();
    const settled = round.correctIndex !== null && typeof round.correctIndex !== 'undefined';
    if (!settled && (round.answeredCount >= round.activeCount || now >= round.endsAt + 1000)) {
      this.trySettle();
    }
    if (settled && round.revealEndsAt && now >= round.revealEndsAt + 300) {
      this.tryAdvance();
    }
  }

  /* 倒计时 / 最后三秒：每个整秒一声 tick，靠 audioCue 去重 */
  tickSounds() {
    const view = this.state.view;
    if (!view || !view.round) return;
    const round = view.round;
    const phase = this.phase();
    let cue = '';
    if (phase === 'countdown') {
      const n = Math.ceil((round.startedAt - this.now()) / 1000);
      cue = round.index + ':cd' + n;
    } else if (phase === 'answering') {
      const n = Math.ceil(this.remaining() / 1000);
      if (n >= 1 && n <= 3) cue = round.index + ':as' + n;
    }
    if (!cue || cue === this.audioCue) return;
    this.audioCue = cue;
    audio.play('tick');
  }

  isRevealed(round) {
    return !!round && round.correctIndex !== null && typeof round.correctIndex !== 'undefined';
  }

  /* 记录「我刚看到本题揭晓」的时刻；轮询重复下发同一题时保持不变 */
  markReveal(prev, view) {
    const after = view && view.round;
    if (!this.isRevealed(after)) {
      this.state.revealAt = 0;
      return;
    }
    const before = prev && prev.round;
    const same = before && before.index === after.index && this.isRevealed(before);
    if (!same) this.state.revealAt = Date.now();
  }

  /* 揭晓的那一下：答对给 chime（有加分再叠金币），答错/漏答给低音 chime */
  revealSounds(prev, view) {
    const after = view && view.round;
    if (!after || !this.isRevealed(after)) return;
    const before = prev && prev.round;
    if (before && before.index === after.index && this.isRevealed(before)) return;
    if (after.myCorrect === true) {
      audio.play('correct');
      if (after.myGain > 0) setTimeout(() => audio.play('coin'), 260);
    } else {
      audio.play('wrong');
    }
  }

  go(screen, keepRoom) {
    const prev = this.state.screen;
    if (prev !== screen) this.state.screenAt = Date.now();
    this.state.screen = screen;
    this.state.joinError = '';
    if (!keepRoom && ROOM_SCREENS.indexOf(screen) < 0) this.stopRoom();
    if (screen !== 'game') this.audioCue = '';
    audio.setScene(screen);
    if (screen === 'result' && prev !== 'result') audio.play('coin');
  }

  async openRoom(code) {
    this.state.roomCode = code;
    this.state.loading = true;
    try {
      const data = await core.call('room.state', { roomCode: code });
      this.applyRoom(data.view);
      this.startPoll();
      this.startHeartbeat();
    } catch (err) {
      core.toast(core.messageFor(err));
      this.go('home');
    } finally {
      this.state.loading = false;
    }
  }

  applyRoom(view) {
    if (!view) return;
    const prev = this.state.view;
    this.state.view = view;
    this.state.roomCode = view.roomCode;
    this.state.activeRoom = {
      roomCode: view.roomCode,
      playerId: view.playerId,
      status: view.status,
    };
    this.state.loading = false;
    this.markReveal(prev, view);
    this.revealSounds(prev, view);
    let target = 'room';
    if (view.status === 'playing') target = 'game';
    else if (view.status === 'settled') target = 'result';
    if (this.state.screen !== target) this.go(target, true);
  }

  startPoll() {
    if (!this.state.roomCode) return;
    this.stopPoll();
    const tick = async () => {
      if (this.polling) return;
      this.polling = true;
      try {
        const data = await core.call('room.state', { roomCode: this.state.roomCode }, 6000);
        this.applyRoom(data.view);
      } catch (err) {
        if (['ROOM_CLOSED', 'ROOM_NOT_FOUND', 'NOT_IN_ROOM', 'KICKED'].indexOf(err.name) >= 0) {
          this.stopRoom();
          this.state.view = null;
          this.state.activeRoom = null;
          this.go('home');
          core.toast(core.messageFor(err));
          this.polling = false;
          return;
        }
      } finally {
        this.polling = false;
      }
      if (ROOM_SCREENS.indexOf(this.state.screen) >= 0 && this.state.roomCode) {
        const delay = this.state.screen === 'game' ? 1000 : 1600;
        this.pollTimer = setTimeout(tick, delay);
      }
    };
    tick();
  }

  stopPoll() {
    if (this.pollTimer) clearTimeout(this.pollTimer);
    this.pollTimer = null;
  }

  startHeartbeat() {
    if (!this.state.roomCode) return;
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = setInterval(() => {
      if (!this.state.roomCode) return;
      core.call('room.heartbeat', { roomCode: this.state.roomCode }).catch(() => {});
    }, 15000);
  }

  stopRoom() {
    this.stopPoll();
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = null;
  }

  async createRoom() {
    if (this.state.loading) return;
    this.state.loading = true;
    try {
      const data = await core.call('room.create', {
        config: {
          questionCount: this.state.create.count,
          durationSec: this.state.create.duration,
          category: 'general',
        },
      });
      this.applyRoom(data.view);
      this.startPoll();
      this.startHeartbeat();
    } catch (err) {
      core.toast(core.messageFor(err));
      if (err.name === 'ALREADY_IN_ROOM') this.go('home');
    } finally {
      this.state.loading = false;
    }
  }

  async joinRoom(rawCode, silent) {
    const code = String(rawCode || this.state.joinCode || '').replace(/\D/g, '').slice(0, 6);
    if (code.length !== 6) {
      this.state.joinError = '输入 6 位房间码';
      return;
    }
    if (this.state.loading) return;
    this.state.loading = true;
    this.state.joinError = '';
    try {
      const data = await core.call('room.join', { roomCode: code, source: 'code' });
      this.state.joinCode = '';
      this.applyRoom(data.view);
      this.startPoll();
      this.startHeartbeat();
    } catch (err) {
      this.state.joinError = core.messageFor(err);
      if (!silent) core.toast(core.messageFor(err));
      this.go('join');
    } finally {
      this.state.loading = false;
    }
  }

  async startGame() {
    if (this.state.loading) return;
    this.state.loading = true;
    try {
      const data = await core.call('room.start', { roomCode: this.state.roomCode });
      this.applyRoom(data.view);
    } catch (err) {
      core.toast(core.messageFor(err));
    } finally {
      this.state.loading = false;
    }
  }

  async answer(index) {
    if (this.state.submitting) return;
    if (this.phase() !== 'answering') return;
    const view = this.state.view;
    if (!view || !view.round) return;
    if (typeof view.round.myChoice === 'number') return;
    // 点击即提交：先给声音反馈，不等网络回来
    audio.play('submit');
    this.state.submitting = true;
    this.state.pendingChoice = index;
    try {
      const data = await core.call('room.answer', {
        roomCode: this.state.roomCode,
        roundIndex: view.round.index,
        choice: index,
      });
      this.applyRoom(data.view);
      if (wx.vibrateShort) wx.vibrateShort({ type: 'light' });
    } catch (err) {
      if (['ALREADY_ANSWERED', 'ROUND_ENDED', 'ROUND_MISMATCH'].indexOf(err.name) >= 0) {
        this.refreshRoom();
      } else {
        core.toast(core.messageFor(err));
      }
    } finally {
      this.state.submitting = false;
      this.state.pendingChoice = null;
    }
  }

  async trySettle() {
    if (this.settleBusy) return;
    const view = this.state.view;
    if (!view || !view.round) return;
    if (view.round.correctIndex !== null && typeof view.round.correctIndex !== 'undefined') return;
    this.settleBusy = true;
    try {
      const data = await core.call('room.settle', {
        roomCode: this.state.roomCode,
        roundIndex: view.round.index,
      });
      this.applyRoom(data.view);
    } catch (err) {
      // 时间未到或已结算，下一帧/轮询会重试
    } finally {
      this.settleBusy = false;
    }
  }

  async tryAdvance() {
    if (this.advanceBusy) return;
    const view = this.state.view;
    if (!view || !view.round) return;
    this.advanceBusy = true;
    try {
      const data = await core.call('room.advance', {
        roomCode: this.state.roomCode,
        roundIndex: view.round.index,
      });
      this.applyRoom(data.view);
    } catch (err) {
      // 重复推进或时间未到
    } finally {
      this.advanceBusy = false;
    }
  }

  async refreshRoom() {
    if (!this.state.roomCode) return;
    try {
      const data = await core.call('room.state', { roomCode: this.state.roomCode });
      this.applyRoom(data.view);
    } catch (err) {}
  }

  leaveRoom() {
    wx.showModal({
      title: '离开房间？',
      content: '离开后座位会空出来，本局不会计入周榜。',
      confirmText: '离开',
      cancelText: '再想想',
      confirmColor: '#C02C36',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          await core.call('room.leave', { roomCode: this.state.roomCode });
        } catch (err) {}
        this.stopRoom();
        this.state.view = null;
        this.state.activeRoom = null;
        this.go('home');
      },
    });
  }

  async rematch() {
    if (this.state.loading) return;
    this.state.loading = true;
    try {
      const data = await core.call('room.rematch', { roomCode: this.state.roomCode });
      this.applyRoom(data.view);
      this.startPoll();
      this.startHeartbeat();
    } catch (err) {
      core.toast(core.messageFor(err));
    } finally {
      this.state.loading = false;
    }
  }

  async loadRank() {
    if (this.state.rank.loading) return;
    this.state.rank.loading = true;
    try {
      const data = await core.call('rank.weekly');
      this.state.rank = {
        loading: false,
        weekText: data.weekText || '本周',
        top: data.top || [],
        me: data.me || null,
        myRank: data.myRank || null,
      };
    } catch (err) {
      this.state.rank.loading = false;
      core.toast(core.messageFor(err));
    }
  }

  soundState() {
    return audio.getState();
  }

  toggleSound(kind) {
    const on = kind === 'music' ? audio.toggleMusic() : audio.toggleSfx();
    // 打开音效时立刻放一声，让开关「听得见」
    if (kind === 'sfx' && on) audio.play('coin');
    core.toast((kind === 'music' ? '背景音乐' : '音效') + (on ? '已开' : '已关'));
    return on;
  }

  copyCode() {
    if (!this.state.roomCode) return;
    wx.setClipboardData({
      data: this.state.roomCode,
      success: () => core.toast('房间码已复制'),
    });
  }

  shareRoom() {
    if (!this.state.roomCode) return;
    const title = '果果答题 · 房间 ' + this.state.roomCode + '，来一局？';
    if (wx.shareAppMessage) {
      wx.shareAppMessage({ title, query: 'code=' + this.state.roomCode });
    } else {
      core.toast('请点右上角分享');
    }
  }

  shareResult() {
    const view = this.state.view;
    const me = view && view.final ? view.final.rankings.find((p) => p.playerId === view.playerId) : null;
    const title = '我在果果答题拿了 ' + (me ? me.score : 0) + ' 分' + (me ? '，排第 ' + me.rank : '') + '，来一局？';
    if (wx.shareAppMessage) {
      wx.shareAppMessage({ title, query: '' });
    } else {
      core.toast('请点右上角分享');
    }
  }

  editNick() {
    const current = (this.state.user && this.state.user.nickName) || '';
    wx.showModal({
      title: '修改昵称',
      editable: true,
      placeholderText: '2–12 个字符（当前：' + current + '）',
      confirmText: '保存',
      cancelText: '取消',
      success: async (res) => {
        if (!res.confirm) return;
        const name = String(res.content || '').trim();
        if (Array.from(name).length < 2 || Array.from(name).length > 12) {
          core.toast('昵称需要 2–12 个字符');
          return;
        }
        try {
          const data = await core.call('user.updateProfile', { nickName: name });
          this.state.user = data.user;
          core.toast('已保存');
        } catch (err) {
          core.toast(core.messageFor(err));
        }
      },
    });
  }

  editAvatar() {
    const list = core.EMOJIS.slice(0, 6).map((e) => e + ' 头像');
    wx.showActionSheet({
      itemList: list,
      success: async (res) => {
        const index = res.tapIndex;
        const avatar = { type: 'emoji', value: core.EMOJIS[index], bg: core.AVATAR_BGS[index] };
        try {
          const data = await core.call('user.updateProfile', { avatar });
          this.state.user = data.user;
          core.toast('头像已更新');
        } catch (err) {
          core.toast(core.messageFor(err));
        }
      },
    });
  }

  openRules(from) {
    this.returnScreen = from || 'home';
    this.go('rules');
  }

  openPrivacy(from) {
    this.returnScreen = from || 'home';
    this.state.privacyTab = 'privacy';
    this.go('privacy');
  }

  action(id, payload) {
    const handlers = {
      'common.retry': () => this.retry(),
      'nav.home': () => this.go('home'),
      'nav.rank': () => {
        this.go('rank');
        this.loadRank();
      },
      'nav.profile': () => this.go('profile'),
      'home.create': () => this.go('create'),
      'home.join': () => this.go('join'),
      'home.active': () => this.state.activeRoom && this.openRoom(this.state.activeRoom.roomCode),
      'home.rules': () => this.openRules('home'),
      'home.privacy': () => this.openPrivacy('home'),
      'create.back': () => this.go('home'),
      'create.count': () => {
        this.state.create.count = Number(payload);
      },
      'create.duration': () => {
        this.state.create.duration = Number(payload);
      },
      'create.submit': () => this.createRoom(),
      'join.back': () => this.go('home'),
      'join.key': () => {
        const digit = String(payload == null ? '' : payload).replace(/\D/g, '');
        if (!digit) return;
        if (this.state.joinCode.length < 6) {
          this.state.joinCode = (this.state.joinCode + digit).slice(0, 6);
        }
        this.state.joinError = '';
      },
      'join.del': () => {
        this.state.joinCode = this.state.joinCode.slice(0, -1);
        this.state.joinError = '';
      },
      'join.submit': () => this.joinRoom(this.state.joinCode),
      'room.back': () => this.leaveRoom(),
      'room.start': () => this.startGame(),
      'room.copy': () => this.copyCode(),
      'room.share': () => this.shareRoom(),
      'room.leave': () => this.leaveRoom(),
      'game.back': () => this.leaveRoom(),
      'game.answer': () => this.answer(Number(payload)),
      'result.rematch': () => this.rematch(),
      'result.home': () => this.go('home'),
      'result.share': () => this.shareResult(),
      'rank.refresh': () => this.loadRank(),
      'rank.create': () => this.go('create'),
      'rank.rules': () => this.openRules('rank'),
      'profile.nick': () => this.editNick(),
      'profile.avatar': () => this.editAvatar(),
      'profile.music': () => this.toggleSound('music'),
      'profile.sfx': () => this.toggleSound('sfx'),
      'profile.rules': () => this.openRules('profile'),
      'profile.privacy': () => this.openPrivacy('profile'),
      'rules.back': () => this.go(this.returnScreen || 'home'),
      'rules.create': () => this.go('create'),
      'privacy.back': () => this.go(this.returnScreen || 'home'),
      'privacy.tab': () => {
        this.state.privacyTab = payload === 'terms' ? 'terms' : 'privacy';
      },
    };
    const fn = handlers[id];
    if (!fn) return;
    try {
      fn();
    } catch (err) {
      console.error('[guoguo] action failed', err);
      core.toast(core.messageFor(err));
    }
  }
}

function start() {
  const app = new App();
  start.app = app;
  app.start();
}

module.exports = { start, App };
