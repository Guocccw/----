const app = getApp();
const api = require('../../core/api');
const store = require('../../core/store');
const session = require('../../core/session');
const { messageFor } = require('../../constants/errors');

Page({
  data: {
    code: '',
    loading: false,
    errorText: '',
    error: false,
  },

  onLoad(options) {
    const code = this.normalize((options && options.code) || '');
    if (code) {
      this.setData({ code });
      this.autoJoin(code);
    }
  },

  normalize(value) {
    const match = String(value || '').match(/\d{6}/);
    if (!match) return '';
    const code = match[0];
    return /^[1-9]/.test(code) ? code : '';
  },

  onCodeChange(e) {
    this.setData({ code: e.detail.value, errorText: '', error: false });
  },

  onCodeComplete(e) {
    this.doJoin(e.detail.value);
  },

  async autoJoin(code) {
    try {
      await app.ensureLogin();
      setTimeout(() => this.doJoin(code), 200);
    } catch (err) {
      this.setData({ errorText: messageFor(err) });
    }
  },

  async doJoin(rawCode) {
    if (this.data.loading) return;
    const code = this.normalize(rawCode || this.data.code);
    if (code.length !== 6) {
      this.setData({ error: true, errorText: '输入 6 位房间码' });
      return;
    }
    this.setData({ loading: true, errorText: '', error: false });
    try {
      await app.ensureLogin();
      const data = await api.call('room.join', { roomCode: code, source: 'code' });
      store.applyView(data.view);
      session.save({
        roomCode: data.view.roomCode,
        playerId: data.view.playerId,
        status: data.view.status,
      });
      wx.redirectTo({ url: '/pages/room/index?code=' + data.view.roomCode });
    } catch (err) {
      this.setData({ error: true, errorText: messageFor(err) });
    } finally {
      this.setData({ loading: false });
    }
  },

  onBackHome() {
    wx.reLaunch({ url: '/pages/home/index' });
  },
});
