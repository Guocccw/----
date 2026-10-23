Component({
  properties: {
    index: { type: Number, value: 0 },
    text: { type: String, value: '' },
    state: { type: String, value: 'default' },
  },
  data: {
    letter: 'A',
    letterClass: 'a',
  },
  observers: {
    index(v) {
      const letters = ['A', 'B', 'C', 'D'];
      const classes = ['a', 'b', 'c', 'd'];
      this.setData({
        letter: letters[v] || 'A',
        letterClass: classes[v] || 'a',
      });
    },
  },
  methods: {
    onTap() {
      const state = this.data.state;
      if (state === 'default') this.triggerEvent('choose', { index: this.data.index });
    },
  },
});
