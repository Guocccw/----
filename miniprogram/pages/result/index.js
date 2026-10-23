const app = getApp();
const api = require('../../core/api');
const store = require('../../core/store');
const session = require('../../core/session');
const { createPoller } = require('../../core/sync');
const { messageFor } = require('../../constants/errors');
const { formatDuration } = require('../../core/format');

Page({
  data: {
    code: '',
    view: null,
    final: null,
    rankings: [],
    me: null,
    isOwner: false,
    loading: true,
    closed: false,
    errorText: '',
    statusBarHeight: 20,
    stats: { rate: '0%', avg: '0.0s', score: 0 },
    rematching: false,
  },

  onLoad(options) {
    const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    this.setData({
      code: (options && options.code) || '',
      statusBarHeight: info.statusBarHeight || 20,
    });
    this.poller = null;
    this.loaded = false;
  },

  onShow() {
    if (!this.loaded) this.load();
    else this.startPoll();
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
      this.loaded = true;
    } catch (err) {
      const gone = ['ROOM_CLOSED', 'ROOM_NOT_FOUND', 'NOT_IN_ROOM'];
      if (gone.indexOf(err.name) >= 0) {
        this.setData({ loading: false, closed: true, errorText: messageFor(err) });
      } else {
        this.setData({ loading: false, errorText: messageFor(err) });
      }
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
    if (view.status === 'playing') {
      wx.redirectTo({ url: '/pages/game/index?code=' + view.roomCode });
      return;
    }

    const final = view.final;
    if (!final || !final.rankings) {
      this.setData({ loading: false, errorText: '本局数据不完整' });
      return;
    }
    const me = final.rankings.find((r) => r.playerId === view.playerId) || null;
    const total = (view.config && view.config.questionCount) || 0;
    const rate = me && total ? Math.round((me.correctCount / total) * 100) + '%' : '0%';
    const avg = me && me.correctCount ? formatDuration(me.correctTimeMs / me.correctCount) : '—';

    this.setData({
      view,
      final,
      rankings: final.rankings,
      me,
      isOwner: !!view.isOwner,
      loading: false,
      closed: false,
      stats: { rate, avg, score: me ? me.score : 0 },
    });
  },

  startPoll() {
    if (!this.data.view) return;
    if (this.poller) this.poller.stop();
    const view = this.data.view;
    this.poller = createPoller({
      viewId: view.roomCode + '_' + view.playerId,
      interval: 2000,
      onView: (next) => this.apply(next),
      onError: () => {},
      onGone: () => this.setData({ closed: true }),
    });
    this.poller.start();
  },

  stop() {
    if (this.poller) {
      this.poller.stop();
      this.poller = null;
    }
  },

  async onRematch() {
    if (this.data.rematching || !this.data.isOwner) return;
    this.setData({ rematching: true });
    try {
      const data = await api.call('room.rematch', { roomCode: this.data.code });
      this.apply(data.view);
    } catch (err) {
      wx.showToast({ title: messageFor(err), icon: 'none' });
    } finally {
      this.setData({ rematching: false });
    }
  },

  onHome() {
    this.stop();
    wx.reLaunch({ url: '/pages/home/index' });
  },

  onShareAppMessage() {
    const me = this.data.me;
    const rank = me ? me.rank : '';
    return {
      title:
        '我在果果答题拿了 ' +
        (me ? me.score : 0) +
        ' 分' +
        (rank ? '，排第 ' + rank : '') +
        '，来一局？',
      path: '/pages/home/index?from=share',
    };
  },
});
