const app = getApp();
const api = require('../../core/api');
const store = require('../../core/store');
const session = require('../../core/session');
const { messageFor } = require('../../constants/errors');

Page({
  data: {
    user: { nickName: '', avatar: { type: 'emoji', value: '🍎', bg: '#FFE3D5' } },
    stats: { games: 0, wins: 0, rate: 0, bestScore: 0 },
    sound: true,
    vibration: true,
    editVisible: false,
    editNick: '',
    editAvatar: null,
    saving: false,
    editError: '',
  },

  onShow() {
    this.load();
  },

  async load() {
    try {
      await app.ensureLogin();
      const user = store.getState().user || {};
      this.setData({
        user,
        stats: this.computeStats(user),
        sound: wx.getStorageSync('gg_sound') !== false,
        vibration: wx.getStorageSync('gg_vibrate') !== false,
      });
    } catch (err) {
      wx.showToast({ title: messageFor(err), icon: 'none' });
    }
  },

  computeStats(user) {
    const s = user.stats || {};
    const rate = s.totalAnswered ? Math.round((s.totalCorrect / s.totalAnswered) * 100) : 0;
    return {
      games: s.games || 0,
      wins: s.wins || 0,
      rate,
      bestScore: s.bestScore || 0,
    };
  },

  onEdit() {
    const user = this.data.user || {};
    this.setData({
      editVisible: true,
      editNick: user.nickName || '',
      editAvatar: user.avatar || null,
      editError: '',
    });
  },

  onCloseEdit() {
    if (this.data.saving) return;
    this.setData({ editVisible: false });
  },

  onChooseAvatar(e) {
    this.setData({
      editAvatar: { type: 'temp', value: e.detail.avatarUrl },
    });
  },

  onNickInput(e) {
    this.setData({ editNick: e.detail.value, editError: '' });
  },

  async onSave() {
    if (this.data.saving) return;
    const nick = String(this.data.editNick || '').trim();
    const chars = Array.from(nick);
    if (chars.length < 2 || chars.length > 12) {
      this.setData({ editError: '昵称需要 2–12 个字符' });
      return;
    }
    this.setData({ saving: true, editError: '' });
    try {
      let avatar = this.data.editAvatar;
      if (avatar && avatar.type === 'temp') {
        const uid = (this.data.user && this.data.user.uid) || String(Date.now());
        const upload = await wx.cloud.uploadFile({
          cloudPath: 'avatars/' + uid + '_' + Date.now() + '.png',
          filePath: avatar.value,
        });
        avatar = { type: 'cloud', value: upload.fileID };
      }
      const data = await api.call('user.updateProfile', {
        nickName: nick,
        avatar,
      });
      store.setUser(data.user);
      app.globalData.user = data.user;
      this.setData({
        user: data.user,
        stats: this.computeStats(data.user),
        editVisible: false,
        saving: false,
        editAvatar: null,
      });
      wx.showToast({ title: '已保存', icon: 'none' });
    } catch (err) {
      this.setData({ saving: false, editError: messageFor(err) });
    }
  },

  onToggleSound(e) {
    const value = e.detail.value;
    wx.setStorageSync('gg_sound', value);
    this.setData({ sound: value });
  },

  onToggleVibration(e) {
    const value = e.detail.value;
    wx.setStorageSync('gg_vibrate', value);
    this.setData({ vibration: value });
  },

  onClear() {
    wx.showModal({
      title: '清除本地记录？',
      content: '会清除房间缓存和本机设置，服务端战绩与榜单不会删除。',
      confirmText: '清除',
      cancelText: '取消',
      confirmColor: '#C02C36',
      success: (res) => {
        if (!res.confirm) return;
        session.clear();
        wx.removeStorageSync('gg_sound');
        wx.removeStorageSync('gg_vibrate');
        this.setData({ sound: true, vibration: true });
        wx.showToast({ title: '已清除', icon: 'none' });
      },
    });
  },

  onRules() {
    wx.navigateTo({ url: '/pages/rules/index' });
  },

  onPrivacy() {
    wx.navigateTo({ url: '/pages/privacy/index' });
  },

  onTerms() {
    wx.navigateTo({ url: '/pages/privacy/index?type=terms' });
  },
});
