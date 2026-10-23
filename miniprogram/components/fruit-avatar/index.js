Component({
  properties: {
    avatar: {
      type: Object,
      value: { type: 'emoji', value: '🍎', bg: '#FFE3D5' },
    },
    size: { type: Number, value: 64 },
    ring: { type: Boolean, value: false },
    dim: { type: Boolean, value: false },
  },
});
