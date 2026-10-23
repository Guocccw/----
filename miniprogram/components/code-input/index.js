Component({
  properties: {
    value: { type: String, value: '' },
    disabled: { type: Boolean, value: false },
    error: { type: Boolean, value: false },
  },
  data: {
    digits: ['', '', '', '', '', ''],
    inputValue: '',
    focus: false,
    activeIndex: 0,
  },
  observers: {
    value(v) {
      const clean = String(v || '').replace(/\D/g, '').slice(0, 6);
      this.setData({
        digits: clean.split('').concat(['', '', '', '', '', '']).slice(0, 6),
        inputValue: clean,
        activeIndex: Math.min(clean.length, 5),
      });
    },
  },
  methods: {
    onTap() {
      if (this.data.disabled) return;
      this.setData({ focus: true });
    },
    onFocus() {
      this.setData({ focus: true });
    },
    onBlur() {
      this.setData({ focus: false });
    },
    onInput(e) {
      if (this.data.disabled) return;
      const clean = String(e.detail.value || '').replace(/\D/g, '').slice(0, 6);
      const digits = clean.split('').concat(['', '', '', '', '', '']).slice(0, 6);
      this.setData({
        digits,
        inputValue: clean,
        activeIndex: Math.min(clean.length, 5),
      });
      this.triggerEvent('change', { value: clean });
      if (clean.length === 6) {
        this.triggerEvent('complete', { value: clean });
      }
    },
    onConfirm() {
      const clean = this.data.inputValue;
      if (clean.length === 6) this.triggerEvent('complete', { value: clean });
    },
  },
});
