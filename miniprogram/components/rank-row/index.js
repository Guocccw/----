Component({
  properties: {
    rank: { type: Number, value: 0 },
    player: { type: Object, value: null },
    highlight: { type: Boolean, value: false },
  },
  data: {
    sub: '',
    medal: '',
  },
  observers: {
    'rank, player': function (rank, player) {
      if (!player) return;
      const sub = (player.games || 0) + ' 场 · ' + (player.wins || 0) + ' 胜';
      let medal = '';
      if (rank === 1) medal = '🥇';
      if (rank === 2) medal = '🥈';
      if (rank === 3) medal = '🥉';
      this.setData({ sub, medal });
    },
  },
});
