Component({
  properties: {
    remaining: { type: Number, value: 15000 },
    duration: { type: Number, value: 15000 },
  },
  data: {
    seconds: 15,
    angle: 360,
    color: '#FF7A45',
    danger: false,
  },
  observers: {
    'remaining, duration': function (remaining, duration) {
      const total = Math.max(1, Number(duration) || 1);
      const left = Math.max(0, Math.min(total, Number(remaining) || 0));
      const danger = left <= 5000;
      this.setData({
        seconds: Math.max(0, Math.ceil(left / 1000)),
        angle: Math.round((left / total) * 360),
        color: danger ? '#F2545B' : '#FF7A45',
        danger,
      });
    },
  },
});
