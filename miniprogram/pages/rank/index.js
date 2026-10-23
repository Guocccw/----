const app = getApp();
const api = require('../../core/api');
const { messageFor } = require('../../constants/errors');

Page({
  data: {
    loading: true,
    tab: 'week',
    weekText: '',
    top: [],
    me: null,
    myRank: null,
    myRankText: '—',
    errorText: '',
    empty: false,
  },

  onShow() {
    this.load();
  },

  async load() {
    this.setData({ loading: true, errorText: '' });
    try {
      await app.ensureLogin();
      const data = await api.call('rank.weekly');
      this.setData({
        loading: false,
        weekText: data.weekText || '',
        top: data.top || [],
        me: data.me,
        myRank: data.myRank,
        myRankText: data.myRank ? '第 ' + data.myRank + ' 名' : '—',
        empty: !(data.top && data.top.length),
      });
    } catch (err) {
      this.setData({ loading: false, errorText: messageFor(err) });
    } finally {
      wx.stopPullDownRefresh();
    }
  },

  onPullDownRefresh() {
    this.load();
  },

  onTab(e) {
    const tab = e.currentTarget.dataset.tab;
    if (tab === 'total') {
      wx.showToast({ title: '总榜马上来', icon: 'none' });
      return;
    }
    this.setData({ tab });
  },

  onRules() {
    wx.navigateTo({ url: '/pages/rules/index' });
  },

  onCreate() {
    wx.navigateTo({ url: '/pages/create/index' });
  },
});
