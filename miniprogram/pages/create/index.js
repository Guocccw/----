const app = getApp();
const api = require('../../core/api');
const store = require('../../core/store');
const session = require('../../core/session');
const { messageFor } = require('../../constants/errors');

const COUNTS = [
  { value: 10, label: '10', desc: '约 3 分钟' },
  { value: 15, label: '15', desc: '约 5 分钟' },
  { value: 20, label: '20', desc: '硬核长局' },
];
const DURATIONS = [
  { value: 10, label: '10s', desc: '紧张' },
  { value: 15, label: '15s', desc: '适中' },
  { value: 20, label: '20s', desc: '从容' },
];

Page({
  data: {
    counts: COUNTS,
    durations: DURATIONS,
    questionCount: 10,
    durationSec: 15,
    summary: '预计 4 分钟 · 最多 4 人',
    loading: false,
    errorText: '',
  },

  onLoad() {
    this.computeSummary();
  },

  computeSummary() {
    const q = this.data.questionCount;
    const d = this.data.durationSec;
    const totalSec = q * (d + 3 + 1) + 3;
    const minutes = Math.max(1, Math.round(totalSec / 60));
    this.setData({ summary: '预计 ' + minutes + ' 分钟 · 最多 4 人' });
  },

  onSelectCount(e) {
    const value = Number(e.currentTarget.dataset.value);
    this.setData({ questionCount: value }, () => this.computeSummary());
  },

  onSelectDuration(e) {
    const value = Number(e.currentTarget.dataset.value);
    this.setData({ durationSec: value }, () => this.computeSummary());
  },

  async onCreate() {
    if (this.data.loading) return;
    this.setData({ loading: true, errorText: '' });
    try {
      await app.ensureLogin();
      const data = await api.call('room.create', {
        config: {
          questionCount: this.data.questionCount,
          durationSec: this.data.durationSec,
          category: 'general',
        },
      });
      store.applyView(data.view);
      session.save({
        roomCode: data.view.roomCode,
        playerId: data.view.playerId,
        status: data.view.status,
      });
      wx.redirectTo({ url: '/pages/room/index?code=' + data.view.roomCode });
    } catch (err) {
      if (err.name === 'ALREADY_IN_ROOM' && err.detail && err.detail.roomCode) {
        const code = err.detail.roomCode;
        wx.showModal({
          title: '你已有一个房间',
          content: '要不要回到原来的房间？',
          confirmText: '回去',
          cancelText: '留在这里',
          success: (res) => {
            if (res.confirm) wx.redirectTo({ url: '/pages/room/index?code=' + code });
          },
        });
      } else {
        this.setData({ errorText: messageFor(err) });
        wx.showToast({ title: messageFor(err), icon: 'none' });
      }
    } finally {
      this.setData({ loading: false });
    }
  },
});
