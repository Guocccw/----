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
    seats: [],
    activeCount: 0,
    isOwner: false,
    loading: true,
    starting: false,
    errorText: '',
    network: 'online',
    statusText: '等待中',
  },

  onLoad(options) {
    const code = (options && options.code) || '';
    this.setData({ code });
    this.poller = null;
    this.heartbeatTimer = null;
    this.loaded = false;
  },

  onShow() {
    if (!this.loaded) this.load();
    else {
      this.refresh();
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
      // 保持当前快照
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

    if (view.status === 'playing') {
      wx.redirectTo({ url: '/pages/game/index?code=' + view.roomCode });
      return;
    }
    if (view.status === 'settled') {
      wx.redirectTo({ url: '/pages/result/index?code=' + view.roomCode });
      return;
    }

    const now = clock.now();
    const players = view.players.slice().sort((a, b) => a.seat - b.seat);
    const seats = [];
    for (let i = 0; i < 4; i++) {
      const p = players[i];
      if (p) {
        seats.push({
          key: p.playerId,
          empty: false,
          player: p,
          isOwner: !!p.isOwner,
          isSelf: p.playerId === view.playerId,
          online: now - (p.lastSeenAt || 0) < 45000,
        });
      } else {
        seats.push({ key: 'empty-' + i, empty: true, seat: i + 1 });
      }
    }

    this.setData({
      view,
      seats,
      activeCount: players.filter((p) => !p.left).length,
      isOwner: !!view.isOwner,
      loading: false,
      network: 'online',
      statusText: view.status === 'waiting' ? '等待中' : '对局中',
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
      if (!this.data.view) return;
      api.call('room.heartbeat', { roomCode: this.data.code }).catch(() => {});
    }, 15000);
  },

  stop() {
    if (this.poller) {
      this.poller.stop();
      this.poller = null;
    }
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  },

  async onStart() {
    if (this.data.starting || this.data.activeCount < 2) return;
    this.setData({ starting: true });
    try {
      const data = await api.call('room.start', { roomCode: this.data.code });
      this.apply(data.view);
    } catch (err) {
      wx.showToast({ title: messageFor(err), icon: 'none' });
    } finally {
      this.setData({ starting: false });
    }
  },

  onCopy() {
    wx.setClipboardData({
      data: this.data.code,
      success: () => wx.showToast({ title: '房间码已复制', icon: 'none' }),
    });
  },

  onSeatTap() {
    // 空位通过 open-type=share 触发分享，这里不需要额外动作
  },

  onLeave() {
    wx.showModal({
      title: '离开房间？',
      content: '离开后座位会空出来，朋友还能凭房间码重新进来。',
      confirmText: '离开',
      cancelText: '再想想',
      confirmColor: '#C02C36',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          await api.call('room.leave', { roomCode: this.data.code });
        } catch (err) {
          // 即使接口失败也清理本地
        }
        store.reset();
        session.clear();
        wx.reLaunch({ url: '/pages/home/index' });
      },
    });
  },

  onShareAppMessage() {
    const view = this.data.view || {};
    const owner = (view.players || []).find((p) => p.isOwner);
    return {
      title: (owner ? owner.nickName : '朋友') + ' 喊你来答题，房间 ' + this.data.code,
      path: '/pages/join/index?code=' + this.data.code + '&from=share',
    };
  },
});
