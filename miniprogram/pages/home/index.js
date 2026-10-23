const app = getApp();
const store = require('../../core/store');
const { messageFor } = require('../../constants/errors');

Page({
  data: {
    user: null,
    activeRoom: null,
    loading: true,
    loginError: false,
    errorText: '',
    stats: { games: 0, bestScore: 0 },
    statusText: '',
    continueText: '继续游戏',
  },

  onShow() {
    this.load();
  },

  async load() {
    this.setData({ loading: true, errorText: '' });
    try {
      await app.ensureLogin();
      const state = store.getState();
      const user = state.user || {};
      const room = state.activeRoom;
      let statusText = '';
      if (room) {
        statusText =
          room.status === 'playing'
            ? '对局中'
            : room.status === 'settled'
              ? '已结束'
              : '等待中';
      }
      this.setData({
        user,
        activeRoom: room,
        statusText,
        stats: user.stats || { games: 0, bestScore: 0 },
        continueText: room && room.status === 'settled' ? '查看结算' : '继续游戏',
        loading: false,
        loginError: false,
      });
    } catch (err) {
      this.setData({
        loading: false,
        loginError: true,
        errorText: messageFor(err),
      });
    }
  },

  async onRetry() {
    try {
      await app.retryLogin();
      this.load();
    } catch (err) {
      wx.showToast({ title: messageFor(err), icon: 'none' });
    }
  },

  onCreate() {
    wx.navigateTo({ url: '/pages/create/index' });
  },

  onJoin() {
    wx.navigateTo({ url: '/pages/join/index' });
  },

  onContinue() {
    const room = this.data.activeRoom;
    if (!room) return;
    if (room.status === 'playing') {
      wx.navigateTo({ url: '/pages/game/index?code=' + room.roomCode });
      return;
    }
    if (room.status === 'settled') {
      wx.navigateTo({ url: '/pages/result/index?code=' + room.roomCode });
      return;
    }
    wx.navigateTo({ url: '/pages/room/index?code=' + room.roomCode });
  },

  onRank() {
    wx.switchTab({ url: '/pages/rank/index' });
  },

  onRules() {
    wx.navigateTo({ url: '/pages/rules/index' });
  },

  onPrivacy() {
    wx.navigateTo({ url: '/pages/privacy/index' });
  },

  onShareAppMessage() {
    return {
      title: '四个人，一道题，看谁手快',
      path: '/pages/home/index?from=share',
    };
  },
});
