Page({
  data: {
    tab: 'privacy',
    updatedAt: '2026-10-22',
  },

  onLoad(options) {
    if (options && options.type === 'terms') {
      this.setData({ tab: 'terms' });
    }
  },

  onTab(e) {
    this.setData({ tab: e.currentTarget.dataset.tab });
  },
});
