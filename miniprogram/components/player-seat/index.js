Component({
  properties: {
    player: { type: Object, value: null },
    isOwner: { type: Boolean, value: false },
    isSelf: { type: Boolean, value: false },
    online: { type: Boolean, value: true },
    phase: { type: String, value: 'waiting' },
  },
  data: {
    statusText: '已加入',
  },
  observers: {
    'player, online, phase': function (player, online, phase) {
      if (!player) return;
      let text = '已加入';
      if (player.left) text = '已离开';
      else if (!online) text = '离线';
      else if (phase === 'playing' || phase === 'countdown' || phase === 'answering') text = '对局中';
      this.setData({ statusText: text });
    },
  },
  methods: {
    onTap() {
      this.triggerEvent('tap', { player: this.data.player });
    },
  },
});
