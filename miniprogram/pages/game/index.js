const app = getApp();
const api = require('../../core/api');
const store = require('../../core/store');
const session = require('../../core/session');
const clock = require('../../core/clock');
const { createPoller } = require('../../core/sync');
const { messageFor } = require('../../constants/errors');

Page({
  data: {
    code: '',
    view: null,
    phase: 'idle',
    question: null,
    options: [],
    optionStates: [],
    myChoice: null,
    settled: false,
    correctIndex: null,
    myGain: null,
    progress: 0,
    remaining: 0,
    duration: 1,
    seconds: 0,
    countdown: 0,
    revealSeconds: 0,
    score: 0,
    chips: [],
    statusText: '加载中…',
    network: 'online',
    loading: true,
    submitting: false,
    statusBarHeight: 20,
    errorText: '',
  },

  onLoad(options) {
    const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    this.setData({
      code: (options && options.code) || '',
      statusBarHeight: info.statusBarHeight || 20,
    });
    this.poller = null;
    this.timer = null;
    this.heartbeatTimer = null;
    this.settleBusy = false;
    this.advanceBusy = false;
    this.loaded = false;
  },

  onShow() {
    if (!this.loaded) this.load();
    else {
      this.refresh().catch(() => {});
      this.startTimers();
      this.startPoll();
      this.startHeartbeat();
    }
  },

  onHide() {
    this.stop();
  },

  onUnload() {
    this.stop();
  },

  async load() {
    this.setData({ loading: true, errorText: '' });
    try {
      await app.ensureLogin();
      const view = await this.fetch();
      this.apply(view);
      this.startPoll();
      this.startTimers();
      this.startHeartbeat();
      this.loaded = true;
    } catch (err) {
      this.setData({ loading: false, errorText: messageFor(err) });
    }
  },

  async refresh() {
    try {
      const view = await this.fetch();
      this.apply(view);
    } catch (err) {
      // 保留快照
    }
  },

  async fetch() {
    const data = await api.call('room.state', { roomCode: this.data.code });
    return data.view;
  },

  apply(view) {
    if (!view) return;
    store.applyView(view);
    session.save({
      roomCode: view.roomCode,
      playerId: view.playerId,
      status: view.status,
    });

    if (view.status === 'waiting') {
      wx.redirectTo({ url: '/pages/room/index?code=' + view.roomCode });
      return;
    }
    if (view.status === 'settled') {
      wx.redirectTo({ url: '/pages/result/index?code=' + view.roomCode });
      return;
    }

    this.compute(view);
  },

  compute(view) {
    const round = view.round;
    if (!round) return;
    const now = clock.now();
    const settled = round.correctIndex !== null && typeof round.correctIndex !== 'undefined';
    const my = view.players.find((p) => p.playerId === view.playerId) || {};
    const myChoice = round.myChoice;
    const optionStates = [0, 1, 2, 3].map((index) => {
      if (settled) {
        if (index === round.correctIndex) return 'correct';
        if (myChoice === index && !round.myCorrect) return 'wrong';
        return 'disabled';
      }
      if (this.data.submitting && myChoice === index) return 'submitting';
      if (myChoice === index) return 'submitted';
      return 'default';
    });

    const active = view.players.filter((p) => !p.left);
    const chips = active.map((p) => {
      const pp = (round.perPlayer || []).find((x) => x.playerId === p.playerId) || {};
      return {
        playerId: p.playerId,
        nickName: p.nickName,
        avatar: p.avatar,
        answered: !!pp.answered,
        correct: pp.correct,
        gain: pp.gain,
        isMe: p.playerId === view.playerId,
      };
    });

    const remaining = Math.max(0, round.endsAt - now);
    const countdown = round.startedAt > now ? Math.ceil((round.startedAt - now) / 1000) : 0;
    const revealSeconds = settled && round.revealEndsAt
      ? Math.max(0, Math.ceil((round.revealEndsAt - now) / 1000))
      : 0;
    const allAnswered = round.answeredCount >= round.activeCount && round.activeCount > 0;
    let statusText = '点击选项作答';
    if (settled) statusText = revealSeconds + ' 秒后进入下一题…';
    else if (allAnswered) statusText = '已全部作答，即将揭晓';
    else if (myChoice !== null && typeof myChoice !== 'undefined') statusText = '已提交，等待其他人…';

    this.setData({
      view,
      phase: store.derivePhase(view),
      question: round,
      options: round.options,
      optionStates,
      myChoice,
      settled,
      correctIndex: round.correctIndex,
      myGain: round.myGain,
      progress: Math.round(((round.index + 1) / round.total) * 100),
      remaining,
      duration: Math.max(1, round.endsAt - round.startedAt),
      seconds: Math.max(0, Math.ceil(remaining / 1000)),
      countdown,
      revealSeconds,
      score: my.score || 0,
      chips,
      statusText,
      loading: false,
      network: 'online',
    });
  },

  startTimers() {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => this.tick(), 250);
  },

  tick() {
    const view = this.data.view;
    if (!view || !view.round) return;
    const round = view.round;
    const now = clock.now();
    const remaining = Math.max(0, round.endsAt - now);
    const seconds = Math.max(0, Math.ceil(remaining / 1000));
    const settled = round.correctIndex !== null && typeof round.correctIndex !== 'undefined';
    const countdown = round.startedAt > now ? Math.ceil((round.startedAt - now) / 1000) : 0;
    const revealSeconds = settled && round.revealEndsAt
      ? Math.max(0, Math.ceil((round.revealEndsAt - now) / 1000))
      : 0;
    const phase = store.derivePhase(view);
    const patch = {};
    if (seconds !== this.data.seconds) patch.seconds = seconds;
    if (countdown !== this.data.countdown) patch.countdown = countdown;
    if (phase !== this.data.phase) patch.phase = phase;
    if (settled && revealSeconds !== this.data.revealSeconds) patch.revealSeconds = revealSeconds;
    if (settled) patch.statusText = revealSeconds + ' 秒后进入下一题…';
    if (Object.keys(patch).length) this.setData(patch);

    if (!settled && round.answeredCount >= round.activeCount && round.activeCount > 0) {
      this.triggerSettle();
    } else if (!settled && now >= round.endsAt + 1000) {
      this.triggerSettle();
    }
    if (settled && round.revealEndsAt && now >= round.revealEndsAt + 300) {
      this.triggerAdvance();
    }
  },

  async triggerSettle() {
    if (this.settleBusy) return;
    const view = this.data.view;
    if (!view || !view.round) return;
    if (view.round.correctIndex !== null && typeof view.round.correctIndex !== 'undefined') return;
    this.settleBusy = true;
    try {
      const data = await api.call('room.settle', {
        roomCode: this.data.code,
        roundIndex: view.round.index,
      });
      this.apply(data.view);
    } catch (err) {
      if (err.name !== 'SETTLE_TOO_EARLY') {
        // 下一次轮询或计时会重试
      }
    } finally {
      this.settleBusy = false;
    }
  },

  async triggerAdvance() {
    if (this.advanceBusy) return;
    const view = this.data.view;
    if (!view || !view.round) return;
    this.advanceBusy = true;
    try {
      const data = await api.call('room.advance', {
        roomCode: this.data.code,
        roundIndex: view.round.index,
      });
      this.apply(data.view);
    } catch (err) {
      // 重复推进或时间未到，等下一次
    } finally {
      this.advanceBusy = false;
    }
  },

  async onChoose(e) {
    const index = e.detail.index;
    if (this.data.submitting) return;
    if (this.data.phase !== 'answering') return;
    if (this.data.myChoice !== null && typeof this.data.myChoice !== 'undefined') return;
    if (this.data.settled) return;

    this.setData({ submitting: true });
    const optionStates = this.data.optionStates.slice();
    optionStates[index] = 'submitting';
    this.setData({ optionStates });

    try {
      const data = await api.call('room.answer', {
        roomCode: this.data.code,
        roundIndex: this.data.question.index,
        choice: index,
      });
      this.apply(data.view);
    } catch (err) {
      if (['ALREADY_ANSWERED', 'ROUND_ENDED', 'ROUND_MISMATCH'].indexOf(err.name) >= 0) {
        this.refresh();
      } else {
        wx.showToast({ title: messageFor(err), icon: 'none' });
      }
      this.setData({ submitting: false });
      if (this.data.view) this.compute(this.data.view);
    } finally {
      this.setData({ submitting: false });
      if (this.data.view) this.compute(this.data.view);
    }
  },

  startPoll() {
    if (!this.data.view) return;
    if (this.poller) this.poller.stop();
    const view = this.data.view;
    this.poller = createPoller({
      viewId: view.roomCode + '_' + view.playerId,
      interval: 1000,
      onView: (next) => this.apply(next),
      onError: () => this.setData({ network: 'unstable' }),
      onGone: () => this.onGone(),
    });
    this.poller.start();
  },

  onGone() {
    this.fetch()
      .then((view) => {
        this.apply(view);
        this.startPoll();
      })
      .catch(() => {
        store.reset();
        session.clear();
        wx.reLaunch({ url: '/pages/home/index' });
      });
  },

  startHeartbeat() {
    if (!this.data.view) return;
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = setInterval(() => {
      api.call('room.heartbeat', { roomCode: this.data.code }).catch(() => {});
    }, 15000);
  },

  stop() {
    if (this.poller) {
      this.poller.stop();
      this.poller = null;
    }
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  },

  onBack() {
    wx.showModal({
      title: '退出本局？',
      content: '退出后本局成绩保留，但不会计入周榜。',
      confirmText: '退出',
      cancelText: '继续答题',
      confirmColor: '#C02C36',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          await api.call('room.leave', { roomCode: this.data.code });
        } catch (err) {}
        store.reset();
        session.clear();
        wx.reLaunch({ url: '/pages/home/index' });
      },
    });
  },
});
